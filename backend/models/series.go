package models

// Series, anime serilerini temsil eden model
type Series struct {
	ID   uint   `gorm:"column:id;primaryKey;autoIncrement"`
	Name string `gorm:"column:name;unique"`
}

// TableName, Series modelinin tablo adını döndürür
func (Series) TableName() string {
	return "anime.anime_series"
}
