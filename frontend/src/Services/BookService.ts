import axios from "axios";
import { API_BASE } from "./http";

// Books (/api/books). Details come from two free sources: Google Books through the Worker (needs the free
// GOOGLE_BOOKS_API_KEY there; best coverage for Turkish books) and Open Library straight from the browser
// (no key at all).

export type BookReadStatus = "" | "READING" | "COMPLETED" | "PAUSED" | "DROPPED" | "PLANNING";

export interface Book {
  id: number;
  title: string;
  subtitle: string;
  authors: string[];
  publisher: string;
  publishedDate: string;
  pageCount: number;
  isbn: string;
  language: string;
  genres: string[];
  description: string;
  cover: string;
  googleId: string;
  openLibraryKey: string;
  googleLink: string;
  openLibraryLink: string;
  score: number;
  readStatus: BookReadStatus;
  pagesRead: number;
  planToRead: boolean;
  notes: string;
  startedAt: string;
  finishedAt: string;
  inMyList: boolean;
}

export type BookInput = Partial<Omit<Book, "id" | "googleLink" | "openLibraryLink" | "inMyList">>;

export interface BookQuery {
  q?: string;
  readStatus?: string;
  language?: string;
  genres?: string[];
  ptr?: boolean;
  mine?: boolean;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  count?: number;
}

export interface BookPage {
  data: Book[];
  pagination: { page: number; count: number; total: number; pages: number };
}

/** A search hit from either source, already mapped to catalog fields */
export type BookHit = BookInput & { source: "google" | "openlibrary"; title: string };

const base = `${API_BASE}/books`;

export const BookService = {
  async list(q: BookQuery): Promise<BookPage> {
    const p = new URLSearchParams();
    if (q.q) p.set("q", q.q);
    if (q.readStatus) p.set("read-status", q.readStatus);
    if (q.language) p.set("language", q.language);
    for (const g of q.genres ?? []) p.append("genre", g);
    if (q.ptr) p.set("ptr", "1");
    if (q.mine) p.set("mine", "1");
    if (q.sort) p.set("sort", q.sort);
    if (q.order) p.set("order", q.order);
    p.set("page", String(q.page ?? 1));
    p.set("count", String(q.count ?? 48));
    return (await axios.get<BookPage>(`${base}?${p}`)).data;
  },
  async get(id: number): Promise<Book> {
    return (await axios.get<Book>(`${base}/${id}`)).data;
  },
  async genres(): Promise<string[]> {
    return (await axios.get<string[]>(`${base}/genres`)).data;
  },
  async create(data: BookInput): Promise<Book> {
    return (await axios.post<Book>(base, data)).data;
  },
  async update(id: number, data: BookInput): Promise<Book> {
    return (await axios.put<Book>(`${base}/${id}`, data)).data;
  },
  async removeFromMine(id: number) {
    await axios.delete(`${base}/${id}/mine`);
  },
  async remove(id: number) {
    await axios.delete(`${base}/${id}`);
  },
};

// ------------------------------ Metadata ------------------------------

const OL_LANG: Record<string, string> = { tur: "tr", eng: "en", ger: "de", fre: "fr", spa: "es", ita: "it", rus: "ru", jpn: "ja", ara: "ar", per: "fa" };

type OlDoc = {
  key: string;
  title: string;
  subtitle?: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  number_of_pages_median?: number;
  isbn?: string[];
  language?: string[];
  subject?: string[];
  cover_i?: number;
};

const isIsbn = (q: string) => /^\d{9}[\dXx]$|^\d{13}$/.test(q.replace(/[-\s]/g, ""));

function fromOpenLibrary(d: OlDoc): BookHit {
  const lang = d.language?.includes("tur") ? "tur" : d.language?.[0];
  return {
    source: "openlibrary",
    openLibraryKey: d.key,
    title: d.title,
    subtitle: d.subtitle ?? "",
    authors: d.author_name ?? [],
    publisher: d.publisher?.[0] ?? "",
    publishedDate: d.first_publish_year ? String(d.first_publish_year) : "",
    pageCount: d.number_of_pages_median ?? 0,
    isbn: d.isbn?.find((i) => i.length === 13) ?? d.isbn?.[0] ?? "",
    language: lang ? (OL_LANG[lang] ?? lang) : "",
    genres: (d.subject ?? []).slice(0, 5),
    cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : "",
  };
}

export async function searchOpenLibrary(q: string, signal?: AbortSignal): Promise<BookHit[]> {
  const p = new URLSearchParams({
    fields: "key,title,subtitle,author_name,first_publish_year,publisher,number_of_pages_median,isbn,language,subject,cover_i",
    limit: "15",
  });
  p.set(isIsbn(q) ? "isbn" : "q", isIsbn(q) ? q.replace(/[-\s]/g, "") : q);
  const res = await fetch(`https://openlibrary.org/search.json?${p}`, { signal });
  if (!res.ok) throw new Error(`Open Library yanıt vermedi (${res.status})`);
  return ((await res.json()).docs as OlDoc[]).map(fromOpenLibrary);
}

/** Work description from Open Library (the search results don't include it) */
export async function openLibraryDescription(key: string): Promise<string> {
  try {
    const res = await fetch(`https://openlibrary.org${key}.json`);
    if (!res.ok) return "";
    const d = (await res.json()).description;
    return (typeof d === "string" ? d : (d?.value ?? "")).trim();
  } catch {
    return "";
  }
}

export async function searchGoogleBooks(q: string, signal?: AbortSignal): Promise<BookHit[]> {
  return (await axios.get<BookHit[]>(`${API_BASE}/google-books/search`, { params: { q }, signal })).data;
}

export const errorText = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error)?.message ?? "Bilinmeyen hata";
