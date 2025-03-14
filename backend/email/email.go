package email

import (
	"fmt"
	"net/smtp"
	"os"
)

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

// SendEmail, belirtilen alıcıya e-posta gönderir
func SendEmail(to, subject, body string) error {
	config := GetEmailConfig()

	// SMTP sunucu adresi
	addr := fmt.Sprintf("%s:%s", config.Host, config.Port)

	// Kimlik doğrulama
	auth := smtp.PlainAuth("", config.Username, config.Password, config.Host)

	// E-posta başlıkları
	headers := make(map[string]string)
	headers["From"] = config.From
	headers["To"] = to
	headers["Subject"] = subject
	headers["MIME-Version"] = "1.0"
	headers["Content-Type"] = "text/html; charset=UTF-8"

	// E-posta içeriğini oluştur
	message := ""
	for key, value := range headers {
		message += fmt.Sprintf("%s: %s\r\n", key, value)
	}
	message += "\r\n" + body

	// E-postayı gönder
	err := smtp.SendMail(addr, auth, config.From, []string{to}, []byte(message))
	if err != nil {
		return err
	}

	return nil
}

// SendPasswordResetEmail, şifre sıfırlama e-postası gönderir
func SendPasswordResetEmail(to, token, appURL string) error {
	subject := "Şifre Sıfırlama"
	resetURL := fmt.Sprintf("%s/reset-password/%s", appURL, token)

	// HTML formatında e-posta içeriği
	body := fmt.Sprintf(`
	<html>
	<head>
		<style>
			body { font-family: Arial, sans-serif; line-height: 1.6; }
			.container { max-width: 600px; margin: 0 auto; padding: 20px; }
			.button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; }
			.footer { margin-top: 30px; font-size: 12px; color: #777; }
		</style>
	</head>
	<body>
		<div class="container">
			<h2>Şifre Sıfırlama İsteği</h2>
			<p>Merhaba,</p>
			<p>Hesabınız için bir şifre sıfırlama isteği aldık. Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
			<p><a href="%s" class="button">Şifremi Sıfırla</a></p>
			<p>Ya da aşağıdaki bağlantıyı tarayıcınıza kopyalayın:</p>
			<p>%s</p>
			<p>Bu bağlantı 1 saat boyunca geçerlidir.</p>
			<p>Eğer bu isteği siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
			<div class="footer">
				<p>Bu e-posta, Local DB App tarafından gönderilmiştir.</p>
			</div>
		</div>
	</body>
	</html>
	`, resetURL, resetURL)

	return SendEmail(to, subject, body)
}
