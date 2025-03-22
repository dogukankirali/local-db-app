package migrations

import (
	"log"

	"gorm.io/gorm"
)

// CreateWatchListTable creates the watch_list table
func CreateWatchListTable(db *gorm.DB) {
	log.Println("Running migration: CreateWatchListTable")

	// Tablo yoksa oluştur
	db.Exec(`CREATE TABLE IF NOT EXISTS anime.watch_lists (
		id SERIAL PRIMARY KEY,
		anime_id INTEGER NOT NULL,
		order_rank INTEGER NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		CONSTRAINT fk_anime FOREIGN KEY (anime_id) REFERENCES anime.animes(id) ON DELETE CASCADE
	)`)

	// Index oluştur
	db.Exec("CREATE INDEX IF NOT EXISTS idx_watch_lists_anime_id ON anime.watch_lists (anime_id)")

	log.Println("Created watch_lists table")
}
