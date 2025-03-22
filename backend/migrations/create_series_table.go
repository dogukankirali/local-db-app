package migrations

import (
	"local-db-app/models"
	"log"

	"gorm.io/gorm"
)

// CreateSeriesTable, series tablosunu oluşturur
func CreateSeriesTable(db *gorm.DB) {
	// Mevcut anime_series tablosunu kontrol et
	var count int64
	db.Table("anime.anime_series").Count(&count)

	if count > 0 {
		log.Println("anime_series tablosu zaten mevcut ve içinde veri var, migrasyon atlanıyor")
		return
	}

	// Series tablosunu oluştur (eğer yoksa)
	err := db.AutoMigrate(&models.Series{})
	if err != nil {
		log.Fatalf("anime_series tablosu oluşturulamadı: %v", err)
	}
	log.Println("anime_series tablosu başarıyla oluşturuldu veya güncellendi")
}
