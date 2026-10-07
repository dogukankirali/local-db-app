// CBZ'lerin yazılacağı yer.
// - Yerel: tarayıcının İndirilenler klasörü altında Kiroku/Manga/<Seri>/ (geliştirme modu)
// - Sunucu: kullanıcının kendi sunucusu, WebDAV ile. Tarayıcı SSH/SFTP konuşamadığı için HTTP tabanlı
//   WebDAV kullanılır (ör. SFTPGo aynı klasörü hem SFTP hem WebDAV ile sunar).
// Sunucu bilgileri yalnızca bu tarayıcıda (chrome.storage.local) tutulur, Kiroku'ya gönderilmez.

export const STORAGE_KEY = "manga_storage";

export const DEFAULT_STORAGE = {
  mode: "auto", // auto: Kiroku adresi localhost ise yerel, değilse sunucu
  webdavUrl: "", // ör. https://nas.example.com/dav
  username: "",
  password: "",
  baseDir: "Manga", // WebDAV kökünün altındaki klasör
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

const isLocalhost = (url) => {
  try {
    return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname);
  } catch {
    return false;
  }
};

export function resolveMode(settings, serviceUrl) {
  if (settings.mode === "local" || settings.mode === "server") return settings.mode;
  return !serviceUrl || isLocalhost(serviceUrl) ? "local" : "server";
}

function localStorageTarget(settings) {
  const root = settings.localDir.split("/").map(safeName).join("/");
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
        // İndirme başlayınca blob'a ihtiyaç kalmaz; hemen silinirse Firefox yarıda kesebiliyor
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    },
  };
}

function webdavTarget(settings) {
  if (!settings.webdavUrl) throw new Error("Sunucu ayarları eksik: Manga İndirici → Kayıt yeri bölümünden WebDAV adresini girin.");
  const root = settings.webdavUrl.replace(/\/+$/, "");
  const auth = settings.username ? { Authorization: "Basic " + btoa(unescape(encodeURIComponent(`${settings.username}:${settings.password}`))) } : {};
  const enc = (path) => path.split("/").filter(Boolean).map((p) => encodeURIComponent(p)).join("/");
  const created = new Set();

  async function ensureDir(path) {
    let current = "";
    for (const part of path.split("/").filter(Boolean)) {
      current += `/${part}`;
      if (created.has(current)) continue;
      const res = await fetch(`${root}/${enc(current)}/`, { method: "MKCOL", headers: auth });
      // 201 oluşturuldu, 405 zaten var; 301/302 bazı sunucularda klasör var demek
      if (![201, 405, 301, 302].includes(res.status) && !res.ok) {
        throw new Error(`WebDAV klasör oluşturulamadı (${current}): HTTP ${res.status}`);
      }
      created.add(current);
    }
  }

  const base = settings.baseDir.split("/").filter(Boolean).map(safeName).join("/");
  return {
    label: `${root}/${base}`,
    async write(seriesDir, fileName, bytes, type = "application/octet-stream") {
      const dir = `${base}/${safeName(seriesDir)}`;
      await ensureDir(dir);
      const res = await fetch(`${root}/${enc(dir)}/${encodeURIComponent(safeName(fileName))}`, {
        method: "PUT",
        headers: { ...auth, "Content-Type": type },
        body: bytes,
      });
      if (!res.ok) throw new Error(`WebDAV yazılamadı (${fileName}): HTTP ${res.status}`);
    },
    async test() {
      const res = await fetch(`${root}/`, { method: "PROPFIND", headers: { ...auth, Depth: "0" } });
      if (res.status === 401) throw new Error("Kullanıcı adı ya da şifre hatalı (HTTP 401)");
      if (!res.ok && res.status !== 207) throw new Error(`Sunucu yanıtı: HTTP ${res.status}`);
      await ensureDir(base);
    },
  };
}

export function createStorage(settings, serviceUrl) {
  const mode = resolveMode(settings, serviceUrl);
  return { mode, ...(mode === "local" ? localStorageTarget(settings) : webdavTarget(settings)) };
}
