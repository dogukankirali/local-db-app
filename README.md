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
├── db/seed/             # docker compose ilk açılışta buradaki .sql dump'larını yükler
└── docker-compose.yaml   # PostgreSQL + backend + frontend için Docker Compose tanımı
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

`ENV=development` iken backend sertifika gerektirmeden HTTP üzerinden ayağa kalkar. HTTPS gerekiyorsa `DEV_TLS=true` verip `backend/server.crt` ve `backend/server.key` sağlayın. `ENV=production` da HTTP ile çalışır (TLS'i Cloud Run sonlandırır).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend backend adresini `NEXT_PUBLIC_API_URL` değişkeninden okur. Next.js `npm run dev` sırasında `.env.development.local` dosyasını `.env.local`'a tercih eder. Böylece prod adresi `.env.local`'da kalırken lokalde şu değer kullanılır:

```
# frontend/.env.development.local
NEXT_PUBLIC_API_URL=http://localhost:8080
```

Uygulama varsayılan olarak [http://localhost:3000](http://localhost:3000) adresinde çalışır.

### Lokal geliştirme (tek komut)

`scripts/dev.ps1` sırasıyla PostgreSQL'i, Go backend'i (`:8080`) ve Next.js'i (`:3000`) başlatır:

```powershell
./scripts/dev.ps1          # DB + backend + frontend
./scripts/dev.ps1 -Seed    # önce lokal DB'yi prod API'deki verilerle doldurur (ID'ler korunur)
```

Script, Go ve PostgreSQL ikililerini PATH'te ya da `%LOCALAPPDATA%\devtools` altında (`go/`, `pgsql/`, `pgdata/`) arar. Lokal DB yalnızca `ENV=development` iken `go run ./cmd/devseed -source <api-url>` ile doldurulabilir. Bu işlem lokal anime tablolarını silip yeniden yazar; kaynak API'ye yalnızca okuma isteği atılır.

### Şifre sıfırlama ve şifre değiştirme

- `POST /auth/forgot-password` (`{ "email": "..." }`) e-postaya 1 saat geçerli, tek kullanımlık bir bağlantı gönderir (`APP_URL/reset-password/<token>`); DB'de token'ın yalnızca SHA-256 özeti tutulur. `POST /auth/reset-password` (`{ "token", "password" }`) yeni şifreyi kaydeder.
- Gönderim için backend'de `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS / 465 TLS), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` tanımlı olmalı (Cloud Run ortam değişkenleri). `ENV=development` iken SMTP boşsa bağlantı backend loguna yazılır.
- Mail olmadan doğrudan şifre belirlemek için (şifre stdin'den okunur, hiçbir yere yazılmaz):

  ```bash
  cd backend
  go run ./cmd/setpassword -user <kullanici>            # .env'deki DB, ENV=development
  go run ./cmd/setpassword -user <kullanici> -confirm   # development dışı (ör. prod) DB'de
  ```

### Docker ile çalıştırma

```bash
cp .env.example .env        # gerekirse şifre, JWT ve SMTP ayarlarını düzenle
docker compose up --build
```

Tek komutla PostgreSQL (`5432`), backend (`8080`) ve frontend (`3000`) ayağa kalkar. Backend, DB hazır olmadan başlamaz; boş bir DB'de şemayı kendisi oluşturur.

Mevcut verilerle başlamak için `pg_dump` çıktısını `db/seed/` altına `.sql` olarak koy; DB ilk kez oluşturulurken otomatik yüklenir. Dump'lar git'e girmez. Yeniden yüklemek için `docker compose down -v` ile volume'ü sil.

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
