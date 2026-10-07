"use client";

// Kitap ekleme ve düzenleme penceresi. Ekleme, Google Books (Worker üzerinden) ve Open Library'de birlikte
// aramayla başlar; ISBN ile de aranabilir. Sonuç yoksa elle girilir. Düzenleme kullanıcının kendi okuma
// verisini değiştirir; admin ortak katalog alanlarını da değiştirebilir.

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
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
import { BookService, errorText, openLibraryDescription, searchGoogleBooks, searchOpenLibrary, type Book, type BookHit, type BookInput } from "../../Services/BookService";
import { palette } from "../../theme/customTheme";
import { BOOK_STATUS_LABEL, LANGUAGE_LABEL, yearOf } from "./bookLabels";

type Props = {
  open: boolean;
  /** null = yeni kitap */
  book: Book | null;
  isAdmin: boolean;
  onClose: () => void;
  onSaved: (b: Book) => void;
};

const EMPTY: BookInput = {
  title: "",
  subtitle: "",
  authors: [],
  publisher: "",
  publishedDate: "",
  pageCount: 0,
  isbn: "",
  language: "",
  genres: [],
  description: "",
  cover: "",
  score: 0,
  readStatus: "",
  pagesRead: 0,
  planToRead: false,
  notes: "",
  startedAt: "",
  finishedAt: "",
};

const CATALOG_KEYS = ["title", "subtitle", "authors", "publisher", "publishedDate", "pageCount", "isbn", "language", "genres", "description", "cover", "googleId", "openLibraryKey"] as const;
const SOURCE_LABEL = { google: "Google Books", openlibrary: "Open Library" };

export default function BookEditorDialog({ open, book, isAdmin, onClose, onSaved }: Props) {
  const isNew = book === null;
  const [form, setForm] = useState<BookInput>(EMPTY);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BookHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState("");
  const [picked, setPicked] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(book ? { ...book } : EMPTY);
    setPicked(!isNew);
    setShowCatalog(false);
    setResults([]);
    setSearch("");
    setNotice("");
    setError("");
  }, [open, book, isNew]);

  // İki kaynakta birlikte arama (gecikmeli); biri hata verirse diğerinin sonuçları yine gösterilir
  useEffect(() => {
    if (!isNew || picked || search.trim().length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setSearching(true);
      const q = search.trim();
      const [google, ol] = await Promise.allSettled([searchGoogleBooks(q, ctrl.signal), searchOpenLibrary(q, ctrl.signal)]);
      if (ctrl.signal.aborted) return;
      setResults([...(google.status === "fulfilled" ? google.value : []), ...(ol.status === "fulfilled" ? ol.value : [])]);
      setNotice(google.status === "rejected" ? `Google Books: ${errorText(google.reason)}. Yalnızca Open Library sonuçları gösteriliyor.` : "");
      setError(google.status === "rejected" && ol.status === "rejected" ? `Arama başarısız: ${errorText(ol.reason)}` : "");
      setSearching(false);
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [search, isNew, picked]);

  const set = <K extends keyof BookInput>(k: K, v: BookInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  const pick = async (hit: BookHit) => {
    const { source: _source, ...fields } = hit;
    setForm((f) => ({ ...f, ...fields }));
    setPicked(true);
    // Open Library arama sonucu özeti içermez; eserin sayfasından alınır
    if (hit.source === "openlibrary" && hit.openLibraryKey && !hit.description) {
      const description = await openLibraryDescription(hit.openLibraryKey);
      if (description) setForm((f) => ({ ...f, description }));
    }
  };

  const save = async () => {
    if (!form.title?.trim()) return setError("Kitap adı boş olamaz");
    setSaving(true);
    try {
      const payload: BookInput = { ...form };
      // Admin olmayan kullanıcı düzenlerken katalog alanlarını göndermez (Worker zaten yok sayar)
      if (!isNew && !isAdmin) for (const k of CATALOG_KEYS) delete payload[k];
      onSaved(isNew ? await BookService.create(payload) : await BookService.update(book!.id, payload));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const listField = (label: string, key: "authors" | "genres") => (
    <TextField label={label} value={(form[key] ?? []).join(", ")} onChange={(e) => set(key, e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
  );

  const catalog = (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
      <TextField label="Kitap adı" value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} required />
      <TextField label="Alt başlık" value={form.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
      {listField("Yazar(lar) (virgülle)", "authors")}
      <TextField label="Yayınevi" value={form.publisher ?? ""} onChange={(e) => set("publisher", e.target.value)} />
      <TextField label="Yayın tarihi" placeholder="2016 ya da 2016-05-12" value={form.publishedDate ?? ""} onChange={(e) => set("publishedDate", e.target.value)} />
      <TextField type="number" label="Sayfa sayısı" value={form.pageCount ?? 0} onChange={(e) => set("pageCount", Number(e.target.value))} />
      <TextField label="ISBN" value={form.isbn ?? ""} onChange={(e) => set("isbn", e.target.value)} />
      <TextField select label="Dil" value={form.language ?? ""} onChange={(e) => set("language", e.target.value)}>
        <MenuItem value="">—</MenuItem>
        {Object.entries(LANGUAGE_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        {form.language && !LANGUAGE_LABEL[form.language] && <MenuItem value={form.language}>{form.language}</MenuItem>}
      </TextField>
      {listField("Türler (virgülle)", "genres")}
      <TextField label="Kapak adresi" value={form.cover ?? ""} onChange={(e) => set("cover", e.target.value)} />
      <TextField label="Özet" multiline minRows={2} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{isNew ? "Kitap ekle" : form.title}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {isNew && !picked && (
          <Box>
            <TextField autoFocus fullWidth label="Kitap adı, yazar ya da ISBN" value={search} onChange={(e) => setSearch(e.target.value)}
              InputProps={{ endAdornment: searching ? <CircularProgress size={18} /> : null }} />
            {notice && <Alert severity="info" sx={{ mt: 1.5 }}>{notice}</Alert>}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1.5, maxHeight: 380, overflowY: "auto" }}>
              {results.map((r, i) => (
                <Box key={`${r.source}-${r.googleId ?? r.openLibraryKey ?? i}`} onClick={() => pick(r)}
                  sx={{ display: "flex", gap: 1.5, p: 1, borderRadius: "10px", cursor: "pointer", border: `1px solid ${alpha(palette.overlay, 0.08)}`, "&:hover": { backgroundColor: palette.surfaceRaised } }}>
                  {r.cover ? (
                    <img src={r.cover} alt="" style={{ width: 44, height: 64, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                  ) : (
                    <Box sx={{ width: 44, height: 64, borderRadius: "6px", backgroundColor: palette.surfaceRaised, flexShrink: 0 }} />
                  )}
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography noWrap sx={{ fontWeight: 600 }}>{r.title}</Typography>
                    <Typography noWrap sx={{ fontSize: "0.78rem", color: palette.textMuted }}>
                      {[r.authors?.join(", "), yearOf(r.publishedDate ?? ""), r.pageCount ? `${r.pageCount} sayfa` : null, LANGUAGE_LABEL[r.language ?? ""] ?? r.language].filter(Boolean).join(" · ")}
                    </Typography>
                  </Box>
                  <Chip size="small" label={SOURCE_LABEL[r.source]} sx={{ alignSelf: "center", height: 20, fontSize: "0.65rem" }} />
                </Box>
              ))}
            </Box>
            <Button sx={{ mt: 1.5 }} onClick={() => { setForm({ ...EMPTY, title: search }); setPicked(true); setShowCatalog(true); }}>
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
                    <Typography sx={{ fontWeight: 600 }}>{form.title}</Typography>
                    <Typography sx={{ fontSize: "0.78rem", color: palette.textMuted }}>
                      {[form.authors?.join(", "), yearOf(form.publishedDate ?? ""), form.pageCount ? `${form.pageCount} sayfa` : null].filter(Boolean).join(" · ")}
                    </Typography>
                  </Box>
                  <Button size="small" onClick={() => setShowCatalog((s) => !s)}>{showCatalog ? "Gizle" : "Katalog bilgisi"}</Button>
                </Box>
                <Collapse in={showCatalog}>{catalog}</Collapse>
              </>
            )}

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, mt: 1 }}>
              <TextField select label="Okuma durumu" value={form.readStatus ?? ""} onChange={(e) => set("readStatus", e.target.value as BookInput["readStatus"])}>
                <MenuItem value="">—</MenuItem>
                {Object.entries(BOOK_STATUS_LABEL).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
              </TextField>
              <TextField type="number" label="Puanım (0-10)" value={form.score ?? 0} onChange={(e) => set("score", Number(e.target.value))} inputProps={{ step: 0.5, min: 0, max: 10 }} />
              <TextField type="number" label={`Okunan sayfa${form.pageCount ? ` / ${form.pageCount}` : ""}`} value={form.pagesRead ?? 0}
                onChange={(e) => set("pagesRead", Math.max(0, Number(e.target.value)))} sx={{ gridColumn: { sm: "1 / -1" } }} />
              <TextField type="date" label="Başladım" InputLabelProps={{ shrink: true }} value={form.startedAt ?? ""} onChange={(e) => set("startedAt", e.target.value)} />
              <TextField type="date" label="Bitirdim" InputLabelProps={{ shrink: true }} value={form.finishedAt ?? ""} onChange={(e) => set("finishedAt", e.target.value)} />
            </Box>
            <FormControlLabel control={<Checkbox checked={Boolean(form.planToRead)} onChange={(e) => set("planToRead", e.target.checked)} />} label="Plan to Read (okuyacaklarıma ekle)" />
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
