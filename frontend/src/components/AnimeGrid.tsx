"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
} from "@mui/material";
import { theme } from "../theme/customTheme";
import StarIcon from "@mui/icons-material/Star";
import CloseIcon from "@mui/icons-material/Close";
import TvIcon from "@mui/icons-material/Tv";
import LocalMoviesIcon from "@mui/icons-material/LocalMovies";
import BookmarkIcon from "@mui/icons-material/Bookmark";

interface AnimeGridProps {
  data: TEATable.IAnime[];
  allData: TEATable.IAnime[]; // full cache
  pagination: TEAData.Pagination;
  onPageChange: (event: React.ChangeEvent<unknown>, value: number) => void;
  loading: boolean;
  loadingMore: boolean;
  gridSize: number;
  onLoadMore: () => void;
}

function getStatusInfo(anime: TEATable.IAnime) {
  if (anime.PlanToWatch)
    return { label: "Plan to Watch", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
  const w = anime.WatchStatus;
  const totalEp = parseInt(String(anime.TotalNumberOfEpisodes)) || 0;
  if (w > 0 && totalEp > 0 && w >= totalEp)
    return { label: "Completed", color: "#10B981", bg: "rgba(16,185,129,0.15)" };
  if (w > 0)
    return { label: `Ep ${w}`, color: "#3B82F6", bg: "rgba(59,130,246,0.15)" };
  return { label: "Unknown", color: "#6B7280", bg: "rgba(107,114,128,0.15)" };
}

function AnimeDetailModal({
  anime,
  onClose,
}: {
  anime: TEATable.IAnime | null;
  onClose: () => void;
}) {
  if (!anime) return null;
  const status = getStatusInfo(anime);
  const imgSrc = anime.Cover
    ? anime.Cover.startsWith("data:")
      ? anime.Cover
      : `data:image/jpeg;base64,${anime.Cover}`
    : null;
  const totalEpModal = parseInt(String(anime.TotalNumberOfEpisodes)) || 0;
  const progress =
    totalEpModal > 0 && anime.WatchStatus > 0
      ? Math.min(100, (anime.WatchStatus / totalEpModal) * 100)
      : 0;

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: "#18181b",
          borderRadius: "20px",
          border: "1px solid rgba(255,255,255,0.08)",
          overflow: "hidden",
          boxShadow: "0 32px 80px rgba(0,0,0,0.8)",
        },
      }}
    >
      {/* Header with cover */}
      <Box sx={{ position: "relative", width: "100%", height: 220, overflow: "hidden" }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={anime.Name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.5) blur(2px)",
              transform: "scale(1.05)",
            }}
          />
        ) : (
          <Box sx={{ width: "100%", height: "100%", backgroundColor: "#27272a" }} />
        )}
        {/* Gradient overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(to bottom, rgba(24,24,27,0) 0%, rgba(24,24,27,0.9) 100%)",
          }}
        />
        {/* Poster + title row */}
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            left: 16,
            right: 16,
            display: "flex",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          {imgSrc && (
            <img
              src={imgSrc}
              alt={anime.Name}
              style={{
                width: 80,
                height: 112,
                objectFit: "cover",
                borderRadius: 12,
                boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                flexShrink: 0,
              }}
            />
          )}
          <Box>
            <Typography
              sx={{ color: "#fff", fontWeight: 800, fontSize: "1.2rem", lineHeight: 1.2, mb: 0.5 }}
            >
              {anime.Name}
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={status.label}
                size="small"
                sx={{ backgroundColor: status.bg, color: status.color, fontWeight: "bold", height: 22, fontSize: "0.7rem" }}
              />
              {anime.IsMovie ? (
                <Chip icon={<LocalMoviesIcon style={{ fontSize: 12 }} />} label="Movie" size="small" sx={{ backgroundColor: "rgba(76,175,80,0.15)", color: "#4CAF50", height: 22, fontSize: "0.7rem" }} />
              ) : (
                <Chip icon={<TvIcon style={{ fontSize: 12 }} />} label="TV" size="small" sx={{ backgroundColor: "rgba(244,67,54,0.15)", color: "#F44336", height: 22, fontSize: "0.7rem" }} />
              )}
              {anime.Score && parseFloat(anime.Score) > 0 && (
                <Chip
                  icon={<StarIcon style={{ fontSize: 12, color: "#FFD700" }} />}
                  label={anime.Score}
                  size="small"
                  sx={{ backgroundColor: "rgba(255,215,0,0.1)", color: "#FFD700", height: 22, fontSize: "0.7rem" }}
                />
              )}
            </Box>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            color: "#fff",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
          }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: 3, pt: 2 }}>
        {/* Progress */}
        {totalEpModal > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
              <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                Progress
              </Typography>
              <Typography sx={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                {anime.WatchStatus > 0 ? anime.WatchStatus : 0} / {totalEpModal} ep
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: "rgba(255,255,255,0.08)",
                "& .MuiLinearProgress-bar": {
                  backgroundColor: progress === 100 ? "#10B981" : "#3B82F6",
                  borderRadius: 3,
                },
              }}
            />
          </Box>
        )}

        {/* Stats grid */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 1.5,
          }}
        >
          {[
            { label: "Anime Status", value: anime.AnimeStatus || "—" },
            { label: "MAL Score", value: (anime as any).MALScore > 0 ? (anime as any).MALScore : "—" },
            { label: "Genres", value: anime.Genre || "—" },
            { label: "Series", value: anime.SeriesName || "No Series" },
          ].map(({ label, value }) => (
            <Box
              key={label}
              sx={{
                backgroundColor: "rgba(255,255,255,0.04)",
                borderRadius: "12px",
                p: 1.5,
              }}
            >
              <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", mb: 0.3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>
                {String(value)}
              </Typography>
            </Box>
          ))}
        </Box>

        {anime.Notes && (
          <Box sx={{ mt: 1.5, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "12px", p: 1.5 }}>
            <Typography sx={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.4)", mb: 0.3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Notes
            </Typography>
            <Typography sx={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              {anime.Notes}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AnimeGrid({
  allData,
  loading,
  loadingMore,
  gridSize,
  onLoadMore,
}: AnimeGridProps) {
  const [selectedAnime, setSelectedAnime] = useState<TEATable.IAnime | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);

  // Reset loadingMore ref when it changes
  useEffect(() => {
    if (!loadingMore) {
      isLoadingMoreRef.current = false;
    }
  }, [loadingMore]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreRef.current && !loading) {
          isLoadingMoreRef.current = true;
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [onLoadMore, loading]);

  const colWidth = `${100 / gridSize}%`;

  if (loading && allData.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "rgba(255,255,255,0.4)" }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!allData || allData.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", color: "rgba(255,255,255,0.4)" }}>
        <Typography>No anime found.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        p: 2,
        "&::-webkit-scrollbar": { width: "6px" },
        "&::-webkit-scrollbar-track": { backgroundColor: "transparent" },
        "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: "4px" },
      }}
    >
      {/* Grid */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0,
          mx: -1,
        }}
      >
        {allData.map((anime, index) => {
          let imgSrc = null;
          if (anime.Cover) {
            if (anime.Cover.startsWith("http")) {
              imgSrc = anime.Cover;
            } else if (anime.Cover.startsWith("data:")) {
              imgSrc = anime.Cover;
            } else {
              imgSrc = `data:image/jpeg;base64,${anime.Cover}`;
            }
          }
          const status = getStatusInfo(anime);

          return (
            <Box
              key={anime.ID || `anime-${index}`}
              sx={{
                width: colWidth,
                p: 1,
                flexShrink: 0,
              }}
            >
              <Box
                onClick={() => setSelectedAnime(anime)}
                sx={{
                  position: "relative",
                  borderRadius: "16px",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: "#27272a",
                  aspectRatio: "2/3",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                  transition: "transform 0.25s ease, box-shadow 0.25s ease",
                  "&:hover": {
                    transform: "scale(1.04) translateY(-4px)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.7)",
                    "& .anime-overlay": { opacity: 1 },
                  },
                }}
              >
                {/* Cover Image */}
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={anime.Name}
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "#3f3f46",
                      color: "rgba(255,255,255,0.3)",
                      fontSize: "0.75rem",
                    }}
                  >
                    No Cover
                  </Box>
                )}

                {/* Score badge */}
                {anime.Score && parseFloat(anime.Score) > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      backgroundColor: "rgba(0,0,0,0.75)",
                      backdropFilter: "blur(6px)",
                      borderRadius: "8px",
                      px: 0.8,
                      py: 0.3,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.3,
                      color: "#FFD700",
                    }}
                  >
                    <StarIcon sx={{ fontSize: 12 }} />
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, lineHeight: 1 }}>
                      {anime.Score}
                    </Typography>
                  </Box>
                )}

                {/* Plan to Watch badge */}
                {anime.PlanToWatch && (
                  <Box sx={{ position: "absolute", top: 8, left: 8, color: "#F59E0B" }}>
                    <BookmarkIcon sx={{ fontSize: 18, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }} />
                  </Box>
                )}

                {/* Hover overlay */}
                <Box
                  className="anime-overlay"
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)",
                    opacity: 0,
                    transition: "opacity 0.25s ease",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    p: 1.5,
                  }}
                >
                  <Typography
                    sx={{
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: gridSize <= 4 ? "0.9rem" : gridSize <= 6 ? "0.78rem" : "0.68rem",
                      lineHeight: 1.2,
                      mb: 0.8,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {anime.Name}
                  </Typography>
                  <Chip
                    label={status.label}
                    size="small"
                    sx={{
                      alignSelf: "flex-start",
                      backgroundColor: status.bg,
                      color: status.color,
                      fontWeight: "bold",
                      height: 20,
                      fontSize: "0.65rem",
                      backdropFilter: "blur(4px)",
                    }}
                  />
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Sentinel div for IntersectionObserver */}
      <Box ref={sentinelRef} sx={{ height: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {loadingMore && (
          <Typography sx={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>
            Loading more...
          </Typography>
        )}
      </Box>

      {/* Detail Modal */}
      {selectedAnime && (
        <AnimeDetailModal anime={selectedAnime} onClose={() => setSelectedAnime(null)} />
      )}
    </Box>
  );
}
