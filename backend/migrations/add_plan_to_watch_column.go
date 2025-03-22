package migrations

import (
	"log"

	"gorm.io/gorm"
)

// AddPlanToWatchColumn adds the plan_to_watch column to the animes table
func AddPlanToWatchColumn(db *gorm.DB) {
	log.Println("Running migration: AddPlanToWatchColumn")

	// Kolon yoksa ekle
	if !db.Migrator().HasColumn(&map[string]interface{}{"TableName": "anime.animes"}, "plan_to_watch") {
		db.Exec("ALTER TABLE anime.animes ADD COLUMN plan_to_watch BOOLEAN DEFAULT false")
		log.Println("Added plan_to_watch column to animes table")
	} else {
		log.Println("plan_to_watch column already exists in animes table")
	}
}
