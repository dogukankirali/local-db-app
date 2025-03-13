"use client";

import { Typography, Grid, Card, Box } from "@mui/material";
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
  return (
    <>
      <Typography
        variant="h4"
        component="h1"
        gutterBottom
        align="center"
        sx={{ mb: 6, fontWeight: 500 }}
      >
        Hoş Geldiniz
      </Typography>
      <Grid container spacing={4}>
        {menuItems.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.text}>
            <Link href={item.path} style={{ textDecoration: "none" }}>
              <Card
                sx={{
                  height: 200,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-8px)",
                    boxShadow: (theme) => theme.shadows[8],
                    "& .icon": {
                      transform: "scale(1.1)",
                      color: "primary.main",
                    },
                    "& .text": {
                      color: "primary.main",
                    },
                  },
                }}
              >
                <Box
                  className="icon"
                  sx={{
                    mb: 2,
                    transition: "all 0.3s ease",
                    color: "text.primary",
                  }}
                >
                  {item.icon}
                </Box>
                <Typography
                  variant="h6"
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
    </>
  );
}
