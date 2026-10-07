// Yayın takibi (#19): GitHub Actions'ta zamanlanmış olarak çalışır (.github/workflows/airing.yml).
// AniList Workers'ın çıkış IP'lerini engellediği için sorgu buradan yapılır, sonuç Worker'a yazılır.
//
// Ortam değişkenleri:
//   KIROKU_URL          Sitenin adresi (ör. https://app.dogukankirali.com)
//   KIROKU_CRON_SECRET  Worker'daki CRON_SECRET ile aynı değer
//   CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET  (isteğe bağlı) /api Cloudflare Access arkasındaysa service token

const base = (process.env.KIROKU_URL || "https://app.dogukankirali.com").replace(/\/+$/, "");
const secret = process.env.KIROKU_CRON_SECRET;
if (!secret) {
  console.error("KIROKU_CRON_SECRET tanımlı değil");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${secret}`,
  "Content-Type": "application/json",
  ...(process.env.CF_ACCESS_CLIENT_ID
    ? { "CF-Access-Client-Id": process.env.CF_ACCESS_CLIENT_ID, "CF-Access-Client-Secret": process.env.CF_ACCESS_CLIENT_SECRET ?? "" }
    : {}),
};

async function kiroku(path, init = {}) {
  const res = await fetch(`${base}/api${path}`, { ...init, headers, redirect: "manual" });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status} ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${path} JSON dönmedi (Cloudflare Access giriş sayfası olabilir): ${text.slice(0, 200)}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FIELDS = "id idMal status episodes averageScore nextAiringEpisode { episode airingAt }";

async function anilist(query, variables, attempt = 0) {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 429 && attempt < 3) {
    const wait = Number(res.headers.get("retry-after") ?? 60);
    console.log(`AniList hız sınırı, ${wait} sn bekleniyor`);
    await sleep(wait * 1000);
    return anilist(query, variables, attempt + 1);
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`AniList ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok || json.errors) throw new Error(`AniList ${res.status}: ${JSON.stringify(json.errors ?? json).slice(0, 300)}`);
  return json.data.Page.media;
}

const byAnilist = (ids) =>
  anilist(`query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:ANIME){${FIELDS}}}}`, { ids });
const byMal = (ids) =>
  anilist(`query($ids:[Int]){Page(perPage:50){media(idMal_in:$ids,type:ANIME){${FIELDS}}}}`, { ids });

const { items } = await kiroku("/cron/airing");
console.log(`Takip edilen anime: ${items.length}`);

const results = [];
for (const [key, fetcher] of [
  ["anilistId", byAnilist],
  ["idMal", byMal],
]) {
  const group = items.filter((it) => (key === "anilistId" ? it.anilistId : !it.anilistId && it.idMal));
  for (let i = 0; i < group.length; i += 50) {
    const chunk = group.slice(i, i + 50);
    const media = await fetcher(chunk.map((it) => it[key]));
    const found = new Map(media.map((m) => [key === "anilistId" ? m.id : m.idMal, m]));
    for (const it of chunk) {
      const m = found.get(it[key]);
      if (m) results.push({ id: it.id, media: { id: m.id, status: m.status, episodes: m.episodes, averageScore: m.averageScore, nextAiringEpisode: m.nextAiringEpisode } });
      else console.log(`AniList'te bulunamadı: ${it.name}`);
    }
    await sleep(2000);
  }
}

if (!results.length) {
  console.log("Güncellenecek anime yok");
  process.exit(0);
}
const out = await kiroku("/cron/airing", { method: "POST", body: JSON.stringify({ items: results }) });
console.log(`Güncellenen: ${out.updated}, yeni bölüm: ${out.newEpisodes}, gönderilen mail: ${out.emailed}`);
for (const e of out.episodes ?? []) console.log(`  ${e.name}: ${e.from === e.to ? e.to : `${e.from}-${e.to}`}. bölüm`);
