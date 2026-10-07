// Kişiye özel keşif önerileri (AniList, tarayıcı tarafı; Worker'lar AniList'e erişemiyor).
// Her "karıştır"da farklı sonuç çıkar:
//   1) Zevk profili: kullanıcının puanlarından tür ağırlıkları (ortalamanın üstündeki puanlar türü güçlendirir).
//   2) Tohumlar: en sevdiği animelerden ağırlıklı rastgele birkaçı seçilir, AniList'in "bunu sevenler şunu da
//      sevdi" önerileri alınır.
//   3) Tür keşfi: sevdiği türlerden ağırlıklı rastgele seçilenlerle, rastgele bir sayfadan yüksek puanlı animeler.
//   4) Arşivde (katalogda) olanlar, izlemediği bir serinin devam sezonları ve OVA/özel bölümler elenir.
//   5) Puan = tür uyumu + tohum desteği + AniList puanı; son seçim ağırlıklı rastgele (A-Res), böylece
//      her seferinde farklı ama zevke uygun 12 anime gelir. Az önce gösterilenler cezalandırılır.

import { genreLabel } from "../components/Common/GenreChip";

export type DiscoverMedia = {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null };
  format: string | null;
  episodes: number | null;
  seasonYear: number | null;
  averageScore: number | null;
  status: string | null;
  genres: string[];
  isAdult: boolean;
  siteUrl: string;
  coverImage: { extraLarge: string | null; large: string | null } | null;
  relations: { edges: { relationType: string; node: { id: number; idMal: number | null; type: string; format: string | null; title: { romaji: string | null } } }[] } | null;
};

export type Discovery = { media: DiscoverMedia; reason: string; kind: "seed" | "genre" | "sequel" };

// AniList'in tür listesi (genre_in yalnızca bunları kabul eder)
const ANILIST_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", "Mahou Shoujo", "Mecha", "Music",
  "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
];
const SKIP_GENRES = new Set(["Ecchi", "Hentai"]);
const OK_FORMATS = new Set(["TV", "TV_SHORT", "MOVIE", "ONA"]);
const SERIES_FORMATS = new Set(["TV", "TV_SHORT", "ONA"]);

const FIELDS = `id idMal title { romaji english } format episodes seasonYear averageScore status genres isAdult siteUrl
  coverImage { extraLarge large }
  relations { edges { relationType node { id idMal type format title { romaji } } } }`;

export const normTitle = (s: string | null | undefined) =>
  (s ?? "").toLocaleLowerCase("en").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const malIdOf = (link?: string) => Number(/myanimelist\.net\/anime\/(\d+)/.exec(link ?? "")?.[1]) || null;

export type TasteProfile = {
  /** Türkçe etiket → ağırlık (0-1) */
  genreWeights: Map<string, number>;
  /** AniList tür adı → ağırlık */
  anilistGenres: { genre: string; weight: number }[];
  seeds: { malId: number; name: string; weight: number }[];
  catalogMal: Set<number>;
  catalogNames: Set<string>;
  watchedMal: Set<number>;
};

export function buildTasteProfile(catalog: TEATable.IAnime[]): TasteProfile {
  const catalogMal = new Set<number>();
  const catalogNames = new Set<string>();
  const watchedMal = new Set<number>();
  const rated: { a: TEATable.IAnime; score: number }[] = [];

  for (const a of catalog) {
    const mal = malIdOf(a.MALAnimeLink);
    if (mal) catalogMal.add(mal);
    catalogNames.add(normTitle(a.Name));
    const score = Number(a.Score) || 0;
    const watched = Number(a.WatchStatus) > 0 || score > 0;
    if (a.InMyList && watched && mal) watchedMal.add(mal);
    if (a.InMyList && score > 0) rated.push({ a, score });
  }

  const mean = rated.length ? rated.reduce((s, r) => s + r.score, 0) / rated.length : 70;
  const raw = new Map<string, number>();
  for (const { a, score } of rated) {
    // Ortalamanın üstü türü güçlendirir, altı zayıflatır; +1 hiç puanı olmayan türlerden ayırır
    const w = (score - mean) / 10 + 1;
    const labels = new Set(
      String(a.Genre ?? "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
        .map(genreLabel)
    );
    for (const l of labels) raw.set(l, (raw.get(l) ?? 0) + w);
  }
  const max = Math.max(1, ...raw.values());
  const genreWeights = new Map([...raw].filter(([, w]) => w > 0).map(([g, w]) => [g, w / max]));
  const anilistGenres = ANILIST_GENRES.filter((g) => !SKIP_GENRES.has(g))
    .map((g) => ({ genre: g, weight: genreWeights.get(genreLabel(g)) ?? 0 }))
    .filter((g) => g.weight > 0)
    .sort((x, y) => y.weight - x.weight);

  // Tohumlar: ortalamanın üstünde puanlananlar, puan arttıkça seçilme şansı artar
  const seeds = rated
    .filter((r) => r.score >= mean && malIdOf(r.a.MALAnimeLink))
    .map((r) => ({ malId: malIdOf(r.a.MALAnimeLink)!, name: r.a.Name, weight: Math.pow(Math.max(1, r.score - mean + 5), 2) }));

  return { genreWeights, anilistGenres, seeds, catalogMal, catalogNames, watchedMal };
}

/** Ağırlıklı, yerine koymadan rastgele örnek (Efraimidis-Spirakis) */
function weightedSample<T>(items: T[], weight: (t: T) => number, k: number): T[] {
  return items
    .map((it) => ({ it, key: Math.pow(Math.random(), 1 / Math.max(weight(it), 1e-6)) }))
    .sort((a, b) => b.key - a.key)
    .slice(0, k)
    .map((x) => x.it);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Toplu sorguda bir tohumun MAL id'si AniList'te yoksa AniList tüm yanıtı 404 ile döner ama diğer
// alias'ların verisi yine gelir; bu yüzden ortak istemci yerine kısmi veriyi kabul eden bir istek kullanılır.
async function query<T>(q: string, vars: Record<string, unknown>, signal?: AbortSignal, retry = true): Promise<T> {
  const res = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: q, variables: vars }),
    signal,
  });
  if (res.status === 429 && retry) {
    await sleep((Number(res.headers.get("Retry-After")) || 15) * 1000);
    return query<T>(q, vars, signal, false);
  }
  const json = await res.json().catch(() => null);
  if (!json?.data) throw new Error("AniList'e ulaşılamadı" + (res.status === 429 ? " (istek sınırı, biraz sonra tekrar dene)" : ""));
  return json.data as T;
}

type Candidate = { media: DiscoverMedia; seedVotes: number; seedNames: string[]; fromGenre: boolean };

export async function discover(
  profile: TasteProfile,
  opts: { count?: number; recentlyShown?: Set<number>; signal?: AbortSignal } = {}
): Promise<Discovery[]> {
  const count = opts.count ?? 12;
  const seeds = weightedSample(profile.seeds, (s) => s.weight, 4);
  const genrePool = profile.anilistGenres.slice(0, 8);
  const genres = genrePool.length ? weightedSample(genrePool, (g) => g.weight * g.weight, Math.min(2, genrePool.length)) : [];
  const page = () => 1 + Math.floor(Math.random() * 4);

  const parts: string[] = [];
  const vars: Record<string, unknown> = {};
  const defs: string[] = [];
  seeds.forEach((s, i) => {
    defs.push(`$m${i}: Int`);
    vars[`m${i}`] = s.malId;
    parts.push(`s${i}: Media(idMal: $m${i}, type: ANIME) { recommendations(sort: RATING_DESC, perPage: 15) { nodes { rating mediaRecommendation { ${FIELDS} } } } }`);
  });
  genres.forEach((g, i) => {
    defs.push(`$g${i}: [String]`, `$p${i}: Int`);
    vars[`g${i}`] = [g.genre];
    vars[`p${i}`] = page();
    parts.push(
      `g${i}: Page(page: $p${i}, perPage: 25) { media(type: ANIME, genre_in: $g${i}, sort: [SCORE_DESC], averageScore_greater: 72, isAdult: false) { ${FIELDS} } }`
    );
  });
  if (genres.length === 2) {
    defs.push("$gb: [String]", "$pb: Int");
    vars.gb = genres.map((g) => g.genre);
    vars.pb = page();
    // İki türün kesişimi: genre_in OR ile çalışır, popülerlikle sıralayıp aşağıda iki türü de içerenler öne çıkar
    parts.push(`gb: Page(page: $pb, perPage: 25) { media(type: ANIME, genre_in: $gb, sort: [POPULARITY_DESC], averageScore_greater: 70, isAdult: false) { ${FIELDS} } }`);
  }
  if (!parts.length) {
    // Hiç puan yoksa: genel olarak en beğenilenlerden rastgele bir sayfa
    defs.push("$p: Int");
    vars.p = page();
    parts.push(`top: Page(page: $p, perPage: 40) { media(type: ANIME, sort: [SCORE_DESC], isAdult: false, format_in: [TV, MOVIE, ONA]) { ${FIELDS} } }`);
  }

  const data = await query<Record<string, any>>(`query (${defs.join(", ")}) { ${parts.join("\n")} }`, vars, opts.signal);

  const candidates = new Map<number, Candidate>();
  const add = (m: DiscoverMedia | null | undefined, seed?: { name: string; rating: number }) => {
    if (!m) return;
    const c = candidates.get(m.id) ?? { media: m, seedVotes: 0, seedNames: [], fromGenre: false };
    if (seed) {
      // AniList öneri oyu çok değişken; log ile yumuşatılır
      c.seedVotes += Math.log10(Math.max(seed.rating, 1) + 1);
      if (!c.seedNames.includes(seed.name)) c.seedNames.push(seed.name);
    } else c.fromGenre = true;
    candidates.set(m.id, c);
  };
  seeds.forEach((s, i) => {
    for (const n of data[`s${i}`]?.recommendations?.nodes ?? []) add(n.mediaRecommendation, { name: s.name, rating: n.rating ?? 0 });
  });
  for (const key of Object.keys(data)) if (key.startsWith("g") || key === "top") for (const m of data[key]?.media ?? []) add(m);

  const scored: { d: Discovery; w: number }[] = [];
  for (const c of candidates.values()) {
    const m = c.media;
    if (m.isAdult || !OK_FORMATS.has(m.format ?? "") || m.status === "NOT_YET_RELEASED") continue;
    // Arşivde olanlar önerilmez
    if ((m.idMal && profile.catalogMal.has(m.idMal)) || profile.catalogNames.has(normTitle(m.title.romaji)) || profile.catalogNames.has(normTitle(m.title.english))) continue;

    // Devam sezonu: önceki sezonu izlediyse "devamı" olarak önerilir, izlemediyse elenir
    const prequels = (m.relations?.edges ?? []).filter((e) => e.relationType === "PREQUEL" && e.node.type === "ANIME" && SERIES_FORMATS.has(e.node.format ?? "") );
    let sequelOf: string | null = null;
    if (prequels.length) {
      const watched = prequels.find((e) => e.node.idMal && profile.watchedMal.has(e.node.idMal));
      if (!watched) continue;
      sequelOf = watched.node.title.romaji ?? "önceki sezon";
    }

    const labels = [...new Set(m.genres.map(genreLabel))];
    const liked = labels.map((l) => ({ l, w: profile.genreWeights.get(l) ?? 0 })).sort((a, b) => b.w - a.w);
    const affinity = liked.reduce((s, x) => s + x.w, 0) / Math.sqrt(Math.max(labels.length, 1));
    const quality = (m.averageScore ?? 60) / 100;
    let w = 0.45 * affinity + 0.35 * Math.min(c.seedVotes, 3) + 0.4 * quality + (sequelOf ? 0.5 : 0);
    if (opts.recentlyShown?.has(m.id)) w *= 0.15;

    const topGenres = liked.filter((x) => x.w > 0).slice(0, 2).map((x) => x.l);
    const reason = sequelOf
      ? `İzlediğin ${sequelOf} serisinin devamı`
      : c.seedNames.length
        ? `${c.seedNames.slice(0, 2).join(" ve ")} sevdiğin için`
        : topGenres.length
          ? `${topGenres.join(", ")} sevdiğin için`
          : "Yüksek puanlı";
    scored.push({ d: { media: m, reason, kind: sequelOf ? "sequel" : c.seedNames.length ? "seed" : "genre" }, w: Math.max(w, 0.01) });
  }

  // Ağırlıklı rastgele seçim: güçlü adaylar daha olası ama her seferinde farklı karışım
  return weightedSample(scored, (s) => Math.pow(s.w, 3), count).map((s) => s.d);
}

export const discoveryTitle = (m: DiscoverMedia) => m.title.romaji || m.title.english || `#${m.id}`;

const STATUS_MAP: Record<string, string> = { FINISHED: "Finished", RELEASING: "Currently Airing", NOT_YET_RELEASED: "Not yet aired" };

/** "İzleneceklere ekle": kataloğa Plan to Watch olarak eklenecek satır */
export function discoveryToAnime(m: DiscoverMedia) {
  return {
    Name: discoveryTitle(m),
    AnimeStatus: STATUS_MAP[m.status ?? ""] ?? "Unknown",
    WatchStatus: 0,
    TotalNumberOfEpisodes: m.episodes ?? 0,
    IsMovie: m.format === "MOVIE",
    Score: 0,
    MALScore: m.averageScore ? m.averageScore / 10 : 0,
    Genre: m.genres.join(", "),
    Series: 0,
    PlanToWatch: true,
    AnimeLink: "",
    MALAnimeLink: m.idMal ? `https://myanimelist.net/anime/${m.idMal}` : "",
    Cover: m.coverImage?.extraLarge ?? m.coverImage?.large ?? "",
    Notes: "",
  };
}
