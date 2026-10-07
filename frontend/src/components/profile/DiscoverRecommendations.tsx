"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Box, Button, CircularProgress, IconButton, Skeleton, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ShuffleRoundedIcon from "@mui/icons-material/ShuffleRounded";
import BookmarkAddRoundedIcon from "@mui/icons-material/BookmarkAddRounded";
import BookmarkAddedRoundedIcon from "@mui/icons-material/BookmarkAddedRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { Discovery, buildTasteProfile, discover, discoveryTitle, discoveryToAnime } from "../../lib/discover";
import { AnimeService } from "../../Services/AnimeServices";
import { palette } from "../../theme/customTheme";

const FORMAT_TR: Record<string, string> = { TV: "TV", TV_SHORT: "TV kısa", MOVIE: "Film", ONA: "ONA" };

function DiscoveryCard({ d, added, onAdd, onWatched, onHide }: { d: Discovery; added: boolean; onAdd: () => void; onWatched: () => void; onHide: () => void }) {
  const m = d.media;
  const score = m.averageScore ?? 0;
  const scoreColor = score >= 85 ? palette.success : score >= 70 ? palette.warning : palette.textMuted;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: "10px",
          overflow: "hidden",
          backgroundColor: palette.surfaceRaised,
          boxShadow: `0 10px 24px rgba(0,0,0,0.4), 0 0 0 1px ${alpha(palette.overlay, 0.06)}`,
          "&:hover .disc-actions": { opacity: 1 },
        }}
      >
        {m.coverImage && (
          <img src={m.coverImage.large ?? m.coverImage.extraLarge ?? ""} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        {score > 0 && (
          <Box
            sx={{
              position: "absolute",
              right: 6,
              bottom: 6,
              minWidth: 34,
              height: 24,
              px: 0.75,
              borderRadius: "7px",
              display: "grid",
              placeItems: "center",
              fontSize: "0.75rem",
              fontWeight: 700,
              color: scoreColor,
              backgroundColor: alpha("#000000", 0.7),
              border: `1px solid ${alpha(scoreColor, 0.35)}`,
            }}
          >
            {score}
          </Box>
        )}
        {d.kind === "sequel" && (
          <Box sx={{ position: "absolute", left: 6, top: 6, px: 0.75, py: 0.25, borderRadius: "6px", fontSize: "0.68rem", fontWeight: 700, color: palette.ink, backgroundColor: palette.accent }}>
            Devamı
          </Box>
        )}
        <Box
          className="disc-actions"
          sx={{
            position: "absolute",
            inset: "auto 0 0 0",
            display: "flex",
            justifyContent: "center",
            gap: 0.5,
            py: 0.75,
            opacity: { xs: 1, md: 0 },
            transition: "opacity .2s ease",
            background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
          }}
        >
          <Tooltip title={added ? "İzleneceklerde" : "İzleneceklere ekle"}>
            <span>
              <IconButton size="small" onClick={onAdd} disabled={added} aria-label="İzleneceklere ekle" sx={{ color: added ? palette.success : "#fff", backgroundColor: alpha("#000000", 0.5) }}>
                {added ? <BookmarkAddedRoundedIcon fontSize="small" /> : <BookmarkAddRoundedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="İzledim (bitirdiklerime ekle, bir daha önerme)">
            <IconButton size="small" onClick={onWatched} aria-label="İzledim" sx={{ color: "#fff", backgroundColor: alpha("#000000", 0.5) }}>
              <TaskAltRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="İlgilenmiyorum (bir daha önerme)">
            <IconButton size="small" onClick={onHide} aria-label="İlgilenmiyorum" sx={{ color: "#fff", backgroundColor: alpha("#000000", 0.5) }}>
              <VisibilityOffRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="AniList'te aç">
            <IconButton size="small" component="a" href={m.siteUrl} target="_blank" rel="noopener noreferrer" aria-label="AniList'te aç" sx={{ color: "#fff", backgroundColor: alpha("#000000", 0.5) }}>
              <OpenInNewRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      <Typography noWrap title={discoveryTitle(m)} sx={{ mt: 0.75, fontWeight: 600, fontSize: "0.82rem" }}>
        {discoveryTitle(m)}
      </Typography>
      <Typography sx={{ fontSize: "0.7rem", color: palette.textFaint }}>
        {[FORMAT_TR[m.format ?? ""] ?? m.format, m.seasonYear, m.episodes ? `${m.episodes} bölüm` : null].filter(Boolean).join(" · ")}
      </Typography>
      <Typography sx={{ fontSize: "0.72rem", color: palette.textMuted, mt: 0.25, lineHeight: 1.35 }}>{d.reason}</Typography>
    </Box>
  );
}

const hiddenKey = (userId?: number) => `kiroku:discover-hidden:${userId ?? "guest"}`;
function loadHidden(userId?: number): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(hiddenKey(userId)) || "[]");
    return Array.isArray(v) ? v.filter((x) => Number.isInteger(x)) : [];
  } catch {
    return [];
  }
}
function saveHidden(userId: number | undefined, ids: number[]) {
  try {
    localStorage.setItem(hiddenKey(userId), JSON.stringify(ids.slice(-2000)));
  } catch {}
}

const coverGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 2 };

/** Arşivde olmayan, zevke göre AniList önerileri; her "Karıştır" farklı bir seçki getirir */
export default function DiscoverRecommendations({ catalog }: { catalog: TEATable.IAnime[] | null }) {
  const [items, setItems] = useState<Discovery[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [round, setRound] = useState(0);
  const shown = useRef<Set<number>[]>([]);
  const abort = useRef<AbortController | null>(null);

  const { user } = useAuth();
  // Bu oturumda eklenenler ve "ilgilenmiyorum" denenler bir daha önerilmez
  const excluded = useRef<Set<number>>(new Set());
  useEffect(() => {
    for (const id of loadHidden(user?.id)) excluded.current.add(id);
  }, [user?.id]);
  const profile = useMemo(() => (catalog ? buildTasteProfile(catalog, loadHidden(user?.id)) : null), [catalog, user?.id]);
  const exclude = (id: number) => {
    excluded.current.add(id);
    profile?.excludedIds.add(id);
    setItems((list) => (list ? list.filter((x) => x.media.id !== id) : list));
  };

  const shuffle = useCallback(async () => {
    if (!profile) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setLoading(true);
    setError(null);
    try {
      // Son iki seçkide gösterilenler bu turda geri plana itilir
      const recent = new Set(shown.current.flatMap((s) => [...s]));
      const list = await discover(profile, { count: 12, recentlyShown: recent, signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      shown.current = [new Set(list.map((d) => d.media.id)), ...shown.current].slice(0, 2);
      setItems(list);
      setRound((r) => r + 1);
    } catch (err: any) {
      if (!ctrl.signal.aborted) setError(err?.message || "Öneriler alınamadı");
    } finally {
      if (!ctrl.signal.aborted) setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    if (profile && !items && !loading) shuffle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);
  useEffect(() => () => abort.current?.abort(), []);

  const add = async (d: Discovery) => {
    try {
      await AnimeService.createAnime(discoveryToAnime(d.media) as unknown as TEATable.IAnime);
      setAdded((s) => new Set(s).add(d.media.id));
      profile?.excludedIds.add(d.media.id);
      toast.success(`${discoveryTitle(d.media)} izleneceklere eklendi`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Eklenemedi");
    }
  };

  const markWatched = async (d: Discovery) => {
    try {
      const anime = { ...discoveryToAnime(d.media), PlanToWatch: false, WatchStatus: d.media.episodes ?? 0 };
      await AnimeService.createAnime(anime as unknown as TEATable.IAnime);
      exclude(d.media.id);
      toast.success(`${discoveryTitle(d.media)} bitirdiklerine eklendi`, { description: "Arşivden puan verebilirsin; puanın sonraki önerileri de etkiler." });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Eklenemedi");
    }
  };

  const hide = (d: Discovery) => {
    exclude(d.media.id);
    saveHidden(user?.id, [...loadHidden(user?.id), d.media.id]);
    toast(`${discoveryTitle(d.media)} bir daha önerilmeyecek`);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Typography sx={{ flex: 1, minWidth: 220, color: palette.textMuted, fontSize: "0.82rem" }}>
          Arşivinde olmayan animeler; sevdiğin animelerin benzerleri ve puanladığın türlerden. Her karıştırmada farklı bir seçki gelir.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={shuffle}
          disabled={loading || !profile}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <ShuffleRoundedIcon />}
          sx={{ borderRadius: "8px" }}
        >
          Karıştır
        </Button>
      </Box>
      {error && <Typography sx={{ color: palette.danger, fontSize: "0.85rem", mb: 1.5 }}>{error}</Typography>}
      {!items ? (
        <Box sx={coverGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" sx={{ aspectRatio: "2 / 3", height: "auto", borderRadius: "10px", bgcolor: alpha(palette.overlay, 0.04) }} />
          ))}
        </Box>
      ) : items.length === 0 ? (
        <Typography sx={{ color: palette.textMuted, fontSize: "0.85rem" }}>Bu turda uygun anime çıkmadı, tekrar karıştır.</Typography>
      ) : (
        <Box sx={{ ...coverGrid, opacity: loading ? 0.5 : 1, transition: "opacity .2s ease" }}>
          <AnimatePresence mode="popLayout">
            {items.map((d, i) => (
              <motion.div
                key={`${round}-${d.media.id}`}
                initial={{ opacity: 0, y: 12, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 30, delay: i * 0.03 }}
                style={{ minWidth: 0 }}
              >
                <DiscoveryCard d={d} added={added.has(d.media.id)} onAdd={() => add(d)} onWatched={() => markWatched(d)} onHide={() => hide(d)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      )}
    </Box>
  );
}
