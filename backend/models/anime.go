package models

type Anime struct {
	ID                    uint    `gorm:"column:id"`
	Name                  string  `gorm:"column:name"`
	AnimeStatus           string  `gorm:"column:anime_status"`
	WatchStatus           int     `gorm:"column:watch_status"`
	TotalNumberOfEpisodes int     `gorm:"column:total_number_of_episodes"`
	IsMovie               bool    `gorm:"column:is_movie"`
	Genre                 string  `gorm:"column:genre;"`
	Score                 float32 `gorm:"column:score"`
	MALScore              float32 `gorm:"column:mal_score"`
	Notes                 string  `gorm:"column:notes"`
	AnimeLink             string  `gorm:"column:anime_link"`
	MALAnimeLink          string  `gorm:"column:mal_anime_link"`
	Cover                 string  `gorm:"column:cover"`
	Series                int     `gorm:"column:series"`
	SeriesName            string  `gorm:"column:series_name"`
	PlanToWatch           bool    `gorm:"column:plan_to_watch"`
}

// TableName specifies the table name for Anime
func (Anime) TableName() string {
	return "anime.animes"
}

type AnimeCreate struct {
	ID                    uint    `gorm:"column:id"`
	Name                  string  `gorm:"column:name"`
	AnimeStatus           string  `gorm:"column:anime_status"`
	WatchStatus           int     `gorm:"column:watch_status"`
	TotalNumberOfEpisodes int     `gorm:"column:total_number_of_episodes"`
	IsMovie               bool    `gorm:"column:is_movie"`
	Score                 float32 `gorm:"column:score"`
	MALScore              float32 `gorm:"column:mal_score"`
	Notes                 string  `gorm:"column:notes"`
	AnimeLink             string  `gorm:"column:anime_link"`
	MALAnimeLink          string  `gorm:"column:mal_anime_link"`
	Cover                 string  `gorm:"column:cover"`
	Series                int     `gorm:"column:series"`
	PlanToWatch           bool    `gorm:"column:plan_to_watch"`
}

type AnimeFilter struct {
	Name                  string            `gorm:"column:name"`
	AnimeStatus           []interface{}     `gorm:"column:anime_status"`
	WatchStatus           string            `gorm:"column:watch_status"`
	TotalNumberOfEpisodes NumberFilter      `gorm:"column:total_number_of_episodes"`
	IsMovie               []interface{}     `gorm:"column:is_movie"`
	Genre                 []interface{}     `gorm:"column:genre"`
	Score                 FloatNumberFilter `gorm:"column:score"`
	Series                []interface{}     `gorm:"column:series"`
	PlanToWatch           []interface{}     `gorm:"column:plan_to_watch"`
}

type NumberFilter struct {
	Value   int    `json:"value"`
	Operand string `json:"operand"`
}

type FloatNumberFilter struct {
	Value   float32 `json:"value"`
	Operand string  `json:"operand"`
}

type Genre struct {
	ID        uint   `gorm:"column:id"`
	GenreName string `json:"name"`
}

type AnimesGenres struct {
	AnimeID int `gorm:"column:anime_id"`
	GenreID int `gorm:"column:genre_id"`
}

type AnimeResponse struct {
	Data       []Anime    `json:"data"`
	Pagination Pagination `json:"pagination"`
}
