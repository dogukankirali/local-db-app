import { Hono } from "hono";
import { requireAdmin, requireAuth } from "./auth";
import { field, int, num, readJson, str, type AppEnv, type Ctx } from "./util";

// Manga chapters (metadata only): MangaDex chapters are read live; library chapters are original CBZ files in
// the user's own library (WebDAV or a local folder) at file_path, which the browser opens directly.
// No chapter file or page ever passes through or is stored by Kiroku.
// The MangaDex API is proxied through the Worker: browsers cannot set the User-Agent MangaDex asks for
// and its API does not serve CORS for arbitrary origins. Page images are proxied too, but only from
// MangaDex at-home hosts, as a fallback when the browser cannot load them directly.

const MANGADEX = "https://api.mangadex.org";
const MD_HEADERS = { "User-Agent": "Kiroku/1.0 (+https://app.dogukankirali.com)", Accept: "application/json" };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SOURCE_RE = /^[a-z0-9-]{1,32}$/;
const LANG_RE = /^[a-z]{2}(-[a-z]{2})?$/i;

type ChapterRow = {
  id: number;
  manga_id: number;
  number: number;
  volume: string | null;
  title: string;
  source: string;
  external_id: string | null;
  page_count: number;
  file_path: string | null;
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
  filePath: r.file_path ?? "",
  lang: r.lang,
  groupName: r.group_name ?? "",
  publishedAt: r.published_at ?? "",
  createdAt: r.created_at,
});

async function mdFetch(path: string) {
  return fetch(`${MANGADEX}${path}`, { headers: MD_HEADERS, cf: { cacheTtl: 300, cacheEverything: true } });
}

const passJson = async (res: Response) =>
  new Response(res.body, { status: res.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, max-age=60" } });

async function chapterById(c: Ctx, id: number) {
  return c.env.DB.prepare("SELECT * FROM manga_chapter WHERE id = ?").bind(id).first<ChapterRow>();
}

export const chapters = new Hono<AppEnv>();

// Library chapters point into their owner's own library, so only the owner (or an admin) sees them
chapters.get("/manga/:id{[0-9]+}/chapters", requireAuth, async (c) => {
  const user = c.get("user")!;
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM manga_chapter WHERE manga_id = ? AND (file_path IS NULL OR uploaded_by = ? OR ?)
     ORDER BY number ASC, lang ASC, id ASC`
  )
    .bind(int(c.req.param("id")), user.userId, user.isAdmin ? 1 : 0)
    .all<ChapterRow>();
  return c.json(results.map(toChapter));
});

chapters.get("/manga/chapters/:cid{[0-9]+}", requireAuth, async (c) => {
  const ch = await chapterById(c, int(c.req.param("cid")));
  const user = c.get("user")!;
  if (!ch || (ch.file_path && ch.uploaded_by !== user.userId && !user.isAdmin)) return c.json({ message: "Bölüm bulunamadı" }, 404);
  return c.json(toChapter(ch));
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

/** '<Series>/<Chapter N - Title>.cbz': relative, no '..', no backslashes or control characters */
function validFilePath(p: string) {
  return (
    p.length > 4 && p.length <= 500 && /\.cbz$/i.test(p) && !p.startsWith("/") &&
    !/[\u0000-\u001f\\]/.test(p) && !p.split("/").some((seg) => !seg || seg === "." || seg === "..")
  );
}

// Registers a library chapter (metadata only). Called by the extension's downloader after it saved the CBZ,
// or by the manual form. Body: { filePath, number, volume, title, lang, pageCount, source ("upload" default
// or an adapter slug), externalId, scanlator }. The same (source, externalId) or the same file path of the
// caller updates the existing row.
chapters.post("/manga/:id{[0-9]+}/chapters", requireAuth, async (c) => {
  const mangaId = int(c.req.param("id"));
  const body = await readJson(c);
  const user = c.get("user")!;
  const filePath = str(field(body, "filePath")).trim().normalize("NFC");
  const lang = str(field(body, "lang")) || "tr";
  const source = str(field(body, "source")) || "upload";
  const externalId = str(field(body, "externalId")).trim().slice(0, 200) || null;
  if (!validFilePath(filePath)) return c.json({ message: "Geçersiz dosya yolu ('<Seri>/<Bölüm>.cbz' olmalı)" }, 400);
  if (!LANG_RE.test(lang)) return c.json({ message: "Geçersiz dil" }, 400);
  if (!SOURCE_RE.test(source)) return c.json({ message: "Geçersiz kaynak" }, 400);
  const db = c.env.DB;
  if (!(await db.prepare("SELECT id FROM manga WHERE id = ?").bind(mangaId).first())) return c.json({ message: "Manga bulunamadı" }, 404);

  const existing = externalId
    ? await db.prepare("SELECT * FROM manga_chapter WHERE manga_id = ? AND source = ? AND external_id = ?").bind(mangaId, source, externalId).first<ChapterRow>()
    : await db.prepare("SELECT * FROM manga_chapter WHERE manga_id = ? AND file_path = ? AND uploaded_by = ?").bind(mangaId, filePath, user.userId).first<ChapterRow>();
  if (existing && existing.uploaded_by !== user.userId && !user.isAdmin) return c.json({ message: "Bu bölüm başka bir kullanıcıya ait" }, 403);

  const values = [
    num(field(body, "number")), str(field(body, "volume")) || null, str(field(body, "title")).slice(0, 300),
    Math.max(0, int(field(body, "pageCount"))), lang, str(field(body, "scanlator")).slice(0, 200) || null, filePath,
  ];
  let id: number;
  if (existing) {
    id = existing.id;
    await db
      .prepare("UPDATE manga_chapter SET number = ?, volume = ?, title = ?, page_count = ?, lang = ?, group_name = ?, file_path = ?, uploaded_by = ? WHERE id = ?")
      .bind(...values, user.userId, id)
      .run();
  } else {
    const res = await db
      .prepare(
        `INSERT INTO manga_chapter (manga_id, number, volume, title, page_count, lang, group_name, file_path, uploaded_by, source, external_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(mangaId, ...values, user.userId, source, externalId)
      .run();
    id = Number(res.meta.last_row_id);
  }
  return c.json(toChapter((await chapterById(c, id))!), existing ? 200 : 201);
});

// Removes the metadata row only (the CBZ in the user's library is untouched). Library chapters: owner or
// admin; shared MangaDex rows: admin.
chapters.delete("/manga/chapters/:cid{[0-9]+}", requireAuth, async (c) => {
  const ch = await chapterById(c, int(c.req.param("cid")));
  const user = c.get("user")!;
  if (!ch) return c.json({ message: "Bölüm bulunamadı" }, 404);
  if (!user.isAdmin && !(ch.file_path && ch.uploaded_by === user.userId)) return c.json({ message: "Bu bölümü silme yetkin yok" }, 403);
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
