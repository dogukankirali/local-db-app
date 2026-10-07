# Kiroku (記録)

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

## Kullanıcıya özel liste

Anime kataloğu (ad, durum, bölüm sayısı, kapak, türler, MAL puanı) herkes için ortaktır ve yalnızca admin değiştirir. Puan, izlenen bölüm, Plan to Watch, notlar ve watchlist her kullanıcı için ayrıdır (`user_anime`, `watch_lists.user_id`). Listeler giriş ister; site Cloudflare Access'te `/api` için bypass edildiğinden API girişsiz okumaya kapalıdır.

## Yayın takibi ve yeni bölüm maili

**Şu an kapalı** (zamanlama yorum satırında; Actions sekmesinden elle çalıştırılabilir). Açıldığında `.github/workflows/airing.yml` her 3 saatte bir yayındaki animeleri AniList'ten kontrol eder (AniList Workers'ı engellediği için GitHub Actions'ta çalışır): durum, bölüm sayısı, MAL puanı ve sıradaki bölüm güncellenir; yeni bölüm çıkınca, profilinde bildirimi açan ve animeyi listesinde tutan kullanıcılara mail atılır (Resend). Kurulum:

1. Rastgele bir değer üret ve iki yere aynısını yaz: `cd worker && npx wrangler secret put CRON_SECRET`, GitHub → Settings → Secrets and variables → Actions → `KIROKU_CRON_SECRET`.
2. Site Cloudflare Access arkasındaysa `/api` için Bypass kuralı olmalı ya da bir service token oluşturup `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` secret'larını ekle.
3. Mail için Worker'da `RESEND_API_KEY` tanımlı olmalı.

İlk çalıştırma yalnızca başlangıç değerlerini yazar; mail sonraki çalıştırmalarda yeni bölüm çıkınca gelir.

## API (özet)

Tüm uçlar `/api` altındadır. 🔑 giriş (JWT ya da eklenti anahtarı), 🔒 admin girişi ister.

| Yöntem              | Yol                                             | Açıklama                                           |
| ------------------- | ----------------------------------------------- | -------------------------------------------------- |
| POST 🔑             | `/getAnimeTable?page&count&orderBy&order`       | Filtrelenmiş ve sayfalanmış anime listesi (giriş yapan kullanıcının puan/bölüm verisiyle) |
| GET 🔑              | `/getAnimeById?id`                              | Tek anime                                          |
| GET                 | `/animeCover?id`                                | DB'de base64 saklanan kapağı cache'lenebilir döner |
| POST 🔑             | `/createAnime`                                  | Anime ekleme (aynı isim varsa günceller); eklenti de bunu kullanır |
| POST 🔒             | `/createAnimeWithFile`                          | CSV ile toplu ekleme                               |
| POST 🔑             | `/updateAnimeTable`                             | Kendi puan/bölüm/PTW/notlarını günceller; admin katalog alanlarını da |
| DELETE 🔒           | `/deleteAnime?id`                               | Anime silme                                        |
| POST 🔑             | `/anime/update-episode`                         | Eklentiden bölüm ilerlemesi                        |
| GET/POST            | `/getGenres`, `/getSeries`                      | Tür ve seri listeleri                              |
| GET 🔒 / POST 🔒    | `/sync/pending`, `/sync/batch`                  | Eksik bilgileri doldurma: tarayıcı AniList'te arar, Worker sonuçları yazar. `force: true` tek animeyi baştan yeniler |
| GET, POST/PUT/DELETE 🔑 | `/watchlist`, `/watchlist/order`            | Kullanıcının watchlist'i (PTW ile otomatik senkron) |
| POST                | `/auth/register`, `/auth/login`                 | Kayıt ve giriş                                     |
| POST                | `/auth/extension-token`                         | Eklenti girişi: kullanıcı adı/şifre ile eklenti anahtarı |
| POST                | `/auth/forgot-password`, `/auth/reset-password` | Şifre sıfırlama                                    |
| GET/PUT 🔑          | `/profile` (`/auth/profile`)                    | Profil: ad, kullanıcı adı, e-posta, avatar, bio, öneri ve bildirim tercihleri; şifre değişikliği mevcut şifre ister |
| GET 🔑              | `/profile/top-anime?limit=10`                   | En yüksek puanlı animeler                          |
| GET 🔑              | `/profile/recommendations`                      | Tür tabanlı öneriler (profilde açıksa)             |
| GET/POST/DELETE 🔑  | `/profile/tokens`                               | Eklenti anahtarlarını listele, oluştur, iptal et   |
| GET/POST            | `/cron/airing`                                  | Yayın takibi (CRON_SECRET ile)                     |
| GET                 | `/healthcheck`                                  | Durum kontrolü                                     |

## Lisans

Bu proje için henüz bir lisans belirtilmemiştir.
