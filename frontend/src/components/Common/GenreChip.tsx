import { Box, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { genreTranslations } from "../../utils/genreTranslations";

// Okunaklı, birbirinden ayırt edilebilen tonlar: koyu zeminde renkli metin + aynı tonun düşük opaklıklı zemini
const HUES = ["#A78BFA", "#60A5FA", "#34D399", "#FBBF24", "#F472B6", "#F87171", "#22D3EE", "#FB923C", "#A3E635", "#C084FC"];

/** DB'de karışık (TR/EN) duran tür adını tek dilde (Türkçe) gösterir */
export function genreLabel(genre: string): string {
  return genreTranslations[genre] ?? genre;
}

function hueFor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return HUES[hash % HUES.length];
}

export function GenreChip({
  genre,
  active,
  onClick,
}: {
  genre: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const label = genreLabel(genre);
  const color = hueFor(label);
  return (
    <Box
      component={onClick ? "button" : "span"}
      type={onClick ? "button" : undefined}
      onClick={onClick}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        height: 22,
        px: 1,
        borderRadius: "6px",
        border: `1px solid ${alpha(color, active ? 0.7 : 0.22)}`,
        backgroundColor: alpha(color, active ? 0.28 : 0.12),
        color,
        fontSize: "0.7rem",
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: "nowrap",
        fontFamily: "inherit",
        cursor: onClick ? "pointer" : "default",
        transition: "background-color .15s ease, border-color .15s ease",
        "&:hover": onClick ? { backgroundColor: alpha(color, 0.22), borderColor: alpha(color, 0.5) } : undefined,
      }}
    >
      {label}
    </Box>
  );
}

/** Virgülle ayrılmış tür listesini tekilleştirip ilk `max` tanesini, kalanını "+N" olarak gösterir */
export function GenreChips({
  genres,
  max = 3,
  activeGenres = [],
  onGenreClick,
  justify = "center",
}: {
  genres?: string;
  max?: number;
  activeGenres?: string[];
  onGenreClick?: (genre: string) => void;
  justify?: "center" | "flex-start";
}) {
  const seen = new Set<string>();
  const list = (genres ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter((g) => {
      const key = genreLabel(g);
      if (!g || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const shown = list.slice(0, max);
  const rest = list.slice(max);

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, justifyContent: justify }}>
      {shown.map((g) => (
        <GenreChip
          key={g}
          genre={g}
          active={activeGenres.includes(g)}
          onClick={
            onGenreClick
              ? (e) => {
                  e.stopPropagation();
                  onGenreClick(g);
                }
              : undefined
          }
        />
      ))}
      {rest.length > 0 && (
        <Tooltip title={rest.map(genreLabel).join(", ")}>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 22,
              px: 0.75,
              borderRadius: "6px",
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "text.secondary",
              fontSize: "0.7rem",
              fontWeight: 600,
            }}
          >
            +{rest.length}
          </Box>
        </Tooltip>
      )}
    </Box>
  );
}
