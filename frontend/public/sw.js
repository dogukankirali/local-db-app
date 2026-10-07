// Kiroku service worker: yalnızca kapak görsellerini önbelleğe alır (cache-first).
// İlk yüklemeden sonra kapaklar ağ beklemeden diskten gelir; sayfalar ve API'ye dokunulmaz.
// Önbellek adı değişirse eski önbellekler silinir.

const CACHE = "kiroku-covers-v2";
const MAX_ENTRIES = 1500;

const isCover = (url) =>
  url.hostname === "s4.anilist.co" ||
  url.hostname === "cdn.myanimelist.net" ||
  (url.origin === self.location.origin && url.pathname === "/api/anime-cover");

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kiroku-covers-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

let trimScheduled = false;
async function trim() {
  trimScheduled = false;
  const cache = await caches.open(CACHE);
  const keys = await cache.keys();
  // En eski kayıtlar baştadır
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map((k) => cache.delete(k)));
}

async function fromCacheOrNetwork(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request.url);
  if (hit) return hit;

  // CORS ile iste: yanıt hem <img> hem de kapak rengini okuyan canvas (crossOrigin) için kullanılabilir.
  // CORS desteklemeyen bir kaynakta tarayıcının kendi isteğine düşülür ve önbelleğe yazılmaz.
  let response;
  try {
    response = await fetch(request.url, { mode: "cors", credentials: "omit" });
  } catch {
    return fetch(request);
  }
  if (response.ok) {
    cache.put(request.url, response.clone()).then(() => {
      if (!trimScheduled) {
        trimScheduled = true;
        setTimeout(trim, 10000);
      }
    });
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!isCover(url)) return;
  event.respondWith(fromCacheOrNetwork(request));
});
