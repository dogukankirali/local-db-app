import axios from "axios";

import { API_BASE } from "./http";
import * as AniList from "./anilist";

const path = API_BASE;


/* router.HandleFunc("/getAnimeTable", allfunctions.GetAnimeTableData(db));
router.HandleFunc("/getGenres", allfunctions.GetGenres(db));
router.HandleFunc("/updateAnimeTable", allfunctions.UpdateAnimeTableData(db));
router.HandleFunc("/createAnime", allfunctions.CreateAnimeTableData(db)); */

export module AnimeService {
  export async function createAnime(data: TEATable.IAnime): Promise<any> {
    try {
      return axios.post(`${path}/createAnime`, data);
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }

  export function updateAnime(data: TEATable.IAnime): Promise<any> {
    try {
      return axios.post(`${path}/updateAnimeTable`, data);
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }

  export function deleteAnime(data: TEATable.IAnime): Promise<any> {
    try {
      console.log(data);
      return axios.delete(`${path}/deleteAnime?id=${data.ID}`);
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }

  export function createAniemWithFile(formData: FormData): Promise<any> {
    try {
      return axios.post(`${path}/createAnimeWithFile`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }

  export async function getAnimes(params: TEATable.FetchDataParams) {
    try {
      let uri = "";
      if (params.order !== undefined && params.orderBy) {
        uri = `${path}/getAnimeTable?page=${params.page}&count=${params.count}&order=${params.order}&orderBy=${params.orderBy}`;
        console.log("Sıralama parametreleri:", {
          order: params.order,
          orderBy: params.orderBy,
        });
      } else {
        uri = `${path}/getAnimeTable?page=${params.page}&count=${params.count}`;
      }

      const filters = params.filters || [];

      const res = await axios.post(uri, {
        filterArray: filters,
      });

      return res.data;
    } catch (err) {
      console.error(err);
      return { data: [], pagination: { currentPage: 1, itemCount: 0, totalItemCount: 0, itemsPerPage: 10, totalPageCount: 0 } };
    }
  }

  export async function getGenres() {
    try {
      const res = await axios.post(`${path}/getGenres`, {
        filterArray: [],
      });
      return res.data.map((item: { name: string }) => ({
        value: item.name,
        label: item.name,
      }));
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  export async function getSeries() {
    try {
      console.log("getSeries API çağrılıyor...");
      const res = await axios.get(`${path}/getSeries`);
      console.log("getSeries API yanıtı:", res.data);
      return res.data;
    } catch (err) {
      console.error("getSeries API hatası:", err);
      return [];
    }
  }

  export async function searchAnime(query: string, page: number = 1): Promise<any> {
    try {
      return await AniList.searchAnime(query, page);
    } catch (err) {
      console.error(err);
      return { success: false, data: null };
    }
  }

  export async function getAnime(id: number): Promise<any> {
    try {
      console.log(`Anime ID ${id} için detaylar alınıyor...`);
      // Belirli ID'ye sahip animeyi alma
      const res = await axios.get(`${path}/getAnimeById?id=${id}`);

      // Backend yanıtı içindeki veriyi logla
      console.log(`GetAnime ham yanıt:`, JSON.stringify(res.data, null, 2));
      console.log("Veri yapısı:", Object.keys(res.data));

      if (res.data && res.data.status === "success" && res.data.data) {
        console.log("Başarılı yanıt, içeriği:", Object.keys(res.data.data));
        console.log("Anime verisi:", JSON.stringify(res.data.data, null, 2));
        return res;
      } else {
        console.error("Anime veri yapısı beklendiği gibi değil:", res.data);
        return Promise.reject(new Error("Anime veri yapısı uygun değil"));
      }
    } catch (err) {
      console.error(`Anime ID ${id} detayları alınırken hata:`, err);
      return Promise.reject(err);
    }
  }

  // Tek anime sync (#20, admin): AniList'teki güncel durum, bölüm sayısı, MAL puanı, kapak, türler ve seri
  // yazılır; kullanıcıların puan, bölüm ve notları değişmez. Güncellenmiş animeyi döner.
  export async function syncSingleAnime(anime: Pick<TEATable.IAnime, "ID" | "Name" | "MALAnimeLink">, signal?: AbortSignal) {
    const idMal = Number(/myanimelist\.net\/anime\/(\d+)/.exec(anime.MALAnimeLink ?? "")?.[1]) || null;
    const media = await AniList.mediaForSingleSync(anime.Name, idMal, signal);
    if (!media.length) throw new Error("AniList'te bulunamadı");
    const res = await axios.post(`${path}/sync/batch`, { force: true, items: [{ id: anime.ID, media }] }, { signal });
    if (!res.data.updated) throw new Error(res.data.errors?.[0] ?? "Güncellenemedi");
    const fresh = await axios.get(`${path}/getAnimeById`, { params: { id: anime.ID }, signal });
    return { anime: fresh.data.data as TEATable.IAnime, message: (res.data.messages ?? [])[0] as string | undefined };
  }

  // Sync, Worker'ın ücretsiz plan sınırlarına sığması için küçük gruplar halinde yürütülür:
  // eksik bilgili animelerin listesi alınır, her grup tarayıcıdan AniList'te aranır (tek istek)
  // ve sonuçlar /sync/batch ile Worker'a yazdırılır.
  // Geri çağrılar eski SSE akışıyla aynı biçimde veri alır.
  const SYNC_DELAY_MS = 2000;

  export interface SyncState {
    success: boolean;
    message: string;
    updated: number;
    failed: number;
    errors: string[];
    progress: number;
    totalWork: number;
    completed: number;
  }

  export function syncAnimeDataStream(
    onStart: (data: SyncState) => void,
    onProgress: (data: SyncState) => void,
    onComplete: (data: SyncState) => void,
    onError: (error: any) => void
  ): { close: () => void } {
    const controller = new AbortController();
    const signal = controller.signal;
    const wait = (ms: number) =>
      new Promise<void>((resolve, reject) => {
        const t = setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });

    (async () => {
      const state: SyncState = { success: false, message: "", updated: 0, failed: 0, errors: [], progress: 0, totalWork: 0, completed: 0 };
      try {
        const [pending, coverPending] = await Promise.all([
          axios.get(`${path}/sync/pending`, { signal }),
          axios.get(`${path}/covers/pending`, { signal }),
        ]);
        const items: { id: number; name: string }[] = pending.data.items ?? [];
        const batchSize: number = pending.data.batchSize ?? 8;
        const covers: { id: number; idMal: number | null }[] = coverPending.data.items ?? [];
        const coverBatchSize: number = coverPending.data.batchSize ?? 50;
        state.totalWork = items.length + covers.length;
        onStart({ ...state });
        if (!state.totalWork) {
          onComplete({ ...state, success: true, progress: 100, message: "Güncellenecek anime yok" });
          return;
        }
        const report = () => {
          state.progress = (state.completed / state.totalWork) * 100;
          onProgress({ ...state });
        };
        for (let i = 0; i < items.length; ) {
          const batch = items.slice(i, i + batchSize);
          let media: unknown[][];
          try {
            media = await AniList.searchForSync(batch.map((b) => b.name), signal);
          } catch (err: any) {
            // AniList hız sınırı: söylenen süre kadar bekleyip aynı grubu tekrar dene
            if (err instanceof AniList.AniListRateLimit) {
              onProgress({ ...state, message: `AniList hız sınırı, ${err.retryAfter} sn bekleniyor...` });
              await wait(err.retryAfter * 1000);
              continue;
            }
            throw err;
          }
          const res = await axios.post(
            `${path}/sync/batch`,
            { items: batch.map((b, j) => ({ id: b.id, media: media[j] })) },
            { signal }
          );
          i += batch.length;
          state.updated += res.data.updated ?? 0;
          state.failed += res.data.failed ?? 0;
          state.errors.push(...(res.data.errors ?? []));
          state.completed = Math.min(i, items.length);
          state.message = (res.data.messages ?? []).slice(-1)[0] ?? `${state.completed}/${items.length} işlendi`;
          report();
          if (i < items.length || covers.length) await wait(SYNC_DELAY_MS);
        }

        // Kapakları AniList'teki en yüksek çözünürlüklü sürümle değiştir (MAL id ile birebir eşleşme)
        for (let i = 0; i < covers.length; ) {
          const batch = covers.slice(i, i + coverBatchSize);
          let found: Map<number, string>;
          try {
            const ids = batch.flatMap((b) => (b.idMal ? [b.idMal] : []));
            found = ids.length ? await AniList.coversByMalIds(ids, signal) : new Map();
          } catch (err: any) {
            if (err instanceof AniList.AniListRateLimit) {
              onProgress({ ...state, message: `AniList hız sınırı, ${err.retryAfter} sn bekleniyor...` });
              await wait(err.retryAfter * 1000);
              continue;
            }
            throw err;
          }
          // AniList'te bulunamayanlar için url: null → Worker MAL'ın büyük görseline geçer
          const updates = batch.map((b) => ({ id: b.id, url: (b.idMal && found.get(b.idMal)) || null }));
          const res = await axios.post(`${path}/covers/batch`, { items: updates }, { signal });
          i += batch.length;
          state.updated += res.data.updated ?? 0;
          state.completed = items.length + Math.min(i, covers.length);
          state.message = `Kapaklar yükseltiliyor: ${Math.min(i, covers.length)}/${covers.length}`;
          report();
          if (i < covers.length) await wait(SYNC_DELAY_MS);
        }
        onComplete({ ...state, success: true, progress: 100, message: "Senkronizasyon tamamlandı" });
      } catch (err: any) {
        // Kullanıcı durdurduysa çağıran taraf zaten bildirim gösteriyor
        if (err?.name === "AbortError" || err?.name === "CanceledError") return;
        onError({ ...state, message: err?.response?.data?.error ?? err?.message ?? "Bağlantı hatası" });
      }
    })();

    return { close: () => controller.abort() };
  }
}
