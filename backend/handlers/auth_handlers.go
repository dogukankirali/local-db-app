package handlers

import (
	"local-db-app/auth"
	"local-db-app/email"
	"local-db-app/models"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// AuthHandlers, kimlik doğrulama işlemleri için handler'ları içerir
type AuthHandlers struct {
	DB *gorm.DB
}

// NewAuthHandlers, yeni bir AuthHandlers örneği oluşturur
func NewAuthHandlers(db *gorm.DB) *AuthHandlers {
	return &AuthHandlers{DB: db}
}

// Register, yeni kullanıcı kaydı yapar
func (h *AuthHandlers) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Kullanıcı adı veya e-posta zaten kullanılıyor mu kontrol et
	var existingUser models.User
	if result := h.DB.Where("username = ? OR email = ?", req.Username, req.Email).First(&existingUser); result.RowsAffected > 0 {
		if existingUser.Username == req.Username {
			c.JSON(http.StatusConflict, gin.H{"error": "Bu kullanıcı adı zaten kullanılıyor"})
		} else {
			c.JSON(http.StatusConflict, gin.H{"error": "Bu e-posta adresi zaten kullanılıyor"})
		}
		return
	}

	// Şifreyi hashle
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Şifre hashlenemedi"})
		return
	}

	// Yeni kullanıcı oluştur
	user := models.User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  hashedPassword,
		FirstName: req.FirstName,
		LastName:  req.LastName,
		IsActive:  true,
		IsAdmin:   false,
	}

	// Kullanıcıyı veritabanına kaydet
	if result := h.DB.Create(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı kaydedilemedi"})
		return
	}

	// JWT token oluştur
	token, err := auth.GenerateToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token oluşturulamadı"})
		return
	}

	// Kullanıcı bilgilerini döndür
	response := user.ToUserResponse()
	response.Token = token

	c.JSON(http.StatusCreated, response)
}

// Login, kullanıcı girişi yapar
func (h *AuthHandlers) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Kullanıcıyı bul
	var user models.User
	if result := h.DB.Where("username = ?", req.Username).First(&user); result.Error != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı adı veya şifre"})
		return
	}

	// Şifreyi kontrol et
	if !auth.CheckPassword(req.Password, user.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Geçersiz kullanıcı adı veya şifre"})
		return
	}

	// Son giriş zamanını güncelle
	now := time.Now()
	user.LastLogin = &now
	h.DB.Save(&user)

	// JWT token oluştur
	token, err := auth.GenerateToken(&user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token oluşturulamadı"})
		return
	}

	// Kullanıcı bilgilerini döndür
	response := user.ToUserResponse()
	response.Token = token

	c.JSON(http.StatusOK, response)
}

// GetProfile, kullanıcı profilini getirir
func (h *AuthHandlers) GetProfile(c *gin.Context) {
	// Kullanıcı ID'sini context'ten al
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Yetkilendirme hatası"})
		return
	}

	// Kullanıcıyı bul
	var user models.User
	if result := h.DB.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
		return
	}

	// Kullanıcı bilgilerini döndür
	c.JSON(http.StatusOK, user.ToUserResponse())
}

// UpdateProfile, kullanıcı profilini günceller
func (h *AuthHandlers) UpdateProfile(c *gin.Context) {
	// Kullanıcı ID'sini context'ten al
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Yetkilendirme hatası"})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Kullanıcıyı bul
	var user models.User
	if result := h.DB.First(&user, userID); result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Kullanıcı bulunamadı"})
		return
	}

	// E-posta güncellenmek isteniyorsa, zaten kullanılıyor mu kontrol et
	if req.Email != "" && req.Email != user.Email {
		var existingUser models.User
		if result := h.DB.Where("email = ? AND id != ?", req.Email, userID).First(&existingUser); result.RowsAffected > 0 {
			c.JSON(http.StatusConflict, gin.H{"error": "Bu e-posta adresi zaten kullanılıyor"})
			return
		}
		user.Email = req.Email
	}

	// Diğer alanları güncelle
	if req.FirstName != "" {
		user.FirstName = req.FirstName
	}
	if req.LastName != "" {
		user.LastName = req.LastName
	}

	// Şifre güncellenmek isteniyorsa
	if req.Password != "" {
		hashedPassword, err := auth.HashPassword(req.Password)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Şifre hashlenemedi"})
			return
		}
		user.Password = hashedPassword
	}

	// Kullanıcıyı güncelle
	if result := h.DB.Save(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Kullanıcı güncellenemedi"})
		return
	}

	// Güncellenmiş kullanıcı bilgilerini döndür
	c.JSON(http.StatusOK, user.ToUserResponse())
}

// ForgotPassword, şifre sıfırlama isteği oluşturur
func (h *AuthHandlers) ForgotPassword(c *gin.Context) {
	var req models.ForgotPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Kullanıcıyı e-posta adresine göre bul
	var user models.User
	if result := h.DB.Where("email = ?", req.Email).First(&user); result.Error != nil {
		// Güvenlik nedeniyle kullanıcı bulunamasa bile başarılı yanıt döndür
		c.JSON(http.StatusOK, gin.H{"message": "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi"})
		return
	}

	// Şifre sıfırlama token'ı oluştur
	token, err := auth.GenerateResetToken()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token oluşturulamadı"})
		return
	}

	// Token son kullanma zamanını hesapla
	expiresAt := auth.GetTokenExpirationTime()

	// Kullanıcının token bilgilerini güncelle
	user.ResetPasswordToken = token
	user.ResetPasswordExpires = &expiresAt
	if result := h.DB.Save(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token kaydedilemedi"})
		return
	}

	// Uygulama URL'sini al
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "http://localhost:3000" // Varsayılan URL
	}

	// Şifre sıfırlama e-postası gönder
	err = email.SendPasswordResetEmail(user.Email, token, appURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "E-posta gönderilemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi"})
}

// ResetPassword, şifre sıfırlama işlemini tamamlar
func (h *AuthHandlers) ResetPassword(c *gin.Context) {
	var req models.ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Token'a sahip kullanıcıyı bul
	var user models.User
	if result := h.DB.Where("reset_password_token = ?", req.Token).First(&user); result.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Geçersiz veya süresi dolmuş token"})
		return
	}

	// Token'ın geçerliliğini kontrol et
	err := auth.ValidateResetToken(req.Token, user.ResetPasswordToken, user.ResetPasswordExpires)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Yeni şifreyi hashle
	hashedPassword, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Şifre hashlenemedi"})
		return
	}

	// Kullanıcının şifresini güncelle ve token bilgilerini temizle
	user.Password = hashedPassword
	user.ResetPasswordToken = ""
	user.ResetPasswordExpires = nil
	if result := h.DB.Save(&user); result.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Şifre güncellenemedi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Şifreniz başarıyla sıfırlandı"})
}
