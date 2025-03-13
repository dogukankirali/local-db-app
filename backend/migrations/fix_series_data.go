package migrations

import (
	"log"

	"gorm.io/gorm"
)

// FixSeriesData, series alanındaki boş string değerlerini 0 olarak günceller
func FixSeriesData(db *gorm.DB) {
	// Veritabanındaki series alanını güncelle
	result := db.Exec("UPDATE anime.animes SET series = 0 WHERE series = '' OR series IS NULL")

	if result.Error != nil {
		log.Printf("Series alanı güncellenirken hata oluştu: %v", result.Error)
		return
	}

	log.Printf("Series alanı başarıyla güncellendi. Etkilenen kayıt sayısı: %d", result.RowsAffected)
}
