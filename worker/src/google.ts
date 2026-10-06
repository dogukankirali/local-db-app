import { Hono } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { generateToken } from "./auth";
import { toUserResponse, type UserRow } from "./users";
import { nowIso, type AppEnv, type Ctx } from "./util";

// Google ile giriş (OAuth 2.0 authorization code akışı, kütüphanesiz).
// /api/auth/google/start → Google onay ekranı → /api/auth/google/callback → kullanıcı e-postasıyla
// eşleştirilir (yoksa admin olmayan bir hesap açılır) → /login#google=<oturum> adresine dönülür;
// giriş sayfası hash'teki oturumu localStorage'a yazar.
// Gerekli secret'lar: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET. Yoksa uçlar kapalıdır.

const STATE_COOKIE = "kiroku_google_state";
const COOKIE_PATH = "/api/auth/google";

export const googleRoutes = new Hono<AppEnv>();

const appOrigin = (c: Ctx) => (c.env.APP_URL || new URL(c.req.url).origin).replace(/\/$/, "");
const redirectUri = (c: Ctx) => `${appOrigin(c)}/api/auth/google/callback`;
const enabled = (c: Ctx) => Boolean(c.env.GOOGLE_CLIENT_ID && c.env.GOOGLE_CLIENT_SECRET);

const b64url = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
const randomHex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((x) => x.toString(16).padStart(2, "0")).join("");

const fail = (c: Ctx, reason: string) => c.redirect(`${appOrigin(c)}/login#google_error=${encodeURIComponent(reason)}`);

googleRoutes.get("/auth/google/enabled", (c) => c.json({ enabled: enabled(c) }));

googleRoutes.get("/auth/google/start", (c) => {
  if (!enabled(c)) return c.json({ message: "Google ile giriş yapılandırılmamış" }, 404);
  const state = randomHex(16);
  setCookie(c, STATE_COOKIE, state, {
    path: COOKIE_PATH,
    httpOnly: true,
    secure: appOrigin(c).startsWith("https://"),
    sameSite: "Lax",
    maxAge: 600,
  });
  const params = new URLSearchParams({
    client_id: c.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(c),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

googleRoutes.get("/auth/google/callback", async (c) => {
  if (!enabled(c)) return fail(c, "Google ile giriş yapılandırılmamış");
  const expected = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: COOKIE_PATH });
  const { code, state, error } = c.req.query();
  if (error) return fail(c, "Google girişi iptal edildi");
  if (!code || !state || !expected || state !== expected) return fail(c, "Geçersiz giriş isteği, tekrar dene");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID!,
      client_secret: c.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(c),
      grant_type: "authorization_code",
    }),
  });
  const tokens = (await tokenRes.json().catch(() => null)) as { id_token?: string } | null;
  if (!tokenRes.ok || !tokens?.id_token) {
    console.error("Google token exchange failed", tokenRes.status);
    return fail(c, "Google ile giriş başarısız oldu");
  }

  // id_token doğrudan Google'ın token ucundan TLS üzerinden geldi; imzayı ayrıca doğrulamaya gerek yok
  let claims: { aud?: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string };
  try {
    claims = JSON.parse(fromB64url(tokens.id_token.split(".")[1]));
  } catch {
    return fail(c, "Google yanıtı okunamadı");
  }
  if (claims.aud !== c.env.GOOGLE_CLIENT_ID || !claims.email || !claims.email_verified) {
    return fail(c, "Google hesabının e-postası doğrulanmamış");
  }

  const db = c.env.DB;
  const email = claims.email.toLowerCase();
  let user = await db.prepare("SELECT * FROM users WHERE lower(email) = ?").bind(email).first<UserRow>();
  if (!user) {
    const base = email.split("@")[0].replace(/[^\w.-]/g, "").slice(0, 24) || "kullanici";
    let username = base.length >= 3 ? base : `${base}_user`;
    for (let i = 2; await db.prepare("SELECT 1 FROM users WHERE username = ?").bind(username).first(); i++) {
      username = `${base}${i}`;
    }
    // Şifresiz hesap: bu değer hiçbir şifreyle eşleşmez (checkPassword pbkdf2 biçimi bekler)
    user = await db
      .prepare("INSERT INTO users (username, email, password, first_name, last_name) VALUES (?, ?, ?, ?, ?) RETURNING *")
      .bind(username, email, `google$${randomHex(16)}`, claims.given_name ?? "", claims.family_name ?? "")
      .first<UserRow>();
    if (!user) return fail(c, "Hesap oluşturulamadı");
  }
  if (!user.is_active) return fail(c, "Bu hesap devre dışı");

  const now = nowIso();
  await db.prepare("UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?").bind(now, now, user.id).run();
  user.last_login = now;
  user.updated_at = now;
  const session = toUserResponse(user, await generateToken(c.env, user));
  return c.redirect(`${appOrigin(c)}/login#google=${b64url(JSON.stringify(session))}`);
});
