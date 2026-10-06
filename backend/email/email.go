package email

import (
	"crypto/tls"
	"errors"
	"fmt"
	"log"
	"mime"
	"net"
	"net/smtp"
	"os"
	"strings"
	"time"
)

// ErrNotConfigured, SMTP ayarları eksikken döner
var ErrNotConfigured = errors.New("smtp yapılandırılmamış (SMTP_HOST/SMTP_PORT/SMTP_FROM)")

// EmailConfig, e-posta gönderme yapılandırmasını tutar
type EmailConfig struct {
	Host     string
	Port     string
	Username string
	Password string
	From     string
}

// GetEmailConfig, e-posta yapılandırmasını çevre değişkenlerinden alır
func GetEmailConfig() EmailConfig {
	return EmailConfig{
		Host:     os.Getenv("SMTP_HOST"),
		Port:     os.Getenv("SMTP_PORT"),
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
		From:     os.Getenv("SMTP_FROM"),
	}
}

// Configured, gönderim için gerekli alanların dolu olup olmadığını söyler
func (c EmailConfig) Configured() bool {
	return c.Host != "" && c.Port != "" && c.From != ""
}

func buildMessage(from, to, subject, body string) []byte {
	headers := []string{
		"From: " + from,
		"To: " + to,
		// Türkçe karakterler için RFC 2047 kodlaması
		"Subject: " + mime.QEncoding.Encode("utf-8", subject),
		"Date: " + time.Now().Format(time.RFC1123Z),
		"MIME-Version: 1.0",
		"Content-Type: text/html; charset=UTF-8",
		"Content-Transfer-Encoding: 8bit",
	}
	return []byte(strings.Join(headers, "\r\n") + "\r\n\r\n" + body)
}

// SendEmail, belirtilen alıcıya HTML e-posta gönderir.
// 465 portunda doğrudan TLS, diğer portlarda (587/25) STARTTLS kullanılır.
func SendEmail(to, subject, body string) error {
	config := GetEmailConfig()
	if !config.Configured() {
		return ErrNotConfigured
	}

	addr := net.JoinHostPort(config.Host, config.Port)
	msg := buildMessage(config.From, to, subject, body)
	var auth smtp.Auth
	if config.Username != "" {
		auth = smtp.PlainAuth("", config.Username, config.Password, config.Host)
	}

	if config.Port != "465" {
		// smtp.SendMail sunucu destekliyorsa STARTTLS'e geçer
		return smtp.SendMail(addr, auth, config.From, []string{to}, msg)
	}

	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: config.Host, MinVersion: tls.VersionTLS12})
	if err != nil {
		return err
	}
	client, err := smtp.NewClient(conn, config.Host)
	if err != nil {
		return err
	}
	defer client.Close()
	if auth != nil {
		if err := client.Auth(auth); err != nil {
			return err
		}
	}
	if err := client.Mail(config.From); err != nil {
		return err
	}
	if err := client.Rcpt(to); err != nil {
		return err
	}
	w, err := client.Data()
	if err != nil {
		return err
	}
	if _, err := w.Write(msg); err != nil {
		return err
	}
	if err := w.Close(); err != nil {
		return err
	}
	return client.Quit()
}

// SendPasswordResetEmail, şifre sıfırlama e-postası gönderir.
// SMTP ayarlı değilse ve ENV=development ise bağlantı yalnızca sunucu loguna yazılır.
func SendPasswordResetEmail(to, token, appURL string) error {
	resetURL := fmt.Sprintf("%s/reset-password/%s", strings.TrimRight(appURL, "/"), token)

	if !GetEmailConfig().Configured() {
		if os.Getenv("ENV") == "development" {
			log.Printf("[dev] SMTP ayarlı değil; %s için şifre sıfırlama bağlantısı: %s", to, resetURL)
			return nil
		}
		return ErrNotConfigured
	}

	subject := "Şifre Sıfırlama"
	body := fmt.Sprintf(`<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#0B0D12;font-family:Inter,Segoe UI,Arial,sans-serif;color:#E7E9EE">
  <div style="max-width:520px;margin:0 auto;background:#12161E;border:1px solid #232938;border-radius:16px;padding:28px">
    <h2 style="margin:0 0 12px;font-size:20px">Şifre sıfırlama isteği</h2>
    <p style="color:#8A93A6;line-height:1.6">Hesabın için bir şifre sıfırlama isteği aldık. Yeni şifre belirlemek için aşağıdaki butona tıkla:</p>
    <p style="margin:24px 0"><a href="%s" style="display:inline-block;padding:12px 20px;background:#7C5CFF;color:#fff;text-decoration:none;border-radius:10px;font-weight:600">Şifremi sıfırla</a></p>
    <p style="color:#8A93A6;font-size:13px;line-height:1.6">Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:<br><span style="color:#A895FF;word-break:break-all">%s</span></p>
    <p style="color:#5B6478;font-size:12px;margin-top:24px">Bağlantı 1 saat geçerlidir. Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.</p>
  </div>
</body>
</html>`, resetURL, resetURL)

	return SendEmail(to, subject, body)
}
