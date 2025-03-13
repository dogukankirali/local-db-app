package functions

import (
	"encoding/json"
	"fmt"
	"local-db-app/models"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/darenliang/jikan-go"
	"gorm.io/gorm"
)

// SyncAnimeData, veritabanındaki eksik anime bilgilerini Jikan API'si ile dolduran fonksiyon
func SyncAnimeData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Yanıt yapısı
		type SyncResponse struct {
			Success bool     `json:"success"`
			Message string   `json:"message"`
			Updated int      `json:"updated"`
			Failed  int      `json:"failed"`
			Errors  []string `json:"errors,omitempty"`
		}

		response := SyncResponse{
			Success: false,
			Message: "",
			Updated: 0,
			Failed:  0,
			Errors:  []string{},
		}

		// Sayfalama parametrelerini al
		offset := 0
		limit := 9999 // Pratik olarak tüm kayıtları al

		// URL'den offset parametresini al
		offsetParam := r.URL.Query().Get("offset")
		if offsetParam != "" {
			fmt.Sscanf(offsetParam, "%d", &offset)
		}

		// URL'den limit parametresini al
		limitParam := r.URL.Query().Get("limit")
		if limitParam != "" {
			fmt.Sscanf(limitParam, "%d", &limit)
		}

		// Eksik bilgileri olan anime kayıtlarını al
		var animes []models.Anime
		query := db.Table("anime.animes")

		// Offset kullan (opsiyonel)
		if offset > 0 {
			query = query.Offset(offset)
		}

		// Limit kullan (opsiyonel)
		if limit > 0 {
			query = query.Limit(limit)
		}

		// Sadece eksik bilgileri olan animeleri seç
		query = query.Where("series = 0 OR series IS NULL")

		result := query.Find(&animes)

		if result.Error != nil {
			response.Message = "Veritabanından anime kayıtları alınamadı"
			response.Errors = append(response.Errors, result.Error.Error())
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(response)
			return
		}

		log.Printf("Toplam %d anime kaydı bulundu", len(animes))

		if len(animes) == 0 {
			response.Success = true
			response.Message = "Veritabanında anime kaydı bulunamadı"
			json.NewEncoder(w).Encode(response)
			return
		}

		// Her bir anime için eksik bilgileri doldur
		for _, anime := range animes {
			// Eksik bilgileri kontrol et
			needsUpdate := false
			missingFields := []string{}

			if anime.MALAnimeLink == "" {
				needsUpdate = true
				missingFields = append(missingFields, "MALAnimeLink")
			}

			if anime.MALScore <= 0 {
				needsUpdate = true
				missingFields = append(missingFields, "MALScore")
			}

			if anime.TotalNumberOfEpisodes <= 0 {
				needsUpdate = true
				missingFields = append(missingFields, "TotalNumberOfEpisodes")
			}

			if anime.AnimeStatus == "" {
				needsUpdate = true
				missingFields = append(missingFields, "AnimeStatus")
			}

			if anime.Cover == "" {
				needsUpdate = true
				missingFields = append(missingFields, "Cover")
			}

			if anime.Series == 0 {
				needsUpdate = true
				missingFields = append(missingFields, "Series")
			}

			// Genre bilgisini al
			var genres []models.Genre
			db.Table("anime.genres").
				Select("anime.genres.*").
				Joins("join anime.animes_genres on anime.genres.id = anime.animes_genres.genre_id").
				Where("anime.animes_genres.anime_id = ?", anime.ID).
				Find(&genres)

			if len(genres) == 0 {
				needsUpdate = true
				missingFields = append(missingFields, "Genre")
			}

			var genreNames []string
			for _, g := range genres {
				genreNames = append(genreNames, g.GenreName)
			}
			anime.Genre = strings.Join(genreNames, ", ")

			if !needsUpdate {
				log.Printf("Anime güncel: %s (ID: %d)", anime.Name, anime.ID)
				continue
			}

			log.Printf("Anime işleniyor: %s (ID: %d), Eksik alanlar: %v", anime.Name, anime.ID, missingFields)
			log.Printf("Mevcut değerler: MALAnimeLink=%s, MALScore=%f, TotalNumberOfEpisodes=%d, AnimeStatus=%s, Cover=%s",
				anime.MALAnimeLink, anime.MALScore, anime.TotalNumberOfEpisodes, anime.AnimeStatus, anime.Cover)
			log.Printf("Genre: %s", anime.Genre)

			// Jikan API'ye istek yapmadan önce bir gecikme ekle (rate limit'i aşmamak için)
			// Her istek için 4 saniye bekle (Jikan API rate limit'i aşmamak için)
			log.Printf("Rate limit'i aşmamak için 4 saniye bekleniyor...")
			time.Sleep(4 * time.Second)

			// Anime adını kullanarak Jikan API'de ara
			searchParams := url.Values{}
			searchParams.Set("q", anime.Name)
			searchParams.Set("limit", "5") // Daha fazla sonuç al

			log.Printf("Jikan API'ye istek gönderiliyor: %s", anime.Name)

			// Yeniden deneme mekanizması
			var animeList *jikan.AnimeSearch
			var err error
			maxRetries := 3
			retryDelay := 5 * time.Second // İlk deneme başarısız olursa 5 saniye bekle

			for retry := 0; retry < maxRetries; retry++ {
				animeList, err = jikan.GetAnimeSearch(searchParams)
				if err == nil {
					break
				}

				log.Printf("Jikan API hatası (deneme %d/%d): %v", retry+1, maxRetries, err)
				if retry < maxRetries-1 {
					log.Printf("%s sonra tekrar denenecek...", retryDelay)
					time.Sleep(retryDelay)
					retryDelay *= 2 // Her denemede bekleme süresini iki katına çıkar (5s, 10s, 20s)
				}
			}

			if err != nil {
				log.Printf("Jikan API hatası (son): %v", err)
				response.Failed++
				response.Errors = append(response.Errors, fmt.Sprintf("Anime bulunamadı: %s, Hata: %v", anime.Name, err.Error()))
				continue
			}

			if len(animeList.Data) == 0 {
				log.Printf("Anime bulunamadı: %s", anime.Name)
				response.Failed++
				response.Errors = append(response.Errors, fmt.Sprintf("Anime bulunamadı: %s", anime.Name))
				continue
			}

			log.Printf("Jikan API'den %d sonuç alındı", len(animeList.Data))

			// En iyi eşleşmeyi bul
			foundAnime := animeList.Data[0]
			bestMatchScore := 0.0

			// Basit bir benzerlik skoru hesapla
			for _, result := range animeList.Data {
				// Anime adı tam olarak eşleşiyorsa, bu sonucu kullan
				if strings.ToLower(result.Title) == strings.ToLower(anime.Name) {
					foundAnime = result
					break
				}

				// Alternatif başlıkları kontrol et
				if result.TitleEnglish != "" && strings.ToLower(result.TitleEnglish) == strings.ToLower(anime.Name) {
					foundAnime = result
					break
				}

				// Benzerlik skoru hesapla (basit bir yaklaşım)
				score := 0.0
				if strings.Contains(strings.ToLower(result.Title), strings.ToLower(anime.Name)) {
					score += 0.8
				}
				if result.Score > bestMatchScore {
					score += 0.2
				}

				if score > bestMatchScore {
					bestMatchScore = score
					foundAnime = result
				}
			}

			// Anime verilerini güncelle
			updates := map[string]interface{}{}
			genreUpdated := false

			// MAL Anime Link
			if anime.MALAnimeLink == "" && foundAnime.Url != "" {
				updates["mal_anime_link"] = foundAnime.Url
			}

			// MAL Score
			if anime.MALScore <= 0 && foundAnime.Score > 0 {
				updates["mal_score"] = foundAnime.Score
			}

			// Total Number of Episodes
			if anime.TotalNumberOfEpisodes <= 0 && foundAnime.Episodes > 0 {
				updates["total_number_of_episodes"] = foundAnime.Episodes
			}

			// Anime Status
			if anime.AnimeStatus == "" && foundAnime.Status != "" {
				// Jikan API'den gelen durumu uygun formata dönüştür
				status := "OnAir"
				if strings.Contains(foundAnime.Status, "Finished") {
					status = "Finished"
				}
				updates["anime_status"] = status
			}

			// IsMovie
			if foundAnime.Type == "Movie" {
				updates["is_movie"] = true
			} else {
				updates["is_movie"] = false
			}

			// Genre
			if len(foundAnime.Genres) > 0 && (len(genres) == 0 || len(genres) < len(foundAnime.Genres)) {
				// Önce mevcut genre ilişkilerini temizle
				log.Printf("Genre güncellenecek: Mevcut: %d, Yeni: %d", len(genres), len(foundAnime.Genres))
				deleteResult := db.Exec("DELETE FROM anime.animes_genres WHERE anime_id = ?", anime.ID)
				if deleteResult.Error != nil {
					log.Printf("Genre ilişkileri silinemedi: %s, Hata: %v", anime.Name, deleteResult.Error)
				} else {
					log.Printf("Genre ilişkileri silindi: %s, Etkilenen satır: %d", anime.Name, deleteResult.RowsAffected)
				}
				genreUpdated = true

				// Jikan'dan gelen türleri veritabanında bul veya oluştur
				for _, genre := range foundAnime.Genres {
					var genreRecord models.Genre
					// Önce türü veritabanında ara
					genreResult := db.Table("anime.genres").Where("genre_name = ?", genre.Name).First(&genreRecord)

					// Tür bulunamadıysa oluştur
					if genreResult.Error != nil {
						log.Printf("Yeni tür oluşturuluyor: %s", genre.Name)
						genreRecord = models.Genre{
							GenreName: genre.Name,
						}
						createResult := db.Table("anime.genres").Create(&genreRecord)
						if createResult.Error != nil {
							log.Printf("Tür oluşturulamadı: %s, Hata: %v", genre.Name, createResult.Error)
							continue
						}
					}

					// Anime-Genre ilişkisini oluştur
					animeGenre := models.AnimesGenres{
						AnimeID: int(anime.ID),
						GenreID: int(genreRecord.ID),
					}
					createResult := db.Table("anime.animes_genres").Create(&animeGenre)
					if createResult.Error != nil {
						log.Printf("Anime-Genre ilişkisi oluşturulamadı: %s - %s, Hata: %v", anime.Name, genre.Name, createResult.Error)
					} else {
						log.Printf("Anime-Genre ilişkisi oluşturuldu: %s - %s", anime.Name, genre.Name)
					}
				}
			}

			// Cover
			if anime.Cover == "" && foundAnime.Images.Jpg.ImageUrl != "" {
				updates["cover"] = foundAnime.Images.Jpg.ImageUrl
				log.Printf("Cover güncellenecek: %s", foundAnime.Images.Jpg.ImageUrl)
			} else if anime.Cover == "" && foundAnime.Images.Jpg.LargeImageUrl != "" {
				updates["cover"] = foundAnime.Images.Jpg.LargeImageUrl
				log.Printf("Cover (large) güncellenecek: %s", foundAnime.Images.Jpg.LargeImageUrl)
			} else if anime.Cover == "" && foundAnime.Images.Webp.ImageUrl != "" {
				updates["cover"] = foundAnime.Images.Webp.ImageUrl
				log.Printf("Cover (webp) güncellenecek: %s", foundAnime.Images.Webp.ImageUrl)
			}

			// Series (Relations) - Jikan API'den ilişkili animeleri al
			if anime.Series == 0 && foundAnime.MalId > 0 {
				// Rate limit'i aşmamak için bir gecikme ekle
				log.Printf("Relations için rate limit'i aşmamak için 4 saniye bekleniyor...")
				time.Sleep(4 * time.Second)

				// Anime ID'sini kullanarak ilişkili animeleri al
				animeRelations, err := jikan.GetAnimeRelations(foundAnime.MalId)
				if err != nil {
					log.Printf("İlişkili animeler alınamadı: %s, Hata: %v", anime.Name, err)
				} else if animeRelations != nil && len(animeRelations.Data) > 0 {
					var seriesName string

					// İlişkili animeler arasında "Sequel", "Prequel", "Parent story", "Side story", "Alternative version" gibi ilişkileri ara
					// Önce "Parent story" ilişkisini kontrol et (ana seri)
					for _, relation := range animeRelations.Data {
						if relation.Relation == "Parent story" && len(relation.Entry) > 0 {
							// Parent story bulundu, bu animenin ait olduğu seridir
							for _, entry := range relation.Entry {
								if entry.Type == "anime" {
									seriesName = entry.Name
									log.Printf("Parent story bulundu: %s", seriesName)
									break
								}
							}
							if seriesName != "" {
								break
							}
						}
					}

					// Parent story bulunamadıysa, "Alternative setting" veya "Alternative version" ilişkilerini kontrol et
					if seriesName == "" {
						for _, relation := range animeRelations.Data {
							if (relation.Relation == "Alternative setting" || relation.Relation == "Alternative version") && len(relation.Entry) > 0 {
								for _, entry := range relation.Entry {
									if entry.Type == "anime" {
										seriesName = entry.Name
										log.Printf("Alternative setting/version bulundu: %s", seriesName)
										break
									}
								}
								if seriesName != "" {
									break
								}
							}
						}
					}

					// Hala bulunamadıysa, "Sequel" veya "Prequel" ilişkilerini kontrol et
					if seriesName == "" {
						for _, relation := range animeRelations.Data {
							if (relation.Relation == "Sequel" || relation.Relation == "Prequel") && len(relation.Entry) > 0 {
								for _, entry := range relation.Entry {
									if entry.Type == "anime" {
										// Bu durumda, ilişkili animenin adını alıp, seri adını çıkarmaya çalışalım
										// Örneğin "3D Kanojo: Real Girl 2nd Season" -> "3D Kanojo"
										relatedName := entry.Name
										// Seri adını çıkarmak için basit bir yaklaşım: "Season", "2nd", "3rd" gibi ifadeleri ara
										parts := strings.Split(relatedName, ":")
										if len(parts) > 0 {
											seriesName = strings.TrimSpace(parts[0])
										} else {
											// Başka bir yaklaşım: "Season", "2nd", "3rd" gibi ifadeleri kaldır
											seriesName = strings.ReplaceAll(relatedName, "Season", "")
											seriesName = strings.ReplaceAll(seriesName, "2nd", "")
											seriesName = strings.ReplaceAll(seriesName, "3rd", "")
											seriesName = strings.ReplaceAll(seriesName, "4th", "")
											seriesName = strings.TrimSpace(seriesName)
										}
										log.Printf("Sequel/Prequel ilişkisinden seri adı çıkarıldı: %s -> %s", relatedName, seriesName)
										break
									}
								}
								if seriesName != "" {
									break
								}
							}
						}
					}

					// Seri adı bulunabildiyse güncelle
					if seriesName != "" {
						// Seri adını kullanarak seri ID'sini bul veya oluştur
						var seriesRecord models.Series
						seriesResult := db.Table("anime.anime_series").Where("name = ?", seriesName).First(&seriesRecord)

						if seriesResult.Error != nil {
							// Seri bulunamadıysa oluştur
							log.Printf("Yeni seri oluşturuluyor: %s", seriesName)
							seriesRecord = models.Series{
								Name: seriesName,
							}
							createResult := db.Table("anime.anime_series").Create(&seriesRecord)
							if createResult.Error != nil {
								log.Printf("Seri oluşturulamadı: %s, Hata: %v", seriesName, createResult.Error)
							} else {
								log.Printf("Yeni seri oluşturuldu: %s (ID: %d)", seriesName, seriesRecord.ID)
								updates["series"] = seriesRecord.ID
							}
						} else {
							// Seri bulundu, ID'sini kullan
							log.Printf("Mevcut seri bulundu: %s (ID: %d)", seriesName, seriesRecord.ID)
							updates["series"] = seriesRecord.ID
						}
					}
				}
			}

			// Veritabanını güncelle
			if len(updates) > 0 || genreUpdated {
				if len(updates) > 0 {
					log.Printf("Anime güncellenecek: %s, Güncellemeler: %v", anime.Name, updates)
					updateResult := db.Table("anime.animes").Where("id = ?", anime.ID).Updates(updates)
					if updateResult.Error != nil {
						log.Printf("Anime güncellenemedi: %s, Hata: %v", anime.Name, updateResult.Error)
						response.Failed++
						response.Errors = append(response.Errors, fmt.Sprintf("Anime güncellenemedi: %s, Hata: %v", anime.Name, updateResult.Error.Error()))
						continue
					}
					log.Printf("Anime güncellendi (updates): %s (ID: %d), Etkilenen satır: %d", anime.Name, anime.ID, updateResult.RowsAffected)
				}

				if genreUpdated {
					log.Printf("Anime türleri güncellendi: %s (ID: %d)", anime.Name, anime.ID)
				}

				response.Updated++
			} else {
				log.Printf("Anime için güncellenecek veri bulunamadı: %s (ID: %d)", anime.Name, anime.ID)
				// Burada hata olarak eklemeyelim, sadece log olarak kaydedelim
			}
		}

		response.Success = true
		response.Message = fmt.Sprintf("Toplam %d anime güncellendi, %d anime güncellenemedi (limit: %d)", response.Updated, response.Failed, limit)
		json.NewEncoder(w).Encode(response)
	}
}
