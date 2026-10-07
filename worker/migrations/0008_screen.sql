-- 0008: TV series and movies. One shared catalog (screen_titles, kind = 'series' | 'movie') with details
-- from IMDb (via OMDb); score, watch status, progress, Plan to Watch, notes and dates are per user
-- (user_screen). Both tables start empty.

CREATE TABLE IF NOT EXISTS screen_titles (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  kind           TEXT NOT NULL CHECK (kind IN ('series', 'movie')),
  name           TEXT NOT NULL,
  original_name  TEXT,
  year           TEXT NOT NULL DEFAULT '',   -- IMDb style: "2010", "2008–2013", "2019–"
  status         TEXT NOT NULL DEFAULT '',   -- series: RELEASING or FINISHED
  total_seasons  INTEGER NOT NULL DEFAULT 0,
  total_episodes INTEGER NOT NULL DEFAULT 0,
  runtime        TEXT NOT NULL DEFAULT '',
  genres         TEXT NOT NULL DEFAULT '',   -- ", " separated
  director       TEXT NOT NULL DEFAULT '',
  actors         TEXT NOT NULL DEFAULT '',
  plot           TEXT NOT NULL DEFAULT '',
  cover          TEXT,
  imdb_id        TEXT UNIQUE,
  imdb_rating    REAL,
  synced_at      TEXT,
  created_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_screen_kind_name ON screen_titles (kind, name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS user_screen (
  user_id          INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title_id         INTEGER NOT NULL REFERENCES screen_titles (id) ON DELETE CASCADE,
  score            REAL,
  watch_status     TEXT NOT NULL DEFAULT '',   -- WATCHING, COMPLETED, PAUSED, DROPPED, PLANNING or ''
  episodes_watched INTEGER NOT NULL DEFAULT 0,
  plan_to_watch    INTEGER NOT NULL DEFAULT 0,
  notes            TEXT,
  started_at       TEXT,
  finished_at      TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, title_id)
);
CREATE INDEX IF NOT EXISTS idx_user_screen_title ON user_screen (title_id);

-- Dates fill themselves when empty: the first watched episode (or COMPLETED) sets started_at,
-- the last episode (or COMPLETED) sets finished_at. A movie has no episodes, so COMPLETED sets both.
CREATE TRIGGER trg_screen_dates_insert AFTER INSERT ON user_screen
WHEN (NEW.episodes_watched > 0 OR NEW.watch_status = 'COMPLETED') AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_screen SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.watch_status = 'COMPLETED'
        OR (NEW.episodes_watched >= (SELECT total_episodes FROM screen_titles WHERE id = NEW.title_id)
            AND (SELECT total_episodes FROM screen_titles WHERE id = NEW.title_id) > 0) THEN date('now') END)
  WHERE user_id = NEW.user_id AND title_id = NEW.title_id;
END;

CREATE TRIGGER trg_screen_dates_progress AFTER UPDATE OF episodes_watched, watch_status ON user_screen
WHEN (NEW.episodes_watched > OLD.episodes_watched OR (NEW.watch_status = 'COMPLETED' AND OLD.watch_status <> 'COMPLETED'))
  AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_screen SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.watch_status = 'COMPLETED'
        OR (NEW.episodes_watched >= (SELECT total_episodes FROM screen_titles WHERE id = NEW.title_id)
            AND (SELECT total_episodes FROM screen_titles WHERE id = NEW.title_id) > 0) THEN date('now') END)
  WHERE user_id = NEW.user_id AND title_id = NEW.title_id;
END;
