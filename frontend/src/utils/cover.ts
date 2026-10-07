import { alpha } from "@mui/material/styles";
import { palette } from "../theme/customTheme";
// Kapaklar en büyük boyutta saklanır (AniList extraLarge ≈ 460 px); küçük gösterilen yerlerde
// aynı görselin CDN'deki küçük sürümü istenir, böylece tablo ve kalabalık grid çok daha hızlı yüklenir.
// AniList aynı dosyayı /cover/small/ (~100 px), /cover/medium/ (~230 px) ve /cover/large/ altında sunar;
// MAL'da "...l.jpg" büyük, ".jpg" orta boydur. Diğer adresler (ör. /api/animeCover) olduğu gibi döner.

export type CoverSize = "small" | "medium" | "large";

const ANILIST = /^(https:\/\/s4\.anilist\.co\/file\/anilistcdn\/media\/anime\/cover\/)(?:small|medium|large)\//;
const MAL_LARGE = /^(https:\/\/cdn\.myanimelist\.net\/images\/anime\/\d+\/\d+)l(\.(?:jpg|webp))$/;

export function sizedCover(url: string | null | undefined, size: CoverSize): string {
  if (!url) return "";
  if (ANILIST.test(url)) return url.replace(ANILIST, `$1${size}/`);
  if (size !== "large" && MAL_LARGE.test(url)) return url.replace(MAL_LARGE, "$1$2");
  return url;
}

// Görsel inene kadar kutuda hafif bir parıltı gösterilir, inince yumuşakça belirir (beyaz/boş kare yerine)
export const coverLoadingSx = {
  backgroundColor: palette.surfaceRaised,
  backgroundImage: `linear-gradient(100deg, transparent 30%, ${alpha(palette.overlay, 0.05)} 50%, transparent 70%)`,
  backgroundSize: "200% 100%",
  animation: "kirokuCoverShimmer 1.4s ease-in-out infinite",
  "@keyframes kirokuCoverShimmer": { from: { backgroundPosition: "150% 0" }, to: { backgroundPosition: "-50% 0" } },
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
} as const;

export const coverImgStyle = { opacity: 0, transition: "opacity .25s ease" } as const;

// <img onLoad={revealCover}> ile birlikte coverImgStyle: görsel inince görünür hale gelir
export function revealCover(e: { currentTarget: HTMLImageElement }) {
  e.currentTarget.style.opacity = "1";
}
