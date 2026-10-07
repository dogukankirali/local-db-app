"use client";

// Dizi/film ekleme ve düzenleme penceresi. Ekleme IMDb aramasıyla başlar (OMDb, Worker üzerinden);
// IMDb araması ayarlı değilse ya da sonuç yoksa elle girilebilir. Düzenleme kullanıcının kendi izleme
// verisini değiştirir; admin ortak katalog alanlarını da değiştirebilir.

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ScreenService, errorText, type ImdbHit, type ScreenInput, type ScreenKind, type ScreenTitle } from "../../Services/ScreenService";
import { palette } from "../../theme/customTheme";
import { KIND_TEXT, SERIES_STATUS_LABEL, WATCH_STATUS_LABEL } from "./screenLabels";

type Props = {
  kind: ScreenKind;
  open: boolean;
  /** null = yeni kayıt */
  title: ScreenTitle | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (t: ScreenTitle) => void;
};

const EMPTY: ScreenInput = {
  name: "",
  originalName: "",
  year: "",
  status: "",
  totalSeasons: 0,
  totalEpisodes: 0,
  runtime: "",
  genres: [],
  director: "",
  actors: "",
  plot: "",
  cover: "",
  imdbRating: 0,
  score: 0,
  watchStatus: "",
  episodesWatched: 0,
  planToWatch: false,
  notes: "",
  startedAt: "",
  finishedAt: "",
};

const CATALOG_KEYS = ["name", "originalName", "year", "status", "totalSeasons", "totalEpisodes", "runtime", "genres", "director", "actors", "plot", "cover", "imdbId", "imdbRating"] as const;

export default function ScreenEditorDialog({ kind, open, title, isAdmin, onClose, onSaved }: Props) {
  const isNew = title === null;
  const isSeries = kind === "series";
  const text = KIND_TEXT[kind];
  const [form, setForm] = useState<ScreenInput>(EMPTY);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ImdbHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingPick, setLoadingPick] = useState(false);
  const [picked, setPicked] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(title ? { ...title } : EMPTY);
    setPicked(!isNew);
    setShowCatalog(false);
    setResults([]);
    setSearch("");
    setError("");
  }, [open, title, isNew]);

  // IMDb araması (gecikmeli)
  useEffect(() => {
    if (!isNew || picked || search.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await ScreenService.imdb.search(kind, search.trim(), ctrl.signal));
        setError("");
      } catch (e) {
        if (!ctrl.signal.aborted) setError(`IMDb araması başarısız: ${errorText(e)}`);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [search, isNew, picked, kind]);

  const set = <K extends keyof ScreenInput>(k: K, v: ScreenInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pick = async (hit: ImdbHit) => {
    setLoadingPick(true);
    try {
      const { kind: _kind, ...details } = await ScreenService.imdb.details(hit.imdbId);
      setForm((f) => ({ ...f, ...details }));
      setPicked(true);
      setError("");
    } catch (e) {
      setError(`IMDb ayrıntıları alınamadı: ${errorText(e)}`);
    } finally {
      setLoadingPick(false);
    }
  };

  const save = async () => {
    if (!form.name?.trim()) return setError("Ad boş olamaz");
    setSaving(true);
    try {
      const payload: ScreenInput = { ...form };
      // Admin olmayan kullanıcı düzenlerken katalog alanlarını göndermez (Worker zaten yok sayar)
      if (!isNew && !isAdmin) for (const k of CATALOG_KEYS) delete payload[k];
      onSaved(isNew ? await ScreenService.create(kind, payload) : await ScreenService.update(kind, title!.id, payload));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const catalog = (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
      <TextField label="Ad" value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} required />
      <TextField label="Orijinal ad" value={form.originalName ?? ""} onChange={(e) => set("originalName", e.target.value)} />
      <TextField label="Yıl" placeholder={isSeries ? "2008–2013" : "2010"} value={form.year ?? ""} onChange={(e) => set("year", e.target.value)} />
      {isSeries ? (
        <TextField select label="Yayın durumu" value={form.status ?? ""} onChange={(e) => set("status", e.target.value)}>
          <MenuItem value="">—</MenuItem>
          {Object.entries(SERIES_STATUS_LABEL).map(([k, v]) => (
            <MenuItem key={k} value={k}>{v}</MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField label="Süre" placeholder="148 min" value={form.runtime ?? ""} onChange={(e) => set("runtime", e.target.value)} />
      )}
      {isSeries && <TextField type="number" label="Sezon sayısı" value={form.totalSeasons ?? 0} onChange={(e) => set("totalSeasons", Number(e.target.value))} />}
      {isSeries && <TextField type="number" label="Toplam bölüm" value={form.totalEpisodes ?? 0} onChange={(e) => set("totalEpisodes", Number(e.target.value))} />}
      <TextField type="number" label="IMDb puanı (0-10)" value={form.imdbRating ?? 0} onChange={(e) => set("imdbRating", Number(e.target.value))} inputProps={{ step: 0.1, min: 0, max: 10 }} />
      <TextField label="Türler (virgülle)" value={(form.genres ?? []).join(", ")} onChange={(e) => set("genres", e.target.value.split(",").map((g) => g.trim()).filter(Boolean))} />
      <TextField label="Yönetmen" value={form.director ?? ""} onChange={(e) => set("director", e.target.value)} />
      <TextField label="Oyuncular" value={form.actors ?? ""} onChange={(e) => set("actors", e.target.value)} />
      <TextField label="Kapak adresi" value={form.cover ?? ""} onChange={(e) => set("cover", e.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
      <TextField label="IMDb ID" placeholder="tt0903747" value={form.imdbId ?? ""} onChange={(e) => set("imdbId", e.target.value.trim())} />
      <TextField label="Özet" multiline minRows={2} value={form.plot ?? ""} onChange={(e) => set("plot", e.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNew ? text.add : form.name}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {isNew && !picked && (
          <Box>
            <TextField autoFocus fullWidth label="IMDb'de ara" value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ endAdornment: searching || loadingPick ? <CircularProgress size={18} /> : null }} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5, maxHeight: 380, overflowY: "auto" }}>
              {results.map((r) => (
                <Box key={r.imdbId} onClick={() => !loadingPick && pick(r)}
                  sx={{ display: "flex", gap: 1.5, p: 1, borderRadius: "10px", cursor: "pointer", border: `1px solid ${alpha(palette.overlay, 0.08)}`, "&:hover": { backgroundColor: palette.surfaceRaised } }}>
                  {r.cover && <img src={r.cover} alt="" style={{ width: 44, height: 64, objectFit: "cover", borderRadius: 6 }} />}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>{r.name}</Typography>
                    <Typography noWrap sx={{ fontSize: "0.78rem", color: palette.textMuted }}>{[r.year, r.imdbId].filter(Boolean).join(" · ")}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
            <Button sx={{ mt: 1.5 }} onClick={() => { setForm({ ...EMPTY, name: search }); setPicked(true); setShowCatalog(true); }}>
              Elle gir
            </Button>
          </Box>
        )}

        {picked && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {(isNew || isAdmin) && (
              <>
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                  {form.cover && <img src={form.cover} alt="" style={{ width: 56, height: 80, objectFit: "cover", borderRadius: 8 }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>{form.name}</Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: palette.textMuted }}>
                      {[form.year, isSeries && form.totalSeasons ? `${form.totalSeasons} sezon` : form.runtime, form.imdbRating ? `IMDb ${form.imdbRating}` : null].filter(Boolean).join(" · ")}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => setShowCatalog((s) => !s)}>{showCatalog ? "Gizle" : "Katalog bilgisi"}</Button>
                </Box>
                <Collapse in={showCatalog}>{catalog}</Collapse>
              </>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mt: 1 }}>
              <TextField select label="İzleme durumu" value={form.watchStatus ?? ""} onChange={(e) => set("watchStatus", e.target.value as ScreenInput["watchStatus"])}>
                <MenuItem value="">—</MenuItem>
                {Object.entries(WATCH_STATUS_LABEL).map(([k, v]) => (
                  <MenuItem key={k} value={k}>{v}</MenuItem>
                ))}
              </TextField>
              <TextField type="number" label="Puanım (0-10)" value={form.score ?? 0} onChange={(e) => set("score", Number(e.target.value))} inputProps={{ step: 0.5, min: 0, max: 10 }} />
              {isSeries && (
                <TextField type="number" label={`İzlenen bölüm${form.totalEpisodes ? ` / ${form.totalEpisodes}` : ""}`} value={form.episodesWatched ?? 0}
                  onChange={(e) => set("episodesWatched", Math.max(0, Number(e.target.value)))} sx={{ gridColumn: { sm: "1 / -1" } }} />
              )}
              <TextField type="date" label="Başladım" InputLabelProps={{ shrink: true }} value={form.startedAt ?? ""} onChange={(e) => set("startedAt", e.target.value)} />
              <TextField type="date" label="Bitirdim" InputLabelProps={{ shrink: true }} value={form.finishedAt ?? ""} onChange={(e) => set("finishedAt", e.target.value)} />
            </Box>
            <FormControlLabel control={<Checkbox checked={Boolean(form.planToWatch)} onChange={(e) => set("planToWatch", e.target.checked)} />} label="Plan to Watch (izleyeceklerime ekle)" />
            <TextField label="Notlar" multiline minRows={2} value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {isNew && picked && <Button onClick={() => setPicked(false)}>Geri</Button>}
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" disabled={!picked || saving} onClick={save}>
          {saving ? "Kaydediliyor…" : "Kaydet"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
