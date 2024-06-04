import axios from "axios";
import { path } from "../constants/Constants";

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
      return axios.delete(`${path}/deleteAnime?id=${data.ID}`);
    } catch (err) {
      console.error(err);
      return Promise.reject(err);
    }
  }

  export async function getAnimes(params: TEATable.FetchDataParams) {
    try {
      let uri = "";
      if (params.order !== undefined) {
        uri = `${path}/getAnimeTable?page=${params.page}&count=${params.count}&order=${params.order}&orderBy=${params.orderBy}`;
      } else {
        uri = `${path}/getAnimeTable?page=${params.page}&count=${params.count}`;
      }
      const res = await axios.post(uri, {
        filterArray: params.filters,
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
}
