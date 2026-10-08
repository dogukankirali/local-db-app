import type { Env } from "./util";

// Tarayıcı bildirimleri (Web Push). Ek paket yok: VAPID (RFC 8292) imzası ve yük şifrelemesi (RFC 8291,
// aes128gcm) Workers'ın WebCrypto'suyla yapılır. Ortak anahtar VAPID_PUBLIC_KEY (wrangler.jsonc vars),
// özel anahtar VAPID_PRIVATE_KEY (secret; P-256 özel skaler "d", base64url).

export type PushSubscriptionRow = { id: number; endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body: string; url?: string; tag?: string };

const enc = new TextEncoder();

export const b64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export function fromB64url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const concat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
};

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/** VAPID JWT (ES256) for the push service's origin */
async function vapidAuthorization(env: Env, endpoint: string) {
  const pub = fromB64url(env.VAPID_PUBLIC_KEY!);
  const key = await crypto.subtle.importKey(
    "jwk",
    { kty: "EC", crv: "P-256", d: env.VAPID_PRIVATE_KEY!, x: b64url(pub.slice(1, 33)), y: b64url(pub.slice(33, 65)), ext: true },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const header = b64url(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64url(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: (env.APP_URL || "https://app.dogukankirali.com").replace(/\/+$/, ""),
      })
    )
  );
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${claims}`));
  return `vapid t=${header}.${claims}.${b64url(signature)}, k=${env.VAPID_PUBLIC_KEY}`;
}

/** RFC 8291: encrypts the payload for one subscription (single aes128gcm record) */
export async function encryptPayload(payload: Uint8Array, p256dh: string, auth: string) {
  const uaPublic = fromB64url(p256dh);
  const authSecret = fromB64url(auth);
  const local = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const asPublic = new Uint8Array((await crypto.subtle.exportKey("raw", local.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  // workers-types bu alanı "$public" diye tanımlıyor; çalışma zamanı standart "public" adını bekler
  const ecdh = { name: "ECDH", public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm;
  const shared = new Uint8Array(await crypto.subtle.deriveBits(ecdh, local.privateKey, 256));

  const ikm = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // 0x02: tek (son) kayıt ayracı
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, cipher);
}

export const pushConfigured = (env: Env) => Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY);

/**
 * Bir aboneliğe bildirim gönderir. "gone": abonelik artık geçersiz (silinmeli), "ok" ya da "failed".
 */
export async function sendPush(env: Env, sub: PushSubscriptionRow, payload: PushPayload): Promise<"ok" | "gone" | "failed"> {
  try {
    const body = await encryptPayload(enc.encode(JSON.stringify(payload)), sub.p256dh, sub.auth);
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidAuthorization(env, sub.endpoint),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: String(3 * 24 * 3600),
        Urgency: "normal",
        ...(payload.tag ? { Topic: payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) } : {}),
      },
      body,
    });
    if (res.status === 404 || res.status === 410) return "gone";
    if (!res.ok) {
      console.error(`[push] ${new URL(sub.endpoint).host} ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return "failed";
    }
    return "ok";
  } catch (err) {
    console.error("[push] gönderilemedi:", err);
    return "failed";
  }
}

/** Kullanıcının tüm aboneliklerine gönderir, geçersiz olanları siler; başarılı gönderim sayısını döner */
export async function pushToUser(env: Env, userId: number, payload: PushPayload): Promise<number> {
  if (!pushConfigured(env)) return 0;
  const { results } = await env.DB.prepare("SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?").bind(userId).all<PushSubscriptionRow>();
  let sent = 0;
  for (const sub of results) {
    const r = await sendPush(env, sub, payload);
    if (r === "ok") sent++;
    if (r === "gone") await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(sub.id).run();
  }
  return sent;
}
