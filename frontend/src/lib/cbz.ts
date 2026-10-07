// CBZ → WebP pages in the browser: unzip with fflate, sort images in natural order, re-encode each page
// with a canvas. The Worker only stores the resulting WebP files in R2.

import { unzipSync } from "fflate";

const IMAGE_RE = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function readCbz(buf: ArrayBuffer): { name: string; data: Uint8Array }[] {
  const files = unzipSync(new Uint8Array(buf), {
    filter: (f) => IMAGE_RE.test(f.name) && !f.name.startsWith("__MACOSX/") && !f.name.split("/").pop()!.startsWith("."),
  });
  return Object.entries(files)
    .filter(([, data]) => data.length > 0)
    .sort(([a], [b]) => collator.compare(a, b))
    .map(([name, data]) => ({ name, data }));
}

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", avif: "image/avif", bmp: "image/bmp" };

/** Re-encodes one image as WebP; very tall/wide pages are scaled down to the canvas limits */
export async function toWebp(name: string, data: Uint8Array, quality = 0.85, maxSide = 16000): Promise<Blob> {
  const ext = name.split(".").pop()!.toLowerCase();
  const bitmap = await createImageBitmap(new Blob([data as BlobPart], { type: MIME[ext] ?? "application/octet-stream" }));
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  if (!blob || blob.type !== "image/webp") throw new Error("Tarayıcı WebP üretemedi");
  return blob;
}
