package models

import (
	"time"

	"gorm.io/gorm"
)

// User, kullanıcı bilgilerini tutan model
type User struct {
	ID                   uint           `gorm:"primaryKey" json:"id"`
	Username             string         `gorm:"size:50;uniqueIndex;not null" json:"username"`
	Email                string         `gorm:"size:100;uniqueIndex;not null" json:"email"`
	Password             string         `gorm:"size:255;not null" json:"-"` // JSON çıktısında gösterilmeyecek
	FirstName            string         `gorm:"size:50" json:"firstName"`
	LastName             string         `gorm:"size:50" json:"lastName"`
	IsActive             bool           `gorm:"default:true" json:"isActive"`
	IsAdmin              bool           `gorm:"default:false" json:"isAdmin"`
	LastLogin            *time.Time     `json:"lastLogin"`
	ResetPasswordToken   string         `gorm:"size:255" json:"-"`
	ResetPasswordExpires *time.Time     `json:"-"`
	CreatedAt            time.Time      `json:"createdAt"`
	UpdatedAt            time.Time      `json:"updatedAt"`
	DeletedAt            gorm.DeletedAt `gorm:"index" json:"-"`
}

// UserResponse, kullanıcı bilgilerinin API yanıtı için kullanılan model
type UserResponse struct {
	ID        uint       `json:"id"`
	Username  string     `json:"username"`
	Email     string     `json:"email"`
	FirstName string     `json:"firstName"`
	LastName  string     `json:"lastName"`
	IsActive  bool       `json:"isActive"`
	IsAdmin   bool       `json:"isAdmin"`
	LastLogin *time.Time `json:"lastLogin"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	Token     string     `json:"token,omitempty"`
}

// LoginRequest, giriş isteği için kullanılan model
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// RegisterRequest, kayıt isteği için kullanılan model
type RegisterRequest struct {
	Username  string `json:"username" binding:"required,min=3,max=50"`
	Email     string `json:"email" binding:"required,email"`
	Password  string `json:"password" binding:"required,min=6"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

// UpdateUserRequest, kullanıcı bilgilerini güncelleme isteği için kullanılan model
type UpdateUserRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Password  string `json:"password"`
}

// ForgotPasswordRequest, şifre sıfırlama isteği için kullanılan model
type ForgotPasswordRequest struct {
	Email string `json:"email" binding:"required,email"`
}

// ResetPasswordRequest, şifre sıfırlama için kullanılan model
type ResetPasswordRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password" binding:"required,min=6"`
}

// ToUserResponse, User modelini UserResponse modeline dönüştürür
func (u *User) ToUserResponse() UserResponse {
	return UserResponse{
		ID:        u.ID,
		Username:  u.Username,
		Email:     u.Email,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		IsActive:  u.IsActive,
		IsAdmin:   u.IsAdmin,
		LastLogin: u.LastLogin,
		CreatedAt: u.CreatedAt,
		UpdatedAt: u.UpdatedAt,
	}
}
