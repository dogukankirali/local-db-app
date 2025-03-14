"use client";

import {
  Typography,
  Grid,
  Card,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import Link from "next/link";

const menuItems = [
  { text: "Anime", icon: <MovieIcon sx={{ fontSize: 48 }} />, path: "/anime" },
  {
    text: "Manga",
    icon: <MenuBookIcon sx={{ fontSize: 48 }} />,
    path: "/manga",
  },
  {
    text: "Kitaplar",
    icon: <ImportContactsIcon sx={{ fontSize: 48 }} />,
    path: "/book",
  },
  {
    text: "Diziler",
    icon: <LiveTvIcon sx={{ fontSize: 48 }} />,
    path: "/series",
  },
];

export default function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  return (
    <Box sx={{ px: isMobile ? 2 : 4, py: isMobile ? 2 : 4 }}>
      <Typography
        variant={isMobile ? "h5" : "h4"}
        component="h1"
        gutterBottom
        align="center"
        sx={{ mb: isMobile ? 3 : 6, fontWeight: 500 }}
      >
        Hoş Geldiniz
      </Typography>
      <Grid container spacing={isMobile ? 2 : 4}>
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.text}>
            <Link href={item.path} style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  height: isMobile ? 120 : 200,
                  display: "flex",
                  flexDirection: isMobile ? "row" : "column",
                  alignItems: "center",
                  justifyContent: isMobile ? "flex-start" : "center",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  borderRadius: isMobile ? 2 : 3,
                  px: isMobile ? 3 : 2,
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: (theme) => theme.shadows[8],
                    "& .icon": {
                      transform: "scale(1.1)",
                      color: "primary.main",
                    },
                    "& .text": {
                      color: "primary.main",
                    },
                  },
                  "&:active": {
                    // Mobil dokunma efekti
                    transform: isMobile ? "scale(0.98)" : "translateY(-4px)",
                    backgroundColor: isMobile
                      ? "rgba(0, 0, 0, 0.05)"
                      : "inherit",
                  },
                }}
              >
                <Box
                  className="icon"
                  sx={{
                    mb: isMobile ? 0 : 2,
                    mr: isMobile ? 3 : 0,
                    transition: "all 0.3s ease",
                    color: "text.primary",
                    "& svg": {
                      fontSize: isMobile ? 36 : 48,
                    },
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant={isMobile ? "h6" : "h5"}
                  component="div"
                  className="text"
                  sx={{
                    fontWeight: 500,
                    transition: "all 0.3s ease",
                    color: "text.primary",
                  }}
                >
                  {item.text}
                </Typography>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
