package auth

import (
	"golang.org/x/crypto/bcrypt"
)

// HashPassword, şifreyi bcrypt ile hashler
func HashPassword(password string) (string, error) {
	// Şifreyi hashle (cost: 10)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 10)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}

// CheckPassword, verilen şifrenin hash ile eşleşip eşleşmediğini kontrol eder
func CheckPassword(password, hashedPassword string) bool {
	// Şifreyi hash ile karşılaştır
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
	return err == nil
}
