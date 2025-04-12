"use client";

import React, { useState } from "react";
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
import { useAuth } from "../../contexts/AuthContext";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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
      await register({ username, email, password });
      // Başarılı kayıt - yönlendirme AuthContext içinde yapılıyor
    } catch (error: any) {
      setError(error.response?.data?.message || "Kayıt işlemi başarısız oldu");
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
          Kayıt Ol
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="Kullanıcı Adı"
            name="username"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="E-posta Adresi"
            name="email"
            autoComplete="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            name="password"
            label="Şifre"
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
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            sx={{ mb: 3, py: 1.5 }}
          >
            Kayıt Ol
          </Button>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Zaten bir hesabınız var mı?{" "}
              <Link href="/login" passHref>
                <MuiLink component="span" underline="hover">
                  Giriş Yap
                </MuiLink>
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
