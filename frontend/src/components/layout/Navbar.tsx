"use client";

import { useState } from "react";
import {
  AppBar,
  Toolbar,
  IconButton,
  InputBase,
  Box,
  Menu,
  MenuItem,
  Avatar,
  Theme,
  Typography,
  useMediaQuery,
  useTheme,
  Tooltip,
  Button,
  Divider,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import MenuIcon from "@mui/icons-material/Menu";
import StorageIcon from "@mui/icons-material/Storage";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import Link from "next/link";
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleLogout = async () => {
    handleClose();
    await logout();
  };

  const handleProfileClick = () => {
    handleClose();
    router.push("/profile");
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        backgroundColor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
      }}
      elevation={0}
      color="inherit"
    >
      <Toolbar sx={{ px: isMobile ? 1 : 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: isMobile ? "auto" : 200,
            mr: isMobile ? 1 : 2,
          }}
        >
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={onMenuClick}
            sx={{ mr: isMobile ? 0.5 : 2 }}
            size={isMobile ? "small" : "medium"}
          >
            <MenuIcon fontSize={isMobile ? "small" : "medium"} />
          </IconButton>

          <Link
            href="/"
            style={{
              textDecoration: "none",
              color: "inherit",
              display: "flex",
              alignItems: "center",
            }}
          >
            <StorageIcon
              sx={{ mr: isMobile ? 0.5 : 1 }}
              fontSize={isMobile ? "small" : "medium"}
            />
            <Typography
              variant={isMobile ? "body2" : "subtitle1"}
              noWrap
              component="div"
              sx={{
                fontWeight: 600,
                display: { xs: isMobile ? "none" : "block", sm: "block" },
              }}
            >
              Local DB
            </Typography>
          </Link>
        </Box>

        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            justifyContent: "center",
            mx: isMobile ? 0.5 : 2,
          }}
        >
          <Box
            sx={{
              position: "relative",
              borderRadius: 1,
              bgcolor: "action.hover",
              width: "100%",
              maxWidth: isMobile ? "150px" : isTablet ? "250px" : "400px",
            }}
          >
            <Box
              sx={{
                padding: isMobile ? "0 8px" : "0 12px",
                height: "100%",
                position: "absolute",
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SearchIcon fontSize={isMobile ? "small" : "medium"} />
            </Box>
            <InputBase
              placeholder={isMobile ? "Ara" : "Ara..."}
              value={searchQuery}
              onChange={handleSearch}
              sx={{
                color: "inherit",
                width: "100%",
                "& .MuiInputBase-input": {
                  padding: isMobile ? "8px 8px 8px 0" : "12px 12px 12px 0",
                  paddingLeft: isMobile
                    ? `calc(1em + 16px)`
                    : `calc(1em + 28px)`,
                  width: "100%",
                  fontSize: isMobile ? "0.75rem" : "0.875rem",
                },
              }}
              inputProps={{ "aria-label": "search" }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            minWidth: isMobile ? "auto" : 200,
            justifyContent: "flex-end",
          }}
        >
          {isAuthenticated && user ? (
            <>
              <Tooltip title="Profil">
                <IconButton
                  size={isMobile ? "small" : "medium"}
                  aria-label="account of current user"
                  aria-controls="menu-appbar"
                  aria-haspopup="true"
                  onClick={handleMenu}
                >
                  <Avatar
                    sx={{
                      width: isMobile ? 28 : 36,
                      height: isMobile ? 28 : 36,
                    }}
                  >
                    {user.username
                      ? user.username.charAt(0).toUpperCase()
                      : "U"}
                  </Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                keepMounted
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {user.username}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem onClick={handleProfileClick}>
                  <PersonIcon fontSize="small" sx={{ mr: 1 }} />
                  Profil
                </MenuItem>
                {user.isAdmin && (
                  <MenuItem onClick={handleClose}>
                    <SettingsIcon fontSize="small" sx={{ mr: 1 }} />
                    Yönetici Paneli
                  </MenuItem>
                )}
                <Divider />
                <MenuItem onClick={handleLogout}>
                  <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                  Çıkış Yap
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Link href="/login" style={{ textDecoration: "none" }}>
                <Button
                  variant="outlined"
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                >
                  Giriş
                </Button>
              </Link>
              {!isMobile && (
                <Link href="/register" style={{ textDecoration: "none" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size={isMobile ? "small" : "medium"}
                  >
                    Kayıt Ol
                  </Button>
                </Link>
              )}
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
