import axios from "axios";

const path = process.env.NEXT_PUBLIC_API_URL || "https://localhost:8080";

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
      return {
        data: [],
        count: 0,
      };
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

  export async function searchAnime(query: string, page: number = 1) {
    try {
      const res = await axios.get(`${path}/getAnime?q=${query}&page=${page}`);
      return res.data;
    } catch (err) {
      console.error(err);
      return [];
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

  export async function syncAnimeData(signal?: AbortSignal): Promise<any> {
    try {
      const res = await axios.get(`${path}/syncAnimeData`, { signal });
      return res;
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }

  export async function cancelSync(): Promise<any> {
    try {
      const res = await axios.get(`${path}/cancelSync`);
      return res;
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }

  export function syncAnimeDataStream(
    onStart: (data: any) => void,
    onProgress: (data: any) => void,
    onComplete: (data: any) => void,
    onError: (error: any) => void
  ): { eventSource: EventSource; close: () => void } {
    const eventSource = new EventSource(`${path}/syncAnimeData`);

    eventSource.addEventListener("start", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      onStart(data);
    });

    eventSource.addEventListener("progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      onProgress(data);
    });

    eventSource.addEventListener("complete", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      onComplete(data);
      eventSource.close();
    });

    eventSource.addEventListener("error", (event) => {
      const data = (event as MessageEvent).data
        ? JSON.parse((event as MessageEvent).data)
        : { message: "Bağlantı hatası" };
      onError(data);
      eventSource.close();
    });

    eventSource.onerror = (error) => {
      onError(error);
      eventSource.close();
    };

    return {
      eventSource,
      close: () => {
        eventSource.close();
      },
    };
  }
}
