-- 0009: Books. Shared catalog (books) with details from Google Books / Open Library; score, reading status,
-- pages read, Plan to Read, notes and dates are per user (user_books). Both tables start empty.

CREATE TABLE IF NOT EXISTS books (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  title            TEXT NOT NULL,
  subtitle         TEXT NOT NULL DEFAULT '',
  authors          TEXT NOT NULL DEFAULT '',   -- ", " separated
  publisher        TEXT NOT NULL DEFAULT '',
  published_date   TEXT NOT NULL DEFAULT '',   -- "2016", "2016-05" or "2016-05-12"
  page_count       INTEGER NOT NULL DEFAULT 0,
  isbn             TEXT,                       -- ISBN-13 when known
  language         TEXT NOT NULL DEFAULT '',   -- "tr", "en"...
  genres           TEXT NOT NULL DEFAULT '',   -- ", " separated categories/subjects
  description      TEXT NOT NULL DEFAULT '',
  cover            TEXT,
  google_id        TEXT UNIQUE,
  openlibrary_key  TEXT UNIQUE,                -- "/works/OL…W"
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_books_title ON books (title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books (isbn);

CREATE TABLE IF NOT EXISTS user_books (
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  book_id      INTEGER NOT NULL REFERENCES books (id) ON DELETE CASCADE,
  score        REAL,
  read_status  TEXT NOT NULL DEFAULT '',   -- READING, COMPLETED, PAUSED, DROPPED, PLANNING or ''
  pages_read   INTEGER NOT NULL DEFAULT 0,
  plan_to_read INTEGER NOT NULL DEFAULT 0,
  notes        TEXT,
  started_at   TEXT,
  finished_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, book_id)
);
CREATE INDEX IF NOT EXISTS idx_user_books_book ON user_books (book_id);

-- Dates fill themselves when empty: the first page read (or COMPLETED) sets started_at,
-- the last page (or COMPLETED) sets finished_at
CREATE TRIGGER trg_book_dates_insert AFTER INSERT ON user_books
WHEN (NEW.pages_read > 0 OR NEW.read_status = 'COMPLETED') AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_books SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.read_status = 'COMPLETED'
        OR (NEW.pages_read >= (SELECT page_count FROM books WHERE id = NEW.book_id)
            AND (SELECT page_count FROM books WHERE id = NEW.book_id) > 0) THEN date('now') END)
  WHERE user_id = NEW.user_id AND book_id = NEW.book_id;
END;

CREATE TRIGGER trg_book_dates_progress AFTER UPDATE OF pages_read, read_status ON user_books
WHEN (NEW.pages_read > OLD.pages_read OR (NEW.read_status = 'COMPLETED' AND OLD.read_status <> 'COMPLETED'))
  AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_books SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.read_status = 'COMPLETED'
        OR (NEW.pages_read >= (SELECT page_count FROM books WHERE id = NEW.book_id)
            AND (SELECT page_count FROM books WHERE id = NEW.book_id) > 0) THEN date('now') END)
  WHERE user_id = NEW.user_id AND book_id = NEW.book_id;
END;
