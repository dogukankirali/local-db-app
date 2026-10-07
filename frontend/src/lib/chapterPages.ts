// Resolves the page images of a chapter for the reader, whatever its source:
//   Library chapters (file_path): the original CBZ is read from the user's own library (WebDAV / local folder,
//   lib/library.ts) or from a file picked in the reader, unzipped with fflate, pages shown as blob URLs
//   MangaDex chapters: at-home URLs loaded directly by <img>; if one fails (host blocked, CORS, hotlink),
//   that page is fetched through the Worker image proxy instead.

import axios from "axios";
import type { Chapter } from "../Services/MangaService";
import { openCbz, pageBlob } from "./cbz";
import { readLibraryFile } from "./library";
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

/** Pages of an opened CBZ (the whole archive is in memory; blob URLs are created on demand) */
export async function cbzSource(buf: ArrayBuffer): Promise<PageSource> {
  const { pages } = await openCbz(buf);
  if (!pages.length) throw new Error("CBZ içinde sayfa yok");
  const urls = new Map<number, string>();
  return {
    count: pages.length,
    get: async (i) => {
      if (!urls.has(i)) urls.set(i, URL.createObjectURL(pageBlob(pages[i])));
      return urls.get(i)!;
    },
    fallback: async () => null,
    dispose: () => urls.forEach((u) => URL.revokeObjectURL(u)),
  };
}

export async function pageSource(ch: Chapter): Promise<PageSource> {
  const blobs: string[] = [];
  const track = (p: Promise<string>) => {
    p.then((u) => u.startsWith("blob:") && blobs.push(u)).catch(() => {});
    return p;
  };
  const dispose = () => blobs.forEach((u) => URL.revokeObjectURL(u));

  if (ch.filePath) return cbzSource(await readLibraryFile(ch.filePath));

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
