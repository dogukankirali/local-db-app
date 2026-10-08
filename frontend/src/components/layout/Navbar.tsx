"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  InputBase,
  ListItemButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Paper,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import TabRoundedIcon from "@mui/icons-material/TabRounded";
import dynamic from "next/dynamic";
import { useAuth } from "../../contexts/AuthContext";
import { getPageTitle } from "../../config/navigation";
import { palette } from "../../theme/customTheme";
import { OPEN_COMMAND_PALETTE, useAnimeSearch } from "../CommandPalette";
import { sizedCover } from "../../utils/cover";
import NotificationBell from "./NotificationBell";

// Yalnızca admin açar; ilk açılışta yüklenir
const NotesImportDialog = dynamic(() => import("../anime/NotesImportDialog"), { ssr: false });

export const TOPBAR_HEIGHT = 64;

interface NavbarProps {
  onMenuClick: () => void;
}

function SearchBox() {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const urlQuery = useSearchParams().get("q") ?? "";
  const [query, setQuery] = useState(pathname.startsWith("/anime") ? urlQuery : "");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { hits, loading } = useAnimeSearch(query, focused);

  // Adres çubuğundaki arama (?q=) değişince (filtre temizlenince vb.) kutu da güncellenir
  useEffect(() => {
    if (pathname.startsWith("/anime")) setQuery(urlQuery);
  }, [urlQuery, pathname]);

  const open = focused && query.trim().length >= 2 && (loading || hits.length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    setFocused(false);
    if (active >= 0 && hits[active]) return goTo(hits[active].ID);
    router.push(q ? `/anime?q=${encodeURIComponent(q)}` : "/anime");
    inputRef.current?.blur();
  };

  const goTo = (id: number) => {
    setFocused(false);
    inputRef.current?.blur();
    router.push(`/anime/detail?id=${id}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" && hits.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % hits.length);
    } else if (e.key === "ArrowUp" && hits.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? hits.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <Box sx={{ position: "relative", width: { xs: "100%", sm: 280, md: 360 } }}>
    <Box
      component="form"
      onSubmit={submit}
      role="search"
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        width: "100%",
        height: 40,
        px: 1.5,
        borderRadius: "10px",
        backgroundColor: alpha(palette.overlay, 0.04),
        border: `1px solid ${alpha(palette.overlay, 0.06)}`,
        transition: "border-color .15s ease, background-color .15s ease",
        "&:focus-within": {
          borderColor: alpha(palette.primary, 0.6),
          backgroundColor: alpha(palette.overlay, 0.06),
        },
      }}
    >
      <SearchRoundedIcon sx={{ fontSize: 20, color: palette.textMuted }} />
      <InputBase
        inputRef={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Anime ara…"
        inputProps={{ "aria-label": "Anime ara", autoComplete: "off" }}
        sx={{ flex: 1, fontSize: "0.875rem", color: palette.text }}
      />
      {/* Ctrl/⌘ + K komut paletini açar (CommandPalette) */}
      <Box
        component="kbd"
        title="Komut paleti"
        onClick={() => window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))}
        sx={{
          cursor: "pointer",
          display: { xs: "none", md: "inline-flex" },
          px: 0.75,
          py: 0.1,
          borderRadius: "6px",
          border: `1px solid ${alpha(palette.overlay, 0.1)}`,
          fontSize: "0.7rem",
          fontFamily: "inherit",
          color: palette.textMuted,
        }}
      >
        Ctrl K
      </Box>
    </Box>
    {open && (
      <Paper
        elevation={8}
        sx={{ position: "absolute", top: 46, left: 0, right: 0, zIndex: 10, overflow: "hidden", borderRadius: "12px", backgroundImage: "none", border: `1px solid ${alpha(palette.overlay, 0.08)}` }}
      >
        {hits.map((a, i) => (
          <ListItemButton
            key={a.ID}
            selected={i === active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => goTo(a.ID)}
            sx={{ gap: 1.25, py: 0.75 }}
          >
            <Box sx={{ width: 28, height: 40, borderRadius: "4px", flexShrink: 0, overflow: "hidden", backgroundColor: palette.surfaceRaised }}>
              {a.Cover && <img src={sizedCover(a.Cover, "small")} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography noWrap sx={{ fontSize: "0.85rem", fontWeight: 600 }}>{a.Name}</Typography>
              <Typography noWrap sx={{ fontSize: "0.72rem", color: palette.textMuted }}>
                {[a.IsMovie ? "Film" : a.TotalNumberOfEpisodes ? `${a.TotalNumberOfEpisodes} bölüm` : null, a.AnimeStatus].filter(Boolean).join(" · ")}
              </Typography>
            </Box>
          </ListItemButton>
        ))}
        {!hits.length && loading && <Typography sx={{ p: 1.5, fontSize: "0.8rem", color: palette.textMuted }}>Aranıyor…</Typography>}
        <ListItemButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setFocused(false);
            router.push(`/anime?q=${encodeURIComponent(query.trim())}`);
          }}
          sx={{ py: 0.75, borderTop: `1px solid ${alpha(palette.overlay, 0.06)}`, color: palette.primary, fontSize: "0.8rem" }}
        >
          Tüm sonuçları göster
        </ListItemButton>
      </Paper>
    )}
    </Box>
  );
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [notesOpen, setNotesOpen] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const close = () => setAnchorEl(null);

  return (
    <Box
      component="header"
      sx={{
        position: "sticky",
        top: 0,
        zIndex: (t) => t.zIndex.appBar,
        height: TOPBAR_HEIGHT,
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: { xs: 1.5, md: 3 },
        backgroundColor: alpha(palette.ink, 0.72),
        backdropFilter: "saturate(160%) blur(14px)",
        borderBottom: `1px solid ${alpha(palette.overlay, 0.06)}`,
      }}
    >
      <IconButton onClick={onMenuClick} aria-label="Menüyü aç" sx={{ display: { md: "none" }, color: palette.textMuted }}>
        <MenuRoundedIcon />
      </IconButton>

      <Typography
        component="h1"
        noWrap
        sx={{ display: { xs: "none", sm: "block" }, fontSize: "1.05rem", fontWeight: 700, letterSpacing: "-0.01em", minWidth: 0 }}
      >
        {getPageTitle(pathname)}
      </Typography>

      <Box sx={{ flex: 1, display: "flex", justifyContent: { xs: "stretch", sm: "flex-end" } }}>
        <Suspense fallback={null}>
          <SearchBox />
        </Suspense>
      </Box>

      {isAuthenticated && user ? (
        <>
          <NotificationBell />
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Hesap menüsü" sx={{ p: 0.5 }}>
            <Avatar sx={{ width: 34, height: 34, fontSize: "0.9rem", fontWeight: 700, bgcolor: alpha(palette.primary, 0.25), color: "#fff" }}>
              {user.username?.charAt(0).toUpperCase() || "U"}
            </Avatar>
          </IconButton>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={close}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { mt: 1, minWidth: 220 } } }}
          >
            <Box sx={{ px: 2, py: 1.25 }}>
              <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>{user.username}</Typography>
              <Typography sx={{ color: "text.secondary", fontSize: "0.8rem" }}>{user.email}</Typography>
            </Box>
            <Divider />
            <MenuItem
              onClick={() => {
                close();
                router.push("/profile");
              }}
            >
              <ListItemIcon>
                <PersonOutlineRoundedIcon fontSize="small" />
              </ListItemIcon>
              Profil
            </MenuItem>
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  close();
                  setNotesOpen(true);
                }}
              >
                <ListItemIcon>
                  <AutoFixHighRoundedIcon fontSize="small" />
                </ListItemIcon>
                Notlardan içe aktar
              </MenuItem>
            )}
            {isAdmin && (
              <MenuItem
                onClick={() => {
                  close();
                  setTabsOpen(true);
                }}
              >
                <ListItemIcon>
                  <TabRoundedIcon fontSize="small" />
                </ListItemIcon>
                Açık sekmelerden watchlist&apos;e
              </MenuItem>
            )}
            <MenuItem
              onClick={() => {
                close();
                logout();
              }}
              sx={{ color: palette.danger }}
            >
              <ListItemIcon sx={{ color: "inherit" }}>
                <LogoutRoundedIcon fontSize="small" />
              </ListItemIcon>
              Çıkış yap
            </MenuItem>
          </Menu>
          {isAdmin && notesOpen && <NotesImportDialog open onClose={() => setNotesOpen(false)} />}
          {isAdmin && tabsOpen && <NotesImportDialog open source="tabs" onClose={() => setTabsOpen(false)} />}
        </>
      ) : (
        <Box sx={{ display: { xs: "none", sm: "flex" }, gap: 1 }}>
          <Button component={Link} href="/login" variant="text" sx={{ color: palette.text }}>
            Giriş
          </Button>
          <Button component={Link} href="/register" variant="contained">
            Kayıt ol
          </Button>
        </Box>
      )}
    </Box>
  );
}
