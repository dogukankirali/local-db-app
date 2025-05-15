// Extension yüklendiğinde çalışacak kod
browser.runtime.onInstalled.addListener(() => {
  console.log("Anime Watchlist extension yüklendi!");
  updateExtensionBadge();
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

// Helper to get service_url from storage
async function getServiceUrl() {
  const result = await browser.storage.local.get("service_url");
  return result.service_url || "";
}

// Background script mesaj dinleyicisi
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Mesaj alındı:", message.action);

  if (message.action === "addToWatchlist") {
    (async () => {
      const serviceUrl = await getServiceUrl();
      fetch(`${serviceUrl}/createAnime`, {
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
    })();
    return true; // Will respond asynchronously
  }

  if (message.action === "updateAnimeStatus") {
    (async () => {
      const serviceUrl = await getServiceUrl();
      fetch(`${serviceUrl}/api/anime/update-episode`, {
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
    })();
    return true;
  }

  if (message.action === "toggleExtension") {
    updateExtensionBadge();
    // Broadcast to all tabs, suppress errors if content script is not present
    browser.tabs.query({}).then((tabs) => {
      for (const tab of tabs) {
        browser.tabs.sendMessage(tab.id, { action: "extensionToggled", enabled: message.enabled }).catch(() => {});
      }
    });
    return;
  }

  if (message.action === "setBadge" || message.action === "clearBadge" || message.action === "updateBadge") {
    updateExtensionBadge();
    return;
  }

  // Extension ilk yüklendiğinde badge'i ayarla
  browser.runtime.onStartup.addListener(() => {
    updateExtensionBadge();
  });
});

function updateExtensionBadge() {
  browser.storage.local.get(["extension_enabled", "service_url"]).then((result) => {
    if (!result.service_url) {
      browser.browserAction.setBadgeText({ text: "!" });
      browser.browserAction.setBadgeBackgroundColor({ color: "#ff1744" });
    } else if (result.extension_enabled !== false) {
      browser.browserAction.setBadgeText({ text: "●" });
      browser.browserAction.setBadgeBackgroundColor({ color: "#00c853" });
    } else {
      browser.browserAction.setBadgeText({ text: "●" });
      browser.browserAction.setBadgeBackgroundColor({ color: "#ff1744" });
    }
  });
}
