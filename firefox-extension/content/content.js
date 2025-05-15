// Content script başlangıç logu
console.log("Content script yükleniyor...", new Date().toISOString());

// Anime bilgilerini saklamak için değişkenler
let currentAnimeInfo = null;
let currentEpisode = 0;
let extensionEnabled = true;

// Check extension enabled state from storage
browser.storage.local.get("extension_enabled").then((result) => {
  extensionEnabled = result.extension_enabled !== false; // default: true
});

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
            //AnimeStatus: "",
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
          const response = await browser.runtime.sendMessage({
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
      browser.runtime
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

  console.log("Buton stilleri eklendi");

  button.addEventListener("mouseover", () => {
    button.style.backgroundColor = "rgb(178, 16, 48)"; // Daha koyu kırmızı
  });

  button.addEventListener("mouseout", () => {
    button.style.backgroundColor = "rgb(220, 20, 60)"; // Orijinal kırmızı
  });

  console.log("Buton hover eventleri eklendi");

  // Click eventi ekle
  button.addEventListener("click", (e) => {
    e.preventDefault();
    console.log("Buton tıklandı");
    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = "Güncelleniyor...";

    // Anime bilgilerini topla
    console.log("Turkanime'den bilgiler toplanıyor...");

    // Breadcrumb'dan anime adını al
    const breadcrumb = document.querySelector(".breadcrumb");
    if (!breadcrumb) {
      console.error("Breadcrumb bulunamadı");
      button.textContent = "Hata: Anime bilgisi bulunamadı";
      button.style.backgroundColor = "#dc3545";
      button.disabled = false;
      return;
    }

    // Breadcrumb'dan son elemanı al (anime adı)
    const animeName = breadcrumb.firstElementChild.textContent.trim();
    console.log("Anime adı:", animeName);

    // URL'den bölüm numarasını al
    const episode = extractEpisodeNumber(window.location.href);
    console.log("Bölüm numarası:", episode);

    if (!animeName || !episode) {
      console.error("Anime adı veya bölüm numarası bulunamadı");
      button.textContent = "Hata: Anime bilgisi bulunamadı";
      button.style.backgroundColor = "#dc3545";
      button.disabled = false;
      return;
    }

    const animeInfo = { name: animeName, currentEpisode: episode };
    console.log("Toplanan bilgiler:", animeInfo);

    browser.runtime
      .sendMessage({
        action: "updateAnimeStatus",
        data: {
          name: animeInfo.name,
          watchStatus: animeInfo.currentEpisode,
        },
      })
      .then((response) => {
        console.log("Background script yanıtı:", response);
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
        console.error("Background script hatası:", error);
        button.textContent = "Hata: " + error.message;
        button.style.backgroundColor = "#dc3545";
        button.disabled = false;
      });
  });

  console.log("Buton click eventi eklendi");
  return button;
}

// Anizium için buton ekleme fonksiyonu
function addUpdateButtonToAnizium() {
  console.log("Anizium'de buton eklenecek...");

  // Eğer buton zaten varsa ekleme
  if (document.querySelector(".update-watch-status-btn")) {
    console.log("Buton zaten mevcut, yeni buton eklenmeyecek");
    return;
  }

  // Hedef container'ı bekle
  const observer = new MutationObserver((mutations, obs) => {
    const container = document.querySelector(
      ".d-flex.justify-content-between.mb-4"
    );
    if (container) {
      const rightDiv = container.querySelector(".right");
      if (rightDiv) {
        console.log("Hedef div bulundu, buton ekleniyor...");
        obs.disconnect(); // Observer'ı durdur

        // Buton oluştur
        const button = document.createElement("a");
        button.className =
          "update-watch-status-btn anime-btn btn-dark border-change ms-1";
        button.textContent = "İzleme Durumunu Güncelle";
        button.href = "#";
        button.style.cssText = `cursor: pointer;`;

        // Click eventi ekle
        button.addEventListener("click", (e) => {
          e.preventDefault();
          console.log("Buton tıklandı");
          button.disabled = true;
          const originalText = button.textContent;
          button.textContent = "Güncelleniyor...";

          // Anime bilgilerini topla
          console.log("Anizium'den bilgiler toplanıyor...");

          // Breadcrumb'dan anime adını al
          const breadcrumb = document.querySelector(".breadcrumb-content");
          if (!breadcrumb) {
            console.error("Breadcrumb bulunamadı");
            button.textContent = "Hata: Anime bilgisi bulunamadı";
            button.classList.add("error");
            button.disabled = false;
            return;
          }

          // Breadcrumb'dan anime adını al
          const animeName = breadcrumb
            .querySelector("li:nth-child(2) a")
            .textContent.trim();
          console.log("Anime adı:", animeName);

          // URL'den bölüm numarasını al
          const episode = extractEpisodeNumber(window.location.href);
          console.log("Bölüm numarası:", episode);

          if (!animeName || !episode) {
            console.error("Anime adı veya bölüm numarası bulunamadı");
            button.textContent = "Hata: Anime bilgisi bulunamadı";
            button.classList.add("error");
            button.disabled = false;
            return;
          }

          const animeInfo = { name: animeName, currentEpisode: episode };
          console.log("Toplanan bilgiler:", animeInfo);

          browser.runtime
            .sendMessage({
              action: "updateAnimeStatus",
              data: {
                name: animeInfo.name,
                watchStatus: animeInfo.currentEpisode,
              },
            })
            .then((response) => {
              console.log("Background script yanıtı:", response);
              if (response.success) {
                button.textContent = "Güncellendi!";
                setTimeout(() => {
                  button.textContent = originalText;
                  button.disabled = false;
                }, 2000);
              } else {
                button.textContent = "Hata: " + response.error;
                button.classList.add("error");
                button.disabled = false;
              }
            })
            .catch((error) => {
              console.error("Background script hatası:", error);
              button.textContent = "Hata: " + error.message;
              button.classList.add("error");
              button.disabled = false;
            });
        });

        // Butonu ekle
        rightDiv.appendChild(button);
        console.log("Buton sayfaya eklendi");
      }
    }
  });

  // DOM değişikliklerini izlemeye başla
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("Hedef div için observer başlatıldı");
}

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

// Helper to remove all extension buttons
function removeExtensionButtons() {
  document.querySelectorAll('.add-to-watchlist-btn, .update-watch-status-btn').forEach(btn => btn.remove());
}

// Modified initialize
function initialize() {
  browser.storage.local.get("extension_enabled").then((result) => {
    extensionEnabled = result.extension_enabled !== false; // default: true
    console.log("Initialize fonksiyonu çağrıldı", new Date().toISOString());
    console.log("Document readyState:", document.readyState);
    console.log("Document body:", document.body ? "Mevcut" : "Yok");

    const currentUrl = window.location.href;
    console.log("Mevcut URL:", currentUrl);

    if (!extensionEnabled) {
      removeExtensionButtons();
      return;
    }

    // MAL için kontrol
    if (currentUrl.includes("myanimelist.net")) {
      console.log("MyAnimeList sayfası tespit edildi");
      addWatchlistButtonToMAL();
    }

    // Tranime için kontrol
    if (
      currentUrl.includes("tranimeizle.top") ||
      currentUrl.includes("www.tranimeizle.top")
    ) {
      console.log("Tranimeizle sayfası tespit edildi");
      const button = addUpdateButtonToTranime();

      if (button && document.body) {
        document.body.appendChild(button);
        console.log("Buton sayfaya eklendi");
      } else {
        console.log(
          "Buton eklenemedi - button:",
          button ? "Var" : "Yok",
          "document.body:",
          document.body ? "Var" : "Yok"
        );
      }
    }

    // Turkanime için kontrol
    if (
      currentUrl.includes("turkanime.co") ||
      currentUrl.includes("www.turkanime.co")
    ) {
      console.log("Turkanime sayfası tespit edildi");
      const button = addUpdateButtonToTurkanime();

      if (button && document.body) {
        document.body.appendChild(button);
        console.log("Buton sayfaya eklendi");
      } else {
        console.log(
          "Buton eklenemedi - button:",
          button ? "Var" : "Yok",
          "document.body:",
          document.body ? "Var" : "Yok"
        );
      }
    }

    // Anizium için kontrol
    if (currentUrl.includes("anizium.com")) {
      console.log("Anizium sayfası tespit edildi");
      addUpdateButtonToAnizium();
    }
  });
}

// Sayfa yüklendiğinde initialize fonksiyonunu çalıştır
console.log("Content script yükleniyor...", new Date().toISOString());

// Sayfa yüklendiğinde çalıştır
if (document.readyState === "loading") {
  console.log("Document loading durumunda, DOMContentLoaded eventi bekleniyor");
  document.addEventListener("DOMContentLoaded", () => {
    console.log("DOMContentLoaded eventi tetiklendi", new Date().toISOString());
    initialize();
  });
} else {
  console.log("Document zaten yüklenmiş durumda, initialize direkt çağrılıyor");
  initialize();
}

// URL değişikliklerini izle
let lastUrl = window.location.href;
new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl) {
    console.log("URL değişikliği tespit edildi:", url);
    lastUrl = url;
    initialize();
  }
}).observe(document, { subtree: true, childList: true });

// Content script mesaj dinleyicisi
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "extensionToggled") {
    extensionEnabled = message.enabled;
    if (!extensionEnabled) {
      removeExtensionButtons();
    } else {
      initialize();
    }
  }
  if (message.action === "getAnimeInfo") {
    sendResponse({ animeInfo: currentAnimeInfo });
  }
  return true;
});
