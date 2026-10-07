#!/usr/bin/env node
// Manga kütüphanesini (CBZ klasörü) okuyucuya HTTP ile sunan geliştirme sunucusu.
// Klasör listesi Caddy'nin `file_server browse` JSON çıktısıyla aynı biçimde döner
// (Accept: application/json → [{ name, size, url, mod_time, is_dir }]); prod'da aynı klasör
// Caddy + Cloudflare Tunnel ile sunulduğunda okuyucu değişmeden çalışır.
//
// Kullanım: node scripts/manga-library.mjs [klasör] [--port 8788]
//   klasör varsayılanı: <kullanıcı>/Downloads/Kiroku/Manga (Manga İndirici'nin kaydettiği yer)

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve, sep, extname } from "node:path";

const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 8788;
const rootArg = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--port");
const root = resolve(rootArg ?? join(homedir(), "Downloads", "Kiroku", "Manga"));

const TYPES = {
  ".cbz": "application/vnd.comicbook+zip",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Accept, Authorization, Range",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range",
};

createServer(async (req, res) => {
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(405, cors).end();

  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const target = resolve(join(root, path));
  // Kök dışına çıkmaya (../) izin verme
  if (target !== root && !target.startsWith(root + sep)) return res.writeHead(403, cors).end();

  try {
    const info = await stat(target);
    if (info.isDirectory()) {
      const entries = await Promise.all(
        (await readdir(target)).map(async (name) => {
          const s = await stat(join(target, name));
          return { name, size: s.size, url: `./${encodeURIComponent(name)}${s.isDirectory() ? "/" : ""}`, mod_time: s.mtime.toISOString(), is_dir: s.isDirectory() };
        })
      );
      res.writeHead(200, { ...cors, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
      return res.end(JSON.stringify(entries));
    }
    res.writeHead(200, {
      ...cors,
      "Content-Type": TYPES[extname(target).toLowerCase()] ?? "application/octet-stream",
      "Content-Length": info.size,
      "Last-Modified": info.mtime.toUTCString(),
    });
    if (req.method === "HEAD") return res.end();
    createReadStream(target).pipe(res);
  } catch {
    res.writeHead(404, cors).end();
  }
}).listen(port, () => {
  console.log(`Manga kütüphanesi: http://localhost:${port}  →  ${root}`);
});
