package functions

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"local-db-app/models"
	"log"
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

// Sıralama için kullanılacak SQL ifadesini oluşturan yardımcı fonksiyon
func buildOrderByClause(orderBy, order string) string {
	// Sıralama yönünü kontrol et
	if order != "asc" && order != "desc" {
		order = "asc" // Varsayılan sıralama yönü
	}

	// Özel durumlar için kontrol
	switch orderBy {
	case "Name":
		return fmt.Sprintf("LOWER(a.name) %s", order) // Büyük/küçük harf duyarsız sıralama
	case "AnimeStatus":
		return fmt.Sprintf("a.anime_status %s", order)
	case "WatchStatus":
		return fmt.Sprintf("a.watch_status %s", order)
	case "TotalNumberOfEpisodes":
		return fmt.Sprintf("a.total_number_of_episodes::integer %s", order) // Sayısal sıralama
	case "IsMovie":
		return fmt.Sprintf("a.is_movie %s", order)
	case "Score":
		return fmt.Sprintf("a.score::float %s", order) // Ondalıklı sayı sıralaması
	case "MALScore":
		return fmt.Sprintf("a.mal_score::float %s", order) // Ondalıklı sayı sıralaması
	case "Genre":
		return fmt.Sprintf("genre %s", order)
	default:
		// Varsayılan olarak name sütununa göre sırala
		if orderBy == "" {
			return fmt.Sprintf("LOWER(a.name) %s", order)
		}
		// Varsayılan olarak snake_case dönüşümü kullan
		return fmt.Sprintf("%s %s", PascalToSnakeCase(orderBy), order)
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

		// Sıralama parametrelerini al
		orderBy := queryParams.Get("orderBy")
		order := queryParams.Get("order")

		// Varsayılan değerler
		if count <= 0 {
			count = 10
		}
		if page <= 0 {
			page = 1
		}
		if order == "" {
			order = "asc"
		}

		// Log ekle
		fmt.Printf("Sıralama parametreleri: orderBy=%s, order=%s\n", orderBy, order)

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
			case "PlanToWatch":
				animeFilter.PlanToWatch = filter.Value.([]interface{})
			case "Score":
				if filter.Value != nil {
					animeFilter.Score = models.FloatNumberFilter{
						Value:   float32(filter.Value.(float64)),
						Operand: filter.Operand,
					}
				}
			case "Genre":
				animeFilter.Genre = filter.Value.([]interface{})
			case "Series":
				animeFilter.Series = filter.Value.([]interface{})
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
				// Tip kontrolü yaparak uygun şekilde string'e dönüştürme
				switch v := animeFilter.AnimeStatus[i].(type) {
				case string:
					genreArray = append(genreArray, v)
				case float64:
					genreArray = append(genreArray, fmt.Sprintf("%d", int(v)))
				case int:
					genreArray = append(genreArray, fmt.Sprintf("%d", v))
				default:
					// Diğer tipler için string dönüşümü
					genreArray = append(genreArray, fmt.Sprintf("%v", v))
				}
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
				// Tip kontrolü yaparak uygun şekilde string'e dönüştürme
				switch v := animeFilter.IsMovie[i].(type) {
				case string:
					genreArray = append(genreArray, v)
				case float64:
					genreArray = append(genreArray, fmt.Sprintf("%t", v != 0))
				case int:
					genreArray = append(genreArray, fmt.Sprintf("%t", v != 0))
				case bool:
					genreArray = append(genreArray, fmt.Sprintf("%t", v))
				default:
					// Diğer tipler için string dönüşümü
					genreArray = append(genreArray, fmt.Sprintf("%v", v))
				}
			}
			if len(genreArray) == 1 {
				if len(whereString) != 0 {
					whereString += fmt.Sprintf("and a.is_movie = %s ", genreArray[0])
				} else {
					whereString += fmt.Sprintf("a.is_movie = %s ", genreArray[0])
				}
			} else {
				if len(whereString) != 0 {
					whereString += fmt.Sprintf("and (a.is_movie = %s or a.is_movie = %s) ", genreArray[0], genreArray[1])
				} else {
					whereString += fmt.Sprintf("(a.is_movie = %s or a.is_movie = %s) ", genreArray[0], genreArray[1])
				}
			}
		}
		if len(animeFilter.PlanToWatch) != 0 {
			var planToWatchArray []string
			for i := range animeFilter.PlanToWatch {
				// Tip kontrolü yaparak uygun şekilde string'e dönüştürme
				switch v := animeFilter.PlanToWatch[i].(type) {
				case string:
					planToWatchArray = append(planToWatchArray, v)
				case float64:
					planToWatchArray = append(planToWatchArray, fmt.Sprintf("%t", v != 0))
				case int:
					planToWatchArray = append(planToWatchArray, fmt.Sprintf("%t", v != 0))
				case bool:
					planToWatchArray = append(planToWatchArray, fmt.Sprintf("%t", v))
				default:
					// Diğer tipler için string dönüşümü
					planToWatchArray = append(planToWatchArray, fmt.Sprintf("%v", v))
				}
			}
			if len(planToWatchArray) == 1 {
				if len(whereString) != 0 {
					whereString += fmt.Sprintf("and a.plan_to_watch = %s ", planToWatchArray[0])
				} else {
					whereString += fmt.Sprintf("a.plan_to_watch = %s ", planToWatchArray[0])
				}
			} else {
				if len(whereString) != 0 {
					whereString += fmt.Sprintf("and (a.plan_to_watch = %s or a.plan_to_watch = %s) ", planToWatchArray[0], planToWatchArray[1])
				} else {
					whereString += fmt.Sprintf("(a.plan_to_watch = %s or a.plan_to_watch = %s) ", planToWatchArray[0], planToWatchArray[1])
				}
			}
		}
		if animeFilter.Score.Value != 0 {
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and a.score %s %f ", animeFilter.Score.Operand, animeFilter.Score.Value)
			} else {
				whereString += fmt.Sprintf("a.score %s %f ", animeFilter.Score.Operand, animeFilter.Score.Value)
			}
		}
		if animeFilter.TotalNumberOfEpisodes.Value != 0 {
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and a.total_number_of_episodes %s %d ", animeFilter.TotalNumberOfEpisodes.Operand, animeFilter.TotalNumberOfEpisodes.Value)
			} else {
				whereString += fmt.Sprintf("a.total_number_of_episodes %s %d ", animeFilter.TotalNumberOfEpisodes.Operand, animeFilter.TotalNumberOfEpisodes.Value)
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
				// Tip kontrolü yaparak uygun şekilde string'e dönüştürme
				switch v := animeFilter.Genre[i].(type) {
				case string:
					genreArray = append(genreArray, v)
				case float64:
					genreArray = append(genreArray, fmt.Sprintf("%d", int(v)))
				case int:
					genreArray = append(genreArray, fmt.Sprintf("%d", v))
				default:
					// Diğer tipler için string dönüşümü
					genreArray = append(genreArray, fmt.Sprintf("%v", v))
				}
			}
			genreString := strings.Join(genreArray, ", ")
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and g.genre_name ILIKE ANY (string_to_array('%%%s%%', ', ')) ", genreString)
			} else {
				whereString += fmt.Sprintf("g.genre_name ILIKE ANY (string_to_array('%%%s%%', ', ')) ", genreString)
			}
		}

		if len(animeFilter.Series) != 0 {
			var seriesArray []string
			for i := range animeFilter.Series {
				// Tip kontrolü yaparak uygun şekilde string'e dönüştürme
				switch v := animeFilter.Series[i].(type) {
				case string:
					seriesArray = append(seriesArray, fmt.Sprintf("'%s'", v))
				case float64:
					seriesArray = append(seriesArray, fmt.Sprintf("%d", int(v)))
				case int:
					seriesArray = append(seriesArray, fmt.Sprintf("%d", v))
				default:
					// Diğer tipler için string dönüşümü
					seriesArray = append(seriesArray, fmt.Sprintf("%v", v))
				}
			}
			// Series ID'lerini kullanarak filtreleme
			seriesString := strings.Join(seriesArray, ", ")
			if len(whereString) != 0 {
				whereString += fmt.Sprintf("and s.name IN (%s) ", seriesString)
			} else {
				whereString += fmt.Sprintf("s.name IN (%s) ", seriesString)
			}
		}

		if len(whereString) != 0 {
			// Sıralama parametresi varsa
			orderClause := buildOrderByClause(orderBy, order)

			// SQL sorgusunu debug et
			sqlQuery := db.Table("anime.animes a").
				Select("a.*, string_agg(g.genre_name, ', ') as genre, s.name as series_name").
				Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
				Joins("left join anime.genres g on ag.genre_id = g.id").
				Joins("left join anime.anime_series s on a.series = s.id").
				Where(whereString).
				Order(orderClause).
				Limit(count).
				Offset((page - 1) * count).
				Group("a.id, a.*, s.name").Statement

			// SQL sorgusunu yazdır
			fmt.Println("SQL Sorgusu:", sqlQuery.SQL.String())
			fmt.Println("SQL Parametreleri:", sqlQuery.Vars)

			result = db.Table("anime.animes a").
				Select("a.*, string_agg(g.genre_name, ', ') as genre, s.name as series_name").
				Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
				Joins("left join anime.genres g on ag.genre_id = g.id").
				Joins("left join anime.anime_series s on a.series = s.id").
				Where(whereString).
				Order(orderClause).
				Limit(count).
				Offset((page - 1) * count).
				Group("a.id, a.*, s.name").
				Scan(&animes)
		} else {
			// Sıralama parametresi varsa
			orderClause := buildOrderByClause(orderBy, order)

			// SQL sorgusunu debug et
			sqlQuery := db.Table("anime.animes a").
				Select("a.*, string_agg(g.genre_name, ', ') as genre, s.name as series_name").
				Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
				Joins("left join anime.genres g on ag.genre_id = g.id").
				Joins("left join anime.anime_series s on a.series = s.id").
				Order(orderClause).
				Limit(count).
				Offset((page - 1) * count).
				Group("a.id, a.*, s.name").Statement

			// SQL sorgusunu yazdır
			fmt.Println("SQL Sorgusu:", sqlQuery.SQL.String())
			fmt.Println("SQL Parametreleri:", sqlQuery.Vars)

			result = db.Table("anime.animes a").
				Select("a.*, string_agg(g.genre_name, ', ') as genre, s.name as series_name").
				Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
				Joins("left join anime.genres g on ag.genre_id = g.id").
				Joins("left join anime.anime_series s on a.series = s.id").
				Order(orderClause).
				Limit(count).
				Offset((page - 1) * count).
				Group("a.id, a.*, s.name").
				Scan(&animes)
		}

		if result.Error != nil {
			panic(result.Error)
		}

		// Sayım için sorgu
		counterD := db.Table("anime.animes a").
			Select("a.*, string_agg(g.genre_name, ', ') as genre, s.name as series_name").
			Joins("left join anime.animes_genres ag on a.id = ag.anime_id").
			Joins("left join anime.genres g on ag.genre_id = g.id").
			Joins("left join anime.anime_series s on a.series = s.id").
			Where(whereString).
			Group("a.id, a.*, s.name").
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
			// SeriesName alanını doldur
			for i := range animes {
				// Debug log ekle
				/* fmt.Printf("Anime ID: %d, Name: %s, Series: %d, SeriesName: %s\n",
				animes[i].ID, animes[i].Name, animes[i].Series, animes[i].SeriesName) */

				// SeriesName zaten SQL sorgusunda s.name as series_name olarak alınıyor
				// Eğer hala boş geliyorsa, manuel olarak dolduralım
				if animes[i].SeriesName == "" && animes[i].Series > 0 {
					var seriesName string
					seriesResult := db.Table("anime.anime_series").
						Select("name").
						Where("id = ?", animes[i].Series).
						Scan(&seriesName)

					if seriesResult.Error != nil {
						fmt.Printf("Series sorgusu hatası: %v\n", seriesResult.Error)
					} else if seriesResult.RowsAffected > 0 {
						animes[i].SeriesName = seriesName
						fmt.Printf("SeriesName manuel olarak güncellendi: %s\n", seriesName)
					} else {
						fmt.Printf("Series ID %d için kayıt bulunamadı\n", animes[i].Series)
					}
				}
			}

			// Tüm anime verilerini debug et
			/* for i, anime := range animes {
				fmt.Printf("Anime[%d]: ID=%d, Name=%s, Series=%d, SeriesName=%s\n",
					i, anime.ID, anime.Name, anime.Series, anime.SeriesName)
			} */

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

		// Debug log ekle
		fmt.Printf("Güncelleme isteği alındı: ID=%d, Name=%s, Series=%d, SeriesName=%s, WatchStatus=%d\n ",
			reqBody.ID, reqBody.Name, reqBody.Series, reqBody.SeriesName, reqBody.WatchStatus)

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
			Series:                reqBody.Series,      // Series alanını da güncelle
			PlanToWatch:           reqBody.PlanToWatch, // PlanToWatch alanını ekle
		}

		// Doğrudan SQL sorgusu ile güncelleme yap
		updateQuery := `
			UPDATE anime.animes 
			SET name = $1, anime_status = $2, watch_status = $3, total_number_of_episodes = $4,
				is_movie = $5, score = $6, mal_score = $7, notes = $8, anime_link = $9,
				mal_anime_link = $10, cover = $11, series = $12, plan_to_watch = $13
			WHERE id = $14
		`

		err := db.Exec(updateQuery,
			anime.Name, anime.AnimeStatus, anime.WatchStatus, anime.TotalNumberOfEpisodes,
			anime.IsMovie, anime.Score, anime.MALScore, anime.Notes, anime.AnimeLink,
			anime.MALAnimeLink, anime.Cover, anime.Series, anime.PlanToWatch, reqBody.ID).Error

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
			Series:                reqBody.Series,
			PlanToWatch:           reqBody.PlanToWatch,
		}
		err := db.Table("anime.animes").Create(&anime).Error
		if err != nil {
			errorMessage := fmt.Sprintf("Sunucu hatası oluştu: %v", err)
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
			score, _ := strconv.ParseFloat(record[4], 32)
			malScore, _ := strconv.ParseFloat(record[5], 32)
			isMovie, _ := strconv.ParseBool(record[6])

			anime := models.AnimeCreate{
				Name:                  record[0],
				AnimeStatus:           record[1],
				WatchStatus:           watchStatus,
				TotalNumberOfEpisodes: totalNumberOfEpisodes,
				IsMovie:               isMovie,
				Score:                 float32(score),
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

// SyncAnimeDataFromJikan fonksiyonu sync.go dosyasında SyncAnimeData olarak tanımlanmıştır.
// Bu nedenle burada tekrar tanımlanmasına gerek yoktur.

// GetSeries, anime serilerini getiren fonksiyon
func GetSeries(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		var series []models.Series
		result := db.Table("anime.anime_series").Order("name ASC").Find(&series)
		if result.Error != nil {
			http.Error(w, result.Error.Error(), http.StatusInternalServerError)
			return
		}

		// Seri listesini JSON olarak döndür
		seriesResponse := make([]map[string]interface{}, len(series))
		for i, s := range series {
			seriesResponse[i] = map[string]interface{}{
				"id":    s.ID,
				"name":  s.Name,
				"value": s.Name,
				"label": s.Name,
			}
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(seriesResponse)
	}
}

// GetAnimeById, belirli bir ID'ye sahip animeyi getiren fonksiyon
func GetAnimeById(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// CORS başlıklarını ekle
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// OPTIONS isteğine yanıt ver
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		// ID parametresini al
		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			log.Printf("Geçersiz anime ID'si: %s", idStr)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Geçersiz anime ID'si"})
			return
		}

		log.Printf("GetAnimeById - anime ID: %d", id)

		// Animeyi al
		var anime models.Anime
		result := db.Table("anime.animes").Select("*").Where("id = ?", id).Scan(&anime)
		if result.Error != nil {
			log.Printf("Anime alınamadı: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": result.Error.Error()})
			return
		}

		// Anime bulunamadıysa
		if result.RowsAffected == 0 {
			log.Printf("Anime bulunamadı, ID: %d", id)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Anime bulunamadı"})
			return
		}

		// Anime'nin türlerini al
		var genres []string
		db.Table("anime.genres g").
			Joins("JOIN anime.animes_genres ag ON g.id = ag.genre_id").
			Where("ag.anime_id = ?", id).
			Pluck("g.genre_name", &genres)

		// Türleri virgülle ayrılmış şekilde birleştir
		anime.Genre = strings.Join(genres, ", ")

		// Seri adını al (eğer bir seriye aitse)
		if anime.Series > 0 {
			var seriesName string
			db.Table("anime.anime_series").
				Select("name").
				Where("id = ?", anime.Series).
				Scan(&seriesName)
			anime.SeriesName = seriesName
		}

		log.Printf("Anime bulundu: %s (ID: %d)", anime.Name, anime.ID)

		// Başarılı yanıt döndür
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
			"data":   anime,
		})
	}
}

func UpdateFinishedAnimeStatus(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// WatchStatus'u -1 olan animeleri güncelle
		result := db.Table("anime.animes").
			Where("watch_status = ?", -1).
			Update("watch_status", gorm.Expr("total_number_of_episodes"))

		if result.Error != nil {
			http.Error(w, result.Error.Error(), http.StatusInternalServerError)
			return
		}

		message := fmt.Sprintf("Güncellenen anime sayısı: %d", result.RowsAffected)
		response := models.ErrorResponse{
			Message: message,
		}
		json.NewEncoder(w).Encode(&response)
	}
}
