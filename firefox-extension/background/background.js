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
      return { cancel: false };
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);
