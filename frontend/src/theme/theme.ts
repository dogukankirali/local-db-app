import { alpha, createTheme } from "@mui/material/styles";
import { palette, themeMode } from "./customTheme";

const fontFamily =
  "var(--font-sans), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

const theme = createTheme({
  palette: {
    mode: themeMode,
    primary: { main: palette.primary, dark: palette.primaryHover, contrastText: palette.onPrimary },
    secondary: { main: palette.accent },
    success: { main: palette.success },
    warning: { main: palette.warning },
    error: { main: palette.danger },
    info: { main: palette.info },
    background: { default: palette.ink, paper: palette.surface },
    text: { primary: palette.text, secondary: palette.textMuted },
    divider: alpha(palette.overlay, 0.06),
    action: {
      hover: alpha(palette.overlay, 0.04),
      selected: alpha(palette.primary, 0.14),
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily,
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.02em" },
    h3: { fontWeight: 700, letterSpacing: "-0.015em" },
    h4: { fontWeight: 700, letterSpacing: "-0.015em" },
    h5: { fontWeight: 600, letterSpacing: "-0.01em" },
    h6: { fontWeight: 600, letterSpacing: "-0.01em" },
    button: { fontWeight: 600, textTransform: "none" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { fontFamily, backgroundColor: palette.ink },
        "::selection": { backgroundColor: alpha(palette.primary, 0.35) },
        "*::-webkit-scrollbar": { width: 8, height: 8 },
        "*::-webkit-scrollbar-thumb": {
          backgroundColor: alpha(palette.overlay, 0.08),
          borderRadius: 8,
        },
        "*::-webkit-scrollbar-thumb:hover": { backgroundColor: alpha(palette.overlay, 0.16) },
        "*::-webkit-scrollbar-track": { backgroundColor: "transparent" },
      },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.surfaceRaised,
          border: `1px solid ${palette.border}`,
          fontSize: "0.75rem",
          fontWeight: 500,
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.surface,
          border: `1px solid ${palette.border}`,
          boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16, border: `1px solid ${palette.border}` },
      },
    },
  },
});

export default theme;
