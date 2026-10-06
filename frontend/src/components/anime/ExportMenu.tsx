"use client";

import React, { useState } from "react";
import { CircularProgress, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import GridOnOutlinedIcon from "@mui/icons-material/GridOnOutlined";
import { toast } from "sonner";
import { StyledMUIFilterButton } from "../CollapsibleTableV2/Components/StyledComponents";
import { ANIME_COLUMNS, animesToCsv, downloadBlob, exportValue } from "../../lib/animeCsv";
import { AnimeService } from "../../Services/AnimeServices";

/** Tablodaki (filtrelenmiş) tüm animeleri CSV ya da XLSX olarak indirir */
export default function ExportMenu({ filters, orderBy, order }: { filters: TEATable.IFilterType[]; orderBy?: string; order?: "asc" | "desc" }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (format: "csv" | "xlsx") => {
    setAnchor(null);
    setBusy(true);
    try {
      const res = await AnimeService.getAnimes({ page: 1, count: 100000, filters, orderBy: orderBy || "Name", order: order || "asc" });
      const rows: any[] = res?.data ?? [];
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        downloadBlob(animesToCsv(rows), `kiroku-anime-${stamp}.csv`, "text/csv;charset=utf-8");
      } else {
        const { default: writeXlsxFile } = await import("write-excel-file/browser");
        const header = ANIME_COLUMNS.map((c) => ({ value: c.header, fontWeight: "bold" as const }));
        const body = rows.map((r) =>
          ANIME_COLUMNS.map((c) => {
            const v = exportValue(r, c);
            return typeof v === "number" ? { type: Number, value: v } : typeof v === "boolean" ? { type: Boolean, value: v } : { type: String, value: v };
          })
        );
        const blob = await writeXlsxFile([header, ...body] as any, {
          sheet: "Anime",
          stickyRowsCount: 1,
          columns: ANIME_COLUMNS.map((c) => ({ width: c.key === "Name" ? 40 : c.key === "Notes" || c.key.endsWith("Link") || c.key === "Cover" ? 45 : c.key === "Genre" ? 34 : 14 })),
        }).toBlob();
        downloadBlob(blob, `kiroku-anime-${stamp}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      }
      toast.success(`${rows.length} anime dışa aktarıldı`);
    } catch (e) {
      console.error(e);
      toast.error("Dışa aktarma başarısız");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Tooltip title="Dışa aktar">
        <span>
          <StyledMUIFilterButton onClick={(e) => setAnchor(e.currentTarget)} aria-label="Dışa aktar" disabled={busy}>
            {busy ? <CircularProgress size={16} /> : <FileDownloadOutlinedIcon sx={{ fontSize: 20 }} />}
          </StyledMUIFilterButton>
        </span>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
      >
        <MenuItem onClick={() => run("csv")}>
          <ListItemIcon>
            <DescriptionOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="CSV" secondary="Tekrar içe aktarılabilir" />
        </MenuItem>
        <MenuItem onClick={() => run("xlsx")}>
          <ListItemIcon>
            <GridOnOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Excel (XLSX)" secondary="Tüm sütunlar, sabit başlık" />
        </MenuItem>
      </Menu>
    </>
  );
}
