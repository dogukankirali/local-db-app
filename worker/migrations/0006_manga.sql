-- 0006: Manga section. The catalog (manga) is shared; score, reading status, progress, Plan to Read,
-- notes and dates are per user (user_manga). The readlist mirrors watch_lists and is kept in sync with
-- user_manga.plan_to_read by triggers, exactly like the anime watchlist (0002).

CREATE TABLE IF NOT EXISTS manga (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  english_name   TEXT,
  status         TEXT NOT NULL DEFAULT '',   -- AniList status: RELEASING, FINISHED, HIATUS, CANCELLED, NOT_YET_RELEASED
  format         TEXT NOT NULL DEFAULT '',   -- MANGA, NOVEL, ONE_SHOT
  total_chapters INTEGER NOT NULL DEFAULT 0,
  total_volumes  INTEGER NOT NULL DEFAULT 0,
  mal_score      REAL,
  genres         TEXT NOT NULL DEFAULT '',   -- ", " separated AniList genre names
  cover          TEXT,
  anilist_id     INTEGER UNIQUE,
  mal_id         INTEGER,
  mal_link       TEXT,
  anilist_link   TEXT,
  synced_at      TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_manga_name ON manga (name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_manga_mal ON manga (mal_id);

CREATE TABLE IF NOT EXISTS user_manga (
  user_id       INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  manga_id      INTEGER NOT NULL REFERENCES manga (id) ON DELETE CASCADE,
  score         REAL,
  read_status   TEXT NOT NULL DEFAULT '',     -- READING, COMPLETED, PAUSED, DROPPED, PLANNING or ''
  chapters_read INTEGER NOT NULL DEFAULT 0,
  volumes_read  INTEGER NOT NULL DEFAULT 0,
  plan_to_read  INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  started_at    TEXT,
  finished_at   TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, manga_id)
);
CREATE INDEX IF NOT EXISTS idx_user_manga_manga ON user_manga (manga_id);

CREATE TABLE IF NOT EXISTS readlist (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  manga_id   INTEGER NOT NULL REFERENCES manga (id) ON DELETE CASCADE,
  order_rank INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, manga_id)
);

-- Plan to Read flag keeps the user's readlist in sync
CREATE TRIGGER trg_ptr_insert AFTER INSERT ON user_manga
WHEN NEW.plan_to_read = 1
BEGIN
  INSERT OR IGNORE INTO readlist (user_id, manga_id, order_rank)
  VALUES (NEW.user_id, NEW.manga_id, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM readlist WHERE user_id = NEW.user_id));
END;

CREATE TRIGGER trg_ptr_on AFTER UPDATE OF plan_to_read ON user_manga
WHEN NEW.plan_to_read = 1 AND OLD.plan_to_read = 0
BEGIN
  INSERT OR IGNORE INTO readlist (user_id, manga_id, order_rank)
  VALUES (NEW.user_id, NEW.manga_id, (SELECT COALESCE(MAX(order_rank), 0) + 1 FROM readlist WHERE user_id = NEW.user_id));
END;

CREATE TRIGGER trg_ptr_off AFTER UPDATE OF plan_to_read ON user_manga
WHEN NEW.plan_to_read = 0 AND OLD.plan_to_read = 1
BEGIN
  DELETE FROM readlist WHERE user_id = NEW.user_id AND manga_id = NEW.manga_id;
END;

-- Dates fill themselves when empty: first chapter read sets started_at, last chapter (or COMPLETED) sets finished_at
CREATE TRIGGER trg_manga_dates_insert AFTER INSERT ON user_manga
WHEN (NEW.chapters_read > 0 OR NEW.read_status = 'COMPLETED') AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_manga SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.read_status = 'COMPLETED'
        OR (NEW.chapters_read >= (SELECT total_chapters FROM manga WHERE id = NEW.manga_id)
            AND (SELECT total_chapters FROM manga WHERE id = NEW.manga_id) > 0) THEN date('now') END)
  WHERE user_id = NEW.user_id AND manga_id = NEW.manga_id;
END;

CREATE TRIGGER trg_manga_dates_progress AFTER UPDATE OF chapters_read, read_status ON user_manga
WHEN (NEW.chapters_read > OLD.chapters_read OR (NEW.read_status = 'COMPLETED' AND OLD.read_status <> 'COMPLETED'))
  AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_manga SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.read_status = 'COMPLETED'
        OR (NEW.chapters_read >= (SELECT total_chapters FROM manga WHERE id = NEW.manga_id)
            AND (SELECT total_chapters FROM manga WHERE id = NEW.manga_id) > 0) THEN date('now') END)
  WHERE user_id = NEW.user_id AND manga_id = NEW.manga_id;
END;
