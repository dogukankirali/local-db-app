package functions

import (
	"encoding/json"
	"fmt"
	"local-db-app/migrations"
	"local-db-app/models"
	"log"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/darenliang/jikan-go"
	"gorm.io/gorm"
)

// Senkronizasyon işlemini iptal etmek için global değişkenler
var (
	syncCancelChan = make(chan struct{}, 1) // Buffered kanal olarak değiştirdim
	syncActive     = false
	syncMutex      sync.Mutex
)

// ResetSyncState, senkronizasyon durumunu sıfırlayan fonksiyon
func ResetSyncState() {
	syncMutex.Lock()
	defer syncMutex.Unlock()
	syncActive = false
	// Kanalı temizle
	select {
	case <-syncCancelChan:
		// Kanalı temizle
	default:
		// Kanal zaten boş
	}
	log.Println("Senkronizasyon durumu sıfırlandı")
}

// CancelSync, devam eden senkronizasyon işlemini iptal eden fonksiyon
func CancelSync() http.HandlerFunc {
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

		syncMutex.Lock()
		// Force parametresi varsa, durumu zorla sıfırla
		forceParam := r.URL.Query().Get("force")
		forceReset := forceParam == "true"

		if syncActive || forceReset {
			// İptal sinyali gönder
			select {
			case syncCancelChan <- struct{}{}:
				log.Println("Senkronizasyon iptal sinyali gönderildi")
			default:
				// Kanal dolu ise, zaten iptal sinyali gönderilmiş demektir
				log.Println("Senkronizasyon zaten iptal ediliyor")
			}

			// Force parametresi varsa, durumu zorla sıfırla
			if forceReset {
				syncActive = false
				log.Println("Senkronizasyon durumu zorla sıfırlandı (force=true)")
			}

			syncMutex.Unlock()
			w.Write([]byte(`{"success": true, "message": "Senkronizasyon iptal edildi"}`))
		} else {
			syncMutex.Unlock()
			w.Write([]byte(`{"success": false, "message": "Aktif senkronizasyon işlemi bulunamadı"}`))
		}
	}
}

// SyncAnimeData, veritabanındaki eksik anime bilgilerini Jikan API'si ile dolduran fonksiyon
func SyncAnimeData(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream") // SSE için content type
		w.Header().Set("Cache-Control", "no-cache")
		w.Header().Set("Connection", "keep-alive")
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

		// Senkronizasyon durumunu kontrol et
		syncMutex.Lock()
		if syncActive {
			syncMutex.Unlock()
			http.Error(w, "Başka bir senkronizasyon işlemi zaten çalışıyor", http.StatusConflict)
			return
		}

		// Yeni bir iptal kanalı oluştur
		// Kanalı temizle (varsa bekleyen sinyalleri tüket)
		select {
		case <-syncCancelChan:
			// Kanalı temizle
		default:
			// Kanal zaten boş
		}

		syncActive = true
		syncMutex.Unlock()

		// İşlem tamamlandığında senkronizasyon durumunu güncelle
		defer func() {
			syncMutex.Lock()
			syncActive = false
			syncMutex.Unlock()
			log.Println("Senkronizasyon durumu güncellendi: syncActive = false")
		}()

		// SSE için flusher
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "Streaming desteklenmiyor", http.StatusInternalServerError)
			return
		}

		// SSE mesajı gönderme fonksiyonu
		sendSSEMessage := func(eventType string, data interface{}) {
			dataJSON, err := json.Marshal(data)
			if err != nil {
				log.Printf("JSON marshal hatası: %v", err)
				return
			}
			fmt.Fprintf(w, "event: %s\ndata: %s\n\n", eventType, dataJSON)
			flusher.Flush()
		}

		// Yanıt yapısı
		type SyncResponse struct {
			Success   bool     `json:"success"`
			Message   string   `json:"message"`
			Updated   int      `json:"updated"`
			Failed    int      `json:"failed"`
			Errors    []string `json:"errors,omitempty"`
			Progress  float64  `json:"progress"`
			TotalWork int      `json:"totalWork"`
			Completed int      `json:"completed"`
		}

		response := SyncResponse{
			Success:   false,
			Message:   "",
			Updated:   0,
			Failed:    0,
			Errors:    []string{},
			Progress:  0,
			TotalWork: 0,
			Completed: 0,
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
			sendSSEMessage("error", response)
			return
		}

		totalAnimes := len(animes)
		log.Printf("Toplam %d anime kaydı bulundu", totalAnimes)

		// Toplam iş miktarını güncelle
		response.TotalWork = totalAnimes
		sendSSEMessage("start", response)

		if totalAnimes == 0 {
			response.Success = true
			response.Message = "Veritabanında anime kaydı bulunamadı"
			response.Progress = 100
			sendSSEMessage("complete", response)
			return
		}

		// Her bir anime için eksik bilgileri doldur
		for i, anime := range animes {
			// İptal edilip edilmediğini kontrol et
			select {
			case <-syncCancelChan:
				log.Println("Senkronizasyon kullanıcı tarafından iptal edildi")
				response.Success = false
				response.Message = "Senkronizasyon kullanıcı tarafından iptal edildi"
				sendSSEMessage("error", response)
				return
			default:
				// İptal edilmedi, devam et
			}

			// İlerleme durumunu güncelle
			response.Completed = i + 1
			response.Progress = float64(i+1) / float64(totalAnimes) * 100

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
				// İlerleme durumunu gönder
				response.Message = fmt.Sprintf("Anime güncel: %s (ID: %d)", anime.Name, anime.ID)
				sendSSEMessage("progress", response)
				continue
			}

			log.Printf("Anime işleniyor: %s (ID: %d), Eksik alanlar: %v", anime.Name, anime.ID, missingFields)
			log.Printf("Mevcut değerler: MALAnimeLink=%s, MALScore=%f, TotalNumberOfEpisodes=%d, AnimeStatus=%s, Cover=%s",
				anime.MALAnimeLink, anime.MALScore, anime.TotalNumberOfEpisodes, anime.AnimeStatus, anime.Cover)
			log.Printf("Genre: %s", anime.Genre)

			// İlerleme durumunu gönder
			response.Message = fmt.Sprintf("Anime işleniyor: %s (ID: %d), Eksik alanlar: %v", anime.Name, anime.ID, missingFields)
			sendSSEMessage("progress", response)

			// Jikan API'ye istek yapmadan önce bir gecikme ekle (rate limit'i aşmamak için)
			// Her istek için 4 saniye bekle (Jikan API rate limit'i aşmamak için)
			log.Printf("Rate limit'i aşmamak için 4 saniye bekleniyor...")

			// Sleep yerine timer ve select kullanarak iptal edilebilir bekleme
			select {
			case <-time.After(4 * time.Second):
				// Bekleme tamamlandı, devam et
			case <-syncCancelChan:
				// İptal sinyali alındı
				log.Println("Senkronizasyon kullanıcı tarafından iptal edildi (bekleme sırasında)")
				response.Success = false
				response.Message = "Senkronizasyon kullanıcı tarafından iptal edildi"
				sendSSEMessage("error", response)
				return
			}

			// Anime adını kullanarak Jikan API'de ara
			searchParams := url.Values{}
			searchParams.Set("q", anime.Name)
			searchParams.Set("limit", "5") // Daha fazla sonuç al

			log.Printf("Jikan API'ye istek gönderiliyor: %s", anime.Name)
			response.Message = fmt.Sprintf("Jikan API'ye istek gönderiliyor: %s", anime.Name)
			sendSSEMessage("progress", response)

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
				response.Message = fmt.Sprintf("Jikan API hatası (deneme %d/%d): %v", retry+1, maxRetries, err)
				sendSSEMessage("progress", response)

				if retry < maxRetries-1 {
					log.Printf("%s sonra tekrar denenecek...", retryDelay)
					response.Message = fmt.Sprintf("%s sonra tekrar denenecek...", retryDelay)
					sendSSEMessage("progress", response)

					// Sleep yerine timer ve select kullanarak iptal edilebilir bekleme
					select {
					case <-time.After(retryDelay):
						// Bekleme tamamlandı, devam et
					case <-syncCancelChan:
						// İptal sinyali alındı
						log.Println("Senkronizasyon kullanıcı tarafından iptal edildi (yeniden deneme beklemesi sırasında)")
						response.Success = false
						response.Message = "Senkronizasyon kullanıcı tarafından iptal edildi"
						sendSSEMessage("error", response)
						return
					}

					retryDelay *= 2 // Her denemede bekleme süresini iki katına çıkar (5s, 10s, 20s)
				}
			}

			if err != nil {
				log.Printf("Jikan API hatası (son): %v", err)
				response.Failed++
				response.Errors = append(response.Errors, fmt.Sprintf("Anime bulunamadı: %s, Hata: %v", anime.Name, err.Error()))
				response.Message = fmt.Sprintf("Jikan API hatası (son): %v", err)
				sendSSEMessage("progress", response)
				continue
			}

			if len(animeList.Data) == 0 {
				log.Printf("Anime bulunamadı: %s", anime.Name)
				response.Failed++
				response.Errors = append(response.Errors, fmt.Sprintf("Anime bulunamadı: %s", anime.Name))
				response.Message = fmt.Sprintf("Anime bulunamadı: %s", anime.Name)
				sendSSEMessage("progress", response)
				continue
			}

			log.Printf("Jikan API'den %d sonuç alındı", len(animeList.Data))
			response.Message = fmt.Sprintf("Jikan API'den %d sonuç alındı: %s", len(animeList.Data), anime.Name)
			sendSSEMessage("progress", response)

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
				response.Message = "Relations için rate limit'i aşmamak için bekleniyor..."
				sendSSEMessage("progress", response)

				// Sleep yerine timer ve select kullanarak iptal edilebilir bekleme
				select {
				case <-time.After(4 * time.Second):
					// Bekleme tamamlandı, devam et
				case <-syncCancelChan:
					// İptal sinyali alındı
					log.Println("Senkronizasyon kullanıcı tarafından iptal edildi (relations bekleme sırasında)")
					response.Success = false
					response.Message = "Senkronizasyon kullanıcı tarafından iptal edildi"
					sendSSEMessage("error", response)
					return
				}

				// Anime ID'sini kullanarak ilişkili animeleri al
				animeRelations, err := jikan.GetAnimeRelations(foundAnime.MalId)
				if err != nil {
					log.Printf("İlişkili animeler alınamadı: %s, Hata: %v", anime.Name, err)
					response.Message = fmt.Sprintf("İlişkili animeler alınamadı: %s, Hata: %v", anime.Name, err)
					sendSSEMessage("progress", response)
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
									response.Message = fmt.Sprintf("Parent story bulundu: %s", seriesName)
									sendSSEMessage("progress", response)
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
										response.Message = fmt.Sprintf("Alternative setting/version bulundu: %s", seriesName)
										sendSSEMessage("progress", response)
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
										response.Message = fmt.Sprintf("Sequel/Prequel ilişkisinden seri adı çıkarıldı: %s -> %s", relatedName, seriesName)
										sendSSEMessage("progress", response)
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
							response.Message = fmt.Sprintf("Yeni seri oluşturuluyor: %s", seriesName)
							sendSSEMessage("progress", response)

							seriesRecord = models.Series{
								Name: seriesName,
							}
							createResult := db.Table("anime.anime_series").Create(&seriesRecord)
							if createResult.Error != nil {
								log.Printf("Seri oluşturulamadı: %s, Hata: %v", seriesName, createResult.Error)
								response.Message = fmt.Sprintf("Seri oluşturulamadı: %s, Hata: %v", seriesName, createResult.Error)
								sendSSEMessage("progress", response)
							} else {
								log.Printf("Yeni seri oluşturuldu: %s (ID: %d)", seriesName, seriesRecord.ID)
								response.Message = fmt.Sprintf("Yeni seri oluşturuldu: %s (ID: %d)", seriesName, seriesRecord.ID)
								sendSSEMessage("progress", response)
								updates["series"] = seriesRecord.ID
							}
						} else {
							// Seri bulundu, ID'sini kullan
							log.Printf("Mevcut seri bulundu: %s (ID: %d)", seriesName, seriesRecord.ID)
							response.Message = fmt.Sprintf("Mevcut seri bulundu: %s (ID: %d)", seriesName, seriesRecord.ID)
							sendSSEMessage("progress", response)
							updates["series"] = seriesRecord.ID
						}
					}
				}
			}

			// Veritabanını güncelle
			if len(updates) > 0 || genreUpdated {
				if len(updates) > 0 {
					log.Printf("Anime güncellenecek: %s, Güncellemeler: %v", anime.Name, updates)
					response.Message = fmt.Sprintf("Anime güncellenecek: %s", anime.Name)
					sendSSEMessage("progress", response)

					updateResult := db.Table("anime.animes").Where("id = ?", anime.ID).Updates(updates)
					if updateResult.Error != nil {
						log.Printf("Anime güncellenemedi: %s, Hata: %v", anime.Name, updateResult.Error)
						response.Failed++
						response.Errors = append(response.Errors, fmt.Sprintf("Anime güncellenemedi: %s, Hata: %v", anime.Name, updateResult.Error.Error()))
						response.Message = fmt.Sprintf("Anime güncellenemedi: %s, Hata: %v", anime.Name, updateResult.Error)
						sendSSEMessage("progress", response)
						continue
					}
					log.Printf("Anime güncellendi (updates): %s (ID: %d), Etkilenen satır: %d", anime.Name, anime.ID, updateResult.RowsAffected)
					response.Message = fmt.Sprintf("Anime güncellendi: %s (ID: %d)", anime.Name, anime.ID)
					sendSSEMessage("progress", response)
				}

				if genreUpdated {
					log.Printf("Anime türleri güncellendi: %s (ID: %d)", anime.Name, anime.ID)
					response.Message = fmt.Sprintf("Anime türleri güncellendi: %s (ID: %d)", anime.Name, anime.ID)
					sendSSEMessage("progress", response)
				}

				response.Updated++
			} else {
				log.Printf("Anime için güncellenecek veri bulunamadı: %s (ID: %d)", anime.Name, anime.ID)
				response.Message = fmt.Sprintf("Anime için güncellenecek veri bulunamadı: %s (ID: %d)", anime.Name, anime.ID)
				sendSSEMessage("progress", response)
				// Burada hata olarak eklemeyelim, sadece log olarak kaydedelim
			}
		}

		response.Success = true
		response.Message = fmt.Sprintf("Toplam %d anime güncellendi, %d anime güncellenemedi (limit: %d)", response.Updated, response.Failed, limit)
		response.Progress = 100

		// URL'den fixSeries parametresini al - series düzeltme işlemini opsiyonel yap
		fixSeriesParam := r.URL.Query().Get("fixSeries")
		shouldFixSeries := fixSeriesParam == "true"

		if !shouldFixSeries {
			log.Println("Series düzeltme işlemi atlanıyor (fixSeries=true parametresi belirtilmedi)")
			response.Message = fmt.Sprintf("Toplam %d anime güncellendi, %d anime güncellenemedi. Series düzeltme işlemi atlandı.", response.Updated, response.Failed)
			sendSSEMessage("complete", response)
			return
		}

		// Senkronizasyon tamamlandıktan sonra series düzeltme işlemi çalıştır
		log.Println("Senkronizasyon tamamlandı, series düzeltme işlemi başlatılıyor...")
		response.Message = "Senkronizasyon tamamlandı, series düzeltme işlemi başlatılıyor..."
		sendSSEMessage("progress", response)

		// Series düzeltme işlemini çalıştır - timeout ekleyelim
		seriesDone := make(chan bool, 1)
		seriesError := make(chan error, 1)

		go func() {
			if err := migrations.FixSeriesData(db); err != nil {
				seriesError <- err
				return
			}
			seriesDone <- true
		}()

		// 30 saniye timeout ekleyelim
		select {
		case err := <-seriesError:
			log.Printf("Series veri düzeltme hatası: %v", err)
			response.Message = fmt.Sprintf("Series veri düzeltme hatası: %v", err)
			sendSSEMessage("progress", response)
		case <-seriesDone:
			log.Println("Series veri düzeltme işlemi tamamlandı")
			response.Message = "Series veri düzeltme işlemi tamamlandı"
			sendSSEMessage("progress", response)
		case <-time.After(30 * time.Second):
			log.Println("Series veri düzeltme işlemi zaman aşımına uğradı, devam ediliyor")
			response.Message = "Series veri düzeltme işlemi zaman aşımına uğradı, devam ediliyor"
			sendSSEMessage("progress", response)
		}

		// Seri verilerini temizle ve birleştir
		log.Println("Seri verilerini temizleme ve birleştirme işlemi başlatılıyor...")
		response.Message = "Seri verilerini temizleme ve birleştirme işlemi başlatılıyor..."
		sendSSEMessage("progress", response)

		// Cleanup işlemini de timeout ile çalıştıralım
		cleanupDone := make(chan bool, 1)
		cleanupError := make(chan error, 1)

		go func() {
			if err := migrations.CleanupAndMergeSeriesData(db); err != nil {
				cleanupError <- err
				return
			}
			cleanupDone <- true
		}()

		// 60 saniye timeout ekleyelim
		select {
		case err := <-cleanupError:
			log.Printf("Seri verilerini temizleme ve birleştirme hatası: %v", err)
			response.Message = fmt.Sprintf("Seri verilerini temizleme ve birleştirme hatası: %v", err)
			sendSSEMessage("progress", response)
		case <-cleanupDone:
			log.Println("Seri verilerini temizleme ve birleştirme işlemi tamamlandı")
			response.Message = "Seri verilerini temizleme ve birleştirme işlemi tamamlandı"
			sendSSEMessage("progress", response)
		case <-time.After(60 * time.Second):
			log.Println("Seri verilerini temizleme işlemi zaman aşımına uğradı")
			response.Message = "Seri verilerini temizleme işlemi zaman aşımına uğradı"
			sendSSEMessage("progress", response)
		}

		// İşlem tamamlandı mesajını gönder
		response.Message = fmt.Sprintf("Toplam %d anime güncellendi, %d anime güncellenemedi (limit: %d). Series düzeltme işlemi tamamlandı.", response.Updated, response.Failed, limit)
		sendSSEMessage("complete", response)
	}
}
