# Kiroku (記録)

**Your personal media archive.** Kiroku is a web app that keeps the anime you have watched and plan to watch (and soon manga, books and TV series) in one place, lets you rate and track them, plus a companion browser extension. *Kiroku* means "record, archive" in Japanese.

- **Web app**: browse the archive as cards or a table, filter, rate, and reorder your watchlist with drag and drop.
- **Kiroku Tracker & Kiroku Sync** (Chrome/Firefox extension): marks the episode you are on while watching on streaming sites and adds an anime to your watchlist in one click.

## Features

- **Anime archive**: grid and table views, infinite scroll, name search (`Ctrl K`), genre/format/status/score/episode/series filters, column sorting and editing.
- **Watchlist**: every anime marked "Plan to Watch" lands on the list automatically. Whether it comes from the web UI, the extension or a sync, a DB trigger keeps the list up to date. Drag-and-drop ordering.
- **Profile**: stats (archive, completed, average score), top 10 rated anime, profile and password editing. Personalized recommendations are on the way ([#39](https://github.com/dogukankirali/local-db-app/issues/39)).
- **Accounts**: sign-up/sign-in with JWT, password reset by email (single-use link, valid for 1 hour).
- **AniList sync**: fills in missing details, scores and series relations of archived anime in bulk.
- **Browser extension** (`extension/`, Manifest V3, Chrome & Firefox):
  - **Kiroku Tracker**: pick an anime from AniList, skip counter in the player, season rating, stats and history.
  - **Kiroku Sync**: writes episode progress to Kiroku on MyAnimeList, Anizium, TürkAnime and TRAnimeİzle pages and adds an "Add to Kiroku Watchlist" button.

## Architecture

The whole app runs on **a single Cloudflare Worker** and fits in the free plan: Next.js's static output is served as the Worker's assets, `/api/*` requests hit the Worker code (Hono), and data lives in **D1** (SQLite). It deploys with one command.

```
local-db-app/
├── worker/               # Cloudflare Worker: API (Hono, TypeScript) + D1 + static site
│   ├── src/              # anime, watchlist, user/password reset, AniList sync endpoints
│   ├── migrations/       # D1 schema (including watchlist triggers)
│   ├── scripts/          # pg_dump → D1 import, set password
│   └── wrangler.jsonc    # Worker, D1 and assets settings
├── frontend/             # Next.js 15 (App Router, React 19, MUI 6), static export
│   └── src/
│       ├── app/          # /, /anime, /watchlist, /profile, /login, /register, /forgot-password, /reset-password, ...
│       ├── components/   # App shell (sidebar/topbar), anime grid, table, filters, modals
│       ├── config/       # Navigation definitions
│       ├── theme/        # Color tokens (customTheme.ts) and MUI theme
│       └── Services/     # API clients (axios)
├── extension/            # Kiroku Tracker + Kiroku Sync extension
└── scripts/dev.ps1       # Starts API + frontend with one command on Windows
```

**Tech**: Cloudflare Workers, D1, Hono, TypeScript · Next.js 15, React 19, MUI 6, dnd-kit · AniList GraphQL · Resend (email).

AniList blocks requests coming from Cloudflare Workers, so anime search and the AniList queries in sync run directly from the browser.

## Quick start

### Local development

Requirement: Node.js 20+.

```powershell
./scripts/dev.ps1                         # API (:8787, local D1) + frontend (:3000)
./scripts/dev.ps1 -Import <dump.sql>      # first fills the local D1 from a pg_dump output
```

Manually:

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npx wrangler dev                           # http://localhost:8787/api

cd ../frontend
npm install
npm run dev                                # http://localhost:3000, proxies /api requests to :8787
```

If an old `NEXT_PUBLIC_API_URL=http://localhost:8080` line is left in `frontend/.env.development.local`, delete it; the frontend now uses `/api` on the same origin by default.

### Deploy to Cloudflare

Steps and data migration are in [worker/README.md](worker/README.md). In short:

```bash
cd worker
npx wrangler login
npx wrangler d1 create kiroku              # put the printed database_id into wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put JWT_SECRET_KEY
npm run deploy                             # builds the frontend and publishes the Worker
```

## Password reset and email

- `POST /api/auth/forgot-password` (`{ "email" }`) sends a single-use link valid for 1 hour (`<site>/reset-password?token=...`); only the token's SHA-256 hash is stored in the DB. `POST /api/auth/reset-password` (`{ "token", "password" }`) saves the new password.
- Mail is sent through the [Resend](https://resend.com) HTTP API (Workers cannot open SMTP). Set the key with `npx wrangler secret put RESEND_API_KEY` and the sender with `MAIL_FROM` in `wrangler.jsonc`. In local development without a key, the link is written to the `wrangler dev` log.
- To set a password without mail: `cd worker && npm run set-password -- <username>` (append `--remote` for the DB on Cloudflare).

## Browser extension

**Chrome**: `chrome://extensions` → "Developer mode" → "Load unpacked" → the `extension/` folder.

**Firefox**: `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on" → `extension/manifest.json`.

The extension reads the server address from the popup settings; enter the site address there (e.g. `https://app.dogukankirali.com`). Sign in from the **Kiroku Account** card on the same tab with username/email and password: the extension gets its own key (the password is not stored) and sends it as `Authorization: Bearer` with requests. Keys can be viewed and revoked from the Profile page in Kiroku.

## Manga downloader (extension)

The extension's **Manga İndirici** page (popup → Ayarlar → 📚 Manga İndirici) searches several sources, merges their chapter lists by language preference ("Turkish if available, otherwise English", Turkish only, English only) and saves each chapter as a CBZ with `ComicInfo.xml`; the series folder also gets `series.json` and `cover.jpg` (metadata from AniList, with the MAL ID). Images are stored as they are, without conversion. It runs in the browser so sites see a normal visitor; if a site asks for a bot check, open it once in the same browser.

- **Sources** (`extension/manga/sources.js`): MangaDex (official API, tr/en), Tempest (JuraTempest), Tortuga Çeviri, and the experimental Manga-TR and SadScans. Site logic is adapted from the Keiyoushi extensions (Apache-2.0).
- **Where files go**: in development (the extension's Kiroku address is localhost) to `Downloads/Kiroku/Manga/<Series>/`; otherwise to the user's own server over WebDAV. Browsers cannot speak SFTP, so the server needs WebDAV (e.g. SFTPGo serves the same folder over both). Server details are stored only in that browser, never sent to Kiroku.

## Per-user list

The anime catalog (name, status, episode count, cover, genres, MAL score) is shared by everyone and only the admin changes it. Score, watched episodes, Plan to Watch, notes, watch dates and the watchlist are separate for each user (`user_anime`, `watch_lists.user_id`). Lists require sign-in; since the site bypasses Cloudflare Access for `/api`, the API is closed to anonymous reads.

## Airing tracking and new-episode mail

**Currently off** (the schedule is commented out; it can be run manually from the Actions tab). When on, `.github/workflows/airing.yml` checks airing anime on AniList every 3 hours (it runs on GitHub Actions because AniList blocks Workers): status, episode count, MAL score and next episode are updated; when a new episode is out, users who enabled notifications in their profile and keep the anime on their list get an email (Resend). Setup:

1. Generate a random value and write the same value in two places: `cd worker && npx wrangler secret put CRON_SECRET`, and GitHub → Settings → Secrets and variables → Actions → `KIROKU_CRON_SECRET`.
2. If the site is behind Cloudflare Access, there must be a Bypass rule for `/api`, or create a service token and add the `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` secrets.
3. `RESEND_API_KEY` must be set on the Worker for mail.

The first run only writes the initial values; mail arrives on later runs when a new episode is out.

## API (summary)

All endpoints are under `/api` and paths are kebab-case. 🔑 requires sign-in (JWT or extension key), 🔒 requires an admin. The old camelCase paths (e.g. `/createAnime`) still redirect to their new equivalents for older extension versions.

| Method                  | Path                                            | Description                                                                 |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| POST 🔑                 | `/get-anime-table?page&count&orderBy&order`     | Filtered, paginated anime list (with the signed-in user's score/episode data) |
| GET 🔑                  | `/get-anime-by-id?id`                           | Single anime                                                                |
| GET                     | `/anime-cover?id`                               | Returns the cover stored as base64 in the DB, cacheable                     |
| POST 🔑                 | `/create-anime`                                 | Add an anime (updates it if the name exists); the extension uses this too  |
| POST 🔒                 | `/create-anime-with-file`                       | Bulk add from CSV                                                           |
| POST 🔑                 | `/update-anime-table`                           | Updates your own score/episode/PTW/notes/watch dates; catalog fields too for admins |
| POST 🔑                 | `/my-anime/dates`                               | Start/finish watching date (`StartedAt`, `FinishedAt`: YYYY-MM-DD, empty = clear) |
| DELETE 🔒               | `/delete-anime?id`                              | Delete an anime                                                             |
| POST 🔑                 | `/anime/update-episode`                         | Episode progress from the extension                                         |
| POST 🔑                 | `/update-finished-anime-status`                 | Marks your finished (-1) entries as fully watched                           |
| GET/POST                | `/get-genres`, `/get-series`                    | Genre and series lists                                                      |
| GET 🔒 / POST 🔒        | `/sync/pending`, `/sync/batch`                  | Fill in missing details: the browser searches AniList, the Worker writes the results. `force: true` refreshes a single anime from scratch |
| GET, POST/PUT/DELETE 🔑 | `/watchlist`, `/watchlist/order`                | The user's watchlist (synced with PTW automatically)                        |
| POST                    | `/auth/register`, `/auth/login`                 | Sign up and sign in                                                         |
| POST                    | `/auth/extension-token`                         | Extension sign-in: extension key from username/password                     |
| POST                    | `/auth/forgot-password`, `/auth/reset-password` | Password reset                                                              |
| GET/PUT 🔑              | `/profile` (`/auth/profile`)                    | Profile: name, username, email, avatar, bio, recommendation and notification preferences; changing the password requires the current one |
| GET 🔑                  | `/profile/top-anime?limit=10`                   | Top rated anime                                                             |
| GET 🔑                  | `/profile/recommendations`                      | Genre-based recommendations (if enabled in the profile)                    |
| GET/POST/DELETE 🔑      | `/profile/tokens`                               | List, create and revoke extension keys                                      |
| GET/POST                | `/cron/airing`                                  | Airing tracking (with CRON_SECRET)                                          |
| GET                     | `/healthcheck`                                  | Health check                                                                |

## License

No license has been specified for this project yet.

---

**Kişisel medya arşivin.** Kiroku; izlediğin ve izleyeceğin animeleri (ve yakında manga, kitap, dizileri) tek yerde tutan, puanlayan ve takip eden bir web uygulaması ile ona eşlik eden bir tarayıcı eklentisinden oluşur. *Kiroku* Japoncada "kayıt, arşiv" demektir.

- **Web uygulaması**: arşivi kart ya da tablo görünümünde gez, filtrele, puanla; watchlist'ini sürükle-bırak ile sırala.
- **Kiroku Tracker & Kiroku Sync** (Chrome/Firefox eklentisi): izleme sitelerinde kaldığın bölümü işaretler, bir animeyi tek tıkla watchlist'e ekler.

## Özellikler

- **Anime arşivi**: Kart (grid) ve tablo görünümü, sonsuz kaydırma, isim araması (`Ctrl K`), tür/format/durum/puan/bölüm/seri filtreleri, sütun sıralama ve düzenleme.
- **Watchlist**: "Plan to Watch" işaretli her anime otomatik olarak listeye girer. Web arayüzü, eklenti ya da senkronizasyon fark etmez; DB trigger'ı listeyi her zaman güncel tutar. Sürükle-bırak ile sıralama.
- **Profil**: İstatistikler (arşiv, tamamlanan, ortalama puan), en yüksek puanlı 10 anime, profil ve şifre düzenleme. Kişiye özel öneriler yolda ([#39](https://github.com/dogukankirali/local-db-app/issues/39)).
- **Hesaplar**: JWT ile kayıt/giriş, e-posta ile şifre sıfırlama (tek kullanımlık, 1 saat geçerli bağlantı).
- **AniList senkronizasyonu**: Arşivdeki animelerin eksik bilgilerini, puanlarını ve seri ilişkilerini toplu doldurur.
- **Tarayıcı eklentisi** (`extension/`, Manifest V3, Chrome & Firefox):
  - **Kiroku Tracker**: AniList'ten anime seçimi, oynatıcıda ileri sarma (skip) sayacı, sezon puanlama, istatistik ve geçmiş.
  - **Kiroku Sync**: MyAnimeList, Anizium, TürkAnime ve TRAnimeİzle sayfalarında bölüm ilerlemesini Kiroku'ya yazar, "Add to Kiroku Watchlist" butonu ekler.

## Mimari

Tüm uygulama **tek bir Cloudflare Worker** üzerinde çalışır ve ücretsiz plana sığar: Next.js'in statik çıktısı Worker'ın assets'i olarak sunulur, `/api/*` istekleri Worker koduna (Hono) düşer, veriler **D1**'de (SQLite) tutulur. Tek komutla deploy edilir.

```
local-db-app/
├── worker/               # Cloudflare Worker: API (Hono, TypeScript) + D1 + statik site
│   ├── src/              # anime, watchlist, kullanıcı/şifre sıfırlama, AniList sync uçları
│   ├── migrations/       # D1 şeması (watchlist trigger'ları dahil)
│   ├── scripts/          # pg_dump → D1 aktarımı, şifre belirleme
│   └── wrangler.jsonc    # Worker, D1 ve assets ayarları
├── frontend/             # Next.js 15 (App Router, React 19, MUI 6), statik export
│   └── src/
│       ├── app/          # /, /anime, /watchlist, /profile, /login, /register, /forgot-password, /reset-password, ...
│       ├── components/   # Uygulama kabuğu (sidebar/topbar), anime grid, tablo, filtreler, modallar
│       ├── config/       # Navigasyon tanımları
│       ├── theme/        # Renk token'ları (customTheme.ts) ve MUI teması
│       └── Services/     # API istemcileri (axios)
├── extension/            # Kiroku Tracker + Kiroku Sync eklentisi
└── scripts/dev.ps1       # Windows'ta API + frontend'i tek komutla başlatır
```

**Teknolojiler**: Cloudflare Workers, D1, Hono, TypeScript · Next.js 15, React 19, MUI 6, dnd-kit · AniList GraphQL · Resend (e-posta).

AniList, Cloudflare Workers'tan gelen istekleri engellediği için anime araması ve sync'teki AniList sorguları doğrudan tarayıcıdan yapılır.

## Hızlı başlangıç

### Lokal geliştirme

Gereksinim: Node.js 20+.

```powershell
./scripts/dev.ps1                         # API (:8787, lokal D1) + frontend (:3000)
./scripts/dev.ps1 -Import <dump.sql>      # önce lokal D1'i bir pg_dump çıktısıyla doldurur
```

Elle:

```bash
cd worker
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npx wrangler dev                           # http://localhost:8787/api

cd ../frontend
npm install
npm run dev                                # http://localhost:3000, /api isteklerini :8787'ye yönlendirir
```

`frontend/.env.development.local` içinde eski `NEXT_PUBLIC_API_URL=http://localhost:8080` satırı kaldıysa silin; frontend artık varsayılan olarak aynı origin'deki `/api`'yi kullanır.

### Cloudflare'e deploy

Adımlar ve veri taşıma için [worker/README.md](worker/README.md). Kısaca:

```bash
cd worker
npx wrangler login
npx wrangler d1 create kiroku              # çıkan database_id'yi wrangler.jsonc'ye yaz
npm run db:migrate:remote
npx wrangler secret put JWT_SECRET_KEY
npm run deploy                             # frontend'i derler ve Worker'ı yayınlar
```

## Şifre sıfırlama ve e-posta

- `POST /api/auth/forgot-password` (`{ "email" }`) 1 saat geçerli, tek kullanımlık bir bağlantı gönderir (`<site>/reset-password?token=...`); DB'de token'ın yalnızca SHA-256 özeti tutulur. `POST /api/auth/reset-password` (`{ "token", "password" }`) yeni şifreyi kaydeder.
- Mail, [Resend](https://resend.com) HTTP API'siyle gönderilir (Workers SMTP açamıyor). `npx wrangler secret put RESEND_API_KEY` ile anahtar, `wrangler.jsonc`'deki `MAIL_FROM` ile gönderen tanımlanır. Lokal geliştirmede anahtar yoksa bağlantı `wrangler dev` loguna yazılır.
- Mail olmadan şifre belirlemek için: `cd worker && npm run set-password -- <kullanıcı-adı>` (Cloudflare'deki DB için sonuna `--remote`).

## Tarayıcı eklentisi

**Chrome**: `chrome://extensions` → "Geliştirici modu" → "Paketlenmemiş öğe yükle" → `extension/` klasörü.

**Firefox**: `about:debugging#/runtime/this-firefox` → "Geçici Eklenti Yükle" → `extension/manifest.json`.

Eklenti sunucu adresini popup'taki ayarlardan alır; buraya sitenin adresini yazın (ör. `https://app.dogukankirali.com`). Aynı sekmedeki **Kiroku Hesabı** kartından kullanıcı adı/e-posta ve şifreyle giriş yapılır: eklenti kendine özel bir anahtar alır (şifre saklanmaz) ve isteklerde `Authorization: Bearer` olarak gönderir. Anahtarlar Kiroku'da Profil sayfasından görülüp iptal edilebilir.

## Manga indirici (eklenti)

Eklentinin **Manga İndirici** sayfası (popup → Ayarlar → 📚 Manga İndirici) birden çok kaynakta arar, bölüm listelerini dil tercihine göre birleştirir ("Türkçe varsa Türkçe, yoksa İngilizce", yalnızca Türkçe, yalnızca İngilizce) ve her bölümü `ComicInfo.xml` ile CBZ olarak kaydeder; seri klasörüne `series.json` ve `cover.jpg` da yazılır (bilgiler AniList'ten, MAL ID'siyle). Görseller dönüştürülmeden olduğu gibi saklanır. Tarayıcıda çalıştığı için siteler normal bir ziyaretçi görür; bir site bot doğrulaması isterse aynı tarayıcıda bir kez açmak yeterli.

- **Kaynaklar** (`extension/manga/sources.js`): MangaDex (resmî API, tr/en), Tempest (JuraTempest), Tortuga Çeviri ve deneysel olarak Manga-TR ile SadScans. Site mantığı Keiyoushi eklentilerinden (Apache-2.0) uyarlandı.
- **Kayıt yeri**: geliştirmede (eklentideki Kiroku adresi localhost ise) `İndirilenler/Kiroku/Manga/<Seri>/`; aksi halde kullanıcının kendi sunucusuna WebDAV ile. Tarayıcılar SFTP konuşamadığı için sunucuda WebDAV gerekir (ör. SFTPGo aynı klasörü ikisiyle de sunar). Sunucu bilgileri yalnızca o tarayıcıda saklanır, Kiroku'ya gönderilmez.

## Kullanıcıya özel liste

Anime kataloğu (ad, durum, bölüm sayısı, kapak, türler, MAL puanı) herkes için ortaktır ve yalnızca admin değiştirir. Puan, izlenen bölüm, Plan to Watch, notlar, izleme tarihleri ve watchlist her kullanıcı için ayrıdır (`user_anime`, `watch_lists.user_id`). Listeler giriş ister; site Cloudflare Access'te `/api` için bypass edildiğinden API girişsiz okumaya kapalıdır.

## Yayın takibi ve yeni bölüm maili

**Şu an kapalı** (zamanlama yorum satırında; Actions sekmesinden elle çalıştırılabilir). Açıldığında `.github/workflows/airing.yml` her 3 saatte bir yayındaki animeleri AniList'ten kontrol eder (AniList Workers'ı engellediği için GitHub Actions'ta çalışır): durum, bölüm sayısı, MAL puanı ve sıradaki bölüm güncellenir; yeni bölüm çıkınca, profilinde bildirimi açan ve animeyi listesinde tutan kullanıcılara mail atılır (Resend). Kurulum:

1. Rastgele bir değer üret ve iki yere aynısını yaz: `cd worker && npx wrangler secret put CRON_SECRET`, GitHub → Settings → Secrets and variables → Actions → `KIROKU_CRON_SECRET`.
2. Site Cloudflare Access arkasındaysa `/api` için Bypass kuralı olmalı ya da bir service token oluşturup `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` secret'larını ekle.
3. Mail için Worker'da `RESEND_API_KEY` tanımlı olmalı.

İlk çalıştırma yalnızca başlangıç değerlerini yazar; mail sonraki çalıştırmalarda yeni bölüm çıkınca gelir.

## API (özet)

Tüm uçlar `/api` altındadır ve yollar kebab-case'tir. 🔑 giriş (JWT ya da eklenti anahtarı), 🔒 admin girişi ister. Eski camelCase yollar (ör. `/createAnime`) eski eklenti sürümleri için yeni karşılıklarına yönlenmeye devam eder.

| Yöntem                  | Yol                                             | Açıklama                                                                    |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| POST 🔑                 | `/get-anime-table?page&count&orderBy&order`     | Filtrelenmiş ve sayfalanmış anime listesi (giriş yapan kullanıcının puan/bölüm verisiyle) |
| GET 🔑                  | `/get-anime-by-id?id`                           | Tek anime                                                                   |
| GET                     | `/anime-cover?id`                               | DB'de base64 saklanan kapağı cache'lenebilir döner                          |
| POST 🔑                 | `/create-anime`                                 | Anime ekleme (aynı isim varsa günceller); eklenti de bunu kullanır          |
| POST 🔒                 | `/create-anime-with-file`                       | CSV ile toplu ekleme                                                        |
| POST 🔑                 | `/update-anime-table`                           | Kendi puan/bölüm/PTW/not/izleme tarihlerini günceller; admin katalog alanlarını da |
| POST 🔑                 | `/my-anime/dates`                               | İzlemeye başlama/bitirme tarihi (`StartedAt`, `FinishedAt`: YYYY-AA-GG, boş = sil) |
| DELETE 🔒               | `/delete-anime?id`                              | Anime silme                                                                 |
| POST 🔑                 | `/anime/update-episode`                         | Eklentiden bölüm ilerlemesi                                                 |
| POST 🔑                 | `/update-finished-anime-status`                 | Bitti (-1) işaretli kayıtlarını tüm bölümleri izlenmiş yapar                |
| GET/POST                | `/get-genres`, `/get-series`                    | Tür ve seri listeleri                                                       |
| GET 🔒 / POST 🔒        | `/sync/pending`, `/sync/batch`                  | Eksik bilgileri doldurma: tarayıcı AniList'te arar, Worker sonuçları yazar. `force: true` tek animeyi baştan yeniler |
| GET, POST/PUT/DELETE 🔑 | `/watchlist`, `/watchlist/order`                | Kullanıcının watchlist'i (PTW ile otomatik senkron)                         |
| POST                    | `/auth/register`, `/auth/login`                 | Kayıt ve giriş                                                              |
| POST                    | `/auth/extension-token`                         | Eklenti girişi: kullanıcı adı/şifre ile eklenti anahtarı                    |
| POST                    | `/auth/forgot-password`, `/auth/reset-password` | Şifre sıfırlama                                                             |
| GET/PUT 🔑              | `/profile` (`/auth/profile`)                    | Profil: ad, kullanıcı adı, e-posta, avatar, bio, öneri ve bildirim tercihleri; şifre değişikliği mevcut şifre ister |
| GET 🔑                  | `/profile/top-anime?limit=10`                   | En yüksek puanlı animeler                                                   |
| GET 🔑                  | `/profile/recommendations`                      | Tür tabanlı öneriler (profilde açıksa)                                      |
| GET/POST/DELETE 🔑      | `/profile/tokens`                               | Eklenti anahtarlarını listele, oluştur, iptal et                            |
| GET/POST                | `/cron/airing`                                  | Yayın takibi (CRON_SECRET ile)                                              |
| GET                     | `/healthcheck`                                  | Durum kontrolü                                                              |

## Lisans

Bu proje için henüz bir lisans belirtilmemiştir.
