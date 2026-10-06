"use client";

import React, { useEffect, useRef, useState } from "react";
import { Autocomplete, Box, Button, CircularProgress, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { DialogShell } from "./AnimeEditorDialog";
import AnimeForm, { AnimeDraft } from "./AnimeForm";
import { fieldBg, fieldBorder } from "../ui/FormControls";
import { AnimeService } from "../../Services/AnimeServices";
import { translateGenres } from "../../utils/genreTranslations";
import { palette } from "../../theme/customTheme";

type SearchResult = Record<string, any>;

const EMPTY: AnimeDraft = {
  Name: "",
  AnimeStatus: "Finished",
  WatchStatus: 0,
  TotalNumberOfEpisodes: 0,
  IsMovie: false,
  Score: 0,
  MALScore: 0,
  Genre: "",
  Series: 0,
  PlanToWatch: false,
  AnimeLink: "",
  MALAnimeLink: "",
  Cover: "",
  Notes: "",
};

function coverOf(a: SearchResult): string {
  return a?.images?.jpg?.large_image_url || a?.images?.jpg?.image_url || a?.image_url || a?.images?.image_url || "";
}

/** Arama sonucunu (AniList → MAL biçimi) forma uygun alanlara çevirir */
function fromSearch(a: SearchResult): AnimeDraft {
  const names = [...(a.genres ?? []), ...(a.themes ?? []), ...(a.demographics ?? [])].map((g: any) => g.name).filter(Boolean);
  return {
    Name: a.title || a.title_english || a.name || "",
    Cover: coverOf(a),
    AnimeStatus: a.airing ? "Currently Airing" : a.status === "NOT_YET_RELEASED" ? "Not yet aired" : "Finished",
    TotalNumberOfEpisodes: a.episodes || 0,
    IsMovie: a.type === "Movie",
    Genre: translateGenres(names.join(", ")),
    MALScore: a.score || 0,
    MALAnimeLink: a.url || "",
  };
}

export default function AnimeCreateDialog({
  open,
  onClose,
  genres,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  genres: { value: string; label: string }[];
  onCreate: (anime: AnimeDraft) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<AnimeDraft>(EMPTY);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    if (open) {
      setDraft(EMPTY);
      setQuery("");
      setResults([]);
    }
  }, [open]);

  // Yazmayı bırakınca ara; eski isteklerin sonuçları yenisini ezmesin
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }
    const id = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await AnimeService.searchAnime(query.trim(), 1);
        if (id === seq.current) setResults(res?.data?.data ?? []);
      } finally {
        if (id === seq.current) setSearching(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [query]);

  const save = async () => {
    setSaving(true);
    try {
      if (await onCreate(draft)) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Yeni anime"
      subtitle="AniList'te arayıp otomatik doldur ya da elle gir"
      headerExtra={
        <Box sx={{ pb: 2, pt: 1.5 }}>
          <Autocomplete
            options={results}
            filterOptions={(x) => x}
            loading={searching}
            inputValue={query}
            onInputChange={(_, v, reason) => {
              if (reason !== "reset") setQuery(v);
            }}
            onChange={(_, a) => {
              if (a) setDraft((d) => ({ ...d, ...fromSearch(a) }));
            }}
            getOptionLabel={(a) => a.title || a.name || ""}
            isOptionEqualToValue={(a, b) => (a.mal_id ?? a.id) === (b.mal_id ?? b.id)}
            noOptionsText={query.trim().length < 3 ? "En az 3 harf yaz" : "Sonuç yok"}
            loadingText="Aranıyor…"
            slotProps={{
              paper: { sx: { mt: 0.5, backgroundColor: palette.surfaceRaised, border: fieldBorder, borderRadius: "10px" } },
            }}
            renderOption={({ key, ...props }, a) => (
              <Box component="li" key={key} {...props} sx={{ display: "flex", gap: 1.5, alignItems: "center", py: "6px !important" }}>
                <Box component="img" src={coverOf(a)} alt="" sx={{ width: 34, height: 48, objectFit: "cover", borderRadius: "6px", flexShrink: 0, backgroundColor: palette.surface }} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: "0.88rem", fontWeight: 600 }}>
                    {a.title}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: "0.75rem", color: palette.textMuted }}>
                    {[a.type, a.episodes ? `${a.episodes} bölüm` : null, a.year, a.score ? `★ ${a.score}` : null].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
              </Box>
            )}
            renderInput={(params) => (
              <Box
                ref={params.InputProps.ref}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  height: 42,
                  px: 1.5,
                  borderRadius: "10px",
                  border: fieldBorder,
                  backgroundColor: fieldBg,
                  "&:focus-within": { borderColor: alpha(palette.primary, 0.6) },
                }}
              >
                <SearchRoundedIcon sx={{ fontSize: 20, color: palette.textMuted }} />
                <Box
                  component="input"
                  {...params.inputProps}
                  placeholder="AniList'te ara… (örn. Frieren)"
                  sx={{ flex: 1, border: 0, outline: 0, background: "transparent", color: palette.text, font: "inherit", fontSize: "0.9rem" }}
                />
                {searching && <CircularProgress size={16} />}
              </Box>
            )}
          />
        </Box>
      }
      footer={
        <>
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} sx={{ color: palette.textMuted }}>
            İptal
          </Button>
          <Button
            variant="contained"
            disabled={saving || !draft.Name}
            onClick={save}
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <AddRoundedIcon />}
          >
            Ekle
          </Button>
        </>
      }
    >
      <AnimeForm value={draft} onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))} genres={genres} />
    </DialogShell>
  );
}
