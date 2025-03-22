package functions

import (
	"encoding/json"
	"local-db-app/models"
	"log"
	"net/http"
	"strconv"

	"gorm.io/gorm"
)

// GetWatchList returns all animes in the watch list
func GetWatchList(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var watchList []models.WatchList

		// Log başlangıç mesajı
		log.Println("GetWatchList fonksiyonu çağrıldı")

		// Anime verileriyle birlikte watch_list tablosundan tüm kayıtları çek, sıralamaya göre sırala
		result := db.Preload("Anime").Order("order_rank asc").Find(&watchList)
		if result.Error != nil {
			log.Printf("GetWatchList hata: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": result.Error.Error()})
			return
		}

		// Log ne kadar veri döndüğünü
		log.Printf("GetWatchList %d kayıt buldu", len(watchList))

		// Her bir kayıt için detayları logla
		for i, item := range watchList {
			log.Printf("Kayıt %d: ID=%d, AnimeID=%d, OrderRank=%d, AnimeName=%s",
				i+1, item.ID, item.AnimeID, item.OrderRank, item.Anime.Name)
		}

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		json.NewEncoder(w).Encode(watchList)
	}
}

// AddToWatchList adds an anime to the watch list or updates its order if it already exists
func AddToWatchList(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// CORS başlıklarını ekle
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// OPTIONS isteğine yanıt ver
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Println("AddToWatchList fonksiyonu çağrıldı")

		var requestBody struct {
			AnimeID uint `json:"anime_id"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			log.Printf("İstek gövdesi çözümlenirken hata: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
			return
		}

		log.Printf("İstek alındı: AnimeID=%d", requestBody.AnimeID)

		// Anime ID var mı kontrol et
		var anime models.Anime
		if result := db.First(&anime, requestBody.AnimeID); result.Error != nil {
			log.Printf("Anime bulunamadı: %v", result.Error)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Anime not found"})
			return
		}

		log.Printf("Anime bulundu: Name=%s", anime.Name)

		// Watch list'te zaten var mı kontrol et
		var existingEntry models.WatchList
		result := db.Where("anime_id = ?", requestBody.AnimeID).First(&existingEntry)
		if result.Error == nil {
			// Zaten var, bilgiyi döndür
			log.Printf("Anime zaten watch list'te: ID=%d", existingEntry.ID)

			// Güncel veriyi yükle
			db.Preload("Anime").First(&existingEntry, existingEntry.ID)

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message": "Anime already exists in watch list",
				"data":    existingEntry,
			})
			return
		}

		// Yeni sıra numarası için son sıradakini bul
		var lastOrder models.WatchList
		db.Order("order_rank desc").First(&lastOrder)
		newOrder := 1
		if lastOrder.ID != 0 {
			newOrder = lastOrder.OrderRank + 1
		}

		log.Printf("Yeni sıra numarası: %d", newOrder)

		// Yeni kayıt oluştur
		watchListEntry := models.WatchList{
			AnimeID:   requestBody.AnimeID,
			OrderRank: newOrder,
		}

		if result := db.Create(&watchListEntry); result.Error != nil {
			log.Printf("Watch List kaydı oluşturulurken hata: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": result.Error.Error()})
			return
		}

		log.Printf("Watch List kaydı oluşturuldu: ID=%d", watchListEntry.ID)

		// Eklenen animeyi "plan_to_watch" olarak işaretle
		updateResult := db.Table("anime.animes").Where("id = ?", requestBody.AnimeID).Update("plan_to_watch", true)
		if updateResult.Error != nil {
			log.Printf("plan_to_watch güncellenirken hata: %v", updateResult.Error)
		}

		// Veriyi döndür
		db.Preload("Anime").First(&watchListEntry, watchListEntry.ID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Anime added to watch list successfully",
			"data":    watchListEntry,
		})
	}
}

// UpdateWatchListOrder updates the order of an anime in the watch list
func UpdateWatchListOrder(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// CORS başlıklarını ekle
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// OPTIONS isteğine yanıt ver
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Println("UpdateWatchListOrder fonksiyonu çağrıldı")

		var requestBody struct {
			ID        uint `json:"id"`
			OrderRank int  `json:"order_rank"`
		}

		if err := json.NewDecoder(r.Body).Decode(&requestBody); err != nil {
			log.Printf("İstek gövdesi çözümlenirken hata: %v", err)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request body"})
			return
		}

		log.Printf("İstek alındı: ID=%d, OrderRank=%d", requestBody.ID, requestBody.OrderRank)

		// Kayıt var mı kontrol et
		var watchListEntry models.WatchList
		if result := db.First(&watchListEntry, requestBody.ID); result.Error != nil {
			log.Printf("Watch list kaydı bulunamadı: %v", result.Error)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Watch list entry not found"})
			return
		}

		log.Printf("Watch List kaydı bulundu: ID=%d, AnimeID=%d, Eski OrderRank=%d",
			watchListEntry.ID, watchListEntry.AnimeID, watchListEntry.OrderRank)

		// Sıralamayı güncelle
		if result := db.Model(&watchListEntry).Update("order_rank", requestBody.OrderRank); result.Error != nil {
			log.Printf("Watch List sıralaması güncellenirken hata: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": result.Error.Error()})
			return
		}

		log.Printf("Watch List sıralaması güncellendi: ID=%d, Yeni OrderRank=%d",
			watchListEntry.ID, requestBody.OrderRank)

		// Güncel veriyi döndür
		db.Preload("Anime").First(&watchListEntry, watchListEntry.ID)
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Watch list order updated successfully",
			"data":    watchListEntry,
		})
	}
}

// RemoveFromWatchList removes an anime from the watch list
func RemoveFromWatchList(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// CORS başlıklarını ekle
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// OPTIONS isteğine yanıt ver
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Println("RemoveFromWatchList fonksiyonu çağrıldı")

		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			log.Printf("Geçersiz ID: %s", idStr)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid ID"})
			return
		}

		log.Printf("Kaldırılacak Watch List kaydı ID: %d", id)

		// Kayıt var mı kontrol et
		var watchListEntry models.WatchList
		if result := db.First(&watchListEntry, id); result.Error != nil {
			log.Printf("Watch list kaydı bulunamadı: %v", result.Error)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Watch list entry not found"})
			return
		}

		// Anime ID'sini sakla, daha sonra plan_to_watch'ı güncellemek için kullanacağız
		animeID := watchListEntry.AnimeID
		log.Printf("Bulunan Watch List kaydı: ID=%d, AnimeID=%d", watchListEntry.ID, animeID)

		// Eğer anime başka bir watch list kaydına sahip değilse plan_to_watch'ı false yap
		var countBefore int64
		countBeforeResult := db.Model(&models.WatchList{}).Where("anime_id = ?", animeID).Count(&countBefore)
		if countBeforeResult.Error != nil {
			log.Printf("Silme öncesi Watch List kayıtları sayılırken hata: %v", countBeforeResult.Error)
		}
		log.Printf("SİLME ÖNCESİ -> Anime ID %d için watchlist kayıt sayısı: %d", animeID, countBefore)

		// Kaydı sil
		if result := db.Delete(&watchListEntry); result.Error != nil {
			log.Printf("Watch list kaydı silinemedi: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": result.Error.Error()})
			return
		}
		log.Printf("Watch list kaydı silindi: ID=%d", id)

		// Silme işleminden sonra tekrar kaç kayıt kaldığını kontrol et
		var countAfter int64
		countAfterResult := db.Model(&models.WatchList{}).Where("anime_id = ?", animeID).Count(&countAfter)
		if countAfterResult.Error != nil {
			log.Printf("Silme sonrası Watch List kayıtları sayılırken hata: %v", countAfterResult.Error)
		}
		log.Printf("SİLME SONRASI -> Anime ID %d için watchlist kayıt sayısı: %d", animeID, countAfter)

		// Sorgulama işlemlerini açıkça göster
		log.Printf("SQL Sorgusu: SELECT count(*) FROM anime.watch_lists WHERE anime_id = %d", animeID)

		if countAfter == 0 {
			// Başka kayıt yoksa, plan_to_watch'ı false yap
			log.Printf("Anime plan_to_watch güncellemesi yapılıyor: AnimeID=%d, Value=false", animeID)

			// Doğrudan SQL sorgusu ile güncelleme yapalım ve sonucu kontrol edelim
			rawSqlResult := db.Exec("UPDATE anime.animes SET plan_to_watch = false WHERE id = ?", animeID)
			if rawSqlResult.Error != nil {
				log.Printf("Raw SQL güncelleme hatası: %v", rawSqlResult.Error)
			} else {
				log.Printf("Raw SQL güncelleme sonucu: Etkilenen satır=%d", rawSqlResult.RowsAffected)
			}

			// Ardından GORM ile güncelleme yapalım
			updateResult := db.Table("anime.animes").Where("id = ?", animeID).Update("plan_to_watch", false)
			if updateResult.Error != nil {
				log.Printf("plan_to_watch güncellenirken hata: %v", updateResult.Error)
			} else {
				log.Printf("Anime plan_to_watch false olarak güncellendi: AnimeID=%d, Etkilenen Satır Sayısı=%d", animeID, updateResult.RowsAffected)

				// Transaction kullanarak daha güvenli bir güncelleme deneyelim
				txErr := db.Transaction(func(tx *gorm.DB) error {
					// Önce kaydı sorgulayalım
					var animeCheck models.Anime
					if err := tx.Table("anime.animes").Where("id = ?", animeID).First(&animeCheck).Error; err != nil {
						return err
					}

					// Sonra güncelleyelim
					if err := tx.Model(&animeCheck).Update("plan_to_watch", false).Error; err != nil {
						return err
					}

					log.Printf("Transaction içinde anime güncellendi: ID=%d, NewValue=%v", animeCheck.ID, false)
					return nil
				})

				if txErr != nil {
					log.Printf("Transaction hatası: %v", txErr)
				}

				// Anime tablosunu kontrol et
				var animeCheck models.Anime
				checkResult := db.Table("anime.animes").Where("id = ?", animeID).First(&animeCheck)
				if checkResult.Error != nil {
					log.Printf("Anime kontrolü yapılırken hata: %v", checkResult.Error)
				} else {
					log.Printf("Güncelleme sonrası anime durumu: ID=%d, Name=%s, PlanToWatch=%v",
						animeCheck.ID, animeCheck.Name, animeCheck.PlanToWatch)
				}
			}
		} else {
			log.Printf("Hala %d adet watch list kaydı var, plan_to_watch güncellenmeyecek.", countAfter)
		}

		// Başarılı yanıt döndür
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message":  "Watch list entry removed successfully",
			"id":       id,
			"anime_id": animeID,
		})
	}
}

// AutoSyncPlanToWatch automatically syncs plan_to_watch animes with the watch list
func AutoSyncPlanToWatch(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// CORS başlıklarını ekle
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// OPTIONS isteğine yanıt ver
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Println("AutoSyncPlanToWatch fonksiyonu çağrıldı")

		// plan_to_watch=true olan tüm animeleri al
		var animes []models.Anime
		if result := db.Table("anime.animes").Where("plan_to_watch = true").Find(&animes); result.Error != nil {
			log.Printf("Plan to watch animeleri alınırken hata: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": result.Error.Error()})
			return
		}

		log.Printf("%d adet plan_to_watch=true olan anime bulundu", len(animes))

		// Mevcut watch list kayıtlarını al
		var watchList []models.WatchList
		if result := db.Find(&watchList); result.Error != nil {
			log.Printf("Watch list kayıtları alınırken hata: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": result.Error.Error()})
			return
		}

		log.Printf("%d adet mevcut watch list kaydı bulundu", len(watchList))

		// Watch List'te olmayan plan_to_watch=true animeleri ekle
		var added int
		for _, anime := range animes {
			exists := false
			for _, entry := range watchList {
				if entry.AnimeID == anime.ID {
					exists = true
					break
				}
			}

			if !exists {
				// Yeni sıra numarası için son sıradakini bul
				var lastOrder models.WatchList
				db.Order("order_rank desc").First(&lastOrder)
				newOrder := 1
				if lastOrder.ID != 0 {
					newOrder = lastOrder.OrderRank + 1
				}

				log.Printf("Yeni watch list kaydı oluşturuluyor: AnimeID=%d, Name=%s, OrderRank=%d",
					anime.ID, anime.Name, newOrder)

				// Yeni kayıt oluştur
				watchListEntry := models.WatchList{
					AnimeID:   anime.ID,
					OrderRank: newOrder,
				}

				if result := db.Create(&watchListEntry); result.Error != nil {
					log.Printf("Watch list kaydı oluşturulurken hata: AnimeID=%d, Error=%v",
						anime.ID, result.Error)
					continue
				}
				added++
			}
		}

		log.Printf("Senkronizasyon tamamlandı, %d adet yeni kayıt eklendi", added)

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Auto sync completed successfully",
			"added":   added,
			"total":   len(watchList) + added,
		})
	}
}

// TestPlanToWatch tests updating plan_to_watch field
func TestPlanToWatch(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// CORS başlıklarını ekle
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// OPTIONS isteğine yanıt ver
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		log.Println("TestPlanToWatch fonksiyonu çağrıldı")

		// URL'den anime ID'sini al
		idStr := r.URL.Query().Get("id")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			log.Printf("Geçersiz ID: %s", idStr)
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Invalid ID"})
			return
		}

		// Tablo, sütun ve alan isimlerini logla
		var tables []string
		db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'anime'").Pluck("table_name", &tables)
		log.Printf("Anime şemasındaki tablolar: %v", tables)

		var columns []string
		db.Raw("SELECT column_name FROM information_schema.columns WHERE table_schema = 'anime' AND table_name = 'animes'").Pluck("column_name", &columns)
		log.Printf("Anime tablosundaki sütunlar: %v", columns)

		// Anime kaydını al
		var anime models.Anime
		findResult := db.Table("anime.animes").Where("id = ?", id).First(&anime)
		if findResult.Error != nil {
			log.Printf("Anime bulunamadı: %v", findResult.Error)
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]string{"error": "Anime not found"})
			return
		}

		log.Printf("Test öncesi anime durumu: ID=%d, Name=%s, PlanToWatch=%v",
			anime.ID, anime.Name, anime.PlanToWatch)

		// Doğrudan SQL sorgusuyla plan_to_watch değerini false yap
		rawSqlResult := db.Exec("UPDATE anime.animes SET plan_to_watch = false WHERE id = ?", id)
		if rawSqlResult.Error != nil {
			log.Printf("Raw SQL ile güncelleme hatası: %v", rawSqlResult.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": rawSqlResult.Error.Error()})
			return
		}

		log.Printf("Raw SQL güncelleme sonucu: Etkilenen satır=%d", rawSqlResult.RowsAffected)

		// GORM ile güncelleme dene
		gormResult := db.Table("anime.animes").Where("id = ?", id).Update("plan_to_watch", false)
		if gormResult.Error != nil {
			log.Printf("GORM ile güncelleme hatası: %v", gormResult.Error)
		} else {
			log.Printf("GORM güncelleme sonucu: Etkilenen satır=%d", gormResult.RowsAffected)
		}

		// Farklı sütun isimleri deneme
		gormResult2 := db.Table("anime.animes").Where("id = ?", id).Update("PlanToWatch", false)
		if gormResult2.Error != nil {
			log.Printf("PlanToWatch sütunu ile güncelleme hatası: %v", gormResult2.Error)
		} else {
			log.Printf("PlanToWatch güncelleme sonucu: Etkilenen satır=%d", gormResult2.RowsAffected)
		}

		// Yeniden anime kaydını kontrol et
		var animeAfter models.Anime
		afterResult := db.Table("anime.animes").Where("id = ?", id).First(&animeAfter)
		if afterResult.Error != nil {
			log.Printf("Anime kontrolü yapılırken hata: %v", afterResult.Error)
		} else {
			log.Printf("Güncelleme sonrası anime durumu: ID=%d, Name=%s, PlanToWatch=%v",
				animeAfter.ID, animeAfter.Name, animeAfter.PlanToWatch)
		}

		// Sonuçları döndür
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Test completed",
			"before": map[string]interface{}{
				"id":            anime.ID,
				"name":          anime.Name,
				"plan_to_watch": anime.PlanToWatch,
			},
			"after": map[string]interface{}{
				"id":            animeAfter.ID,
				"name":          animeAfter.Name,
				"plan_to_watch": animeAfter.PlanToWatch,
			},
			"sql_rows_affected":   rawSqlResult.RowsAffected,
			"gorm_rows_affected":  gormResult.RowsAffected,
			"gorm2_rows_affected": gormResult2.RowsAffected,
		})
	}
}
