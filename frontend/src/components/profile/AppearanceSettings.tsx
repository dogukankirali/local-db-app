"use client";

import { Box, ButtonBase, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import { ACCENT_COLORS, ThemeMode, accentId, palette, setThemePrefs, themeMode } from "../../theme/customTheme";

// Profil > Görünüm: aydınlık/karanlık tema ve 20 vurgu rengi. Seçim bu tarayıcıda saklanır, sayfa yenilenir.
export default function AppearanceSettings() {
  const modes: { id: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { id: "dark", label: "Karanlık", icon: <DarkModeRoundedIcon fontSize="small" /> },
    { id: "light", label: "Aydınlık", icon: <LightModeRoundedIcon fontSize="small" /> },
  ];
  return (
    <Box sx={{ display: "grid", gap: 2 }}>
      <Box sx={{ display: "flex", gap: 1 }}>
        {modes.map((m) => {
          const active = m.id === themeMode;
          return (
            <ButtonBase
              key={m.id}
              onClick={() => !active && setThemePrefs({ mode: m.id })}
              sx={{
                flex: 1,
                gap: 1,
                py: 1.25,
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.88rem",
                color: active ? palette.primary : palette.textMuted,
                border: `1px solid ${active ? palette.primary : alpha(palette.overlay, 0.08)}`,
                backgroundColor: active ? alpha(palette.primary, 0.12) : "transparent",
              }}
            >
              {m.icon}
              {m.label}
            </ButtonBase>
          );
        })}
      </Box>
      <Box>
        <Typography sx={{ fontSize: "0.8rem", color: palette.textMuted, mb: 1 }}>Vurgu rengi</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 1 }}>
          {ACCENT_COLORS.map((c) => {
            const active = c.id === accentId;
            return (
              <Tooltip key={c.id} title={c.name}>
                <ButtonBase
                  aria-label={c.name}
                  onClick={() => !active && setThemePrefs({ accent: c.id })}
                  sx={{
                    aspectRatio: "1",
                    borderRadius: "10px",
                    backgroundColor: c.hex,
                    outline: active ? `2px solid ${palette.text}` : "none",
                    outlineOffset: 2,
                    color: "#0B0D12",
                    transition: "transform .15s",
                    "&:hover": { transform: "scale(1.08)" },
                  }}
                >
                  {active && <CheckRoundedIcon fontSize="small" />}
                </ButtonBase>
              </Tooltip>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}
