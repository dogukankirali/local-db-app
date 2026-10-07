// MangaDex through the Worker proxy (/api/mangadex/*). Chapter pages are read live from the MangaDex
// at-home server; nothing is copied to storage. <img> loads at-home URLs directly (no CORS needed for
// images); proxyImageUrl is the fallback when a host cannot be reached from the browser.

import axios from "axios";
import { API_BASE } from "../Services/http";
import type { MangaDexChapterInput } from "../Services/MangaService";

type Rel = { id: string; type: string; attributes?: Record<string, unknown> };
type MdManga = {
  id: string;
  attributes: {
    title: Record<string, string>;
    altTitles: Record<string, string>[];
    links: Record<string, string> | null;
    year: number | null;
    status: string;
    availableTranslatedLanguages: string[];
  };
  relationships: Rel[];
};
type MdChapter = {
  id: string;
  attributes: {
    chapter: string | null;
    volume: string | null;
    title: string | null;
    translatedLanguage: string;
    pages: number;
    externalUrl: string | null;
    publishAt: string;
  };
  relationships: Rel[];
};

export type MangaDexHit = {
  id: string;
  title: string;
  altTitles: string[];
  malId: number | null;
  year: number | null;
  status: string;
  languages: string[];
  cover: string;
};

export async function searchMangaDex(title: string, malId?: number): Promise<MangaDexHit[]> {
  const { data } = await axios.get<{ data: MdManga[] }>(`${API_BASE}/mangadex/search`, { params: { title } });
  const hits = data.data.map((m) => {
    const cover = m.relationships.find((r) => r.type === "cover_art")?.attributes?.fileName as string | undefined;
    const a = m.attributes;
    return {
      id: m.id,
      title: a.title.en ?? Object.values(a.title)[0] ?? "",
      altTitles: a.altTitles.flatMap((t) => Object.values(t)).slice(0, 4),
      malId: Number(a.links?.mal) || null,
      year: a.year,
      status: a.status,
      languages: a.availableTranslatedLanguages ?? [],
      cover: cover ? `https://uploads.mangadex.org/covers/${m.id}/${cover}.256.jpg` : "",
    };
  });
  // The entry whose MAL link matches the catalog's MAL id comes first
  return malId ? [...hits.filter((h) => h.malId === malId), ...hits.filter((h) => h.malId !== malId)] : hits;
}

/** Full chapter feed for the given languages (pages of 500); external-only chapters (no pages) are skipped */
export async function mangaDexChapters(mangadexId: string, langs: string[]): Promise<MangaDexChapterInput[]> {
  const out: MangaDexChapterInput[] = [];
  for (let offset = 0; offset < 10000; offset += 500) {
    const params = new URLSearchParams({ offset: String(offset) });
    langs.forEach((l) => params.append("lang", l));
    const { data } = await axios.get<{ data: MdChapter[]; total: number }>(`${API_BASE}/mangadex/manga/${mangadexId}/feed?${params}`);
    for (const ch of data.data) {
      const a = ch.attributes;
      if (a.externalUrl || !a.pages) continue;
      out.push({
        externalId: ch.id,
        number: Number(a.chapter) || 0,
        volume: a.volume ?? "",
        title: a.title ?? "",
        pageCount: a.pages,
        lang: a.translatedLanguage,
        groupName: (ch.relationships.find((r) => r.type === "scanlation_group")?.attributes?.name as string) ?? "",
        publishedAt: a.publishAt,
      });
    }
    if (offset + 500 >= data.total) break;
  }
  return out;
}

/** Page URLs of a MangaDex chapter from the at-home server (full quality or data saver) */
export async function mangaDexPages(chapterId: string, dataSaver = false): Promise<string[]> {
  const { data } = await axios.get<{ baseUrl: string; chapter: { hash: string; data: string[]; dataSaver: string[] } }>(
    `${API_BASE}/mangadex/at-home/${chapterId}`
  );
  const files = dataSaver ? data.chapter.dataSaver : data.chapter.data;
  return files.map((f) => `${data.baseUrl}/${dataSaver ? "data-saver" : "data"}/${data.chapter.hash}/${f}`);
}

export const proxyImageUrl = (url: string) => `${API_BASE}/mangadex/image?url=${encodeURIComponent(url)}`;
