package main

import (
	"local-db-app/models"
	"log"

	"gorm.io/gorm"
)

// checkTableExists bir tablonun var olup olmadığını kontrol eder
func checkTableExists(db *gorm.DB, schema, table string) bool {
	var count int64
	db.Raw(`
		SELECT COUNT(*)
		FROM information_schema.tables
		WHERE table_schema = ?
		AND table_name = ?`,
		schema, table,
	).Count(&count)
	return count > 0
}

// InitializeDatabase veritabanı başlangıç işlemlerini gerçekleştirir
func InitializeDatabase(db *gorm.DB) error {
	log.Println("Veritabanı yapılandırması başlatılıyor...")

	// Önce şema kontrolü yap
	var schemaExists int64
	db.Raw("SELECT COUNT(*) FROM information_schema.schemata WHERE schema_name = 'anime'").Count(&schemaExists)

	if schemaExists == 0 {
		log.Println("Anime şeması bulunamadı, oluşturuluyor...")
		if err := db.Exec("CREATE SCHEMA IF NOT EXISTS anime").Error; err != nil {
			log.Printf("Anime şeması oluşturulurken hata: %v", err)
			return err
		}
	} else {
		log.Println("Anime şeması mevcut, tablo kontrolleri yapılıyor...")
	}

	// Tablo varlık kontrolleri
	tables := map[string]bool{
		"genres":        checkTableExists(db, "anime", "genres"),
		"anime_series":  checkTableExists(db, "anime", "anime_series"),
		"animes":        checkTableExists(db, "anime", "animes"),
		"animes_genres": checkTableExists(db, "anime", "animes_genres"),
		"watch_lists":   checkTableExists(db, "anime", "watch_lists"),
	}

	// Eğer tüm tablolar varsa, işlemi sonlandır
	allTablesExist := true
	for table, exists := range tables {
		if !exists {
			allTablesExist = false
			log.Printf("Eksik tablo tespit edildi: %s", table)
		}
	}

	if allTablesExist {
		log.Println("Tüm tablolar mevcut, yapılandırma atlanıyor")
		return nil
	}

	log.Println("Eksik tablolar oluşturuluyor...")

	// genres tablosu kontrolü
	if !tables["genres"] {
		if err := db.Exec(`CREATE TABLE IF NOT EXISTS anime.genres (
			id SERIAL PRIMARY KEY,
			genre_name VARCHAR(50) NOT NULL UNIQUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`).Error; err != nil {
			log.Printf("genres tablosu oluşturulurken hata: %v", err)
			return err
		}
		log.Println("genres tablosu oluşturuldu")
	}

	// anime_series tablosu kontrolü
	if !tables["anime_series"] {
		if err := db.Exec(`CREATE TABLE IF NOT EXISTS anime.anime_series (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL UNIQUE,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`).Error; err != nil {
			log.Printf("anime_series tablosu oluşturulurken hata: %v", err)
			return err
		}
		log.Println("anime_series tablosu oluşturuldu")
	}

	// animes tablosu kontrolü
	if !tables["animes"] {
		if err := db.Exec(`CREATE TABLE IF NOT EXISTS anime.animes (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			anime_status VARCHAR(50),
			watch_status INTEGER DEFAULT 0,
			total_number_of_episodes INTEGER DEFAULT 0,
			is_movie BOOLEAN DEFAULT false,
			score FLOAT DEFAULT 0,
			mal_score FLOAT DEFAULT 0,
			notes TEXT,
			anime_link TEXT,
			mal_anime_link TEXT,
			cover TEXT,
			series INTEGER REFERENCES anime.anime_series(id),
			plan_to_watch BOOLEAN DEFAULT false,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`).Error; err != nil {
			log.Printf("animes tablosu oluşturulurken hata: %v", err)
			return err
		}
		log.Println("animes tablosu oluşturuldu")
	}

	// animes_genres ara tablo kontrolü
	if !tables["animes_genres"] {
		if err := db.Exec(`CREATE TABLE IF NOT EXISTS anime.animes_genres (
			anime_id INTEGER REFERENCES anime.animes(id) ON DELETE CASCADE,
			genre_id INTEGER REFERENCES anime.genres(id) ON DELETE CASCADE,
			PRIMARY KEY (anime_id, genre_id),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`).Error; err != nil {
			log.Printf("animes_genres tablosu oluşturulurken hata: %v", err)
			return err
		}
		log.Println("animes_genres tablosu oluşturuldu")
	}

	// watch_lists tablosu kontrolü
	if !tables["watch_lists"] {
		if err := db.Exec(`CREATE TABLE IF NOT EXISTS anime.watch_lists (
			id SERIAL PRIMARY KEY,
			anime_id INTEGER NOT NULL,
			order_rank INTEGER NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			CONSTRAINT fk_anime FOREIGN KEY (anime_id) REFERENCES anime.animes(id) ON DELETE CASCADE
		)`).Error; err != nil {
			log.Printf("watch_lists tablosu oluşturulurken hata: %v", err)
			return err
		}
		log.Println("watch_lists tablosu oluşturuldu")

		// watch_lists indeksi oluştur
		if err := db.Exec("CREATE INDEX IF NOT EXISTS idx_watch_lists_anime_id ON anime.watch_lists (anime_id)").Error; err != nil {
			log.Printf("watch_lists indeksi oluşturulurken hata: %v", err)
			return err
		}
	}

	// users tablosu kontrolü
	if !checkTableExists(db, "public", "users") {
		if err := db.AutoMigrate(&models.User{}); err != nil {
			log.Printf("users tablosu oluşturulurken hata: %v", err)
			return err
		}
		log.Println("users tablosu oluşturuldu")
	}

	// Gerekli indeksleri oluştur
	indexes := []string{
		"CREATE INDEX IF NOT EXISTS idx_animes_name ON anime.animes(name)",
		"CREATE INDEX IF NOT EXISTS idx_animes_series ON anime.animes(series)",
		"CREATE INDEX IF NOT EXISTS idx_animes_watch_status ON anime.animes(watch_status)",
		"CREATE INDEX IF NOT EXISTS idx_animes_plan_to_watch ON anime.animes(plan_to_watch)",
		"CREATE INDEX IF NOT EXISTS idx_genres_name ON anime.genres(genre_name)",
		"CREATE INDEX IF NOT EXISTS idx_series_name ON anime.anime_series(name)",
	}

	for _, idx := range indexes {
		if err := db.Exec(idx).Error; err != nil {
			log.Printf("İndeks oluşturulurken hata: %v", err)
			// İndeks hataları kritik değil, devam et
		}
	}

	log.Println("Veritabanı yapılandırması tamamlandı")
	return nil
}
