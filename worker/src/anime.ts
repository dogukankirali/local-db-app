import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { bool, field, int, message, num, readJson, str, type AppEnv, type Ctx } from "./util";

// Yanıt biçimi Go backend'iyle aynı tutuldu (alan adları büyük harfle başlıyor), frontend ve eklenti değişmeden çalışsın.

type AnimeRow = {
  id: number;
  name: string;
  anime_status: string | null;
  watch_status: number | null;
  total_number_of_episodes: number | null;
  is_movie: number;
  score: number | null;
  mal_score: number | null;
  notes: string | null;
  anime_link: string | null;
  mal_anime_link: string | null;
  cover: string | null;
  series: number | null;
  plan_to_watch: number;
  genre?: string | null;
  series_name?: string | null;
};

const INLINE_COVER = "__inline__";

// Liste sorgularında base64 kapaklar taşınmaz; yerine /api/animeCover adresi verilir
const LIST_COLUMNS = `a.id, a.name, a.anime_status, a.watch_status, a.total_number_of_episodes, a.is_movie,
  a.score, a.mal_score, a.notes, a.anime_link, a.mal_anime_link, a.series, a.plan_to_watch,
  CASE WHEN a.cover LIKE 'data:%' THEN '${INLINE_COVER}' ELSE a.cover END AS cover,
  (SELECT group_concat(g.genre_name, ', ') FROM animes_genres ag JOIN genres g ON g.id = ag.genre_id WHERE ag.anime_id = a.id) AS genre,
  s.name AS series_name`;

export const coverUrl = (c: Ctx, id: number) => `${new URL(c.req.url).origin}/api/animeCover?id=${id}`;

export function toAnime(c: Ctx, r: AnimeRow) {
  const cover = r.cover ?? "";
  return {
    ID: r.id,
    Name: r.name,
    AnimeStatus: r.anime_status ?? "",
    WatchStatus: r.watch_status ?? 0,
    TotalNumberOfEpisodes: r.total_number_of_episodes ?? 0,
    IsMovie: Boolean(r.is_movie),
    Genre: r.genre ?? "",
    Score: r.score ?? 0,
    MALScore: r.mal_score ?? 0,
    Notes: r.notes ?? "",
    AnimeLink: r.anime_link ?? "",
    MALAnimeLink: r.mal_anime_link ?? "",
    Cover: cover === INLINE_COVER || cover.startsWith("data:") ? coverUrl(c, r.id) : cover,
    Series: r.series ?? 0,
    SeriesName: r.series_name ?? "",
    PlanToWatch: Boolean(r.plan_to_watch),
  };
}

const ORDER_COLUMNS: Record<string, string> = {
  ID: "a.id",
  Name: "LOWER(a.name)",
  AnimeStatus: "a.anime_status",
  WatchStatus: "a.watch_status",
  TotalNumberOfEpisodes: "a.total_number_of_episodes",
  IsMovie: "a.is_movie",
  Score: "a.score",
  MALScore: "a.mal_score",
  Genre: "genre",
  Series: "s.name",
  SeriesName: "s.name",
  PlanToWatch: "a.plan_to_watch",
  Notes: "a.notes",
};
const OPERANDS = new Set(["<", ">", "=", "<=", ">=", "!=", "<>"]);

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : v === null || v === undefined || v === "" ? [] : [v]);
const placeholders = (n: number) => Array(n).fill("?").join(", ");

function buildWhere(filters: unknown[]): { sql: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];
  for (const raw of filters) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    const key = str(f.key);
    const value = f.value;
    const operand = str(f.operand);
    switch (key) {
      case "Name": {
        const name = str(value).trim();
        if (name) {
          where.push("a.name LIKE ?");
          params.push(`%${name}%`);
        }
        break;
      }
      case "AnimeStatus": {
        // Go davranışı: yalnızca tek değer seçiliyse filtrelenir
        const values = asArray(value);
        if (values.length === 1) {
          where.push("a.anime_status LIKE ?");
          params.push(`%${str(values[0])}%`);
        }
        break;
      }
      case "IsMovie":
      case "PlanToWatch": {
        const values = asArray(value).map((v) => (bool(v) ? 1 : 0));
        if (values.length) {
          where.push(`a.${key === "IsMovie" ? "is_movie" : "plan_to_watch"} IN (${placeholders(values.length)})`);
          params.push(...values);
        }
        break;
      }
      case "Score":
      case "TotalNumberOfEpisodes": {
        const n = num(value);
        if (n !== 0 && OPERANDS.has(operand)) {
          where.push(`a.${key === "Score" ? "score" : "total_number_of_episodes"} ${operand} ?`);
          params.push(n);
        }
        break;
      }
      case "WatchStatus": {
        if (str(value) !== "") {
          where.push("a.watch_status = ?");
          params.push(int(value));
        }
        break;
      }
      case "Genre": {
        // Seçilen türlerden herhangi birine sahip animeler
        const values = asArray(value).map((v) => str(v).toLowerCase()).filter(Boolean);
        if (values.length) {
          where.push(
            `EXISTS (SELECT 1 FROM animes_genres ag JOIN genres g ON g.id = ag.genre_id WHERE ag.anime_id = a.id AND LOWER(g.genre_name) IN (${placeholders(values.length)}))`
          );
          params.push(...values);
        }
        break;
      }
      case "Series": {
        const values = asArray(value).map(str).filter(Boolean);
        if (values.length) {
          where.push(`s.name IN (${placeholders(values.length)})`);
          params.push(...values);
        }
        break;
      }
    }
  }
  return { sql: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

async function setGenres(db: D1Database, animeId: number, genre: string) {
  const names = genre.split(", ").map((g) => g.trim()).filter(Boolean);
  const stmts = [db.prepare("DELETE FROM animes_genres WHERE anime_id = ?").bind(animeId)];
  if (names.length) {
    stmts.push(
      db
        .prepare(
          `INSERT OR IGNORE INTO animes_genres (anime_id, genre_id) SELECT ?, id FROM genres WHERE genre_name IN (${placeholders(names.length)})`
        )
        .bind(animeId, ...names)
    );
  }
  await db.batch(stmts);
}

// İstek gövdesindeki anime alanları (Go'daki models.Anime çözümlemesiyle aynı, büyük/küçük harf duyarsız)
function animeFields(body: Record<string, unknown>) {
  return {
    name: str(field(body, "Name")),
    anime_status: str(field(body, "AnimeStatus")),
    watch_status: int(field(body, "WatchStatus")),
    total_number_of_episodes: int(field(body, "TotalNumberOfEpisodes")),
    is_movie: bool(field(body, "IsMovie")) ? 1 : 0,
    score: num(field(body, "Score")),
    mal_score: num(field(body, "MALScore")),
    notes: str(field(body, "Notes")),
    anime_link: str(field(body, "AnimeLink")),
    mal_anime_link: str(field(body, "MALAnimeLink")),
    cover: str(field(body, "Cover")),
    series: int(field(body, "Series")),
    plan_to_watch: bool(field(body, "PlanToWatch")) ? 1 : 0,
  };
}

export const anime = new Hono<AppEnv>();

anime.all("/getAnimeTable", async (c) => {
  const q = c.req.query();
  const count = Math.min(Math.max(int(q.count) || 10, 1), 1000);
  const page = Math.max(int(q.page) || 1, 1);
  const order = q.order === "desc" ? "DESC" : "ASC";
  const orderBy = ORDER_COLUMNS[q.orderBy ?? ""] ?? "LOWER(a.name)";

  const body = await readJson(c);
  const { sql: where, params } = buildWhere(asArray(field(body, "filterArray")));

  const [list, total] = await c.env.DB.batch([
    c.env.DB.prepare(
      `SELECT ${LIST_COLUMNS} FROM animes a LEFT JOIN anime_series s ON a.series = s.id ${where}
       ORDER BY ${orderBy} ${order}, a.id ASC LIMIT ? OFFSET ?`
    ).bind(...params, count, (page - 1) * count),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM animes a LEFT JOIN anime_series s ON a.series = s.id ${where}`).bind(...params),
  ]);
  const rows = (list.results ?? []) as AnimeRow[];
  const totalItemCount = Number((total.results?.[0] as { n: number } | undefined)?.n ?? 0);

  return c.json({
    data: rows.map((r) => toAnime(c, r)),
    pagination: {
      itemCount: rows.length,
      currentPage: page,
      totalItemCount,
      itemsPerPage: count,
      totalPageCount: Math.ceil(totalItemCount / count),
    },
  });
});

// Base64 saklanan kapağı ikili resim olarak, cache'lenebilir şekilde döner
anime.get("/animeCover", async (c) => {
  const id = int(c.req.query("id"), -1);
  if (id < 0) return c.text("invalid id", 400);
  const row = await c.env.DB.prepare("SELECT cover FROM animes WHERE id = ?").bind(id).first<{ cover: string | null }>();
  const cover = row?.cover ?? "";
  if (!cover) return c.notFound();
  if (!cover.startsWith("data:")) return c.redirect(cover, 302);

  const comma = cover.indexOf(",");
  if (comma < 0) return c.notFound();
  const contentType = cover.slice(5, comma).replace(/;base64$/, "");
  const bin = atob(cover.slice(comma + 1));
  const img = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) img[i] = bin.charCodeAt(i);

  const digest = await crypto.subtle.digest("SHA-1", img);
  const etag = `"${[...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, "0")).join("")}"`;
  const headers = { "Cache-Control": "public, max-age=86400", ETag: etag };
  if (c.req.header("If-None-Match") === etag) return new Response(null, { status: 304, headers });
  return new Response(img, { headers: { ...headers, "Content-Type": contentType } });
});

anime.all("/getGenres", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, genre_name FROM genres ORDER BY id").all<{
    id: number;
    genre_name: string;
  }>();
  return c.json(results.map((g) => ({ ID: g.id, name: g.genre_name })));
});

anime.all("/getSeries", async (c) => {
  const { results } = await c.env.DB.prepare("SELECT id, name FROM anime_series ORDER BY name ASC").all<{
    id: number;
    name: string;
  }>();
  return c.json(results.map((s) => ({ id: s.id, name: s.name, value: s.name, label: s.name })));
});

anime.get("/getAnimeById", async (c) => {
  const id = int(c.req.query("id"), -1);
  if (id < 0) return c.json({ error: "Geçersiz anime ID'si" }, 400);
  const row = await c.env.DB.prepare(
    `SELECT ${LIST_COLUMNS} FROM animes a LEFT JOIN anime_series s ON a.series = s.id WHERE a.id = ?`
  )
    .bind(id)
    .first<AnimeRow>();
  if (!row) return c.json({ error: "Anime bulunamadı" }, 404);
  return c.json({ status: "success", data: toAnime(c, row) });
});

// Eklenti de bu uca yazıyor; aynı isimde anime varsa günceller (Go'daki gibi yalnızca dolu alanlar)
export async function createAnime(c: Ctx) {
  const body = await readJson(c);
  const a = animeFields(body);
  if (!a.name.trim()) return message(c, "Anime adı boş olamaz", 400);
  const db = c.env.DB;

  const existing = await db.prepare("SELECT id FROM animes WHERE name = ?").bind(a.name).first<{ id: number }>();
  let animeId: number;
  if (existing) {
    animeId = existing.id;
    const sets: string[] = [];
    const params: unknown[] = [];
    for (const [col, val] of Object.entries(a)) {
      if (col === "name" || val === "" || val === 0) continue;
      sets.push(`${col} = ?`);
      params.push(val);
    }
    if (sets.length) {
      await db.prepare(`UPDATE animes SET ${sets.join(", ")} WHERE id = ?`).bind(...params, animeId).run();
    }
  } else {
    const cols = Object.keys(a);
    const res = await db
      .prepare(`INSERT INTO animes (${cols.join(", ")}) VALUES (${placeholders(cols.length)})`)
      .bind(...Object.values(a))
      .run();
    animeId = Number(res.meta.last_row_id);
  }
  await setGenres(db, animeId, str(field(body, "Genre")));
  return message(c, "OK");
}

anime.post("/createAnime", createAnime);

anime.post("/updateAnimeTable", requireAdmin, async (c) => {
  const body = await readJson(c);
  const id = int(field(body, "ID"), -1);
  if (id < 0) return message(c, "Geçersiz anime ID'si", 400);
  const a = animeFields(body);
  // İstemci listede gördüğü /animeCover adresini geri yollarsa DB'deki orijinal kapak korunur
  const keepCover = a.cover.includes("/animeCover?id=") ? 1 : 0;
  await c.env.DB.prepare(
    `UPDATE animes SET name = ?, anime_status = ?, watch_status = ?, total_number_of_episodes = ?, is_movie = ?,
       score = ?, mal_score = ?, notes = ?, anime_link = ?, mal_anime_link = ?,
       cover = CASE WHEN ? THEN cover ELSE ? END, series = ?, plan_to_watch = ?
     WHERE id = ?`
  )
    .bind(
      a.name, a.anime_status, a.watch_status, a.total_number_of_episodes, a.is_movie,
      a.score, a.mal_score, a.notes, a.anime_link, a.mal_anime_link,
      keepCover, a.cover, a.series, a.plan_to_watch, id
    )
    .run();
  await setGenres(c.env.DB, id, str(field(body, "Genre")));
  return message(c, "OK");
});

anime.all("/deleteAnime", requireAdmin, async (c) => {
  const id = int(c.req.query("id"), -1);
  if (id < 0) return message(c, "Geçersiz anime ID'si", 400);
  // animes_genres ve watch_lists kayıtları FK cascade ile silinir
  await c.env.DB.prepare("DELETE FROM animes WHERE id = ?").bind(id).run();
  return message(c, "OK");
});

anime.all("/updateFinishedAnimeStatus", requireAdmin, async (c) => {
  const res = await c.env.DB.prepare("UPDATE animes SET watch_status = total_number_of_episodes WHERE watch_status = -1").run();
  return message(c, `Güncellenen anime sayısı: ${res.meta.changes ?? 0}`);
});

// Eklentinin "X Bölüm N" başlığından bölüm numarasını alıp izleme durumunu günceller
export async function updateEpisode(c: Ctx) {
  const body = await readJson(c);
  let title = str(field(body, "name")).trim().replaceAll("  ", " ");
  let episode = 0;
  if (title.includes("Bölüm")) {
    const parts = title.split("Bölüm");
    const ep = parseInt(parts[1].trim().split(" ")[0].replace(/^\.+|\.+$/g, ""), 10);
    if (Number.isFinite(ep)) episode = ep;
    title = parts[0].trim();
  }
  const db = c.env.DB;
  const found =
    (await db.prepare("SELECT id, name FROM animes WHERE LOWER(name) = LOWER(?) LIMIT 1").bind(title).first<{ id: number; name: string }>()) ??
    (await db.prepare("SELECT id, name FROM animes WHERE LOWER(name) LIKE LOWER(?) LIMIT 1").bind(`${title}%`).first<{ id: number; name: string }>());
  if (!found) {
    return c.json(
      { success: false, error: `'${title}' başlıklı anime veritabanında bulunamadı. Lütfen önce Watchlist'e ekleyin.` },
      404
    );
  }
  const watchStatus = episode > 0 ? episode : int(field(body, "watchStatus"));
  await db.prepare("UPDATE animes SET watch_status = ? WHERE id = ?").bind(watchStatus, found.id).run();
  return c.json({ id: found.id, name: found.name, watchStatus });
}

anime.all("/api/anime/update-episode", updateEpisode);
anime.all("/anime/update-episode", updateEpisode);
anime.all("/updateAnimeStatus", updateEpisode);

// Basit CSV ayrıştırıcı (tırnaklı alanları destekler)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

anime.post("/createAnimeWithFile", requireAdmin, async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.text("file alanı eksik", 400);
  const db = c.env.DB;
  let added = 0;
  // Sütunlar: name, status, watch, episodes, score, mal_score, is_movie, genre-id'leri (1-2-3), mal_link, link, notes
  for (const r of parseCsv(await file.text())) {
    if (r.length !== 11) continue;
    const res = await db
      .prepare(
        `INSERT INTO animes (name, anime_status, watch_status, total_number_of_episodes, score, mal_score, is_movie, mal_anime_link, anime_link, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(r[0], r[1], int(r[2]), int(r[3]), num(r[4]), num(r[5]), bool(r[6]) ? 1 : 0, r[8], r[9], r[10])
      .run();
    const animeId = Number(res.meta.last_row_id);
    const genreIds = r[7].split("-").map((x) => int(x, -1)).filter((x) => x >= 0);
    if (genreIds.length) {
      await db
        .prepare(`INSERT OR IGNORE INTO animes_genres (anime_id, genre_id) SELECT ?, id FROM genres WHERE id IN (${placeholders(genreIds.length)})`)
        .bind(animeId, ...genreIds)
        .run();
    }
    added++;
  }
  return c.text(`File uploaded and data processed successfully (${added})`);
});
