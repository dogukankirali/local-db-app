package middleware

import (
	"context"
	"encoding/json"
	"local-db-app/auth"
	"net/http"
	"strings"
)

// AuthMiddleware, JWT token doğrulama middleware'i
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Authorization header'ını al
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			// Authorization header yoksa hata döndür
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Yetkilendirme başlığı eksik"})
			return
		}

		// Bearer token formatını kontrol et
		tokenParts := strings.Split(authHeader, " ")
		if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
			// Geçersiz token formatı
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Geçersiz yetkilendirme formatı"})
			return
		}

		// Token'ı doğrula
		tokenString := tokenParts[1]
		claims, err := auth.ValidateToken(tokenString)
		if err != nil {
			// Token doğrulanamadı
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "Geçersiz veya süresi dolmuş token"})
			return
		}

		// Token doğrulandı, kullanıcı bilgilerini context'e ekle
		ctx := context.WithValue(r.Context(), "userID", claims.UserID)
		ctx = context.WithValue(ctx, "username", claims.Username)
		ctx = context.WithValue(ctx, "isAdmin", claims.IsAdmin)

		// İsteği sonraki handler'a ilet
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// AdminMiddleware, sadece admin kullanıcıların erişebileceği rotalar için middleware
func AdminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Kullanıcının admin olup olmadığını kontrol et
		isAdmin, ok := r.Context().Value("isAdmin").(bool)
		if !ok || !isAdmin {
			// Kullanıcı admin değilse hata döndür
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]string{"error": "Bu işlem için admin yetkisi gerekiyor"})
			return
		}

		// İsteği sonraki handler'a ilet
		next.ServeHTTP(w, r)
	})
}
