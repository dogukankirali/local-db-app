import { sign, verify } from "hono/jwt";
import type { MiddlewareHandler } from "hono";
import type { AppEnv, AuthUser, Env } from "./util";

// Şifreler PBKDF2-SHA256 ile saklanır (Workers'ın yerleşik WebCrypto'su).
// Biçim: pbkdf2$sha256$<iterasyon>$<tuz-base64>$<özet-base64>
// İterasyon sayısı hash içinde tutulur; ücretli plana geçilirse PASSWORD_ITERATIONS artırılabilir
// ve eski hash'ler doğrulanmaya devam eder.

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (ch) => ch.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
}

export async function hashPassword(password: string, iterations: number): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, iterations);
  return `pbkdf2$sha256$${iterations}$${b64(salt)}$${b64(hash)}`;
}

export async function checkPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") return false;
  const iterations = parseInt(parts[2], 10);
  if (!Number.isFinite(iterations) || iterations < 1) return false;
  const actual = new Uint8Array(await derive(password, unb64(parts[3]), iterations));
  const expected = unb64(parts[4]);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}

export const iterationsFor = (env: Env) => {
  const n = parseInt(env.PASSWORD_ITERATIONS ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 10_000;
};

export async function generateToken(env: Env, user: { id: number; username: string; is_admin: number | boolean }) {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    {
      userId: user.id,
      username: user.username,
      isAdmin: Boolean(user.is_admin),
      iat: now,
      nbf: now,
      exp: now + 24 * 60 * 60,
      iss: "kiroku",
      sub: String(user.id),
    },
    env.JWT_SECRET_KEY,
    "HS256"
  );
}

async function readUser(env: Env, header: string | undefined): Promise<AuthUser | null> {
  const parts = (header ?? "").split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer" || !env.JWT_SECRET_KEY) return null;
  try {
    const p = await verify(parts[1], env.JWT_SECRET_KEY, "HS256");
    return { userId: Number(p.userId), username: String(p.username), isAdmin: Boolean(p.isAdmin) };
  } catch {
    return null;
  }
}

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header) return c.json({ error: "Yetkilendirme başlığı eksik" }, 401);
  const user = await readUser(c.env, header);
  if (!user) return c.json({ error: "Geçersiz veya süresi dolmuş token" }, 401);
  c.set("user", user);
  await next();
};

export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = await readUser(c.env, c.req.header("Authorization"));
  if (!user) return c.json({ error: "Bu işlem için giriş yapmalısın" }, 401);
  if (!user.isAdmin) return c.json({ error: "Bu işlem için admin yetkisi gerekiyor" }, 403);
  c.set("user", user);
  await next();
};

// Şifre sıfırlama token'ı: bağlantıda ham değer, DB'de SHA-256 özeti tutulur
export function generateResetToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function hashResetToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
