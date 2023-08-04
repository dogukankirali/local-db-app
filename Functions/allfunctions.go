package allfunctions

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"gorm.io/gorm"
)

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

type AnimeFilter struct {
	Name                  string        `gorm:"column:name"`
	AnimeStatus           []interface{} `gorm:"column:anime_status"`
	WatchStatus           string        `gorm:"column:watch_status"`
	TotalNumberOfEpisodes NumberFilter  `gorm:"column:total_number_of_episodes"`
	IsMovie               []interface{} `gorm:"column:is_movie"`
	Genre                 []interface{} `gorm:"column:genre"`
	Score                 NumberFilter  `gorm:"column:score"`
}

type Filter struct {
	Key     string      `json:"key"`
	Value   interface{} `json:"value"`
	Operand string      `json:"operand,omitempty"`
}

type NumberFilter struct {
	Value   int    `json:"value"`
	Operand string `json:"operand,omitempty"`
}

type FilterArray struct {
	FilterArray []Filter `json:"filterArray"`
}

type Genre struct {
	ID        uint   `gorm:"column:id"`
	GenreName string `json:"name"`
}

type AnimesGenres struct {
	AnimeID int `gorm:"column:anime_id"`
	GenreID int `gorm:"column:genre_id"`
}

type Response struct {
	Data       []Anime    `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type Pagination struct {
	ItemCount      int `json:"itemCount"`
	CurrentPage    int `json:"currentPage"`
	TotalItemCount int `json:"totalItemCount"`
	ItemsPerPage   int `json:"itemsPerPage"`
	TotalPageCount int `json:"totalPageCount"`
}
type ErrorResponse struct {
	Message string `json:"message"`
}

func PascalToSnakeCase(input string) string {
	var output strings.Builder

	for i, r := range input {
		if unicode.IsUpper(r) {
			if i > 0 {
				output.WriteRune('_')
			}
			output.WriteRune(unicode.ToLower(r))
		} else {
			output.WriteRune(r)
		}
	}

	return output.String()
}

func rem(counter, count int) int {
	remainder := counter % count
	if remainder > 0 {
		return counter/count + 1
	} else {
		return counter / count
	}
}

func GetGenres(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var genres []Genre
		result := db.Table("anime.genres").Find(&genres)
		if result.Error != nil {
			panic(result.Error)
		}
		json.NewEncoder(w).Encode(&genres)
	}
}

func GetAnimeTableData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var reqBody FilterArray
		var whereString = ""
		var animes []Anime
		var result *gorm.DB
		var animeFilter AnimeFilter
		var counter []Anime
		var response Response
		queryParams := r.URL.Query()
		count, _ := strconv.Atoi(queryParams.Get("count"))
		page, _ := strconv.Atoi(queryParams.Get("page"))
		orderBy := ""
		order := ""
		empty := []Anime{}

		errDec := json.NewDecoder(r.Body).Decode(&reqBody)
		if errDec != nil {
			http.Error(w, errDec.Error(), http.StatusBadRequest)
			return
		}

		for _, filter := range reqBody.FilterArray {
			switch filter.Key {
			case "Name":
				animeFilter.Name = filter.Value.(string)
			case "AnimeStatus":
				animeFilter.AnimeStatus = filter.Value.([]interface{})
			case "WatchStatus":
				animeFilter.WatchStatus = filter.Value.(string)
			case "TotalNumberOfEpisodes":
				if filter.Value != nil {
					animeFilter.TotalNumberOfEpisodes = NumberFilter{
						Value:   int(filter.Value.(float64)),
						Operand: filter.Operand,
					}
				}
			case "IsMovie":
				animeFilter.IsMovie = filter.Value.([]interface{})
			case "Score":
				if filter.Value != nil {
					animeFilter.Score = NumberFilter{
						Value:   int(filter.Value.(float64)),
						Operand: filter.Operand,
					}
				}
			case "Genre":
				animeFilter.Genre = filter.Value.([]interface{})
			}
		}

		if len(animeFilter.Name) != 0 {
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and a.name ILIKE '%%%s%%' ", animeFilter.Name)
			} else {
				whereString += fmt.Sprintf("a.name ILIKE '%%%s%%' ", animeFilter.Name)
			}
		}
		if len(animeFilter.AnimeStatus) == 1 {
			var genreArray []string
			for i := range animeFilter.AnimeStatus {
				genreArray = append(genreArray, animeFilter.AnimeStatus[i].(string))
			}
			genreString := strings.Join(genreArray, ", ")
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and a.anime_status ILIKE ANY (string_to_array('%%%s%%', ', '))  ", genreString)
			} else {
				whereString += fmt.Sprintf("a.anime_status ILIKE ANY (string_to_array('%%%s%%', ', '))  ", genreString)
			}
		}
		if len(animeFilter.IsMovie) != 0 {
			var genreArray []string
			for i := range animeFilter.IsMovie {
				genreArray = append(genreArray, animeFilter.IsMovie[i].(string))
			}
			if len(genreArray) == 1 {
				if len(whereString) != 0 {
					whereString += fmt.Sprintf("and a.is_movie = %s ", genreArray[0])
				} else {
					whereString += fmt.Sprintf("a.is_movie = %s ", genreArray[0])
				}
			} else {
				if len(whereString) != 0 {
					whereString += fmt.Sprintf("and a.is_movie = %s or a.is_movie = %s ", genreArray[0], genreArray[1])
				} else {
					whereString += fmt.Sprintf("a.is_movie = %s or a.is_movie = %s ", genreArray[0], genreArray[1])
				}
			}

		}
		if animeFilter.Score.Value != 0 {
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and a.score %s '%d' ", animeFilter.Score.Operand, animeFilter.Score.Value)
			} else {
				whereString += fmt.Sprintf("a.score %s '%d' ", animeFilter.Score.Operand, animeFilter.Score.Value)
			}
		}
		if animeFilter.TotalNumberOfEpisodes.Value != 0 {
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and a.total_number_of_episodes %s '%d' ", animeFilter.TotalNumberOfEpisodes.Operand, animeFilter.TotalNumberOfEpisodes.Value)
			} else {
				whereString += fmt.Sprintf("a.total_number_of_episodes %s '%d' ", animeFilter.TotalNumberOfEpisodes.Operand, animeFilter.TotalNumberOfEpisodes.Value)
			}
		}
		if len(animeFilter.WatchStatus) != 0 {
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and a.watch_status = '%s' ", animeFilter.WatchStatus)
			} else {
				whereString += fmt.Sprintf("a.watch_status = '%s' ", animeFilter.WatchStatus)
			}
		}
		if len(animeFilter.Genre) != 0 {
			var genreArray []string
			for i := range animeFilter.Genre {
				genreArray = append(genreArray, animeFilter.Genre[i].(string))
			}
			genreString := strings.Join(genreArray, ", ")
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and g.genre_name ILIKE ANY (string_to_array('%%%s%%', ', ')) ", genreString)
			} else {
				whereString += fmt.Sprintf("g.genre_name ILIKE ANY (string_to_array('%%%s%%', ', ')) ", genreString)
			}
		}

		if len(queryParams.Get("order")) != 0 {
			order = queryParams.Get("order")
			orderBy = queryParams.Get("orderBy")
			result = db.Table("anime.animes a").
				Select("a.*, string_agg(g.genre_name, ', ') as genre").
				Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
				Joins("left join anime.genres g on ag.genre_id = g.id").
				Order(fmt.Sprintf("%s %s", PascalToSnakeCase(orderBy), order)).
				Limit(count).
				Offset((page - 1) * count).
				Where(whereString).
				Group("a.id, a.*").
				Scan(&animes)
		} else {
			result = db.Table("anime.animes a").
				Select("a.*, string_agg(g.genre_name, ', ') as genre").
				Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
				Joins("left join anime.genres g on ag.genre_id = g.id").
				Limit(count).
				Offset((page - 1) * count).
				Where(whereString).
				Group("a.id, a.*").
				Scan(&animes)
		}

		if result.Error != nil {
			panic(result.Error)
		}

		counterD := db.Table("anime.animes a").
			Select("a.*, string_agg(g.genre_name, ', ') as genre").
			Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
			Joins("left join anime.genres g on ag.genre_id = g.id").
			Where(whereString).
			Group("a.id, a.*").
			Scan(&counter)
		if counterD.Error != nil {
			panic(result.Error)
		}

		pagination := Pagination{
			ItemCount:      len(animes),
			CurrentPage:    page,
			TotalItemCount: len(counter),
			ItemsPerPage:   count,
			TotalPageCount: rem(len(counter), count),
		}

		if animes == nil {
			response = Response{
				Data:       empty,
				Pagination: pagination,
			}
		} else {
			response = Response{
				Data:       animes,
				Pagination: pagination,
			}
		}

		json.NewEncoder(w).Encode(&response)
	}
}

func UpdateAnimeTableData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var reqBody Anime
		var genres []Genre
		//var response interface{}

		errDec := json.NewDecoder(r.Body).Decode(&reqBody)
		if errDec != nil {
			http.Error(w, errDec.Error(), http.StatusBadRequest)
			return
		}

		anime := Anime{
			Name:                  reqBody.Name,
			AnimeStatus:           reqBody.AnimeStatus,
			WatchStatus:           reqBody.WatchStatus,
			TotalNumberOfEpisodes: reqBody.TotalNumberOfEpisodes,
			IsMovie:               reqBody.IsMovie,
			Score:                 reqBody.Score,
			MALScore:              reqBody.MALScore,
			Notes:                 reqBody.Notes,
			AnimeLink:             reqBody.AnimeLink,
			MALAnimeLink:          reqBody.MALAnimeLink,
			Cover:                 reqBody.Cover,
		}

		err := db.Table("anime.animes a").Model(&Anime{}).Where("id = ?", reqBody.ID).Updates(&anime).Error
		if err != nil {
			fmt.Println("Update error:", err)
			return
		}
		animeId := int(reqBody.ID)
		condition := fmt.Sprintf("anime_id = '%d'", animeId)
		result := db.Table("anime.animes_genres").Where(condition).Delete(&Anime{})
		if result.Error != nil {
			fmt.Println("Deletion error:", result.Error)
			return
		}

		var animesGenres []AnimesGenres
		idArr := strings.Split(reqBody.Genre, ", ")
		db.Table("anime.genres g").Select("id").Where("genre_name IN ?", idArr).Find(&genres)
		for _, item := range genres {
			fmt.Println(item)
			genreId := int(item.ID)
			animeId := int(reqBody.ID)
			newItem := AnimesGenres{
				AnimeID: animeId,
				GenreID: genreId,
			}
			animesGenres = append(animesGenres, newItem)

		}
		log.Println(animesGenres)

		err2 := db.Table("anime.animes_genres").Create(&animesGenres).Error
		if err2 != nil {
			fmt.Println("Update error in genre:", err2)
			return
		}

		//err = db.Create(&anime).Error
		/* if err != nil {
			errorMessage := "Sunucu hatası oluştu."
			response := ErrorResponse{
				Message: errorMessage,
			}
			w.WriteHeader(http.StatusInternalServerError)
			err := json.NewEncoder(w).Encode(&response)
			if err != nil {
				// JSON kodlaması hatası
				fmt.Println("JSON encode error:", err)
			}
			return
		} else {
			message := "OK"
			response := ErrorResponse{
				Message: message,
			}
			json.NewEncoder(w).Encode(&response)
		} */

	}
}

func CreateAnimeTableData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var reqBody Anime
		var genres []Genre
		//var response interface{}

		errDec := json.NewDecoder(r.Body).Decode(&reqBody)
		if errDec != nil {
			http.Error(w, errDec.Error(), http.StatusBadRequest)
			return
		}

		anime := Anime{
			Name:                  reqBody.Name,
			AnimeStatus:           reqBody.AnimeStatus,
			WatchStatus:           reqBody.WatchStatus,
			TotalNumberOfEpisodes: reqBody.TotalNumberOfEpisodes,
			IsMovie:               reqBody.IsMovie,
			Score:                 reqBody.Score,
			MALScore:              reqBody.MALScore,
			Notes:                 reqBody.Notes,
			AnimeLink:             reqBody.AnimeLink,
			MALAnimeLink:          reqBody.MALAnimeLink,
			Cover:                 reqBody.Cover,
		}
		err := db.Table("anime.animes a").Create(&anime).Error
		if err != nil {
			errorMessage := "Sunucu hatası oluştu."
			response := ErrorResponse{
				Message: errorMessage,
			}
			w.WriteHeader(http.StatusInternalServerError)
			err := json.NewEncoder(w).Encode(&response)
			if err != nil {
				// JSON kodlaması hatası
				fmt.Println("JSON encode error:", err)
			}
			return
		} else {
			var animesGenres []AnimesGenres
			idArr := strings.Split(reqBody.Genre, ", ")
			db.Table("anime.genres g").Select("id").Where("genre_name IN ?", idArr).Find(&genres)
			for _, item := range genres {
				fmt.Println(item)
				genreId := int(item.ID)
				animeId := int(reqBody.ID)
				newItem := AnimesGenres{
					AnimeID: animeId,
					GenreID: genreId,
				}
				animesGenres = append(animesGenres, newItem)

			}

			err2 := db.Table("anime.animes_genres").Create(&animesGenres).Error
			if err2 != nil {
				fmt.Println("Update error in genre:", err2)
				return
			}
			message := "OK"
			response := ErrorResponse{
				Message: message,
			}
			json.NewEncoder(w).Encode(&response)
		}

	}
}
