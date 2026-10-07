"use client";

// Chapter tools on the manga detail page. Admins link a MangaDex title and save its chapter list (metadata
// only). Every user can point the browser at their own manga library (WebDAV or a local folder) and register
// CBZ files that are already there; the browser extension's downloader registers them the same way.

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  MenuItem,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { ChapterService, errorText, type Manga } from "../../Services/MangaService";
import { mangaDexChapters, searchMangaDex, type MangaDexHit } from "../../lib/mangadex";
import { openCbz } from "../../lib/cbz";
import { canPickFolder, libraryPath, loadLibrary, localFolderName, pickLocalFolder, saveLibrary, type LibraryConfig } from "../../lib/library";
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

export function LibrarySettings() {
  const [cfg, setCfg] = useState<LibraryConfig>(() => loadLibrary());
  const [folder, setFolder] = useState(localFolderName());
  const [saved, setSaved] = useState(false);
  const set = (p: Partial<LibraryConfig>) => {
    setSaved(false);
    setCfg((c) => ({ ...c, ...p }));
  };
  return (
    <Box>
      <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Manga kütüphanem</Typography>
      <Typography sx={{ fontSize: "0.75rem", color: palette.textMuted, mb: 1 }}>
        CBZ dosyaları kendi sunucunda ya da bilgisayarında durur; bu ayarlar yalnızca bu tarayıcıda saklanır ve Kiroku&apos;ya gönderilmez.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "140px 1fr" }, gap: 1 }}>
        <TextField size="small" select label="Tür" value={cfg.kind} onChange={(e) => set({ kind: e.target.value as LibraryConfig["kind"] })}>
          <MenuItem value="webdav">WebDAV</MenuItem>
          <MenuItem value="local">Yerel klasör</MenuItem>
        </TextField>
        {cfg.kind === "webdav" ? (
          <TextField size="small" label="Kütüphane adresi" placeholder="https://…/Manga" value={cfg.url} onChange={(e) => set({ url: e.target.value.trim() })} />
        ) : (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Button size="small" variant="outlined" disabled={!canPickFolder()} onClick={() => pickLocalFolder().then(setFolder).catch(() => {})}>Klasör seç</Button>
            <Typography noWrap sx={{ fontSize: "0.8rem", color: palette.textMuted }}>
              {folder || (canPickFolder() ? "Bu sekme için seçilmedi" : "Tarayıcı klasör seçmeyi desteklemiyor; okuyucuda dosya seçebilirsin")}
            </Typography>
          </Box>
        )}
        {cfg.kind === "webdav" && (
          <>
            <TextField size="small" label="Kullanıcı" value={cfg.username} onChange={(e) => set({ username: e.target.value })} />
            <TextField size="small" type="password" label="Şifre" value={cfg.password} onChange={(e) => set({ password: e.target.value })} />
          </>
        )}
      </Box>
      <Button size="small" sx={{ mt: 1 }} variant="contained" onClick={() => { saveLibrary(cfg); setSaved(true); }}>{saved ? "Kaydedildi" : "Kaydet"}</Button>
    </Box>
  );
}

// Registers a CBZ that already sits in the library. Picking the file (optional) fills page count and
// ComicInfo.xml fields; the file itself is only read locally and never uploaded.
export function LibraryChapterForm({ manga, nextNumber, onChanged }: { manga: Manga; nextNumber: number; onChanged: () => void }) {
  const [number, setNumber] = useState(String(nextNumber));
  const [title, setTitle] = useState("");
  const [lang, setLang] = useState("tr");
  const [scanlator, setScanlator] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ severity: "success" | "error"; text: string } | null>(null);
  const autoPath = libraryPath(manga.name, Number(number) || 0, title);

  const inspect = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { pages, comicInfo } = await openCbz(await file.arrayBuffer());
      setPageCount(pages.length);
      if (comicInfo.Number) setNumber(comicInfo.Number);
      if (comicInfo.Title) setTitle(comicInfo.Title);
      if (comicInfo.LanguageISO) setLang(comicInfo.LanguageISO.toLowerCase());
      if (comicInfo.Translator || comicInfo.ScanInformation) setScanlator(comicInfo.Translator || comicInfo.ScanInformation);
      setPath(`${libraryPath(manga.name, 0).split("/")[0]}/${file.name}`);
    } catch (e) {
      setMsg({ severity: "error", text: `CBZ okunamadı: ${errorText(e)}` });
    }
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await ChapterService.register(manga.id, { filePath: path || autoPath, number: Number(number) || 0, title, lang, scanlator, pageCount });
      setMsg({ severity: "success", text: "Bölüm eklendi" });
      setTitle("");
      setPath("");
      setPageCount(0);
      setNumber(String((Number(number) || 0) + 1));
      onChanged();
    } catch (e) {
      setMsg({ severity: "error", text: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 600, mb: 1 }}>Kütüphaneden bölüm ekle</Typography>
      {msg && <Alert severity={msg.severity} sx={{ mb: 1 }}>{msg.text}</Alert>}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "90px 1fr 80px" }, gap: 1 }}>
        <TextField size="small" label="Bölüm" type="number" value={number} onChange={(e) => setNumber(e.target.value)} />
        <TextField size="small" label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField size="small" label="Dil" value={lang} onChange={(e) => setLang(e.target.value.toLowerCase())} />
        <TextField size="small" label="Çeviri grubu" value={scanlator} onChange={(e) => setScanlator(e.target.value)} sx={{ gridColumn: { sm: "1 / -1" } }} />
        <TextField size="small" label="Dosya yolu" placeholder={autoPath} value={path} onChange={(e) => setPath(e.target.value)} helperText={pageCount ? `${pageCount} sayfa` : "Kütüphane köküne göre"} sx={{ gridColumn: { sm: "1 / -1" } }} />
      </Box>
      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
        <Button component="label" size="small" variant="outlined">
          CBZ&apos;den doldur
          <input hidden type="file" accept=".cbz,.zip" onChange={(e) => inspect(e.target.files?.[0])} />
        </Button>
        <Button size="small" variant="contained" disabled={busy} onClick={save}>Ekle</Button>
      </Box>
    </Box>
  );
}
