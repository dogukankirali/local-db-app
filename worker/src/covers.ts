import { Hono } from "hono";
import { requireAdmin } from "./auth";
import { field, int, readJson, type AppEnv } from "./util";

// Kapak kalitesi: eski kayıtlar MAL'ın orta boy görselini (~225 px) kullanıyor.
// Tarayıcı, MAL id'leriyle AniList'ten en büyük kapağı (coverImage.extraLarge) alır;
// bu uçlar yalnızca hangi animelerin yükseltileceğini söyler ve gelen adresleri yazar.
// AniList'te karşılığı bulunamayan MAL kapakları MAL'ın büyük sürümüne (aynı yol + "l.jpg") çevrilir.
// Base64 (data:) kapaklar da MAL id'si varsa AniList kapağıyla değiştirilir.

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
     WHERE (cover IS NULL OR cover NOT LIKE 'https://s4.anilist.co/%/cover/large/%')
       AND (cover IS NULL OR cover NOT GLOB 'https://cdn.myanimelist.net/images/anime/*l.jpg')
     ORDER BY id`
  ).all<{ id: number; mal_anime_link: string | null }>();
  // idMal yoksa istemci doğrudan MAL büyük sürümü yedeğini ister
  const items = results.map((r) => ({ id: r.id, idMal: malId(r.mal_anime_link) }));
  return c.json({ items, batchSize: COVER_BATCH });
});

// Gövde: { items: [{ id, url }] }; url yoksa (AniList'te bulunamadı) MAL büyük sürümüne geçilir
coverRoutes.post("/covers/batch", requireAdmin, async (c) => {
  const raw = field(await readJson(c), "items");
  const items = (Array.isArray(raw) ? raw : [])
    .slice(0, COVER_BATCH)
    .map((it: Record<string, unknown>) => ({ id: int(it?.id, -1), url: typeof it?.url === "string" ? it.url : null }))
    .filter((it) => it.id >= 0 && (it.url === null || EXTRA_LARGE.test(it.url)));
  if (!items.length) return c.json({ updated: 0 });

  const db = c.env.DB;
  const results = await db.batch(
    items.map((it) =>
      it.url
        ? db.prepare("UPDATE animes SET cover = ? WHERE id = ?").bind(it.url, it.id)
        : db
            .prepare(
              `UPDATE animes SET cover = substr(cover, 1, length(cover) - 4) || 'l.jpg'
               WHERE id = ? AND cover GLOB 'https://cdn.myanimelist.net/images/anime/*.jpg' AND cover NOT GLOB '*l.jpg'`
            )
            .bind(it.id)
    )
  );
  return c.json({ updated: results.reduce((n, r) => n + (r.meta.changes ?? 0), 0) });
});
