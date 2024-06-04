# İlk aşama: Üretim için build yap
FROM --platform=arm64 golang:1.20-alpine

WORKDIR /app

COPY ./functions ./functions
COPY ./models ./models
COPY go.mod .
COPY go.sum .
COPY main.go .

RUN go get
RUN go build -o bin .
RUN mkdir -p /etc/ssl/certs

EXPOSE 3007

# NGINX'i başlat
CMD ["/app/bin"]
