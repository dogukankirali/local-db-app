"use client";

// Üst çubuktaki bildirim zili: yeni bölüm bildirimleri (Kiroku içi). Açınca hepsi okundu sayılır.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Box, Button, IconButton, Menu, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { fetchNotifications, markNotificationsRead, type AppNotification } from "../../lib/push";
import { palette } from "../../theme/customTheme";

const REFRESH_MS = 5 * 60 * 1000;

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins || 1} dk önce`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours} sa önce` : `${Math.round(hours / 24)} gün önce`;
}

export default function NotificationBell() {
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetchNotifications();
      setItems(res.items);
      setUnread(res.unread);
    } catch {
      // Bildirimler alınamazsa zil sessizce boş kalır
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const open = (e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
    if (unread) {
      setUnread(0);
      markNotificationsRead().catch(() => {});
    }
  };

  return (
    <>
      <Tooltip title="Bildirimler">
        <IconButton onClick={open} aria-label="Bildirimler" sx={{ color: palette.textMuted }}>
          <Badge badgeContent={unread} color="primary" max={99}>
            <NotificationsNoneRoundedIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => {
          setAnchor(null);
          setItems((list) => list.map((n) => ({ ...n, read: true })));
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 340, maxWidth: "calc(100vw - 24px)", maxHeight: 440, mt: 1, backgroundColor: palette.surfaceRaised } } }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: `1px solid ${alpha(palette.overlay, 0.06)}` }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem" }}>Bildirimler</Typography>
        </Box>
        {items.length === 0 ? (
          <Box sx={{ px: 2, py: 3, textAlign: "center" }}>
            <Typography sx={{ fontSize: "0.85rem", color: palette.textMuted }}>Henüz bildirim yok. Listendeki animelerin yeni bölümleri burada görünür.</Typography>
            <Button size="small" sx={{ mt: 1 }} onClick={() => { setAnchor(null); router.push("/profile"); }}>Tarayıcı bildirimlerini aç</Button>
          </Box>
        ) : (
          items.map((n) => (
            <Box
              key={n.id}
              onClick={() => {
                setAnchor(null);
                if (n.url) router.push(n.url);
              }}
              sx={{
                px: 2,
                py: 1.25,
                cursor: n.url ? "pointer" : "default",
                borderBottom: `1px solid ${alpha(palette.overlay, 0.04)}`,
                backgroundColor: n.read ? "transparent" : alpha(palette.primary, 0.08),
                "&:hover": { backgroundColor: alpha(palette.overlay, 0.05) },
              }}
            >
              <Typography sx={{ fontSize: "0.86rem", fontWeight: 600 }}>{n.title}</Typography>
              <Typography sx={{ fontSize: "0.78rem", color: palette.textMuted }}>
                {n.body} · {ago(n.createdAt)}
              </Typography>
            </Box>
          ))
        )}
      </Menu>
    </>
  );
}
