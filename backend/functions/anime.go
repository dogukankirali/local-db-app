package functions

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"local-db-app/models"
	"net/http"
	"strconv"
	"strings"
	"unicode"

	"gorm.io/gorm"
)

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
		var genres []models.Genre
		result := db.Table("anime.genres").Find(&genres)
		if result.Error != nil {
			panic(result.Error)
		}
		json.NewEncoder(w).Encode(&genres)
	}
}

func GetAnimeTableData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var reqBody models.FilterArray
		var whereString = ""
		var animes []models.Anime
		var result *gorm.DB
		var animeFilter models.AnimeFilter
		var counter []models.Anime
		var response models.AnimeResponse
		queryParams := r.URL.Query()
		count, _ := strconv.Atoi(queryParams.Get("count"))
		page, _ := strconv.Atoi(queryParams.Get("page"))
		orderBy := ""
		order := ""
		empty := []models.Anime{}

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
					animeFilter.TotalNumberOfEpisodes = models.NumberFilter{
						Value:   int(filter.Value.(float64)),
						Operand: filter.Operand,
					}
				}
			case "IsMovie":
				animeFilter.IsMovie = filter.Value.([]interface{})
			case "Score":
				if filter.Value != nil {
					animeFilter.Score = models.NumberFilter{
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

		pagination := models.Pagination{
			ItemCount:      len(animes),
			CurrentPage:    page,
			TotalItemCount: len(counter),
			ItemsPerPage:   count,
			TotalPageCount: rem(len(counter), count),
		}

		if animes == nil {
			response = models.AnimeResponse{
				Data:       empty,
				Pagination: pagination,
			}
		} else {
			response = models.AnimeResponse{
				Data:       animes,
				Pagination: pagination,
			}
		}

		json.NewEncoder(w).Encode(&response)
	}
}

func UpdateAnimeTableData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var reqBody models.Anime
		var genres []models.Genre

		errDec := json.NewDecoder(r.Body).Decode(&reqBody)
		if errDec != nil {
			http.Error(w, errDec.Error(), http.StatusBadRequest)
			return
		}

		anime := models.Anime{
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

		err := db.Table("anime.animes a").Model(&models.Anime{}).Where("id = ?", reqBody.ID).Updates(&anime).Error
		if err != nil {
			fmt.Println("Update error:", err)
			return
		}
		animeId := int(reqBody.ID)
		condition := fmt.Sprintf("anime_id = '%d'", animeId)
		result := db.Table("anime.animes_genres").Where(condition).Delete(&models.Anime{})
		if result.Error != nil {
			fmt.Println("Deletion error:", result.Error)
			return
		}

		var animesGenres []models.AnimesGenres
		idArr := strings.Split(reqBody.Genre, ", ")
		db.Table("anime.genres g").Select("id").Where("genre_name IN ?", idArr).Find(&genres)
		for _, item := range genres {
			fmt.Println(item)
			genreId := int(item.ID)
			animeId := int(reqBody.ID)
			newItem := models.AnimesGenres{
				AnimeID: animeId,
				GenreID: genreId,
			}
			animesGenres = append(animesGenres, newItem)

		}

		if len(animesGenres) != 0 {
			err2 := db.Table("anime.animes_genres").Create(&animesGenres).Error
			if err2 != nil {
				fmt.Println("Update error in genre:", err2)
				return
			}
		}
	}
}

func CreateAnimeTableData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var reqBody models.Anime
		var genres []models.Genre
		//var response interface{}

		errDec := json.NewDecoder(r.Body).Decode(&reqBody)
		if errDec != nil {
			http.Error(w, errDec.Error(), http.StatusBadRequest)
			return
		}

		anime := models.AnimeCreate{
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
		err := db.Table("anime.animes").Create(&anime).Error
		if err != nil {
			errorMessage := "Sunucu hatası oluştu."
			response := models.ErrorResponse{
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
			var animesGenres []models.AnimesGenres
			idArr := strings.Split(reqBody.Genre, ", ")
			db.Table("anime.genres g").Select("id").Where("genre_name IN ?", idArr).Find(&genres)
			for _, item := range genres {
				genreId := int(item.ID)
				animeId := int(anime.ID)
				newItem := models.AnimesGenres{
					AnimeID: animeId,
					GenreID: genreId,
				}
				animesGenres = append(animesGenres, newItem)

			}

			if len(animesGenres) != 0 {
				err2 := db.Table("anime.animes_genres").Create(&animesGenres).Error
				if err2 != nil {
					fmt.Println("Update error in genre:", err2)
					return
				}
			}
			message := "OK"
			response := models.ErrorResponse{
				Message: message,
			}
			json.NewEncoder(w).Encode(&response)
		}

	}
}

func CreateAnimeTableDataWithFile(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		r.ParseMultipartForm(32 << 20) // limit your max input length!
		var genres []models.Genre

		file, _, err := r.FormFile("file")
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		var buf bytes.Buffer
		io.Copy(&buf, file)

		contents := buf.String()
		reader := csv.NewReader(strings.NewReader(contents))

		records, err := reader.ReadAll()
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		for _, record := range records {
			if len(record) != 11 {
				continue
			}

			watchStatus, _ := strconv.Atoi(record[2])
			totalNumberOfEpisodes, _ := strconv.Atoi(record[3])
			score, _ := strconv.Atoi(record[4])
			malScore, _ := strconv.ParseFloat(record[5], 32)
			isMovie, _ := strconv.ParseBool(record[6])

			anime := models.AnimeCreate{
				Name:                  record[0],
				AnimeStatus:           record[1],
				WatchStatus:           watchStatus,
				TotalNumberOfEpisodes: totalNumberOfEpisodes,
				IsMovie:               isMovie,
				Score:                 score,
				MALScore:              float32(malScore),
				Notes:                 record[10],
				MALAnimeLink:          record[8],
				AnimeLink:             record[9],
			}

			result := db.Table("anime.animes").Create(&anime)
			if result.Error != nil {
				http.Error(w, result.Error.Error(), http.StatusInternalServerError)
				return
			}

			var animesGenres []models.AnimesGenres
			idArr := strings.Split(record[7], "-")
			db.Table("anime.genres g").Select("id").Where("id IN ?", idArr).Find(&genres)
			for _, item := range genres {
				genreId := int(item.ID)
				animeId := int(anime.ID)
				newItem := models.AnimesGenres{
					AnimeID: animeId,
					GenreID: genreId,
				}
				animesGenres = append(animesGenres, newItem)

			}

			if len(animesGenres) != 0 {
				err2 := db.Table("anime.animes_genres").Create(&animesGenres).Error
				if err2 != nil {
					fmt.Println("Update error in genre:", err2)
					return
				}
			}
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte("File uploaded and data processed successfully"))
	}
}

func DeleteAnimeTableData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		idParam := r.URL.Query().Get("id")
		condition := fmt.Sprintf("anime_id = '%s'", idParam)
		result := db.Table("anime.animes_genres").Where(condition).Delete(&models.AnimesGenres{})
		if result.Error != nil {
			fmt.Println("Deletion error:", result.Error)
			return
		}

		err := db.Table("anime.animes").Where("id = ?", idParam).Delete(&models.Anime{}).Error
		if err != nil {
			fmt.Println("Delete error:", err)
			return
		}
		message := "OK"
		response := models.ErrorResponse{
			Message: message,
		}
		json.NewEncoder(w).Encode(&response)
	}
}
