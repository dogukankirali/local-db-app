package functions

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"time"

	_ "github.com/darenliang/jikan-go" // Eski bağımlılık geriye uyumluluk ve referans için korundu
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

// ============================================================================
// ESKİ JIKAN YAPILARI VE FONKSİYONLARI (Silinmeden referans amacıyla korundu)
// ============================================================================

// AnimeRelationEntry, anime ilişkisi girdisi için yapı (Jikan)
type AnimeRelationEntry struct {
	MalId int    `json:"mal_id"`
	Type  string `json:"type"`
	Name  string `json:"name"`
	Url   string `json:"url"`
}

// AnimeRelation, anime ilişkisi için yapı (Jikan)
type AnimeRelation struct {
	Relation string               `json:"relation"`
	Entry    []AnimeRelationEntry `json:"entry"`
}

// AnimeRelations, anime ilişkileri yanıtı için yapı (Jikan)
type AnimeRelations struct {
	Data []AnimeRelation `json:"data"`
}

// GetAnimeRelations, belirli bir anime ID'si için ilişkili animeleri getiren eski Jikan fonksiyonu
// Deprecated: Jikan API stabil çalışmadığı için devre dışı bırakılmıştır.
func GetAnimeRelations(animeId int) (*AnimeRelations, error) {
	url := fmt.Sprintf("https://api.jikan.moe/v4/anime/%d/relations", animeId)

	resp, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("API isteği başarısız: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("API yanıt kodu hatalı: %d", resp.StatusCode)
	}

	var relations AnimeRelations
	if err := json.NewDecoder(resp.Body).Decode(&relations); err != nil {
		return nil, fmt.Errorf("JSON ayrıştırma hatası: %v", err)
	}

	return &relations, nil
}

// ============================================================================
// YENİ ANILIST GRAPHQL API ENTEGRASYONU
// ============================================================================

type aniListGraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables"`
}

var aniListClient = &http.Client{
	Timeout: 10 * time.Second,
}

func fetchFromAniList(mediaType string, search string, id int, page int, perPage int) (interface{}, error) {
	graphqlQuery := `
		query ($search: String, $id: Int, $page: Int, $perPage: Int, $type: MediaType) {
			Page(page: $page, perPage: $perPage) {
				pageInfo {
					total
					currentPage
					lastPage
					hasNextPage
					perPage
				}
				media(search: $search, id: $id, type: $type) {
					id
					idMal
					title {
						romaji
						english
						native
					}
					episodes
					chapters
					volumes
					status
					description
					averageScore
					meanScore
					coverImage {
						large
						medium
					}
					bannerImage
					genres
					seasonYear
					format
				}
			}
		}
	`

	variables := map[string]interface{}{
		"type":    mediaType,
		"page":    page,
		"perPage": perPage,
	}

	if id > 0 {
		variables["id"] = id
	}
	if search != "" {
		variables["search"] = search
	}

	reqBody, err := json.Marshal(aniListGraphQLRequest{
		Query:     graphqlQuery,
		Variables: variables,
	})
	if err != nil {
		return nil, fmt.Errorf("AniList istek gövdesi oluşturulamadı: %v", err)
	}

	req, err := http.NewRequest("POST", "https://graphql.anilist.co", bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, fmt.Errorf("AniList isteği oluşturulamadı: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	resp, err := aniListClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("AniList API bağlantı hatası: %v", err)
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("AniList yanıtı okunamadı: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("AniList API HTTP hatası (%d): %s", resp.StatusCode, string(bodyBytes))
	}

	var rawResponse map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &rawResponse); err != nil {
		return nil, fmt.Errorf("AniList JSON çözümlenemedi: %v", err)
	}

	if data, ok := rawResponse["data"]; ok {
		return data, nil
	}

	return rawResponse, nil
}

// GetAnimeHandler, anime verilerini AniList GraphQL API üzerinden getiren uç
func GetAnimeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	response := AnimeResponse{Success: false}
	query := r.URL.Query()

	id := 0
	if idStr := query.Get("id"); idStr != "" {
		if parsedId, err := strconv.Atoi(idStr); err == nil {
			id = parsedId
		}
	}

	searchQuery := query.Get("q")
	page := 1
	if pageStr := query.Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 10
	if limitStr := query.Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	data, err := fetchFromAniList("ANIME", searchQuery, id, page, limit)
	if err != nil {
		log.Printf("AniList anime getirme hatası: %v", err)
		response.Error = "AniList API hatası: " + err.Error()
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(response)
		return
	}

	response.Success = true
	response.Data = data
	json.NewEncoder(w).Encode(response)
}

// GetMangaHandler, manga verilerini AniList GraphQL API üzerinden getiren uç
func GetMangaHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	response := MangaResponse{Success: false}
	query := r.URL.Query()

	id := 0
	if idStr := query.Get("id"); idStr != "" {
		if parsedId, err := strconv.Atoi(idStr); err == nil {
			id = parsedId
		}
	}

	searchQuery := query.Get("q")
	page := 1
	if pageStr := query.Get("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	limit := 10
	if limitStr := query.Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	data, err := fetchFromAniList("MANGA", searchQuery, id, page, limit)
	if err != nil {
		log.Printf("AniList manga getirme hatası: %v", err)
		response.Error = "AniList API hatası: " + err.Error()
		w.WriteHeader(http.StatusBadGateway)
		json.NewEncoder(w).Encode(response)
		return
	}

	response.Success = true
	response.Data = data
	json.NewEncoder(w).Encode(response)
}
