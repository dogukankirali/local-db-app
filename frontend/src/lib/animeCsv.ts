// Anime dışa/içe aktarma: CSV/XLSX export ile CSV import aynı sütunları kullanır,
// böylece dışa aktarılan dosya düzenlenip tekrar içe aktarılabilir.

export type AnimeRow = Record<string, any>;

type Column = {
  key: string; // API alan adı
  header: string; // dosyadaki başlık
  aliases?: string[]; // içe aktarırken kabul edilen diğer başlıklar
  kind: "text" | "int" | "float" | "bool" | "list";
};

export const ANIME_COLUMNS: Column[] = [
  { key: "Name", header: "Name", aliases: ["İsim", "Isim", "Ad"], kind: "text" },
  { key: "AnimeStatus", header: "AnimeStatus", aliases: ["Durum", "Status"], kind: "text" },
  { key: "WatchStatus", header: "WatchStatus", aliases: ["İzlenen", "Izlenen", "Watched"], kind: "int" },
  { key: "TotalNumberOfEpisodes", header: "TotalNumberOfEpisodes", aliases: ["Bölüm", "Bolum", "Episodes"], kind: "int" },
  { key: "IsMovie", header: "IsMovie", aliases: ["Film", "Movie"], kind: "bool" },
  { key: "Score", header: "Score", aliases: ["Puan"], kind: "float" },
  { key: "MALScore", header: "MALScore", aliases: ["MAL Puanı", "MAL"], kind: "float" },
  { key: "Genre", header: "Genre", aliases: ["Türler", "Turler", "Genres"], kind: "list" },
  { key: "SeriesName", header: "Series", aliases: ["Seri", "SeriesName"], kind: "text" },
  { key: "PlanToWatch", header: "PlanToWatch", aliases: ["Watchlist", "PTW"], kind: "bool" },
  { key: "AnimeLink", header: "AnimeLink", aliases: ["İzleme linki", "Watch Link"], kind: "text" },
  { key: "MALAnimeLink", header: "MALAnimeLink", aliases: ["MAL linki", "MAL Page"], kind: "text" },
  { key: "Cover", header: "Cover", aliases: ["Kapak"], kind: "text" },
  { key: "Notes", header: "Notes", aliases: ["Notlar", "Not"], kind: "text" },
];

// Dosyada tür listesi ";" ile ayrılır (CSV'nin virgülüyle karışmasın); API "a, b" bekler
const LIST_SEPARATOR = "; ";

export function exportValue(anime: AnimeRow, col: Column): string | number | boolean {
  const v = anime[col.key];
  switch (col.kind) {
    case "list":
      return String(v ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(LIST_SEPARATOR);
    case "bool":
      return Boolean(v);
    case "int":
    case "float":
      return v === "" || v == null ? 0 : Number(v);
    default:
      // base64 kapakları dosyaya gömmek satırları anlamsız uzatır; API adresi yeterli
      return typeof v === "string" && v.startsWith("data:") ? "" : String(v ?? "");
  }
}

function csvCell(v: string | number | boolean): string {
  const s = typeof v === "boolean" ? (v ? "true" : "false") : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function animesToCsv(rows: AnimeRow[]): string {
  const lines = [ANIME_COLUMNS.map((c) => c.header).join(",")];
  for (const r of rows) lines.push(ANIME_COLUMNS.map((c) => csvCell(exportValue(r, c))).join(","));
  // BOM: Excel UTF-8'i (Türkçe karakterleri) doğru açsın
  return "﻿" + lines.join("\r\n");
}

export const CSV_TEMPLATE_ROWS: AnimeRow[] = [
  {
    Name: "Sousou no Frieren",
    AnimeStatus: "Finished",
    WatchStatus: 28,
    TotalNumberOfEpisodes: 28,
    IsMovie: false,
    Score: 95,
    MALScore: 9.3,
    Genre: "Adventure, Drama, Fantasy",
    SeriesName: "Sousou no Frieren",
    PlanToWatch: false,
    AnimeLink: "",
    MALAnimeLink: "https://myanimelist.net/anime/52991",
    Cover: "",
    Notes: "Örnek satır: tamamlanmış bir dizi",
  },
  {
    Name: "Kimi no Na wa.",
    AnimeStatus: "Finished",
    WatchStatus: 0,
    TotalNumberOfEpisodes: 1,
    IsMovie: true,
    Score: 0,
    MALScore: 8.8,
    Genre: "Romance, Drama",
    SeriesName: "",
    PlanToWatch: true,
    AnimeLink: "",
    MALAnimeLink: "https://myanimelist.net/anime/32281",
    Cover: "",
    Notes: "Örnek satır: izlenecek film (Watchlist'e girer)",
  },
];

export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  // Excel bazı bölgelerde ";" ile kaydeder: başlık satırına bakıp ayracı seç
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

const norm = (s: string) => s.trim().toLocaleLowerCase("tr").replace(/\s+/g, "");

export type ParsedImport = { rows: AnimeRow[]; errors: string[]; unknownHeaders: string[] };

/** Başlık satırlı CSV'yi API'nin beklediği anime nesnelerine çevirir */
export function csvToAnimes(text: string): ParsedImport {
  const table = parseCsvText(text);
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: ["Dosyada başlık satırı ve en az bir anime satırı olmalı."], unknownHeaders: [] };

  const headers = table[0].map(norm);
  const colIndex = new Map<string, number>();
  const unknownHeaders: string[] = [];
  headers.forEach((h, i) => {
    const col = ANIME_COLUMNS.find((c) => [c.header, c.key, ...(c.aliases ?? [])].some((a) => norm(a) === h));
    if (col) colIndex.set(col.key, i);
    else if (h) unknownHeaders.push(table[0][i]);
  });
  if (!colIndex.has("Name")) return { rows: [], errors: ['"Name" sütunu bulunamadı. Örnek şablonu kullanın.'], unknownHeaders };

  const rows: AnimeRow[] = [];
  table.slice(1).forEach((cells, idx) => {
    const line = idx + 2;
    const anime: AnimeRow = {};
    for (const col of ANIME_COLUMNS) {
      const i = colIndex.get(col.key);
      const raw = i === undefined ? "" : (cells[i] ?? "").trim();
      switch (col.kind) {
        case "int": {
          const n = raw === "" ? 0 : parseInt(raw, 10);
          if (Number.isNaN(n)) errors.push(`${line}. satır: ${col.header} sayı olmalı ("${raw}")`);
          anime[col.key] = Number.isNaN(n) ? 0 : n;
          break;
        }
        case "float": {
          const n = raw === "" ? 0 : Number(raw.replace(",", "."));
          if (Number.isNaN(n)) errors.push(`${line}. satır: ${col.header} sayı olmalı ("${raw}")`);
          anime[col.key] = Number.isNaN(n) ? 0 : n;
          break;
        }
        case "bool":
          anime[col.key] = ["true", "1", "evet", "yes", "x"].includes(raw.toLocaleLowerCase("tr"));
          break;
        case "list":
          anime[col.key] = raw
            .split(/[;|]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .join(", ");
          break;
        default:
          anime[col.key] = raw;
      }
    }
    if (!anime.Name) {
      errors.push(`${line}. satır: Name boş, atlandı`);
      return;
    }
    rows.push(anime);
  });
  return { rows, errors, unknownHeaders };
}

/** Tarayıcıda dosya indirir (Blob + geçici bağlantı) */
export function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
