# Local DB App — Anime/Manga Takip Uygulaması

Kişisel anime, manga, kitap ve dizi izleme/okuma listelerini tek bir yerden yönetmek için geliştirilmiş full-stack bir uygulama. MyAnimeList (Jikan API) ile senkronize olabilir, izleme listeni (watchlist) sürükle-bırak ile sıralayabilir ve Chrome/Firefox eklentileri sayesinde izlediğin bölümü takip ettiğin sitelerden otomatik olarak işaretleyebilirsin.

## Özellikler

- **Anime/manga veritabanı**: Anime ve manga kayıtlarını (isim, tür, bölüm sayısı, puan, kapak görseli, seri bilgisi, izleme durumu vb.) filtreleyip sayfalanmış tablo halinde listeleme, ekleme, güncelleme ve silme.
- **AniList & MAL entegrasyonu**: AniList GraphQL API üzerinden güvenilir anime/manga verisi çekme ve arama.
- **Watchlist (izleme listesi)**: "Plan to Watch" listesine ekleme/çıkarma, sürükle-bırak ile sıralama ve MAL planından otomatik senkronizasyon.
- **Kullanıcı hesapları**: JWT tabanlı kayıt/giriş, profil görüntüleme/güncelleme ve şifre sıfırlama (e-posta ile).
- **Tarayıcı eklentisi (AniTracker Pro & AniSyncer - Chrome & Firefox)**:
  - **Tracker Tabı**: AniList üzerinden anime seçimi, video oynarken sağ yön tuşu ile skip tespiti ve otomatik sezon puanlama algoritması, istatistikler ve izleme geçmişi.
  - **AniSyncer Tabı**: MyAnimeList, Anizium, TürkAnime ve TRAnimeİzle sitelerinde bölüm ve watchlist durumunu algılayıp backend servisine senkronize eder.
- **Seri (series) yönetimi**: Birden çok anime/manga kaydını bir seri altında gruplama.

## Proje Yapısı

```
local-db-app/
├── backend/              # Go (Gorilla Mux + GORM + PostgreSQL) REST API
│   ├── auth/             # JWT, şifre hash'leme, şifre sıfırlama
│   ├── email/             # E-posta gönderimi
│   ├── functions/        # Anime, manga, kullanıcı, watchlist, AniList entegrasyonu
│   ├── handlers/         # HTTP handler'ları
│   ├── middleware/       # Auth/Admin middleware
│   ├── migrations/       # Basit Go tabanlı migration betikleri
│   ├── models/           # GORM modelleri
│   └── main.go           # Uygulama giriş noktası, route tanımları
├── frontend/             # Next.js 15 (React 19, MUI, Tailwind) arayüzü
│   └── src/
│       ├── app/           # anime, manga, book, series, watchlist, login, register, profile sayfaları
│       ├── components/    # Tablo, modal, senkronizasyon ve ortak bileşenler
│       ├── services/      # Backend API istemcileri (Axios)
│       └── ...
├── extension/            # AniTracker Pro + AniSyncer birleşik eklentisi (Chrome & Firefox - Manifest V3)
├── chrome-extension/     # Eski Chrome eklentisi (arşiv)
├── firefox-extension/    # Eski Firefox eklentisi (arşiv)
└── docker-compose.yaml   # Backend + frontend için Docker Compose tanımı
```

## Teknolojiler

**Backend**

- Go 1.21, [Gorilla Mux](https://github.com/gorilla/mux), [GORM](https://gorm.io/) + PostgreSQL
- JWT tabanlı kimlik doğrulama ([golang-jwt](https://github.com/golang-jwt/jwt))
- [AniList GraphQL API](https://graphql.anilist.co) entegrasyonu
- TLS ile HTTPS servis (geliştirme sertifikaları `server.crt` / `server.key`)

**Frontend**

- Next.js 15, React 19, TypeScript
- Material UI (MUI) ve Tailwind CSS
- `@dnd-kit` ile sürükle-bırak sıralama
- Axios ile API istekleri

**Tarayıcı Eklentisi**

- Chrome ve Firefox ile tam uyumlu Manifest V3 birleşik eklenti (`extension/`)
- AniTracker (bölüm içi skip takibi, puanlama ve istatistik) + AniSyncer (siteler arası backend izleme durumu güncellemesi)

## Kurulum

### Gereksinimler

- Go 1.21+
- Node.js 18+ ve npm
- PostgreSQL veritabanı

### Backend

```bash
cd backend
cp .env.example .env   # veya .env dosyasını elle oluşturup aşağıdaki değişkenleri doldurun
go mod download
go run main.go
```

`.env` dosyasında beklenen değişkenler:

```
PORT=8080
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=local_db_app
ENV=development
REACT_APP_PATH=
JWT_SECRET_KEY=your-secret-key
```

`ENV=development` iken uygulama `backend/server.crt` ve `backend/server.key` sertifikalarını kullanarak HTTPS üzerinden ayağa kalkar (üretimde `/etc/ssl/certs/` altındaki sertifikalar kullanılır).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env` içinde backend adresini gösteren değişken bulunmalı:

```
NEXT_PUBLIC_API_URL=https://localhost:8080
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışır.

### Docker ile çalıştırma

```bash
docker compose up --build
```

`docker-compose.yaml`, backend'i `8080` ve frontend'i `3000` portunda ayağa kaldırır. (Docker ile çalıştırmadan önce PostgreSQL'e ayrıca erişim sağlanmalıdır.)

### Tarayıcı eklentisini yükleme

**Chrome**

1. `chrome://extensions` sayfasını açın ve "Geliştirici modu"nu etkinleştirin.
2. "Paketlenmemiş öğe yükle" ile `chrome-extension/` klasörünü seçin.

**Firefox**

1. `about:debugging#/runtime/this-firefox` sayfasını açın.
2. "Geçici Eklenti Yükle" ile `firefox-extension/manifest.json` dosyasını seçin.

## API Uç Noktaları (özet)

| Yöntem              | Yol                                       | Açıklama                                        |
| ------------------- | ----------------------------------------- | ----------------------------------------------- |
| GET                 | `/getAnimeTable`                          | Filtrelenmiş/sayfalanmış anime listesi          |
| POST                | `/createAnime`, `/createAnimeWithFile`    | Yeni anime kaydı ekleme                         |
| POST                | `/updateAnimeTable`                       | Anime kaydını güncelleme                        |
| DELETE              | `/deleteAnime`                            | Anime kaydını silme                             |
| GET                 | `/getGenres`, `/getSeries`                | Tür ve seri listeleri                           |
| POST                | `/syncAnimeData`                          | MyAnimeList ile senkronizasyon başlatma         |
| POST                | `/cancelSync`, `/resetSyncState`          | Senkronizasyonu iptal etme / sıfırlama          |
| GET                 | `/getAnime`, `/getManga`, `/getAnimeById` | MAL üzerinden anime/manga arama                 |
| POST                | `/auth/register`, `/auth/login`           | Kullanıcı kaydı ve girişi                       |
| GET/PUT             | `/auth/profile`                           | Kullanıcı profili (JWT korumalı)                |
| GET/POST/PUT/DELETE | `/watchlist`                              | İzleme listesi işlemleri                        |
| POST                | `/watchlist/sync`                         | MAL "Plan to Watch" listesiyle otomatik senkron |
| GET                 | `/healthcheck`                            | Servis durum kontrolü                           |

## Lisans

Bu proje için henüz bir lisans belirtilmemiştir.
