// Kiroku eklentisinden açık anime sekmelerini (Anizium, TRanimeizle, TürkAnime, MAL, AniList) ister.
// Eklenti Kiroku sayfasına içerik betiğiyle bağlanır; yüklü değilse null döner.

import { parseNotes } from "./quickNotes";

export type OpenTab = { url: string; title: string };


export function requestOpenTabs(timeoutMs = 2500): Promise<OpenTab[] | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  const id = Math.random().toString(36).slice(2);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      const msg = event.data;
      if (event.source !== window || !msg || msg.source !== "kiroku-extension" || msg.type !== "OPEN_TABS" || msg.id !== id) return;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(Array.isArray(msg.tabs) ? msg.tabs : []);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "kiroku-page", type: "GET_OPEN_TABS", id }, window.location.origin);
  });
}

// Sekme başlığından site adı ve "izle", "x. bölüm" gibi ekleri temizler
function cleanTitle(title: string) {
  return title
    .split(/\s+[|–—-]\s+/)[0]
    .replace(/\b\d+\s*\.?\s*b[öo]l[üu]m\b.*$/i, "")
    .replace(/\b(t[üu]rk[çc]e\s+altyaz[ıi]l[ıi]|izle|episode\s+\d+)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sekmeleri not satırlarına çevirir: linkten isim çıkarılabiliyorsa link, yoksa sekme başlığı. Aynı satırlar birleşir. */
export function tabsToNoteLines(tabs: OpenTab[]): string[] {
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const tab of tabs) {
    const fromUrl = parseNotes(tab.url)[0];
    const usable = fromUrl && !fromUrl.error && (fromUrl.malId || fromUrl.anilistId || fromUrl.name.length > 1);
    const title = cleanTitle(tab.title);
    // İsim linkten çıkmıyorsa sekme başlığı kullanılır ama izleme linki satırda kalır (içe aktarınca "İzleme linki" dolsun)
    const line = usable ? tab.url : title && /^https?:\/\//i.test(tab.url) ? `${title} ${tab.url}` : title;
    const key = usable ? `${fromUrl.malId ?? ""}|${fromUrl.anilistId ?? ""}|${fromUrl.name}|${fromUrl.season ?? ""}` : title.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    lines.push(line);
  }
  return lines;
}
