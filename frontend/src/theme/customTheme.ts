// Uygulama genelinde kullanılan renk token'ları. MUI teması (theme.ts) da
// buradaki değerlerden türetilir; renk değiştirmek için tek yer burası.
// Not: Utils.ChangeColorAlpha 6 haneli hex beklediği için değerler hex tutulur.
// Ayarlardan seçilebilen vurgu renkleri ve aydınlık/karanlık tema. Seçim localStorage'da tutulur ve
// modül yüklenirken palette'e uygulanır (bu yüzden değişiklik sayfa yenilenince geçerli olur).
export const ACCENT_COLORS = [
  { id: "mor", name: "Mor", hex: "#7C5CFF" },
  { id: "lavanta", name: "Lavanta", hex: "#A78BFA" },
  { id: "indigo", name: "İndigo", hex: "#6366F1" },
  { id: "gece-mavisi", name: "Gece mavisi", hex: "#5B8CFF" },
  { id: "gok", name: "Gök", hex: "#38BDF8" },
  { id: "petrol", name: "Petrol", hex: "#14A3B8" },
  { id: "turkuaz", name: "Turkuaz", hex: "#22D3EE" },
  { id: "yesim", name: "Yeşim", hex: "#2DD4A7" },
  { id: "zumrut", name: "Zümrüt", hex: "#10B981" },
  { id: "matcha", name: "Matcha", hex: "#9BCB5C" },
  { id: "limon", name: "Limon", hex: "#D4E157" },
  { id: "kehribar", name: "Kehribar", hex: "#F5B942" },
  { id: "turuncu", name: "Turuncu", hex: "#FB923C" },
  { id: "mercan", name: "Mercan", hex: "#FF7849" },
  { id: "kiraz", name: "Kiraz", hex: "#F43F5E" },
  { id: "sarap", name: "Şarap", hex: "#C2416B" },
  { id: "sakura", name: "Sakura", hex: "#F06292" },
  { id: "fusya", name: "Fuşya", hex: "#E879F9" },
  { id: "kahve", name: "Kahve", hex: "#C08457" },
  { id: "monokrom", name: "Monokrom", hex: "#9AA3B5" },
] as const;

export type ThemeMode = "dark" | "light";
export const ACCENT_KEY = "kirokuAccent";
export const MODE_KEY = "kirokuMode";
export const DEFAULT_ACCENT = "mor";

const DARK = {
  ink: "#0B0D12", // uygulama zemini
  inkDeep: "#0F1218", // girdi / tablo zemini
  surface: "#12161E", // kart / panel
  surfaceRaised: "#181D27", // hover, seçili satır
  border: "#232938",
  text: "#E7E9EE",
  textMuted: "#8A93A6",
  textFaint: "#5B6478",
  overlay: "#FFFFFF", // ince çizgi/hover katmanları bu rengin şeffaf hâlidir
};
const LIGHT: typeof DARK = {
  ink: "#F4F5F8",
  inkDeep: "#FFFFFF",
  surface: "#FFFFFF",
  surfaceRaised: "#EEF0F5",
  border: "#DDE1EA",
  text: "#12161E",
  textMuted: "#5B6478",
  textFaint: "#8A93A6",
  overlay: "#0B0D12",
};

function readPref(key: string) {
  try {
    return typeof window === "undefined" ? null : window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** 6 haneli hex rengi karartır (amount: 0-1) */
function darken(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export const themeMode: ThemeMode = readPref(MODE_KEY) === "light" ? "light" : "dark";
export const accentId: string = ACCENT_COLORS.some((c) => c.id === readPref(ACCENT_KEY)) ? readPref(ACCENT_KEY)! : DEFAULT_ACCENT;
const accentHex = ACCENT_COLORS.find((c) => c.id === accentId)!.hex;

export const palette = {
  ...(themeMode === "light" ? LIGHT : DARK),
  primary: accentHex,
  primaryHover: darken(accentHex, 0.12),
  primarySoft: `${accentHex}26`,
  /** Vurgu renginin üzerindeki yazı: açık renklerde koyu, koyularda beyaz */
  onPrimary: (() => {
    const n = parseInt(accentHex.slice(1), 16);
    const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
    return lum > 150 ? "#0B0D12" : "#FFFFFF";
  })(),
  accent: "#22D3EE",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
};

export function setThemePrefs(prefs: { accent?: string; mode?: ThemeMode }) {
  try {
    if (prefs.accent) window.localStorage.setItem(ACCENT_KEY, prefs.accent);
    if (prefs.mode) window.localStorage.setItem(MODE_KEY, prefs.mode);
  } catch {}
  window.location.reload();
}

export const theme = {
  selected: "default",
  background: palette.ink,
  foreground: palette.inkDeep,
  foreground_alt: palette.surfaceRaised,
  primary_text: palette.text,
  secondary_text: palette.textMuted,
  link_text: palette.primary,
  primary: palette.primary,
  secondary: "#64748B",
  alternative: palette.accent,
  danger: palette.danger,
  warning: palette.warning,
  success: palette.success,
  success_alt: "#34D399",
  danger_alt: "#F87171",
  warning_alt: "#FBBF24",
  input_background: palette.inkDeep,
  input_border: palette.border,
  input_text: palette.text,
  primary25: `${palette.primary}40`,
  primary50: palette.primary,
  primary_dropdown: palette.surfaceRaised,
  neutral0: palette.surface,
  neutral80: palette.text,
  neutral10: palette.inkDeep,
  neutral5: palette.surface,
  primary_button: palette.primary,
  primary_button_sub: palette.primaryHover,
  scondary_button: palette.primary,
  button_text: palette.onPrimary,
  button_text_alt: "#FFFFFF",
  table_header: palette.surface,
  table_row_light: palette.surface,
  table_row_dark: palette.inkDeep,
  error_light: "#2A1215",
  error_text: "#F87171",
  background_light: palette.surface,
};

/** "#RRGGBB" → "r, g, b" (rgba() içinde kullanmak için) */
export function hexToRgbTriplet(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}
