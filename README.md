# Kiroku (記録)

**Kişisel medya arşivin.** Kiroku; izlediğin ve izleyeceğin animeleri (ve yakında manga, kitap, dizileri) tek yerde tutan, puanlayan ve takip eden bir web uygulaması ile ona eşlik eden bir tarayıcı eklentisinden oluşur. *Kiroku* Japoncada "kayıt, arşiv" demektir.

- **Web uygulaması**: arşivi kart ya da tablo görünümünde gez, filtrele, puanla; watchlist'ini sürükle-bırak ile sırala.
- **Kiroku Tracker & Kiroku Sync** (Chrome/Firefox eklentisi): izleme sitelerinde kaldığın bölümü işaretler, bir animeyi tek tıkla watchlist'e ekler.

## Özellikler

- **Anime arşivi**: Kart (grid) ve tablo görünümü, sonsuz kaydırma, isim araması (`Ctrl K`), tür/format/durum/puan/bölüm/seri filtreleri, sütun sıralama ve düzenleme.
- **Watchlist**: "Plan to Watch" işaretli her anime otomatik olarak listeye girer. Web arayüzü, eklenti ya da MAL senkronizasyonu fark etmez; DB trigger'ı listeyi her zaman güncel tutar. Sürükle-bırak ile sıralama.
- **Profil**: İstatistikler (arşiv, tamamlanan, ortalama puan), en yüksek puanlı 10 anime, profil ve şifre düzenleme. Kişiye özel öneriler yolda ([#39](https://github.com/dogukankirali/local-db-app/issues/39)).
- **Hesaplar**: JWT ile kayıt/giriş, e-posta ile şifre sıfırlama (tek kullanımlık, 1 saat geçerli bağlantı).
- **MAL/Jikan senkronizasyonu**: Arşivdeki animelerin bilgilerini, puanlarını ve seri ilişkilerini toplu günceller.
- **Tarayıcı eklentisi** (`extension/`, Manifest V3, Chrome & Firefox):
  - **Kiroku Tracker**: AniList'ten anime seçimi, oynatıcıda ileri sarma (skip) sayacı, sezon puanlama, istatistik ve geçmiş.
  - **Kiroku Sync**: MyAnimeList, Anizium, TürkAnime ve TRAnimeİzle sayfalarında bölüm ilerlemesini backend'e yazar, "Add to Kiroku Watchlist" butonu ekler.

## Mimari

```
local-db-app/
├── frontend/             # Next.js 15 (App Router, React 19, MUI 6) — Cloudflare Pages (next-on-pages)
│   └── src/
│       ├── app/          # /, /anime, /watchlist, /profile, /login, /register, /forgot-password, /reset-password, ...
│       ├── components/   # Uygulama kabuğu (sidebar/topbar), anime grid, tablo, filtreler, modallar
│       ├── config/       # Navigasyon tanımları
│       ├── theme/        # Renk token'ları (customTheme.ts) ve MUI teması
│       └── Services/     # API istemcileri (axios)
├── backend/              # Go REST API (gorilla/mux + GORM + PostgreSQL) — Cloud Run
│   ├── auth/             # JWT, bcrypt, şifre sıfırlama token'ları
│   ├── email/            # SMTP gönderimi (STARTTLS / TLS)
│   ├── functions/        # Anime, watchlist, kullanıcı, MAL senkronizasyonu handler'ları
│   ├── middleware/       # Auth / admin middleware
│   ├── models/           # GORM modelleri
│   ├── cmd/devseed/      # Lokal DB'yi bir API'den doldurma aracı
│   ├── cmd/setpassword/  # Kullanıcı şifresini doğrudan DB'de belirleme aracı
│   └── main.go           # Route'lar, DB başlangıcı (şema + watchlist trigger'ı)
├── extension/            # Kiroku Tracker + Kiroku Sync eklentisi
├── db/seed/              # docker compose ilk açılışta buradaki .sql dump'larını yükler
├── scripts/dev.ps1       # Windows'ta DB + backend + frontend'i tek komutla başlatır
└── docker-compose.yaml   # PostgreSQL + backend + frontend
```

**Teknolojiler**: Go 1.26, gorilla/mux, GORM, PostgreSQL 17 · Next.js 15, React 19, TypeScript, MUI 6, dnd-kit · Cloudflare Pages (frontend), Google Cloud Run (backend).

## Hızlı başlangıç

### Docker ile (önerilen)

```bash
cp .env.example .env        # gerekirse şifre, JWT ve SMTP ayarlarını düzenle
docker compose up --build
```

PostgreSQL (`5432`), backend (`8080`) ve frontend (`3000`) ayağa kalkar. Backend boş bir DB'de şemayı kendisi kurar. Mevcut verilerle başlamak için bir `pg_dump` çıktısını `db/seed/` altına `.sql` olarak koy; DB ilk oluşturulurken yüklenir (dump'lar git'e girmez). Yeniden yüklemek için `docker compose down -v`.

### Lokal geliştirme (Windows, Docker'sız)

`scripts/dev.ps1` sırasıyla PostgreSQL'i, Go backend'i (`:8080`) ve Next.js'i (`:3000`) başlatır:

```powershell
./scripts/dev.ps1          # DB + backend + frontend
./scripts/dev.ps1 -Seed    # önce lokal DB'yi prod API'deki verilerle doldurur (ID'ler korunur)
```

Script, Go ve PostgreSQL'i PATH'te ya da `%LOCALAPPDATA%\devtools` altında (`go/`, `pgsql/`, `pgdata/`) arar. `go run ./cmd/devseed -source <api-url>` yalnızca `ENV=development` iken çalışır, lokal anime tablolarını silip yeniden yazar ve kaynağa yalnızca okuma isteği atar.

### Elle kurulum

Gereksinimler: Go 1.26+, Node.js 20+, PostgreSQL.

```bash
# Backend
cd backend
cp .env.example .env       # DB, JWT ve SMTP ayarlarını doldur
go run .

# Frontend
cd frontend
npm install
npm run dev
```

- `ENV=development` iken backend sertifikasız HTTP ile çalışır (HTTPS için `DEV_TLS=true` + `server.crt`/`server.key`). `ENV=production` da HTTP'dir; TLS'i Cloud Run sonlandırır.
- Frontend backend adresini `NEXT_PUBLIC_API_URL`'den okur. `npm run dev` sırasında `.env.development.local`, `.env.local`'ın önüne geçer; prod adresi `.env.local`'da kalırken lokalde `NEXT_PUBLIC_API_URL=http://localhost:8080` kullanılabilir.

## Şifre sıfırlama ve e-posta

- `POST /auth/forgot-password` (`{ "email" }`) 1 saat geçerli, tek kullanımlık bir bağlantı gönderir (`APP_URL/reset-password/<token>`); DB'de token'ın yalnızca SHA-256 özeti tutulur. `POST /auth/reset-password` (`{ "token", "password" }`) yeni şifreyi kaydeder.
- Gönderim için backend'de `SMTP_HOST`, `SMTP_PORT` (587 STARTTLS / 465 TLS), `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` tanımlı olmalı. `ENV=development` iken SMTP boşsa bağlantı backend loguna yazılır.
- Mail olmadan şifre belirlemek için (şifre stdin'den okunur, hiçbir yere yazılmaz):

  ```bash
  cd backend
  go run ./cmd/setpassword -user <kullanici>            # .env'deki DB, ENV=development
  go run ./cmd/setpassword -user <kullanici> -confirm   # development dışı (ör. prod) DB'de
  ```

## Tarayıcı eklentisi

**Chrome**: `chrome://extensions` → "Geliştirici modu" → "Paketlenmemiş öğe yükle" → `extension/` klasörü.

**Firefox**: `about:debugging#/runtime/this-firefox` → "Geçici Eklenti Yükle" → `extension/manifest.json`.

Eklenti backend adresini popup'taki ayarlardan alır.

## API (özet)

| Yöntem              | Yol                                         | Açıklama                                          |
| ------------------- | ------------------------------------------- | ------------------------------------------------- |
| POST                | `/getAnimeTable?page&count&orderBy&order`   | Filtrelenmiş ve sayfalanmış anime listesi         |
| GET                 | `/getAnimeById?id`                          | Tek anime                                         |
| GET                 | `/animeCover?id`                            | DB'de base64 saklanan kapağı cache'lenebilir döner |
| POST                | `/createAnime`, `/createAnimeWithFile`      | Anime ekleme (aynı isim varsa günceller) / CSV    |
| POST                | `/updateAnimeTable`                         | Anime güncelleme                                  |
| DELETE              | `/deleteAnime?id`                           | Anime silme                                       |
| POST                | `/api/anime/update-episode`                 | Eklentiden bölüm ilerlemesi                       |
| GET/POST            | `/getGenres`, `/getSeries`                  | Tür ve seri listeleri                             |
| GET (SSE)           | `/syncAnimeData`, `/cancelSync`             | MAL/Jikan senkronizasyonu                         |
| GET                 | `/getAnime`, `/getManga`                    | MAL üzerinden arama                               |
| GET/POST/PUT/DELETE | `/watchlist`, `/watchlist/order`            | Watchlist (PTW ile otomatik senkron)              |
| POST                | `/auth/register`, `/auth/login`             | Kayıt ve giriş                                    |
| POST                | `/auth/forgot-password`, `/auth/reset-password` | Şifre sıfırlama                               |
| GET/PUT             | `/auth/profile`                             | Profil (JWT); şifre değişikliği mevcut şifre ister |
| GET                 | `/healthcheck`                              | Durum kontrolü                                    |

## Lisans

Bu proje için henüz bir lisans belirtilmemiştir.
