# Manga library on a home server

The Kiroku reader opens CBZ files from a library over HTTP (library type "HTTP (Caddy)"). Locally `node scripts/manga-library.mjs` serves `Downloads/Kiroku/Manga` on `http://localhost:8788`. These are the steps to serve the same folder from a home server instead. No code changes are needed.

1. **Copy the files.** Copy each series folder from `Downloads/Kiroku/Manga/<Series>` to the server's manga folder (e.g. `Media/Manga`) over SMB or rsync. Keep the layout: one folder per series with the CBZs, `series.json` and `cover.jpg`.
2. **Run Caddy in Docker.** Mount the manga folder read-only and use this `Caddyfile`:

   ```
   :80 {
   	header {
   		Access-Control-Allow-Origin "https://app.dogukankirali.com"
   		Access-Control-Allow-Headers "Accept, Authorization, Range"
   		Access-Control-Expose-Headers "Content-Length, Content-Range"
   	}
   	@preflight method OPTIONS
   	handle @preflight {
   		respond 204
   	}
   	handle {
   		basic_auth {
   			kiroku {$MANGA_PASSWORD_HASH}
   		}
   		root * /srv/manga
   		file_server browse
   	}
   }
   ```

   - Volume: `/path/to/Media/Manga:/srv/manga:ro`.
   - Password hash: `docker run --rm caddy caddy hash-password`. Put it in an `.env` file as `MANGA_PASSWORD_HASH`, never in git.
   - `OPTIONS` must stay outside `basic_auth`: browsers send the CORS preflight without credentials.
3. **Expose it with Cloudflare Tunnel.** Create a tunnel in Cloudflare Zero Trust → Networks → Tunnels, add a `cloudflared` container to the same compose file with `TUNNEL_TOKEN` from `.env`, and map a hostname (e.g. `manga.<your-domain>`) to `http://caddy:80`. No port forwarding is needed and the address is HTTPS, which the HTTPS site requires. Don't put Cloudflare Access in front of it: the reader can't pass its login page; the Caddy password is the protection.
4. **Point Kiroku at it.** In the library settings choose "HTTP (Caddy)", enter the HTTPS address and the Caddy username and password, then press sync. These settings are stored only in that browser.

Notes:
- Keep `.env` (tunnel token, password hash) out of git, and use a long random password.
- To test the server from `localhost:3000`, temporarily add that origin to `Access-Control-Allow-Origin`.
- While the server is off, library chapters can't be read.

---

# Ev sunucusunda manga kütüphanesi

Kiroku okuyucusu CBZ dosyalarını HTTP üzerinden bir kütüphaneden açar (kütüphane türü "HTTP (Caddy)"). Yerelde `node scripts/manga-library.mjs`, `İndirilenler/Kiroku/Manga` klasörünü `http://localhost:8788` adresinde sunar. Aynı klasörü ev sunucusundan sunmak için adımlar aşağıda. Kodda değişiklik gerekmez.

1. **Dosyaları kopyala.** `İndirilenler/Kiroku/Manga/<Seri>` klasörlerini SMB ya da rsync ile sunucudaki manga klasörüne (ör. `Media/Manga`) kopyala. Yapı aynı kalsın: her seri bir klasör; içinde CBZ'ler, `series.json` ve `cover.jpg`.
2. **Docker'da Caddy çalıştır.** Manga klasörünü salt okunur bağla ve yukarıdaki `Caddyfile`'ı kullan.
   - Volume: `/yol/Media/Manga:/srv/manga:ro`.
   - Şifre özeti: `docker run --rm caddy caddy hash-password`. `.env` dosyasına `MANGA_PASSWORD_HASH` olarak yaz, asla git'e koyma.
   - `OPTIONS` isteği `basic_auth` dışında kalmalı; tarayıcı CORS ön kontrolünü şifresiz gönderir.
3. **Cloudflare Tunnel ile dışarı aç.** Cloudflare Zero Trust → Networks → Tunnels'dan bir tunnel oluştur, aynı compose dosyasına `.env`'deki `TUNNEL_TOKEN` ile bir `cloudflared` konteyneri ekle ve bir adresi (ör. `manga.<alan-adın>`) `http://caddy:80`'e yönlendir. Port açmak gerekmez ve adres HTTPS olur; HTTPS'li site için bu şart. Önüne Cloudflare Access koyma, okuyucu onun giriş ekranını geçemez; koruma Caddy şifresiyle sağlanır.
4. **Kiroku'yu bağla.** Kütüphane ayarlarında "HTTP (Caddy)" seç, HTTPS adresini ve Caddy kullanıcı adı/şifresini gir, sonra sync'e bas. Bu ayarlar yalnızca o tarayıcıda saklanır.

Notlar:
- `.env` dosyasını (tunnel token, şifre özeti) git'e koyma ve uzun, rastgele bir şifre kullan.
- Sunucuyu `localhost:3000`'den denemek için bu adresi geçici olarak `Access-Control-Allow-Origin`'e ekle.
- Sunucu kapalıyken kütüphanedeki bölümler okunamaz.
