#!/usr/bin/env node
// Bir kullanıcının şifresini D1'de doğrudan belirler (taşıma sonrası veya unutulan şifre için).
//
//   npm run set-password -- <kullanıcı-adı> [--remote]
//
// Şifre terminalden sorulur (ya da KIROKU_PASSWORD ortam değişkeninden okunur).
// Hash biçimi Worker'daki src/auth.ts ile aynıdır.
import { execFileSync } from "node:child_process";
import { pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline";

const args = process.argv.slice(2);
const remote = args.includes("--remote");
const username = args.find((a) => !a.startsWith("--"));
if (!username) {
  console.error("Kullanım: npm run set-password -- <kullanıcı-adı> [--remote]");
  process.exit(1);
}

async function ask(question) {
  if (process.env.KIROKU_PASSWORD) return process.env.KIROKU_PASSWORD;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (a) => (rl.close(), resolve(a))));
}

const password = await ask(`${username} için yeni şifre: `);
if (password.length < 6) {
  console.error("Şifre en az 6 karakter olmalı");
  process.exit(1);
}

const iterations = Number(process.env.PASSWORD_ITERATIONS) || 10000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const stored = `pbkdf2$sha256$${iterations}$${salt.toString("base64")}$${hash.toString("base64")}`;
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `UPDATE users SET password = ${q(stored)}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE username = ${q(username)}; SELECT changes() AS updated;`;

const out = execFileSync("npx", ["wrangler", "d1", "execute", "kiroku", remote ? "--remote" : "--local", "--json", "--command", sql], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
const updated = JSON.parse(out).at(-1)?.results?.[0]?.updated ?? 0;
console.log(updated ? `${username} şifresi güncellendi (${remote ? "Cloudflare" : "lokal"} D1)` : `${username} bulunamadı`);
process.exit(updated ? 0 : 1);
