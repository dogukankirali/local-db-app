import { Hono } from "hono";
import {
  checkPassword,
  generateResetToken,
  generateToken,
  hashPassword,
  hashResetToken,
  iterationsFor,
  requireAuth,
} from "./auth";
import { EmailNotConfigured, sendPasswordResetEmail } from "./email";
import { field, message, nowIso, readJson, str, type AppEnv } from "./util";

type UserRow = {
  id: number;
  username: string;
  email: string;
  password: string;
  first_name: string | null;
  last_name: string | null;
  is_active: number;
  is_admin: number;
  last_login: string | null;
  reset_password_token: string | null;
  reset_password_expires: string | null;
  created_at: string;
  updated_at: string;
};

const toUserResponse = (u: UserRow, token?: string) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  firstName: u.first_name ?? "",
  lastName: u.last_name ?? "",
  isActive: Boolean(u.is_active),
  isAdmin: Boolean(u.is_admin),
  lastLogin: u.last_login,
  createdAt: u.created_at,
  updatedAt: u.updated_at,
  ...(token ? { token } : {}),
});

const FORGOT_MESSAGE = "Bu e-posta adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi";
const INVALID_LINK = "Geçersiz veya süresi dolmuş bağlantı";

export const users = new Hono<AppEnv>();

users.post("/auth/register", async (c) => {
  const body = await readJson(c);
  const username = str(field(body, "username")).trim();
  const email = str(field(body, "email")).trim();
  const password = str(field(body, "password"));
  if (username.length < 3 || !email.includes("@")) return message(c, "Geçersiz istek formatı", 400);
  if (password.length < 6) return message(c, "Şifre en az 6 karakter olmalı", 400);

  const db = c.env.DB;
  const existing = await db
    .prepare("SELECT username FROM users WHERE username = ? OR email = ?")
    .bind(username, email)
    .first<{ username: string }>();
  if (existing) {
    return message(c, existing.username === username ? "Bu kullanıcı adı zaten kullanılıyor" : "Bu e-posta adresi zaten kullanılıyor", 409);
  }

  const hash = await hashPassword(password, iterationsFor(c.env));
  const user = await db
    .prepare("INSERT INTO users (username, email, password, first_name, last_name) VALUES (?, ?, ?, ?, ?) RETURNING *")
    .bind(username, email, hash, str(field(body, "firstName")), str(field(body, "lastName")))
    .first<UserRow>();
  if (!user) return message(c, "Kullanıcı oluşturulurken bir hata oluştu", 500);
  return c.json(toUserResponse(user, await generateToken(c.env, user)), 201);
});

users.post("/auth/login", async (c) => {
  const body = await readJson(c);
  const db = c.env.DB;
  const user = await db.prepare("SELECT * FROM users WHERE username = ?").bind(str(field(body, "username"))).first<UserRow>();
  if (!user || !(await checkPassword(str(field(body, "password")), user.password))) {
    return message(c, "Geçersiz kullanıcı adı veya şifre", 401);
  }
  const now = nowIso();
  await db.prepare("UPDATE users SET last_login = ?, updated_at = ? WHERE id = ?").bind(now, now, user.id).run();
  user.last_login = now;
  user.updated_at = now;
  return c.json(toUserResponse(user, await generateToken(c.env, user)));
});

users.get("/auth/profile", requireAuth, async (c) => {
  const user = await c.env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(c.get("user")!.userId).first<UserRow>();
  if (!user) return message(c, "Kullanıcı bulunamadı", 404);
  return c.json(toUserResponse(user));
});

users.put("/auth/profile", requireAuth, async (c) => {
  const db = c.env.DB;
  const userId = c.get("user")!.userId;
  const user = await db.prepare("SELECT * FROM users WHERE id = ?").bind(userId).first<UserRow>();
  if (!user) return message(c, "Kullanıcı bulunamadı", 404);

  const body = await readJson(c);
  const email = str(field(body, "email")).trim();
  const firstName = str(field(body, "firstName"));
  const lastName = str(field(body, "lastName"));
  const password = str(field(body, "password"));

  if (email && email !== user.email) {
    const taken = await db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").bind(email, userId).first();
    if (taken) return message(c, "Bu e-posta adresi zaten kullanılıyor", 409);
    user.email = email;
  }
  if (firstName) user.first_name = firstName;
  if (lastName) user.last_name = lastName;
  if (password) {
    // Çalınan bir token ile şifre değiştirilemesin
    if (!(await checkPassword(str(field(body, "currentPassword")), user.password))) {
      return message(c, "Mevcut şifre hatalı", 400);
    }
    if (password.length < 6) return message(c, "Yeni şifre en az 6 karakter olmalı", 400);
    user.password = await hashPassword(password, iterationsFor(c.env));
  }
  user.updated_at = nowIso();
  await db
    .prepare("UPDATE users SET email = ?, first_name = ?, last_name = ?, password = ?, updated_at = ? WHERE id = ?")
    .bind(user.email, user.first_name, user.last_name, user.password, user.updated_at, userId)
    .run();
  return c.json(toUserResponse(user));
});

// Hesabın var olup olmadığını sızdırmamak için her durumda aynı mesajı döner
users.post("/auth/forgot-password", async (c) => {
  const email = str(field(await readJson(c), "email")).trim();
  if (!email) return message(c, "Geçerli bir e-posta adresi girin", 400);

  const db = c.env.DB;
  const user = await db.prepare("SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)").bind(email).first<{ id: number; email: string }>();
  if (!user) return message(c, FORGOT_MESSAGE);

  const token = generateResetToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  await db
    .prepare("UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE id = ?")
    .bind(await hashResetToken(token), expires, user.id)
    .run();

  try {
    await sendPasswordResetEmail(c.env, user.email, token, new URL(c.req.url).origin);
  } catch (err) {
    console.error(`Şifre sıfırlama e-postası gönderilemedi (kullanıcı ${user.id}):`, err);
    return message(
      c,
      err instanceof EmailNotConfigured ? "E-posta gönderimi sunucuda yapılandırılmamış" : "E-posta gönderilemedi, lütfen daha sonra tekrar deneyin",
      503
    );
  }
  return message(c, FORGOT_MESSAGE);
});

users.post("/auth/reset-password", async (c) => {
  const body = await readJson(c);
  const token = str(field(body, "token"));
  const password = str(field(body, "password"));
  if (password.length < 6) return message(c, "Şifre en az 6 karakter olmalı", 400);
  if (!token) return message(c, INVALID_LINK, 400);

  const db = c.env.DB;
  const user = await db
    .prepare("SELECT id, reset_password_expires FROM users WHERE reset_password_token = ?")
    .bind(await hashResetToken(token))
    .first<{ id: number; reset_password_expires: string | null }>();
  if (!user || !user.reset_password_expires || Date.parse(user.reset_password_expires) < Date.now()) {
    return message(c, INVALID_LINK, 400);
  }
  await db
    .prepare("UPDATE users SET password = ?, reset_password_token = NULL, reset_password_expires = NULL, updated_at = ? WHERE id = ?")
    .bind(await hashPassword(password, iterationsFor(c.env)), nowIso(), user.id)
    .run();
  return message(c, "Şifren güncellendi, giriş yapabilirsin");
});
