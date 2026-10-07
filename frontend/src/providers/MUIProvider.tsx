"use client";

import { useEffect, useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Toaster } from "sonner";
import theme from "../theme/theme";
import { palette, themeMode } from "../theme/customTheme";

export default function MUIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Renk ve tema tercihi tarayıcıda (localStorage) tutulduğu için sunucudaki statik HTML varsayılan
  // renklerle üretilir; uyuşmazlık (hydration) olmasın diye içerik tarayıcıda bağlandıktan sonra çizilir.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
      <Toaster
        theme={themeMode}
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            background: palette.surfaceRaised,
            border: `1px solid ${palette.border}`,
            color: palette.text,
            fontFamily: "inherit",
          },
        }}
      />
    </ThemeProvider>
  );
}
