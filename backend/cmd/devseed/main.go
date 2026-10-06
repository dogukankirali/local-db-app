// devseed, lokal geliştirme veritabanını kaynak bir API'deki (varsayılan: prod) verilerle doldurur.
// ID'ler korunur, böylece watchlist ve seri ilişkileri bozulmaz.
//
// Kullanım (backend klasöründen):
//
//	go run ./cmd/devseed -source https://<api-host>
//
// Yalnızca ENV=development iken çalışır ve lokal anime tablolarını SİLİP yeniden doldurur.
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type sourceAnime struct {
	ID                    uint
	Name                  string
	AnimeStatus           string
	WatchStatus           int
	TotalNumberOfEpisodes int
	IsMovie               bool
	Genre                 string
	Score                 float32
	MALScore              float32
	Notes                 string
	AnimeLink             string
	MALAnimeLink          string
	Cover                 string
	Series                int
	PlanToWatch           bool
}

type sourceGenre struct {
	ID   uint   `json:"ID"`
	Name string `json:"name"`
}

type sourceSeries struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

type sourceWatch struct {
	ID        uint `json:"id"`
	AnimeID   uint `json:"anime_id"`
	OrderRank int  `json:"order_rank"`
}

var client = &http.Client{Timeout: 2 * time.Minute}

func fetch(method, url string, body []byte, out interface{}) {
	req, err := http.NewRequest(method, url, bytes.NewReader(body))
	if err != nil {
		log.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	res, err := client.Do(req)
	if err != nil {
		log.Fatalf("%s %s: %v", method, url, err)
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		log.Fatalf("%s %s: HTTP %d", method, url, res.StatusCode)
	}
	if err := json.NewDecoder(res.Body).Decode(out); err != nil {
		log.Fatalf("%s %s: decode: %v", method, url, err)
	}
}

func main() {
	source := flag.String("source", os.Getenv("SEED_SOURCE_URL"), "kaynak API adresi")
	flag.Parse()
	if *source == "" {
		log.Fatal("-source veya SEED_SOURCE_URL gerekli")
	}
	src := strings.TrimRight(*source, "/")

	_ = godotenv.Load()
	if os.Getenv("ENV") != "development" {
		log.Fatal("devseed yalnızca ENV=development iken çalışır")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Warn)})
	if err != nil {
		log.Fatalf("veritabanı: %v", err)
	}

	var genres []sourceGenre
	var series []sourceSeries
	var watch []sourceWatch
	var animes struct {
		Data []sourceAnime `json:"data"`
	}
	fetch("GET", src+"/getGenres", nil, &genres)
	fetch("GET", src+"/getSeries", nil, &series)
	fetch("POST", src+"/getAnimeTable?count=100000&page=1", []byte(`{"filterArray":[]}`), &animes)
	fetch("GET", src+"/watchlist", nil, &watch)
	log.Printf("kaynak: %d anime, %d tür, %d seri, %d watchlist", len(animes.Data), len(genres), len(series), len(watch))

	genreID := map[string]uint{}
	for _, g := range genres {
		genreID[g.Name] = g.ID
	}

	err = db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("TRUNCATE anime.watch_lists, anime.animes_genres, anime.animes, anime.genres, anime.anime_series RESTART IDENTITY CASCADE").Error; err != nil {
			return err
		}
		for _, g := range genres {
			if err := tx.Exec("INSERT INTO anime.genres (id, genre_name) VALUES (?, ?)", g.ID, g.Name).Error; err != nil {
				return err
			}
		}
		for _, s := range series {
			if err := tx.Exec("INSERT INTO anime.anime_series (id, name) VALUES (?, ?)", s.ID, s.Name).Error; err != nil {
				return err
			}
		}
		for _, a := range animes.Data {
			var seriesID interface{}
			if a.Series > 0 {
				seriesID = a.Series
			}
			if err := tx.Exec(`INSERT INTO anime.animes (id, name, anime_status, watch_status, total_number_of_episodes, is_movie,
				score, mal_score, notes, anime_link, mal_anime_link, cover, series, plan_to_watch)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				a.ID, a.Name, a.AnimeStatus, a.WatchStatus, a.TotalNumberOfEpisodes, a.IsMovie,
				a.Score, a.MALScore, a.Notes, a.AnimeLink, a.MALAnimeLink, a.Cover, seriesID, a.PlanToWatch).Error; err != nil {
				return err
			}
			for _, name := range strings.Split(a.Genre, ", ") {
				if id, ok := genreID[name]; ok {
					if err := tx.Exec("INSERT INTO anime.animes_genres (anime_id, genre_id) VALUES (?, ?) ON CONFLICT DO NOTHING", a.ID, id).Error; err != nil {
						return err
					}
				}
			}
		}
		for _, w := range watch {
			if err := tx.Exec("INSERT INTO anime.watch_lists (id, anime_id, order_rank) VALUES (?, ?, ?) ON CONFLICT DO NOTHING", w.ID, w.AnimeID, w.OrderRank).Error; err != nil {
				return err
			}
		}
		// Sequence'leri ID'lerin devamına ayarla
		for _, t := range []string{"anime.genres", "anime.anime_series", "anime.animes", "anime.watch_lists"} {
			if err := tx.Exec(fmt.Sprintf("SELECT setval(pg_get_serial_sequence('%s', 'id'), COALESCE((SELECT MAX(id) FROM %s), 0) + 1, false)", t, t)).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		log.Fatalf("seed başarısız: %v", err)
	}
	log.Println("seed tamamlandı")
}
