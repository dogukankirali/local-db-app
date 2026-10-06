import Link from "next/link";
import { Box, Button, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { ReactNode } from "react";
import { palette } from "../../theme/customTheme";

export default function ComingSoon({ title, description, icon }: { title: string; description: string; icon: ReactNode }) {
  return (
    <Box sx={{ maxWidth: 560, mx: "auto", mt: { xs: 4, md: 10 }, textAlign: "center" }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          mx: "auto",
          mb: 2.5,
          borderRadius: "18px",
          display: "grid",
          placeItems: "center",
          color: palette.primary,
          backgroundColor: alpha(palette.primary, 0.12),
          border: `1px solid ${alpha(palette.primary, 0.25)}`,
          "& svg": { fontSize: 30 },
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, letterSpacing: "-0.015em", mb: 1 }}>{title}</Typography>
      <Typography sx={{ color: palette.textMuted, mb: 3 }}>{description}</Typography>
      <Button component={Link} href="/anime" variant="contained">
        Anime arşivine dön
      </Button>
    </Box>
  );
}
