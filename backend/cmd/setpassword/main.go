// setpassword, bir kullanıcının şifresini backend'in kendi bcrypt hash'i ile doğrudan DB'de günceller.
// Şifre stdin'den okunur; komut satırında, logda ya da çıktıda görünmez.
//
// Kullanım (backend klasöründen, .env'deki DB'ye bağlanır):
//
//	go run ./cmd/setpassword -user Spoon
//
// ENV=development değilse (ör. prod DB'ye bağlanırken) ayrıca -confirm gerekir.
package main

import (
	"bufio"
	"flag"
	"fmt"
	"local-db-app/auth"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	username := flag.String("user", "", "şifresi değişecek kullanıcı adı")
	confirm := flag.Bool("confirm", false, "ENV=development dışında çalıştırmak için onay")
	flag.Parse()
	if *username == "" {
		log.Fatal("-user gerekli")
	}

	_ = godotenv.Load()
	if os.Getenv("ENV") != "development" && !*confirm {
		log.Fatalf("ENV=%q: development dışı bir DB'de çalıştırmak için -confirm ekleyin", os.Getenv("ENV"))
	}

	fmt.Fprint(os.Stderr, "Yeni şifre (stdin): ")
	line, err := bufio.NewReader(os.Stdin).ReadString('\n')
	if err != nil && line == "" {
		log.Fatalf("şifre okunamadı: %v", err)
	}
	password := strings.TrimRight(line, "\r\n")
	if len(password) < 6 {
		log.Fatal("şifre en az 6 karakter olmalı")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		log.Fatalf("veritabanı: %v", err)
	}

	hashed, err := auth.HashPassword(password)
	if err != nil {
		log.Fatalf("hash: %v", err)
	}
	res := db.Table("users").Where("LOWER(username) = LOWER(?) AND deleted_at IS NULL", *username).
		Updates(map[string]interface{}{"password": hashed, "reset_password_token": "", "reset_password_expires": nil})
	if res.Error != nil {
		log.Fatalf("güncellenemedi: %v", res.Error)
	}
	if res.RowsAffected == 0 {
		log.Fatalf("%q kullanıcısı bulunamadı", *username)
	}
	fmt.Fprintf(os.Stderr, "\n%q kullanıcısının şifresi güncellendi.\n", *username)
}
