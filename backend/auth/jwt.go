package auth

import (
	"errors"
	"fmt"
	"local-db-app/models"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims, JWT token içinde taşınacak bilgileri tanımlar
type JWTClaims struct {
	UserID   uint   `json:"userId"`
	Username string `json:"username"`
	IsAdmin  bool   `json:"isAdmin"`
	jwt.RegisteredClaims
}

// GenerateToken, kullanıcı için JWT token oluşturur
func GenerateToken(user *models.User) (string, error) {
	// JWT secret key'i .env dosyasından al
	secretKey := os.Getenv("JWT_SECRET_KEY")
	if secretKey == "" {
		return "", errors.New("JWT_SECRET_KEY çevre değişkeni tanımlanmamış")
	}

	// Token süresi (24 saat)
	expirationTime := time.Now().Add(24 * time.Hour)

	// Token içeriğini oluştur
	claims := &JWTClaims{
		UserID:   user.ID,
		Username: user.Username,
		IsAdmin:  user.IsAdmin,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "local-db-app",
			Subject:   fmt.Sprintf("%d", user.ID),
		},
	}

	// Token oluştur
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Token'ı imzala
	tokenString, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ValidateToken, JWT token'ı doğrular ve içindeki bilgileri döndürür
func ValidateToken(tokenString string) (*JWTClaims, error) {
	// JWT secret key'i .env dosyasından al
	secretKey := os.Getenv("JWT_SECRET_KEY")
	if secretKey == "" {
		return nil, errors.New("JWT_SECRET_KEY çevre değişkeni tanımlanmamış")
	}

	// Token'ı parse et
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Token imzalama algoritmasını kontrol et
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("beklenmeyen imzalama metodu: %v", token.Header["alg"])
		}
		return []byte(secretKey), nil
	})

	if err != nil {
		return nil, err
	}

	// Token içeriğini al
	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("geçersiz token")
}
