package migrations

import (
	"fmt"
	"regexp"
	"strings"

	"gorm.io/gorm"
)

// FixSeriesData, series alanındaki boş string değerlerini 0 ile değiştirir
func FixSeriesData(db *gorm.DB) error {
	// Transaction başlat
	tx := db.Begin()
	if tx.Error != nil {
		return fmt.Errorf("transaction başlatılamadı: %v", tx.Error)
	}

	// Hata durumunda rollback yap
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Önce anime_series tablosunda 0 ID'li bir kayıt olup olmadığını kontrol et
	var count int64
	if err := tx.Table("anime.anime_series").Where("id = 0").Count(&count).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("anime_series tablosunu kontrol ederken hata: %v", err)
	}

	// Eğer 0 ID'li kayıt yoksa, ekle
	if count == 0 {
		if err := tx.Exec("INSERT INTO anime.anime_series (id, name) VALUES (0, 'Belirtilmemiş') ON CONFLICT (id) DO NOTHING").Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("anime_series tablosuna 0 ID'li kayıt eklerken hata: %v", err)
		}
		fmt.Println("anime_series tablosuna 0 ID'li 'Belirtilmemiş' kaydı eklendi")
	}

	// Önce series alanı NULL olan kayıtları 0 olarak güncelle
	if err := tx.Exec("UPDATE anime.animes SET series = 0 WHERE series IS NULL").Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("NULL series değerlerini güncellerken hata: %v", err)
	}

	// Alternatif çözüm: Doğrudan SQL ile tüm kayıtları kontrol et
	if err := tx.Exec("UPDATE anime.animes SET series = 0 WHERE series IS NULL OR series < 0").Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("geçersiz series değerlerini güncellerken hata: %v", err)
	}

	// Transaction'ı commit et
	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("transaction commit edilirken hata: %v", err)
	}

	fmt.Println("Series alanı başarıyla düzeltildi")
	return nil
}

// CleanupAndMergeSeriesData, seri isimlerini temizler ve aynı serinin farklı sezonlarını birleştirir
func CleanupAndMergeSeriesData(db *gorm.DB) error {
	fmt.Println("Seri verilerini temizleme ve birleştirme işlemi başlatılıyor...")

	// Önce anime_series tablosunda 0 ID'li bir kayıt olup olmadığını kontrol et
	var count int64
	if err := db.Table("anime.anime_series").Where("id = 0").Count(&count).Error; err != nil {
		return fmt.Errorf("anime_series tablosunu kontrol ederken hata: %v", err)
	}

	// Eğer 0 ID'li kayıt yoksa, ekle
	if count == 0 {
		if err := db.Exec("INSERT INTO anime.anime_series (id, name) VALUES (0, 'Belirtilmemiş') ON CONFLICT (id) DO NOTHING").Error; err != nil {
			return fmt.Errorf("anime_series tablosuna 0 ID'li kayıt eklerken hata: %v", err)
		}
		fmt.Println("anime_series tablosuna 0 ID'li 'Belirtilmemiş' kaydı eklendi")
	}

	// Geçersiz serileri temizle (tek karakterli veya çok kısa isimler)
	var invalidSeries []struct {
		ID   uint
		Name string
	}

	// Tek karakterli veya çok kısa isimleri bul
	if err := db.Table("anime.anime_series").
		Where("LENGTH(name) <= 2 OR name IN ('Re', 'B')").
		Find(&invalidSeries).Error; err != nil {
		return fmt.Errorf("geçersiz serileri bulurken hata: %v", err)
	}

	// Geçersiz serileri 0 ID'li seriye yönlendir - her biri için ayrı transaction kullan
	for _, series := range invalidSeries {
		fmt.Printf("Geçersiz seri bulundu: %s (ID: %d)\n", series.Name, series.ID)

		// Transaction başlat
		tx := db.Begin()
		if tx.Error != nil {
			return fmt.Errorf("transaction başlatılamadı: %v", tx.Error)
		}

		// Bu seriye bağlı animeleri 0 ID'li seriye yönlendir
		if err := tx.Exec("UPDATE anime.animes SET series = 0 WHERE series = ?", series.ID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("anime serilerini güncellerken hata: %v", err)
		}

		// Geçersiz seriyi sil
		if err := tx.Exec("DELETE FROM anime.anime_series WHERE id = ?", series.ID).Error; err != nil {
			tx.Rollback()
			return fmt.Errorf("geçersiz seriyi silerken hata: %v", err)
		}

		// Transaction'ı commit et
		if err := tx.Commit().Error; err != nil {
			return fmt.Errorf("transaction commit edilirken hata: %v", err)
		}
	}

	// Aynı serinin farklı sezonlarını birleştir
	var allSeries []struct {
		ID   uint
		Name string
	}

	if err := db.Table("anime.anime_series").Find(&allSeries).Error; err != nil {
		return fmt.Errorf("tüm serileri alırken hata: %v", err)
	}

	// Sezon bilgisi içeren regex pattern'ları - daha kapsamlı hale getirildi
	seasonPatterns := []*regexp.Regexp{
		// Önce daha spesifik pattern'ları kontrol et
		regexp.MustCompile(`(?i)(.*?)\s+(\d+)(nd|rd|th|st)?\s+Season`), // "Bungou Stray Dogs 2nd Season" -> "Bungou Stray Dogs"
		regexp.MustCompile(`(?i)(.*?)\s+Season\s+(\d+)`),               // "Anime Season 2" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Part\s+\d+$`),                  // "JoJo no Kimyou na Bouken Part 3" -> "JoJo no Kimyou na Bouken"
		regexp.MustCompile(`(?i)(.*?)\s+Part\s+\d+\s+.*`),              // "JoJo no Kimyou na Bouken Part 3 Something" -> "JoJo no Kimyou na Bouken"
		regexp.MustCompile(`(?i)(.*?)\s+Part\s+\d+:`),                  // "JoJo no Kimyou na Bouken Part 3: Stardust Crusaders" -> "JoJo no Kimyou na Bouken"
		regexp.MustCompile(`(?i)(.*?)\s+Part\s+\d+`),                   // "Anime Part 2" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Movie\s+(\d+)`),                // "Anime Movie 3" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+vs\..*`),                       // "Haikyuu!! Riku vs. Kuu" -> "Haikyuu!!"
		regexp.MustCompile(`(?i)(.*?)\s+Movie`),                        // "Anime Movie" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+OVA`),                          // "Anime OVA" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Special`),                      // "Anime Special" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+The\s+Movie`),                  // "Anime The Movie" -> "Anime"
		regexp.MustCompile(`(?i)(.*?):.*`),                             // "Anime: Subtitle" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+-\s+.*`),                       // "Anime - Subtitle" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Second\s+Season`),              // "Anime Second Season" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Third\s+Season`),               // "Anime Third Season" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Fourth\s+Season`),              // "Anime Fourth Season" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Final\s+Season`),               // "Anime Final Season" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+To\s+The\s+Top.*`),             // "Haikyuu!! To The Top" -> "Haikyuu!!"
		regexp.MustCompile(`(?i)(.*?)\s+Season$`),                      // "One Punch Man Season" -> "One Punch Man"
		regexp.MustCompile(`(?i)(.*?)\s+Part$`),                        // "Anime Part" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+\(TV\).*`),                     // "Anime (TV)" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+\(Movie\).*`),                  // "Anime (Movie)" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+\(OVA\).*`),                    // "Anime (OVA)" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+\d+:\s+.*`),                    // "JoJo no Kimyou na Bouken Part 6: Stone Ocean" -> "JoJo no Kimyou na Bouken"
		regexp.MustCompile(`(?i)(.*?)\s+Part\s+\d+:.*`),                // "JoJo no Kimyou na Bouken Part 6: Stone Ocean" -> "JoJo no Kimyou na Bouken"
		regexp.MustCompile(`(?i)(.*?)\s+the\s+Movie.*`),                // "Anime the Movie" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Film.*`),                       // "Anime Film" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Chapter.*`),                    // "Anime Chapter" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Arc.*`),                        // "Anime Arc" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+Series.*`),                     // "Anime Series" -> "Anime"
		regexp.MustCompile(`(?i)(.*?)\s+[IVX]+$`),                      // "Mushoku Tensei II" -> "Mushoku Tensei"
		regexp.MustCompile(`(?i)(.*?)\s+\d+\s+[IVX]+$`),                // "Mob Psycho 100 II" -> "Mob Psycho 100"

		// En son genel pattern'ları kontrol et
		regexp.MustCompile(`(?i)(.*?)\s+\d+$`), // "Karakai Jouzu no Takagi-san 2" -> "Karakai Jouzu no Takagi-san"
	}

	// Özel durumlar için manuel eşleştirme - daha fazla örnek eklendi
	specialCases := map[string]string{
		// Yeni eklenen özel durumlar - daha spesifik hale getirildi
		"Kanojo mo Kanojo":          "Kanojo mo Kanojo",
		"Kanojo mo Kanojo Season 2": "Kanojo mo Kanojo",

		"Karakai Jouzu no Takagi-san":   "Karakai Jouzu no Takagi-san",
		"Karakai Jouzu no Takagi-san 2": "Karakai Jouzu no Takagi-san",
		"Karakai Jouzu no Takagi-san 3": "Karakai Jouzu no Takagi-san",

		"Mushoku Tensei":    "Mushoku Tensei",
		"Mushoku Tensei II": "Mushoku Tensei",

		"Mob Psycho 100":     "Mob Psycho 100",
		"Mob Psycho 100 II":  "Mob Psycho 100",
		"Mob Psycho 100 III": "Mob Psycho 100",

		"B": "Belirtilmemiş", // Tek karakterli özel durum

		// Bungou Stray Dogs serisi
		"Bungou Stray Dogs":             "Bungou Stray Dogs",
		"Bungou Stray Dogs 2nd Season":  "Bungou Stray Dogs",
		"Bungou Stray Dogs 3rd Season":  "Bungou Stray Dogs",
		"Bungou Stray Dogs 4th Season":  "Bungou Stray Dogs",
		"Bungou Stray Dogs: Dead Apple": "Bungou Stray Dogs",

		// Boku no Hero Academia serisi
		"Boku no Hero Academia":                "Boku no Hero Academia",
		"Boku no Hero Academia 2nd Season":     "Boku no Hero Academia",
		"Boku no Hero Academia 3rd Season":     "Boku no Hero Academia",
		"Boku no Hero Academia 4th Season":     "Boku no Hero Academia",
		"Boku no Hero Academia 5th Season":     "Boku no Hero Academia",
		"Boku no Hero Academia 6th Season":     "Boku no Hero Academia",
		"Boku no Hero Academia: Heroes Rising": "Boku no Hero Academia",
		"Boku no Hero Academia: Two Heroes":    "Boku no Hero Academia",

		// Shingeki no Kyojin serisi
		"Shingeki no Kyojin":                          "Shingeki no Kyojin",
		"Shingeki no Kyojin Season 2":                 "Shingeki no Kyojin",
		"Shingeki no Kyojin Season 3":                 "Shingeki no Kyojin",
		"Shingeki no Kyojin Season 3 Part 2":          "Shingeki no Kyojin",
		"Shingeki no Kyojin: The Final Season":        "Shingeki no Kyojin",
		"Shingeki no Kyojin: The Final Season Part 2": "Shingeki no Kyojin",

		// Koutetsujou no Kabaneri serisi
		"Koutetsujou no Kabaneri":         "Koutetsujou no Kabaneri",
		"Koutetsujou no Kabaneri Movie 3": "Koutetsujou no Kabaneri",

		// Haikyuu serisi
		"Haikyuu!!":                       "Haikyuu",
		"Haikyuu!! Second Season":         "Haikyuu",
		"Haikyuu!! Riku vs. Kuu":          "Haikyuu",
		"Haikyuu!! To the Top":            "Haikyuu",
		"Haikyuu!! To the Top 2nd Season": "Haikyuu",

		// Made in Abyss serisi
		"Made in Abyss":         "Made in Abyss",
		"Made in Abyss Movie 1": "Made in Abyss",
		"Made in Abyss Movie 2": "Made in Abyss",
		"Made in Abyss Movie 3: Fukaki Tamashii no Reimei": "Made in Abyss",
		"Made in Abyss: Retsujitsu no Ougonkyou":           "Made in Abyss",

		// One Punch Man serisi
		"One Punch Man":            "One Punch Man",
		"One Punch Man Season 2":   "One Punch Man",
		"One Punch Man 2nd Season": "One Punch Man",
		"One Punch Man OVA":        "One Punch Man",
		"One Punch Man Specials":   "One Punch Man",

		// Diğer popüler seriler
		"Demon Slayer: Kimetsu no Yaiba":                    "Kimetsu no Yaiba",
		"Demon Slayer: Kimetsu no Yaiba Movie: Mugen Train": "Kimetsu no Yaiba",
		"Kimetsu no Yaiba":                                  "Kimetsu no Yaiba",
		"Kimetsu no Yaiba: Yuukaku-hen":                     "Kimetsu no Yaiba",
		"Kimetsu no Yaiba Movie: Mugen Ressha-hen":          "Kimetsu no Yaiba",

		"Sword Art Online":                                  "Sword Art Online",
		"Sword Art Online II":                               "Sword Art Online",
		"Sword Art Online: Alicization":                     "Sword Art Online",
		"Sword Art Online: Alicization - War of Underworld": "Sword Art Online",
		"Sword Art Online Movie: Ordinal Scale":             "Sword Art Online",
		"Sword Art Online Alternative: Gun Gale Online":     "Sword Art Online",

		"Fate/stay night":                        "Fate",
		"Fate/stay night: Unlimited Blade Works": "Fate",
		"Fate/Zero":                              "Fate",
		"Fate/Apocrypha":                         "Fate",
		"Fate/Grand Order":                       "Fate",
		"Fate/Extra: Last Encore":                "Fate",

		"Steins;Gate":   "Steins;Gate",
		"Steins;Gate 0": "Steins;Gate",
		"Steins;Gate Movie: Fuka Ryouiki no Déjà vu": "Steins;Gate",
	}

	// Temizleme fonksiyonu - daha kapsamlı hale getirildi
	cleanSeriesName := func(name string) string {
		originalName := name

		// Önce özel durumları kontrol et
		if cleanName, exists := specialCases[name]; exists {
			fmt.Printf("Özel durum eşleşmesi: '%s' -> '%s'\n", name, cleanName)
			return cleanName
		}

		// Regex pattern'larını uygula
		for _, pattern := range seasonPatterns {
			if matches := pattern.FindStringSubmatch(name); len(matches) > 1 {
				cleanName := strings.TrimSpace(matches[1])
				fmt.Printf("Regex eşleşmesi: '%s' -> '%s'\n", name, cleanName)
				return cleanName
			}
		}

		// Manuel temizleme işlemleri - daha kapsamlı hale getirildi
		replacer := strings.NewReplacer(
			// Sezon bilgileri
			" 2nd Season", "",
			" 3rd Season", "",
			" 4th Season", "",
			" 5th Season", "",
			" 6th Season", "",
			" Second Season", "",
			" Third Season", "",
			" Fourth Season", "",
			" Fifth Season", "",
			" Sixth Season", "",
			" Season 2", "",
			" Season 3", "",
			" Season 4", "",
			" Season 5", "",
			" Season 6", "",
			" Season II", "",
			" Season III", "",
			" Season IV", "",
			" Season V", "",
			" Season VI", "",
			" Season", "",

			// Part bilgileri
			" Part 2", "",
			" Part 3", "",
			" Part 4", "",
			" Part 5", "",
			" Part 6", "",
			" Part II", "",
			" Part III", "",
			" Part IV", "",
			" Part V", "",
			" Part VI", "",
			" Part", "",

			// Film bilgileri
			" Movie 2", "",
			" Movie 3", "",
			" Movie 4", "",
			" Movie", "",
			" The Movie", "",
			" the Movie", "",
			" Film", "",

			// Roma rakamları
			" I", "",
			" II", "",
			" III", "",
			" IV", "",
			" V", "",
			" VI", "",
			" VII", "",
			" VIII", "",
			" IX", "",
			" X", "",

			// Sayısal sezon bilgileri
			" 2", "",
			" 3", "",
			" 4", "",
			" 5", "",
			" 6", "",
			" 7", "",
			" 8", "",
			" 9", "",
			" 10", "",

			// Diğer yaygın ekler
			" OVA", "",
			" Special", "",
			" Specials", "",
			" Final", "",
			" Final Season", "",
			" The Final", "",
			" The Animation", "",
			" vs.", "",
			" To The Top", "",
			" To the Top", "",
			" (TV)", "",
			" (Movie)", "",
			" (OVA)", "",
			" Chapter", "",
			" Arc", "",
			" Series", "",
			" Remake", "",
			" Reboot", "",
			" Recollection", "",
			" Prologue", "",
			" Epilogue", "",
			" Prequel", "",
			" Sequel", "",

			// Noktalama işaretleri
			"!!", "",
			"!", "",
			"?", "",
		)

		cleanName := strings.TrimSpace(replacer.Replace(name))

		// Eğer ":" veya "-" içeriyorsa, bunları da temizle
		if idx := strings.Index(cleanName, ":"); idx > 0 {
			cleanName = strings.TrimSpace(cleanName[:idx])
		}

		if idx := strings.Index(cleanName, " -"); idx > 0 {
			cleanName = strings.TrimSpace(cleanName[:idx])
		}

		// Eğer temizleme işlemi sonucunda değişiklik olduysa, logla
		if cleanName != originalName {
			fmt.Printf("Manuel temizleme: '%s' -> '%s'\n", originalName, cleanName)
		}

		// Eğer temizlenmiş isim çok kısa ise (2 karakter veya daha az), "Belirtilmemiş" olarak işaretle
		if len(cleanName) <= 2 {
			fmt.Printf("Çok kısa isim: '%s' -> 'Belirtilmemiş'\n", cleanName)
			return "Belirtilmemiş"
		}

		return cleanName
	}

	// Önce tüm serileri temizle ve temizlenmiş isimlerini logla
	fmt.Println("\n--- Seri İsimlerini Temizleme ---")
	cleanedSeriesNames := make(map[uint]string)
	for _, series := range allSeries {
		cleanedName := cleanSeriesName(series.Name)
		cleanedSeriesNames[series.ID] = cleanedName
		fmt.Printf("Seri ID: %d, Orijinal İsim: '%s', Temizlenmiş İsim: '%s'\n", series.ID, series.Name, cleanedName)
	}
	fmt.Println("--- Seri İsimlerini Temizleme Tamamlandı ---\n")

	// Önce mevcut tüm seri isimlerini bir haritada topla
	existingSeriesNames := make(map[string]uint)
	for _, series := range allSeries {
		cleanedName := cleanedSeriesNames[series.ID]
		if id, exists := existingSeriesNames[cleanedName]; exists {
			fmt.Printf("Uyarı: '%s' isimli seri zaten var (ID: %d), bu seri (ID: %d) onunla birleştirilecek\n",
				cleanedName, id, series.ID)
		} else {
			existingSeriesNames[cleanedName] = series.ID
		}
	}

	// Seri gruplarını oluştur
	seriesGroups := make(map[string][]uint)

	for _, series := range allSeries {
		// Temizlenmiş seri ismini al
		baseName := cleanedSeriesNames[series.ID]

		// Eğer baseName boşsa, orijinal ismi kullan
		if baseName == "" {
			baseName = series.Name
		}

		// Seri grubuna ekle
		seriesGroups[baseName] = append(seriesGroups[baseName], series.ID)
	}

	// Her grup için ana seri belirle ve diğerlerini ona yönlendir
	fmt.Println("\n--- Seri Birleştirme İşlemi ---")
	for baseName, ids := range seriesGroups {
		if len(ids) <= 1 {
			continue // Tek bir seri varsa işlem yapma
		}

		fmt.Printf("Seri grubu bulundu: '%s', %d adet seri birleştirilecek: %v\n", baseName, len(ids), ids)

		// Eğer bu isimde bir seri zaten varsa, o seriyi ana seri olarak kullan
		var mainID uint
		if existingID, exists := existingSeriesNames[baseName]; exists {
			mainID = existingID
			fmt.Printf("Bu isimde bir seri zaten var (ID: %d), bu seri ana seri olarak kullanılacak\n", mainID)
		} else {
			// İlk ID'yi ana seri olarak kullan
			mainID = ids[0]

			// Ana serinin ismini güncelle (eğer tam olarak baseName değilse)
			var currentName string
			db.Table("anime.anime_series").Where("id = ?", mainID).Pluck("name", &currentName)

			if currentName != baseName {
				fmt.Printf("Ana seri ismi güncelleniyor: '%s' -> '%s' (ID: %d)\n", currentName, baseName, mainID)
				if err := db.Exec("UPDATE anime.anime_series SET name = ? WHERE id = ?", baseName, mainID).Error; err != nil {
					return fmt.Errorf("ana seri ismini güncellerken hata: %v", err)
				}
			}
		}

		// Diğer serileri ana seriye yönlendir - her biri için ayrı transaction kullan
		for _, id := range ids {
			if id == mainID {
				continue // Ana seriyi atla
			}

			var seriesName string
			db.Table("anime.anime_series").Where("id = ?", id).Pluck("name", &seriesName)

			fmt.Printf("Seri birleştiriliyor: '%s' (ID: %d) -> '%s' (ID: %d)\n", seriesName, id, baseName, mainID)

			// Transaction başlat
			tx := db.Begin()
			if tx.Error != nil {
				return fmt.Errorf("transaction başlatılamadı: %v", tx.Error)
			}

			// Bu seriye bağlı animeleri ana seriye yönlendir
			var animeCount int64
			db.Table("anime.animes").Where("series = ?", id).Count(&animeCount)

			if animeCount > 0 {
				fmt.Printf("%d adet anime '%s' serisinden '%s' serisine aktarılıyor\n", animeCount, seriesName, baseName)
				if err := tx.Exec("UPDATE anime.animes SET series = ? WHERE series = ?", mainID, id).Error; err != nil {
					tx.Rollback()
					return fmt.Errorf("anime serilerini güncellerken hata: %v", err)
				}
			}

			// Yönlendirilen seriyi sil
			fmt.Printf("Seri siliniyor: '%s' (ID: %d)\n", seriesName, id)
			if err := tx.Exec("DELETE FROM anime.anime_series WHERE id = ?", id).Error; err != nil {
				tx.Rollback()
				return fmt.Errorf("yönlendirilen seriyi silerken hata: %v", err)
			}

			// Transaction'ı commit et
			if err := tx.Commit().Error; err != nil {
				return fmt.Errorf("transaction commit edilirken hata: %v", err)
			}
		}
	}
	fmt.Println("--- Seri Birleştirme İşlemi Tamamlandı ---\n")

	// Tek bir seri olan ama ismi temizlenmesi gereken serileri güncelle
	fmt.Println("\n--- Tek Serileri Güncelleme ---")
	for _, series := range allSeries {
		cleanedName := cleanedSeriesNames[series.ID]
		if cleanedName != series.Name && cleanedName != "" {
			// Bu seri için grup var mı kontrol et
			group, exists := seriesGroups[cleanedName]
			if !exists || len(group) <= 1 {
				fmt.Printf("Tek seri ismi güncelleniyor: '%s' -> '%s' (ID: %d)\n", series.Name, cleanedName, series.ID)
				if err := db.Exec("UPDATE anime.anime_series SET name = ? WHERE id = ?", cleanedName, series.ID).Error; err != nil {
					return fmt.Errorf("seri ismini güncellerken hata: %v", err)
				}
			}
		}
	}
	fmt.Println("--- Tek Serileri Güncelleme Tamamlandı ---\n")

	fmt.Println("Seri verilerini temizleme ve birleştirme işlemi tamamlandı")
	return nil
}
