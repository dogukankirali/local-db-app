"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Link as MuiLink,
  Alert,
  InputAdornment,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import Link from "next/link";
import { useAuth } from "../../../contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { resetPassword, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams();
  const [token, setToken] = useState<string>("");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Token'ı params'dan al
  useEffect(() => {
    if (params && params.token) {
      setToken(params.token as string);
    } else {
      setError(
        "Geçersiz veya eksik token. Lütfen geçerli bir şifre sıfırlama bağlantısı kullanın."
      );
    }
  }, [params]);

  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Token kontrolü
    if (!token) {
      setError(
        "Geçersiz token. Lütfen geçerli bir şifre sıfırlama bağlantısı kullanın."
      );
      return;
    }

    // Form doğrulama
    if (!password) {
      setError("Şifre gereklidir");
      return;
    }

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalıdır");
      return;
    }

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    try {
      await resetPassword({ token, password });
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

      // 3 saniye sonra giriş sayfasına yönlendir
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || "Şifre sıfırlanamadı");
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        p: 2,
        backgroundColor: "background.default",
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: isMobile ? 3 : 4,
          width: "100%",
          maxWidth: "450px",
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h4"
          component="h1"
          align="center"
          gutterBottom
          sx={{ fontWeight: 600, mb: 3 }}
        >
          Şifre Sıfırlama
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Şifreniz başarıyla sıfırlandı. Giriş sayfasına
            yönlendiriliyorsunuz...
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Lütfen yeni şifrenizi belirleyin.
          </Typography>

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Yeni Şifre"
            type={showPassword ? "text" : "password"}
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() => setShowPassword(!showPassword)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
            disabled={loading || success}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="confirmPassword"
            label="Şifreyi Onayla"
            type={showPassword ? "text" : "password"}
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            sx={{ mb: 3 }}
            disabled={loading || success}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            sx={{ mb: 3, py: 1.5 }}
            disabled={loading || success}
          >
            {loading ? "İşleniyor..." : "Şifreyi Sıfırla"}
          </Button>

          {!success && (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                <Link href="/login" passHref>
                  <MuiLink component="span" underline="hover">
                    Giriş sayfasına dön
                  </MuiLink>
                </Link>
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
