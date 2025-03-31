package main

import (
	"encoding/json"
	"fmt"
	anime_functions "local-db-app/functions"
	"local-db-app/middleware"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"github.com/rs/cors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/gorilla/mux"
)

type spaHandler struct {
	staticPath string
	indexPath  string
}

const (
	host     = ""
	portDb   = 0
	user     = ""
	password = ""
	dbname   = ""
)

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path, err := filepath.Abs(".")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	path = filepath.Join(path, h.staticPath, r.URL.Path)
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

type UpdateEpisodeRequest struct {
	Name        string `json:"name"`
	WatchStatus int    `json:"watchStatus"`
}

func updateAnimeEpisode(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req UpdateEpisodeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		var anime struct {
			ID          uint   `json:"id" gorm:"primaryKey"`
			Name        string `json:"name"`
			WatchStatus int    `json:"watchStatus"`
		}

		// Başlığı temizle ve bölüm numarasını çıkar
		cleanTitle := strings.TrimSpace(req.Name)
		cleanTitle = strings.ReplaceAll(cleanTitle, "  ", " ")

		// Bölüm numarasını çıkar
		episode := 0
		if strings.Contains(cleanTitle, "Bölüm") {
			parts := strings.Split(cleanTitle, "Bölüm")
			if len(parts) > 1 {
				episodeStr := strings.TrimSpace(parts[1])
				episodeStr = strings.Split(episodeStr, " ")[0] // Sadece sayıyı al
				episodeStr = strings.Trim(episodeStr, ".")
				if ep, err := strconv.Atoi(episodeStr); err == nil {
					episode = ep
				}
			}
			// Bölüm kısmını başlıktan çıkar
			cleanTitle = strings.TrimSpace(parts[0])
		}

		// Önce tam eşleşme ara
		result := db.Table("anime.animes").Where("LOWER(name) = LOWER(?)", cleanTitle).First(&anime)
		if result.Error != nil {
			// Tam eşleşme bulunamazsa, başlığın başlangıcını içeren anime'yi ara
			result = db.Table("anime.animes").Where("LOWER(name) LIKE LOWER(?)", cleanTitle+"%").First(&anime)
			if result.Error != nil {
				http.Error(w, "Anime bulunamadı", http.StatusNotFound)
				return
			}
		}

		// Eğer bölüm numarası bulunduysa, onu kullan
		if episode > 0 {
			anime.WatchStatus = episode
		} else {
			anime.WatchStatus = req.WatchStatus
		}

		if err := db.Table("anime.animes").Save(&anime).Error; err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(anime)
	}
}

func main() {
	// Uygulama başladığında senkronizasyon durumunu sıfırla
	anime_functions.ResetSyncState()

	err := godotenv.Load()
	if err != nil {
		log.Printf(".env dosyası yüklenemedi: %v\n", err)
		// Alternatif konumları deneyelim
		alternativePaths := []string{
			"./.env",
			"../.env",
			"../../.env",
			"/app/.env", // Docker için
		}

		for _, path := range alternativePaths {
			if err := godotenv.Load(path); err == nil {
				log.Printf(".env dosyası başarıyla yüklendi: %s\n", path)
				break
			}
		}
	}

	env := os.Getenv("ENV")
	log.Println("env", env)
	certFile := ""
	keyFile := ""
	if env == "development" {
		err := godotenv.Load()
		if err != nil {
			log.Fatal("Error loading .env file")
		}
		certFile = "./server.crt"
		keyFile = "./server.key"
	} else {
		certFile = "/etc/ssl/certs/server.crt"
		keyFile = "/etc/ssl/certs/server.key"
	}
	host := os.Getenv("DB_HOST")
	portDb := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")

	dbport, err := strconv.Atoi(portDb)
	if err != nil {
		log.Fatalf("Invalid port number: %v", err)
	}

	router := mux.NewRouter()

	// CORS ayarları
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*", "moz-extension://*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization"},
		Debug:          false,
	})

	// Router'a CORS middleware'ini ekle
	handler := c.Handler(router)

	dsn := fmt.Sprintf("host='%s' port=%d user='%s' password=%s dbname='%s' sslmode=disable", host, dbport, user, password, dbname)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		PrepareStmt: true, // SQL ifadelerini önbelleğe al
	})
	if err != nil {
		panic("Veritabanına bağlanılamadı: " + err.Error())
	}

	// Veritabanı bağlantı havuzu ayarları
	sqlDB, err := db.DB()
	if err != nil {
		panic("Veritabanı bağlantı havuzu oluşturulamadı: " + err.Error())
	}

	// Bağlantı havuzu ayarları
	sqlDB.SetMaxIdleConns(10)           // Boşta bekleyen maksimum bağlantı sayısı
	sqlDB.SetMaxOpenConns(100)          // Maksimum açık bağlantı sayısı
	sqlDB.SetConnMaxLifetime(time.Hour) // Bağlantı maksimum yaşam süresi

	defer func() {
		if err := sqlDB.Close(); err != nil {
			log.Printf("Veritabanı bağlantısı kapatılırken hata: %v", err)
		}
	}()

	// Veritabanı başlangıç işlemlerini gerçekleştir
	if err := InitializeDatabase(db); err != nil {
		log.Printf("Veritabanı başlangıç işlemleri sırasında hata: %v", err)
	}

	port := os.Getenv("PORT")

	// API rotaları
	router.HandleFunc("/getAnimeTable", anime_functions.GetAnimeTableData(db))
	router.HandleFunc("/getGenres", anime_functions.GetGenres(db))
	router.HandleFunc("/getSeries", anime_functions.GetSeries(db))
	router.HandleFunc("/updateAnimeTable", anime_functions.UpdateAnimeTableData(db))
	router.HandleFunc("/createAnime", anime_functions.CreateAnimeTableData(db))
	router.HandleFunc("/deleteAnime", anime_functions.DeleteAnimeTableData(db))
	router.HandleFunc("/createAnimeWithFile", anime_functions.CreateAnimeTableDataWithFile(db))
	router.HandleFunc("/api/anime/update-episode", updateAnimeEpisode(db))
	router.HandleFunc("/updateFinishedAnimeStatus", anime_functions.UpdateFinishedAnimeStatus(db))

	// Senkronizasyon API ucu
	router.HandleFunc("/syncAnimeData", anime_functions.SyncAnimeData(db))
	router.HandleFunc("/cancelSync", anime_functions.CancelSync())
	// Senkronizasyon durumunu sıfırlamak için yeni endpoint
	router.HandleFunc("/resetSyncState", func(w http.ResponseWriter, r *http.Request) {
		anime_functions.ResetSyncState()
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"success": true, "message": "Senkronizasyon durumu sıfırlandı"}`))
	})

	// MAL API uçları
	router.HandleFunc("/getAnime", anime_functions.GetAnimeHandler)
	router.HandleFunc("/getManga", anime_functions.GetMangaHandler)
	// ID'ye göre anime getirme
	router.HandleFunc("/getAnimeById", anime_functions.GetAnimeById(db)).Methods("GET", "OPTIONS")

	// Kullanıcı API uçları
	router.HandleFunc("/auth/register", anime_functions.Register(db))
	router.HandleFunc("/auth/login", anime_functions.Login(db))

	// Watch List API uçları
	router.HandleFunc("/watchlist", anime_functions.GetWatchList(db)).Methods("GET", "OPTIONS")
	router.HandleFunc("/watchlist", anime_functions.AddToWatchList(db)).Methods("POST", "OPTIONS")
	router.HandleFunc("/watchlist/order", anime_functions.UpdateWatchListOrder(db)).Methods("PUT", "OPTIONS")
	router.HandleFunc("/watchlist", anime_functions.RemoveFromWatchList(db)).Methods("DELETE", "OPTIONS")
	router.HandleFunc("/watchlist/sync", anime_functions.AutoSyncPlanToWatch(db)).Methods("POST", "OPTIONS")
	router.HandleFunc("/test-plan-to-watch", anime_functions.TestPlanToWatch(db)).Methods("GET", "OPTIONS")

	// Korumalı rotalar için bir alt router oluştur
	authRouter := router.PathPrefix("/auth").Subrouter()
	authRouter.Use(middleware.AuthMiddleware)

	// Korumalı kullanıcı rotaları
	authRouter.HandleFunc("/profile", anime_functions.GetProfile(db)).Methods("GET", "OPTIONS")
	authRouter.HandleFunc("/profile", anime_functions.UpdateProfile(db)).Methods("PUT", "OPTIONS")

	// Admin rotaları için bir alt router oluştur
	adminRouter := router.PathPrefix("/admin").Subrouter()
	adminRouter.Use(middleware.AuthMiddleware, middleware.AdminMiddleware)

	// Admin rotaları buraya eklenecek

	router.HandleFunc("/healthcheck",
		func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("It's dangerous to go alone, take this sword with you..."))
		})

	spa := spaHandler{staticPath: "frontend/build", indexPath: "index.html"}
	router.PathPrefix("/").Handler(spa)

	srv := &http.Server{
		Handler: handler,
		Addr:    ":" + port,
	}

	log.Println("Server starting at port " + port)
	log.Fatal(srv.ListenAndServeTLS(certFile, keyFile))
}
