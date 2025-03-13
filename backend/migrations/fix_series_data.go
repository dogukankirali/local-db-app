package migrations

import (
	"fmt"

	"gorm.io/gorm"
)

// FixSeriesData, series alanındaki boş string değerlerini 0 ile değiştirir
func FixSeriesData(db *gorm.DB) error {
	// Önce anime_series tablosunda 0 ID'li bir kayıt olup olmadığını kontrol et
	var count int64
	if err := db.Table("anime.anime_series").Where("id = 0").Count(&count).Error; err != nil {
		return fmt.Errorf("anime_series tablosunu kontrol ederken hata: %v", err)
	}

	// Eğer 0 ID'li kayıt yoksa, ekle
	if count == 0 {
		if err := db.Exec("INSERT INTO anime.anime_series (id, name) VALUES (0, 'Belirtilmemiş') ON CONFLICT (id) DO NOTHING").Error; err != nil {
			return fmt.Errorf("anime_series tablosuna 0 ID'li kayıt eklerken hata: %v", err)
		}
		fmt.Println("anime_series tablosuna 0 ID'li 'Belirtilmemiş' kaydı eklendi")
	}

	// Şimdi series alanı NULL olan kayıtları 0 olarak güncelle
	if err := db.Exec("UPDATE anime.animes SET series = 0 WHERE series IS NULL").Error; err != nil {
		return fmt.Errorf("NULL series değerlerini güncellerken hata: %v", err)
	}

	// Alternatif çözüm: Doğrudan SQL ile tüm kayıtları kontrol et
	if err := db.Exec("UPDATE anime.animes SET series = 0 WHERE series < 0").Error; err != nil {
		return fmt.Errorf("geçersiz series değerlerini güncellerken hata: %v", err)
	}

	fmt.Println("Series alanı başarıyla düzeltildi")
	return nil
}
