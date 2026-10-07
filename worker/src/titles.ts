import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { field, int, readJson, type AppEnv } from "./util";

// İngilizce isimlerin geriye dönük doldurulması: tarayıcı MAL id'leriyle AniList'ten title.english'i
// toplu alır (Worker AniList'e erişemiyor), bu uçlar yalnızca kimin eksik olduğunu söyler ve sonucu yazar.
// Bakılıp İngilizce ismi olmayanlar '' olarak işaretlenir, bir daha sorulmaz.

export const titleRoutes = new Hono<AppEnv>();

export const ENGLISH_BATCH = 50;

const malId = (link: string | null) => {
  const m = /myanimelist\.net\/anime\/(\d+)/.exec(link ?? "");
  return m ? Number(m[1]) : null;
};

titleRoutes.get("/titles/english/pending", requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, mal_anime_link FROM animes WHERE english_name IS NULL AND mal_anime_link LIKE '%myanimelist.net/anime/%' ORDER BY id"
  ).all<{ id: number; mal_anime_link: string | null }>();
  const items = results.flatMap((r) => {
    const idMal = malId(r.mal_anime_link);
    return idMal ? [{ id: r.id, idMal }] : [];
  });
  return c.json({ items, batchSize: ENGLISH_BATCH });
});

// Gövde: { items: [{ id, english }] }; english boşsa '' yazılır (AniList'te İngilizce isim yok)
titleRoutes.post("/titles/english/batch", requireAdmin, async (c) => {
  const raw = field(await readJson(c), "items");
  const items = (Array.isArray(raw) ? raw : [])
    .slice(0, ENGLISH_BATCH)
    .map((it: Record<string, unknown>) => ({
      id: int(it?.id, -1),
      english: typeof it?.english === "string" ? it.english.trim().slice(0, 300) : "",
    }))
    .filter((it) => it.id >= 0);
  if (!items.length) return c.json({ updated: 0 });
  const db = c.env.DB;
  const results = await db.batch(
    items.map((it) => db.prepare("UPDATE animes SET english_name = ? WHERE id = ? AND english_name IS NULL").bind(it.english, it.id))
  );
  return c.json({ updated: results.reduce((n, r) => n + (r.meta.changes ?? 0), 0) });
});
