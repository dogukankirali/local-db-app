-- 0007: Manga chapters. source is an open slug ([a-z0-9-]) so new source adapters need no migration:
--   r2_prefix IS NULL     → live chapter: only metadata is stored (today: source 'mangadex', external_id =
--                           MangaDex chapter UUID); pages come from the MangaDex at-home server at read time.
--   r2_prefix IS NOT NULL → R2-backed chapter: pages stored as r2_prefix/0001.webp, 0002.webp, ... Written by
--                           the generic upload endpoint (source 'upload' for CBZ, or an adapter's own slug).
-- group_name holds the scanlator.

ALTER TABLE manga ADD COLUMN mangadex_id TEXT;

CREATE TABLE IF NOT EXISTS manga_chapter (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  manga_id    INTEGER NOT NULL REFERENCES manga (id) ON DELETE CASCADE,
  number      REAL NOT NULL DEFAULT 0,
  volume      TEXT,
  title       TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL CHECK (source <> '' AND source NOT GLOB '*[^a-z0-9-]*'),
  external_id TEXT,
  page_count  INTEGER NOT NULL DEFAULT 0,
  r2_prefix   TEXT,
  lang        TEXT NOT NULL DEFAULT '',
  group_name  TEXT,
  uploaded_by INTEGER REFERENCES users (id) ON DELETE SET NULL,
  published_at TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_manga_chapter_manga ON manga_chapter (manga_id, number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_manga_chapter_external ON manga_chapter (manga_id, source, external_id) WHERE external_id IS NOT NULL;
