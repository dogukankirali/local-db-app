import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { field, int, readJson, type AppEnv } from "./util";

// Kapak kalitesi: eski kayıtlar MAL'ın orta boy görselini (~225 px) kullanıyor.
// Tarayıcı, MAL id'leriyle AniList'ten en büyük kapağı (coverImage.extraLarge) alır;
// bu uçlar yalnızca hangi animelerin yükseltileceğini söyler ve gelen adresleri yazar.
// Elle yüklenen (data:) kapaklara dokunulmaz.

export const coverRoutes = new Hono<AppEnv>();

export const COVER_BATCH = 50;

// AniList'in en büyük kapak boyutu /cover/large/ altında durur (large = /cover/medium/)
const EXTRA_LARGE = /^https:\/\/s4\.anilist\.co\/file\/anilistcdn\/media\/anime\/cover\/large\/[\w.-]+$/;

const malId = (link: string | null) => {
  const m = /myanimelist\.net\/anime\/(\d+)/.exec(link ?? "");
  return m ? Number(m[1]) : null;
};

coverRoutes.get("/covers/pending", requireAdmin, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, mal_anime_link FROM animes
     WHERE (cover IS NULL OR cover NOT LIKE 'data:%')
       AND (cover IS NULL OR cover NOT LIKE 'https://s4.anilist.co/%/cover/large/%')
     ORDER BY id`
  ).all<{ id: number; mal_anime_link: string | null }>();
  const items = results.flatMap((r) => {
    const idMal = malId(r.mal_anime_link);
    return idMal ? [{ id: r.id, idMal }] : [];
  });
  return c.json({ items, skipped: results.length - items.length, batchSize: COVER_BATCH });
});

// Gövde: { items: [{ id, url }] }
coverRoutes.post("/covers/batch", requireAdmin, async (c) => {
  const raw = field(await readJson(c), "items");
  const items = (Array.isArray(raw) ? raw : [])
    .slice(0, COVER_BATCH)
    .map((it: Record<string, unknown>) => ({ id: int(it?.id, -1), url: typeof it?.url === "string" ? it.url : "" }))
    .filter((it) => it.id >= 0 && EXTRA_LARGE.test(it.url));
  if (!items.length) return c.json({ updated: 0 });

  const db = c.env.DB;
  const results = await db.batch(
    items.map((it) =>
      db.prepare("UPDATE animes SET cover = ? WHERE id = ? AND (cover IS NULL OR cover NOT LIKE 'data:%')").bind(it.url, it.id)
    )
  );
  return c.json({ updated: results.reduce((n, r) => n + (r.meta.changes ?? 0), 0) });
});
