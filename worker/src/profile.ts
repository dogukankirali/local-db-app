import { Hono } from "hono";
import { API_TOKEN_PREFIX, checkPasswordFor, generateResetToken, hashResetToken, requireAuth } from "./auth";
import { LIST_COLUMNS, LIST_FROM, toAnime } from "./anime";
import { field, int, message, readJson, str, type AppEnv } from "./util";

// Profil sayfası (#39) ve eklenti anahtarları (#26)

export const profileRoutes = new Hono<AppEnv>();

// Kullanıcının en yüksek puan verdiği animeler (eşitlikte MAL puanı)
profileRoutes.get("/profile/top-anime", requireAuth, async (c) => {
  const limit = Math.min(Math.max(int(c.req.query("limit")) || 10, 1), 50);
  const userId = c.get("user")!.userId;
  const { results } = await c.env.DB.prepare(
    `SELECT ${LIST_COLUMNS} FROM ${LIST_FROM}
     WHERE u.score > 0
     ORDER BY u.score DESC, COALESCE(a.mal_score, 0) DESC, a.id ASC LIMIT ?`
  )
    .bind(userId, limit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .all<any>();
  return c.json({ data: results.map((r) => toAnime(c, r)) });
});

// Öneriler (ilk sürüm, tür tabanlı): kullanıcının puanları ortalamasından ne kadar yüksekse o türün ağırlığı
// o kadar artar. Kullanıcının izlemediği, Plan to Watch'a almadığı ve puan vermediği, MAL puanı iyi olan
// animeler tür uyumu × MAL puanına göre sıralanır. Hiç puanı yoksa yalnızca MAL puanına bakılır.
profileRoutes.get("/profile/recommendations", requireAuth, async (c) => {
  const userId = c.get("user")!.userId;
  const db = c.env.DB;
  const user = await db.prepare("SELECT show_recommendations FROM users WHERE id = ?").bind(userId).first<{ show_recommendations: number }>();
  if (!user?.show_recommendations) return c.json({ enabled: false, data: [] });
  const limit = Math.min(Math.max(int(c.req.query("limit")) || 12, 1), 50);

  const { results } = await db
    .prepare(
      `WITH mine AS (SELECT anime_id, score FROM user_anime WHERE user_id = ?1 AND score > 0),
            mean AS (SELECT AVG(score) AS m FROM mine),
            gw AS (
              SELECT ag.genre_id, SUM(mine.score - (SELECT m FROM mean) + 1) AS w
              FROM mine JOIN animes_genres ag ON ag.anime_id = mine.anime_id
              GROUP BY ag.genre_id HAVING w > 0
            ),
            cand AS (
              SELECT a.id,
                     COALESCE(SUM(gw.w), 0) * 1.0 / MAX(COUNT(ag.genre_id), 1) AS affinity,
                     (SELECT group_concat(g.genre_name, ', ') FROM (
                        SELECT g2.genre_name FROM animes_genres ag2 JOIN gw gw2 ON gw2.genre_id = ag2.genre_id
                        JOIN genres g2 ON g2.id = ag2.genre_id WHERE ag2.anime_id = a.id ORDER BY gw2.w DESC LIMIT 3
                      ) g) AS reason
              FROM animes a
              LEFT JOIN animes_genres ag ON ag.anime_id = a.id
              LEFT JOIN gw ON gw.genre_id = ag.genre_id
              WHERE COALESCE(a.mal_score, 0) >= 7
                AND NOT EXISTS (
                  SELECT 1 FROM user_anime x WHERE x.user_id = ?1 AND x.anime_id = a.id
                    AND (x.watch_status <> 0 OR x.plan_to_watch = 1 OR COALESCE(x.score, 0) > 0)
                )
              GROUP BY a.id
            )
       SELECT ${LIST_COLUMNS}, cand.reason AS reason
       FROM ${LIST_FROM.replace("u.user_id = ?", "u.user_id = ?1")} JOIN cand ON cand.id = a.id
       ORDER BY CASE WHEN (SELECT COUNT(*) FROM gw) > 0 THEN cand.affinity ELSE 1 END * a.mal_score DESC, a.mal_score DESC, a.id ASC
       LIMIT ?2`
    )
    .bind(userId, limit)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .all<any>();
  return c.json({ enabled: true, data: results.map((r) => ({ ...toAnime(c, r), Reason: r.reason ?? "" })) });
});

// --- Eklenti anahtarları ---

async function createToken(db: D1Database, userId: number, name: string) {
  const token = `${API_TOKEN_PREFIX}${generateResetToken()}`;
  const row = await db
    .prepare("INSERT INTO api_tokens (user_id, token_hash, name) VALUES (?, ?, ?) RETURNING id, name, created_at")
    .bind(userId, await hashResetToken(token), name.slice(0, 60) || "Tarayıcı eklentisi")
    .first<{ id: number; name: string; created_at: string }>();
  return { token, id: row!.id, name: row!.name, createdAt: row!.created_at };
}

profileRoutes.get("/profile/tokens", requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, created_at, last_used_at FROM api_tokens WHERE user_id = ? ORDER BY id DESC"
  )
    .bind(c.get("user")!.userId)
    .all<{ id: number; name: string; created_at: string; last_used_at: string | null }>();
  return c.json(results.map((t) => ({ id: t.id, name: t.name, createdAt: t.created_at, lastUsedAt: t.last_used_at })));
});

// Anahtar yalnızca oluşturulurken bir kez gösterilir
profileRoutes.post("/profile/tokens", requireAuth, async (c) => {
  const name = str(field(await readJson(c), "name")).trim();
  return c.json(await createToken(c.env.DB, c.get("user")!.userId, name), 201);
});

profileRoutes.delete("/profile/tokens", requireAuth, async (c) => {
  const id = int(c.req.query("id"), -1);
  const res = await c.env.DB.prepare("DELETE FROM api_tokens WHERE id = ? AND user_id = ?").bind(id, c.get("user")!.userId).run();
  if (!res.meta.changes) return message(c, "Anahtar bulunamadı", 404);
  return message(c, "OK");
});

// Eklentinin girişi: kullanıcı adı/e-posta + şifre ile eklentiye özel bir anahtar alır
profileRoutes.post("/auth/extension-token", async (c) => {
  const body = await readJson(c);
  const login = str(field(body, "username")).trim();
  const user = await checkPasswordFor(c.env, login, str(field(body, "password")));
  if (!user) return message(c, "Geçersiz kullanıcı adı veya şifre", 401);
  const created = await createToken(c.env.DB, user.id, str(field(body, "name")).trim() || "Tarayıcı eklentisi");
  return c.json({ token: created.token, username: user.username, isAdmin: Boolean(user.is_admin) });
});
