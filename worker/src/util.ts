import type { Context } from "hono";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  JWT_SECRET_KEY: string;
  APP_URL?: string;
  MAIL_FROM: string;
  RESEND_API_KEY?: string;
  PASSWORD_ITERATIONS?: string;
  /** Google ile giriş (ikisi de secret); yoksa Google butonu gizlenir */
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  /** Yayın takibi (#19): GitHub Actions'taki zamanlanmış işin kullandığı paylaşılan anahtar */
  CRON_SECRET?: string;
  /** Dizi/film ayrıntıları için OMDb (IMDb verisi) anahtarı; yoksa IMDb araması kapalıdır */
  OMDB_API_KEY?: string;
  /** Kitap ayrıntıları için Google Books API anahtarı (ücretsiz); yoksa yalnızca Open Library kullanılır */
  GOOGLE_BOOKS_API_KEY?: string;
  /** "development" olduğunda mail gönderilmez, bağlantı loga yazılır */
  ENVIRONMENT?: string;
};

export type AuthUser = { userId: number; username: string; isAdmin: boolean };
export type AppEnv = { Bindings: Env; Variables: { user?: AuthUser } };
export type Ctx = Context<AppEnv>;

/** Go'nun JSON çözümleyicisi alan adlarında büyük/küçük harfe bakmıyordu; istemciler buna güveniyor. */
export function field(body: Record<string, unknown> | null | undefined, name: string): unknown {
  if (!body) return undefined;
  if (name in body) return body[name];
  const lower = name.toLowerCase();
  for (const key of Object.keys(body)) {
    if (key.toLowerCase() === lower) return body[key];
  }
  return undefined;
}

export const str = (v: unknown): string => (v === null || v === undefined ? "" : String(v));

export function int(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseInt(str(v), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export function num(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : parseFloat(str(v));
  return Number.isFinite(n) ? n : fallback;
}

export function bool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return ["true", "1", "t", "yes"].includes(str(v).toLowerCase());
}

export async function readJson(c: Ctx): Promise<Record<string, unknown>> {
  try {
    const body = await c.req.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const message = (c: Ctx, text: string, status = 200) =>
  c.json({ message: text }, status as 200);

export const nowIso = () => new Date().toISOString();
