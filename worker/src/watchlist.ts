import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { toAnime } from "./anime";
import { field, int, readJson, type AppEnv, type Ctx } from "./util";

// Watchlist ile plan_to_watch, D1'deki trigger'larla senkron tutulur (0001_init.sql):
// plan_to_watch açılınca listeye eklenir, kapanınca çıkarılır.

const SELECT_ITEMS = `SELECT w.id AS w_id, w.anime_id AS w_anime_id, w.order_rank AS w_order_rank,
    w.created_at AS w_created_at, w.updated_at AS w_updated_at,
    a.id, a.name, a.anime_status, a.watch_status, a.total_number_of_episodes, a.is_movie, a.score, a.mal_score,
    a.notes, a.anime_link, a.mal_anime_link, a.series, a.plan_to_watch,
    CASE WHEN a.cover LIKE 'data:%' THEN '__inline__' ELSE a.cover END AS cover,
    (SELECT group_concat(g.genre_name, ', ') FROM animes_genres ag JOIN genres g ON g.id = ag.genre_id WHERE ag.anime_id = a.id) AS genre,
    s.name AS series_name
  FROM watch_lists w
  JOIN animes a ON a.id = w.anime_id
  LEFT JOIN anime_series s ON s.id = a.series`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toItem = (c: Ctx, r: any) => ({
  id: r.w_id,
  anime_id: r.w_anime_id,
  order_rank: r.w_order_rank,
  anime: toAnime(c, r),
  created_at: r.w_created_at,
  updated_at: r.w_updated_at,
});

async function itemById(c: Ctx, id: number) {
  const row = await c.env.DB.prepare(`${SELECT_ITEMS} WHERE w.id = ?`).bind(id).first();
  return row ? toItem(c, row) : null;
}

export const watchlist = new Hono<AppEnv>();

watchlist.get("/watchlist", async (c) => {
  const { results } = await c.env.DB.prepare(`${SELECT_ITEMS} ORDER BY w.order_rank ASC, w.id ASC`).all();
  return c.json(results.map((r) => toItem(c, r)));
});

watchlist.post("/watchlist", requireAdmin, async (c) => {
  const animeId = int(field(await readJson(c), "anime_id"), -1);
  const db = c.env.DB;
  const anime = await db.prepare("SELECT id FROM animes WHERE id = ?").bind(animeId).first();
  if (!anime) return c.json({ error: "Anime not found" }, 404);

  const existing = await db.prepare("SELECT id FROM watch_lists WHERE anime_id = ?").bind(animeId).first<{ id: number }>();
  if (existing) {
    return c.json({ message: "Anime already exists in watch list", data: await itemById(c, existing.id) });
  }
  // plan_to_watch=1 trigger ile listenin sonuna ekler; işaret zaten açıksa doğrudan eklenir
  await db.batch([
    db.prepare("UPDATE animes SET plan_to_watch = 1 WHERE id = ?").bind(animeId),
    db
      .prepare("INSERT OR IGNORE INTO watch_lists (anime_id, order_rank) VALUES (?, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM watch_lists))")
      .bind(animeId),
  ]);
  const row = await db.prepare("SELECT id FROM watch_lists WHERE anime_id = ?").bind(animeId).first<{ id: number }>();
  return c.json({ message: "Anime added to watch list successfully", data: row ? await itemById(c, row.id) : null });
});

// Tek kayıt ({id, order_rank}) ya da toplu sıralama ([{id, order_rank}, ...]) kabul eder
watchlist.put("/watchlist/order", requireAdmin, async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const items = (Array.isArray(body) ? body : [body]) as Record<string, unknown>[];
  const updates = items
    .map((it) => ({ id: int(field(it, "id"), -1), rank: int(field(it, "order_rank")) }))
    .filter((it) => it.id >= 0);
  if (!updates.length) return c.json({ error: "Invalid request body" }, 400);

  const db = c.env.DB;
  const results = await db.batch(
    updates.map((u) =>
      db
        .prepare("UPDATE watch_lists SET order_rank = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?")
        .bind(u.rank, u.id)
    )
  );
  if (!Array.isArray(body)) {
    if (!results[0].meta.changes) return c.json({ error: "Watch list entry not found" }, 404);
    return c.json({ message: "Watch list order updated successfully", data: await itemById(c, updates[0].id) });
  }
  return c.json({ message: "Watch list order updated successfully", updated: updates.length });
});

watchlist.delete("/watchlist", requireAdmin, async (c) => {
  const id = int(c.req.query("id"), -1);
  const db = c.env.DB;
  const entry = await db.prepare("SELECT anime_id FROM watch_lists WHERE id = ?").bind(id).first<{ anime_id: number }>();
  if (!entry) return c.json({ error: "Watch list entry not found" }, 404);
  await db.batch([
    db.prepare("DELETE FROM watch_lists WHERE id = ?").bind(id),
    db.prepare("UPDATE animes SET plan_to_watch = 0 WHERE id = ?").bind(entry.anime_id),
  ]);
  return c.json({ message: "Watch list entry removed successfully", id, anime_id: entry.anime_id });
});

// Trigger'lar listeyi zaten güncel tutuyor; eski istemciler ve elle düzeltme için korunuyor
watchlist.post("/watchlist/sync", requireAdmin, async (c) => {
  const db = c.env.DB;
  const missing = await db
    .prepare("SELECT id FROM animes WHERE plan_to_watch = 1 AND id NOT IN (SELECT anime_id FROM watch_lists) ORDER BY id")
    .all<{ id: number }>();
  if (missing.results.length) {
    await db.batch(
      missing.results.map((r) =>
        db
          .prepare("INSERT OR IGNORE INTO watch_lists (anime_id, order_rank) VALUES (?, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM watch_lists))")
          .bind(r.id)
      )
    );
  }
  const total = await db.prepare("SELECT COUNT(*) AS n FROM watch_lists").first<{ n: number }>();
  return c.json({ message: "Auto sync completed successfully", added: missing.results.length, total: total?.n ?? 0 });
});
