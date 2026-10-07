"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, Checkbox, CircularProgress, InputBase, LinearProgress, MenuItem, Select, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { toast } from "sonner";
import { DialogShell } from "./AnimeEditorDialog";
import { TextInput } from "../ui/FormControls";
import { AniMedia, ParsedNote, loadMedia, matchNote, mediaSubtitle, mediaTitle, noteToAnimeRow, parseNotes } from "../../lib/quickNotes";
import { animesToCsv, downloadBlob } from "../../lib/animeCsv";
import { AnimeService } from "../../Services/AnimeServices";
import { palette } from "../../theme/customTheme";
import { ANIME_DATA_CHANGED } from "./notesEvents";
import { requestOpenTabs, tabsToNoteLines } from "../../lib/openTabs";


type Row = {
  note: ParsedNote;
  status: "pending" | "matched" | "check" | "missing";
  media: AniMedia | null;
  candidates: AniMedia[];
  message?: string;
  include: boolean;
  score: number | null;
  inArchive: boolean;
};

const EXAMPLE = `Shingeki no Kyojin - 2 - 85
Vinland Saga 2. sezon - 9/10
https://myanimelist.net/anime/16498/Shingeki_no_Kyojin - 90
https://eski-site.com/anime/kimetsu-no-yaiba-2-sezon-izle - 80`;

const STATUS_UI = {
  matched: { icon: <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />, color: palette.success, label: "Eşleşti" },
  check: { icon: <WarningAmberRoundedIcon sx={{ fontSize: 18 }} />, color: palette.warning, label: "Kontrol et" },
  missing: { icon: <ErrorOutlineRoundedIcon sx={{ fontSize: 18 }} />, color: palette.danger, label: "Bulunamadı" },
  pending: { icon: <CircularProgress size={14} />, color: palette.textMuted, label: "Aranıyor" },
} as const;

const normalizeName = (s: string) => s.toLocaleLowerCase("tr").replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// source="tabs": eklentiden açık anime sekmeleri alınır ve eşleşenler watchlist'e (Plan to Watch) eklenir
export default function NotesImportDialog({ open, onClose, source = "notes" }: { open: boolean; onClose: () => void; source?: "notes" | "tabs" }) {
  const fromTabs = source === "tabs";
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [resolving, setResolving] = useState(false);
  const [importing, setImporting] = useState<{ done: number; failed: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  const parsedCount = useMemo(() => parseNotes(text).length, [text]);
  const [tabsState, setTabsState] = useState<"loading" | "none" | "noext" | "ready">(fromTabs ? "loading" : "ready");

  const loadTabs = async () => {
    setTabsState("loading");
    const tabs = await requestOpenTabs();
    if (tabs === null) return setTabsState("noext");
    const lines = tabsToNoteLines(tabs);
    setText(lines.join("\n"));
    if (!lines.length) return setTabsState("none");
    setTabsState("ready");
    resolve(lines.join("\n"));
  };

  useEffect(() => {
    if (fromTabs && open) loadTabs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromTabs, open]);

  const resolve = async (input: string = text) => {
    const notes = parseNotes(input);
    if (!notes.length) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setResolving(true);

    // Arşivde zaten olanlar işaretlenir (aynı isim içe aktarılınca güncellenir)
    let archive = new Set<string>();
    try {
      const res = await AnimeService.getAnimes({ page: 1, count: 100000, filters: [], orderBy: "Name", order: "asc" });
      archive = new Set((res?.data ?? []).map((a: any) => normalizeName(String(a.Name))));
    } catch {}

    const initial: Row[] = notes.map((note) => ({
      note,
      status: note.error ? "missing" : "pending",
      media: null,
      candidates: [],
      message: note.error,
      include: false,
      score: note.score,
      inArchive: false,
    }));
    setRows(initial);

    for (let i = 0; i < notes.length; i++) {
      if (ctrl.signal.aborted) break;
      if (notes[i].error) continue;
      try {
        const m = await matchNote(notes[i], ctrl.signal);
        setRows((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          const title = m.media ? mediaTitle(m.media) : "";
          next[i] = {
            ...next[i],
            media: m.media,
            candidates: m.candidates,
            status: !m.media ? "missing" : m.error ? "check" : "matched",
            message: m.error,
            include: Boolean(m.media),
            inArchive: Boolean(m.media) && archive.has(normalizeName(title)),
          };
          return next;
        });
      } catch (err: any) {
        if (ctrl.signal.aborted) break;
        setRows((prev) => {
          if (!prev) return prev;
          const next = [...prev];
          next[i] = { ...next[i], status: "missing", message: err?.message || "AniList hatası" };
          return next;
        });
      }
    }
    setResolving(false);
  };

  const chooseCandidate = async (index: number, id: number) => {
    const row = rows?.[index];
    if (!row) return;
    let media = row.candidates.find((c) => c.id === id) ?? null;
    if (media?.partial) {
      try {
        media = await loadMedia(id);
      } catch {
        toast.error("AniList kaydı alınamadı");
        return;
      }
    }
    if (!media) return;
    setRows((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = {
        ...next[index],
        media,
        candidates: next[index].candidates.map((c) => (c.id === media!.id ? media! : c)),
        status: "matched",
        message: undefined,
        include: true,
      };
      return next;
    });
  };

  const update = (index: number, patch: Partial<Row>) =>
    setRows((prev) => (prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev));

  const selected = (rows ?? []).filter((r) => r.include && r.media);
  const toAnimeRows = () =>
    selected.map((r) =>
      fromTabs
        ? // Yalnızca Plan to Watch işaretlenir; arşivdeki kaydın puanı ve bölümü korunur (0/boş alanlar yazılmaz)
          { ...noteToAnimeRow({ ...r.note, score: null }, r.media!), PlanToWatch: true, AnimeLink: r.note.link ?? "" }
        : noteToAnimeRow({ ...r.note, score: r.score }, r.media!)
    );

  const downloadCsv = () => {
    downloadBlob(animesToCsv(toAnimeRows()), `kiroku-notlar-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8");
  };

  const runImport = async () => {
    const list = toAnimeRows();
    const state = { done: 0, failed: 0 };
    setImporting({ ...state });
    for (const anime of list) {
      try {
        await AnimeService.createAnime(anime as TEATable.IAnime);
        state.done++;
      } catch {
        state.failed++;
      }
      setImporting({ ...state });
    }
    if (state.failed) toast.error(`${state.failed} anime eklenemedi`);
    toast.success(fromTabs ? `${state.done} anime watchlist'e eklendi` : `${state.done} anime içe aktarıldı`);
    window.dispatchEvent(new Event(ANIME_DATA_CHANGED));
    setImporting(null);
    onClose();
  };

  const counts = useMemo(() => {
    const c = { matched: 0, check: 0, missing: 0, pending: 0 };
    for (const r of rows ?? []) c[r.status]++;
    return c;
  }, [rows]);

  const busy = resolving || importing !== null;

  return (
    <DialogShell
      open={open}
      onClose={busy ? () => {} : onClose}
      maxWidth={rows ? 980 : 720}
      title={fromTabs ? "Açık sekmelerden watchlist'e" : "Notlardan içe aktar"}
      subtitle={
        fromTabs
          ? "Tarayıcıdaki Anizium, TRanimeizle, TürkAnime, MAL ve AniList sekmelerini AniList ile eşleştirip watchlist'e ekler"
          : 'Not defterindeki "isim - sezon - puan" ya da "link - puan" satırlarını AniList ile eşleştirip arşive uygun hâle getirir'
      }
      footer={
        rows ? (
          <>
            <Button startIcon={<ArrowBackRoundedIcon />} disabled={busy} onClick={() => setRows(null)} sx={{ color: palette.textMuted }}>
              {fromTabs ? "Listeyi düzenle" : "Notları düzenle"}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button startIcon={<DownloadRoundedIcon />} disabled={busy || !selected.length} onClick={downloadCsv} sx={{ color: palette.textMuted }}>
              CSV indir
            </Button>
            <Button
              variant="contained"
              disabled={busy || !selected.length}
              onClick={runImport}
              startIcon={importing ? <CircularProgress size={14} color="inherit" /> : <UploadFileRoundedIcon />}
            >
              {importing
                ? `${importing.done + importing.failed}/${selected.length}`
                : fromTabs
                  ? `${selected.length} animeyi watchlist'e ekle`
                  : `${selected.length} animeyi içe aktar`}
            </Button>
          </>
        ) : (
          <>
            <Box sx={{ flex: 1 }} />
            <Button onClick={onClose} sx={{ color: palette.textMuted }}>
              İptal
            </Button>
            {fromTabs && (
              <Button onClick={loadTabs} disabled={tabsState === "loading"} sx={{ color: palette.textMuted }}>
                Sekmeleri yeniden oku
              </Button>
            )}
            <Button variant="contained" disabled={!parsedCount} onClick={() => resolve()} startIcon={<AutoFixHighRoundedIcon />}>
              {parsedCount ? `${parsedCount} satırı çözümle` : "Çözümle"}
            </Button>
          </>
        )
      }
    >
      {!rows ? (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {fromTabs && tabsState === "loading" && <LinearProgress sx={{ height: 4, borderRadius: 2 }} />}
          {fromTabs && tabsState === "noext" && (
            <Alert severity="warning" sx={{ borderRadius: "8px" }}>
              Kiroku eklentisine ulaşılamadı. Eklentiyi (16.2 veya üstü) yükleyip bu sayfayı yenile; ya da linkleri aşağıya elle yapıştır.
            </Alert>
          )}
          {fromTabs && tabsState === "none" && (
            <Alert severity="info" sx={{ borderRadius: "8px" }}>
              Açık Anizium, TRanimeizle, TürkAnime, MAL ya da AniList anime sekmesi bulunamadı.
            </Alert>
          )}
          <Typography sx={{ fontSize: "0.85rem", color: palette.textMuted, lineHeight: 1.6 }}>
            Her satıra bir anime. Desteklenenler: <b>isim - sezon - puan</b>, <b>isim S2 | 8.5</b>, <b>MAL / AniList linki - puan</b> ve eski izleme sitelerinin linkleri (linkteki
            kebab-case isim ve sezon çıkarılır). Puan 10&apos;luk yazıldıysa 100&apos;lüğe çevrilir. Eksik bilgiler (bölüm, durum, türler, kapak, MAL puanı) AniList&apos;ten gelir.
          </Typography>
          <TextInput
            multiline
            minRows={10}
            maxRows={18}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            inputProps={{ "aria-label": "Notlar", spellCheck: false }}
            sx={{ fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace", fontSize: "0.85rem" }}
            fullWidth
          />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.md,.csv,text/plain"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setText(await f.text());
                e.target.value = "";
              }}
            />
            <Button size="small" startIcon={<UploadFileRoundedIcon />} onClick={() => fileRef.current?.click()} sx={{ color: palette.textMuted }}>
              .txt dosyası seç
            </Button>
            <Box sx={{ flex: 1 }} />
            <Typography sx={{ fontSize: "0.78rem", color: palette.textFaint }}>{parsedCount} satır tanındı</Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ display: "grid", gap: 1.5 }}>
          {resolving && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={rows.length ? ((rows.length - counts.pending) / rows.length) * 100 : 0}
                sx={{ height: 6, borderRadius: 3, mb: 0.5 }}
              />
              <Typography sx={{ fontSize: "0.78rem", color: palette.textMuted }}>
                AniList&apos;te aranıyor… {rows.length - counts.pending}/{rows.length}
              </Typography>
            </Box>
          )}
          {!resolving && (
            <Box sx={{ display: "flex", gap: 2, fontSize: "0.82rem", color: palette.textMuted, flexWrap: "wrap" }}>
              <span style={{ color: palette.success }}>{counts.matched} eşleşti</span>
              <span style={{ color: palette.warning }}>{counts.check} kontrol et</span>
              <span style={{ color: palette.danger }}>{counts.missing} bulunamadı</span>
              <span>· seçili {selected.length}</span>
            </Box>
          )}
          {counts.check > 0 && !resolving && (
            <Alert severity="warning" sx={{ borderRadius: "8px", py: 0 }}>
              Sarı satırlarda sezon tam bulunamadı; açılır listeden doğru sezonu seç.
            </Alert>
          )}

          <Box sx={{ borderRadius: "10px", border: `1px solid ${alpha(palette.overlay, 0.06)}`, overflow: "hidden" }}>
            {rows.map((r, i) => {
              const ui = STATUS_UI[r.status];
              return (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "28px 40px 1fr", md: "28px minmax(0, 0.9fr) 40px minmax(0, 1.4fr) 72px" },
                    alignItems: "center",
                    columnGap: 1.5,
                    rowGap: 0.5,
                    px: 1.25,
                    py: 1,
                    borderTop: i ? `1px solid ${alpha(palette.overlay, 0.05)}` : 0,
                    opacity: r.include || r.status === "pending" ? 1 : 0.55,
                  }}
                >
                  <Checkbox
                    size="small"
                    checked={r.include}
                    disabled={!r.media || busy}
                    onChange={(e) => update(i, { include: e.target.checked })}
                    inputProps={{ "aria-label": `${r.note.raw} satırını dahil et` }}
                    sx={{ p: 0.25 }}
                  />
                  {/* Orijinal satır ve çıkarılan bilgi */}
                  <Box sx={{ minWidth: 0, display: { xs: "none", md: "block" } }}>
                    <Tooltip title={r.note.raw}>
                      <Typography noWrap sx={{ fontSize: "0.78rem", color: palette.textFaint, fontFamily: "ui-monospace, Consolas, monospace" }}>
                        {r.note.raw}
                      </Typography>
                    </Tooltip>
                    <Typography noWrap sx={{ fontSize: "0.8rem", color: palette.textMuted }}>
                      {[r.note.name || (r.note.malId ? `MAL #${r.note.malId}` : r.note.anilistId ? `AniList #${r.note.anilistId}` : "—"), r.note.season ? `${r.note.season}. sezon` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 40, height: 56, borderRadius: "6px", overflow: "hidden", backgroundColor: palette.surfaceRaised }}>
                    {r.media?.coverImage && (
                      <img src={r.media.coverImage.large ?? r.media.coverImage.extraLarge ?? ""} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    )}
                  </Box>
                  {/* Eşleşme */}
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: ui.color, mb: 0.25 }}>
                      {ui.icon}
                      <Typography sx={{ fontSize: "0.72rem", fontWeight: 600 }}>{ui.label}</Typography>
                      {r.inArchive && (
                        <Typography sx={{ fontSize: "0.72rem", color: palette.textMuted }}>· arşivde var, güncellenecek</Typography>
                      )}
                    </Box>
                    {r.candidates.length > 1 ? (
                      <Select
                        size="small"
                        value={r.media?.id ?? ""}
                        disabled={busy}
                        onChange={(e) => chooseCandidate(i, Number(e.target.value))}
                        fullWidth
                        renderValue={() => (r.media ? `${mediaTitle(r.media)} — ${mediaSubtitle(r.media)}` : "")}
                        sx={{ fontSize: "0.85rem", height: 32, borderRadius: "8px", "& .MuiSelect-select": { py: 0.5 } }}
                      >
                        {r.candidates.map((c) => (
                          <MenuItem key={c.id} value={c.id} sx={{ fontSize: "0.85rem" }}>
                            <Box>
                              <div>{mediaTitle(c)}</div>
                              <Typography sx={{ fontSize: "0.72rem", color: palette.textMuted }}>{mediaSubtitle(c)}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    ) : (
                      <Typography noWrap sx={{ fontSize: "0.88rem", fontWeight: 600 }}>
                        {r.media ? mediaTitle(r.media) : r.message ?? "—"}
                        {r.media && <Box component="span" sx={{ ml: 1, fontWeight: 400, color: palette.textMuted, fontSize: "0.78rem" }}>{mediaSubtitle(r.media)}</Box>}
                      </Typography>
                    )}
                    {r.message && r.media && <Typography sx={{ fontSize: "0.72rem", color: palette.warning, mt: 0.25 }}>{r.message}</Typography>}
                    <Typography noWrap sx={{ display: { md: "none" }, fontSize: "0.72rem", color: palette.textFaint, mt: 0.25 }}>
                      {r.note.raw}
                    </Typography>
                  </Box>
                  {/* Puan */}
                  <Box sx={{ gridColumn: { xs: "3", md: "auto" }, visibility: fromTabs ? "hidden" : "visible" }}>
                    <InputBase
                      type="number"
                      value={r.score ?? ""}
                      placeholder="Puan"
                      disabled={busy}
                      onChange={(e) => update(i, { score: e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value))) })}
                      inputProps={{ min: 0, max: 100, "aria-label": "Puan" }}
                      sx={{
                        width: 72,
                        height: 32,
                        px: 1,
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        border: `1px solid ${alpha(palette.overlay, 0.08)}`,
                        backgroundColor: alpha(palette.overlay, 0.03),
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ fontSize: "0.75rem", color: palette.textFaint }}>
            {fromTabs
              ? "Seçilenler Plan to Watch olarak işaretlenip watchlist'in sonuna eklenir. Arşivde olan animelerin puanı ve izlenen bölümü değişmez."
              : 'Puanı olan animeler izlenmiş (bütün bölümler) kabul edilir. Aynı isimde arşivde olan kayıtlar güncellenir. CSV, "CSV ile toplu ekle" ile de içe aktarılabilir.'}
          </Typography>
        </Box>
      )}
    </DialogShell>
  );
}
