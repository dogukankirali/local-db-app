"use client";

import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Box,
} from "@mui/material";
import MovieIcon from "@mui/icons-material/Movie";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LiveTvIcon from "@mui/icons-material/LiveTv";
import ImportContactsIcon from "@mui/icons-material/ImportContacts";
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

  const menuItems = [
    { text: "Anime", icon: <MovieIcon />, path: "/anime" },
    { text: "Manga", icon: <MenuBookIcon />, path: "/manga" },
    { text: "Books", icon: <ImportContactsIcon />, path: "/book" },
    { text: "Series", icon: <LiveTvIcon />, path: "/series" },
  ];

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
    </Box>
  );
}
