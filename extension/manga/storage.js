// CBZ'ler doğrudan bu bilgisayara, tarayıcının İndirilenler klasörü altına (varsayılan Kiroku/Manga/<Seri>/)
// yazılır. Arada hiçbir sunucuya gönderilmez ve hiçbir yerde kopyası tutulmaz; dosyaları sunucuya
// kullanıcı kendisi taşır.

export const STORAGE_KEY = "manga_storage";

export const DEFAULT_STORAGE = {
  localDir: "Kiroku/Manga", // İndirilenler altındaki klasör
};

/** Dosya/klasör adında işletim sistemlerinin kabul etmediği karakterleri temizler */
export function safeName(name) {
  return (
    String(name ?? "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/, "")
      .slice(0, 150) || "isimsiz"
  );
}

export function createStorage(settings) {
  const root = (settings.localDir || DEFAULT_STORAGE.localDir).split("/").filter(Boolean).map(safeName).join("/");
  return {
    label: `İndirilenler/${root}`,
    async write(seriesDir, fileName, bytes, type = "application/octet-stream") {
      const url = URL.createObjectURL(new Blob([bytes], { type }));
      try {
        await new Promise((resolve, reject) => {
          chrome.downloads.download(
            { url, filename: `${root}/${safeName(seriesDir)}/${safeName(fileName)}`, conflictAction: "overwrite", saveAs: false },
            (id) => (chrome.runtime.lastError || id === undefined ? reject(new Error(chrome.runtime.lastError?.message ?? "İndirme başlatılamadı")) : resolve(id))
          );
        });
      } finally {
        // Blob yalnızca bellekte; indirme başlayınca bırakılır (hemen bırakılırsa Firefox yarıda kesebiliyor)
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    },
  };
}
