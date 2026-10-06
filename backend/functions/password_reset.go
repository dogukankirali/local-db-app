package functions

import (
	"encoding/json"
	"errors"
	"local-db-app/auth"
	"local-db-app/email"
	"local-db-app/models"
	"log"
	"net/http"
	"os"
	"strings"

	"gorm.io/gorm"
)

const forgotPasswordMessage = "Bu e-posta adresine kayıtlı bir hesap varsa şifre sıfırlama bağlantısı gönderildi"

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// ForgotPassword, e-posta adresine şifre sıfırlama bağlantısı gönderir.
// Hesabın var olup olmadığını sızdırmamak için her durumda aynı mesajı döner.
func ForgotPassword(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.ForgotPasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Email) == "" {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "Geçerli bir e-posta adresi girin"})
			return
		}

		var user models.User
		if err := db.Where("LOWER(email) = LOWER(?)", strings.TrimSpace(req.Email)).First(&user).Error; err != nil {
			writeJSON(w, http.StatusOK, models.ErrorResponse{Message: forgotPasswordMessage})
			return
		}

		token, err := auth.GenerateResetToken()
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: "Token oluşturulamadı"})
			return
		}
		expiresAt := auth.GetTokenExpirationTime()
		if err := db.Model(&user).Updates(map[string]interface{}{
			"reset_password_token":   auth.HashResetToken(token),
			"reset_password_expires": expiresAt,
		}).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: "Token kaydedilemedi"})
			return
		}

		appURL := os.Getenv("APP_URL")
		if appURL == "" {
			appURL = "http://localhost:3000"
		}
		if err := email.SendPasswordResetEmail(user.Email, token, appURL); err != nil {
			log.Printf("Şifre sıfırlama e-postası gönderilemedi (kullanıcı %d): %v", user.ID, err)
			msg := "E-posta gönderilemedi, lütfen daha sonra tekrar deneyin"
			if errors.Is(err, email.ErrNotConfigured) {
				msg = "E-posta gönderimi sunucuda yapılandırılmamış"
			}
			writeJSON(w, http.StatusServiceUnavailable, models.ErrorResponse{Message: msg})
			return
		}

		writeJSON(w, http.StatusOK, models.ErrorResponse{Message: forgotPasswordMessage})
	}
}

// ResetPassword, e-postadaki token ile yeni şifreyi belirler
func ResetPassword(db *gorm.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.ResetPasswordRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "Geçersiz istek formatı"})
			return
		}
		if len(req.Password) < 6 {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "Şifre en az 6 karakter olmalı"})
			return
		}

		var user models.User
		if err := db.Where("reset_password_token = ?", auth.HashResetToken(req.Token)).First(&user).Error; err != nil {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "Geçersiz veya süresi dolmuş bağlantı"})
			return
		}
		if err := auth.ValidateResetToken(req.Token, user.ResetPasswordToken, user.ResetPasswordExpires); err != nil {
			writeJSON(w, http.StatusBadRequest, models.ErrorResponse{Message: "Geçersiz veya süresi dolmuş bağlantı"})
			return
		}

		hashed, err := auth.HashPassword(req.Password)
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: "Şifre hashlenemedi"})
			return
		}
		if err := db.Model(&user).Updates(map[string]interface{}{
			"password":               hashed,
			"reset_password_token":   "",
			"reset_password_expires": nil,
		}).Error; err != nil {
			writeJSON(w, http.StatusInternalServerError, models.ErrorResponse{Message: "Şifre güncellenemedi"})
			return
		}

		writeJSON(w, http.StatusOK, models.ErrorResponse{Message: "Şifren güncellendi, giriş yapabilirsin"})
	}
}
