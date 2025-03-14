package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"
)

// GenerateResetToken, şifre sıfırlama için benzersiz bir token oluşturur
func GenerateResetToken() (string, error) {
	// 32 byte (256 bit) uzunluğunda rastgele bir token oluştur
	tokenBytes := make([]byte, 32)
	_, err := rand.Read(tokenBytes)
	if err != nil {
		return "", err
	}

	// Byte dizisini hexadecimal string'e dönüştür
	token := hex.EncodeToString(tokenBytes)
	return token, nil
}

// IsTokenExpired, token'ın süresinin dolup dolmadığını kontrol eder
func IsTokenExpired(expiresAt *time.Time) bool {
	if expiresAt == nil {
		return true
	}
	return time.Now().After(*expiresAt)
}

// GetTokenExpirationTime, token için son kullanma zamanını hesaplar
func GetTokenExpirationTime() time.Time {
	// Token 1 saat geçerli olsun
	return time.Now().Add(1 * time.Hour)
}

// ValidateResetToken, şifre sıfırlama token'ının geçerli olup olmadığını kontrol eder
func ValidateResetToken(token string, storedToken string, expiresAt *time.Time) error {
	// Token boş mu kontrol et
	if token == "" || storedToken == "" {
		return errors.New("geçersiz token")
	}

	// Token eşleşiyor mu kontrol et
	if token != storedToken {
		return errors.New("geçersiz token")
	}

	// Token süresi dolmuş mu kontrol et
	if IsTokenExpired(expiresAt) {
		return errors.New("token süresi dolmuş")
	}

	return nil
}
