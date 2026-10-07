-- 0004: 0002'nin ilk sürümü mevcut veriyi en düşük id'li admine bağlıyordu; canlıda bu hiç giriş yapılmamış
-- eski "admin" hesabıydı. Kayıtlar en son giriş yapan admine (Spoon) taşınır ve eski koddan (animes
-- sütunları) gelen son değerlerle tazelenir. Doğru hesaba zaten bağlı veritabanında değişiklik yapmaz.

-- Hiç giriş yapılmamış adminlerdeki kayıtları, en son giriş yapan admine taşı
UPDATE OR IGNORE user_anime
SET user_id = (SELECT id FROM users WHERE is_admin = 1 AND last_login IS NOT NULL ORDER BY last_login DESC LIMIT 1)
WHERE user_id IN (SELECT id FROM users WHERE is_admin = 1 AND last_login IS NULL)
  AND EXISTS (SELECT 1 FROM users WHERE is_admin = 1 AND last_login IS NOT NULL);
DELETE FROM user_anime
WHERE user_id IN (SELECT id FROM users WHERE is_admin = 1 AND last_login IS NULL)
  AND EXISTS (SELECT 1 FROM users WHERE is_admin = 1 AND last_login IS NOT NULL);

UPDATE OR IGNORE watch_lists
SET user_id = (SELECT id FROM users WHERE is_admin = 1 AND last_login IS NOT NULL ORDER BY last_login DESC LIMIT 1)
WHERE user_id IN (SELECT id FROM users WHERE is_admin = 1 AND last_login IS NULL)
  AND EXISTS (SELECT 1 FROM users WHERE is_admin = 1 AND last_login IS NOT NULL);
DELETE FROM watch_lists
WHERE user_id IN (SELECT id FROM users WHERE is_admin = 1 AND last_login IS NULL)
  AND EXISTS (SELECT 1 FROM users WHERE is_admin = 1 AND last_login IS NOT NULL);

-- Kayıtları taşınan, hiç giriş yapılmamış eski admin hesabı silinir (Doğukan onayıyla)
DELETE FROM users
WHERE is_admin = 1 AND last_login IS NULL
  AND EXISTS (SELECT 1 FROM users WHERE is_admin = 1 AND last_login IS NOT NULL);
