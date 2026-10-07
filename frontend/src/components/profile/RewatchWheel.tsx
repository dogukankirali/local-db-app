"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { GenreChip, GenreChips, genreLabel } from "../Common/GenreChip";
import { sizedCover } from "../../utils/cover";
import { palette } from "../../theme/customTheme";

const SIZE = 300;
const R = 140;
const MAX_SEGMENTS = 12;
const SPIN_SECONDS = 4.6;
const HUES = [262, 199, 160, 43, 330, 12, 186, 28, 84, 280, 220, 140];

const finished = (a: TEATable.IAnime) => {
  const total = parseInt(String(a.TotalNumberOfEpisodes)) || 0;
  const watched = Number(a.WatchStatus) || 0;
  return a.InMyList !== false && total > 0 && watched >= total;
};

const genresOf = (a: TEATable.IAnime) => [
  ...new Set(
    String(a.Genre ?? "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean)
      .map(genreLabel)
  ),
];

function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function wedgePath(i: number, n: number) {
  if (n === 1) return `M 0 ${-R} A ${R} ${R} 0 1 1 -0.01 ${-R} Z`;
  const a0 = (i / n) * 2 * Math.PI - Math.PI / 2;
  const a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M 0 0 L ${R * Math.cos(a0)} ${R * Math.sin(a0)} A ${R} ${R} 0 ${large} 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)} Z`;
}

const short = (s: string, n = 16) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Bitirdiği animelerden rastgele birini seçen çark; isteğe bağlı tür filtresi */
export default function RewatchWheel({ catalog }: { catalog: TEATable.IAnime[] | null }) {
  const pool = useMemo(() => (catalog ?? []).filter(finished), [catalog]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [segments, setSegments] = useState<TEATable.IAnime[]>([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<TEATable.IAnime | null>(null);
  const [pending, setPending] = useState<TEATable.IAnime | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);

  // Animasyon karesi gelmese de (arka plandaki sekme) sonuç süre dolunca gösterilir
  const settle = (chosen: TEATable.IAnime | null) => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = null;
    setSpinning(false);
    setWinner(chosen);
  };

  const genreOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of pool) for (const g of genresOf(a)) counts.set(g, (counts.get(g) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]).map(([g, n]) => ({ g, n }));
  }, [pool]);

  // Seçili türlerden herhangi birini içerenler
  const filtered = useMemo(
    () => (selectedGenres.length ? pool.filter((a) => genresOf(a).some((g) => selectedGenres.includes(g))) : pool),
    [pool, selectedGenres]
  );

  // Çark boşken de dolu görünsün: filtreden rastgele bir önizleme
  const preview = useMemo(() => shuffled(filtered).slice(0, MAX_SEGMENTS), [filtered]);
  const shown = segments.length ? segments : preview;
  const n = Math.max(shown.length, 1);

  const spin = () => {
    if (!filtered.length || spinning) return;
    const chosen = filtered[Math.floor(Math.random() * filtered.length)];
    const others = shuffled(filtered.filter((a) => a.ID !== chosen.ID)).slice(0, MAX_SEGMENTS - 1);
    const segs = shuffled([chosen, ...others]);
    const k = segs.findIndex((a) => a.ID === chosen.ID);
    const seg = 360 / segs.length;
    // İbre üstte; k. dilimin ortası üste gelecek şekilde (dilim içinde küçük bir sapmayla) en az 5 tur döner
    const jitter = (Math.random() - 0.5) * seg * 0.6;
    const target = (((-(k + 0.5) * seg + jitter) % 360) + 360) % 360;
    const base = rotation - (((rotation % 360) + 360) % 360);
    setSegments(segs);
    setWinner(null);
    setPending(chosen);
    setSpinning(true);
    setRotation(base + 360 * 6 + target);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(chosen), SPIN_SECONDS * 1000 + 250);
  };

  const toggleGenre = (g: string) => {
    if (spinning) return;
    setSegments([]);
    setWinner(null);
    setSelectedGenres((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]));
  };

  if (catalog && !pool.length) {
    return <Typography sx={{ color: palette.textMuted, fontSize: "0.85rem" }}>Bitirdiğin bir anime yok; bölümlerini tamamladığın animeler çarka girer.</Typography>;
  }

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: `${SIZE + 20}px minmax(0, 1fr)` }, gap: 3, alignItems: "start" }}>
      {/* Çark */}
      <Box sx={{ position: "relative", width: SIZE, height: SIZE + 14, mx: "auto" }}>
        {/* İbre */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 2,
            width: 0,
            height: 0,
            borderLeft: "12px solid transparent",
            borderRight: "12px solid transparent",
            borderTop: `22px solid ${palette.text}`,
            filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.5))",
          }}
        />
        <motion.div
          animate={{ rotate: rotation }}
          transition={spinning ? { duration: SPIN_SECONDS, ease: [0.12, 0.8, 0.18, 1] } : { duration: 0 }}
          onAnimationComplete={() => {
            if (spinning) settle(pending);
          }}
          style={{ position: "absolute", top: 14, left: 0, width: SIZE, height: SIZE }}
        >
          <svg viewBox={`${-SIZE / 2} ${-SIZE / 2} ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label="Rewatch çarkı">
            <circle r={R + 6} fill={palette.surfaceRaised} stroke={alpha("#FFFFFF", 0.08)} />
            {shown.map((a, i) => {
              const hue = HUES[i % HUES.length];
              const mid = ((i + 0.5) / n) * 360;
              const isWinner = winner && a.ID === winner.ID;
              return (
                <g key={`${a.ID}-${i}`}>
                  <path
                    d={wedgePath(i, n)}
                    fill={`hsl(${hue} 55% ${isWinner ? 52 : 34}%)`}
                    stroke={palette.surface}
                    strokeWidth={1.5}
                  />
                  <text
                    transform={`rotate(${mid - 90}) translate(${R - 12} 0)`}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="#fff"
                    fontSize={n > 8 ? 10 : 11.5}
                    fontWeight={600}
                    style={{ pointerEvents: "none" }}
                  >
                    {short(a.Name, n > 8 ? 12 : 14)}
                  </text>
                </g>
              );
            })}
            {!shown.length && <text textAnchor="middle" fill={palette.textMuted} fontSize={12}>Bu türde bitirdiğin anime yok</text>}
          </svg>
        </motion.div>
        <Button
          variant="contained"
          onClick={spin}
          disabled={spinning || !filtered.length}
          aria-label="Çarkı çevir"
          sx={{
            position: "absolute",
            top: 14 + SIZE / 2,
            left: SIZE / 2,
            transform: "translate(-50%, -50%)",
            zIndex: 3,
            width: 74,
            height: 74,
            minWidth: 0,
            borderRadius: "50%",
            fontWeight: 800,
            fontSize: "0.85rem",
            boxShadow: `0 0 0 6px ${palette.surface}, 0 10px 24px rgba(0,0,0,0.5)`,
          }}
        >
          {spinning ? "…" : "Çevir"}
        </Button>
      </Box>

      {/* Filtre ve sonuç */}
      <Box sx={{ minWidth: 0, display: "grid", gap: 2 }}>
        <Box>
          <Typography sx={{ fontSize: "0.82rem", color: palette.textMuted, mb: 1 }}>
            {selectedGenres.length ? `${filtered.length} anime seçili türlerde` : `Bitirdiğin ${pool.length} animenin hepsi çarkta`} · tür seçmezsen tüm listeden gelir
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, maxHeight: 96, overflowY: "auto" }}>
            {genreOptions.slice(0, 24).map(({ g }) => (
              <GenreChip key={g} genre={g} active={selectedGenres.includes(g)} onClick={() => toggleGenre(g)} />
            ))}
          </Box>
          {selectedGenres.length > 0 && (
            <Button size="small" onClick={() => { setSelectedGenres([]); setSegments([]); setWinner(null); }} disabled={spinning} sx={{ mt: 0.5, color: palette.textMuted, px: 0 }}>
              Filtreyi temizle
            </Button>
          )}
        </Box>

        {winner ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}>
            <Box sx={{ display: "flex", gap: 2, p: 1.5, borderRadius: "12px", border: `1px solid ${alpha(palette.primary, 0.35)}`, backgroundColor: alpha(palette.primary, 0.08) }}>
              <Box sx={{ width: 84, flexShrink: 0, aspectRatio: "2 / 3", borderRadius: "8px", overflow: "hidden", backgroundColor: palette.surfaceRaised }}>
                {winner.Cover && <img src={sizedCover(winner.Cover, "medium")} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
              </Box>
              <Box sx={{ minWidth: 0, display: "grid", gap: 0.75, alignContent: "start" }}>
                <Typography sx={{ fontSize: "0.72rem", color: palette.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Bu akşam tekrar izle</Typography>
                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", lineHeight: 1.25 }}>{winner.Name}</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, fontSize: "0.82rem", color: palette.textMuted }}>
                  {Number(winner.Score) > 0 && (
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, color: "#FBBF24", fontWeight: 700 }}>
                      <StarRoundedIcon sx={{ fontSize: 16 }} />
                      {winner.Score}
                    </Box>
                  )}
                  <span>{winner.IsMovie ? "Film" : `${winner.TotalNumberOfEpisodes} bölüm`}</span>
                </Box>
                <GenreChips genres={winner.Genre} max={4} justify="flex-start" />
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <Button size="small" variant="outlined" component={Link} href={`/anime?q=${encodeURIComponent(winner.Name)}`} sx={{ borderRadius: "8px" }}>
                    Arşivde aç
                  </Button>
                  <Button size="small" startIcon={<CasinoRoundedIcon />} onClick={spin} sx={{ borderRadius: "8px", color: palette.textMuted }}>
                    Tekrar çevir
                  </Button>
                </Box>
              </Box>
            </Box>
          </motion.div>
        ) : (
          <Typography sx={{ fontSize: "0.85rem", color: palette.textFaint }}>
            {spinning ? "Çark dönüyor…" : "Çarkı çevir, bitirdiğin animelerden biri tekrar izlemen için seçilsin."}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
