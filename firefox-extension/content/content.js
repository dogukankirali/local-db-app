// Anime bilgilerini saklamak için değişkenler
let currentAnimeInfo = null;
let currentEpisode = 0;

// Bölüm numarasını çıkaran fonksiyon
function extractEpisodeNumber(url) {
  const patterns = [
    /episode-(\d+)/i,
    /bolum-(\d+)/i,
    /-(\d+)-bolum/i,
    /-(\d+)-izle/i,
    /(\d+)\s*\.?\s*Bölüm/i,
    /Bölüm\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern) || document.title.match(pattern);
    if (match) {
      console.log("Bölüm numarası bulundu:", match[1]);
      return parseInt(match[1]);
    }
  }

  console.log("Bölüm numarası bulunamadı");
  return 0;
}

// Başlığı temizleyen fonksiyon
function cleanTitle(title) {
  return title
    .replace(/(\d+\.?\s*Bölüm\s*İzle|Bölüm\s*\d+|Episode\s*\d+)/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Site spesifik bilgi toplama fonksiyonları
function getAnimeInfoFromTranimeizle() {
  console.log("Tranimeizle'den bilgiler toplanıyor...");

  // Tüm olası başlık elementlerini deneyelim
  const possibleSelectors = [
    ".video-title",
    ".current-anime-name",
    ".anime-name",
    ".title",
    "h1.title",
    "h1",
    ".episode-title",
    ".anime-title",
  ];

  let titleElement = null;
  for (const selector of possibleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Başlık elementi bulundu: ${selector}`, element.textContent);
      titleElement = element;
      break;
    }
  }

  if (!titleElement) {
    console.error(
      "Başlık elementi bulunamadı. Tüm denenen seçiciler:",
      possibleSelectors
    );
    // Sayfa başlığını deneyelim
    const pageTitle = document.title;
    console.log("Sayfa başlığı deneniyor:", pageTitle);
    if (pageTitle) {
      const title = cleanTitle(pageTitle);
      const episode = extractEpisodeNumber(window.location.href);
      console.log("Sayfa başlığından toplanan bilgiler:", { title, episode });
      return { name: title, currentEpisode: episode };
    }
    return null;
  }

  const title = cleanTitle(titleElement.textContent);
  const episode = extractEpisodeNumber(window.location.href);

  console.log("Toplanan bilgiler:", { title, episode });
  return { name: title, currentEpisode: episode };
}

function getAnimeInfoFromTurkanime() {
  console.log("Turkanime'den bilgiler toplanıyor...");

  // Tüm olası başlık elementlerini deneyelim
  const possibleSelectors = [
    ".breadcrumb li:last-child",
    ".breadcrumb-item.active",
    ".video-title",
    ".anime-title",
    ".title",
    "h1.title",
    "h1",
    ".episode-title",
    ".current-anime",
    // Sayfa başlığından alma
    () => document.title.split("-")[0],
    () => document.title.split("|")[0],
  ];

  let titleElement = null;
  let titleText = null;

  for (const selector of possibleSelectors) {
    if (typeof selector === "function") {
      titleText = selector();
      if (titleText) {
        console.log(`Başlık fonksiyondan bulundu:`, titleText);
        break;
      }
      continue;
    }

    const element = document.querySelector(selector);
    if (element) {
      console.log(`Başlık elementi bulundu: ${selector}`, element.textContent);
      titleText = element.textContent;
      break;
    }
  }

  if (!titleText) {
    console.error(
      "Başlık bulunamadı. Tüm denenen seçiciler:",
      possibleSelectors
    );
    return null;
  }

  const title = cleanTitle(titleText);
  const episode = extractEpisodeNumber(window.location.href);

  console.log("Toplanan bilgiler:", { title, episode });
  return { name: title, currentEpisode: episode };
}

function getAnimeInfoFromAnizium() {
  console.log("Anizium'dan bilgiler toplanıyor...");

  // Tüm olası başlık elementlerini deneyelim
  const possibleSelectors = [
    ".anime-title",
    ".title",
    "h1.title",
    "h1",
    ".episode-title",
    ".video-title",
  ];

  let titleElement = null;
  for (const selector of possibleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      console.log(`Başlık elementi bulundu: ${selector}`, element.textContent);
      titleElement = element;
      break;
    }
  }

  if (!titleElement) {
    console.error(
      "Başlık elementi bulunamadı. Tüm denenen seçiciler:",
      possibleSelectors
    );
    // Sayfa başlığını deneyelim
    const pageTitle = document.title;
    console.log("Sayfa başlığı deneniyor:", pageTitle);
    if (pageTitle) {
      const title = cleanTitle(pageTitle);
      const episode = extractEpisodeNumber(window.location.href);
      console.log("Sayfa başlığından toplanan bilgiler:", { title, episode });
      return { name: title, currentEpisode: episode };
    }
    return null;
  }

  const title = cleanTitle(titleElement.textContent);
  const episode = extractEpisodeNumber(window.location.href);

  console.log("Toplanan bilgiler:", { title, episode });
  return { name: title, currentEpisode: episode };
}

// Create and show update button
function createUpdateButton() {
  const button = document.createElement("button");
  button.textContent = "Update Anime Watch Status";
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 999999;
    padding: 12px 24px;
    background-color: #7c4dff;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: all 0.3s ease;
  `;

  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "#6c3fff";
    button.style.transform = "translateY(-2px)";
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "#7c4dff";
    button.style.transform = "translateY(0)";
  });

  return button;
}

// Initialize on page load
function initialize() {
  const hostname = window.location.hostname;

  // Check if we're on a supported site
  console.log("Button added to body1", hostname);
  if (
    !hostname.includes("tranimeizle.top") &&
    !hostname.includes("turkanime.co") &&
    !hostname.includes("anizium.com")
  ) {
    return;
  }
  console.log("Button added to body", hostname);

  // Check if button already exists
  if (
    document.querySelector("button[data-extension-button='update-episode']")
  ) {
    return;
  }

  // Create and add button
  const button = createUpdateButton();
  button.setAttribute("data-extension-button", "update-episode");

  if (document.body) {
    document.body.appendChild(button);
  }
}

// Add event listeners
window.addEventListener("load", initialize);
document.addEventListener("DOMContentLoaded", initialize);

// Watch for URL changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });

// Content script mesaj dinleyicisi
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getAnimeInfo") {
    sendResponse({ animeInfo: currentAnimeInfo });
  }
  return true;
});
