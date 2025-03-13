"use client";

import { useEffect, useState } from "react";
import { Box } from "@mui/material";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const drawerWidth = 240;
const closedDrawerWidth = 64;

export default function Layout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
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
          pt: "64px", // Navbar height
          pl: `${closedDrawerWidth}px`, // Minimum sidebar width
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: windowSize.width - 400,
            mx: "auto",
            p: 3,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
