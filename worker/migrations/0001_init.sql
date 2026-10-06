-- Kiroku D1 (SQLite) şeması. Postgres'teki anime.* ve public.users tablolarının karşılığı.
-- Boolean alanlar 0/1, zamanlar ISO-8601 metin olarak tutulur.

CREATE TABLE IF NOT EXISTS anime_series (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS genres (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  genre_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS animes (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  name                     TEXT NOT NULL,
  anime_status             TEXT NOT NULL DEFAULT '',
  watch_status             INTEGER NOT NULL DEFAULT 0,
  total_number_of_episodes INTEGER NOT NULL DEFAULT 0,
  is_movie                 INTEGER NOT NULL DEFAULT 0,
  score                    REAL,
  mal_score                REAL,
  notes                    TEXT,
  anime_link               TEXT,
  mal_anime_link           TEXT,
  cover                    TEXT,
  series                   INTEGER NOT NULL DEFAULT 0,
  plan_to_watch            INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_animes_name ON animes (name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_animes_series ON animes (series);

CREATE TABLE IF NOT EXISTS animes_genres (
  anime_id INTEGER NOT NULL REFERENCES animes (id) ON DELETE CASCADE,
  genre_id INTEGER NOT NULL REFERENCES genres (id) ON DELETE CASCADE,
  PRIMARY KEY (anime_id, genre_id)
);
CREATE INDEX IF NOT EXISTS idx_animes_genres_genre ON animes_genres (genre_id);

CREATE TABLE IF NOT EXISTS watch_lists (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  anime_id   INTEGER NOT NULL UNIQUE REFERENCES animes (id) ON DELETE CASCADE,
  order_rank INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS users (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  username               TEXT NOT NULL UNIQUE,
  email                  TEXT NOT NULL UNIQUE,
  password               TEXT NOT NULL,
  first_name             TEXT,
  last_name              TEXT,
  is_active              INTEGER NOT NULL DEFAULT 1,
  is_admin               INTEGER NOT NULL DEFAULT 0,
  last_login             TEXT,
  reset_password_token   TEXT,
  reset_password_expires TEXT,
  created_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at             TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Plan to Watch işaretlenen anime watchlist'e eklenir, işaret kalkınca çıkarılır
-- (web, eklenti ve sync aynı davranışı otomatik alır).
CREATE TRIGGER IF NOT EXISTS trg_ptw_insert AFTER INSERT ON animes
WHEN NEW.plan_to_watch = 1
BEGIN
  INSERT OR IGNORE INTO watch_lists (anime_id, order_rank)
  VALUES (NEW.id, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM watch_lists));
END;

CREATE TRIGGER IF NOT EXISTS trg_ptw_on AFTER UPDATE OF plan_to_watch ON animes
WHEN NEW.plan_to_watch = 1 AND OLD.plan_to_watch = 0
BEGIN
  INSERT OR IGNORE INTO watch_lists (anime_id, order_rank)
  VALUES (NEW.id, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM watch_lists));
END;

CREATE TRIGGER IF NOT EXISTS trg_ptw_off AFTER UPDATE OF plan_to_watch ON animes
WHEN NEW.plan_to_watch = 0 AND OLD.plan_to_watch = 1
BEGIN
  DELETE FROM watch_lists WHERE anime_id = NEW.id;
END;
