// Content script başlangıç logu
console.log("Content script yükleniyor...", new Date().toISOString());

// Anime bilgilerini saklamak için değişkenler
let currentAnimeInfo = null;
let currentEpisode = 0;

// MyAnimeList sayfasında buton ekleme fonksiyonu
function addWatchlistButtonToMAL() {
  // URL kontrolü
  const url = window.location.href;
  const urlPattern = /^https?:\/\/myanimelist\.net\/anime\/(\d+)\/([^/]+)\/?$/;
  const match = url.match(urlPattern);

  if (match) {
    const animeId = match[1];
    const animeName = match[2];

    // Add to My List butonunun bulunduğu container'ı bul
    const container = document.querySelector(".user-status-block");

    if (container && !document.querySelector(".add-to-watchlist-btn")) {
      // Yeni buton oluştur
      const watchlistButton = document.createElement("button");
      watchlistButton.className = "add-to-watchlist-btn";
      watchlistButton.textContent = "Add to Watchlist";
      watchlistButton.style.cssText = `
                display: inline-block;
                margin-left: 10px;
                padding: 0 12px;
                height: 30px;
                line-height: 28px;
                font-size: 12px;
                color: #fff;
                background-color: #4f74c8;
                border: 1px solid #3c5aa6;
                border-radius: 3px;
                cursor: pointer;
                transition: background-color 0.2s;
            `;

      // Butonu container'a ekle
      container.appendChild(watchlistButton);

      // Buton hover efekti
      watchlistButton.addEventListener("mouseover", () => {
        watchlistButton.style.backgroundColor = "#3c5aa6";
      });

      watchlistButton.addEventListener("mouseout", () => {
        watchlistButton.style.backgroundColor = "#4f74c8";
      });

      // Buton click eventi
      watchlistButton.addEventListener("click", async () => {
        try {
          // Local DB'ye gönderilecek veri
          const data = {
            Name: document
              .querySelector(".title-name.h1_bold_none strong")
              .textContent.trim(),
            AnimeStatus: Array.from(document.querySelectorAll(".spaceit_pad"))
              .find((el) => el.textContent.includes("Status:"))
              .textContent.replace("Status:", "")
              .trim(),
            WatchStatus: 0,
            TotalNumberOfEpisodes:
              parseInt(
                Array.from(document.querySelectorAll(".spaceit_pad"))
                  .find((el) => el.textContent.includes("Episodes:"))
                  .textContent.replace("Episodes:", "")
                  .trim()
              ) || 0,
            IsMovie:
              Array.from(document.querySelectorAll(".spaceit_pad"))
                .find((el) => el.textContent.includes("Type:"))
                .textContent.replace("Type:", "")
                .trim()
                .toLowerCase() === "movie",
            Score: -1,
            MALScore: 0,
            Notes: "",
            MALAnimeLink: window.location.href,
            Cover: document.querySelector(".leftside img").src,
            AnimeLink: "",
            Series: 0,
            PlanToWatch: false,
          };

          // Background script üzerinden istek gönder
          const response = await chrome.runtime.sendMessage({
            action: "addToWatchlist",
            data: data,
          });

          if (response.success) {
            watchlistButton.textContent = "Added to Watchlist";
            watchlistButton.style.backgroundColor = "#6c757d";
            watchlistButton.style.borderColor = "#6c757d";
            watchlistButton.style.cursor = "not-allowed";
            watchlistButton.disabled = true;
          } else {
            throw new Error(response.error || "Failed to add to watchlist");
          }
        } catch (error) {
          console.error("Error:", error);
          watchlistButton.textContent = "Error";
          watchlistButton.style.backgroundColor = "#dc3545";
          watchlistButton.style.borderColor = "#dc3545";
        }
      });
    }
  }
}

function addUpdateButtonToTranime() {
  const playlistTitle = document.querySelector(".playlist-title");
  if (!playlistTitle) {
    console.error("Playlist title elementi bulunamadı");
    return null;
  }

  // Eğer buton zaten varsa ekleme
  if (document.querySelector(".update-watch-status-btn")) {
    return null;
  }

  // Playlist title'ı flex container yap
  playlistTitle.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  `;

  const button = document.createElement("a");
  button.className = "update-watch-status-btn";
  button.textContent = "İzleme Durumunu Güncelle";
  button.href = "#";
  button.style.cssText = `
    display: inline-block;
    padding: 8px 16px;
    background-color: rgb(220, 20, 60);
    color: rgb(255, 255, 255);
    text-decoration: none;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  `;

  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "rgb(178, 16, 48)"; // Daha koyu kırmızı
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "rgb(220, 20, 60)"; // Orijinal kırmızı
  });

  // Click eventi ekle
  button.addEventListener("click", (e) => {
    e.preventDefault();
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Güncelleniyor...";
    button.style.backgroundColor = "rgb(220, 20, 60)";

    // Anime bilgilerini topla
    console.log("Tranimeizle'den bilgiler toplanıyor...");
    const title = cleanTitle(playlistTitle.querySelector("h1").textContent);
    const episode = extractEpisodeNumber(window.location.href);
    const animeInfo = { name: title, currentEpisode: episode };
    console.log("Toplanan bilgiler:", animeInfo);

    if (animeInfo) {
      chrome.runtime
        .sendMessage({
          action: "updateAnimeStatus",
          data: {
            name: animeInfo.name,
            watchStatus: animeInfo.currentEpisode,
          },
        })
        .then((response) => {
          if (response.success) {
            button.textContent = "Güncellendi!";
            button.style.backgroundColor = "#198754";
            setTimeout(() => {
              button.textContent = originalText;
              button.style.backgroundColor = "rgb(220, 20, 60)";
              button.disabled = false;
            }, 2000);
          } else {
            button.textContent = "Hata: " + response.error;
            button.style.backgroundColor = "#dc3545";
            button.disabled = false;
          }
        })
        .catch((error) => {
          button.textContent = "Hata: " + error.message;
          button.style.backgroundColor = "#dc3545";
          button.disabled = false;
        });
    } else {
      button.textContent = "Hata: Anime bilgisi bulunamadı";
      button.style.backgroundColor = "#dc3545";
      button.disabled = false;
    }
  });

  // Butonu playlist-title'a ekle
  playlistTitle.appendChild(button);
  return null; // Artık body'e eklenmeyecek
}

function addUpdateButtonToTurkanime() {
  console.log("Turkanime'de buton eklenecek...");
  // Eğer buton zaten varsa ekleme
  if (document.querySelector(".update-watch-status-btn")) {
    console.log("Buton zaten mevcut, yeni buton eklenmeyecek");
    return null;
  }

  console.log("Yeni buton oluşturuluyor...");
  const button = document.createElement("a");
  button.className = "update-watch-status-btn";
  button.textContent = "İzleme Durumunu Güncelle";
  button.href = "#";
  button.style.cssText = `
    display: inline-block;
    padding: 8px 16px;
    background-color: rgb(220, 20, 60);
    color: rgb(255, 255, 255);
    text-decoration: none;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 999999;
  `;

  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "rgb(178, 16, 48)";
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "rgb(220, 20, 60)";
  });

  // Click eventi ekle
  button.addEventListener("click", (e) => {
    e.preventDefault();
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Güncelleniyor...";
    button.style.backgroundColor = "rgb(220, 20, 60)";

    // Anime bilgilerini topla
    console.log("Turkanime'den bilgiler toplanıyor...");
    const title = cleanTitle(document.querySelector("h1").textContent);
    const episode = extractEpisodeNumber(window.location.href);
    const animeInfo = { name: title, currentEpisode: episode };
    console.log("Toplanan bilgiler:", animeInfo);

    if (animeInfo) {
      chrome.runtime
        .sendMessage({
          action: "updateAnimeStatus",
          data: {
            name: animeInfo.name,
            watchStatus: animeInfo.currentEpisode,
          },
        })
        .then((response) => {
          if (response.success) {
            button.textContent = "Güncellendi!";
            button.style.backgroundColor = "#198754";
            setTimeout(() => {
              button.textContent = originalText;
              button.style.backgroundColor = "rgb(220, 20, 60)";
              button.disabled = false;
            }, 2000);
          } else {
            button.textContent = "Hata: " + response.error;
            button.style.backgroundColor = "#dc3545";
            button.disabled = false;
          }
        })
        .catch((error) => {
          button.textContent = "Hata: " + error.message;
          button.style.backgroundColor = "#dc3545";
          button.disabled = false;
        });
    } else {
      button.textContent = "Hata: Anime bilgisi bulunamadı";
      button.style.backgroundColor = "#dc3545";
      button.disabled = false;
    }
  });

  // Butonu body'e ekle
  document.body.appendChild(button);
  return button;
}

function addUpdateButtonToAnizium() {
  console.log("Anizium'da buton eklenecek...");
  // Eğer buton zaten varsa ekleme
  if (document.querySelector(".update-watch-status-btn")) {
    console.log("Buton zaten mevcut, yeni buton eklenmeyecek");
    return null;
  }

  console.log("Yeni buton oluşturuluyor...");
  const button = document.createElement("a");
  button.className = "update-watch-status-btn";
  button.textContent = "İzleme Durumunu Güncelle";
  button.href = "#";
  button.style.cssText = `
    display: inline-block;
    padding: 8px 16px;
    background-color: rgb(220, 20, 60);
    color: rgb(255, 255, 255);
    text-decoration: none;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 999999;
  `;

  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "rgb(178, 16, 48)";
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "rgb(220, 20, 60)";
  });

  // Click eventi ekle
  button.addEventListener("click", (e) => {
    e.preventDefault();
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Güncelleniyor...";
    button.style.backgroundColor = "rgb(220, 20, 60)";

    // Anime bilgilerini topla
    console.log("Anizium'dan bilgiler toplanıyor...");
    const title = cleanTitle(document.querySelector("h1").textContent);
    const episode = extractEpisodeNumber(window.location.href);
    const animeInfo = { name: title, currentEpisode: episode };
    console.log("Toplanan bilgiler:", animeInfo);

    if (animeInfo) {
      chrome.runtime
        .sendMessage({
          action: "updateAnimeStatus",
          data: {
            name: animeInfo.name,
            watchStatus: animeInfo.currentEpisode,
          },
        })
        .then((response) => {
          if (response.success) {
            button.textContent = "Güncellendi!";
            button.style.backgroundColor = "#198754";
            setTimeout(() => {
              button.textContent = originalText;
              button.style.backgroundColor = "rgb(220, 20, 60)";
              button.disabled = false;
            }, 2000);
          } else {
            button.textContent = "Hata: " + response.error;
            button.style.backgroundColor = "#dc3545";
            button.disabled = false;
          }
        })
        .catch((error) => {
          button.textContent = "Hata: " + error.message;
          button.style.backgroundColor = "#dc3545";
          button.disabled = false;
        });
    } else {
      button.textContent = "Hata: Anime bilgisi bulunamadı";
      button.style.backgroundColor = "#dc3545";
      button.disabled = false;
    }
  });

  // Butonu body'e ekle
  document.body.appendChild(button);
  return button;
}

function extractEpisodeNumber(url) {
  const episodePattern = /episode-(\d+)/i;
  const match = url.match(episodePattern);
  return match ? parseInt(match[1]) : 0;
}

function cleanTitle(title) {
  return title.replace(/[^\w\s-]/g, "").trim();
}

function initialize() {
  const url = window.location.href;
  if (url.includes("myanimelist.net/anime")) {
    addWatchlistButtonToMAL();
  } else if (url.includes("tranimeizle.top")) {
    addUpdateButtonToTranime();
  } else if (url.includes("turkanime.co")) {
    addUpdateButtonToTurkanime();
  } else if (url.includes("anizium.com")) {
    addUpdateButtonToAnizium();
  }
}

// Sayfa yüklendiğinde ve URL değiştiğinde initialize fonksiyonunu çalıştır
initialize();

// URL değişikliklerini dinle
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });
