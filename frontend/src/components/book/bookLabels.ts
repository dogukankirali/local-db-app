import { palette } from "../../theme/customTheme";
import type { BookReadStatus } from "../../Services/BookService";

export const BOOK_STATUS_LABEL: Record<Exclude<BookReadStatus, "">, string> = {
  READING: "Okuyorum",
  COMPLETED: "Bitirdim",
  PAUSED: "Ara verdim",
  DROPPED: "Bıraktım",
  PLANNING: "Okuyacağım",
};

export const BOOK_STATUS_COLOR: Record<Exclude<BookReadStatus, "">, string> = {
  READING: palette.info,
  COMPLETED: palette.success,
  PAUSED: palette.warning,
  DROPPED: palette.danger,
  PLANNING: palette.accent,
};

export const LANGUAGE_LABEL: Record<string, string> = {
  tr: "Türkçe",
  en: "İngilizce",
  de: "Almanca",
  fr: "Fransızca",
  es: "İspanyolca",
  it: "İtalyanca",
  ru: "Rusça",
  ja: "Japonca",
};

export const pagesText = (read: number, total: number) => `${read}/${total || "?"}`;

/** "2016-05-12" → "2016" (listelerde yıl yeter) */
export const yearOf = (date: string) => date.slice(0, 4);
