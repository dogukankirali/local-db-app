"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  InputBase,
  Skeleton,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import { useAuth } from "../../contexts/AuthContext";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import { AnimeService } from "../../Services/AnimeServices";
import { GenreChips } from "../../components/Common/GenreChip";
import { palette } from "../../theme/customTheme";

type Status = { severity: "success" | "error"; text: string } | null;

const card = {
  p: { xs: 2, md: 3 },
  borderRadius: "16px",
  backgroundColor: palette.surface,
  border: `1px solid ${alpha("#FFFFFF", 0.06)}`,
};

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  disabled,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  disabled?: boolean;
}) {
  return (
    <Box component="label" sx={{ display: "block" }}>
      <Typography sx={{ mb: 0.75, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: palette.textMuted }}>
        {label}
      </Typography>
      <InputBase
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        disabled={disabled}
        fullWidth
        sx={{
          height: 40,
          px: 1.5,
          borderRadius: "10px",
          fontSize: "0.9rem",
          color: palette.text,
          border: `1px solid ${alpha("#FFFFFF", 0.08)}`,
          backgroundColor: alpha("#FFFFFF", 0.03),
          "&.Mui-focused": { borderColor: alpha(palette.primary, 0.6) },
          "&.Mui-disabled": { opacity: 0.6 },
        }}
      />
    </Box>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 85 ? palette.success : score >= 70 ? palette.warning : palette.danger;
  return (
    <Box
      sx={{
        minWidth: 42,
        height: 28,
        px: 1,
        borderRadius: "8px",
        display: "grid",
        placeItems: "center",
        fontWeight: 700,
        fontSize: "0.85rem",
        color,
        backgroundColor: alpha(color, 0.12),
        border: `1px solid ${alpha(color, 0.3)}`,
      }}
    >
      {score}
    </Box>
  );
}

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  const [animes, setAnimes] = useState<TEATable.IAnime[] | null>(null);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setEmail(user.email ?? "");
  }, [user]);

  // Arşiv tek kullanıcılı (bkz. #39): istatistik ve en iyi 10 tüm arşivden hesaplanır
  useEffect(() => {
    AnimeService.getAnimes({ page: 1, count: 1000, filters: [], order: "desc", orderBy: "Score" }).then((res) =>
      setAnimes(res?.data ?? [])
    );
  }, []);

  const stats = useMemo(() => {
    if (!animes) return null;
    const rated = animes.filter((a) => Number(a.Score) > 0);
    const completed = animes.filter((a) => {
      const total = Number(a.TotalNumberOfEpisodes) || 0;
      return total > 0 && a.WatchStatus >= total;
    });
    const avg = rated.length ? rated.reduce((s, a) => s + Number(a.Score), 0) / rated.length : 0;
    return {
      total: animes.length,
      completed: completed.length,
      avg: Math.round(avg * 10) / 10,
      top: rated.slice(0, 10),
    };
  }, [animes]);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "";
  const profileDirty =
    !!user && (firstName !== (user.firstName ?? "") || lastName !== (user.lastName ?? "") || email !== (user.email ?? ""));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileStatus({ severity: "error", text: "Geçerli bir e-posta adresi gir" });
      return;
    }
    setSavingProfile(true);
    try {
      await updateProfile({ email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim() });
      setProfileStatus({ severity: "success", text: "Profil güncellendi" });
    } catch (err: any) {
      setProfileStatus({ severity: "error", text: err?.response?.data?.message || "Profil güncellenemedi" });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);
    if (newPassword.length < 6) {
      setPasswordStatus({ severity: "error", text: "Yeni şifre en az 6 karakter olmalı" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus({ severity: "error", text: "Yeni şifreler eşleşmiyor" });
      return;
    }
    setSavingPassword(true);
    try {
      await updateProfile({ password: newPassword, currentPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus({ severity: "success", text: "Şifren değiştirildi" });
    } catch (err: any) {
      setPasswordStatus({ severity: "error", text: err?.response?.data?.message || "Şifre değiştirilemedi" });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ProtectedRoute>
      <Box sx={{ maxWidth: 1180, mx: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Başlık kartı */}
        <Box
          sx={{
            ...card,
            display: "flex",
            alignItems: "center",
            gap: 2.5,
            flexWrap: "wrap",
            background: `radial-gradient(120% 160% at 0% 0%, ${alpha(palette.primary, 0.25)} 0%, transparent 55%), ${palette.surface}`,
          }}
        >
          <Avatar sx={{ width: 72, height: 72, fontSize: "1.8rem", fontWeight: 700, bgcolor: alpha(palette.primary, 0.3), color: "#fff" }}>
            {(displayName || "U").charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{displayName}</Typography>
            <Typography sx={{ color: palette.textMuted, fontSize: "0.9rem" }}>
              @{user?.username}
              {user?.isAdmin && (
                <Box component="span" sx={{ ml: 1, px: 0.75, py: 0.1, borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, color: palette.primary, backgroundColor: alpha(palette.primary, 0.14) }}>
                  Yönetici
                </Box>
              )}
            </Typography>
            {user?.createdAt && (
              <Typography sx={{ color: palette.textFaint, fontSize: "0.78rem", mt: 0.5 }}>
                {new Date(user.createdAt).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })} tarihinden beri üye
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", gap: { xs: 2, sm: 4 } }}>
            {[
              { label: "Anime", value: stats?.total },
              { label: "Tamamlanan", value: stats?.completed },
              { label: "Ort. puan", value: stats?.avg },
            ].map((s) => (
              <Box key={s.label} sx={{ textAlign: "center" }}>
                {s.value === undefined ? (
                  <Skeleton width={40} height={34} sx={{ mx: "auto", bgcolor: alpha("#FFFFFF", 0.06) }} />
                ) : (
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{s.value}</Typography>
                )}
                <Typography sx={{ fontSize: "0.72rem", color: palette.textMuted }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.4fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
          {/* En yüksek puanlı 10 */}
          <Box sx={card}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <EmojiEventsRoundedIcon sx={{ color: palette.warning }} />
              <Typography sx={{ fontWeight: 700, fontSize: "1.05rem" }}>En yüksek puanlı 10 anime</Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {!stats
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: "12px", bgcolor: alpha("#FFFFFF", 0.04) }} />
                  ))
                : stats.top.map((anime, i) => (
                    <Box
                      key={anime.ID}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1,
                        borderRadius: "12px",
                        "&:hover": { backgroundColor: alpha("#FFFFFF", 0.03) },
                      }}
                    >
                      <Typography sx={{ width: 24, textAlign: "center", fontWeight: 700, color: i < 3 ? palette.warning : palette.textMuted }}>{i + 1}</Typography>
                      <Box sx={{ width: 40, height: 56, borderRadius: "6px", overflow: "hidden", flexShrink: 0, backgroundColor: palette.surfaceRaised }}>
                        {anime.Cover && (
                          <img src={anime.Cover} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        )}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.9rem", mb: 0.5 }}>
                          {anime.Name}
                        </Typography>
                        <GenreChips genres={anime.Genre} max={3} justify="flex-start" />
                      </Box>
                      <ScoreBadge score={Number(anime.Score)} />
                    </Box>
                  ))}
              {stats && stats.top.length === 0 && (
                <Typography sx={{ color: palette.textMuted, fontSize: "0.875rem" }}>Henüz puan verdiğin bir anime yok.</Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Profil bilgileri */}
            <Box component="form" onSubmit={saveProfile} sx={card}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", mb: 2 }}>Profil bilgileri</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                <Field label="Ad" value={firstName} onChange={setFirstName} autoComplete="given-name" />
                <Field label="Soyad" value={lastName} onChange={setLastName} autoComplete="family-name" />
              </Box>
              <Box sx={{ display: "grid", gap: 2 }}>
                <Field label="Kullanıcı adı" value={user?.username ?? ""} onChange={() => {}} disabled />
                <Field label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" />
              </Box>
              {profileStatus && (
                <Alert severity={profileStatus.severity} sx={{ mt: 2 }}>
                  {profileStatus.text}
                </Alert>
              )}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2.5 }}>
                <Button type="submit" variant="contained" disabled={!profileDirty || savingProfile} startIcon={savingProfile ? <CircularProgress size={16} color="inherit" /> : undefined}>
                  Kaydet
                </Button>
              </Box>
            </Box>

            {/* Şifre */}
            <Box component="form" onSubmit={savePassword} sx={card}>
              <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", mb: 2 }}>Şifre değiştir</Typography>
              <Box sx={{ display: "grid", gap: 2 }}>
                <Field label="Mevcut şifre" type="password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
                <Field label="Yeni şifre" type="password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                <Field label="Yeni şifre (tekrar)" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
              </Box>
              {passwordStatus && (
                <Alert severity={passwordStatus.severity} sx={{ mt: 2 }}>
                  {passwordStatus.text}
                </Alert>
              )}
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2.5 }}>
                <Button component={Link} href="/forgot-password" sx={{ color: palette.textMuted, px: 0 }}>
                  Şifremi unuttum
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={!currentPassword || !newPassword || savingPassword}
                  startIcon={savingPassword ? <CircularProgress size={16} color="inherit" /> : undefined}
                >
                  Şifreyi değiştir
                </Button>
              </Box>
            </Box>

            {/* Öneriler (#39) */}
            <Box sx={{ ...card, borderStyle: "dashed", display: "flex", gap: 2, alignItems: "flex-start" }}>
              <AutoAwesomeRoundedIcon sx={{ color: palette.accent, mt: 0.25 }} />
              <Box>
                <Typography sx={{ fontWeight: 600, mb: 0.5 }}>Sana özel öneriler yakında</Typography>
                <Typography sx={{ color: palette.textMuted, fontSize: "0.85rem" }}>
                  Puanladığın türlere göre anime önerileri, kullanıcıya özel veri modeliyle birlikte geliyor (GitHub #39).
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
