import { Hono } from "hono";
import { requireAdmin, requireAuth } from "./auth";
import { field, int, num, readJson, str, type AppEnv, type Ctx } from "./util";

// Manga chapters: MangaDex (live, pages never stored) and CBZ uploads (WebP pages in R2).
// The MangaDex API is proxied through the Worker: browsers cannot set the User-Agent MangaDex asks for
// and its API does not serve CORS for arbitrary origins. Page images are proxied too, but only from
// MangaDex at-home hosts, as a fallback when the browser cannot load them directly.

const MANGADEX = "https://api.mangadex.org";
const MD_HEADERS = { "User-Agent": "Kiroku/1.0 (+https://app.dogukankirali.com)", Accept: "application/json" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_RE = /^[a-z0-9-]{1,32}$/;
const LANG_RE = /^[a-z]{2}(-[a-z]{2})?$/i;
const MAX_PAGES = 500;
const MAX_PAGE_BYTES = 10 * 1024 * 1024;

type ChapterRow = {
  id: number;
  manga_id: number;
  number: number;
  volume: string | null;
  title: string;
  source: string;
  external_id: string | null;
  page_count: number;
  r2_prefix: string | null;
  lang: string;
  group_name: string | null;
  uploaded_by: number | null;
  published_at: string | null;
  created_at: string;
};

const toChapter = (r: ChapterRow) => ({
  id: r.id,
  mangaId: r.manga_id,
  number: r.number,
  volume: r.volume ?? "",
  title: r.title,
  source: r.source,
  externalId: r.external_id ?? "",
  pageCount: r.page_count,
  stored: Boolean(r.r2_prefix),
  lang: r.lang,
  groupName: r.group_name ?? "",
  publishedAt: r.published_at ?? "",
  createdAt: r.created_at,
});

const pageKey = (prefix: string, n: number) => `${prefix}/${String(n).padStart(4, "0")}.webp`;

async function mdFetch(path: string) {
  return fetch(`${MANGADEX}${path}`, { headers: MD_HEADERS, cf: { cacheTtl: 300, cacheEverything: true } });
}

const passJson = async (res: Response) =>
  new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=60" } });

function bucket(c: Ctx) {
  const b = c.env.MANGA_BUCKET;
  if (!b) throw new Error("MANGA_BUCKET binding eksik");
  return b;
}

async function chapterById(c: Ctx, id: number) {
  return c.env.DB.prepare("SELECT * FROM manga_chapter WHERE id = ?").bind(id).first<ChapterRow>();
}

export const chapters = new Hono<AppEnv>();

chapters.get("/manga/:id{[0-9]+}/chapters", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT * FROM manga_chapter WHERE manga_id = ? ORDER BY number ASC, lang ASC, id ASC"
  )
    .bind(int(c.req.param("id")))
    .all<ChapterRow>();
  return c.json(results.map(toChapter));
});

chapters.get("/manga/chapters/:cid{[0-9]+}", requireAuth, async (c) => {
  const ch = await chapterById(c, int(c.req.param("cid")));
  return ch ? c.json(toChapter(ch)) : c.json({ message: "Bölüm bulunamadı" }, 404);
});

// Links (or unlinks with "") the manga to a MangaDex title
chapters.put("/manga/:id{[0-9]+}/mangadex", requireAdmin, async (c) => {
  const mdId = str(field(await readJson(c), "mangadexId")).trim();
  if (mdId && !UUID_RE.test(mdId)) return c.json({ message: "Geçersiz MangaDex id" }, 400);
  const res = await c.env.DB.prepare("UPDATE manga SET mangadex_id = ? WHERE id = ?").bind(mdId || null, int(c.req.param("id"))).run();
  if (!res.meta.changes) return c.json({ message: "Manga bulunamadı" }, 404);
  return c.json({ message: "OK", mangadexId: mdId });
});

// Saves MangaDex chapter metadata (the browser lists the feed through the proxy and posts the chosen chapters)
chapters.post("/manga/:id{[0-9]+}/chapters/mangadex", requireAdmin, async (c) => {
  const mangaId = int(c.req.param("id"));
  const db = c.env.DB;
  if (!(await db.prepare("SELECT id FROM manga WHERE id = ?").bind(mangaId).first())) return c.json({ message: "Manga bulunamadı" }, 404);
  const items = field(await readJson(c), "chapters");
  if (!Array.isArray(items) || !items.length) return c.json({ message: "chapters boş" }, 400);
  const stmts = (items as Record<string, unknown>[]).slice(0, 2000).flatMap((it) => {
    const ext = str(field(it, "externalId"));
    const lang = str(field(it, "lang"));
    if (!UUID_RE.test(ext) || (lang && !LANG_RE.test(lang))) return [];
    return [
      db
        .prepare(
          `INSERT INTO manga_chapter (manga_id, number, volume, title, source, external_id, page_count, lang, group_name, published_at)
           VALUES (?, ?, ?, ?, 'mangadex', ?, ?, ?, ?, ?)
           ON CONFLICT (manga_id, source, external_id) WHERE external_id IS NOT NULL DO UPDATE SET
             number = excluded.number, volume = excluded.volume, title = excluded.title, page_count = excluded.page_count,
             lang = excluded.lang, group_name = excluded.group_name, published_at = excluded.published_at`
        )
        .bind(
          mangaId, num(field(it, "number")), str(field(it, "volume")) || null, str(field(it, "title")).slice(0, 300), ext,
          Math.max(0, int(field(it, "pageCount"))), lang, str(field(it, "groupName")).slice(0, 200) || null, str(field(it, "publishedAt")) || null
        ),
    ];
  });
  if (!stmts.length) return c.json({ message: "Geçerli bölüm yok" }, 400);
  for (let i = 0; i < stmts.length; i += 100) await db.batch(stmts.slice(i, i + 100));
  return c.json({ message: "OK", saved: stmts.length });
});

// Generic R2 upload, step 1: create (or reset) the chapter row; pages follow with PUT .../pages/:n.
// Used by the CBZ uploader (source "upload") and later by source adapters (their own source slug +
// external_id + scanlator). Re-uploading the same (source, external_id) replaces the stored chapter.
chapters.post("/manga/:id{[0-9]+}/chapters/upload", requireAdmin, async (c) => {
  const mangaId = int(c.req.param("id"));
  const body = await readJson(c);
  const pageCount = int(field(body, "pageCount"));
  const lang = str(field(body, "lang")) || "tr";
  const source = str(field(body, "source")) || "upload";
  const externalId = str(field(body, "externalId")).trim().slice(0, 200) || null;
  if (pageCount < 1 || pageCount > MAX_PAGES) return c.json({ message: `Sayfa sayısı 1-${MAX_PAGES} olmalı` }, 400);
  if (!LANG_RE.test(lang)) return c.json({ message: "Geçersiz dil" }, 400);
  if (!SOURCE_RE.test(source)) return c.json({ message: "Geçersiz kaynak" }, 400);
  const b = bucket(c);
  const db = c.env.DB;
  if (!(await db.prepare("SELECT id FROM manga WHERE id = ?").bind(mangaId).first())) return c.json({ message: "Manga bulunamadı" }, 404);
  const values = [
    num(field(body, "number")), str(field(body, "volume")) || null, str(field(body, "title")).slice(0, 300), pageCount, lang,
    str(field(body, "scanlator") ?? field(body, "groupName")).slice(0, 200) || null, c.get("user")!.userId,
  ];

  const existing = externalId
    ? await db.prepare("SELECT * FROM manga_chapter WHERE manga_id = ? AND source = ? AND external_id = ?").bind(mangaId, source, externalId).first<ChapterRow>()
    : null;
  let id: number;
  if (existing) {
    id = existing.id;
    // Drop pages beyond the new count; the rest are overwritten by the new upload
    if (existing.r2_prefix && existing.page_count > pageCount) {
      await b.delete(Array.from({ length: existing.page_count - pageCount }, (_, i) => pageKey(existing.r2_prefix!, pageCount + i + 1)));
    }
    await db
      .prepare("UPDATE manga_chapter SET number = ?, volume = ?, title = ?, page_count = ?, lang = ?, group_name = ?, uploaded_by = ? WHERE id = ?")
      .bind(...values, id)
      .run();
  } else {
    const res = await db
      .prepare(
        `INSERT INTO manga_chapter (manga_id, number, volume, title, page_count, lang, group_name, uploaded_by, source, external_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(mangaId, ...values, source, externalId)
      .run();
    id = Number(res.meta.last_row_id);
  }
  await db.prepare("UPDATE manga_chapter SET r2_prefix = COALESCE(r2_prefix, ?) WHERE id = ?").bind(`manga/${mangaId}/${id}`, id).run();
  return c.json(toChapter((await chapterById(c, id))!), existing ? 200 : 201);
});

// R2-backed pages (any source): only the uploader or an admin may write or read them
async function ownUpload(c: Ctx) {
  const ch = await chapterById(c, int(c.req.param("cid")));
  const user = c.get("user")!;
  if (!ch || !ch.r2_prefix) return { error: c.json({ message: "Bölüm bulunamadı" }, 404) };
  if (!user.isAdmin && ch.uploaded_by !== user.userId) return { error: c.json({ message: "Bu bölüme erişim yetkin yok" }, 403) };
  const n = int(c.req.param("n"));
  if (n < 1 || n > ch.page_count) return { error: c.json({ message: "Geçersiz sayfa" }, 400) };
  return { ch, n };
}

chapters.put("/manga/chapters/:cid{[0-9]+}/pages/:n{[0-9]+}", requireAdmin, async (c) => {
  const r = await ownUpload(c);
  if ("error" in r) return r.error;
  if (c.req.header("Content-Type") !== "image/webp") return c.json({ message: "Sayfa image/webp olmalı" }, 415);
  const data = await c.req.arrayBuffer();
  if (data.byteLength < 12 || data.byteLength > MAX_PAGE_BYTES) return c.json({ message: "Sayfa boyutu geçersiz" }, 413);
  // RIFF....WEBP signature
  const head = new Uint8Array(data, 0, 12);
  if (String.fromCharCode(...head.slice(0, 4)) !== "RIFF" || String.fromCharCode(...head.slice(8, 12)) !== "WEBP") {
    return c.json({ message: "Geçerli bir WebP değil" }, 415);
  }
  await bucket(c).put(pageKey(r.ch.r2_prefix!, r.n), data, { httpMetadata: { contentType: "image/webp" } });
  return c.json({ message: "OK", page: r.n });
});

chapters.get("/manga/chapters/:cid{[0-9]+}/pages/:n{[0-9]+}", requireAuth, async (c) => {
  const r = await ownUpload(c);
  if ("error" in r) return r.error;
  const obj = await bucket(c).get(pageKey(r.ch.r2_prefix!, r.n));
  if (!obj) return c.json({ message: "Sayfa bulunamadı" }, 404);
  return new Response(obj.body, {
    headers: { "Content-Type": "image/webp", "Cache-Control": "private, max-age=86400", ETag: obj.httpEtag },
  });
});

chapters.delete("/manga/chapters/:cid{[0-9]+}", requireAdmin, async (c) => {
  const ch = await chapterById(c, int(c.req.param("cid")));
  if (!ch) return c.json({ message: "Bölüm bulunamadı" }, 404);
  if (ch.r2_prefix && c.env.MANGA_BUCKET) {
    const keys = Array.from({ length: ch.page_count }, (_, i) => pageKey(ch.r2_prefix!, i + 1));
    for (let i = 0; i < keys.length; i += 1000) await c.env.MANGA_BUCKET.delete(keys.slice(i, i + 1000));
  }
  await c.env.DB.prepare("DELETE FROM manga_chapter WHERE id = ?").bind(ch.id).run();
  return c.json({ message: "OK" });
});

// ---- MangaDex proxy (read-only, whitelisted paths) ----

chapters.get("/mangadex/search", requireAuth, async (c) => {
  const title = (c.req.query("title") ?? "").trim();
  if (!title) return c.json({ message: "title gerekli" }, 400);
  const p = new URLSearchParams({ title, limit: "15" });
  p.append("includes[]", "cover_art");
  for (const r of ["safe", "suggestive", "erotica"]) p.append("contentRating[]", r);
  return passJson(await mdFetch(`/manga?${p}`));
});

chapters.get("/mangadex/manga/:uuid/feed", requireAuth, async (c) => {
  const uuid = c.req.param("uuid");
  if (!UUID_RE.test(uuid)) return c.json({ message: "Geçersiz id" }, 400);
  const p = new URLSearchParams({ limit: "500", offset: String(Math.max(0, int(c.req.query("offset")))), "order[chapter]": "asc" });
  for (const l of c.req.queries("lang") ?? ["en", "tr"]) if (LANG_RE.test(l)) p.append("translatedLanguage[]", l);
  p.append("includes[]", "scanlation_group");
  for (const r of ["safe", "suggestive", "erotica"]) p.append("contentRating[]", r);
  return passJson(await mdFetch(`/manga/${uuid}/feed?${p}`));
});

chapters.get("/mangadex/at-home/:uuid", requireAuth, async (c) => {
  const uuid = c.req.param("uuid");
  if (!UUID_RE.test(uuid)) return c.json({ message: "Geçersiz id" }, 400);
  return passJson(await mdFetch(`/at-home/server/${uuid}`));
});

// Image fallback: only MangaDex at-home / upload hosts over https
chapters.get("/mangadex/image", requireAuth, async (c) => {
  let url: URL;
  try {
    url = new URL(c.req.query("url") ?? "");
  } catch {
    return c.json({ message: "Geçersiz adres" }, 400);
  }
  const okHost = url.hostname.endsWith(".mangadex.network") || url.hostname === "uploads.mangadex.org";
  if (url.protocol !== "https:" || !okHost) return c.json({ message: "İzin verilmeyen adres" }, 400);
  const res = await fetch(url.toString(), { headers: { "User-Agent": MD_HEADERS["User-Agent"] }, cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!res.ok) return c.json({ message: `MangaDex ${res.status}` }, 502);
  return new Response(res.body, {
    headers: { "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg", "Cache-Control": "private, max-age=86400" },
  });
});
