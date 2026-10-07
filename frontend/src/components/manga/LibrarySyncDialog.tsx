"use client";

// Library sync: lists the user's own manga library from the browser (WebDAV PROPFIND or a picked local folder),
// treats each top-level folder as a series and its *.cbz files as chapters, and sends only the metadata
// (file path, chapter number, title) to Kiroku. The files themselves stay on the user's server.

import { useState } from "react";
import { Alert, Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, Typography } from "@mui/material";
import { ChapterService, errorText, type LibrarySyncResult } from "../../Services/MangaService";
import { listLibrary, parseChapterFile } from "../../lib/library";
import { palette } from "../../theme/customTheme";
import { LibrarySettings } from "./ChapterSourcesPanel";

export default function LibrarySyncDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const [prune, setPrune] = useState(false);
  const [progress, setProgress] = useState<{ step: string; done: number; total: number } | null>(null);
  const [results, setResults] = useState<LibrarySyncResult[]>([]);
  const [error, setError] = useState("");

  const run = async () => {
    setError("");
    setResults([]);
    try {
      setProgress({ step: "Kütüphane listeleniyor", done: 0, total: 1 });
      const library = await listLibrary((done, total) => setProgress({ step: "Klasörler okunuyor", done, total }));
      const out: LibrarySyncResult[] = [];
      for (const [i, s] of library.entries()) {
        setProgress({ step: s.series, done: i, total: library.length });
        if (!s.files.length && !prune) continue;
        const chapters = s.files.map((filePath) => ({ filePath, ...parseChapterFile(filePath) }));
        out.push(await ChapterService.librarySync({ series: s.series, chapters, prune }));
        setResults([...out]);
      }
      onDone();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setProgress(null);
    }
  };

  const totals = results.reduce((t, r) => ({ added: t.added + r.added, created: t.created + (r.created ? 1 : 0), removed: t.removed + r.removed }), { added: 0, created: 0, removed: 0 });

  return (
    <Dialog open={open} onClose={progress ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Kütüphane sync</DialogTitle>
      <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <LibrarySettings />
        <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted }}>
          Kökteki her klasör bir seri, içindeki .cbz dosyaları bölümler (ör. “Bölüm 12 - Başlık.cbz”). Seri adı katalogdaki bir mangayla eşleşmezse yeni manga eklenir.
        </Typography>
        <FormControlLabel control={<Checkbox checked={prune} onChange={(e) => setPrune(e.target.checked)} />} label="Kütüphanede artık olmayan bölümleri listeden kaldır" />
        {progress && (
          <Box>
            <LinearProgress variant="determinate" value={(progress.done / Math.max(1, progress.total)) * 100} />
            <Typography noWrap sx={{ fontSize: "0.75rem", color: palette.textMuted, mt: 0.5 }}>{progress.step}</Typography>
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        {results.length > 0 && (
          <Box>
            <Alert severity="success" sx={{ mb: 1 }}>
              {results.length} seri · {totals.added} yeni bölüm · {totals.created} yeni manga{totals.removed ? ` · ${totals.removed} bölüm kaldırıldı` : ""}
            </Alert>
            <Box sx={{ maxHeight: 220, overflowY: "auto", fontSize: "0.78rem" }}>
              {results.map((r) => (
                <Box key={r.mangaId} sx={{ display: "flex", justifyContent: "space-between", gap: 1, py: 0.25 }}>
                  <span>{r.mangaName}{r.created ? " (yeni)" : ""}</span>
                  <span style={{ color: palette.textMuted }}>+{r.added} · {r.updated} mevcut{r.skipped ? ` · ${r.skipped} atlandı` : ""}</span>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={Boolean(progress)}>Kapat</Button>
        <Button variant="contained" onClick={run} disabled={Boolean(progress)}>Sync başlat</Button>
      </DialogActions>
    </Dialog>
  );
}
