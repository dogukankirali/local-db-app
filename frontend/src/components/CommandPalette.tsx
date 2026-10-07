"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Box, Dialog } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import PersonOutlineRoundedIcon from "@mui/icons-material/PersonOutlineRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { navSections } from "../config/navigation";
import { useAuth } from "../contexts/AuthContext";
import { AnimeService } from "../Services/AnimeServices";
import { palette } from "../theme/customTheme";
import { sizedCover } from "../utils/cover";

// Ctrl/⌘ + K ile her sayfadan açılan komut paleti: anime arama, sayfalar ve hızlı işlemler.
// Başka bir yerden açmak için: window.dispatchEvent(new Event(OPEN_COMMAND_PALETTE))
export const OPEN_COMMAND_PALETTE = "kiroku:command-palette";

type AnimeHit = Pick<TEATable.IAnime, "ID" | "Name" | "Cover" | "AnimeStatus" | "TotalNumberOfEpisodes" | "IsMovie">;

function useAnimeSearch(query: string, enabled: boolean) {
  const [hits, setHits] = useState<AnimeHit[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (!enabled || q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    const t = setTimeout(async () => {
      const res = await AnimeService.getAnimes({
        page: 1,
        count: 8,
        filters: [{ key: "Name", value: q } as TEATable.IFilterType],
        order: "asc",
        orderBy: "Name",
      });
      // Yazmaya devam edildiyse eski yanıtı yok say
      if (id !== requestId.current) return;
      setHits(res?.data ?? []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, enabled]);

  return { hits, loading };
}

export default function CommandPalette() {
  const router = useRouter();
  const { isAdmin, isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { hits, loading } = useAnimeSearch(query, open);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_COMMAND_PALETTE, onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_COMMAND_PALETTE, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const q = query.trim();

  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      fullWidth
      maxWidth={false}
      slotProps={{
        paper: {
          sx: {
            width: "min(640px, calc(100vw - 32px))",
            m: 2,
            alignSelf: "flex-start",
            mt: { xs: 8, sm: "12vh" },
            borderRadius: "14px",
            backgroundColor: palette.surface,
            backgroundImage: "none",
            border: `1px solid ${alpha(palette.overlay, 0.08)}`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            overflow: "hidden",
          },
        },
        backdrop: { sx: { backgroundColor: alpha(palette.ink, 0.6), backdropFilter: "blur(6px)" } },
      }}
    >
      <Box
        component={Command}
        label="Komut paleti"
        loop
        sx={{
          "& [cmdk-input-wrapper]": {
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            px: 2,
            borderBottom: `1px solid ${alpha(palette.overlay, 0.06)}`,
          },
          "& [cmdk-input]": {
            flex: 1,
            height: 52,
            border: 0,
            outline: 0,
            background: "transparent",
            color: palette.text,
            font: "inherit",
            fontSize: "0.95rem",
            "&::placeholder": { color: palette.textFaint },
          },
          "& [cmdk-list]": {
            maxHeight: "min(420px, 60vh)",
            overflowY: "auto",
            overscrollBehavior: "contain",
            p: 1,
            transition: "height .15s ease",
            height: "var(--cmdk-list-height)",
          },
          "& [cmdk-group-heading]": {
            px: 1.25,
            pt: 1.25,
            pb: 0.75,
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: palette.textFaint,
          },
          "& [cmdk-item]": {
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            px: 1.25,
            py: 1,
            borderRadius: "8px",
            cursor: "pointer",
            color: palette.text,
            fontSize: "0.9rem",
            userSelect: "none",
            "& svg": { fontSize: 20, color: palette.textMuted },
            "&[data-selected=true]": {
              backgroundColor: alpha(palette.primary, 0.14),
              "& svg": { color: palette.primary },
            },
          },
          "& [cmdk-empty], & [cmdk-loading]": {
            py: 4,
            textAlign: "center",
            fontSize: "0.85rem",
            color: palette.textMuted,
          },
        }}
      >
        <div cmdk-input-wrapper="">
          <SearchRoundedIcon sx={{ fontSize: 20, color: palette.textMuted }} />
          <Command.Input value={query} onValueChange={setQuery} placeholder="Anime ara ya da bir komut yaz…" autoFocus />
          <Kbd>Esc</Kbd>
        </div>
        <Command.List>
          {loading && hits.length === 0 ? <Command.Loading>Aranıyor…</Command.Loading> : <Command.Empty>Sonuç yok</Command.Empty>}

          {hits.length > 0 && (
            <Command.Group heading="Animeler">
              {hits.map((a) => (
                <Command.Item
                  key={a.ID}
                  value={`anime-${a.ID} ${a.Name}`}
                  keywords={[q]}
                  onSelect={() => run(() => router.push(`/anime?q=${encodeURIComponent(a.Name)}`))}
                >
                  <Box
                    component="img"
                    src={sizedCover(a.Cover, "small") || undefined}
                    alt=""
                    loading="lazy"
                    sx={{ width: 30, height: 42, borderRadius: "4px", objectFit: "cover", flexShrink: 0, backgroundColor: palette.surfaceRaised }}
                  />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.Name}</Box>
                    <Box sx={{ fontSize: "0.75rem", color: palette.textMuted }}>
                      {[a.IsMovie ? "Film" : "TV", a.TotalNumberOfEpisodes ? `${a.TotalNumberOfEpisodes} bölüm` : null, a.AnimeStatus || null]
                        .filter(Boolean)
                        .join(" · ")}
                    </Box>
                  </Box>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {isAdmin && (
            <Command.Group heading="İşlemler">
              <Command.Item value="yeni anime ekle create" onSelect={() => run(() => router.push("/anime?new=1"))}>
                <AddRoundedIcon />
                Yeni anime ekle
              </Command.Item>
              <Command.Item value="csv toplu içe aktar import" onSelect={() => run(() => router.push("/anime?import=1"))}>
                <UploadFileRoundedIcon />
                CSV ile toplu içe aktar
              </Command.Item>
            </Command.Group>
          )}

          <Command.Group heading="Sayfalar">
            {navSections.flatMap((s) => s.items).map((item) => (
              <Command.Item key={item.href} value={`sayfa ${item.label} ${item.description ?? ""}`} onSelect={() => run(() => router.push(item.href))}>
                {item.icon}
                {item.label}
              </Command.Item>
            ))}
            {isAuthenticated && (
              <Command.Item value="sayfa profil hesap" onSelect={() => run(() => router.push("/profile"))}>
                <PersonOutlineRoundedIcon />
                Profil
              </Command.Item>
            )}
          </Command.Group>

          {isAuthenticated && (
            <Command.Group heading="Hesap">
              <Command.Item value="çıkış yap logout" onSelect={() => run(logout)}>
                <LogoutRoundedIcon />
                Çıkış yap
              </Command.Item>
            </Command.Group>
          )}
        </Command.List>
      </Box>
    </Dialog>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="kbd"
      sx={{
        px: 0.75,
        py: 0.25,
        borderRadius: "5px",
        fontFamily: "inherit",
        fontSize: "0.7rem",
        color: palette.textMuted,
        border: `1px solid ${alpha(palette.overlay, 0.1)}`,
        backgroundColor: alpha(palette.overlay, 0.04),
      }}
    >
      {children}
    </Box>
  );
}
