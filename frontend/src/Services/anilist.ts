// AniList, Cloudflare Workers'ın çıkış IP'lerini engelliyor; bu yüzden AniList'e
// doğrudan tarayıcıdan gidilir (AniList CORS'a izin veriyor, eklenti de böyle çağırıyor).
// Worker yalnızca sonuçları DB'ye yazar.

const ANILIST = "https://graphql.anilist.co";

export class AniListRateLimit extends Error {
  constructor(public retryAfter: number) {
    super("AniList istek sınırı aşıldı");
  }
}

export async function anilistQuery<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal,
  });
  if (res.status === 429) throw new AniListRateLimit(Number(res.headers.get("Retry-After")) || 60);
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data) {
    throw new Error(`AniList hatası (${res.status}): ${JSON.stringify(json?.errors ?? json).slice(0, 200)}`);
  }
  return json.data as T;
}

type SearchMedia = {
  id: number;
  idMal: number | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  episodes: number | null;
  status: string | null;
  format: string | null;
  averageScore: number | null;
  genres: string[];
  coverImage: { large: string | null; medium: string | null } | null;
  siteUrl: string;
};

const SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { currentPage lastPage hasNextPage }
      media(search: $search, type: ANIME) {
        id idMal title { romaji english native } episodes status format averageScore genres
        coverImage { large medium } siteUrl
      }
    }
  }`;

// Anime ekleme modalı Jikan biçiminde sonuç bekliyor; AniList yanıtı o biçime çevrilir
export async function searchAnime(search: string, page = 1) {
  const data = await anilistQuery<{
    Page: { pageInfo: { currentPage: number; lastPage: number; hasNextPage: boolean }; media: SearchMedia[] };
  }>(SEARCH_QUERY, { search, page, perPage: 10 });
  return {
    success: true,
    data: {
      pagination: { has_next_page: data.Page.pageInfo.hasNextPage, last_visible_page: data.Page.pageInfo.lastPage },
      data: data.Page.media.map((m) => ({
        mal_id: m.idMal ?? m.id,
        title: m.title.romaji ?? m.title.english ?? "",
        title_english: m.title.english ?? undefined,
        title_japanese: m.title.native ?? undefined,
        images: { jpg: { image_url: m.coverImage?.large ?? m.coverImage?.medium ?? "" } },
        type: m.format === "MOVIE" ? "Movie" : m.format ?? undefined,
        episodes: m.episodes ?? undefined,
        status: m.status ?? undefined,
        airing: m.status === "RELEASING",
        genres: m.genres.map((name) => ({ name })),
        score: m.averageScore ? m.averageScore / 10 : 0,
        url: m.idMal ? `https://myanimelist.net/anime/${m.idMal}` : m.siteUrl,
      })),
    },
  };
}

const SYNC_FIELDS = `id idMal title { romaji english } episodes status format averageScore genres coverImage { large }
  relations { edges { relationType node { type title { romaji english } } } }`;

// Sync grubu: her anime adı tek GraphQL isteğinde alias'la aranır
export async function searchForSync(names: string[], signal?: AbortSignal): Promise<unknown[][]> {
  const vars = names.map((_, i) => `$s${i}: String`).join(", ");
  const parts = names.map((_, i) => `a${i}: Page(perPage: 5) { media(search: $s${i}, type: ANIME) { ${SYNC_FIELDS} } }`);
  const data = await anilistQuery<Record<string, { media: unknown[] }>>(
    `query (${vars}) { ${parts.join("\n")} }`,
    Object.fromEntries(names.map((n, i) => [`s${i}`, n])),
    signal
  );
  return names.map((_, i) => data[`a${i}`]?.media ?? []);
}
