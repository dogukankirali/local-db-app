package functions

import (
	"encoding/json"
	"local-db-app/auth"
	"local-db-app/models"
	"log"
	"net/http"
	"time"

	"gorm.io/gorm"
)

// Register, yeni kullanıcı kaydı oluşturur
func Register(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// İstek gövdesini oku
		var registerRequest models.RegisterRequest
		err := json.NewDecoder(r.Body).Decode(&registerRequest)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Geçersiz istek formatı"})
			return
		}

		// Kullanıcı adı ve e-posta kontrolü
		var existingUser models.User
		result := db.Where("username = ? OR email = ?", registerRequest.Username, registerRequest.Email).First(&existingUser)
		if result.RowsAffected > 0 {
			w.WriteHeader(http.StatusConflict)
			if existingUser.Username == registerRequest.Username {
				json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Bu kullanıcı adı zaten kullanılıyor"})
			} else {
				json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Bu e-posta adresi zaten kullanılıyor"})
			}
			return
		}

		// Şifreyi hashle
		hashedPassword, err := auth.HashPassword(registerRequest.Password)
		if err != nil {
			log.Printf("Şifre hashleme hatası: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Kullanıcı oluşturulurken bir hata oluştu"})
			return
		}

		// Yeni kullanıcı oluştur
		newUser := models.User{
			Username:  registerRequest.Username,
			Email:     registerRequest.Email,
			Password:  hashedPassword,
			FirstName: registerRequest.FirstName,
			LastName:  registerRequest.LastName,
			IsActive:  true,
			IsAdmin:   false,
		}

		// Kullanıcıyı veritabanına kaydet
		result = db.Create(&newUser)
		if result.Error != nil {
			log.Printf("Kullanıcı oluşturma hatası: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Kullanıcı oluşturulurken bir hata oluştu"})
			return
		}

		// JWT token oluştur
		token, err := auth.GenerateToken(&newUser)
		if err != nil {
			log.Printf("Token oluşturma hatası: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Token oluşturulurken bir hata oluştu"})
			return
		}

		// Kullanıcı yanıtını oluştur
		userResponse := newUser.ToUserResponse()
		userResponse.Token = token

		// Başarılı yanıt döndür
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(userResponse)
	}
}

// Login, kullanıcı girişi yapar
func Login(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "POST" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// İstek gövdesini oku
		var loginRequest models.LoginRequest
		err := json.NewDecoder(r.Body).Decode(&loginRequest)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Geçersiz istek formatı"})
			return
		}

		// Kullanıcıyı bul
		var user models.User
		result := db.Where("username = ?", loginRequest.Username).First(&user)
		if result.Error != nil {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Geçersiz kullanıcı adı veya şifre"})
			return
		}

		// Şifreyi kontrol et
		if !auth.CheckPassword(loginRequest.Password, user.Password) {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Geçersiz kullanıcı adı veya şifre"})
			return
		}

		// Son giriş zamanını güncelle
		now := time.Now()
		user.LastLogin = &now
		db.Save(&user)

		// JWT token oluştur
		token, err := auth.GenerateToken(&user)
		if err != nil {
			log.Printf("Token oluşturma hatası: %v", err)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Token oluşturulurken bir hata oluştu"})
			return
		}

		// Kullanıcı yanıtını oluştur
		userResponse := user.ToUserResponse()
		userResponse.Token = token

		// Başarılı yanıt döndür
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(userResponse)
	}
}

// GetProfile, kullanıcı profilini getirir
func GetProfile(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "GET" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Context'ten kullanıcı ID'sini al
		userID, ok := r.Context().Value("userID").(uint)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Yetkilendirme hatası"})
			return
		}

		// Kullanıcıyı bul
		var user models.User
		result := db.First(&user, userID)
		if result.Error != nil {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Kullanıcı bulunamadı"})
			return
		}

		// Kullanıcı yanıtını oluştur
		userResponse := user.ToUserResponse()

		// Başarılı yanıt döndür
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(userResponse)
	}
}

// UpdateProfile, kullanıcı profilini günceller
func UpdateProfile(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "PUT, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		if r.Method != "PUT" {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Context'ten kullanıcı ID'sini al
		userID, ok := r.Context().Value("userID").(uint)
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Yetkilendirme hatası"})
			return
		}

		// İstek gövdesini oku
		var updateRequest models.UpdateUserRequest
		err := json.NewDecoder(r.Body).Decode(&updateRequest)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Geçersiz istek formatı"})
			return
		}

		// Kullanıcıyı bul
		var user models.User
		result := db.First(&user, userID)
		if result.Error != nil {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Kullanıcı bulunamadı"})
			return
		}

		// E-posta güncelleme kontrolü
		if updateRequest.Email != "" && updateRequest.Email != user.Email {
			var existingUser models.User
			result := db.Where("email = ? AND id != ?", updateRequest.Email, userID).First(&existingUser)
			if result.RowsAffected > 0 {
				w.WriteHeader(http.StatusConflict)
				json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Bu e-posta adresi zaten kullanılıyor"})
				return
			}
			user.Email = updateRequest.Email
		}

		// Diğer alanları güncelle
		if updateRequest.FirstName != "" {
			user.FirstName = updateRequest.FirstName
		}
		if updateRequest.LastName != "" {
			user.LastName = updateRequest.LastName
		}

		// Şifre güncellemesi
		if updateRequest.Password != "" {
			hashedPassword, err := auth.HashPassword(updateRequest.Password)
			if err != nil {
				log.Printf("Şifre hashleme hatası: %v", err)
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Profil güncellenirken bir hata oluştu"})
				return
			}
			user.Password = hashedPassword
		}

		// Kullanıcıyı güncelle
		result = db.Save(&user)
		if result.Error != nil {
			log.Printf("Kullanıcı güncelleme hatası: %v", result.Error)
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Profil güncellenirken bir hata oluştu"})
			return
		}

		// Kullanıcı yanıtını oluştur
		userResponse := user.ToUserResponse()

		// Başarılı yanıt döndür
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(userResponse)
	}
}
