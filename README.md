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
├── scripts/dev.ps1       # Windows'ta API + frontend'i tek komutla başlatır
├── backend/              # Eski Go API (PostgreSQL); Cloudflare'e geçiş tamamlanınca kaldırılacak
└── docker-compose.yaml   # Eski Go + PostgreSQL yığını için
```

**Teknolojiler**: Cloudflare Workers, D1, Hono, TypeScript · Next.js 15, React 19, MUI 6, dnd-kit · AniList GraphQL · Resend (e-posta).

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

Eklenti sunucu adresini popup'taki ayarlardan alır; buraya sitenin adresini yazın (ör. `https://kiroku.<hesap>.workers.dev`).

## API (özet)

Tüm uçlar `/api` altındadır. 🔒 işaretliler admin girişi (JWT) ister.

| Yöntem              | Yol                                             | Açıklama                                           |
| ------------------- | ----------------------------------------------- | -------------------------------------------------- |
| POST                | `/getAnimeTable?page&count&orderBy&order`       | Filtrelenmiş ve sayfalanmış anime listesi          |
| GET                 | `/getAnimeById?id`                              | Tek anime                                          |
| GET                 | `/animeCover?id`                                | DB'de base64 saklanan kapağı cache'lenebilir döner |
| POST                | `/createAnime`                                  | Anime ekleme (aynı isim varsa günceller); eklenti `/createAnime` adresini de kullanabilir |
| POST 🔒             | `/createAnimeWithFile`                          | CSV ile toplu ekleme                               |
| POST 🔒             | `/updateAnimeTable`                             | Anime güncelleme                                   |
| DELETE 🔒           | `/deleteAnime?id`                               | Anime silme                                        |
| POST                | `/anime/update-episode`                         | Eklentiden bölüm ilerlemesi                        |
| GET/POST            | `/getGenres`, `/getSeries`                      | Tür ve seri listeleri                              |
| GET 🔒 / POST 🔒    | `/sync/pending`, `/sync/batch`                  | AniList ile eksik bilgileri doldurma (gruplar halinde) |
| GET                 | `/getAnime`, `/getManga`                        | AniList üzerinden arama                            |
| GET, POST/PUT/DELETE 🔒 | `/watchlist`, `/watchlist/order`            | Watchlist (PTW ile otomatik senkron)               |
| POST                | `/auth/register`, `/auth/login`                 | Kayıt ve giriş                                     |
| POST                | `/auth/forgot-password`, `/auth/reset-password` | Şifre sıfırlama                                    |
| GET/PUT             | `/auth/profile`                                 | Profil (JWT); şifre değişikliği mevcut şifre ister |
| GET                 | `/healthcheck`                                  | Durum kontrolü                                     |

## Lisans

Bu proje için henüz bir lisans belirtilmemiştir.
