"use client";

// Admin tools on the manga detail page: link a MangaDex title and save its chapter list (metadata only),
// or upload a CBZ that is converted to WebP in the browser and stored in R2.

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControlLabel,
  LinearProgress,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChapterService, errorText, type Manga } from "../../Services/MangaService";
import { mangaDexChapters, searchMangaDex, type MangaDexHit } from "../../lib/mangadex";
import { readCbz, toWebp } from "../../lib/cbz";
import { palette } from "../../theme/customTheme";

const LANGS = [
  { code: "tr", label: "Türkçe" },
  { code: "en", label: "İngilizce" },
];

export function MangaDexPanel({ manga, onChanged }: { manga: Manga; onChanged: () => void }) {
  const [query, setQuery] = useState(manga.name);
  const [hits, setHits] = useState<MangaDexHit[] | null>(null);
  const [linked, setLinked] = useState(manga.mangadexId);
  const [langs, setLangs] = useState<string[]>(["tr", "en"]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ severity: "success" | "error"; text: string } | null>(null);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg({ severity: "error", text: errorText(e) });
    } finally {
      setBusy("");
    }
  };

  const search = () => run("search", async () => setHits(await searchMangaDex(query, manga.malId || undefined)));
  const link = (id: string) =>
    run("link", async () => {
      await ChapterService.linkMangaDex(manga.id, id);
      setLinked(id);
      setHits(null);
    });
  const importChapters = () =>
    run("import", async () => {
      const list = await mangaDexChapters(linked, langs);
      if (!list.length) return setMsg({ severity: "error", text: "Seçilen dillerde okunabilir bölüm yok" });
      const { saved } = await ChapterService.saveMangaDex(manga.id, list);
      setMsg({ severity: "success", text: `${saved} bölüm kaydedildi` });
      onChanged();
    });

  return (
    <Box>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>MangaDex</Typography>
      {msg && <Alert severity={msg.severity} sx={{ mb: 1 }}>{msg.text}</Alert>}
      {linked ? (
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted }}>
            Bağlı: <a href={`https://mangadex.org/title/${linked}`} target="_blank" rel="noreferrer" style={{ color: palette.primary }}>{linked.slice(0, 8)}…</a>
          </Typography>
          {LANGS.map((l) => (
            <FormControlLabel key={l.code} label={l.label} control={
              <Checkbox size="small" checked={langs.includes(l.code)} onChange={(e) => setLangs((s) => (e.target.checked ? [...s, l.code] : s.filter((x) => x !== l.code)))} />
            } />
          ))}
          <Button size="small" variant="contained" disabled={!langs.length || Boolean(busy)} onClick={importChapters}>
            {busy === "import" ? "Alınıyor…" : "Bölüm listesini güncelle"}
          </Button>
          <Button size="small" onClick={() => { setLinked(""); setHits(null); }}>Değiştir</Button>
        </Box>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField size="small" fullWidth value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} placeholder="MangaDex'te ara" />
            <Button variant="outlined" disabled={Boolean(busy)} onClick={search}>{busy === "search" ? <CircularProgress size={18} /> : "Ara"}</Button>
          </Box>
          {hits && !hits.length && <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted, mt: 1 }}>Sonuç yok</Typography>}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 1 }}>
            {hits?.map((h) => (
              <Box key={h.id} onClick={() => link(h.id)} sx={{ display: "flex", gap: 1.25, p: 0.75, borderRadius: "10px", cursor: "pointer", border: `1px solid ${alpha(palette.overlay, 0.08)}`, "&:hover": { backgroundColor: palette.surfaceRaised } }}>
                {h.cover && <img src={h.cover} alt="" referrerPolicy="no-referrer" style={{ width: 36, height: 52, objectFit: "cover", borderRadius: 4 }} />}
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                    {h.title} {manga.malId && h.malId === manga.malId ? "· MAL eşleşmesi" : ""}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: "0.72rem", color: palette.textMuted }}>
                    {[h.year, h.status, h.languages.filter((l) => l === "tr" || l === "en").join("/")].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}

export function CbzUploadPanel({ manga, nextNumber, onChanged }: { manga: Manga; nextNumber: number; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [number, setNumber] = useState(String(nextNumber));
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("tr");
  const [progress, setProgress] = useState<{ done: number; total: number; step: string } | null>(null);
  const [msg, setMsg] = useState<{ severity: "success" | "error"; text: string } | null>(null);

  const upload = async () => {
    if (!file) return;
    setMsg(null);
    try {
      setProgress({ done: 0, total: 1, step: "Açılıyor" });
      const pages = readCbz(await file.arrayBuffer());
      if (!pages.length) throw new Error("CBZ içinde resim bulunamadı");
      const chapter = await ChapterService.createUpload(manga.id, { number: Number(number) || 0, title, lang, pageCount: pages.length });
      for (let i = 0; i < pages.length; i++) {
        setProgress({ done: i, total: pages.length, step: `Sayfa ${i + 1}/${pages.length}` });
        const webp = await toWebp(pages[i].name, pages[i].data);
        await ChapterService.uploadPage(chapter.id, i + 1, webp);
      }
      setMsg({ severity: "success", text: `${pages.length} sayfa yüklendi` });
      setFile(null);
      setTitle("");
      setNumber(String((Number(number) || 0) + 1));
      onChanged();
    } catch (e) {
      setMsg({ severity: "error", text: `Yükleme başarısız: ${errorText(e)}` });
    } finally {
      setProgress(null);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>CBZ yükle</Typography>
      {msg && <Alert severity={msg.severity} sx={{ mb: 1 }}>{msg.text}</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "90px 1fr 80px" }, gap: 1 }}>
        <TextField size="small" label="Bölüm" type="number" value={number} onChange={(e) => setNumber(e.target.value)} />
        <TextField size="small" label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField size="small" label="Dil" value={lang} onChange={(e) => setLang(e.target.value.toLowerCase())} />
      </Box>
      <Box sx={{ display: "flex", gap: 1, mt: 1, alignItems: "center" }}>
        <Button component="label" variant="outlined" size="small">
          Dosya seç
          <input hidden type="file" accept=".cbz,.zip,application/zip,application/vnd.comicbook+zip" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </Button>
        <Typography noWrap sx={{ fontSize: "0.8rem", color: palette.textMuted, flex: 1 }}>{file?.name ?? "Dosya seçilmedi"}</Typography>
        <Button size="small" variant="contained" disabled={!file || Boolean(progress)} onClick={upload}>Yükle</Button>
      </Box>
      {progress && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress variant="determinate" value={(progress.done / progress.total) * 100} />
          <Typography sx={{ fontSize: "0.72rem", color: palette.textMuted, mt: 0.5 }}>{progress.step}</Typography>
        </Box>
      )}
    </Box>
  );
}
