// Manga kaynakları. Her kaynak aynı arayüzü uygular:
//   search(env, query)          → [{ source, id, title, cover, url, data }]
//   chapters(env, manga, langs) → [{ source, id, number, title, lang, group, url, data }]
//   pages(env, chapter)         → [{ url, referer?, unscramble? }]
// `env` ortamı soyutlar (fetch, HTML ayrıştırma, site başına istek başlıkları) ki aynı kod eklenti sayfasında ve testte çalışsın.
// Site mantığı Keiyoushi eklentilerinden (Apache-2.0) uyarlanmıştır: github.com/keiyoushi/extensions-source

const abs = (value, base) => {
  if (!value) return "";
  try {
    return new URL(value.trim(), base).href;
  } catch {
    return "";
  }
};

const text = (el) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

/** Bölüm adından sayıyı çıkarır: "Bölüm 12.5 - Başlık" → 12.5 */
export function parseChapterNumber(name) {
  const m = String(name ?? "").match(/(?:bölüm|chapter|ch\.?|episode|ep\.?)\s*(\d+(?:[.,]\d+)?)/i) ?? String(name ?? "").match(/(\d+(?:[.,]\d+)?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
}

async function getText(env, url, init) {
  const res = await env.fetch(url, init);
  if (!res.ok) throw new Error(`${new URL(url).host}: HTTP ${res.status}`);
  return res.text();
}

async function getJson(env, url, init) {
  const res = await env.fetch(url, init);
  if (!res.ok) throw new Error(`${new URL(url).host}: HTTP ${res.status}`);
  return res.json();
}

async function getDocument(env, url, init) {
  const html = await getText(env, url, init);
  const doc = env.parseHTML(html);
  checkBlocked(doc, url);
  return doc;
}

/** Bot koruması sayfası geldiyse kullanıcıya siteyi bir kez tarayıcıda açmasını söyler */
function checkBlocked(doc, url) {
  const title = text(doc.querySelector("title")).toLowerCase();
  const body = doc.body?.innerHTML ?? "";
  if (
    title.includes("just a moment") ||
    title.includes("attention required") ||
    body.includes("check.ddos-guard.net") ||
    body.includes("cf-turnstile") ||
    doc.querySelector("canvas#sliderCanvas")
  ) {
    throw new Error(`${new URL(url).host} bot doğrulaması istiyor. Siteyi bu tarayıcıda bir kez açıp doğrulamayı geçin, sonra tekrar deneyin.`);
  }
}

const form = (fields) => {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) body.append(k, String(v));
  return body;
};

// ============================== MangaDex ==============================
// Resmî API (api.mangadex.org); scraping yok. Dil filtresi doğrudan API'de.

const MD_API = "https://api.mangadex.org";
const MD_RATINGS = ["safe", "suggestive", "erotica"].map((r) => `contentRating[]=${r}`).join("&");

const mangadex = {
  id: "mangadex",
  name: "MangaDex",
  langs: ["tr", "en"],
  homepage: "https://mangadex.org",

  async search(env, query) {
    const url = `${MD_API}/manga?title=${encodeURIComponent(query)}&limit=15&includes[]=cover_art&order[relevance]=desc&${MD_RATINGS}`;
    const { data } = await getJson(env, url);
    return data.map((m) => {
      const t = m.attributes.title;
      const title = t.en ?? t["ja-ro"] ?? Object.values(t)[0] ?? m.id;
      const cover = m.relationships.find((r) => r.type === "cover_art")?.attributes?.fileName;
      return {
        source: "mangadex",
        id: m.id,
        title,
        altTitles: (m.attributes.altTitles ?? []).flatMap((a) => Object.values(a)),
        cover: cover ? `https://uploads.mangadex.org/covers/${m.id}/${cover}.512.jpg` : "",
        url: `https://mangadex.org/title/${m.id}`,
        data: { malId: Number(m.attributes.links?.mal) || null, anilistId: Number(m.attributes.links?.al) || null },
      };
    });
  },

  async chapters(env, manga, langs) {
    const wanted = langs.filter((l) => this.langs.includes(l));
    if (!wanted.length) return [];
    const out = [];
    for (let offset = 0; ; offset += 500) {
      const url =
        `${MD_API}/manga/${manga.id}/feed?limit=500&offset=${offset}&order[chapter]=asc&includes[]=scanlation_group&includeExternalUrl=0&${MD_RATINGS}&` +
        wanted.map((l) => `translatedLanguage[]=${l}`).join("&");
      const res = await getJson(env, url);
      for (const c of res.data) {
        if (!c.attributes.pages) continue; // harici bağlantılı (MANGA Plus vb.) bölümler indirilemez
        const group = c.relationships.find((r) => r.type === "scanlation_group")?.attributes?.name ?? "";
        out.push({
          source: "mangadex",
          id: c.id,
          number: c.attributes.chapter != null ? Number(c.attributes.chapter) : null,
          title: c.attributes.title ?? "",
          lang: c.attributes.translatedLanguage,
          group,
          url: `https://mangadex.org/chapter/${c.id}`,
          data: { pages: c.attributes.pages },
        });
      }
      if (offset + res.data.length >= res.total || res.data.length === 0) break;
    }
    // Aynı dilde aynı bölüm birden fazla grupça yüklenmişse en çok sayfalı olanı tut
    const best = new Map();
    for (const c of out) {
      const key = `${c.lang}|${c.number ?? c.id}`;
      const prev = best.get(key);
      if (!prev || c.data.pages > prev.data.pages) best.set(key, c);
    }
    return [...best.values()];
  },

  async pages(env, chapter) {
    const res = await getJson(env, `${MD_API}/at-home/server/${chapter.id}`);
    return res.chapter.data.map((file) => ({ url: `${res.baseUrl}/data/${res.chapter.hash}/${file}` }));
  },
};

// ============================== JuraTempest (Tempest Scans) ==============================
// Sitenin kendi JSON RPC uçları

const JT = "https://juratempe.st";
const jtCdn = (key) => (key ? `https://cdn.juratempe.st/${key}` : "");

// API, tarayıcının kendi sayfasından gelmeyen istekleri (Sec-Fetch-Site) 403 ile reddediyor
const JT_HEADERS = { "Sec-Fetch-Site": "same-origin", Origin: JT, Referer: `${JT}/` };

async function jtRpc(env, path, payload) {
  await env.setHeaders(JT, JT_HEADERS);
  const res = await getJson(env, `${JT}/api/rpc/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: payload }),
  });
  return res.json;
}

const juratempest = {
  id: "juratempest",
  name: "Tempest (JuraTempest)",
  langs: ["tr"],
  homepage: JT,

  async search(env, query) {
    const res = await jtRpc(env, "search/manga", { q: query.trim() || "***", limit: 20, offset: 0 });
    return res.hits.map((m) => ({
      source: "juratempest",
      id: m.slug,
      title: m.titleTr || m.titleEn || m.titleJpRomaji || m.titleJp || m.slug,
      altTitles: [m.titleEn, m.titleJp, m.titleJpRomaji].filter(Boolean),
      cover: m.coverImageUrl || jtCdn(m.coverImageKey),
      url: `${JT}/explore/${m.slug}`,
      data: {},
    }));
  },

  async chapters(env, manga, langs) {
    if (!langs.includes("tr")) return [];
    const list = await jtRpc(env, "chapter/byMangaSlug", { slug: manga.id });
    return list.map((c) => ({
      source: "juratempest",
      id: `${manga.id}/${c.slug}`,
      number: c.number ?? parseChapterNumber(c.title),
      title: c.title ?? "",
      lang: "tr",
      group: "Tempest Scans",
      url: `${JT}/explore/${manga.id}/${c.slug}`,
      data: { mangaSlug: manga.id, chapterSlug: c.slug },
    }));
  },

  async pages(env, chapter) {
    const releases = await jtRpc(env, "release/byChapterSlug", chapter.data);
    const release = releases.reduce((a, b) => (b.pages.length > (a?.pages.length ?? -1) ? b : a), null);
    if (!release) return [];
    return [...release.pages]
      .sort((a, b) => a.number - b.number)
      .map((p) => p.imageUrl || jtCdn(p.imageKey))
      .filter(Boolean)
      .map((url) => ({ url, referer: `${JT}/` }));
  },
};

// ============================== Madara (WordPress) teması ==============================

function madara({ id, name, baseUrl }) {
  const ajaxHeaders = { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" };
  const parseChapterList = (doc, base) =>
    [...doc.querySelectorAll("li.wp-manga-chapter")]
      .map((li) => {
        const a = li.querySelector("a");
        const url = abs(a?.getAttribute("href"), base);
        if (!url) return null;
        const title = text(a);
        return { source: id, id: url, number: parseChapterNumber(title), title, lang: "tr", group: name, url, data: {} };
      })
      .filter(Boolean);

  const imageFromElement = (img, base) => {
    for (const attr of ["data-src", "data-lazy-src", "data-lzl-src", "data-cfsrc", "data-manga-src"]) {
      if (img.hasAttribute(attr)) return abs(img.getAttribute(attr), base);
    }
    if (img.hasAttribute("srcset")) {
      const last = img.getAttribute("srcset").split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean).pop();
      if (last) return abs(last, base);
    }
    return abs(img.getAttribute("src"), base);
  };

  return {
    id,
    name,
    langs: ["tr"],
    homepage: baseUrl,

    async search(env, query) {
      const doc = await getDocument(env, `${baseUrl}/?s=${encodeURIComponent(query)}&post_type=wp-manga`);
      return [...doc.querySelectorAll("div.c-tabs-item__content, div.page-item-detail, .manga__item")]
        .map((el) => {
          const a = el.querySelector(".post-title a") ?? el.querySelector("a");
          const url = abs(a?.getAttribute("href"), baseUrl);
          if (!url) return null;
          const img = el.querySelector("img");
          return { source: id, id: url, title: text(a), altTitles: [], cover: img ? imageFromElement(img, baseUrl) : "", url, data: {} };
        })
        .filter(Boolean);
    },

    async chapters(env, manga, langs) {
      if (!langs.includes("tr")) return [];
      const doc = await getDocument(env, manga.url);
      let list = parseChapterList(doc, manga.url);
      if (!list.length) {
        // Yeni Madara sürümleri listeyi ayrı istekle yükler
        const html = await getText(env, `${manga.url.replace(/\/+$/, "")}/ajax/chapters/`, { method: "POST", headers: ajaxHeaders }).catch(() => "");
        list = parseChapterList(env.parseHTML(html), manga.url);
      }
      if (!list.length) {
        const mangaId = doc.querySelector("[id^=manga-chapters-holder]")?.getAttribute("data-id");
        if (mangaId) {
          const html = await getText(env, `${baseUrl}/wp-admin/admin-ajax.php`, {
            method: "POST",
            headers: ajaxHeaders,
            body: form({ action: "manga_get_chapters", manga: mangaId }),
          });
          list = parseChapterList(env.parseHTML(html), manga.url);
        }
      }
      return list;
    },

    async pages(env, chapter) {
      let doc = await getDocument(env, chapter.url);
      if (doc.querySelector("#single-pager")) {
        const u = new URL(chapter.url);
        u.searchParams.set("style", "list");
        doc = await getDocument(env, u.href);
      }
      if (doc.querySelector("#chapter-protector-data")) {
        throw new Error(`${name}: bu bölüm şifreli (chapter protector), henüz desteklenmiyor`);
      }
      return [...doc.querySelectorAll("div.page-break, li.blocks-gallery-item, .reading-content .text-left")]
        .map((el) => el.querySelector("img"))
        .filter(Boolean)
        .map((img) => ({ url: imageFromElement(img, chapter.url), referer: chapter.url }))
        .filter((p) => p.url);
    },
  };
}

const tortuga = madara({ id: "tortuga", name: "Tortuga Çeviri", baseUrl: "https://tortugaceviri.com" });

// ============================== Manga-TR ==============================
// DDoS-Guard arkasında; sayfa listesi XOR ile şifreli, bazı görseller şeritlere bölünüp karıştırılmış.
// Ekim 2026'da site değişti: bölüm listesi artık gizlenmiş bir betikle yükleniyor (listKey yok) ve
// sayfa yapılandırmasının iç katmanı bu anahtarlarla çözülmüyor. Arama çalışıyor, indirme şu an çalışmıyor.

const MTR = "https://manga-tr.com";

function mtrDecrypt(value, key) {
  let b64 = value.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  b64 += "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
  return new TextDecoder().decode(bytes);
}

const mangatr = {
  id: "mangatr",
  name: "Manga-TR",
  langs: ["tr"],
  homepage: MTR,
  experimental: true,

  async search(env, query) {
    const doc = await getDocument(env, `${MTR}/arama.html?icerik=${encodeURIComponent(query)}`);
    return [...doc.querySelectorAll("div.arama-card")]
      .filter((el) => !/novel|anime/i.test(text(el.querySelector(".arama-badge"))))
      .map((el) => {
        const a = el.querySelector("a.arama-card__title");
        const url = abs(a?.getAttribute("href"), MTR);
        return {
          source: "mangatr",
          id: url,
          title: text(a),
          altTitles: [],
          cover: abs(el.querySelector("img.arama-card__cover")?.getAttribute("src"), MTR),
          url,
          data: {},
        };
      })
      .filter((m) => m.url);
  },

  async chapters(env, manga, langs) {
    if (!langs.includes("tr")) return [];
    const html = await getText(env, manga.url);
    checkBlocked(env.parseHTML(html), manga.url);
    const key = html.match(/listKey:\s*'([^']+)'/)?.[1];
    if (!key) throw new Error("Manga-TR: bölüm listesi anahtarı bulunamadı (site yapısı değişti, kaynak güncellenmeli)");

    const out = [];
    for (let offset = null; ; offset = offset === null ? 20 : offset + 100) {
      const body = form(offset === null ? { chapter_list_key: key } : { chapter_list_key: key, offset });
      const page = await getText(env, `${MTR}/cek/fetch_pages_manga.php`, {
        method: "POST",
        headers: { "X-Requested-With": "XMLHttpRequest", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body,
      });
      const cards = [...env.parseHTML(page).querySelectorAll("article.bento-ep-card")];
      if (!cards.length) break;
      for (const card of cards) {
        const a = card.querySelector("a.bento-ep-title-link");
        const url = abs(a?.getAttribute("href"), `${MTR}/`);
        if (!url) continue;
        const num = text(a.querySelector(".bento-ep-chapter-num")).replace(/\.$/, "");
        const subtitle = text(card.querySelector(".bento-ep-subtitle"));
        out.push({
          source: "mangatr",
          id: url,
          number: num ? Number(num.replace(",", ".")) : parseChapterNumber(text(a)),
          title: subtitle,
          lang: "tr",
          group: "Manga-TR",
          url,
          data: {},
        });
      }
    }
    return out;
  },

  async pages(env, chapter) {
    const html = await getText(env, chapter.url);
    const doc = env.parseHTML(html);
    checkBlocked(doc, chapter.url);
    if (/üye girişi/i.test(text(doc.querySelector("div#uyari")))) {
      throw new Error("Manga-TR: bu bölüm üye girişi istiyor. Sitede bu tarayıcıyla giriş yapıp tekrar deneyin.");
    }
    const configScript = doc.querySelector('script[type="application/json"][id^="rdm-"]');
    const gatePath = html.match(/_fpx\s*=\s*"([^"]+)"/)?.[1];
    if (!configScript || !gatePath) throw new Error("Manga-TR: sayfa verisi bulunamadı");
    const pageKey = [...configScript.attributes].map((a) => a.value).find((v) => /^[0-9a-f]{32}$/.test(v));
    if (!pageKey) throw new Error("Manga-TR: sayfa anahtarı bulunamadı");

    // Kapı anahtarı tek kullanımlık; yalnızca bu sayfa yüklemesi için yapılandırmayı açar
    const gate = await getJson(env, abs(gatePath, `${MTR}/`), { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const config = JSON.parse(mtrDecrypt(mtrDecrypt(configScript.textContent, `gate|${gate.k}|reader`), `boot|${pageKey}|reader`)).data;

    return [...doc.querySelectorAll(`[${config.parts}]`)]
      .sort((a, b) => Number(a.getAttribute(config.pageIndex)) - Number(b.getAttribute(config.pageIndex)))
      .map((el) => {
        const url = JSON.parse(mtrDecrypt(el.getAttribute(config.parts), `attr|${pageKey}|reader`))[0];
        const orderAttr = el.getAttribute(config.order);
        const order = orderAttr ? JSON.parse(mtrDecrypt(orderAttr, `order|${pageKey}|reader`)) : null;
        return { url: abs(url, chapter.url), referer: chapter.url, unscramble: order?.length ? order : undefined };
      });
  },
};

// ============================== SadScans ==============================
// Keiyoushi'de yok; eski manga-scrapper seçicilerinden uyarlandı. Site sadscans.net'e taşındı ve
// otomasyonu engelliyor, bu yüzden canlı doğrulanamadı: seçiciler değişmiş olabilir.

const SAD = "https://sadscans.net";

const sadscans = {
  id: "sadscans",
  name: "SadScans",
  langs: ["tr"],
  homepage: SAD,
  experimental: true,

  async search(env, query) {
    const doc = await getDocument(env, `${SAD}/series?search=${encodeURIComponent(query)}`);
    return [...doc.querySelectorAll(".series-list .hover-image div a.button, .series-list a[href*='/series/']")]
      .map((a) => {
        const url = abs(a.getAttribute("href"), SAD);
        const card = a.closest(".series-list > *") ?? a.parentElement;
        const title = a.getAttribute("title") || text(card?.querySelector("h2, h3, .title")) || text(a);
        return { source: "sadscans", id: url, title, altTitles: [], cover: abs(card?.querySelector("img")?.getAttribute("src"), SAD), url, data: {} };
      })
      .filter((m, i, list) => m.url && list.findIndex((x) => x.url === m.url) === i);
  },

  async chapters(env, manga, langs) {
    if (!langs.includes("tr")) return [];
    const doc = await getDocument(env, manga.url);
    return [...doc.querySelectorAll(".chapters .chap-section .chap .chap-link .link a, .chapters a[href*='/reader/']")]
      .map((a) => {
        const url = abs(a.getAttribute("href"), SAD);
        const title = (a.getAttribute("title") || text(a)).replace(/[^\w\sğüşıöçĞÜŞİÖÇ.,-]/g, "").trim();
        return { source: "sadscans", id: url, number: parseChapterNumber(title), title, lang: "tr", group: "SadScans", url, data: {} };
      })
      .filter((c, i, list) => c.url && list.findIndex((x) => x.url === c.url) === i);
  },

  async pages(env, chapter) {
    const doc = await getDocument(env, chapter.url);
    return [...doc.querySelectorAll(".reader-content .swiper-wrapper .swiper-slide img, .reader-content img")]
      .map((img) => abs(img.getAttribute("data-src") || img.getAttribute("src"), chapter.url))
      .filter((url, i, list) => url && list.indexOf(url) === i)
      .map((url) => ({ url, referer: chapter.url }));
  },
};

/** Türkçe kaynaklar önce: dil önceliğinde aynı dildeki kaynaklar bu sırayla denenir */
export const SOURCES = [mangatr, juratempest, tortuga, sadscans, mangadex];

export const sourceById = (id) => SOURCES.find((s) => s.id === id);
