package models

import (
	"time"
)

// WatchList model
type WatchList struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	AnimeID   uint      `json:"anime_id" gorm:"not null"`
	OrderRank int       `json:"order_rank" gorm:"not null"`
	Anime     Anime     `json:"anime" gorm:"foreignKey:AnimeID;references:ID"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName specifies the table name for WatchList
func (WatchList) TableName() string {
	return "anime.watch_lists"
}
