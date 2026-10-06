"use client";

import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import AuthShell, { authLinkSx } from "../../components/auth/AuthShell";
import GoogleButton, { readGoogleHash } from "../../components/auth/GoogleButton";
import { Field, TextInput } from "../../components/ui/FormControls";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { login, loginWithSession, isAuthenticated } = useAuth();
  const router = useRouter();

  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  React.useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  // Google dönüşü: /login#google=<oturum> ya da #google_error=<mesaj>
  React.useEffect(() => {
    const result = readGoogleHash();
    if (result?.session) loginWithSession(result.session);
    else if (result?.error) setError(result.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) return setError("Kullanıcı adı gerekli");
    if (!password) return setError("Şifre gerekli");
    setBusy(true);
    try {
      await login({ username, password });
      // Başarılı giriş - yönlendirme AuthContext içinde yapılıyor
    } catch (error: any) {
      setError(error.response?.data?.message || "Giriş yapılamadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Tekrar hoş geldin"
      subtitle="Arşivine devam etmek için giriş yap."
      footer={
        <>
          Hesabın yok mu?{" "}
          <Box component={Link} href="/register" sx={authLinkSx}>
            Kayıt ol
          </Box>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "8px" }}>
          {error}
        </Alert>
      )}
      <GoogleButton />
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "grid", gap: 2 }}>
        <Field label="Kullanıcı adı">
          <TextInput
            id="username"
            inputProps={{ "aria-label": "Kullanıcı adı" }}
            name="username"
            autoComplete="username"
            autoFocus
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field
          label="Şifre"
          hint={
            <Box component={Link} href="/forgot-password" sx={{ ...authLinkSx, fontWeight: 500 }}>
              Şifremi unuttum
            </Box>
          }
        >
          <TextInput
            id="password"
            inputProps={{ "aria-label": "Şifre" }}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            endAdornmentNode={
              <IconButton size="small" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            }
          />
        </Field>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ mt: 1, py: 1.25, borderRadius: "8px", fontWeight: 700 }}
        >
          Giriş yap
        </Button>
      </Box>
    </AuthShell>
  );
}
