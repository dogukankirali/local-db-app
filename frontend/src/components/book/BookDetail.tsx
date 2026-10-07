"use client";

// Kitap detay sayfası (/book/detail?id=…): Kiroku kaydı + Google Books / Open Library ayrıntıları

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, Box, Button, Chip, IconButton, LinearProgress, Skeleton, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import { useAuth } from "../../contexts/AuthContext";
import { BookService, errorText, type Book } from "../../Services/BookService";
import { GenreChips } from "../Common/GenreChip";
import { formatWatchDate } from "../anime/WatchDates";
import { palette } from "../../theme/customTheme";
import BookEditorDialog from "./BookEditorDialog";
import { BookStatusChip } from "./BookLibrary";
import { LANGUAGE_LABEL, pagesText } from "./bookLabels";

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

function DetailContent() {
  const id = Number(useSearchParams().get("id"));
  const router = useRouter();
  const { isAdmin, isAuthenticated } = useAuth();
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!id || !isAuthenticated) return;
    BookService.get(id).then(setBook).catch((e) => setError(errorText(e)));
  }, [id, isAuthenticated]);

  const removeMine = async () => {
    if (!book || !confirm(`“${book.title}” listenden çıkarılsın mı? (Puan, durum ve notların silinir)`)) return;
    await BookService.removeFromMine(book.id).catch((e) => setError(errorText(e)));
    setBook(await BookService.get(book.id));
  };

  const removeCatalog = async () => {
    if (!book || !confirm(`“${book.title}” katalogdan tamamen silinsin mi?`)) return;
    try {
      await BookService.remove(book.id);
      router.push("/book");
    } catch (e) {
      setError(errorText(e));
    }
  };

  if (!id) return <Alert severity="error">Geçersiz kitap</Alert>;
  if (error && !book) return <Alert severity="error">{error}</Alert>;
  if (!book) return <Skeleton variant="rounded" height={320} sx={{ borderRadius: "16px" }} />;

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Button component={Link} href="/book" startIcon={<ArrowBackRoundedIcon />} size="small">Kitaplar</Button>
      </Box>
      {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}

      <Box sx={{ ...card, display: "flex", gap: 2.5, flexDirection: { xs: "column", sm: "row" } }}>
        {book.cover ? (
          <img src={book.cover} alt="" style={{ width: 180, borderRadius: 12, alignSelf: "flex-start", objectFit: "cover" }} />
        ) : (
          <Box sx={{ width: 180, aspectRatio: "2 / 3", borderRadius: "12px", display: "grid", placeItems: "center", backgroundColor: palette.surfaceRaised, color: palette.textFaint, flexShrink: 0 }}>
            <AutoStoriesOutlinedIcon fontSize="large" />
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.2 }}>{book.title}</Typography>
              {book.subtitle && <Typography sx={{ color: palette.textMuted, fontSize: "0.95rem" }}>{book.subtitle}</Typography>}
              {book.authors.length > 0 && <Typography sx={{ fontSize: "0.9rem", mt: 0.25 }}>{book.authors.join(", ")}</Typography>}
            </Box>
            <Tooltip title="Düzenle"><IconButton onClick={() => setEditing(true)}><EditRoundedIcon /></IconButton></Tooltip>
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <BookStatusChip status={book.readStatus} />
            {book.score > 0 && <Chip size="small" color="primary" label={`Puanım ${book.score}`} />}
            {book.planToRead && <Chip size="small" variant="outlined" label="Plan to Read" />}
          </Box>
          <Box sx={{ maxWidth: 420 }}>
            <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted }}>{pagesText(book.pagesRead, book.pageCount)} sayfa okundu</Typography>
            {book.pageCount > 0 && <LinearProgress variant="determinate" value={Math.min(100, (book.pagesRead / book.pageCount) * 100)} sx={{ height: 5, borderRadius: 3, mt: 0.5 }} />}
          </Box>
          <GenreChips genres={book.genres} justify="flex-start" />
          {book.description && <Typography sx={{ fontSize: "0.88rem", color: palette.textMuted, whiteSpace: "pre-line", maxHeight: 260, overflowY: "auto" }}>{book.description}</Typography>}
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {book.googleLink && <Button size="small" href={book.googleLink} target="_blank" rel="noopener" endIcon={<OpenInNewRoundedIcon fontSize="small" />}>Google Books</Button>}
            {book.openLibraryLink && <Button size="small" href={book.openLibraryLink} target="_blank" rel="noopener" endIcon={<OpenInNewRoundedIcon fontSize="small" />}>Open Library</Button>}
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
        <Box sx={card}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Bilgiler</Typography>
          <Info label="Yayınevi" value={book.publisher} />
          <Info label="Yayın tarihi" value={book.publishedDate} />
          <Info label="Sayfa" value={book.pageCount || ""} />
          <Info label="Dil" value={LANGUAGE_LABEL[book.language] ?? book.language} />
          <Info label="ISBN" value={book.isbn} />
        </Box>
        <Box sx={card}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Senin kaydın</Typography>
          <Info label="Puan" value={book.score > 0 ? book.score : <Box component="span" sx={{ color: palette.textMuted, fontWeight: 500 }}>Puanlanmadı</Box>} />
          <Info label="Okunan sayfa" value={pagesText(book.pagesRead, book.pageCount)} />
          <Info label="Başladım" value={formatWatchDate(book.startedAt)} />
          <Info label="Bitirdim" value={formatWatchDate(book.finishedAt)} />
          {book.notes && <Typography sx={{ fontSize: "0.82rem", color: palette.textMuted, whiteSpace: "pre-wrap", mt: 1.25 }}>{book.notes}</Typography>}
          <Box sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}>
            {book.inMyList && <Button size="small" color="inherit" onClick={removeMine}>Listemden çıkar</Button>}
            {isAdmin && <Button size="small" color="error" startIcon={<DeleteOutlineRoundedIcon />} onClick={removeCatalog}>Katalogdan sil</Button>}
          </Box>
        </Box>
      </Box>

      <BookEditorDialog
        open={editing}
        book={book}
        isAdmin={isAdmin}
        onClose={() => setEditing(false)}
        onSaved={(b) => {
          setEditing(false);
          setBook(b);
        }}
      />
    </Box>
  );
}

export default function BookDetail() {
  return (
    <Suspense fallback={<Skeleton variant="rounded" height={320} sx={{ borderRadius: "16px" }} />}>
      <DetailContent />
    </Suspense>
  );
}
