// CBZ handling in the browser (fflate): list the page images in natural order and read ComicInfo.xml.
// Pages are the original images from the archive; nothing is re-encoded.

import { unzip, type Unzipped } from "fflate";

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", bmp: "image/bmp" };
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export interface CbzContent {
  pages: { name: string; data: Uint8Array }[];
  comicInfo: Record<string, string>;
}

const unzipAsync = (buf: Uint8Array) =>
  new Promise<Unzipped>((resolve, reject) =>
    unzip(buf, { filter: (f) => !f.name.startsWith("__MACOSX/") && !f.name.split("/").pop()!.startsWith(".") }, (err, files) =>
      err ? reject(err) : resolve(files)
    )
  );

export async function openCbz(buf: ArrayBuffer): Promise<CbzContent> {
  const files = await unzipAsync(new Uint8Array(buf));
  const pages = Object.entries(files)
    .filter(([name, data]) => IMAGE_RE.test(name) && data.length > 0)
    .sort(([a], [b]) => collator.compare(a, b))
    .map(([name, data]) => ({ name, data }));
  const infoEntry = Object.entries(files).find(([name]) => name.split("/").pop()!.toLowerCase() === "comicinfo.xml");
  const comicInfo: Record<string, string> = {};
  if (infoEntry) {
    const doc = new DOMParser().parseFromString(new TextDecoder().decode(infoEntry[1]), "application/xml");
    for (const el of Array.from(doc.documentElement?.children ?? [])) comicInfo[el.tagName] = el.textContent ?? "";
  }
  return { pages, comicInfo };
}

export const pageBlob = (p: { name: string; data: Uint8Array }) =>
  new Blob([p.data as BlobPart], { type: MIME[p.name.split(".").pop()!.toLowerCase()] ?? "application/octet-stream" });
