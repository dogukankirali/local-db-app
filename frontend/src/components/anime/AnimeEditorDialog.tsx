"use client";

import React, { useEffect, useState } from "react";
import { Box, Button, CircularProgress, Dialog, IconButton, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { palette } from "../../theme/customTheme";

export const dialogPaperSx = {
  width: "100%",
  m: { xs: 1.5, sm: 3 },
  maxHeight: { xs: "calc(100% - 24px)", sm: "calc(100% - 48px)" },
  borderRadius: "14px",
  backgroundColor: palette.surface,
  backgroundImage: "none",
  border: `1px solid ${alpha("#FFFFFF", 0.08)}`,
  boxShadow: "0 32px 80px rgba(0,0,0,0.55)",
  display: "flex",
  flexDirection: "column" as const,
  overflow: "hidden",
};

/** Başlık + kaydırılabilir gövde + sabit alt bar: tüm anime modallarının ortak iskeleti */
export function DialogShell({
  open,
  onClose,
  title,
  subtitle,
  maxWidth = 880,
  children,
  footer,
  headerExtra,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  maxWidth?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { ...dialogPaperSx, maxWidth } } }}>
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2.25, pb: headerExtra ? 0 : 2, borderBottom: `1px solid ${alpha("#FFFFFF", 0.06)}` }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: "1.1rem", fontWeight: 700, letterSpacing: "-0.01em" }}>
              {title}
            </Typography>
            {subtitle && <Typography sx={{ fontSize: "0.82rem", color: palette.textMuted, mt: 0.25 }}>{subtitle}</Typography>}
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Kapat" sx={{ color: palette.textMuted, mt: -0.25 }}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
        {headerExtra}
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", px: { xs: 2, sm: 3 }, py: 2.5 }}>{children}</Box>
      {footer && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderTop: `1px solid ${alpha("#FFFFFF", 0.06)}`,
            backgroundColor: alpha(palette.ink, 0.35),
          }}
        >
          {footer}
        </Box>
      )}
    </Dialog>
  );
}

type Props = {
  open: boolean;
  mode: "update" | "delete";
  data?: Record<string, any>;
  onClose: () => void;
  onChange: (patch: Record<string, any>) => void;
  onSave: () => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  onRequestDelete?: () => void;
  form: React.ReactNode;
};

/** Düzenleme ve silme onayı (silme, düzenleme içinden de açılabilir) */
export default function AnimeEditorDialog({ open, mode, data, onClose, onSave, onDelete, onRequestDelete, form }: Props) {
  const [busy, setBusy] = useState(false);
  useEffect(() => setBusy(false), [open, mode]);

  const run = async (fn: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (mode === "delete") {
    return (
      <DialogShell
        open={open}
        onClose={onClose}
        maxWidth={440}
        title="Anime silinsin mi?"
        footer={
          <>
            <Box sx={{ flex: 1 }} />
            <Button onClick={onClose} sx={{ color: palette.textMuted }}>
              Vazgeç
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={busy}
              onClick={() => run(onDelete)}
              startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <DeleteOutlineRoundedIcon />}
            >
              Sil
            </Button>
          </>
        }
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          {data?.Cover && (
            <Box component="img" src={data.Cover} alt="" sx={{ width: 56, height: 80, objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }}>{data?.Name}</Typography>
            <Typography sx={{ fontSize: "0.85rem", color: palette.textMuted, mt: 0.5 }}>
              Bu kayıt, türleri ve watchlist girdisiyle birlikte kalıcı olarak silinir.
            </Typography>
          </Box>
        </Box>
      </DialogShell>
    );
  }

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title={data?.Name || "Anime düzenle"}
      subtitle="Bilgileri güncelle"
      footer={
        <>
          {onRequestDelete && (
            <Button onClick={onRequestDelete} startIcon={<DeleteOutlineRoundedIcon />} sx={{ color: palette.danger }}>
              Sil
            </Button>
          )}
          <Box sx={{ flex: 1 }} />
          <Button onClick={onClose} sx={{ color: palette.textMuted }}>
            İptal
          </Button>
          <Button
            variant="contained"
            disabled={busy || !data?.Name}
            onClick={() => run(onSave)}
            startIcon={busy ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            Kaydet
          </Button>
        </>
      }
    >
      {form}
    </DialogShell>
  );
}
