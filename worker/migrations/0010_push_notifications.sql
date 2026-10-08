-- 0010: Yeni bölüm bildirimleri mail yerine tarayıcı bildirimi (Web Push) ve Kiroku içi bildirimlerle gider.
-- Yayın takibi Cloudflare Cron Trigger'da Kitsu'dan yapılır (AniList Workers'ı engelliyor); animelerin
-- Kitsu kimliği MAL ID'sinden bir kez eşlenip saklanır.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  anime_id   INTEGER REFERENCES animes (id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  url        TEXT NOT NULL DEFAULT '',
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

ALTER TABLE animes ADD COLUMN kitsu_id INTEGER;
