package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
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

// HashResetToken, DB'de saklanacak token özetini üretir; DB sızsa bile
// bağlantıdaki ham token elde edilemez.
func HashResetToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
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

// ValidateResetToken, gelen ham token'ı DB'deki özetle karşılaştırır ve süresini kontrol eder
func ValidateResetToken(token string, storedHash string, expiresAt *time.Time) error {
	if token == "" || storedHash == "" {
		return errors.New("geçersiz token")
	}

	if subtle.ConstantTimeCompare([]byte(HashResetToken(token)), []byte(storedHash)) != 1 {
		return errors.New("geçersiz token")
	}

	if IsTokenExpired(expiresAt) {
		return errors.New("token süresi dolmuş")
	}

	return nil
}
