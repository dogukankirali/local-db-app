import axios from "axios";
import { API_BASE } from "./http";

// TV series and movies share one API shape (/api/series and /api/movies); details come from IMDb via OMDb.

export type ScreenKind = "series" | "movie";
export type WatchStatus = "" | "WATCHING" | "COMPLETED" | "PAUSED" | "DROPPED" | "PLANNING";

export interface ScreenTitle {
  id: number;
  kind: ScreenKind;
  name: string;
  originalName: string;
  year: string;
  status: string;
  totalSeasons: number;
  totalEpisodes: number;
  runtime: string;
  genres: string[];
  director: string;
  actors: string;
  plot: string;
  cover: string;
  imdbId: string;
  imdbRating: number;
  imdbLink: string;
  syncedAt: string;
  score: number;
  watchStatus: WatchStatus;
  episodesWatched: number;
  planToWatch: boolean;
  notes: string;
  startedAt: string;
  finishedAt: string;
  inMyList: boolean;
}

export type ScreenInput = Partial<Omit<ScreenTitle, "id" | "kind" | "imdbLink" | "syncedAt" | "inMyList">>;

export interface ScreenQuery {
  q?: string;
  status?: string;
  watchStatus?: string;
  genres?: string[];
  ptw?: boolean;
  mine?: boolean;
  sort?: string;
  order?: "asc" | "desc";
  page?: number;
  count?: number;
}

export interface ScreenPage {
  data: ScreenTitle[];
  pagination: { page: number; count: number; total: number; pages: number };
}

export interface ImdbHit {
  imdbId: string;
  name: string;
  year: string;
  cover: string;
  kind: ScreenKind;
}

const pathOf = (kind: ScreenKind) => `${API_BASE}/${kind === "series" ? "series" : "movies"}`;

export const ScreenService = {
  async list(kind: ScreenKind, q: ScreenQuery): Promise<ScreenPage> {
    const p = new URLSearchParams();
    if (q.q) p.set("q", q.q);
    if (q.status) p.set("status", q.status);
    if (q.watchStatus) p.set("watch-status", q.watchStatus);
    for (const g of q.genres ?? []) p.append("genre", g);
    if (q.ptw) p.set("ptw", "1");
    if (q.mine) p.set("mine", "1");
    if (q.sort) p.set("sort", q.sort);
    if (q.order) p.set("order", q.order);
    p.set("page", String(q.page ?? 1));
    p.set("count", String(q.count ?? 48));
    return (await axios.get<ScreenPage>(`${pathOf(kind)}?${p}`)).data;
  },
  async get(kind: ScreenKind, id: number): Promise<ScreenTitle> {
    return (await axios.get<ScreenTitle>(`${pathOf(kind)}/${id}`)).data;
  },
  async genres(kind: ScreenKind): Promise<string[]> {
    return (await axios.get<string[]>(`${pathOf(kind)}/genres`)).data;
  },
  async create(kind: ScreenKind, data: ScreenInput): Promise<ScreenTitle> {
    return (await axios.post<ScreenTitle>(pathOf(kind), data)).data;
  },
  async update(kind: ScreenKind, id: number, data: ScreenInput): Promise<ScreenTitle> {
    return (await axios.put<ScreenTitle>(`${pathOf(kind)}/${id}`, data)).data;
  },
  async removeFromMine(kind: ScreenKind, id: number) {
    await axios.delete(`${pathOf(kind)}/${id}/mine`);
  },
  async remove(kind: ScreenKind, id: number) {
    await axios.delete(`${pathOf(kind)}/${id}`);
  },
  imdb: {
    async search(kind: ScreenKind, q: string, signal?: AbortSignal): Promise<ImdbHit[]> {
      return (await axios.get<ImdbHit[]>(`${API_BASE}/imdb/search`, { params: { q, type: kind }, signal })).data;
    },
    /** Full IMDb details mapped to catalog fields */
    async details(imdbId: string): Promise<ScreenInput & { kind: ScreenKind }> {
      return (await axios.get(`${API_BASE}/imdb/${imdbId}`)).data;
    },
  },
};

export const errorText = (e: unknown) =>
  (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error)?.message ?? "Bilinmeyen hata";
