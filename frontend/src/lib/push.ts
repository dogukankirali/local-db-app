// Tarayıcı bildirimleri (Web Push): izin, abonelik ve Worker'a kayıt. Bildirimleri /sw.js gösterir.

import axios from "axios";
import { API_BASE } from "../Services/http";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const toUint8 = (b64url: string) => {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (b64url.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
};

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js"));
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null;
  return (await registration()).pushManager.getSubscription();
}

/** İzin ister, bu tarayıcıyı abone yapar ve hesabın bildirim tercihini açar. Hata metniyle reddeder. */
export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error("Bu tarayıcı bildirimleri desteklemiyor (iPhone'da Kiroku'yu önce ana ekrana ekle)");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Bildirim izni verilmedi; tarayıcının site ayarlarından açabilirsin");
  const { publicKey } = (await axios.get<{ publicKey: string }>(`${API_BASE}/push/public-key`)).data;
  if (!publicKey) throw new Error("Sunucuda bildirim anahtarı ayarlı değil");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // Sunucu anahtarı değiştiyse eski abonelik geçersizdir
  if (sub && sub.options.applicationServerKey) {
    const current = new Uint8Array(sub.options.applicationServerKey);
    const wanted = toUint8(publicKey);
    if (current.length !== wanted.length || current.some((b, i) => b !== wanted[i])) {
      await sub.unsubscribe();
      sub = null;
    }
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(publicKey) });
  await axios.post(`${API_BASE}/push/subscribe`, { ...sub.toJSON(), enableNotifications: true });
}

/** Bu tarayıcının aboneliğini kaldırır (hesabın diğer cihazları etkilenmez) */
export async function disablePush(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await axios.post(`${API_BASE}/push/unsubscribe`, { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

export async function sendTestPush(): Promise<void> {
  await axios.post(`${API_BASE}/push/test`);
}

export type AppNotification = { id: number; animeId: number | null; title: string; body: string; url: string; read: boolean; createdAt: string };

export async function fetchNotifications(): Promise<{ unread: number; items: AppNotification[] }> {
  return (await axios.get(`${API_BASE}/notifications`)).data;
}

export async function markNotificationsRead(id?: number): Promise<void> {
  await axios.post(`${API_BASE}/notifications/read`, id ? { id } : {});
}
