import axios from "axios";

import { API_BASE } from "./http";
import type { User } from "./AuthService";

// Profil sayfası (#39) ve eklenti anahtarları (#26)

const path = API_BASE;

export interface Profile extends User {
  avatarUrl: string;
  bio: string;
  showRecommendations: boolean;
  notifyNewEpisodes: boolean;
}

export interface ProfileUpdate {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  /** https bağlantısı ya da 300 KB'tan küçük data:image; boş string avatarı kaldırır */
  avatarUrl?: string;
  bio?: string;
  showRecommendations?: boolean;
  notifyNewEpisodes?: boolean;
  password?: string;
  currentPassword?: string;
}

export type RecommendedAnime = TEATable.IAnime & { Reason: string };

export interface ApiToken {
  id: number;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export module ProfileService {
  export async function get(): Promise<Profile> {
    return (await axios.get(`${path}/profile`)).data;
  }

  export async function update(data: ProfileUpdate): Promise<Profile> {
    return (await axios.put(`${path}/profile`, data)).data;
  }

  export async function topAnime(limit = 10): Promise<TEATable.IAnime[]> {
    return (await axios.get(`${path}/profile/top-anime`, { params: { limit } })).data.data;
  }

  /** Profilde öneriler kapalıysa enabled=false döner */
  export async function recommendations(limit = 12): Promise<{ enabled: boolean; data: RecommendedAnime[] }> {
    return (await axios.get(`${path}/profile/recommendations`, { params: { limit } })).data;
  }

  /** Yayın takibi (cron) genel anahtarı; yalnızca admin */
  export async function airingEnabled(): Promise<boolean> {
    return (await axios.get(`${path}/admin/airing`)).data.enabled;
  }

  export async function setAiringEnabled(enabled: boolean): Promise<boolean> {
    return (await axios.put(`${path}/admin/airing`, { enabled })).data.enabled;
  }

  export async function tokens(): Promise<ApiToken[]> {
    return (await axios.get(`${path}/profile/tokens`)).data;
  }

  /** Anahtar yalnızca bu yanıtta görünür */
  export async function createToken(name: string): Promise<ApiToken & { token: string }> {
    return (await axios.post(`${path}/profile/tokens`, { name })).data;
  }

  export async function revokeToken(id: number): Promise<void> {
    await axios.delete(`${path}/profile/tokens`, { params: { id } });
  }
}
