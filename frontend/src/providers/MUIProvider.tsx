"use client";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { Toaster } from "sonner";
import theme from "../theme/theme";
import { palette } from "../theme/customTheme";

export default function MUIProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
      <Toaster
        theme="dark"
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
