"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Avatar,
  Grid,
  Alert,
  Divider,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { AccountCircle, Save } from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function ProfilePage() {
  const { user, updateProfile, loading, error: authError } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Form doğrulama
    if (!username.trim()) {
      setError("Kullanıcı adı gereklidir");
      return;
    }

    if (!email.trim()) {
      setError("E-posta adresi gereklidir");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Geçerli bir e-posta adresi giriniz");
      return;
    }

    try {
      // UpdateProfileRequest tipine uygun olarak sadece email gönderiyoruz
      await updateProfile({ email });
      setSuccess(true);
      setIsEditing(false);
    } catch (error: any) {
      setError(error.response?.data?.message || "Profil güncellenemedi");
    }
  };

  return (
    <ProtectedRoute>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          p: 2,
          backgroundColor: "background.default",
          minHeight: "calc(100vh - 64px)",
        }}
      >
        <Paper
          elevation={3}
          sx={{
            p: isMobile ? 3 : 4,
            width: "100%",
            maxWidth: "700px",
            borderRadius: 2,
            mt: 4,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              mb: 4,
            }}
          >
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "primary.main",
                mr: isMobile ? 0 : 3,
                mb: isMobile ? 2 : 0,
              }}
            >
              <AccountCircle fontSize="large" />
            </Avatar>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom>
                {user?.username || "Kullanıcı"}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {user?.email || ""}
              </Typography>
              {user?.isAdmin && (
                <Typography
                  variant="body2"
                  sx={{
                    color: "primary.main",
                    fontWeight: "bold",
                    mt: 1,
                  }}
                >
                  Yönetici
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 4 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Profil başarıyla güncellendi
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="username"
                  label="Kullanıcı Adı"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={!isEditing || loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="E-posta Adresi"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!isEditing || loading}
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: 4,
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              {!isEditing ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => setIsEditing(true)}
                  disabled={loading}
                >
                  Düzenle
                </Button>
              ) : (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setIsEditing(false);
                      if (user) {
                        setUsername(user.username);
                        setEmail(user.email);
                      }
                      setError(null);
                    }}
                    disabled={loading}
                  >
                    İptal
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    startIcon={
                      loading ? <CircularProgress size={20} /> : <Save />
                    }
                    disabled={loading}
                  >
                    Kaydet
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </ProtectedRoute>
  );
}
