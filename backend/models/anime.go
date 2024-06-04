package models

type Anime struct {
	ID                    uint    `gorm:"column:id"`
	Name                  string  `gorm:"column:name"`
	AnimeStatus           string  `gorm:"column:anime_status"`
	WatchStatus           int     `gorm:"column:watch_status"`
	TotalNumberOfEpisodes int     `gorm:"column:total_number_of_episodes"`
	IsMovie               bool    `gorm:"column:is_movie"`
	Genre                 string  `gorm:"column:genre;"`
	Score                 int     `gorm:"column:score"`
	MALScore              float32 `gorm:"column:mal_score"`
	Notes                 string  `gorm:"column:notes"`
	AnimeLink             string  `gorm:"column:anime_link"`
	MALAnimeLink          string  `gorm:"column:mal_anime_link"`
	Cover                 string  `gorm:"column:cover"`
}

type AnimeCreate struct {
	ID                    uint    `gorm:"column:id"`
	Name                  string  `gorm:"column:name"`
	AnimeStatus           string  `gorm:"column:anime_status"`
	WatchStatus           int     `gorm:"column:watch_status"`
	TotalNumberOfEpisodes int     `gorm:"column:total_number_of_episodes"`
	IsMovie               bool    `gorm:"column:is_movie"`
	Score                 int     `gorm:"column:score"`
	MALScore              float32 `gorm:"column:mal_score"`
	Notes                 string  `gorm:"column:notes"`
	AnimeLink             string  `gorm:"column:anime_link"`
	MALAnimeLink          string  `gorm:"column:mal_anime_link"`
	Cover                 string  `gorm:"column:cover"`
}

type AnimeFilter struct {
	Name                  string        `gorm:"column:name"`
	AnimeStatus           []interface{} `gorm:"column:anime_status"`
	WatchStatus           string        `gorm:"column:watch_status"`
	TotalNumberOfEpisodes NumberFilter  `gorm:"column:total_number_of_episodes"`
	IsMovie               []interface{} `gorm:"column:is_movie"`
	Genre                 []interface{} `gorm:"column:genre"`
	Score                 NumberFilter  `gorm:"column:score"`
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
