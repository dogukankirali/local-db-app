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
  for (const p of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(p);
  const file = await (await dir.getFileHandle(parts[parts.length - 1])).getFile();
  return file.arrayBuffer();
}

// ---- WebDAV ----

async function readWebdav(cfg: LibraryConfig, path: string): Promise<ArrayBuffer> {
  if (!cfg.url) throw new LibraryError("Kütüphane adresi (WebDAV) ayarlanmadı", "config");
  const url = `${cfg.url.replace(/\/+$/, "")}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const headers: Record<string, string> = {};
  if (cfg.username) headers.Authorization = `Basic ${btoa(unescape(encodeURIComponent(`${cfg.username}:${cfg.password}`)))}`;
  let res: Response;
  try {
    res = await fetch(url, { headers, credentials: "omit" });
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

/** Reads a library CBZ using the browser's library settings */
export function readLibraryFile(path: string): Promise<ArrayBuffer> {
  const cfg = loadLibrary();
  return cfg.kind === "local" ? readLocal(path) : readWebdav(cfg, path);
}
