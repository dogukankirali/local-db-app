// Anime detay sayfası için AniList'ten ayrıntılı bilgi (açıklama, stüdyo, karakterler, ilişkiler, öneriler...).
// AniList Workers'tan erişime kapalı olduğu için tarayıcıdan sorgulanır.

import { anilistQuery } from "../Services/anilist";

const FIELDS = `
  id idMal siteUrl
  title { romaji english native }
  description(asHtml: false)
  bannerImage
  coverImage { extraLarge large color }
  format status episodes chapters volumes duration source
  season seasonYear
  startDate { year month day }
  endDate { year month day }
  averageScore meanScore popularity favourites
  genres
  synonyms
  tags { name rank isMediaSpoiler }
  studios(isMain: true) { nodes { name siteUrl } }
  rankings { rank type allTime season year context }
  trailer { id site }
  nextAiringEpisode { episode airingAt }
  externalLinks { site url type }
  relations { edges { relationType node { id idMal type format status title { romaji english } coverImage { large } } } }
  characters(sort: [ROLE, RELEVANCE], perPage: 12) {
    edges { role node { id name { full } image { medium } } voiceActors(language: JAPANESE) { name { full } image { medium } } }
  }
  recommendations(sort: RATING_DESC, perPage: 10) {
    nodes { mediaRecommendation { id idMal title { romaji english } coverImage { large } averageScore format } }
  }
`;

export type FuzzyDate = { year: number | null; month: number | null; day: number | null };
export type MediaDetail = {
  id: number;
  idMal: number | null;
  siteUrl: string;
  title: { romaji: string | null; english: string | null; native: string | null };
  description: string | null;
  bannerImage: string | null;
  coverImage: { extraLarge: string | null; large: string | null; color: string | null };
  format: string | null;
  status: string | null;
  episodes: number | null;
  chapters?: number | null;
  volumes?: number | null;
  duration: number | null;
  source: string | null;
  season: string | null;
  seasonYear: number | null;
  startDate: FuzzyDate;
  endDate: FuzzyDate;
  averageScore: number | null;
  meanScore: number | null;
  popularity: number | null;
  favourites: number | null;
  genres: string[];
  synonyms: string[];
  tags: { name: string; rank: number; isMediaSpoiler: boolean }[];
  studios: { nodes: { name: string; siteUrl: string }[] };
  rankings: { rank: number; type: string; allTime: boolean; season: string | null; year: number | null; context: string }[];
  trailer: { id: string; site: string } | null;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
  externalLinks: { site: string; url: string; type: string }[];
  relations: { edges: { relationType: string; node: RelatedMedia }[] };
  characters: {
    edges: { role: string; node: { id: number; name: { full: string }; image: { medium: string } }; voiceActors: { name: { full: string }; image: { medium: string } }[] }[];
  };
  recommendations: { nodes: { mediaRecommendation: RelatedMedia | null }[] };
};
export type RelatedMedia = {
  id: number;
  idMal: number | null;
  type?: string;
  format: string | null;
  status?: string | null;
  averageScore?: number | null;
  title: { romaji: string | null; english: string | null };
  coverImage: { large: string | null };
};

/** Önce AniList id, sonra MAL id, en son isimle arar */
export async function fetchMediaDetail(
  opts: { anilistId?: number | null; malId?: number | null; name?: string; type?: "ANIME" | "MANGA" },
  signal?: AbortSignal
) {
  const type = opts.type ?? "ANIME";
  if (opts.anilistId) {
    const r = await anilistQuery<{ Media: MediaDetail | null }>(`query($id:Int){ Media(id:$id, type:${type}){ ${FIELDS} } }`, { id: opts.anilistId }, signal);
    if (r.Media) return r.Media;
  }
  if (opts.malId) {
    const r = await anilistQuery<{ Media: MediaDetail | null }>(`query($id:Int){ Media(idMal:$id, type:${type}){ ${FIELDS} } }`, { id: opts.malId }, signal).catch(() => ({ Media: null }));
    if (r.Media) return r.Media;
  }
  if (opts.name) {
    const r = await anilistQuery<{ Media: MediaDetail | null }>(`query($s:String){ Media(search:$s, type:${type}){ ${FIELDS} } }`, { s: opts.name }, signal).catch(() => ({ Media: null }));
    if (r.Media) return r.Media;
  }
  return null;
}

/** AniList açıklamasındaki HTML'i düz metne çevirir (satır sonları korunur) */
export function plainDescription(html: string | null) {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(i|b|em|strong|span|a)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export function formatFuzzy(d: FuzzyDate) {
  if (!d?.year) return null;
  return [d.day, d.month ? MONTHS[d.month - 1] : null, d.year].filter(Boolean).join(" ");
}

export const FORMAT_TR: Record<string, string> = { TV: "TV", TV_SHORT: "TV kısa", MOVIE: "Film", OVA: "OVA", ONA: "ONA", SPECIAL: "Özel", MUSIC: "Müzik" };
export const STATUS_TR: Record<string, string> = {
  FINISHED: "Bitti",
  RELEASING: "Yayında",
  NOT_YET_RELEASED: "Yayınlanmadı",
  CANCELLED: "İptal",
  HIATUS: "Ara verdi",
};
export const SEASON_TR: Record<string, string> = { WINTER: "Kış", SPRING: "İlkbahar", SUMMER: "Yaz", FALL: "Sonbahar" };
export const SOURCE_TR: Record<string, string> = {
  ORIGINAL: "Orijinal",
  MANGA: "Manga",
  LIGHT_NOVEL: "Light novel",
  WEB_NOVEL: "Web novel",
  NOVEL: "Roman",
  VISUAL_NOVEL: "Görsel roman",
  VIDEO_GAME: "Video oyunu",
  WEB_MANGA: "Web manga",
  OTHER: "Diğer",
};
export const RELATION_TR: Record<string, string> = {
  PREQUEL: "Önceki",
  SEQUEL: "Devamı",
  PARENT: "Ana seri",
  SIDE_STORY: "Yan hikâye",
  SPIN_OFF: "Spin-off",
  ALTERNATIVE: "Alternatif",
  SUMMARY: "Özet",
  ADAPTATION: "Uyarlama",
  SOURCE: "Kaynak",
  CHARACTER: "Ortak karakter",
  OTHER: "Diğer",
  COMPILATION: "Derleme",
  CONTAINS: "İçerir",
};
