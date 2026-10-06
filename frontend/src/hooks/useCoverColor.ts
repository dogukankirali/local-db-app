"use client";

import { useEffect, useState } from "react";

// Kapak görselinin baskın rengini "r, g, b" olarak döner (ör. `rgba(${rgb}, 0.35)` ile kullanılır).
// Görsel küçük bir canvas'a çizilip doygun pikseller daha ağır sayılarak ortalanır; böylece gri
// arka planlar yerine kapağın asıl tonu çıkar. CORS izni olmayan görsellerde (canvas "tainted")
// ya da yükleme hatasında null döner; çağıran taraf varsayılan renge düşmeli.

const cache = new Map<string, string | null>();
const SIZE = 24;

function extract(img: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, SIZE, SIZE).data;
  } catch {
    return null;
  }
  let r = 0, g = 0, b = 0, total = 0;
  for (let i = 0; i < data.length; i += 4) {
    const pr = data[i], pg = data[i + 1], pb = data[i + 2];
    const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
    // Doygunluk ağırlığı; çok karanlık ve çok açık pikseller neredeyse sayılmaz
    const sat = max === 0 ? 0 : (max - min) / max;
    const w = 0.05 + sat * sat * (max > 30 && min < 235 ? 1 : 0.1);
    r += pr * w;
    g += pg * w;
    b += pb * w;
    total += w;
  }
  if (!total) return null;
  // Koyu temada parıltı olarak görünsün diye çok karanlık sonuçlar biraz açılır
  const scale = Math.max(1, 110 / Math.max(r / total, g / total, b / total, 1));
  const c = (v: number) => Math.min(255, Math.round((v / total) * scale));
  return `${c(r)}, ${c(g)}, ${c(b)}`;
}

export function useCoverColor(src: string | null | undefined): string | null {
  const [rgb, setRgb] = useState<string | null>(() => (src ? cache.get(src) ?? null : null));

  useEffect(() => {
    if (!src) {
      setRgb(null);
      return;
    }
    if (cache.has(src)) {
      setRgb(cache.get(src) ?? null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.onload = () => {
      const value = extract(img);
      cache.set(src, value);
      if (!cancelled) setRgb(value);
    };
    img.onerror = () => {
      cache.set(src, null);
      if (!cancelled) setRgb(null);
    };
    img.src = src;
    return () => {
      cancelled = true;
    };
  }, [src]);

  return rgb;
}
