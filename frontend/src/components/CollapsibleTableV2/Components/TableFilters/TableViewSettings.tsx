import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { palette } from "../../../../theme/customTheme";

export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

/** Sütunun kalıcı kimliği: string key ya da (işlemler sütunu gibi) bileşen key'li sütunlar için label */
export const columnId = (c: TEATable.IColumnItem) => (typeof c.key === "string" ? c.key : `__${c.type}`);

type Props = {
  columns: TEATable.IColumnItem[];
  hidden: string[];
  onHiddenChange: (hidden: string[]) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (n: number) => void;
};

const chipSx = (active: boolean) => ({
  height: 30,
  px: 1.25,
  borderRadius: "8px",
  border: `1px solid ${active ? alpha(palette.primary, 0.6) : alpha("#FFFFFF", 0.08)}`,
  backgroundColor: active ? alpha(palette.primary, 0.18) : alpha("#FFFFFF", 0.03),
  color: active ? palette.text : palette.textMuted,
  fontFamily: "inherit",
  fontSize: "0.78rem",
  fontWeight: active ? 600 : 500,
  cursor: "pointer",
  transition: "all .15s ease",
  "&:hover": { borderColor: alpha(palette.primary, 0.4), color: palette.text },
});

const label = {
  display: "block",
  mb: 0.75,
  fontSize: "0.72rem",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: palette.textMuted,
} as const;

// Filtre panelinin altındaki "Tablo görünümü" bölümü: değişiklikler anında uygulanır ve saklanır
export default function TableViewSettings({ columns, hidden, onHiddenChange, rowsPerPage, onRowsPerPageChange }: Props) {
  const toggle = (id: string) => {
    const next = hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id];
    // En az iki sütun (kapak + isim gibi) görünür kalsın
    if (columns.length - next.length < 2) return;
    onHiddenChange(next);
  };

  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box>
        <Typography component="span" sx={label}>
          Sayfa başına satır
        </Typography>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {ROWS_PER_PAGE_OPTIONS.map((n) => (
            <Box key={n} component="button" type="button" aria-pressed={rowsPerPage === n} onClick={() => onRowsPerPageChange(n)} sx={chipSx(rowsPerPage === n)}>
              {n}
            </Box>
          ))}
        </Box>
      </Box>
      <Box>
        <Typography component="span" sx={label}>
          Görünen sütunlar
        </Typography>
        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
          {columns.map((c) => {
            const id = columnId(c);
            const visible = !hidden.includes(id);
            return (
              <Box key={id} component="button" type="button" aria-pressed={visible} onClick={() => toggle(id)} sx={chipSx(visible)}>
                {c.value}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
