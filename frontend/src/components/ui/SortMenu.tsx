"use client";

import { IconButton, MenuItem, TextField, Tooltip } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import { palette } from "../../theme/customTheme";

export type SortOption = { value: string; label: string };
export type SortOrder = "asc" | "desc";

// Tablo ve grid için ortak sıralama: alan seçimi + artan/azalan düğmesi. Tablo başlıkları da aynı değeri değiştirir.
export default function SortMenu({
  options,
  sort,
  order,
  onChange,
}: {
  options: SortOption[];
  sort: string;
  order: SortOrder;
  onChange: (sort: string, order: SortOrder) => void;
}) {
  return (
    <>
      <TextField
        size="small"
        select
        label="Sırala"
        value={options.some((o) => o.value === sort) ? sort : ""}
        onChange={(e) => onChange(e.target.value, order)}
        sx={{ minWidth: 150 }}
      >
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </TextField>
      <Tooltip title={order === "asc" ? "Artan (tıkla: azalan)" : "Azalan (tıkla: artan)"}>
        <IconButton
          aria-label={order === "asc" ? "Artan sıralama" : "Azalan sıralama"}
          onClick={() => onChange(sort, order === "asc" ? "desc" : "asc")}
          sx={{ alignSelf: "center", border: `1px solid ${alpha(palette.overlay, 0.12)}`, borderRadius: "10px", width: 40, height: 40 }}
        >
          {order === "asc" ? <ArrowUpwardRoundedIcon fontSize="small" /> : <ArrowDownwardRoundedIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </>
  );
}
