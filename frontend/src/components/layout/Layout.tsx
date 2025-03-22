"use client";

import { useEffect, useState } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const drawerWidth = 240;
const closedDrawerWidth = 64;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  useEffect(() => {
    // İlk render'da window boyutlarını ayarla
    const width = window.innerWidth;
    setWindowSize({
      width: width,
      height: window.innerHeight,
    });

    // Mobil görünümde sidebar'ı kapalı ayarla
    if (width <= 768) {
      setOpen(false);
    }

    const handleResize = () => {
      const newWidth = window.innerWidth;
      setWindowSize({
        width: newWidth,
        height: window.innerHeight,
      });

      // Ekran boyutu değiştiğinde mobil görünüme geçerse sidebar'ı kapat
      if (newWidth <= 768) {
        setOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Box>
      <Navbar onMenuClick={handleDrawerToggle} />
      <Sidebar open={open} onClose={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          minHeight: "100vh",
          pt: isMobile ? "56px" : "64px", // Navbar height - mobilde daha küçük
          pl: isMobile
            ? 0
            : open
            ? `${drawerWidth}px`
            : `${closedDrawerWidth}px`,
          transition: theme.transitions.create(["margin", "padding"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: isMobile
              ? "100%"
              : isTablet
              ? "100%"
              : open
              ? `calc(100% - 40px)`
              : `calc(100% - 80px)`,
            mx: "auto",
            p: isMobile ? 1 : isTablet ? 2 : 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
