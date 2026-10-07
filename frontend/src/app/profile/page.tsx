"use client";

import AppearanceSettings from "../../components/profile/AppearanceSettings";
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
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import { Switch, IconButton, Tooltip } from "@mui/material";
import { toast } from "sonner";
import { ProfileService, type ApiToken, type Profile } from "../../Services/ProfileService";
import { sizedCover } from "../../utils/cover";
import EmojiEventsRoundedIcon from "@mui/icons-material/EmojiEventsRounded";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import DiscoverRecommendations from "../../components/profile/DiscoverRecommendations";
import RewatchWheel from "../../components/profile/RewatchWheel";
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
  border: `1px solid ${alpha(palette.overlay, 0.06)}`,
};

function Field({
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  disabled,
  multiline,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  disabled?: boolean;
  multiline?: boolean;
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
        multiline={multiline}
        minRows={multiline ? 3 : undefined}
        fullWidth
        sx={{
          minHeight: 40,
          py: multiline ? 1 : 0,
          px: 1.5,
          borderRadius: "10px",
          fontSize: "0.9rem",
          color: palette.text,
          border: `1px solid ${alpha(palette.overlay, 0.08)}`,
          backgroundColor: alpha(palette.overlay, 0.03),
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

// Avatar: seçilen görsel 256 px'e küçültülüp JPEG data URL olarak saklanır (API sınırı ~300 KB)
async function avatarFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const side = Math.min(img.width, img.height);
    ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function SectionTitle({ icon, children, extra }: { icon?: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      {icon}
      <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", flex: 1 }}>{children}</Typography>
      {extra}
    </Box>
  );
}

function CoverCard({ anime, rank, caption }: { anime: TEATable.IAnime; rank?: number; caption?: React.ReactNode }) {
  const score = Number(anime.Score) || 0;
  return (
    <Box sx={{ minWidth: 0 }}>
      <Box
        sx={{
          position: "relative",
          aspectRatio: "2 / 3",
          borderRadius: "10px",
          overflow: "hidden",
          backgroundColor: palette.surfaceRaised,
          boxShadow: `0 10px 24px rgba(0,0,0,0.4), 0 0 0 1px ${alpha(palette.overlay, 0.06)}`,
        }}
      >
        {anime.Cover && (
          <img src={sizedCover(anime.Cover, "medium")} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        )}
        {rank !== undefined && (
          <Box
            sx={{
              position: "absolute",
              top: 6,
              left: 6,
              minWidth: 24,
              height: 24,
              px: 0.5,
              borderRadius: "6px",
              display: "grid",
              placeItems: "center",
              fontSize: "0.75rem",
              fontWeight: 800,
              color: rank <= 3 ? "#1A1300" : palette.text,
              backgroundColor: rank <= 3 ? palette.warning : alpha("#000000", 0.6),
            }}
          >
            {rank}
          </Box>
        )}
        {score > 0 && (
          <Box sx={{ position: "absolute", right: 6, bottom: 6 }}>
            <ScoreBadge score={score} />
          </Box>
        )}
      </Box>
      <Typography noWrap title={anime.Name} sx={{ mt: 0.75, fontWeight: 600, fontSize: "0.82rem" }}>
        {anime.Name}
      </Typography>
      {caption && <Box sx={{ fontSize: "0.72rem", color: palette.textMuted, mt: 0.25 }}>{caption}</Box>}
    </Box>
  );
}

const coverGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 2 };

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileStatus, setProfileStatus] = useState<Status>(null);
  const avatarInput = React.useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<Status>(null);

  const [animes, setAnimes] = useState<TEATable.IAnime[] | null>(null);
  const [top, setTop] = useState<TEATable.IAnime[] | null>(null);
  const [tokens, setTokens] = useState<ApiToken[] | null>(null);
  const [newToken, setNewToken] = useState<string | null>(null);

  const applyProfile = (p: Profile) => {
    setProfile(p);
    setFirstName(p.firstName ?? "");
    setLastName(p.lastName ?? "");
    setUsername(p.username ?? "");
    setEmail(p.email ?? "");
    setBio(p.bio ?? "");
    setAvatarUrl(p.avatarUrl ?? "");
  };

  useEffect(() => {
    if (!user) return;
    ProfileService.get().then(applyProfile).catch(() => {});
    ProfileService.topAnime(10).then(setTop).catch(() => setTop([]));
    ProfileService.tokens().then(setTokens).catch(() => setTokens([]));
    // İstatistikler giriş yapan kullanıcının kendi verisinden (#39)
    AnimeService.getAnimes({ page: 1, count: 1000, filters: [], order: "desc", orderBy: "Score" }).then((res) =>
      setAnimes(res?.data ?? [])
    );
  }, [user?.id]);


  const stats = useMemo(() => {
    if (!animes) return null;
    const mine = animes.filter((a) => a.InMyList && (Number(a.WatchStatus) !== 0 || Number(a.Score) > 0));
    const rated = mine.filter((a) => Number(a.Score) > 0);
    const completed = mine.filter((a) => {
      const total = Number(a.TotalNumberOfEpisodes) || 0;
      return total > 0 && a.WatchStatus >= total;
    });
    const avg = rated.length ? rated.reduce((s, a) => s + Number(a.Score), 0) / rated.length : 0;
    return { total: mine.length, completed: completed.length, avg: Math.round(avg * 10) / 10 };
  }, [animes]);

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || profile?.username || user?.username || "";
  const profileDirty =
    !!profile &&
    (firstName !== (profile.firstName ?? "") ||
      lastName !== (profile.lastName ?? "") ||
      username !== profile.username ||
      email !== (profile.email ?? "") ||
      bio !== (profile.bio ?? "") ||
      avatarUrl !== (profile.avatarUrl ?? ""));

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileStatus(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setProfileStatus({ severity: "error", text: "Geçerli bir e-posta adresi gir" });
      return;
    }
    if (username.trim().length < 3) {
      setProfileStatus({ severity: "error", text: "Kullanıcı adı en az 3 karakter olmalı" });
      return;
    }
    setSavingProfile(true);
    try {
      const p = await ProfileService.update({
        username: username.trim(),
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio,
        avatarUrl,
      });
      applyProfile(p);
      // Üst bar ve kenar çubuğundaki kullanıcı bilgisi de güncellensin
      await updateProfile({}).catch(() => {});
      setProfileStatus({ severity: "success", text: "Profil güncellendi" });
    } catch (err: any) {
      setProfileStatus({ severity: "error", text: err?.response?.data?.message || "Profil güncellenemedi" });
    } finally {
      setSavingProfile(false);
    }
  };

  const toggle = async (key: "showRecommendations" | "notifyNewEpisodes", value: boolean) => {
    try {
      applyProfile(await ProfileService.update({ [key]: value }));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Kaydedilemedi");
    }
  };

  const onAvatarFile = async (file?: File) => {
    if (!file) return;
    try {
      setAvatarUrl(await avatarFromFile(file));
    } catch {
      toast.error("Görsel okunamadı");
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

  const createToken = async () => {
    try {
      const t = await ProfileService.createToken("Tarayıcı eklentisi");
      setNewToken(t.token);
      setTokens(await ProfileService.tokens());
    } catch {
      toast.error("Anahtar oluşturulamadı");
    }
  };

  const revokeToken = async (id: number) => {
    try {
      await ProfileService.revokeToken(id);
      setTokens((list) => (list ?? []).filter((t) => t.id !== id));
      toast.success("Anahtar iptal edildi");
    } catch {
      toast.error("Anahtar iptal edilemedi");
    }
  };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "hiç";

  const switchRow = (label: string, hint: string, checked: boolean, onChange: (v: boolean) => void, icon: React.ReactNode) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {icon}
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>{label}</Typography>
        <Typography sx={{ color: palette.textMuted, fontSize: "0.78rem" }}>{hint}</Typography>
      </Box>
      <Switch checked={checked} disabled={!profile} onChange={(e) => onChange(e.target.checked)} />
    </Box>
  );

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
          <Avatar src={avatarUrl || undefined} sx={{ width: 72, height: 72, fontSize: "1.8rem", fontWeight: 700, bgcolor: alpha(palette.primary, 0.3), color: "#fff" }}>
            {(displayName || "U").charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{displayName}</Typography>
            <Typography sx={{ color: palette.textMuted, fontSize: "0.9rem" }}>
              @{profile?.username ?? user?.username}
              {user?.isAdmin && (
                <Box component="span" sx={{ ml: 1, px: 0.75, py: 0.1, borderRadius: "6px", fontSize: "0.7rem", fontWeight: 600, color: palette.primary, backgroundColor: alpha(palette.primary, 0.14) }}>
                  Yönetici
                </Box>
              )}
            </Typography>
            {profile?.bio && <Typography sx={{ color: palette.text, fontSize: "0.85rem", mt: 0.75, whiteSpace: "pre-wrap" }}>{profile.bio}</Typography>}
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
                  <Skeleton width={40} height={34} sx={{ mx: "auto", bgcolor: alpha(palette.overlay, 0.06) }} />
                ) : (
                  <Typography sx={{ fontSize: "1.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{s.value}</Typography>
                )}
                <Typography sx={{ fontSize: "0.72rem", color: palette.textMuted }}>{s.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* En yüksek puanlı 10 */}
        <Box sx={card}>
          <SectionTitle icon={<EmojiEventsRoundedIcon sx={{ color: palette.warning }} />}>En yüksek puanlı 10 anime</SectionTitle>
          {!top ? (
            <Box sx={coverGrid}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" sx={{ aspectRatio: "2 / 3", height: "auto", borderRadius: "10px", bgcolor: alpha(palette.overlay, 0.04) }} />
              ))}
            </Box>
          ) : top.length === 0 ? (
            <Typography sx={{ color: palette.textMuted, fontSize: "0.875rem" }}>Henüz puan verdiğin bir anime yok.</Typography>
          ) : (
            <Box sx={coverGrid}>
              {top.map((anime, i) => (
                <CoverCard key={anime.ID} anime={anime} rank={i + 1} />
              ))}
            </Box>
          )}
        </Box>

        {/* Öneriler (#39) */}
        <Box sx={card}>
          <SectionTitle
            icon={<AutoAwesomeRoundedIcon sx={{ color: palette.accent }} />}
            extra={<Switch checked={!!profile?.showRecommendations} disabled={!profile} onChange={(e) => toggle("showRecommendations", e.target.checked)} />}
          >
            Sana özel öneriler
          </SectionTitle>
          {!profile?.showRecommendations ? (
            <Typography sx={{ color: palette.textMuted, fontSize: "0.85rem" }}>
              Açarsan sevdiğin animelerin benzerleri ve puanladığın türlerden, arşivinde olmayan animeler önerilir.
            </Typography>
          ) : (
            <DiscoverRecommendations catalog={animes} />
          )}
        </Box>

        {/* Rewatch çarkı */}
        <Box sx={card}>
          <SectionTitle icon={<CasinoRoundedIcon sx={{ color: palette.primary }} />}>Rewatch çarkı</SectionTitle>
          <RewatchWheel catalog={animes} />
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1fr) minmax(0, 1fr)" }, gap: 3, alignItems: "start" }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Profil bilgileri */}
            <Box component="form" onSubmit={saveProfile} sx={card}>
              <SectionTitle>Profil bilgileri</SectionTitle>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
                <Avatar src={avatarUrl || undefined} sx={{ width: 56, height: 56, bgcolor: alpha(palette.primary, 0.3), color: "#fff", fontWeight: 700 }}>
                  {(displayName || "U").charAt(0).toUpperCase()}
                </Avatar>
                <input ref={avatarInput} type="file" accept="image/*" hidden onChange={(e) => onAvatarFile(e.target.files?.[0])} />
                <Button size="small" variant="outlined" startIcon={<PhotoCameraRoundedIcon />} onClick={() => avatarInput.current?.click()}>
                  Görsel yükle
                </Button>
                {avatarUrl && (
                  <Button size="small" sx={{ color: palette.textMuted }} onClick={() => setAvatarUrl("")}>
                    Kaldır
                  </Button>
                )}
              </Box>
              <Box sx={{ display: "grid", gap: 2 }}>
                <Field
                  label="Avatar bağlantısı (isteğe bağlı)"
                  value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                  onChange={setAvatarUrl}
                />
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  <Field label="Ad" value={firstName} onChange={setFirstName} autoComplete="given-name" />
                  <Field label="Soyad" value={lastName} onChange={setLastName} autoComplete="family-name" />
                </Box>
                <Field label="Kullanıcı adı" value={username} onChange={setUsername} autoComplete="username" />
                <Field label="E-posta" type="email" value={email} onChange={setEmail} autoComplete="email" />
                <Field label="Hakkında" value={bio} onChange={(v) => setBio(v.slice(0, 500))} multiline />
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
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Bildirimler (#19) */}
            <Box sx={card}>
              <SectionTitle>Bildirimler</SectionTitle>
              {switchRow(
                "Yeni bölüm e-postası",
                "Listendeki bir animenin yeni bölümü çıkınca e-posta gelir.",
                !!profile?.notifyNewEpisodes,
                (v) => toggle("notifyNewEpisodes", v),
                <NotificationsActiveRoundedIcon sx={{ color: palette.primary }} />
              )}
            </Box>

            {/* Eklenti anahtarları (#26) */}
            <Box sx={card}>
              <SectionTitle
                icon={<KeyRoundedIcon sx={{ color: palette.primary }} />}
                extra={
                  <Button size="small" variant="outlined" onClick={createToken}>
                    Yeni anahtar
                  </Button>
                }
              >
                Eklenti anahtarları
              </SectionTitle>
              <Typography sx={{ color: palette.textMuted, fontSize: "0.8rem", mb: 1.5 }}>
                Tarayıcı eklentisi Configs sekmesinden giriş yapınca kendi anahtarını alır. Kaybolan bir cihazın anahtarını buradan iptal edebilirsin.
              </Typography>
              {newToken && (
                <Alert
                  severity="success"
                  sx={{ mb: 1.5, "& .MuiAlert-message": { minWidth: 0, flex: 1 } }}
                  action={
                    <Tooltip title="Kopyala">
                      <IconButton
                        size="small"
                        color="inherit"
                        onClick={() => navigator.clipboard.writeText(newToken).then(() => toast.success("Kopyalandı"))}
                      >
                        <ContentCopyRoundedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  }
                >
                  <Typography sx={{ fontSize: "0.78rem", mb: 0.5 }}>Bu anahtar yalnızca şimdi gösteriliyor:</Typography>
                  <Box component="code" sx={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
                    {newToken}
                  </Box>
                </Alert>
              )}
              {!tokens ? (
                <Skeleton variant="rounded" height={48} sx={{ bgcolor: alpha(palette.overlay, 0.04) }} />
              ) : tokens.length === 0 ? (
                <Typography sx={{ color: palette.textMuted, fontSize: "0.85rem" }}>Henüz anahtar yok.</Typography>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {tokens.map((t) => (
                    <Box
                      key={t.id}
                      sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25, borderRadius: "10px", backgroundColor: alpha(palette.overlay, 0.03), border: `1px solid ${alpha(palette.overlay, 0.05)}` }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.85rem" }}>{t.name}</Typography>
                        <Typography sx={{ color: palette.textMuted, fontSize: "0.72rem" }}>
                          Oluşturuldu {fmtDate(t.createdAt)} · Son kullanım {fmtDate(t.lastUsedAt)}
                        </Typography>
                      </Box>
                      <Button size="small" sx={{ color: palette.danger }} onClick={() => revokeToken(t.id)}>
                        İptal et
                      </Button>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>

            {/* Görünüm */}
            <Box sx={card}>
              <SectionTitle>Görünüm</SectionTitle>
              <AppearanceSettings />
            </Box>

            {/* Şifre */}
            <Box component="form" onSubmit={savePassword} sx={card}>
              <SectionTitle>Şifre değiştir</SectionTitle>
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
          </Box>
        </Box>
      </Box>
    </ProtectedRoute>
  );
}
