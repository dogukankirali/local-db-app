package migrations

import (
	"log"

	"gorm.io/gorm"
)

// AddPlanToWatchColumn adds a plan_to_watch column to the animes table
func AddPlanToWatchColumn(db *gorm.DB) {
	log.Println("Running migration: AddPlanToWatchColumn")

	// Kolonun varlığını kontrol et
	var count int64
	db.Raw("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'anime' AND table_name = 'animes' AND column_name = 'plan_to_watch'").Count(&count)

	if count == 0 {
		// Kolon yoksa ekle
		result := db.Exec("ALTER TABLE anime.animes ADD COLUMN plan_to_watch BOOLEAN DEFAULT false")
		if result.Error != nil {
			log.Printf("Error adding plan_to_watch column: %v", result.Error)
		} else {
			log.Println("Added plan_to_watch column to anime.animes table")
		}
	} else {
		log.Println("Column plan_to_watch already exists in anime.animes table")
	}
}
