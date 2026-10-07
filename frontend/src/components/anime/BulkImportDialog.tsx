"use client";

import React, { useEffect, useRef, useState } from "react";
import { Alert, Box, Button, CircularProgress, LinearProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import { toast } from "sonner";
import { DialogShell } from "./AnimeEditorDialog";
import { ANIME_COLUMNS, AnimeRow, CSV_TEMPLATE_ROWS, animesToCsv, csvToAnimes, downloadBlob, ParsedImport } from "../../lib/animeCsv";
import { AnimeService } from "../../Services/AnimeServices";
import { palette } from "../../theme/customTheme";

/** CSV ile toplu anime ekleme. Aynı isimde kayıt varsa backend günceller (upsert). */
export default function BulkImportDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [progress, setProgress] = useState<{ done: number; failed: string[] } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (open) {
      setFileName("");
      setParsed(null);
      setProgress(null);
    }
  }, [open]);

  const readFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setProgress(null);
    setParsed(csvToAnimes(await file.text()));
  };

  const running = progress !== null && progress.done + progress.failed.length < (parsed?.rows.length ?? 0);

  const runImport = async () => {
    if (!parsed?.rows.length) return;
    // Seri adlarını id'ye çevir; bilinmeyen seri boş bırakılır
    const series: any[] = await AnimeService.getSeries();
    const seriesId = new Map(series.map((s) => [String(s.name).toLocaleLowerCase("tr"), Number(s.id)]));
    const state = { done: 0, failed: [] as string[] };
    setProgress({ ...state });
    for (const row of parsed.rows) {
      const payload: AnimeRow = { ...row, Series: seriesId.get(String(row.SeriesName ?? "").toLocaleLowerCase("tr")) ?? 0 };
      try {
        await AnimeService.createAnime(payload as TEATable.IAnime);
        state.done++;
      } catch {
        state.failed.push(String(row.Name));
      }
      setProgress({ ...state, failed: [...state.failed] });
    }
    if (state.failed.length) toast.error(`${state.failed.length} anime eklenemedi`);
    toast.success(`${state.done} anime içe aktarıldı`);
    onDone();
  };

  const total = parsed?.rows.length ?? 0;
  const finished = progress !== null && !running;

  return (
    <DialogShell
      open={open}
      onClose={running ? () => {} : onClose}
      maxWidth={720}
      title="CSV ile toplu ekle"
      subtitle="Başlık satırlı bir CSV yükle; aynı isimdeki animeler güncellenir"
      footer={
        <>
          <Button
            startIcon={<DownloadRoundedIcon />}
            onClick={() => downloadBlob(animesToCsv(CSV_TEMPLATE_ROWS), "kiroku-anime-sablon.csv", "text/csv;charset=utf-8")}
            sx={{ color: palette.textMuted }}
          >
            Örnek şablon
          </Button>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} disabled={running} sx={{ color: palette.textMuted }}>
            {finished ? "Kapat" : "İptal"}
          </Button>
          {!finished && (
            <Button
              variant="contained"
              disabled={!total || running}
              onClick={runImport}
              startIcon={running ? <CircularProgress size={14} color="inherit" /> : <UploadFileRoundedIcon />}
            >
              {total ? `${total} animeyi içe aktar` : "İçe aktar"}
            </Button>
          )}
        </>
      }
    >
      <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => readFile(e.target.files?.[0])} />
      <Box
        onClick={() => !running && fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          readFile(e.dataTransfer.files?.[0]);
        }}
        sx={{
          p: 3,
          textAlign: "center",
          borderRadius: "12px",
          cursor: "pointer",
          border: `1.5px dashed ${dragging ? palette.primary : alpha(palette.overlay, 0.14)}`,
          backgroundColor: dragging ? alpha(palette.primary, 0.08) : alpha(palette.overlay, 0.02),
          transition: "all .15s ease",
          "&:hover": { borderColor: alpha(palette.primary, 0.6) },
        }}
      >
        <UploadFileRoundedIcon sx={{ fontSize: 34, color: palette.primary, mb: 1 }} />
        <Typography sx={{ fontWeight: 600 }}>{fileName || "CSV dosyasını sürükle ya da seç"}</Typography>
        <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted, mt: 0.5 }}>
          Sütunlar: {ANIME_COLUMNS.map((c) => c.header).join(", ")}. Türler ";" ile ayrılır. Yalnızca Name zorunlu.
        </Typography>
      </Box>

      {parsed && (
        <Box sx={{ mt: 2.5, display: "grid", gap: 1.5 }}>
          {parsed.errors.length > 0 && (
            <Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
              {parsed.errors.slice(0, 5).map((e) => (
                <div key={e}>{e}</div>
              ))}
              {parsed.errors.length > 5 && <div>…ve {parsed.errors.length - 5} uyarı daha</div>}
            </Alert>
          )}
          {parsed.unknownHeaders.length > 0 && (
            <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted }}>
              Tanınmayan sütunlar yok sayılacak: {parsed.unknownHeaders.join(", ")}
            </Typography>
          )}
          {total > 0 && (
            <Box sx={{ borderRadius: "10px", border: `1px solid ${alpha(palette.overlay, 0.06)}`, overflow: "hidden" }}>
              <Box sx={{ px: 1.5, py: 1, fontSize: "0.75rem", fontWeight: 600, color: palette.textMuted, backgroundColor: alpha(palette.overlay, 0.03) }}>
                {total} anime bulundu · ilk {Math.min(total, 5)} tanesi:
              </Box>
              {parsed.rows.slice(0, 5).map((r, i) => (
                <Box
                  key={i}
                  sx={{ display: "flex", gap: 1.5, px: 1.5, py: 1, fontSize: "0.85rem", borderTop: `1px solid ${alpha(palette.overlay, 0.05)}` }}
                >
                  <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>{r.Name}</Box>
                  <Box sx={{ color: palette.textMuted, whiteSpace: "nowrap" }}>
                    {r.IsMovie ? "Film" : "TV"} · {r.WatchStatus}/{r.TotalNumberOfEpisodes} · {Number(r.Score) > 0 ? r.Score : "—"}
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {progress && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={total ? ((progress.done + progress.failed.length) / total) * 100 : 0}
                sx={{ height: 6, borderRadius: 3, mb: 0.75 }}
              />
              <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted }}>
                {progress.done} eklendi
                {progress.failed.length > 0 && ` · ${progress.failed.length} hata (${progress.failed.slice(0, 3).join(", ")}${progress.failed.length > 3 ? "…" : ""})`}
                {` · ${total} toplam`}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </DialogShell>
  );
}
