// İndirme mantığı: kaynaklardan gelen bölüm listelerini dil önceliğine göre birleştirir,
// bir bölümün sayfalarını indirip ComicInfo.xml ile CBZ'ye paketler.

import { createZip } from "./zip.js";
import { comicInfoXml } from "./metadata.js";
import { sourceById } from "./sources.js";

export const LANGUAGE_MODES = {
  "tr-first": { label: "Türkçe varsa Türkçe, yoksa İngilizce", langs: ["tr", "en"] },
  tr: { label: "Yalnızca Türkçe", langs: ["tr"] },
  en: { label: "Yalnızca İngilizce", langs: ["en"] },
};

const numberKey = (n) => (n == null || Number.isNaN(n) ? null : String(Math.round(n * 100) / 100));

/**
 * Her bölüm numarası için tek bir kaynak seçer: önce dil önceliği, sonra kaynak sırası.
 * Numarasız bölümler (ör. özel bölümler) yalnızca en öncelikli dilde varsa listeye girer.
 * @param {Array<Array<object>>} lists kaynak sırasına göre bölüm listeleri
 * @param {string[]} langs öncelik sırasıyla diller
 */
export function mergeChapters(lists, langs) {
  const chosen = new Map();
  const extras = [];
  lists.forEach((list, sourceIndex) => {
    for (const ch of list) {
      const langIndex = langs.indexOf(ch.lang);
      if (langIndex < 0) continue;
      const key = numberKey(ch.number);
      if (key === null) {
        if (langIndex === 0) extras.push({ ...ch, rank: [langIndex, sourceIndex] });
        continue;
      }
      const rank = [langIndex, sourceIndex];
      const prev = chosen.get(key);
      if (!prev || rank[0] < prev.rank[0] || (rank[0] === prev.rank[0] && rank[1] < prev.rank[1])) {
        chosen.set(key, { ...ch, rank });
      }
    }
  });
  return [...[...chosen.values()].sort((a, b) => a.number - b.number), ...extras];
}

const formatNumber = (n) => (n == null ? "" : Number.isInteger(n) ? String(n) : String(n).replace(".", ","));

/** Eski arşivle uyumlu dosya adı: "Bölüm 12 - Başlık.cbz" */
export function chapterFileName(chapter, seriesName = "") {
  const num = formatNumber(chapter.number);
  const title = (chapter.title ?? "").trim();
  // "Bölüm 12", "Chapter 12" ya da "Berserk 386" gibi yalnızca numarayı tekrarlayan başlıklar eklenmez
  const rest = title
    .replace(/[\d.,]+\s*$/, "")
    .replace(/^(bölüm|chapter|ch\.?)\s*/i, "")
    .trim()
    .toLowerCase();
  const sameAsNumber = !title || ((/[\d.,]+\s*$/.test(title)) && (!rest || rest === seriesName.trim().toLowerCase()));
  const head = num ? `Bölüm ${num}` : title || "Özel Bölüm";
  return `${head}${num && !sameAsNumber ? ` - ${title}` : ""}.cbz`;
}

const EXT_BY_TYPE = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

function extensionFor(url, type) {
  const fromType = EXT_BY_TYPE[(type ?? "").split(";")[0].trim()];
  if (fromType) return fromType;
  const m = new URL(url).pathname.match(/\.(jpe?g|png|webp|gif|avif)$/i);
  return m ? m[1].toLowerCase().replace("jpeg", "jpg") : "jpg";
}

/**
 * Manga-TR'nin karıştırılmış görselini düzeltir: N yatay şerit; her girdi `flip * 100 + hedef`,
 * flip bit 1 yatay, bit 2 dikey aynalama. Görsel yeniden kodlanmak zorunda olduğundan JPEG (%95) çıkar.
 */
async function unscramble(blob, order) {
  const source = await createImageBitmap(blob);
  const stripHeight = Math.floor(source.height / order.length);
  const canvas = new OffscreenCanvas(source.width, stripHeight * order.length);
  const ctx = canvas.getContext("2d");
  order.forEach((code, sourceIndex) => {
    const flip = Math.floor(code / 100);
    const top = (code % 100) * stripHeight;
    ctx.save();
    ctx.translate(source.width / 2, top + stripHeight / 2);
    ctx.scale(flip & 1 ? -1 : 1, flip & 2 ? -1 : 1);
    ctx.drawImage(source, 0, sourceIndex * stripHeight, source.width, stripHeight, -source.width / 2, -stripHeight / 2, source.width, stripHeight);
    ctx.restore();
  });
  source.close();
  return canvas.convertToBlob({ type: "image/jpeg", quality: 0.95 });
}

async function fetchImage(env, page, attempt = 1) {
  try {
    if (page.referer) await env.setHeaders(page.url, { Referer: page.referer });
    const res = await env.fetch(page.url, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let blob = await res.blob();
    if (!blob.type.startsWith("image/") && blob.size < 2048) throw new Error("görsel yerine sayfa döndü");
    if (page.unscramble) blob = await unscramble(blob, page.unscramble);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: blob.type };
  } catch (err) {
    if (attempt >= 3) throw new Error(`Sayfa indirilemedi (${page.url}): ${err.message}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
    return fetchImage(env, page, attempt + 1);
  }
}

/** Sınırlı eşzamanlılıkla sırayı koruyarak eşler */
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i], i);
      }
    })
  );
  return out;
}

/**
 * Bir bölümü indirip CBZ baytlarını döner.
 * @returns {Promise<{ fileName: string, bytes: Uint8Array, pageCount: number }>}
 */
export async function buildChapterCbz(env, chapter, { seriesName, meta, onPage }) {
  const source = sourceById(chapter.source);
  const pages = await source.pages(env, chapter);
  if (!pages.length) throw new Error("Bölümde sayfa bulunamadı");

  let done = 0;
  const images = await mapLimit(pages, 3, async (page) => {
    const img = await fetchImage(env, page);
    onPage?.(++done, pages.length);
    return { ...img, url: page.url };
  });

  const pad = String(images.length).length < 3 ? 3 : String(images.length).length;
  const files = images.map((img, i) => ({ name: `${String(i + 1).padStart(pad, "0")}.${extensionFor(img.url, img.type)}`, data: img.bytes }));
  files.push({ name: "ComicInfo.xml", data: comicInfoXml({ seriesName, chapter, pageCount: images.length, meta, sourceName: source.name }) });

  return { fileName: chapterFileName(chapter, seriesName), bytes: createZip(files), pageCount: images.length };
}
