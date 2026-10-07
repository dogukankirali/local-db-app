import { Hono } from "hono";
import { requireAdmin, requireAuth, viewerId } from "./auth";
import { bool, field, int, num, readJson, str, type AppEnv, type Ctx } from "./util";

// TV series (/api/series) and movies (/api/movies): one shared catalog (screen_titles, kind column) and the
// caller's own watch data (user_screen), mirroring the manga routes without readlist or chapters.
// Details come from IMDb through OMDb (/api/imdb/*); the key stays in the Worker (OMDB_API_KEY).

export type ScreenKind = "series" | "movie";
export const WATCH_STATUSES = ["WATCHING", "COMPLETED", "PAUSED", "DROPPED", "PLANNING"] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const IMDB_ID_RE = /^tt\d{5,10}$/;

type ScreenRow = {
  id: number;
  kind: ScreenKind;
  name: string;
  original_name: string | null;
  year: string;
  status: string;
  total_seasons: number;
  total_episodes: number;
  runtime: string;
  genres: string;
  director: string;
  actors: string;
  plot: string;
  cover: string | null;
  imdb_id: string | null;
  imdb_rating: number | null;
  synced_at: string | null;
  score: number | null;
  watch_status: string | null;
  episodes_watched: number | null;
  plan_to_watch: number | null;
  notes: string | null;
  started_at: string | null;
  finished_at: string | null;
  in_list: number | null;
};

const COLUMNS = `t.id, t.kind, t.name, t.original_name, t.year, t.status, t.total_seasons, t.total_episodes, t.runtime,
  t.genres, t.director, t.actors, t.plot, t.cover, t.imdb_id, t.imdb_rating, t.synced_at,
  u.score, u.watch_status, u.episodes_watched, u.plan_to_watch, u.notes, u.started_at, u.finished_at,
  u.user_id IS NOT NULL AS in_list`;
const FROM = `screen_titles t LEFT JOIN user_screen u ON u.title_id = t.id AND u.user_id = ?`;

const toScreen = (r: ScreenRow) => ({
  id: r.id,
  kind: r.kind,
  name: r.name,
  originalName: r.original_name ?? "",
  year: r.year ?? "",
  status: r.status ?? "",
  totalSeasons: r.total_seasons ?? 0,
  totalEpisodes: r.total_episodes ?? 0,
  runtime: r.runtime ?? "",
  genres: r.genres ? r.genres.split(", ").filter(Boolean) : [],
  director: r.director ?? "",
  actors: r.actors ?? "",
  plot: r.plot ?? "",
  cover: r.cover ?? "",
  imdbId: r.imdb_id ?? "",
  imdbRating: r.imdb_rating ?? 0,
  imdbLink: r.imdb_id ? `https://www.imdb.com/title/${r.imdb_id}/` : "",
  syncedAt: r.synced_at ?? "",
  score: r.score ?? 0,
  watchStatus: r.watch_status ?? "",
  episodesWatched: r.episodes_watched ?? 0,
  planToWatch: Boolean(r.plan_to_watch),
  notes: r.notes ?? "",
  startedAt: r.started_at ?? "",
  finishedAt: r.finished_at ?? "",
  inMyList: Boolean(r.in_list),
});

const SORTS: Record<string, string> = {
  name: "LOWER(t.name)",
  year: "t.year",
  score: "COALESCE(u.score, 0)",
  "imdb-rating": "COALESCE(t.imdb_rating, 0)",
  progress: "COALESCE(u.episodes_watched, 0)",
  status: "t.status",
  "watch-status": "u.watch_status",
  updated: "u.updated_at",
  added: "t.id",
};

const placeholders = (n: number) => Array(n).fill("?").join(", ");

function catalogFields(body: Record<string, unknown>) {
  const rating = num(field(body, "imdbRating"));
  const imdbId = str(field(body, "imdbId")).trim();
  return {
    name: str(field(body, "name")).trim(),
    original_name: str(field(body, "originalName")).trim(),
    year: str(field(body, "year")).trim(),
    status: str(field(body, "status")),
    total_seasons: Math.max(0, int(field(body, "totalSeasons"))),
    total_episodes: Math.max(0, int(field(body, "totalEpisodes"))),
    runtime: str(field(body, "runtime")).trim(),
    genres: (Array.isArray(field(body, "genres")) ? (field(body, "genres") as unknown[]).map(str) : str(field(body, "genres")).split(","))
      .map((g) => g.trim())
      .filter(Boolean)
      .join(", "),
    director: str(field(body, "director")).trim(),
    actors: str(field(body, "actors")).trim(),
    plot: str(field(body, "plot")).trim(),
    cover: str(field(body, "cover")),
    imdb_id: IMDB_ID_RE.test(imdbId) ? imdbId : null,
    imdb_rating: rating >= 0 && rating <= 10 ? rating : 0,
  };
}

type UserScreenFields = Partial<{
  score: number;
  watch_status: string;
  episodes_watched: number;
  plan_to_watch: number;
  notes: string;
  started_at: string | null;
  finished_at: string | null;
}>;

/** Reads only the user fields present in the body; returns an error string on invalid input. */
function userFields(body: Record<string, unknown>): UserScreenFields | string {
  const out: UserScreenFields = {};
  const has = (k: string) => field(body, k) !== undefined;
  if (has("score")) {
    const s = num(field(body, "score"));
    if (s < 0 || s > 10) return "Puan 0-10 arasında olmalı";
    out.score = s;
  }
  if (has("watchStatus")) {
    const ws = str(field(body, "watchStatus")).toUpperCase();
    if (ws && !(WATCH_STATUSES as readonly string[]).includes(ws)) return "Geçersiz izleme durumu";
    out.watch_status = ws;
  }
  if (has("episodesWatched")) out.episodes_watched = Math.max(0, int(field(body, "episodesWatched")));
  if (has("planToWatch")) out.plan_to_watch = bool(field(body, "planToWatch")) ? 1 : 0;
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

function upsertUserScreen(db: D1Database, userId: number, titleId: number, f: UserScreenFields) {
  const cols = Object.keys(f);
  const update = cols.length
    ? `DO UPDATE SET ${cols.map((k) => `${k} = excluded.${k}`).join(", ")}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    : "DO NOTHING";
  return db
    .prepare(
      `INSERT INTO user_screen (user_id, title_id${cols.map((k) => `, ${k}`).join("")})
       VALUES (?, ?${cols.map(() => ", ?").join("")})
       ON CONFLICT (user_id, title_id) ${update}`
    )
    .bind(userId, titleId, ...Object.values(f));
}

async function titleById(c: Ctx, kind: ScreenKind, id: number) {
  const row = await c.env.DB.prepare(`SELECT ${COLUMNS} FROM ${FROM} WHERE t.id = ? AND t.kind = ?`)
    .bind(await viewerId(c), id, kind)
    .first<ScreenRow>();
  return row ? toScreen(row) : null;
}

/** Same routes for both kinds: /api/series and /api/movies */
function screenRoutes(kind: ScreenKind, path: string, notFound: string) {
  const r = new Hono<AppEnv>();

  // Filters: q, status, watch-status (NONE = not set), genre (repeatable), ptw=1, mine=1, sort, order, page, count
  r.get(path, requireAuth, async (c) => {
    const q = c.req.query();
    const where = ["t.kind = ?"];
    const params: unknown[] = [kind];
    if (q.q?.trim()) {
      where.push("(t.name LIKE ? OR t.original_name LIKE ?)");
      params.push(`%${q.q.trim()}%`, `%${q.q.trim()}%`);
    }
    if (q.status) {
      where.push("t.status = ?");
      params.push(q.status);
    }
    if (q["watch-status"] === "NONE") where.push("COALESCE(u.watch_status, '') = ''");
    else if (q["watch-status"]) {
      where.push("u.watch_status = ?");
      params.push(q["watch-status"]);
    }
    for (const g of c.req.queries("genre")?.filter(Boolean) ?? []) {
      where.push("(', ' || t.genres || ', ') LIKE ?");
      params.push(`%, ${g}, %`);
    }
    if (q.ptw === "1") where.push("COALESCE(u.plan_to_watch, 0) = 1");
    if (q.mine === "1") where.push("u.user_id IS NOT NULL");
    const whereSql = `WHERE ${where.join(" AND ")}`;

    const count = Math.min(Math.max(int(q.count) || 48, 1), 500);
    const page = Math.max(int(q.page) || 1, 1);
    const orderBy = SORTS[q.sort ?? ""] ?? SORTS.name;
    const order = q.order === "desc" ? "DESC" : "ASC";
    const viewer = await viewerId(c);
    const db = c.env.DB;
    const [list, total] = await db.batch([
      db
        .prepare(`SELECT ${COLUMNS} FROM ${FROM} ${whereSql} ORDER BY ${orderBy} ${order}, t.id ASC LIMIT ? OFFSET ?`)
        .bind(viewer, ...params, count, (page - 1) * count),
      db.prepare(`SELECT COUNT(*) AS n FROM ${FROM} ${whereSql}`).bind(viewer, ...params),
    ]);
    const totalCount = Number((total.results?.[0] as { n: number } | undefined)?.n ?? 0);
    return c.json({
      data: (list.results as ScreenRow[]).map(toScreen),
      pagination: { page, count, total: totalCount, pages: Math.ceil(totalCount / count) },
    });
  });

  r.get(`${path}/genres`, requireAuth, async (c) => {
    const { results } = await c.env.DB.prepare("SELECT genres FROM screen_titles WHERE kind = ? AND genres <> ''").bind(kind).all<{ genres: string }>();
    const set = new Set<string>();
    for (const row of results) for (const g of row.genres.split(", ")) if (g) set.add(g);
    return c.json([...set].sort());
  });

  r.get(`${path}/:id{[0-9]+}`, requireAuth, async (c) => {
    const t = await titleById(c, kind, int(c.req.param("id")));
    return t ? c.json(t) : c.json({ message: notFound }, 404);
  });

  // Adds a title (or reuses the catalog entry with the same IMDb id / name) and writes the caller's data
  r.post(path, requireAuth, async (c) => {
    const body = await readJson(c);
    const f = catalogFields(body);
    if (!f.name) return c.json({ message: "Ad boş olamaz" }, 400);
    const uf = userFields(body);
    if (typeof uf === "string") return c.json({ message: uf }, 400);
    const db = c.env.DB;
    const user = c.get("user")!;

    const existing =
      (f.imdb_id && (await db.prepare("SELECT id, kind FROM screen_titles WHERE imdb_id = ?").bind(f.imdb_id).first<{ id: number; kind: string }>())) ||
      (await db.prepare("SELECT id, kind FROM screen_titles WHERE kind = ? AND name = ? COLLATE NOCASE").bind(kind, f.name).first<{ id: number; kind: string }>());
    if (existing && existing.kind !== kind) return c.json({ message: "Bu IMDb kaydı diğer bölümde (dizi/film) zaten var" }, 409);
    let id: number;
    if (existing) {
      id = existing.id;
      if (user.isAdmin) {
        const entries = Object.entries(f).filter(([k, v]) => k !== "name" && v !== "" && v !== 0 && v !== null);
        if (entries.length) {
          await db
            .prepare(`UPDATE screen_titles SET ${entries.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`)
            .bind(...entries.map(([, v]) => v), id)
            .run();
        }
      }
    } else {
      const cols = ["kind", ...Object.keys(f)];
      const res = await db
        .prepare(`INSERT INTO screen_titles (${cols.join(", ")}, synced_at) VALUES (${placeholders(cols.length)}, ?)`)
        .bind(kind, ...Object.values(f), f.imdb_id ? new Date().toISOString() : null)
        .run();
      id = Number(res.meta.last_row_id);
    }
    await upsertUserScreen(db, user.userId, id, uf).run();
    return c.json(await titleById(c, kind, id), existing ? 200 : 201);
  });

  // Admins may change catalog fields too; everyone else only their own watch data
  r.put(`${path}/:id{[0-9]+}`, requireAuth, async (c) => {
    const id = int(c.req.param("id"));
    const body = await readJson(c);
    const db = c.env.DB;
    const user = c.get("user")!;
    if (!(await db.prepare("SELECT id FROM screen_titles WHERE id = ? AND kind = ?").bind(id, kind).first())) return c.json({ message: notFound }, 404);
    const uf = userFields(body);
    if (typeof uf === "string") return c.json({ message: uf }, 400);

    if (user.isAdmin && field(body, "name") !== undefined) {
      const f = catalogFields(body);
      if (!f.name) return c.json({ message: "Ad boş olamaz" }, 400);
      const cols = Object.keys(f);
      await db
        .prepare(`UPDATE screen_titles SET ${cols.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`)
        .bind(...Object.values(f), id)
        .run();
    }
    await upsertUserScreen(db, user.userId, id, uf).run();
    return c.json(await titleById(c, kind, id));
  });

  // Removes the title from the caller's list (catalog entry stays)
  r.delete(`${path}/:id{[0-9]+}/mine`, requireAuth, async (c) => {
    await c.env.DB.prepare("DELETE FROM user_screen WHERE user_id = ? AND title_id = ?").bind(c.get("user")!.userId, int(c.req.param("id"))).run();
    return c.json({ message: "OK" });
  });

  r.delete(`${path}/:id{[0-9]+}`, requireAdmin, async (c) => {
    await c.env.DB.prepare("DELETE FROM screen_titles WHERE id = ? AND kind = ?").bind(int(c.req.param("id")), kind).run();
    return c.json({ message: "OK" });
  });

  return r;
}

// ------------------------------ IMDb (OMDb) ------------------------------

type OmdbSearch = { Response: string; Error?: string; Search?: { Title: string; Year: string; imdbID: string; Type: string; Poster: string }[] };
type OmdbTitle = Record<string, string> & { Response: string; Error?: string };

const na = (v: string | undefined) => (v && v !== "N/A" ? v : "");

async function omdb<T>(c: Ctx, params: Record<string, string>): Promise<T | Response> {
  if (!c.env.OMDB_API_KEY) return c.json({ message: "IMDb araması ayarlı değil (OMDB_API_KEY yok)" }, 503);
  const url = new URL("https://www.omdbapi.com/");
  url.searchParams.set("apikey", c.env.OMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit);
  if (res.status === 401) return c.json({ message: "OMDb anahtarı geçersiz ya da günlük sınır doldu" }, 502);
  if (!res.ok) return c.json({ message: `OMDb yanıt vermedi (${res.status})` }, 502);
  return (await res.json()) as T;
}

/** OMDb title → catalog fields the editor can send back to POST /series or /movies */
function fromOmdb(t: OmdbTitle) {
  const year = na(t.Year).replace(/-/g, "–");
  const kind: ScreenKind = t.Type === "series" ? "series" : "movie";
  return {
    kind,
    name: na(t.Title),
    year,
    // "2019–" is still airing, "2008–2013" has ended
    status: kind === "series" ? (/–$/.test(year) ? "RELEASING" : year ? "FINISHED" : "") : "",
    totalSeasons: int(na(t.totalSeasons)),
    runtime: na(t.Runtime),
    genres: na(t.Genre).split(",").map((g) => g.trim()).filter(Boolean),
    director: na(t.Director),
    actors: na(t.Actors),
    plot: na(t.Plot),
    cover: na(t.Poster),
    imdbId: t.imdbID,
    imdbRating: num(na(t.imdbRating)),
  };
}

const imdb = new Hono<AppEnv>();

// ?q=…&type=series|movie
imdb.get("/imdb/search", requireAuth, async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  const type = c.req.query("type") === "series" ? "series" : "movie";
  if (q.length < 2) return c.json([]);
  const res = await omdb<OmdbSearch>(c, { s: q, type });
  if (res instanceof Response) return res;
  if (res.Response !== "True") return c.json([]);
  return c.json(
    (res.Search ?? []).map((s) => ({ imdbId: s.imdbID, name: s.Title, year: na(s.Year).replace(/-/g, "–"), cover: na(s.Poster), kind: s.Type === "series" ? "series" : "movie" }))
  );
});

imdb.get("/imdb/:id{tt[0-9]+}", requireAuth, async (c) => {
  const res = await omdb<OmdbTitle>(c, { i: c.req.param("id"), plot: "short" });
  if (res instanceof Response) return res;
  if (res.Response !== "True") return c.json({ message: res.Error ?? "IMDb kaydı bulunamadı" }, 404);
  return c.json(fromOmdb(res));
});

export const screen = new Hono<AppEnv>();
screen.route("/", screenRoutes("series", "/series", "Dizi bulunamadı"));
screen.route("/", screenRoutes("movie", "/movies", "Film bulunamadı"));
screen.route("/", imdb);
