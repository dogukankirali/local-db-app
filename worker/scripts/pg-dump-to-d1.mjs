#!/usr/bin/env node
// Postgres pg_dump (düz SQL, COPY bloklu) çıktısını D1'e yüklenebilir SQL'e çevirir.
//
//   node scripts/pg-dump-to-d1.mjs <dump.sql> [çıktı.sql]
//   npx wrangler d1 execute kiroku --local  --file=.import/data.sql   # lokal
//   npx wrangler d1 execute kiroku --remote --file=.import/data.sql   # Cloudflare
//
// Şifreler taşınmaz: eski bcrypt hash'leri Workers'ın ücretsiz CPU sınırında
// doğrulanamıyor. Kullanıcılar aktarılır, şifreleri `npm run set-password` ile yeniden belirlenir.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const [, , input, output = ".import/data.sql"] = process.argv;
if (!input) {
  console.error("Kullanım: node scripts/pg-dump-to-d1.mjs <dump.sql> [çıktı.sql]");
  process.exit(1);
}

// D1 tek SQL ifadesini 100 KB ile sınırlıyor; büyük değerler parça parça eklenir
const MAX_CHUNK = 60_000;

function unescapeCopy(v) {
  if (v === "\\N") return null;
  return v.replace(/\\(.)/g, (_, c) => ({ t: "\t", n: "\n", r: "\r", b: "\b", f: "\f", v: "\v", "\\": "\\" })[c] ?? c);
}

function parseCopyBlocks(sql) {
  const tables = {};
  const lines = sql.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^COPY ([\w.]+) \(([^)]*)\) FROM stdin;$/);
    if (!m) continue;
    const cols = m[2].split(",").map((c) => c.trim());
    const rows = [];
    for (i++; i < lines.length && lines[i] !== "\\."; i++) {
      const values = lines[i].split("\t").map(unescapeCopy);
      rows.push(Object.fromEntries(cols.map((c, j) => [c, values[j]])));
    }
    tables[m[1]] = rows;
  }
  return tables;
}

const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const b = (v) => (v === "t" || v === "true" ? 1 : 0);
const n = (v) => (v === null || v === undefined || v === "" ? "NULL" : Number(v));
const ts = (v) => (v ? q(new Date(v.replace(" ", "T").replace(/\+00$/, "Z")).toISOString()) : "NULL");

const t = parseCopyBlocks(readFileSync(input, "utf8"));
const out = [
  "-- pg-dump-to-d1 ile üretildi; mevcut veriyi siler ve yeniden yükler",
  "PRAGMA defer_foreign_keys = true;",
  "DELETE FROM watch_lists;",
  "DELETE FROM animes_genres;",
  "DELETE FROM animes;",
  "DELETE FROM genres;",
  "DELETE FROM anime_series;",
  "DELETE FROM users;",
];

for (const r of t["anime.anime_series"] ?? []) {
  out.push(`INSERT INTO anime_series (id, name) VALUES (${n(r.id)}, ${q(r.name)});`);
}
for (const r of t["anime.genres"] ?? []) {
  out.push(`INSERT INTO genres (id, genre_name) VALUES (${n(r.id)}, ${q(r.genre_name)});`);
}

const animeIds = new Set();
const ptw = [];
for (const r of t["anime.animes"] ?? []) {
  animeIds.add(r.id);
  if (b(r.plan_to_watch)) ptw.push(r.id);
  const cover = r.cover ?? null;
  const firstCover = cover && cover.length > MAX_CHUNK ? cover.slice(0, MAX_CHUNK) : cover;
  // plan_to_watch en sonda açılır ki watchlist sırası trigger'la yeniden kurulmasın
  out.push(
    `INSERT INTO animes (id, name, anime_status, watch_status, total_number_of_episodes, is_movie, score, mal_score, notes, anime_link, mal_anime_link, cover, series, plan_to_watch) VALUES (` +
      [n(r.id), q(r.name), q(r.anime_status ?? ""), n(r.watch_status) === "NULL" ? 0 : n(r.watch_status),
        n(r.total_number_of_episodes) === "NULL" ? 0 : n(r.total_number_of_episodes), b(r.is_movie), n(r.score),
        n(r.mal_score), q(r.notes), q(r.anime_link), q(r.mal_anime_link), q(firstCover),
        n(r.series) === "NULL" ? 0 : n(r.series), 0].join(", ") +
      ");"
  );
  for (let i = MAX_CHUNK; cover && i < cover.length; i += MAX_CHUNK) {
    out.push(`UPDATE animes SET cover = cover || ${q(cover.slice(i, i + MAX_CHUNK))} WHERE id = ${n(r.id)};`);
  }
}

const seenPairs = new Set();
let orphans = 0;
for (const r of t["anime.animes_genres"] ?? []) {
  const key = `${r.anime_id}:${r.genre_id}`;
  if (!animeIds.has(r.anime_id) || seenPairs.has(key)) {
    orphans++;
    continue;
  }
  seenPairs.add(key);
  out.push(`INSERT OR IGNORE INTO animes_genres (anime_id, genre_id) VALUES (${n(r.anime_id)}, ${n(r.genre_id)});`);
}

// Watchlist: dump'taki sıra korunur, ardından listede olmayan PTW animeler eklenir
const listed = new Set();
for (const r of [...(t["anime.watch_lists"] ?? [])].sort((a, c) => Number(a.order_rank) - Number(c.order_rank))) {
  if (!animeIds.has(r.anime_id) || listed.has(r.anime_id)) continue;
  listed.add(r.anime_id);
  out.push(
    `INSERT INTO watch_lists (id, anime_id, order_rank, created_at, updated_at) VALUES (${n(r.id)}, ${n(r.anime_id)}, ${n(r.order_rank)}, ${ts(r.created_at) === "NULL" ? "strftime('%Y-%m-%dT%H:%M:%fZ','now')" : ts(r.created_at)}, ${ts(r.updated_at) === "NULL" ? "strftime('%Y-%m-%dT%H:%M:%fZ','now')" : ts(r.updated_at)});`
  );
}
for (const id of ptw) {
  // listede zaten varsa trigger INSERT OR IGNORE ile atlar
  out.push(`UPDATE animes SET plan_to_watch = 1 WHERE id = ${n(id)};`);
}

let users = 0;
for (const r of t["public.users"] ?? []) {
  if (r.deleted_at) continue;
  users++;
  // Geçersiz bir hash: set-password çalıştırılana kadar bu hesapla giriş yapılamaz
  out.push(
    `INSERT INTO users (id, username, email, password, first_name, last_name, is_active, is_admin, last_login, created_at, updated_at) VALUES (` +
      [n(r.id), q(r.username), q(r.email), q("!reset-required"), q(r.first_name), q(r.last_name), b(r.is_active ?? "t"),
        b(r.is_admin), ts(r.last_login), ts(r.created_at) === "NULL" ? "strftime('%Y-%m-%dT%H:%M:%fZ','now')" : ts(r.created_at),
        ts(r.updated_at) === "NULL" ? "strftime('%Y-%m-%dT%H:%M:%fZ','now')" : ts(r.updated_at)].join(", ") +
      ");"
  );
}

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, out.join("\n") + "\n");
console.log(
  `${output}: ${animeIds.size} anime, ${(t["anime.genres"] ?? []).length} tür, ${(t["anime.anime_series"] ?? []).length} seri, ` +
    `${seenPairs.size} anime-tür bağı (${orphans} yetim/tekrar atlandı), ${listed.size + ptw.filter((id) => !listed.has(id)).length} watchlist, ${users} kullanıcı`
);
console.log("Kullanıcı şifreleri taşınmadı; her hesap için: npm run set-password -- <kullanıcı-adı>");
