-- İngilizce isim (AniList title.english). NULL = henüz bakılmadı, '' = AniList'te İngilizce isim yok.
-- Normal Sync sırasında tarayıcı MAL id'leriyle AniList'ten toplu olarak doldurur (/titles/english/*).
ALTER TABLE animes ADD COLUMN english_name TEXT;
