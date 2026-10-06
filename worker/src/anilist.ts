import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { field, int, readJson, type AppEnv } from "./util";

// AniList sync'i. AniList, Cloudflare Workers'ın çıkış IP'lerini engellediği için arama
// tarayıcıda yapılır (frontend/src/Services/anilist.ts); bu uç yalnızca gelen sonuçlardan
// en iyi eşleşmeyi seçip eksik alanları DB'ye yazar.

export const anilistRoutes = new Hono<AppEnv>();

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

// İstemciden gelen veri: yalnızca beklenen biçimdeki kayıtlar kullanılır
function isMedia(v: unknown): v is Media {
  const m = v as Media;
  return (
    !!m &&
    typeof m === "object" &&
    typeof m.title === "object" &&
    m.title !== null &&
    Array.isArray(m.genres) &&
    m.genres.every((g) => typeof g === "string") &&
    (m.idMal == null || Number.isInteger(m.idMal)) &&
    (m.episodes == null || Number.isInteger(m.episodes)) &&
    (m.averageScore == null || typeof m.averageScore === "number") &&
    (m.coverImage?.large == null || /^https:\/\//.test(m.coverImage.large))
  );
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
  const { results } = await c.env.DB.prepare(`SELECT a.id, a.name FROM animes a WHERE ${PENDING_WHERE} ORDER BY a.id`).all<{
    id: number;
    name: string;
  }>();
  return c.json({ items: results, batchSize: SYNC_BATCH });
});

// Gövde: { items: [{ id, media: [AniList Media, ...] }] } (tarayıcının AniList'ten aldığı arama sonuçları)
anilistRoutes.post("/sync/batch", requireAdmin, async (c) => {
  const raw = field(await readJson(c), "items");
  const media = new Map<number, Media[]>();
  for (const it of (Array.isArray(raw) ? raw : []).slice(0, SYNC_BATCH) as Record<string, unknown>[]) {
    const id = int(it?.id, -1);
    if (id >= 0) media.set(id, (Array.isArray(it.media) ? it.media : []).filter(isMedia));
  }
  if (!media.size) return c.json({ updated: 0, failed: 0, errors: [], messages: [] });
  const ids = [...media.keys()];
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

  for (const anime of rows) {
    const m = bestMatch(anime.name, media.get(anime.id) ?? []);
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
