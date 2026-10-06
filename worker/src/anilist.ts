import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { field, int, readJson, type AppEnv } from "./util";

// AniList GraphQL: arama proxy'si (/getAnime, /getManga) ve eksik bilgileri dolduran sync.
// Go sürümündeki Jikan + SSE akışı yerine sync, istemcinin küçük gruplar halinde çağırdığı
// bir uç oldu: her grup tek AniList isteği, Workers ücretsiz planın süre/istek sınırlarına sığıyor.

const ANILIST = "https://graphql.anilist.co";

async function anilist<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (res.status === 429) {
    const err = new Error("AniList istek sınırı aşıldı") as Error & { retryAfter?: number };
    err.retryAfter = int(res.headers.get("Retry-After"), 60);
    throw err;
  }
  if (!res.ok) throw new Error(`AniList API HTTP hatası (${res.status}): ${text.slice(0, 300)}`);
  const json = JSON.parse(text) as { data?: T; errors?: unknown };
  if (!json.data) throw new Error(`AniList yanıtı beklenmedik: ${text.slice(0, 300)}`);
  return json.data;
}

const SEARCH_QUERY = `
  query ($search: String, $id: Int, $page: Int, $perPage: Int, $type: MediaType) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage perPage }
      media(search: $search, id: $id, type: $type) {
        id idMal title { romaji english native } episodes chapters volumes status description
        averageScore meanScore coverImage { large medium } bannerImage genres seasonYear format
      }
    }
  }`;

export const anilistRoutes = new Hono<AppEnv>();

for (const [path, type] of [
  ["/getAnime", "ANIME"],
  ["/getManga", "MANGA"],
] as const) {
  anilistRoutes.get(path, async (c) => {
    const q = c.req.query();
    const variables: Record<string, unknown> = {
      type,
      page: Math.max(int(q.page) || 1, 1),
      perPage: Math.min(Math.max(int(q.limit) || 10, 1), 50),
    };
    if (int(q.id) > 0) variables.id = int(q.id);
    if (q.q) variables.search = q.q;
    try {
      return c.json({ success: true, data: await anilist(SEARCH_QUERY, variables) });
    } catch (err) {
      return c.json({ success: false, data: null, error: `AniList API hatası: ${(err as Error).message}` }, 502);
    }
  });
}

// --- Sync ---

type Media = {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null };
  episodes: number | null;
  status: string | null;
  format: string | null;
  averageScore: number | null;
  genres: string[];
  coverImage: { large: string | null } | null;
  relations: { edges: { relationType: string; node: { type: string; title: { romaji: string | null; english: string | null } } }[] } | null;
};

type SyncRow = {
  id: number;
  name: string;
  anime_status: string | null;
  total_number_of_episodes: number | null;
  mal_score: number | null;
  mal_anime_link: string | null;
  cover: string | null;
  series: number | null;
  genre_count: number;
};

const MEDIA_FIELDS = `id idMal title { romaji english } episodes status format averageScore genres coverImage { large }
  relations { edges { relationType node { type title { romaji english } } } }`;

// Bir gruptaki tüm animeler tek GraphQL isteğinde, alias'larla aranır
function batchQuery(n: number) {
  const vars = Array.from({ length: n }, (_, i) => `$s${i}: String`).join(", ");
  const parts = Array.from({ length: n }, (_, i) => `a${i}: Page(perPage: 5) { media(search: $s${i}, type: ANIME) { ${MEDIA_FIELDS} } }`);
  return `query (${vars}) { ${parts.join("\n")} }`;
}

const lower = (s: string | null | undefined) => (s ?? "").toLowerCase();

function bestMatch(name: string, list: Media[]): Media | undefined {
  const target = lower(name);
  return (
    list.find((m) => lower(m.title.romaji) === target || lower(m.title.english) === target) ??
    list.find((m) => lower(m.title.romaji).includes(target) || lower(m.title.english).includes(target)) ??
    list[0]
  );
}

// Go sürümündeki sıra: ana hikaye → alternatif → devam/önceki (başlığın ':' öncesi)
function seriesNameFor(m: Media): string {
  const edges = (m.relations?.edges ?? []).filter((e) => e.node.type === "ANIME");
  const title = (e: (typeof edges)[number]) => e.node.title.romaji ?? e.node.title.english ?? "";
  const parent = edges.find((e) => e.relationType === "PARENT");
  if (parent) return title(parent).trim();
  const alt = edges.find((e) => e.relationType === "ALTERNATIVE");
  if (alt) return title(alt).trim();
  const seq = edges.find((e) => e.relationType === "SEQUEL" || e.relationType === "PREQUEL");
  if (seq) return title(seq).split(":")[0].trim();
  return "";
}

export const SYNC_BATCH = 8;

const PENDING_WHERE = "a.series = 0 OR a.series IS NULL";

// Sync'e girecek animelerin listesi (Go'daki gibi serisi atanmamış olanlar)
anilistRoutes.get("/sync/pending", requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT a.id FROM animes a WHERE ${PENDING_WHERE} ORDER BY a.id`).all<{ id: number }>();
  return c.json({ ids: results.map((r) => r.id), batchSize: SYNC_BATCH });
});

anilistRoutes.post("/sync/batch", requireAdmin, async (c) => {
  const ids = ((field(await readJson(c), "ids") as unknown[]) ?? []).map((x) => int(x, -1)).filter((x) => x >= 0).slice(0, SYNC_BATCH);
  if (!ids.length) return c.json({ updated: 0, failed: 0, skipped: 0, errors: [], messages: [] });
  const db = c.env.DB;

  const { results: rows } = await db
    .prepare(
      `SELECT a.id, a.name, a.anime_status, a.total_number_of_episodes, a.mal_score, a.mal_anime_link,
         CASE WHEN a.cover IS NULL OR a.cover = '' THEN '' ELSE 'x' END AS cover, a.series,
         (SELECT COUNT(*) FROM animes_genres ag WHERE ag.anime_id = a.id) AS genre_count
       FROM animes a WHERE a.id IN (${ids.map(() => "?").join(", ")})`
    )
    .bind(...ids)
    .all<SyncRow>();

  let data: Record<string, { media: Media[] }>;
  try {
    data = await anilist(batchQuery(rows.length), Object.fromEntries(rows.map((r, i) => [`s${i}`, r.name])));
  } catch (err) {
    const retryAfter = (err as { retryAfter?: number }).retryAfter;
    return c.json({ error: (err as Error).message, retryAfter }, retryAfter ? 429 : 502);
  }

  const genres = new Map(
    (await db.prepare("SELECT id, genre_name FROM genres").all<{ id: number; genre_name: string }>()).results.map((g) => [
      lower(g.genre_name),
      g.id,
    ])
  );

  let updated = 0;
  let failed = 0;
  const errors: string[] = [];
  const messages: string[] = [];

  for (const [i, anime] of rows.entries()) {
    const m = bestMatch(anime.name, data[`a${i}`]?.media ?? []);
    if (!m) {
      failed++;
      errors.push(`Anime bulunamadı: ${anime.name}`);
      continue;
    }
    const sets: Record<string, unknown> = { is_movie: m.format === "MOVIE" ? 1 : 0 };
    if (!anime.mal_anime_link && m.idMal) sets.mal_anime_link = `https://myanimelist.net/anime/${m.idMal}`;
    if (!(anime.mal_score! > 0) && m.averageScore) sets.mal_score = m.averageScore / 10;
    if (!(anime.total_number_of_episodes! > 0) && m.episodes) sets.total_number_of_episodes = m.episodes;
    if (!anime.anime_status && m.status) sets.anime_status = m.status === "FINISHED" ? "Finished" : "Currently Airing";
    if (!anime.cover && m.coverImage?.large) sets.cover = m.coverImage.large;

    const stmts: D1PreparedStatement[] = [];
    const seriesName = seriesNameFor(m);
    if (seriesName) {
      stmts.push(db.prepare("INSERT OR IGNORE INTO anime_series (name) VALUES (?)").bind(seriesName));
    }
    const cols = Object.keys(sets);
    stmts.push(
      db
        .prepare(
          `UPDATE animes SET ${cols.map((k) => `${k} = ?`).join(", ")}${seriesName ? ", series = (SELECT id FROM anime_series WHERE name = ?)" : ""} WHERE id = ?`
        )
        .bind(...Object.values(sets), ...(seriesName ? [seriesName] : []), anime.id)
    );

    if (m.genres.length && anime.genre_count < m.genres.length) {
      for (const g of m.genres) {
        if (!genres.has(lower(g))) {
          const created = await db.prepare("INSERT INTO genres (genre_name) VALUES (?) RETURNING id").bind(g).first<{ id: number }>();
          if (created) genres.set(lower(g), created.id);
        }
      }
      stmts.push(db.prepare("DELETE FROM animes_genres WHERE anime_id = ?").bind(anime.id));
      for (const g of m.genres) {
        const gid = genres.get(lower(g));
        if (gid) stmts.push(db.prepare("INSERT OR IGNORE INTO animes_genres (anime_id, genre_id) VALUES (?, ?)").bind(anime.id, gid));
      }
    }

    try {
      await db.batch(stmts);
      updated++;
      messages.push(`${anime.name} → ${m.title.romaji ?? m.title.english}${seriesName ? ` (seri: ${seriesName})` : ""}`);
    } catch (err) {
      failed++;
      errors.push(`${anime.name}: ${(err as Error).message}`);
    }
  }

  return c.json({ updated, failed, errors, messages });
});
