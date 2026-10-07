// Resolves the page images of a chapter for the reader, whatever its source:
//   R2-backed chapters (CBZ upload or any adapter): fetched from the Worker with the auth header → blob URL
//   MangaDex chapters: at-home URLs loaded directly by <img>; if one fails (host blocked, CORS, hotlink),
//   that page is fetched through the Worker image proxy instead.

import axios from "axios";
import { ChapterService, type Chapter } from "../Services/MangaService";
import { mangaDexPages, proxyImageUrl } from "./mangadex";

export interface PageSource {
  count: number;
  /** Image URL for page i (0-based); cached */
  get(i: number): Promise<string>;
  /** Called when <img> fails for page i; returns a fallback URL or null */
  fallback(i: number): Promise<string | null>;
  /** Revokes created blob URLs */
  dispose(): void;
}

async function blobUrl(url: string) {
  const res = await axios.get<Blob>(url, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}

export async function pageSource(ch: Chapter): Promise<PageSource> {
  const cache = new Map<number, Promise<string>>();
  const blobs: string[] = [];
  const track = (p: Promise<string>) => {
    p.then((u) => u.startsWith("blob:") && blobs.push(u)).catch(() => {});
    return p;
  };
  const dispose = () => blobs.forEach((u) => URL.revokeObjectURL(u));

  if (ch.stored) {
    return {
      count: ch.pageCount,
      get(i) {
        if (!cache.has(i)) {
          const p = track(blobUrl(ChapterService.pageUrl(ch.id, i + 1)));
          p.catch(() => cache.delete(i));
          cache.set(i, p);
        }
        return cache.get(i)!;
      },
      fallback: async () => null,
      dispose,
    };
  }

  if (ch.source === "mangadex") {
    const urls = await mangaDexPages(ch.externalId);
    const fallbacks = new Map<number, Promise<string>>();
    return {
      count: urls.length,
      get: async (i) => urls[i],
      fallback(i) {
        if (!fallbacks.has(i)) fallbacks.set(i, track(blobUrl(proxyImageUrl(urls[i]))));
        return fallbacks.get(i)!.catch(() => null);
      },
      dispose,
    };
  }

  throw new Error(`Bu kaynaktan (${ch.source}) okunamıyor`);
}

/** Starts loading pages ahead so turning a page is instant */
export function preload(src: PageSource, from: number, n = 3) {
  for (let i = from; i < Math.min(src.count, from + n); i++) {
    src
      .get(i)
      .then((u) => {
        const img = new Image();
        img.decoding = "async";
        img.src = u;
      })
      .catch(() => {});
  }
}
