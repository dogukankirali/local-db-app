# Kiroku Worker

Tek Cloudflare Worker: `frontend/out` altındaki statik siteyi sunar, `/api/*` isteklerini [Hono](https://hono.dev) ile karşılar, veriyi D1'de tutar. Ücretsiz planda çalışacak şekilde yazıldı (istek başına 10 ms CPU, günde 100.000 istek, D1 5 GB).

## Komutlar

| Komut | Ne yapar |
| --- | --- |
| `npx wrangler dev` | API + statik site, lokal D1 ile (`http://localhost:8787`) |
| `npm run deploy` | `frontend`'i statik derler (`build:cf`) ve Worker'ı yayınlar |
| `npm run db:migrate:local` / `db:migrate:remote` | `migrations/` altındaki şemayı uygular |
| `npm run db:import -- <dump.sql>` | `pg_dump` çıktısını `.import/data.sql`'e çevirir |
| `npm run set-password -- <kullanıcı> [--remote]` | Kullanıcının şifresini doğrudan D1'de belirler |
| `npm run typecheck` | TypeScript kontrolü |

## İlk deploy ve Google'dan taşıma

1. **Giriş ve veritabanı**

   ```bash
   npm install
   npx wrangler login
   npx wrangler d1 create kiroku
   ```

   Çıktıdaki `database_id` değerini `wrangler.jsonc` içindeki `d1_databases` bölümüne yaz, sonra şemayı kur:

   ```bash
   npm run db:migrate:remote
   ```

2. **Veriyi aktar.** Mevcut PostgreSQL'den bir dump al (`pg_dump --data-only` yeterli) ve D1'e yükle:

   ```bash
   npm run db:import -- ../my_database_dump.sql
   npx wrangler d1 execute kiroku --remote --file=.import/data.sql
   ```

   Animeler, türler, seriler, watchlist ve kullanıcılar taşınır. Eski bcrypt şifreleri Workers'ın ücretsiz CPU sınırında doğrulanamadığı için taşınmaz; her hesap için bir kez:

   ```bash
   npm run set-password -- Spoon --remote
   ```

3. **Gizli değerler**

   ```bash
   npx wrangler secret put JWT_SECRET_KEY     # uzun, rastgele bir değer
   npx wrangler secret put RESEND_API_KEY     # isteğe bağlı, şifre sıfırlama maili için
   ```

   Resend'in `onboarding@resend.dev` göndereni yalnızca Resend hesabının kendi e-posta adresine mail atabilir. Başka adreslere göndermek için Resend'de bir alan adı doğrulayıp `wrangler.jsonc`'deki `MAIL_FROM`'u ona göre değiştir.

4. **Yayınla**

   ```bash
   npm run deploy
   ```

   Site `https://kiroku.<hesap>.workers.dev` adresinde açılır. Eklentinin popup'ındaki sunucu adresini bu adresle değiştir.

5. Her şey çalıştığını gördükten sonra Cloud Run servisi ve Cloud SQL kapatılabilir.

## Google ile giriş

1. [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → OAuth consent screen**: uygulama adını (Kiroku) ve e-postanı gir, tür **External**, kapsamlar `openid`, `email`, `profile`. Yayın durumunu **In production** yap (Testing'de yalnızca eklediğin test kullanıcıları girebilir).
2. **Credentials → Create credentials → OAuth client ID**, tür **Web application**.
   - Authorized JavaScript origins: `https://app.dogukankirali.com`, `http://localhost:3000`
   - Authorized redirect URIs: `https://app.dogukankirali.com/api/auth/google/callback`, `http://localhost:3000/api/auth/google/callback`
3. Çıkan değerleri Worker'a secret olarak ekle:

   ```bash
   npx wrangler secret put GOOGLE_CLIENT_ID
   npx wrangler secret put GOOGLE_CLIENT_SECRET
   ```

   Lokal geliştirme için aynı iki satırı `.dev.vars`'a yaz. Secret'lar yoksa Google butonu görünmez.

Google hesabının e-postası mevcut bir kullanıcıyla eşleşirse o hesaba girilir; eşleşmezse admin olmayan yeni bir hesap açılır.

## Notlar

- **Şifreler** PBKDF2-SHA256 ile saklanır (`pbkdf2$sha256$<iterasyon>$<tuz>$<özet>`). İterasyon sayısı `PASSWORD_ITERATIONS` ile değişir; eski hash'ler kendi iterasyonlarıyla doğrulanmaya devam eder.
- **Yetki**: anime güncelleme/silme, CSV yükleme, watchlist değişiklikleri ve sync admin JWT'si ister. `/createAnime` ve `/api/anime/update-episode` eklenti için açık kalır ([#26](https://github.com/dogukankirali/local-db-app/issues/26)).
- **Sync**: AniList, Workers'ın çıkış IP'lerini engellediği için arama tarayıcıda yapılır (her grup 8 anime, tek istek). Worker `/api/sync/batch` ile gelen sonuçlardan en iyi eşleşmeyi seçip eksik alanları yazar. İstemci gruplar arasında 2 sn bekler, AniList hız sınırında belirtilen süre kadar bekler.
- **Otomatik deploy**: Cloudflare Workers Builds, `main`'e her push'ta `worker/` içinden build alıp deploy eder (ayarlar dashboard'da: kiroku → Settings → Builds).
- **Watchlist**, `plan_to_watch` alanına bağlı D1 trigger'larıyla kendiliğinden güncel kalır.
