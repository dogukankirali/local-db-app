// The user's own manga library (outside Kiroku). Chapters registered in Kiroku carry a file path relative to
// the library root: '<Series Name>/<Chapter N - Title>.cbz'. The browser opens the CBZ directly from:
//   webdav — a WebDAV base URL (+ optional Basic auth user/password), configured per browser in localStorage.
//            The server must allow CORS from the Kiroku origin (Authorization header, GET).
//   local  — development / offline: a folder picked with the File System Access API (kept for this tab only),
//            or a single CBZ picked with <input type=file> in the reader.
// Credentials never leave the browser and are never sent to the Kiroku Worker.

export type LibraryConfig = { kind: "webdav" | "local"; url: string; username: string; password: string };

const KEY = "kirokuMangaLibrary";
const DEFAULT: LibraryConfig = { kind: "webdav", url: "", username: "", password: "" };

export function loadLibrary(): LibraryConfig {
  try {
    return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULT;
  }
}

export function saveLibrary(cfg: LibraryConfig) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg));
  } catch {}
}

/** '<Series>/<Chapter N - Title>.cbz' with characters that are unsafe in file names replaced */
export function libraryPath(series: string, number: number, title?: string) {
  const seg = (s: string) =>
    s.normalize("NFC").replace(/[\u0000-\u001f<>:"/\\|?*]+/g, " ").replace(/\s+/g, " ").trim().replace(/^\.+/, "").replace(/[. ]+$/, "").slice(0, 120) || "untitled";
  return `${seg(series)}/${seg(`Chapter ${number}${title ? ` - ${title}` : ""}`)}.cbz`;
}

// ---- Local folder (File System Access API) ----

type DirHandle = FileSystemDirectoryHandle & { getDirectoryHandle(n: string): Promise<DirHandle> };
let localRoot: DirHandle | null = null;

export const canPickFolder = () => typeof window !== "undefined" && "showDirectoryPicker" in window;
export const localFolderName = () => localRoot?.name ?? "";

export async function pickLocalFolder() {
  const picker = (window as unknown as { showDirectoryPicker: (o?: object) => Promise<DirHandle> }).showDirectoryPicker;
  localRoot = await picker({ id: "kiroku-manga", mode: "read" });
  return localRoot.name;
}

async function readLocal(path: string): Promise<ArrayBuffer> {
  if (!localRoot) throw new LibraryError("Yerel kütüphane klasörü seçilmedi", "pick");
  const parts = path.split("/");
  let dir = localRoot;
  try {
    for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
    const file = await (await dir.getFileHandle(parts[parts.length - 1])).getFile();
    return await file.arrayBuffer();
  } catch {
    throw new LibraryError(`Dosya seçilen klasörde bulunamadı: ${path}`, "missing");
  }
}

// ---- WebDAV ----

const davUrl = (cfg: LibraryConfig, path: string) =>
  `${cfg.url.replace(/\/+$/, "")}/${path.split("/").filter(Boolean).map(encodeURIComponent).join("/")}`;

function davHeaders(cfg: LibraryConfig): Record<string, string> {
  return cfg.username ? { Authorization: `Basic ${btoa(unescape(encodeURIComponent(`${cfg.username}:${cfg.password}`)))}` } : {};
}

async function readWebdav(cfg: LibraryConfig, path: string): Promise<ArrayBuffer> {
  if (!cfg.url) throw new LibraryError("Kütüphane adresi (WebDAV) ayarlanmadı", "config");
  let res: Response;
  try {
    res = await fetch(davUrl(cfg, path), { headers: davHeaders(cfg), credentials: "omit" });
  } catch {
    throw new LibraryError("Kütüphane sunucusuna ulaşılamadı (adres ya da CORS ayarı)", "config");
  }
  if (res.status === 401 || res.status === 403) throw new LibraryError("Kütüphane sunucusu girişi reddetti", "config");
  if (res.status === 404) throw new LibraryError(`Dosya bulunamadı: ${path}`, "missing");
  if (!res.ok) throw new LibraryError(`Kütüphane sunucusu hatası (${res.status})`, "config");
  return res.arrayBuffer();
}

export class LibraryError extends Error {
  constructor(message: string, readonly kind: "config" | "pick" | "missing") {
    super(message);
  }
}

/** Reads a library CBZ: from the folder picked in this tab if any, else per the browser's library settings */
export function readLibraryFile(path: string): Promise<ArrayBuffer> {
  const cfg = loadLibrary();
  return cfg.kind === "local" || localRoot ? readLocal(path) : readWebdav(cfg, path);
}

// ---- Listing (library sync) ----

export type LibraryEntry = { name: string; isDir: boolean };
export type LibrarySeries = { series: string; files: string[] };

/** PROPFIND Depth: 1 on a folder (path relative to the library root) */
async function listWebdav(cfg: LibraryConfig, path: string): Promise<LibraryEntry[]> {
  if (!cfg.url) throw new LibraryError("Kütüphane adresi (WebDAV) ayarlanmadı", "config");
  const url = davUrl(cfg, path).replace(/\/?$/, "/");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "PROPFIND",
      headers: { ...davHeaders(cfg), Depth: "1", "Content-Type": "application/xml" },
      body: '<?xml version="1.0"?><d:propfind xmlns:d="DAV:"><d:prop><d:resourcetype/></d:prop></d:propfind>',
      credentials: "omit",
    });
  } catch {
    throw new LibraryError("Kütüphane sunucusuna ulaşılamadı (adres ya da CORS ayarı: PROPFIND, Depth ve Authorization izinli olmalı)", "config");
  }
  if (res.status === 401 || res.status === 403) throw new LibraryError("Kütüphane sunucusu girişi reddetti", "config");
  if (res.status !== 207 && !res.ok) throw new LibraryError(`Kütüphane listelenemedi (${res.status})`, "config");
  const doc = new DOMParser().parseFromString(await res.text(), "application/xml");
  const self = decodeURIComponent(new URL(url).pathname).replace(/\/+$/, "");
  const out: LibraryEntry[] = [];
  for (const r of Array.from(doc.getElementsByTagNameNS("DAV:", "response"))) {
    const href = r.getElementsByTagNameNS("DAV:", "href")[0]?.textContent ?? "";
    const hrefPath = decodeURIComponent(new URL(href, url).pathname).replace(/\/+$/, "");
    if (hrefPath === self) continue;
    const name = hrefPath.split("/").pop() ?? "";
    if (!name || name.startsWith(".")) continue;
    out.push({ name: name.normalize("NFC"), isDir: r.getElementsByTagNameNS("DAV:", "collection").length > 0 });
  }
  return out;
}

async function listLocal(path: string): Promise<LibraryEntry[]> {
  if (!localRoot) throw new LibraryError("Yerel kütüphane klasörü seçilmedi", "pick");
  let dir = localRoot;
  for (const p of path.split("/").filter(Boolean)) dir = await dir.getDirectoryHandle(p);
  const out: LibraryEntry[] = [];
  for await (const h of (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
    if (!h.name.startsWith(".")) out.push({ name: h.name.normalize("NFC"), isDir: h.kind === "directory" });
  }
  return out;
}

/** Series folders in the library root with the *.cbz files directly inside each */
export async function listLibrary(onSeries?: (done: number, total: number) => void): Promise<LibrarySeries[]> {
  const cfg = loadLibrary();
  const list = cfg.kind === "local" || localRoot ? listLocal : (p: string) => listWebdav(cfg, p);
  const folders = (await list("")).filter((e) => e.isDir);
  const out: LibrarySeries[] = [];
  for (const [i, f] of folders.entries()) {
    const files = (await list(f.name)).filter((e) => !e.isDir && /\.cbz$/i.test(e.name)).map((e) => `${f.name}/${e.name}`);
    out.push({ series: f.name, files });
    onSeries?.(i + 1, folders.length);
  }
  return out;
}

/** Chapter number and title from a file name: 'Bölüm 12 - Title.cbz', 'Chapter 12.5.cbz', 'Series 012.cbz' */
export function parseChapterFile(fileName: string): { number: number; title: string } {
  const base = fileName.split("/").pop()!.replace(/\.cbz$/i, "").trim();
  const m =
    /(?:b[öo]l[üu]m|chapter|chap|ch\.?|ep\.?)\s*#?\s*(\d+(?:[.,]\d+)?)/i.exec(base) ?? /(\d+(?:[.,]\d+)?)(?!.*\d)/.exec(base);
  if (!m) return { number: 0, title: base };
  const number = Number(m[1].replace(",", "."));
  const after = base.slice(m.index + m[0].length).replace(/^[\s\-–—:._]+/, "").trim();
  return { number: Number.isFinite(number) ? number : 0, title: after };
}
