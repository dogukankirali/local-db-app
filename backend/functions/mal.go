package functions

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"

	"github.com/darenliang/jikan-go"
)

// AnimeResponse, anime API yanıtı için kullanılacak yapı
type AnimeResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Error   string      `json:"error,omitempty"`
}

// MangaResponse, manga API yanıtı için kullanılacak yapı
type MangaResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data"`
	Error   string      `json:"error,omitempty"`
}

// AnimeRelationEntry, anime ilişkisi girdisi için yapı
type AnimeRelationEntry struct {
	MalId int    `json:"mal_id"`
	Type  string `json:"type"`
	Name  string `json:"name"`
	Url   string `json:"url"`
}

// AnimeRelation, anime ilişkisi için yapı
type AnimeRelation struct {
	Relation string               `json:"relation"`
	Entry    []AnimeRelationEntry `json:"entry"`
}

// AnimeRelations, anime ilişkileri yanıtı için yapı
type AnimeRelations struct {
	Data []AnimeRelation `json:"data"`
}

// GetAnimeRelations, belirli bir anime ID'si için ilişkili animeleri getiren fonksiyon
func GetAnimeRelations(animeId int) (*AnimeRelations, error) {
	url := fmt.Sprintf("https://api.jikan.moe/v4/anime/%d/relations", animeId)

	// HTTP isteği gönder
	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("API isteği başarısız: %v", err)
	}
	defer resp.Body.Close()

	// Yanıt kodunu kontrol et
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API yanıt kodu hatalı: %d", resp.StatusCode)
	}

	// Yanıtı JSON olarak ayrıştır
	var relations AnimeRelations
	if err := json.NewDecoder(resp.Body).Decode(&relations); err != nil {
		return nil, fmt.Errorf("JSON ayrıştırma hatası: %v", err)
	}

	return &relations, nil
}

// GetAnimeHandler, anime verilerini getiren API ucu
func GetAnimeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := AnimeResponse{Success: false}

	// URL parametrelerini al
	query := r.URL.Query()

	// ID parametresi varsa, belirli bir anime getir
	if idStr := query.Get("id"); idStr != "" {
		id, err := strconv.Atoi(idStr)
		if err != nil {
			response.Error = "Geçersiz anime ID'si"
			json.NewEncoder(w).Encode(response)
			return
		}

		anime, err := jikan.GetAnimeById(id)
		if err != nil {
			response.Error = "Anime bulunamadı: " + err.Error()
			json.NewEncoder(w).Encode(response)
			return
		}

		response.Success = true
		response.Data = anime
		json.NewEncoder(w).Encode(response)
		return
	}

	// Arama parametresi varsa, anime ara
	if searchQuery := query.Get("q"); searchQuery != "" {
		searchParams := url.Values{}
		searchParams.Set("q", searchQuery)

		// İsteğe bağlı parametreleri ekle
		if limit := query.Get("limit"); limit != "" {
			searchParams.Set("limit", limit)
		} else {
			// Varsayılan olarak 10 sonuç getir
			searchParams.Set("limit", "10")
		}

		if page := query.Get("page"); page != "" {
			searchParams.Set("page", page)
		} else {
			// Varsayılan olarak sayfa 1
			searchParams.Set("page", "1")
		}

		if animeType := query.Get("type"); animeType != "" {
			searchParams.Set("type", animeType)
		}

		if status := query.Get("status"); status != "" {
			searchParams.Set("status", status)
		}

		if orderBy := query.Get("order_by"); orderBy != "" {
			searchParams.Set("order_by", orderBy)
		}

		if sort := query.Get("sort"); sort != "" {
			searchParams.Set("sort", sort)
		}

		log.Printf("Jikan API'ye gönderilen arama parametreleri: %v", searchParams)
		animeList, err := jikan.GetAnimeSearch(searchParams)
		if err != nil {
			log.Printf("Jikan API hatası: %v", err)
			response.Error = "Anime araması başarısız: " + err.Error()
			json.NewEncoder(w).Encode(response)
			return
		}

		// API yanıtının yapısını incele
		animeListJSON, _ := json.MarshalIndent(animeList, "", "  ")
		log.Printf("Jikan API'den dönen sonuç yapısı: %s", animeListJSON)

		// İlk anime öğesinin genre bilgisini kontrol et
		if len(animeList.Data) > 0 {
			firstAnime := animeList.Data[0]
			firstAnimeJSON, _ := json.MarshalIndent(firstAnime, "", "  ")
			log.Printf("İlk anime öğesi: %s", firstAnimeJSON)

			// Genre bilgisini kontrol et
			firstAnimeBytes, _ := json.Marshal(firstAnime)
			var firstAnimeMap map[string]interface{}
			json.Unmarshal(firstAnimeBytes, &firstAnimeMap)

			if genres, ok := firstAnimeMap["genres"]; ok {
				genresJSON, _ := json.MarshalIndent(genres, "", "  ")
				log.Printf("Genre bilgisi: %s", genresJSON)
			}
		}

		response.Success = true
		response.Data = animeList
		json.NewEncoder(w).Encode(response)
		return
	}

	// Top anime listesini getir (varsayılan)
	topAnime, err := jikan.GetTopAnime("all", "default", 1)
	if err != nil {
		response.Error = "Top anime listesi alınamadı: " + err.Error()
		json.NewEncoder(w).Encode(response)
		return
	}

	response.Success = true
	response.Data = topAnime
	json.NewEncoder(w).Encode(response)
}

// GetMangaHandler, manga verilerini getiren API ucu
func GetMangaHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	response := MangaResponse{Success: false}

	// URL parametrelerini al
	query := r.URL.Query()

	// ID parametresi varsa, belirli bir manga getir
	if idStr := query.Get("id"); idStr != "" {
		id, err := strconv.Atoi(idStr)
		if err != nil {
			response.Error = "Geçersiz manga ID'si"
			json.NewEncoder(w).Encode(response)
			return
		}

		manga, err := jikan.GetMangaById(id)
		if err != nil {
			response.Error = "Manga bulunamadı: " + err.Error()
			json.NewEncoder(w).Encode(response)
			return
		}

		response.Success = true
		response.Data = manga
		json.NewEncoder(w).Encode(response)
		return
	}

	// Arama parametresi varsa, manga ara
	if searchQuery := query.Get("q"); searchQuery != "" {
		searchParams := url.Values{}
		searchParams.Set("q", searchQuery)

		// İsteğe bağlı parametreleri ekle
		if limit := query.Get("limit"); limit != "" {
			searchParams.Set("limit", limit)
		}

		if page := query.Get("page"); page != "" {
			searchParams.Set("page", page)
		}

		if mangaType := query.Get("type"); mangaType != "" {
			searchParams.Set("type", mangaType)
		}

		if status := query.Get("status"); status != "" {
			searchParams.Set("status", status)
		}

		if orderBy := query.Get("order_by"); orderBy != "" {
			searchParams.Set("order_by", orderBy)
		}

		if sort := query.Get("sort"); sort != "" {
			searchParams.Set("sort", sort)
		}

		mangaList, err := jikan.GetMangaSearch(searchParams)
		if err != nil {
			response.Error = "Manga araması başarısız: " + err.Error()
			json.NewEncoder(w).Encode(response)
			return
		}

		response.Success = true
		response.Data = mangaList
		json.NewEncoder(w).Encode(response)
		return
	}

	// Top manga listesini getir (varsayılan)
	topManga, err := jikan.GetTopManga("all", "default", 1)
	if err != nil {
		response.Error = "Top manga listesi alınamadı: " + err.Error()
		json.NewEncoder(w).Encode(response)
		return
	}

	response.Success = true
	response.Data = topManga
	json.NewEncoder(w).Encode(response)
}
