"use client";

// Dizi/film detay sayfası (/series/detail?id=… ve /movies/detail?id=…): Kiroku kaydı + IMDb ayrıntıları

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Box, Button, Chip, IconButton, LinearProgress, Skeleton, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import { useAuth } from "../../contexts/AuthContext";
import { ScreenService, errorText, type ScreenKind, type ScreenTitle } from "../../Services/ScreenService";
import { GenreChips } from "../Common/GenreChip";
import { formatWatchDate } from "../anime/WatchDates";
import { palette } from "../../theme/customTheme";
import ScreenEditorDialog from "./ScreenEditorDialog";
import { KindIcon, WatchStatusChip } from "./ScreenLibrary";
import { KIND_TEXT, SERIES_STATUS_LABEL, progressText } from "./screenLabels";

const card = { p: { xs: 2, md: 2.5 }, borderRadius: "16px", backgroundColor: palette.surface, border: `1px solid ${alpha(palette.overlay, 0.06)}` };

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === "" || value === null || value === undefined) return null;
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2, py: 0.75, borderBottom: `1px solid ${alpha(palette.overlay, 0.05)}` }}>
      <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted, flexShrink: 0 }}>{label}</Typography>
      <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, textAlign: "right" }}>{value}</Typography>
    </Box>
  );
}

function DetailContent({ kind }: { kind: ScreenKind }) {
  const id = Number(useSearchParams().get("id"));
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();
  const text = KIND_TEXT[kind];
  const [title, setTitle] = useState<ScreenTitle | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    ScreenService.get(kind, id).then(setTitle).catch((e) => setError(errorText(e)));
  }, [kind, id, isAuthenticated]);

  const removeMine = async () => {
    if (!title || !confirm(`“${title.name}” listenden çıkarılsın mı? (Puan, durum ve notların silinir)`)) return;
    await ScreenService.removeFromMine(kind, title.id).catch((e) => setError(errorText(e)));
    setTitle(await ScreenService.get(kind, title.id));
  };

  const removeCatalog = async () => {
    if (!title || !confirm(`“${title.name}” katalogdan tamamen silinsin mi?`)) return;
    try {
      await ScreenService.remove(kind, title.id);
      router.push(text.base);
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!id) return <Alert severity="error">Geçersiz kayıt</Alert>;
  if (error && !title) return <Alert severity="error">{error}</Alert>;
  if (!title) return <Skeleton variant="rounded" height={320} sx={{ borderRadius: "16px" }} />;

  const isSeries = kind === "series";
  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Button component={Link} href={text.base} startIcon={<ArrowBackRoundedIcon />} size="small">{text.title}</Button>
      </Box>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ ...card, display: "flex", gap: 2.5, flexDirection: { xs: "column", sm: "row" } }}>
        {title.cover ? (
          <img src={title.cover} alt="" style={{ width: 180, borderRadius: 12, alignSelf: "flex-start", objectFit: "cover" }} />
        ) : (
          <Box sx={{ width: 180, aspectRatio: "2 / 3", borderRadius: "12px", display: "grid", placeItems: "center", backgroundColor: palette.surfaceRaised, color: palette.textFaint, flexShrink: 0 }}>
            <KindIcon kind={kind} fontSize="large" />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>{title.name}</Typography>
              {(title.originalName || title.year) && (
                <Typography sx={{ color: palette.textMuted, fontSize: "0.9rem" }}>{[title.originalName, title.year].filter(Boolean).join(" · ")}</Typography>
              )}
            </Box>
            <Tooltip title="Düzenle"><IconButton onClick={() => setEditing(true)}><EditRoundedIcon /></IconButton></Tooltip>
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <WatchStatusChip status={title.watchStatus} />
            {isSeries && title.status && <Chip size="small" label={SERIES_STATUS_LABEL[title.status] ?? title.status} />}
            {title.imdbRating > 0 && <Chip size="small" label={`IMDb ${title.imdbRating.toFixed(1)}`} />}
            {title.score > 0 && <Chip size="small" color="primary" label={`Puanım ${title.score}`} />}
            {title.planToWatch && <Chip size="small" variant="outlined" label="Plan to Watch" />}
          </Box>
          {isSeries && (
            <Box sx={{ maxWidth: 420 }}>
              <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted }}>{progressText(title.episodesWatched, title.totalEpisodes)} bölüm izlendi</Typography>
              {title.totalEpisodes > 0 && <LinearProgress variant="determinate" value={Math.min(100, (title.episodesWatched / title.totalEpisodes) * 100)} sx={{ height: 5, borderRadius: 3, mt: 0.5 }} />}
            </Box>
          )}
          <GenreChips genres={title.genres} justify="flex-start" />
          {title.plot && <Typography sx={{ fontSize: "0.88rem", color: palette.textMuted, whiteSpace: "pre-line" }}>{title.plot}</Typography>}
          {title.imdbLink && (
            <Box>
              <Button size="small" href={title.imdbLink} target="_blank" rel="noopener" endIcon={<OpenInNewRoundedIcon fontSize="small" />}>IMDb'de aç</Button>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <Box sx={card}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Bilgiler</Typography>
          <Info label="Yıl" value={title.year} />
          {isSeries && <Info label="Sezon" value={title.totalSeasons || ""} />}
          {isSeries && <Info label="Bölüm" value={title.totalEpisodes || ""} />}
          <Info label="Süre" value={title.runtime} />
          <Info label="Yönetmen" value={title.director} />
          <Info label="Oyuncular" value={title.actors} />
        </Box>
        <Box sx={card}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Senin kaydın</Typography>
          <Info label="Puan" value={title.score > 0 ? title.score : <Box component="span" sx={{ color: palette.textMuted, fontWeight: 500 }}>Puanlanmadı</Box>} />
          {isSeries && <Info label="İzlenen bölüm" value={progressText(title.episodesWatched, title.totalEpisodes)} />}
          <Info label="Başladım" value={formatWatchDate(title.startedAt)} />
          <Info label="Bitirdim" value={formatWatchDate(title.finishedAt)} />
          {title.notes && <Typography sx={{ fontSize: "0.82rem", color: palette.textMuted, whiteSpace: "pre-wrap", mt: 1.25 }}>{title.notes}</Typography>}
          <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
            {title.inMyList && <Button size="small" color="inherit" onClick={removeMine}>Listemden çıkar</Button>}
            {isAdmin && <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={removeCatalog}>Katalogdan sil</Button>}
          </Box>
        </Box>
      </Box>

      <ScreenEditorDialog
        kind={kind}
        open={editing}
        title={title}
        isAdmin={isAdmin}
        onClose={() => setEditing(false)}
        onSaved={(t) => {
          setEditing(false);
          setTitle(t);
        }}
      />
    </Box>
  );
}

export default function ScreenDetail({ kind }: { kind: ScreenKind }) {
  return (
    <Suspense fallback={<Skeleton variant="rounded" height={320} sx={{ borderRadius: "16px" }} />}>
      <DetailContent kind={kind} />
    </Suspense>
  );
}
