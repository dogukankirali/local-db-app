// Seri bilgisi AniList'ten (MAL ID'siyle birlikte) alınır; CBZ içine ComicInfo.xml, seri klasörüne
// series.json (eski manga-scrapper ile aynı alanlar) ve cover.jpg yazılır.

const QUERY = `query ($search: String, $id: Int, $idMal: Int) {
  Media(search: $search, id: $id, idMal: $idMal, type: MANGA) {
    id idMal format status chapters volumes
    title { romaji english native }
    description(asHtml: false)
    startDate { year month day }
    genres
    coverImage { extraLarge large }
    staff(perPage: 6) { edges { role node { name { full } } } }
  }
}`;

/**
 * @param {{ fetch: typeof fetch }} env
 * @param {{ search?: string, anilistId?: number|null, malId?: number|null }} by
 */
export async function fetchMangaMetadata(env, by) {
  const variables = by.anilistId ? { id: by.anilistId } : by.malId ? { idMal: by.malId } : { search: by.search };
  const res = await env.fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: QUERY, variables }),
  });
  if (!res.ok) return null;
  const media = (await res.json())?.data?.Media;
  if (!media) return null;
  const staff = (role) =>
    media.staff.edges
      .filter((e) => new RegExp(role, "i").test(e.role))
      .map((e) => e.node.name.full)
      .join(", ");
  const d = media.startDate;
  return {
    anilistId: media.id,
    malId: media.idMal,
    title: media.title.english || media.title.romaji,
    romaji: media.title.romaji,
    native: media.title.native,
    description: (media.description ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim(),
    format: media.format,
    status: media.status,
    chapters: media.chapters,
    year: d?.year ?? null,
    startDate: d?.year ? [d.year, d.month ?? 1, d.day ?? 1].map((n, i) => String(n).padStart(i ? 2 : 4, "0")).join("-") : "",
    genres: media.genres ?? [],
    writer: staff("story"),
    artist: staff("art"),
    cover: media.coverImage.extraLarge || media.coverImage.large || "",
  };
}

const STATUS_MAL = { RELEASING: "Publishing", FINISHED: "Finished", HIATUS: "On Hiatus", CANCELLED: "Discontinued", NOT_YET_RELEASED: "Not yet published" };

/** Eski manga-scrapper'ın series.json biçimi (Komga/Kavita da okuyabiliyor) */
export function seriesJson(seriesName, meta) {
  return JSON.stringify(
    {
      mal_id: meta?.malId ?? null,
      anilist_id: meta?.anilistId ?? null,
      name: seriesName,
      description_formatted: meta?.description ?? "",
      type: meta?.format === "NOVEL" ? "Novel" : "Manga",
      status: STATUS_MAL[meta?.status] ?? "",
      year: meta?.startDate ?? "",
      ComicImage: meta?.cover ?? "",
      publisher: meta?.writer ?? "",
      total_issues: meta?.chapters ?? 0,
    },
    null,
    2
  );
}

const xml = (s) => String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]);

export function comicInfoXml({ seriesName, chapter, pageCount, meta, sourceName }) {
  const fields = {
    Title: chapter.title,
    Series: seriesName,
    Number: chapter.number ?? "",
    Count: meta?.chapters ?? "",
    Summary: meta?.description,
    Year: meta?.year ?? "",
    Writer: meta?.writer,
    Penciller: meta?.artist,
    Genre: meta?.genres?.join(", "),
    Web: chapter.url,
    PageCount: pageCount,
    LanguageISO: chapter.lang,
    Manga: "YesAndRightToLeft",
    ScanInformation: [...new Set([chapter.group, sourceName].filter(Boolean))].join(" / "),
    Notes: meta?.malId ? `MAL ${meta.malId}` : "",
  };
  const body = Object.entries(fields)
    .filter(([, v]) => v !== "" && v != null)
    .map(([k, v]) => `  <${k}>${xml(v)}</${k}>`)
    .join("\n");
  return `<?xml version="1.0" encoding="utf-8"?>\n<ComicInfo xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">\n${body}\n</ComicInfo>\n`;
}
