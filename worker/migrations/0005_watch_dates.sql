-- 0005: Kullanıcının izlemeye başlama ve bitirme tarihi (YYYY-MM-DD).
-- Mevcut kayıtlarda tarih bilinmediği için "eski kayıt" işareti olarak 2000-01-01 yazılır:
-- izlemeye başlanmışsa başlama, bitirilmişse bitiş tarihi. Arayüz bu tarihi "Eski kayıt" olarak gösterir.

ALTER TABLE user_anime ADD COLUMN started_at TEXT;
ALTER TABLE user_anime ADD COLUMN finished_at TEXT;

UPDATE user_anime SET started_at = '2000-01-01' WHERE watch_status > 0;
UPDATE user_anime SET finished_at = '2000-01-01'
WHERE watch_status > 0
  AND watch_status >= (SELECT a.total_number_of_episodes FROM animes a WHERE a.id = user_anime.anime_id)
  AND (SELECT a.total_number_of_episodes FROM animes a WHERE a.id = user_anime.anime_id) > 0;

-- Bundan sonra tarih boşsa kendiliğinden dolar: ilk bölüm izlenince başlama, son bölüm izlenince bitiş
CREATE TRIGGER trg_dates_on_insert AFTER INSERT ON user_anime
WHEN NEW.watch_status > 0 AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_anime SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.watch_status >= (SELECT total_number_of_episodes FROM animes WHERE id = NEW.anime_id)
       AND (SELECT total_number_of_episodes FROM animes WHERE id = NEW.anime_id) > 0 THEN date('now') END)
  WHERE user_id = NEW.user_id AND anime_id = NEW.anime_id;
END;

CREATE TRIGGER trg_dates_on_progress AFTER UPDATE OF watch_status ON user_anime
WHEN NEW.watch_status > COALESCE(OLD.watch_status, 0) AND (NEW.started_at IS NULL OR NEW.finished_at IS NULL)
BEGIN
  UPDATE user_anime SET
    started_at = COALESCE(started_at, date('now')),
    finished_at = COALESCE(finished_at, CASE
      WHEN NEW.watch_status >= (SELECT total_number_of_episodes FROM animes WHERE id = NEW.anime_id)
       AND (SELECT total_number_of_episodes FROM animes WHERE id = NEW.anime_id) > 0 THEN date('now') END)
  WHERE user_id = NEW.user_id AND anime_id = NEW.anime_id;
END;
