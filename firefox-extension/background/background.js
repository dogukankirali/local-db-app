// Extension yüklendiğinde çalışacak kod
browser.runtime.onInstalled.addListener(() => {
  console.log("Anime Watchlist extension yüklendi!");
});

// Extension güncellendiğinde çalışacak kod
browser.runtime.onUpdateAvailable.addListener(() => {
  console.log("Anime Watchlist extension güncellendi!");
});

// SSL sertifika kontrolünü devre dışı bırak
browser.webRequest.onBeforeRequest.addListener(
  function (details) {
    if (details.url.includes("localhost:8080")) {
      console.log("Localhost isteği algılandı:", details.url);
      return { cancel: false };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Background script mesaj dinleyicisi
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mesaj alındı:", message.action);

  if (message.action === "addToWatchlist") {
    fetch("https://localhost:8080/createAnime", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message.data),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Anime başarıyla watchlist'e eklendi");
          sendResponse({ success: true });
        } else {
          return response.json().then((errorData) => {
            console.error("Sunucu hatası:", errorData);
            sendResponse({
              success: false,
              error:
                errorData.message || "Watchlist'e eklenirken bir hata oluştu",
            });
          });
        }
      })
      .catch((error) => {
        console.error("Arka plan betiği hatası:", error);
        sendResponse({
          success: false,
          error:
            "Sunucuya bağlanırken bir hata oluştu. Lütfen sunucunun çalıştığından emin olun.",
        });
      });

    return true; // Will respond asynchronously
  }

  if (message.action === "updateAnimeStatus") {
    fetch("https://localhost:8080/api/anime/update-episode", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message.data),
    })
      .then((response) => {
        if (response.ok) {
          console.log("Anime durumu başarıyla güncellendi");
          sendResponse({ success: true });
        } else {
          return response.json().then((errorData) => {
            console.error("Sunucu hatası:", errorData);
            sendResponse({
              success: false,
              error:
                errorData.message || "Durum güncellenirken bir hata oluştu",
            });
          });
        }
      })
      .catch((error) => {
        console.error("Arka plan betiği hatası:", error);
        sendResponse({
          success: false,
          error:
            "Sunucuya bağlanırken bir hata oluştu. Lütfen sunucunun çalıştığından emin olun.",
        });
      });

    return true;
  }
});
