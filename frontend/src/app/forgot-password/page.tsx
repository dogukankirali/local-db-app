"use client";

import React, { useState } from "react";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import AuthShell, { authLinkSx } from "../../components/auth/AuthShell";
import { Field, TextInput } from "../../components/ui/FormControls";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { forgotPassword, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Kullanıcı zaten giriş yapmışsa ana sayfaya yönlendir
  React.useEffect(() => {
    if (isAuthenticated) router.push("/");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    if (!email.trim()) return setError("E-posta adresi gerekli");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Geçerli bir e-posta adresi gir");
    try {
      await forgotPassword({ email });
      setSuccess(true);
      setEmail("");
    } catch (error: any) {
      setError(error.response?.data?.message || "Şifre sıfırlama isteği gönderilemedi");
    }
  };

  return (
    <AuthShell
      title="Şifreni mi unuttun?"
      subtitle="Kayıtlı e-posta adresini gir, sana bir sıfırlama bağlantısı gönderelim."
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
          Bağlantı gönderildi. E-postanı kontrol et.
        </Alert>
      )}
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: "grid", gap: 2 }}>
        <Field label="E-posta">
          <TextInput
            id="email"
            inputProps={{ "aria-label": "E-posta" }}
            name="email"
            type="email"
            autoComplete="email"
            autoFocus
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading || success}
          />
        </Field>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={loading || success}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : undefined}
          sx={{ mt: 1, py: 1.25, borderRadius: "8px", fontWeight: 700 }}
        >
          Sıfırlama bağlantısı gönder
        </Button>
      </Box>
    </AuthShell>
  );
}
