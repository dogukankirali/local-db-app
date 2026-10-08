-- 0011: Genel uygulama ayarları (anahtar/değer). Yayın takibi (cron) varsayılan olarak kapalıdır;
-- bir admin Profil → Bildirimler'den açınca başlar.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
