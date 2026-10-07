// Hızlı notları (not defteri) anime kaydına çevirir.
// Desteklenen satırlar (ayraç: " - ", "–", "|", tab, ";"):
//   Shingeki no Kyojin - 2 - 85        → isim, sezon, puan
//   Shingeki no Kyojin S2 85           → isim, sezon, puan
//   Vinland Saga 2. sezon - 9/10       → isim, sezon, puan (10'luk ölçek 100'e çevrilir)
//   https://myanimelist.net/anime/16498/... - 90   → MAL id, puan
//   https://anilist.co/anime/20958 - 90            → AniList id, puan
//   https://eski-site.com/anime/kimetsu-no-yaiba-2-sezon-izle - 80 → linkteki kebab-case isim + sezon
// Eşleştirme AniList'te yapılır; sezon, ilk sezondan SEQUEL ilişkisi takip edilerek bulunur.

import { AniListRateLimit, anilistQuery } from "../Services/anilist";

export type ParsedNote = {
  line: number;
  raw: string;
  /** Aranacak isim (linkten çıkarıldıysa slug'dan üretilmiş) */
  name: string;
  season: number | null;
  /** 0-100 ölçeğinde; yoksa null */
  score: number | null;
  malId: number | null;
  anilistId: number | null;
  link: string | null;
  error?: string;
};

export type AniMedia = {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null };
  format: string | null;
  status: string | null;
  episodes: number | null;
  averageScore: number | null;
  genres: string[];
  seasonYear: number | null;
  coverImage: { extraLarge: string | null; large: string | null } | null;
  relations?: { edges: { relationType: string; node: RelatedNode }[] } | null;
  /** Yalnızca ilişkiden gelen özet kayıt (seçilince tam kaydı çekilir) */
  partial?: boolean;
};

type RelatedNode = {
  id: number;
  type: string;
  format: string | null;
  title?: { romaji: string | null; english: string | null };
  episodes?: number | null;
  seasonYear?: number | null;
};

const SEPARATOR = /\s+[-–—|]\s+|\t|\s*;\s*|\s+\|\s*/;
const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/i;

// Satır sonundaki puan: "85", "8.5", "8,5", "9/10", "85/100", "%85". Önünde ayraç (-, |, ;, :, virgül, tab) olmalı
// ya da /10, /100, % ile yazılmalı; böylece "Mob Psycho 100" gibi isimlerdeki sayılar puan sanılmaz.
const SCORE_WITH_SEPARATOR = /(?:\s*[-–—|;:,]\s*|\t)(%?\s*(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:\/\s*(10|100))?)\s*$/;
const SCORE_WITH_SCALE = /\s(%\s*(\d{1,3})|(\d{1,3}(?:[.,]\d{1,2})?)\s*\/\s*(10|100))\s*$/;

// 10'luk ölçek (8.5, 9, 9/10) 100'lüğe çevrilir; 11-100 olduğu gibi kalır
function normalizeScore(value: string, outOf?: string): number | null {
  const n = Number(value.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  if (outOf === "100") return n <= 100 ? Math.round(n) : null;
  if (outOf === "10" || n <= 10) return n <= 10 ? Math.round(n * 10) : null;
  return n <= 100 ? Math.round(n) : null;
}

// Satır sonundaki "2. sezon", "season 2", "2nd season", "S2", "sezon 2", "part 2" kalıpları
const SEASON_PATTERNS: RegExp[] = [
  /\b(?:season|sezon|saison|staffel)\s*(\d{1,2})\b/i,
  /\b(\d{1,2})\s*\.?\s*(?:sezon|season)\b/i,
  /\b(\d{1,2})(?:st|nd|rd|th)\s+season\b/i,
  /\bs(\d{1,2})\b/i,
];

function takeSeason(text: string): { rest: string; season: number | null } {
  for (const re of SEASON_PATTERNS) {
    const m = re.exec(text);
    if (m) return { rest: (text.slice(0, m.index) + text.slice(m.index + m[0].length)).trim(), season: Number(m[1]) };
  }
  return { rest: text, season: null };
}

// Linkteki slug'dan isim: izleme sitelerinin eklediği kelimeler atılır
const SLUG_NOISE = new Set([
  "izle", "watch", "online", "free", "hd", "full", "turkce", "altyazili", "altyazi", "tr", "sub", "subbed", "dub", "dubbed",
  "english", "anime", "series", "episode", "episodes", "ep", "bolum", "bolumler", "tum", "all", "index", "html", "php", "tv",
]);

function slugToName(url: string): { name: string; season: number | null } {
  let path: string;
  try {
    path = new URL(url.startsWith("http") ? url : `https://${url}`).pathname;
  } catch {
    path = url;
  }
  const segments = path
    .split("/")
    .map((s) => decodeURIComponent(s).replace(/\.(html?|php|aspx?)$/i, ""))
    .filter((s) => /[a-z]/i.test(s) && s.includes("-"));
  // En çok kelime içeren segment genellikle isimdir
  const slug = segments.sort((a, b) => b.split("-").length - a.split("-").length)[0] ?? "";
  let words = slug.toLowerCase().split(/[-_]+/).filter(Boolean);

  // Bölüm kalıntıları: "episode-12", "12-bolum", "bolum-5"
  words = words.filter((w, i) => {
    const prev = words[i - 1];
    const next = words[i + 1];
    if (/^\d+$/.test(w) && (prev === "episode" || prev === "ep" || prev === "bolum" || next === "bolum" || next === "episode")) return false;
    return true;
  });

  const joined = words.join(" ");
  const { rest, season } = takeSeason(joined);
  const name = rest
    .split(" ")
    .filter((w) => !SLUG_NOISE.has(w) && !/^\d{4,}$/.test(w))
    .join(" ")
    .trim();
  return { name, season };
}

export function parseNotes(text: string): ParsedNote[] {
  const out: ParsedNote[] = [];
  text.split(/\r?\n/).forEach((rawLine, idx) => {
    const raw = rawLine.trim();
    if (!raw || raw.startsWith("#") || raw.startsWith("//")) return;
    const note: ParsedNote = { line: idx + 1, raw, name: "", season: null, score: null, malId: null, anilistId: null, link: null };

    let body = raw.replace(/^[-*•]\s+/, "");

    // Link
    const urlMatch = URL_RE.exec(body);
    if (urlMatch) {
      note.link = urlMatch[1].replace(/[),.]+$/, "");
      body = (body.slice(0, urlMatch.index) + " " + body.slice(urlMatch.index + urlMatch[0].length)).trim();
      const mal = /myanimelist\.net\/anime\/(\d+)/i.exec(note.link);
      const ani = /anilist\.co\/anime\/(\d+)/i.exec(note.link);
      if (mal) note.malId = Number(mal[1]);
      if (ani) note.anilistId = Number(ani[1]);
    }

    // Puan (satır sonunda)
    const withSep = SCORE_WITH_SEPARATOR.exec(body);
    const withScale = withSep ? null : SCORE_WITH_SCALE.exec(" " + body);
    if (withSep) {
      note.score = normalizeScore(withSep[2], withSep[3]);
      body = body.slice(0, withSep.index).trim();
    } else if (withScale) {
      note.score = withScale[2] ? normalizeScore(withScale[2], "100") : normalizeScore(withScale[3], withScale[4]);
      body = body.slice(0, Math.max(0, (withScale.index ?? 0) - 1)).trim();
    } else if (note.link) {
      const bare = /^(\d{1,3}(?:[.,]\d{1,2})?)$/.exec(body);
      if (bare) {
        note.score = normalizeScore(bare[1]);
        body = "";
      }
    }

    // Kalan parçalar: "isim - sezon" ya da "isim"
    const parts = body.split(SEPARATOR).map((p) => p.trim()).filter(Boolean);
    let namePart = parts[0] ?? "";
    for (const p of parts.slice(1)) {
      if (/^\d{1,2}$/.test(p)) note.season = Number(p);
      else {
        const s = takeSeason(p);
        if (s.season) note.season = s.season;
        else namePart = `${namePart} ${p}`.trim();
      }
    }
    if (note.season === null) {
      const s = takeSeason(namePart);
      namePart = s.rest;
      note.season = s.season;
    }
    note.name = namePart.replace(/[-–—|:,]+$/, "").trim();

    if (!note.name && note.link && !note.malId && !note.anilistId) {
      const fromSlug = slugToName(note.link);
      note.name = fromSlug.name;
      note.season = note.season ?? fromSlug.season;
    }
    if (!note.name && !note.malId && !note.anilistId) note.error = "İsim ya da tanınan bir link bulunamadı";
    out.push(note);
  });
  return out;
}

// --- AniList eşleştirme ---

const MEDIA_FIELDS = `id idMal title { romaji english } format status episodes averageScore genres seasonYear
  coverImage { extraLarge large }
  relations { edges { relationType node { id type format title { romaji english } episodes seasonYear } } }`;

const SERIES_FORMATS = new Set(["TV", "TV_SHORT", "ONA"]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function query<T>(q: string, vars: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await anilistQuery<T>(q, vars, signal);
    } catch (err) {
      // AniList dakikada ~90 istek kabul eder; sınıra takılınca bekleyip tekrar dener
      if (err instanceof AniListRateLimit && attempt < 3) {
        await sleep(20_000);
        continue;
      }
      throw err;
    }
  }
}

async function byId(id: number, signal?: AbortSignal) {
  return (await query<{ Media: AniMedia | null }>(`query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`, { id }, signal)).Media;
}

async function byMalId(idMal: number, signal?: AbortSignal) {
  return (await query<{ Media: AniMedia | null }>(`query ($idMal: Int) { Media(idMal: $idMal, type: ANIME) { ${MEDIA_FIELDS} } }`, { idMal }, signal)).Media;
}

async function search(name: string, signal?: AbortSignal) {
  return (
    await query<{ Page: { media: AniMedia[] } }>(
      `query ($s: String) { Page(perPage: 6) { media(search: $s, type: ANIME, sort: SEARCH_MATCH) { ${MEDIA_FIELDS} } } }`,
      { s: name },
      signal
    )
  ).Page.media;
}

/** İlk sezondan başlayıp SEQUEL ilişkisiyle n. sezona ilerler (yalnızca TV/ONA; film ve OVA'lar atlanır) */
async function followSeasons(first: AniMedia, season: number, signal?: AbortSignal): Promise<AniMedia | null> {
  let current: AniMedia | null = first;
  for (let i = 1; i < season && current; i++) {
    const edges = current.relations?.edges ?? [];
    const sequels = edges.filter((e) => e.relationType === "SEQUEL" && e.node.type === "ANIME");
    const next = sequels.find((e) => SERIES_FORMATS.has(e.node.format ?? "")) ?? sequels[0];
    if (!next) return null;
    current = await byId(next.node.id, signal);
    // Araya giren film/OVA sezon sayılmaz
    while (current && !SERIES_FORMATS.has(current.format ?? "")) {
      const nextEdge = current.relations?.edges.find((e) => e.relationType === "SEQUEL" && e.node.type === "ANIME");
      if (!nextEdge) break;
      current = await byId(nextEdge.node.id, signal);
    }
  }
  return current;
}

export type NoteMatch = { media: AniMedia | null; candidates: AniMedia[]; error?: string };

/** Seçilen kaydın önceki/sonraki sezonları da aday olsun (sezon numaralandırması sitelere göre değişebiliyor) */
function withNeighbours(media: AniMedia, others: AniMedia[]): AniMedia[] {
  const seen = new Set<number>([media.id]);
  const list: AniMedia[] = [media];
  const neighbours = (media.relations?.edges ?? [])
    .filter((e) => (e.relationType === "PREQUEL" || e.relationType === "SEQUEL") && e.node.type === "ANIME")
    .map((e) => ({
      id: e.node.id,
      idMal: null,
      title: e.node.title ?? { romaji: null, english: null },
      format: e.node.format,
      status: null,
      episodes: e.node.episodes ?? null,
      averageScore: null,
      genres: [],
      seasonYear: e.node.seasonYear ?? null,
      coverImage: null,
      partial: true,
    }));
  for (const m of [...neighbours, ...others]) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      list.push(m);
    }
  }
  return list;
}

/** Özet (partial) aday seçildiğinde tam kaydı getirir */
export async function loadMedia(id: number, signal?: AbortSignal) {
  return byId(id, signal);
}

export async function matchNote(note: ParsedNote, signal?: AbortSignal): Promise<NoteMatch> {
  if (note.anilistId) {
    const m = await byId(note.anilistId, signal);
    return m ? { media: m, candidates: withNeighbours(m, []) } : { media: null, candidates: [], error: "AniList'te bu id yok" };
  }
  if (note.malId) {
    const m = await byMalId(note.malId, signal);
    if (m) return { media: m, candidates: withNeighbours(m, []) };
  }
  if (!note.name) return { media: null, candidates: [], error: note.error ?? "Aranacak isim yok" };

  const results = await search(note.name, signal);
  if (!results.length) return { media: null, candidates: [], error: "AniList'te bulunamadı" };

  // Sezon verilmediyse en iyi eşleşme; verildiyse önce seri formatındaki ilk sonucu 1. sezon kabul edip ilerle
  if (!note.season || note.season === 1) {
    const first = note.season === 1 ? results.find((r) => SERIES_FORMATS.has(r.format ?? "")) ?? results[0] : results[0];
    return { media: first, candidates: withNeighbours(first, results) };
  }
  // Arama zaten doğrudan o sezonu bulduysa ("... Season 2" başlıklı) onu kullan
  const direct = results.find((r) =>
    [r.title.romaji, r.title.english].some((t) => t && new RegExp(`\\b(season\\s*${note.season}|${note.season}(st|nd|rd|th)\\s+season)\\b`, "i").test(t))
  );
  if (direct) return { media: direct, candidates: withNeighbours(direct, results) };

  const root = results.find((r) => SERIES_FORMATS.has(r.format ?? "") && !(r.relations?.edges ?? []).some((e) => e.relationType === "PREQUEL" && SERIES_FORMATS.has(e.node.format ?? ""))) ?? results[0];
  const target = await followSeasons(root, note.season, signal);
  if (target) return { media: target, candidates: withNeighbours(target, results) };
  return { media: results[0], candidates: results, error: `${note.season}. sezon bulunamadı, en yakın sonuç seçildi` };
}

const STATUS_MAP: Record<string, string> = {
  FINISHED: "Finished",
  RELEASING: "Currently Airing",
  NOT_YET_RELEASED: "Not yet aired",
  CANCELLED: "Finished",
  HIATUS: "Currently Airing",
};

/** Eşleşen AniList kaydını Kiroku'nun CSV/API satırına çevirir (ANIME_COLUMNS ile aynı alanlar) */
export function noteToAnimeRow(note: ParsedNote, media: AniMedia): Record<string, any> {
  const episodes = media.episodes ?? 0;
  const ownLink = note.link && !note.malId && !note.anilistId ? note.link : "";
  return {
    Name: media.title.romaji || media.title.english || note.name,
    EnglishName: media.title.english ?? "",
    AnimeStatus: STATUS_MAP[media.status ?? ""] ?? "Unknown",
    // Puan verildiyse izlenip bitirildiği varsayılır
    WatchStatus: note.score !== null && episodes ? episodes : 0,
    TotalNumberOfEpisodes: episodes,
    IsMovie: media.format === "MOVIE",
    Score: note.score ?? 0,
    MALScore: media.averageScore ? media.averageScore / 10 : 0,
    Genre: media.genres.join(", "),
    SeriesName: "",
    Series: 0,
    PlanToWatch: false,
    AnimeLink: ownLink,
    MALAnimeLink: media.idMal ? `https://myanimelist.net/anime/${media.idMal}` : "",
    Cover: media.coverImage?.extraLarge ?? media.coverImage?.large ?? "",
    Notes: "",
  };
}

export const mediaTitle = (m: AniMedia) => m.title.romaji || m.title.english || `#${m.id}`;

const FORMAT_TR: Record<string, string> = { TV: "TV", TV_SHORT: "TV kısa", MOVIE: "Film", OVA: "OVA", ONA: "ONA", SPECIAL: "Özel", MUSIC: "Müzik" };
export const mediaSubtitle = (m: AniMedia) =>
  [FORMAT_TR[m.format ?? ""] ?? m.format, m.seasonYear, m.episodes ? `${m.episodes} bölüm` : null].filter(Boolean).join(" · ");
