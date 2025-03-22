package migrations

import (
	"local-db-app/auth"
	"local-db-app/models"
	"log"

	"gorm.io/gorm"
)

// CreateUsersTable, kullanıcı tablosunu oluşturur
func CreateUsersTable(db *gorm.DB) {
	// Kullanıcı tablosunu oluştur
	err := db.AutoMigrate(&models.User{})
	if err != nil {
		log.Fatalf("Kullanıcı tablosu oluşturulamadı: %v", err)
	}
	log.Println("Kullanıcı tablosu başarıyla oluşturuldu veya güncellendi")

	// Admin kullanıcısı var mı kontrol et
	var adminCount int64
	db.Model(&models.User{}).Where("is_admin = ?", true).Count(&adminCount)

	// Admin kullanıcısı yoksa oluştur
	if adminCount == 0 {
		// Admin şifresini hashle
		adminPassword := "admin123" // Varsayılan admin şifresi
		hashedPassword, err := auth.HashPassword(adminPassword)
		if err != nil {
			log.Fatalf("Admin şifresi hashlenemedi: %v", err)
		}

		// Admin kullanıcısını oluştur
		admin := models.User{
			Username:  "admin",
			Email:     "admin@example.com",
			Password:  hashedPassword,
			FirstName: "Admin",
			LastName:  "User",
			IsActive:  true,
			IsAdmin:   true,
		}

		// Admin kullanıcısını veritabanına kaydet
		result := db.Create(&admin)
		if result.Error != nil {
			log.Fatalf("Admin kullanıcısı oluşturulamadı: %v", result.Error)
		}
		log.Println("Admin kullanıcısı başarıyla oluşturuldu")
	}
}
