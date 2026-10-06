"use client";

import React, { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import AuthShell, { authLinkSx } from "../../components/auth/AuthShell";
import { Field, TextInput } from "../../components/ui/FormControls";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { resetPassword, loading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState<string>("");

  // Token bağlantıdaki ?token= parametresinden okunur (site statik sunulduğu için yol parametresi yok)
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token");
    if (value) setToken(value);
    else setError("Geçersiz veya eksik bağlantı. Lütfen e-postadaki sıfırlama bağlantısını kullan.");
  }, []);

  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!token) return setError("Geçersiz bağlantı. Lütfen e-postadaki sıfırlama bağlantısını kullan.");
    if (!password) return setError("Şifre gerekli");
    if (password.length < 6) return setError("Şifre en az 6 karakter olmalı");
    if (password !== confirmPassword) return setError("Şifreler eşleşmiyor");
    try {
      await resetPassword({ token, password });
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
      // 3 saniye sonra giriş sayfasına yönlendir
      setTimeout(() => router.push("/login"), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || "Şifre sıfırlanamadı");
    }
  };

  const disabled = loading || success || !token;

  return (
    <AuthShell
      title="Yeni şifre belirle"
      subtitle="Hesabın için yeni bir şifre seç."
      footer={
        <Box component={Link} href="/login" sx={authLinkSx}>
          Giriş sayfasına dön
        </Box>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "8px" }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: "8px" }}>
          Şifren güncellendi. Giriş sayfasına yönlendiriliyorsun…
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "grid", gap: 2 }}>
        <Field label="Yeni şifre" hint="En az 6 karakter">
          <TextInput
            id="password"
            inputProps={{ "aria-label": "Yeni şifre" }}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            autoFocus
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled}
            endAdornmentNode={
              <IconButton size="small" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            }
          />
        </Field>
        <Field label="Şifre tekrar">
          <TextInput
            id="confirmPassword"
            inputProps={{ "aria-label": "Şifre tekrar" }}
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={disabled}
          />
        </Field>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={disabled}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ mt: 1, py: 1.25, borderRadius: "8px", fontWeight: 700 }}
        >
          Şifreyi güncelle
        </Button>
      </Box>
    </AuthShell>
  );
}
