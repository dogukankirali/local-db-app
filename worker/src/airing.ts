import { Hono, type MiddlewareHandler } from "hono";
import { statusLabel } from "./anilist";
import { sendEmail } from "./email";
import { field, int, num, readJson, str, type AppEnv, type Env } from "./util";

// Yayın takibi (#19). AniList, Workers'ın çıkış IP'lerini engellediği için zamanlanmış iş GitHub Actions'ta
// çalışır (.github/workflows/airing.yml → scripts/airing-check.mjs): bu uçtan takip edilecek animeleri alır,
// AniList'e sorar ve sonuçları geri yollar. Worker durumu, bölüm sayısını, MAL puanını ve sıradaki bölümü
// yazar; yeni bölüm çıkan animeleri, bildirimi açık ve animeyi listesinde tutan kullanıcılara mailler.
// Yetki: Authorization: Bearer <CRON_SECRET> (Worker secret'ı ve GitHub secret'ı aynı değer).

export const airingRoutes = new Hono<AppEnv>();

const requireCron: MiddlewareHandler<AppEnv> = async (c, next) => {
  const secret = c.env.CRON_SECRET;
  const given = c.req.header("Authorization")?.replace(/^Bearer /, "") ?? "";
  if (!secret || given.length !== secret.length) return c.json({ error: "Yetkisiz" }, 401);
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= secret.charCodeAt(i) ^ given.charCodeAt(i);
  if (diff) return c.json({ error: "Yetkisiz" }, 401);
  await next();
};

const malId = (link: string | null) => {
  const m = /myanimelist\.net\/anime\/(\d+)/.exec(link ?? "");
  return m ? Number(m[1]) : null;
};

// Bitmemiş (yayında / henüz başlamamış) ya da sıradaki bölümü bilinen animeler
airingRoutes.get("/cron/airing", requireCron, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, name, mal_anime_link, anilist_id FROM animes
     WHERE anime_status IN ('Currently Airing', 'Not yet aired') OR next_episode IS NOT NULL
     ORDER BY id`
  ).all<{ id: number; name: string; mal_anime_link: string | null; anilist_id: number | null }>();
  const items = results
    .map((r) => ({ id: r.id, name: r.name, idMal: malId(r.mal_anime_link), anilistId: r.anilist_id }))
    .filter((r) => r.idMal || r.anilistId);
  return c.json({ items });
});

type AiringMedia = {
  id: number;
  status: string | null;
  episodes: number | null;
  averageScore: number | null;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
};

function isAiringMedia(v: unknown): v is AiringMedia {
  const m = v as AiringMedia;
  return (
    !!m &&
    typeof m === "object" &&
    Number.isInteger(m.id) &&
    (m.status == null || typeof m.status === "string") &&
    (m.episodes == null || Number.isInteger(m.episodes)) &&
    (m.averageScore == null || typeof m.averageScore === "number") &&
    (m.nextAiringEpisode == null ||
      (Number.isInteger(m.nextAiringEpisode.episode) && Number.isInteger(m.nextAiringEpisode.airingAt)))
  );
}

type Row = { id: number; name: string; aired_episodes: number | null; cover: string | null };
type NewEpisode = { animeId: number; name: string; from: number; to: number };

// Gövde: { items: [{ id, media: AniList Media }] }
airingRoutes.post("/cron/airing", requireCron, async (c) => {
  const raw = field(await readJson(c), "items");
  const items = (Array.isArray(raw) ? raw : [])
    .map((it: Record<string, unknown>) => ({ id: int(it?.id, -1), media: it?.media }))
    .filter((it): it is { id: number; media: AiringMedia } => it.id >= 0 && isAiringMedia(it.media))
    .slice(0, 500);
  if (!items.length) return c.json({ updated: 0, newEpisodes: 0, emailed: 0 });

  const db = c.env.DB;
  const rows = new Map<number, Row>();
  for (let i = 0; i < items.length; i += 90) {
    const ids = items.slice(i, i + 90).map((it) => it.id);
    const { results } = await db
      .prepare(`SELECT id, name, aired_episodes, cover FROM animes WHERE id IN (${ids.map(() => "?").join(", ")})`)
      .bind(...ids)
      .all<Row>();
    for (const r of results) rows.set(r.id, r);
  }

  const now = new Date().toISOString();
  const stmts: D1PreparedStatement[] = [];
  const fresh: NewEpisode[] = [];
  for (const { id, media: m } of items) {
    const row = rows.get(id);
    if (!row) continue;
    const next = m.nextAiringEpisode;
    const aired = next ? Math.max(next.episode - 1, 0) : m.status === "FINISHED" ? m.episodes : row.aired_episodes;
    // İlk kontrolde (aired_episodes boş) yalnızca başlangıç değeri yazılır, mail atılmaz
    if (row.aired_episodes != null && aired != null && aired > row.aired_episodes) {
      fresh.push({ animeId: id, name: row.name, from: row.aired_episodes + 1, to: aired });
    }
    stmts.push(
      db
        .prepare(
          `UPDATE animes SET anilist_id = ?,
             anime_status = CASE WHEN ? <> '' THEN ? ELSE anime_status END,
             total_number_of_episodes = CASE WHEN ? > 0 THEN ? ELSE total_number_of_episodes END,
             mal_score = CASE WHEN ? > 0 THEN ? ELSE mal_score END,
             next_episode = ?, next_episode_at = ?, aired_episodes = ?, airing_checked_at = ?
           WHERE id = ?`
        )
        .bind(
          m.id,
          statusLabel(m.status), statusLabel(m.status),
          m.episodes ?? 0, m.episodes ?? 0,
          num(m.averageScore) / 10, num(m.averageScore) / 10,
          next?.episode ?? null, next ? new Date(next.airingAt * 1000).toISOString() : null, aired ?? null, now,
          id
        )
    );
  }
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));

  const emailed = fresh.length ? await notify(c.env, fresh, new URL(c.req.url).origin) : 0;
  return c.json({ updated: stmts.length, newEpisodes: fresh.length, emailed, episodes: fresh });
});

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

// Her kullanıcıya tek mail: listesinde (izliyor ya da Plan to Watch) olan ve yeni bölümü çıkan animeler
async function notify(env: Env, fresh: NewEpisode[], origin: string): Promise<number> {
  if (!env.RESEND_API_KEY) {
    console.log(`[airing] RESEND_API_KEY yok; ${fresh.length} yeni bölüm için mail atılmadı`);
    return 0;
  }
  const ids = fresh.map((f) => f.animeId);
  const { results } = await env.DB.prepare(
    `SELECT u.id AS user_id, u.email, u.username, ua.anime_id FROM users u
     JOIN user_anime ua ON ua.user_id = u.id
     WHERE u.notify_new_episodes = 1 AND u.is_active = 1
       AND (ua.watch_status <> 0 OR ua.plan_to_watch = 1)
       AND ua.anime_id IN (${ids.map(() => "?").join(", ")})`
  )
    .bind(...ids)
    .all<{ user_id: number; email: string; username: string; anime_id: number }>();

  const byUser = new Map<number, { email: string; username: string; animes: NewEpisode[] }>();
  for (const r of results) {
    const entry = byUser.get(r.user_id) ?? { email: r.email, username: r.username, animes: [] };
    entry.animes.push(fresh.find((f) => f.animeId === r.anime_id)!);
    byUser.set(r.user_id, entry);
  }

  const app = (env.APP_URL || origin).replace(/\/+$/, "");
  let sent = 0;
  for (const { email, username, animes } of byUser.values()) {
    const rows = animes
      .map(
        (a) =>
          `<li style="margin:6px 0"><a href="${app}/anime?q=${encodeURIComponent(a.name)}" style="color:#A895FF;text-decoration:none">${escapeHtml(a.name)}</a> · ${
            a.from === a.to ? `${a.to}. bölüm` : `${a.from}–${a.to}. bölümler`
          }</li>`
      )
      .join("");
    const html = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#0B0D12;font-family:Inter,Segoe UI,Arial,sans-serif;color:#E7E9EE">
  <div style="max-width:520px;margin:0 auto;background:#12161E;border:1px solid #232938;border-radius:16px;padding:28px">
    <h2 style="margin:0 0 12px;font-size:20px">Yeni bölümler çıktı</h2>
    <p style="color:#8A93A6;line-height:1.6">Merhaba ${escapeHtml(username)}, listendeki şu animelerin yeni bölümleri yayınlandı:</p>
    <ul style="padding-left:18px;line-height:1.5">${rows}</ul>
    <p style="color:#5B6478;font-size:12px;margin-top:24px">Bu bildirimleri Kiroku'da profil sayfandan kapatabilirsin.</p>
  </div>
</body>
</html>`;
    const subject = animes.length === 1 ? `Kiroku · ${animes[0].name} yeni bölüm` : `Kiroku · ${animes.length} animede yeni bölüm`;
    try {
      await sendEmail(env, email, subject, html);
      sent++;
    } catch (err) {
      console.error(`[airing] mail gönderilemedi (${str(email)}):`, err);
    }
  }
  return sent;
}
