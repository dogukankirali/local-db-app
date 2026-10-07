import { palette } from "../../theme/customTheme";
import type { ScreenKind, WatchStatus } from "../../Services/ScreenService";

export const WATCH_STATUS_LABEL: Record<Exclude<WatchStatus, "">, string> = {
  WATCHING: "İzliyorum",
  COMPLETED: "Bitirdim",
  PAUSED: "Ara verdim",
  DROPPED: "Bıraktım",
  PLANNING: "İzleyeceğim",
};

export const WATCH_STATUS_COLOR: Record<Exclude<WatchStatus, "">, string> = {
  WATCHING: palette.info,
  COMPLETED: palette.success,
  PAUSED: palette.warning,
  DROPPED: palette.danger,
  PLANNING: palette.accent,
};

export const SERIES_STATUS_LABEL: Record<string, string> = { RELEASING: "Devam ediyor", FINISHED: "Bitti" };

/** Sayfa başına metinler: dizi ve film aynı bileşenleri kullanır */
export const KIND_TEXT: Record<ScreenKind, { title: string; one: string; base: string; empty: string; add: string; loginHint: string }> = {
  series: { title: "Diziler", one: "dizi", base: "/series", empty: "Burada henüz dizi yok", add: "Dizi ekle", loginHint: "Dizi listesini görmek için giriş yap." },
  movie: { title: "Filmler", one: "film", base: "/movies", empty: "Burada henüz film yok", add: "Film ekle", loginHint: "Film listesini görmek için giriş yap." },
};

export const progressText = (watched: number, total: number) => `${watched}/${total || "?"}`;
