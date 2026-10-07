import { Hono } from "hono";
import { requireAdmin, requireAuth, viewerId } from "./auth";
import { bool, field, int, num, readJson, str, type AppEnv, type Ctx } from "./util";

// Books (/api/books): shared catalog (books) + the caller's own reading data (user_books), mirroring the
// series/movies routes. Details: Open Library is queried from the browser (free, no key); Google Books goes
// through /api/google-books/* so its free API key (GOOGLE_BOOKS_API_KEY) stays in the Worker.

export const BOOK_READ_STATUSES = ["READING", "COMPLETED", "PAUSED", "DROPPED", "PLANNING"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type BookRow = {
  id: number;
  title: string;
  subtitle: string;
  authors: string;
  publisher: string;
  published_date: string;
  page_count: number;
  isbn: string | null;
  language: string;
  genres: string;
  description: string;
  cover: string | null;
  google_id: string | null;
  openlibrary_key: string | null;
  score: number | null;
  read_status: string | null;
  pages_read: number | null;
  plan_to_read: number | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  in_list: number | null;
};

const COLUMNS = `b.id, b.title, b.subtitle, b.authors, b.publisher, b.published_date, b.page_count, b.isbn, b.language,
  b.genres, b.description, b.cover, b.google_id, b.openlibrary_key,
  u.score, u.read_status, u.pages_read, u.plan_to_read, u.notes, u.started_at, u.finished_at,
  u.user_id IS NOT NULL AS in_list`;
const FROM = `books b LEFT JOIN user_books u ON u.book_id = b.id AND u.user_id = ?`;

const split = (s: string) => (s ? s.split(", ").filter(Boolean) : []);

const toBook = (r: BookRow) => ({
  id: r.id,
  title: r.title,
  subtitle: r.subtitle ?? "",
  authors: split(r.authors),
  publisher: r.publisher ?? "",
  publishedDate: r.published_date ?? "",
  pageCount: r.page_count ?? 0,
  isbn: r.isbn ?? "",
  language: r.language ?? "",
  genres: split(r.genres),
  description: r.description ?? "",
  cover: r.cover ?? "",
  googleId: r.google_id ?? "",
  openLibraryKey: r.openlibrary_key ?? "",
  googleLink: r.google_id ? `https://books.google.com/books?id=${r.google_id}` : "",
  openLibraryLink: r.openlibrary_key ? `https://openlibrary.org${r.openlibrary_key}` : "",
  score: r.score ?? 0,
  readStatus: r.read_status ?? "",
  pagesRead: r.pages_read ?? 0,
  planToRead: Boolean(r.plan_to_read),
  notes: r.notes ?? "",
  startedAt: r.started_at ?? "",
  finishedAt: r.finished_at ?? "",
  inMyList: Boolean(r.in_list),
});

const SORTS: Record<string, string> = {
  title: "LOWER(b.title)",
  author: "LOWER(b.authors)",
  year: "b.published_date",
  pages: "b.page_count",
  score: "COALESCE(u.score, 0)",
  progress: "COALESCE(u.pages_read, 0)",
  "read-status": "u.read_status",
  updated: "u.updated_at",
  added: "b.id",
};

const placeholders = (n: number) => Array(n).fill("?").join(", ");
const list = (v: unknown) =>
  (Array.isArray(v) ? (v as unknown[]).map(str) : str(v).split(","))
    .map((x) => x.trim())
    .filter(Boolean)
    .join(", ");

function catalogFields(body: Record<string, unknown>) {
  const isbn = str(field(body, "isbn")).replace(/[^0-9Xx]/g, "").toUpperCase();
  const olKey = str(field(body, "openLibraryKey")).trim();
  return {
    title: str(field(body, "title")).trim(),
    subtitle: str(field(body, "subtitle")).trim(),
    authors: list(field(body, "authors")),
    publisher: str(field(body, "publisher")).trim(),
    published_date: str(field(body, "publishedDate")).trim(),
    page_count: Math.max(0, int(field(body, "pageCount"))),
    isbn: isbn.length === 10 || isbn.length === 13 ? isbn : null,
    language: str(field(body, "language")).trim().toLowerCase(),
    genres: list(field(body, "genres")),
    description: str(field(body, "description")).trim(),
    cover: str(field(body, "cover")),
    google_id: str(field(body, "googleId")).trim() || null,
    openlibrary_key: /^\/works\/OL\d+W$/.test(olKey) ? olKey : null,
  };
}

type UserBookFields = Partial<{
  score: number;
  read_status: string;
  pages_read: number;
  plan_to_read: number;
  notes: string;
  started_at: string | null;
  finished_at: string | null;
}>;

/** Reads only the user fields present in the body; returns an error string on invalid input. */
function userFields(body: Record<string, unknown>): UserBookFields | string {
  const out: UserBookFields = {};
  const has = (k: string) => field(body, k) !== undefined;
  if (has("score")) {
    const s = num(field(body, "score"));
    if (s < 0 || s > 10) return "Puan 0-10 arasında olmalı";
    out.score = s;
  }
  if (has("readStatus")) {
    const rs = str(field(body, "readStatus")).toUpperCase();
    if (rs && !(BOOK_READ_STATUSES as readonly string[]).includes(rs)) return "Geçersiz okuma durumu";
    out.read_status = rs;
  }
  if (has("pagesRead")) out.pages_read = Math.max(0, int(field(body, "pagesRead")));
  if (has("planToRead")) out.plan_to_read = bool(field(body, "planToRead")) ? 1 : 0;
  if (has("notes")) out.notes = str(field(body, "notes"));
  for (const [key, col] of [["startedAt", "started_at"], ["finishedAt", "finished_at"]] as const) {
    if (!has(key)) continue;
    const v = str(field(body, key)).trim();
    if (v && !DATE_RE.test(v)) return "Tarih YYYY-AA-GG olmalı";
    out[col] = v || null;
  }
  if (out.started_at && out.finished_at && out.finished_at < out.started_at) return "Bitiş tarihi başlamadan önce olamaz";
  return out;
}

function upsertUserBook(db: D1Database, userId: number, bookId: number, f: UserBookFields) {
  const cols = Object.keys(f);
  const update = cols.length
    ? `DO UPDATE SET ${cols.map((k) => `${k} = excluded.${k}`).join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    : "DO NOTHING";
  return db
    .prepare(
      `INSERT INTO user_books (user_id, book_id${cols.map((k) => `, ${k}`).join("")})
       VALUES (?, ?${cols.map(() => ", ?").join("")})
       ON CONFLICT (user_id, book_id) ${update}`
    )
    .bind(userId, bookId, ...Object.values(f));
}

async function bookById(c: Ctx, id: number) {
  const row = await c.env.DB.prepare(`SELECT ${COLUMNS} FROM ${FROM} WHERE b.id = ?`).bind(await viewerId(c), id).first<BookRow>();
  return row ? toBook(row) : null;
}

export const books = new Hono<AppEnv>();

// Filters: q (title/author/ISBN), read-status (NONE = not set), genre (repeatable), language, ptr=1, mine=1, sort, order, page, count
books.get("/books", requireAuth, async (c) => {
  const q = c.req.query();
  const where: string[] = [];
  const params: unknown[] = [];
  if (q.q?.trim()) {
    const like = `%${q.q.trim()}%`;
    where.push("(b.title LIKE ? OR b.subtitle LIKE ? OR b.authors LIKE ? OR b.isbn = ?)");
    params.push(like, like, like, q.q.replace(/[^0-9Xx]/g, "").toUpperCase());
  }
  if (q.language) {
    where.push("b.language = ?");
    params.push(q.language);
  }
  if (q["read-status"] === "NONE") where.push("COALESCE(u.read_status, '') = ''");
  else if (q["read-status"]) {
    where.push("u.read_status = ?");
    params.push(q["read-status"]);
  }
  for (const g of c.req.queries("genre")?.filter(Boolean) ?? []) {
    where.push("(', ' || b.genres || ', ') LIKE ?");
    params.push(`%, ${g}, %`);
  }
  if (q.ptr === "1") where.push("COALESCE(u.plan_to_read, 0) = 1");
  if (q.mine === "1") where.push("u.user_id IS NOT NULL");
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const count = Math.min(Math.max(int(q.count) || 48, 1), 500);
  const page = Math.max(int(q.page) || 1, 1);
  const orderBy = SORTS[q.sort ?? ""] ?? SORTS.title;
  const order = q.order === "desc" ? "DESC" : "ASC";
  const viewer = await viewerId(c);
  const db = c.env.DB;
  const [rows, total] = await db.batch([
    db
      .prepare(`SELECT ${COLUMNS} FROM ${FROM} ${whereSql} ORDER BY ${orderBy} ${order}, b.id ASC LIMIT ? OFFSET ?`)
      .bind(viewer, ...params, count, (page - 1) * count),
    db.prepare(`SELECT COUNT(*) AS n FROM ${FROM} ${whereSql}`).bind(viewer, ...params),
  ]);
  const totalCount = Number((total.results?.[0] as { n: number } | undefined)?.n ?? 0);
  return c.json({
    data: (rows.results as BookRow[]).map(toBook),
    pagination: { page, count, total: totalCount, pages: Math.ceil(totalCount / count) },
  });
});

books.get("/books/genres", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare("SELECT genres FROM books WHERE genres <> ''").all<{ genres: string }>();
  const set = new Set<string>();
  for (const r of results) for (const g of split(r.genres)) set.add(g);
  return c.json([...set].sort((a, b) => a.localeCompare(b, "tr")));
});

books.get("/books/:id{[0-9]+}", requireAuth, async (c) => {
  const b = await bookById(c, int(c.req.param("id")));
  return b ? c.json(b) : c.json({ message: "Kitap bulunamadı" }, 404);
});

// Adds a book (or reuses the catalog entry with the same Google id / Open Library key / ISBN / title+author)
books.post("/books", requireAuth, async (c) => {
  const body = await readJson(c);
  const f = catalogFields(body);
  if (!f.title) return c.json({ message: "Kitap adı boş olamaz" }, 400);
  const uf = userFields(body);
  if (typeof uf === "string") return c.json({ message: uf }, 400);
  const db = c.env.DB;
  const user = c.get("user")!;

  const find = (sql: string, v: unknown) => db.prepare(`SELECT id FROM books WHERE ${sql}`).bind(v).first<{ id: number }>();
  const existing =
    (f.google_id && (await find("google_id = ?", f.google_id))) ||
    (f.openlibrary_key && (await find("openlibrary_key = ?", f.openlibrary_key))) ||
    (f.isbn && (await find("isbn = ?", f.isbn))) ||
    (await db
      .prepare("SELECT id FROM books WHERE title = ? COLLATE NOCASE AND authors = ? COLLATE NOCASE")
      .bind(f.title, f.authors)
      .first<{ id: number }>());
  let id: number;
  if (existing) {
    id = existing.id;
    if (user.isAdmin) {
      const entries = Object.entries(f).filter(([k, v]) => k !== "title" && v !== "" && v !== 0 && v !== null);
      if (entries.length) {
        await db
          .prepare(`UPDATE books SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`)
          .bind(...entries.map(([, v]) => v), id)
          .run();
      }
    }
  } else {
    const cols = Object.keys(f);
    const res = await db
      .prepare(`INSERT INTO books (${cols.join(", ")}) VALUES (${placeholders(cols.length)})`)
      .bind(...Object.values(f))
      .run();
    id = Number(res.meta.last_row_id);
  }
  await upsertUserBook(db, user.userId, id, uf).run();
  return c.json(await bookById(c, id), existing ? 200 : 201);
});

// Admins may change catalog fields too; everyone else only their own reading data
books.put("/books/:id{[0-9]+}", requireAuth, async (c) => {
  const id = int(c.req.param("id"));
  const body = await readJson(c);
  const db = c.env.DB;
  const user = c.get("user")!;
  if (!(await db.prepare("SELECT id FROM books WHERE id = ?").bind(id).first())) return c.json({ message: "Kitap bulunamadı" }, 404);
  const uf = userFields(body);
  if (typeof uf === "string") return c.json({ message: uf }, 400);

  if (user.isAdmin && field(body, "title") !== undefined) {
    const f = catalogFields(body);
    if (!f.title) return c.json({ message: "Kitap adı boş olamaz" }, 400);
    const cols = Object.keys(f);
    await db
      .prepare(`UPDATE books SET ${cols.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
      .bind(...Object.values(f), id)
      .run();
  }
  await upsertUserBook(db, user.userId, id, uf).run();
  return c.json(await bookById(c, id));
});

// Removes the book from the caller's list (catalog entry stays)
books.delete("/books/:id{[0-9]+}/mine", requireAuth, async (c) => {
  await c.env.DB.prepare("DELETE FROM user_books WHERE user_id = ? AND book_id = ?").bind(c.get("user")!.userId, int(c.req.param("id"))).run();
  return c.json({ message: "OK" });
});

books.delete("/books/:id{[0-9]+}", requireAdmin, async (c) => {
  await c.env.DB.prepare("DELETE FROM books WHERE id = ?").bind(int(c.req.param("id"))).run();
  return c.json({ message: "OK" });
});

// ------------------------------ Google Books ------------------------------

type GoogleVolume = {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    pageCount?: number;
    language?: string;
    categories?: string[];
    description?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: Record<string, string>;
  };
};

/** Google Books volume → catalog fields the editor sends back to POST /books */
function fromGoogle(v: GoogleVolume) {
  const i = v.volumeInfo;
  const ids = i.industryIdentifiers ?? [];
  const img = i.imageLinks?.extraLarge ?? i.imageLinks?.large ?? i.imageLinks?.medium ?? i.imageLinks?.thumbnail ?? i.imageLinks?.smallThumbnail ?? "";
  return {
    source: "google" as const,
    googleId: v.id,
    title: i.title ?? "",
    subtitle: i.subtitle ?? "",
    authors: i.authors ?? [],
    publisher: i.publisher ?? "",
    publishedDate: i.publishedDate ?? "",
    pageCount: i.pageCount ?? 0,
    isbn: ids.find((x) => x.type === "ISBN_13")?.identifier ?? ids.find((x) => x.type === "ISBN_10")?.identifier ?? "",
    language: i.language ?? "",
    // "Fiction / Literary" → "Fiction"
    genres: [...new Set((i.categories ?? []).map((c) => c.split("/")[0].trim()).filter(Boolean))],
    description: (i.description ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim(),
    // Google serves covers over http and with a page curl; https + no curl
    cover: img.replace(/^http:/, "https:").replace("&edge=curl", ""),
  };
}

async function google<T>(c: Ctx, path: string, params: Record<string, string>): Promise<T | Response> {
  if (!c.env.GOOGLE_BOOKS_API_KEY) return c.json({ message: "Google Books ayarlı değil (GOOGLE_BOOKS_API_KEY yok)" }, 503);
  const url = new URL(`https://www.googleapis.com/books/v1/${path}`);
  url.searchParams.set("key", c.env.GOOGLE_BOOKS_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit);
  if (res.status === 429) return c.json({ message: "Google Books günlük sınırı doldu" }, 502);
  if (!res.ok) return c.json({ message: `Google Books yanıt vermedi (${res.status})` }, 502);
  return (await res.json()) as T;
}

// ?q=… (an ISBN is searched as isbn:…)
books.get("/google-books/search", requireAuth, async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json([]);
  const digits = q.replace(/[-\s]/g, "");
  const res = await google<{ items?: GoogleVolume[] }>(c, "volumes", {
    q: /^\d{9}[\dXx]$|^\d{13}$/.test(digits) ? `isbn:${digits}` : q,
    maxResults: "20",
    printType: "books",
  });
  if (res instanceof Response) return res;
  return c.json((res.items ?? []).map(fromGoogle));
});

books.get("/google-books/:id{[A-Za-z0-9_-]+}", requireAuth, async (c) => {
  const res = await google<GoogleVolume>(c, `volumes/${c.req.param("id")}`, {});
  if (res instanceof Response) return res;
  return c.json(fromGoogle(res));
});
