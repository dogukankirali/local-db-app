"use client";

import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress, IconButton } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import AuthShell, { authLinkSx } from "../../components/auth/AuthShell";
import { Field, TextInput } from "../../components/ui/FormControls";
import { palette } from "../../theme/customTheme";

// 0-4 arası kaba şifre gücü: uzunluk, harf/rakam karışımı ve sembol
function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[a-zçğıöşü]/i.test(pw) && /\d/.test(pw)) s++;
  if (/[^a-z0-9çğıöşü]/i.test(pw)) s++;
  return s;
}
const STRENGTH = [
  { label: "", color: palette.textFaint },
  { label: "Zayıf", color: palette.danger },
  { label: "Orta", color: palette.warning },
  { label: "İyi", color: "#60A5FA" },
  { label: "Güçlü", color: palette.success },
];

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { register, isAuthenticated } = useAuth();
  const router = useRouter();
  const strength = passwordStrength(password);

  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  React.useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim()) return setError("Kullanıcı adı gerekli");
    if (!email.trim()) return setError("E-posta adresi gerekli");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Geçerli bir e-posta adresi gir");
    if (!password) return setError("Şifre gerekli");
    if (password.length < 6) return setError("Şifre en az 6 karakter olmalı");
    if (password !== confirmPassword) return setError("Şifreler eşleşmiyor");
    setBusy(true);
    try {
      await register({ username, email, password });
      // Başarılı kayıt - yönlendirme AuthContext içinde yapılıyor
    } catch (error: any) {
      setError(error.response?.data?.message || "Kayıt işlemi başarısız oldu");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (
    <IconButton size="small" aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} onClick={() => setShowPassword((s) => !s)}>
      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
    </IconButton>
  );

  return (
    <AuthShell
      title="Hesap oluştur"
      subtitle="Birkaç saniyede kendi arşivini başlat."
      footer={
        <>
          Zaten hesabın var mı?{" "}
          <Box component={Link} href="/login" sx={authLinkSx}>
            Giriş yap
          </Box>
        </>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "8px" }}>
          {error}
        </Alert>
      )}
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
        <Field label="E-posta">
          <TextInput
            id="email"
            inputProps={{ "aria-label": "E-posta" }}
            name="email"
            type="email"
            autoComplete="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Şifre" hint={password ? <Box component="span" sx={{ color: STRENGTH[strength].color, fontWeight: 600 }}>{STRENGTH[strength].label}</Box> : "En az 6 karakter"}>
          <TextInput
            id="password"
            inputProps={{ "aria-label": "Şifre" }}
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            endAdornmentNode={toggle}
          />
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0.5, mt: 0.75 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box
                key={i}
                sx={{
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: i <= strength ? STRENGTH[strength].color : "rgba(255,255,255,0.08)",
                  transition: "background-color .2s ease",
                }}
              />
            ))}
          </Box>
        </Field>
        <Field
          label="Şifre tekrar"
          hint={confirmPassword && confirmPassword !== password ? <Box component="span" sx={{ color: palette.danger }}>Eşleşmiyor</Box> : undefined}
        >
          <TextInput
            id="confirmPassword"
            inputProps={{ "aria-label": "Şifre tekrar" }}
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            fullWidth
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
          Kayıt ol
        </Button>
      </Box>
    </AuthShell>
  );
}
