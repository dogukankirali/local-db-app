# Base image
FROM --platform=linux/arm64 golang:1.23-alpine

# Çalışma dizinini ayarla
WORKDIR /app

# Gerekli sistem paketlerini yükle
RUN apk add --no-cache git gcc musl-dev

# Go modüllerini kopyala
COPY go.mod go.sum ./

# Bağımlılıkları yükle (go get yerine)
RUN go mod download

# Tüm kaynak kodları kopyala
COPY . .

# ARM64 için build
RUN GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o main .

# Portu aç
EXPOSE 8080

# Uygulamayı çalıştır
CMD ["./main"]
