"use client";

import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
  IconButton,
  useMediaQuery,
  useTheme,
  Drawer,
  Divider,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
import CloseIcon from "@mui/icons-material/Close";
import Link from "next/link";
import { usePathname } from "next/navigation";

const drawerWidth = 240;
const closedDrawerWidth = 64;

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const menuItems = [
    { text: "Anime", icon: <MovieIcon />, path: "/anime" },
    { text: "Manga", icon: <MenuBookIcon />, path: "/manga" },
    { text: "Kitaplar", icon: <ImportContactsIcon />, path: "/book" },
    { text: "Diziler", icon: <LiveTvIcon />, path: "/series" },
  ];

  // Mobil cihazlar için drawer kullanıyoruz
  if (isMobile) {
    return (
      <Drawer
        anchor="left"
        open={open}
        onClose={onClose}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            top: 0,
            height: "100%",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            p: 1,
            minHeight: 64, // Navbar ile aynı yükseklik
          }}
        >
          <IconButton onClick={onClose} size="medium">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />
        <List sx={{ pt: 0 }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding>
                <Link
                  href={item.path}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    width: "100%",
                  }}
                  onClick={onClose} // Mobilde menüye tıklayınca sidebar'ı kapat
                >
                  <ListItemButton
                    sx={{
                      minHeight: 56, // Mobil için daha büyük dokunma alanı
                      px: 2.5,
                      bgcolor: isActive ? "action.selected" : "transparent",
                      "&:hover": {
                        bgcolor: isActive ? "action.selected" : "action.hover",
                      },
                    }}
                  >
                    <ListItemIcon
                      sx={{
                        minWidth: 0,
                        mr: 3,
                        justifyContent: "center",
                        color: isActive ? "primary.main" : "inherit",
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.text}
                      sx={{
                        color: isActive ? "primary.main" : "inherit",
                      }}
                    />
                  </ListItemButton>
                </Link>
              </ListItem>
            );
          })}
        </List>
        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            width: "100%",
            textAlign: "center",
            color: "text.secondary",
            fontSize: "0.875rem",
          }}
        >
          v1.1.3
        </Box>
      </Drawer>
    );
  }

  // Masaüstü görünümü
  return (
    <Box
      sx={{
        position: "fixed",
        top: 64,
        left: 0,
        bottom: 0,
        width: open ? drawerWidth : closedDrawerWidth,
        bgcolor: "background.paper",
        borderRight: 1,
        borderColor: "divider",
        transition: (theme) =>
          theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        overflowX: "hidden",
        zIndex: (theme) => theme.zIndex.drawer,
      }}
    >
      <List>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding>
              <Link
                href={item.path}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  width: "100%",
                }}
              >
                <ListItemButton
                  sx={{
                    minHeight: 44,
                    justifyContent: open ? "initial" : "center",
                    px: 2.5,
                    bgcolor: isActive ? "action.selected" : "transparent",
                    "&:hover": {
                      bgcolor: isActive ? "action.selected" : "action.hover",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : "auto",
                      justifyContent: "center",
                      color: isActive ? "primary.main" : "inherit",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      opacity: open ? 1 : 0,
                      color: isActive ? "primary.main" : "inherit",
                    }}
                  />
                </ListItemButton>
              </Link>
            </ListItem>
          );
        })}
      </List>
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          width: "100%",
          textAlign: "center",
          color: "text.secondary",
          fontSize: "0.875rem",
          opacity: open ? 1 : 0,
          transition: (theme) =>
            theme.transitions.create("opacity", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        v1.1.3
      </Box>
    </Box>
  );
}
