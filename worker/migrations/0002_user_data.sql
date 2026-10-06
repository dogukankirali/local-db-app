-- 0002: Kullanıcıya özel liste verisi (#39), eklenti anahtarları (#26), yayın takibi (#19).
--
-- Anime kataloğu (ad, durum, bölüm sayısı, kapak, türler, MAL puanı) ortak kalır.
-- Puan, izlenen bölüm, Plan to Watch ve notlar artık her kullanıcı için ayrı tutulur (user_anime).
-- Mevcut değerler ilk admin hesabına (Spoon) taşınır. animes tablosundaki eski score / watch_status /
-- plan_to_watch / notes sütunları geri dönüş kolaylığı için yerinde bırakıldı; artık okunmuyor.

CREATE TABLE IF NOT EXISTS user_anime (
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  anime_id      INTEGER NOT NULL REFERENCES animes (id) ON DELETE CASCADE,
  score         REAL,
  watch_status  INTEGER NOT NULL DEFAULT 0,
  plan_to_watch INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, anime_id)
);
CREATE INDEX IF NOT EXISTS idx_user_anime_anime ON user_anime (anime_id);

INSERT OR IGNORE INTO user_anime (user_id, anime_id, score, watch_status, plan_to_watch, notes)
SELECT (SELECT id FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1), a.id, a.score, a.watch_status, a.plan_to_watch, a.notes
FROM animes a
WHERE EXISTS (SELECT 1 FROM users WHERE is_admin = 1);

-- Watchlist kullanıcıya bağlanır: aynı anime farklı kullanıcıların listesinde olabilir
DROP TRIGGER IF EXISTS trg_ptw_insert;
DROP TRIGGER IF EXISTS trg_ptw_on;
DROP TRIGGER IF EXISTS trg_ptw_off;

CREATE TABLE watch_lists_new (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  anime_id   INTEGER NOT NULL REFERENCES animes (id) ON DELETE CASCADE,
  order_rank INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, anime_id)
);
INSERT INTO watch_lists_new (id, user_id, anime_id, order_rank, created_at, updated_at)
SELECT w.id, (SELECT id FROM users WHERE is_admin = 1 ORDER BY id LIMIT 1), w.anime_id, w.order_rank, w.created_at, w.updated_at
FROM watch_lists w
WHERE EXISTS (SELECT 1 FROM users WHERE is_admin = 1);
DROP TABLE watch_lists;
ALTER TABLE watch_lists_new RENAME TO watch_lists;

-- Plan to Watch işareti kullanıcının watchlist'ini günceller (web, eklenti ve sync aynı davranışı alır)
CREATE TRIGGER trg_ptw_insert AFTER INSERT ON user_anime
WHEN NEW.plan_to_watch = 1
BEGIN
  INSERT OR IGNORE INTO watch_lists (user_id, anime_id, order_rank)
  VALUES (NEW.user_id, NEW.anime_id, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM watch_lists WHERE user_id = NEW.user_id));
END;

CREATE TRIGGER trg_ptw_on AFTER UPDATE OF plan_to_watch ON user_anime
WHEN NEW.plan_to_watch = 1 AND OLD.plan_to_watch = 0
BEGIN
  INSERT OR IGNORE INTO watch_lists (user_id, anime_id, order_rank)
  VALUES (NEW.user_id, NEW.anime_id, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM watch_lists WHERE user_id = NEW.user_id));
END;

CREATE TRIGGER trg_ptw_off AFTER UPDATE OF plan_to_watch ON user_anime
WHEN NEW.plan_to_watch = 0 AND OLD.plan_to_watch = 1
BEGIN
  DELETE FROM watch_lists WHERE user_id = NEW.user_id AND anime_id = NEW.anime_id;
END;

-- Profil (#39) ve yeni bölüm bildirimi tercihi (#19)
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN show_recommendations INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN notify_new_episodes INTEGER NOT NULL DEFAULT 0;

-- Eklenti anahtarları (#26): uzun ömürlü, iptal edilebilir; DB'de yalnızca SHA-256 özeti tutulur
CREATE TABLE IF NOT EXISTS api_tokens (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens (user_id);

-- Yayın takibi (#19): GitHub Actions'taki zamanlanmış iş AniList'ten okuyup buraya yazar
ALTER TABLE animes ADD COLUMN anilist_id INTEGER;
ALTER TABLE animes ADD COLUMN next_episode INTEGER;
ALTER TABLE animes ADD COLUMN next_episode_at TEXT;
ALTER TABLE animes ADD COLUMN aired_episodes INTEGER;
ALTER TABLE animes ADD COLUMN airing_checked_at TEXT;
