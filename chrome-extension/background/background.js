// Background script başlangıç logu
console.log("Background script yükleniyor...", new Date().toISOString());

function updateExtensionBadge() {
  chrome.storage.local.get(["extension_enabled", "service_url"], (result) => {
    if (!result.service_url) {
      chrome.action.setBadgeText({ text: "!" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff1744" });
    } else if (result.extension_enabled !== false) {
      chrome.action.setBadgeText({ text: "●" });
      chrome.action.setBadgeBackgroundColor({ color: "#00c853" });
    } else {
      chrome.action.setBadgeText({ text: "●" });
      chrome.action.setBadgeBackgroundColor({ color: "#ff1744" });
    }
  });
}

chrome.runtime.onStartup.addListener(() => {
  updateExtensionBadge();
});
chrome.runtime.onInstalled.addListener(() => {
  updateExtensionBadge();
});

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script'e mesaj geldi:", message);

  if (message.action === "toggleExtension") {
    updateExtensionBadge();
    chrome.tabs.query({}, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { action: "extensionToggled", enabled: message.enabled }, () => {});
      }
    });
    return;
  }
  if (message.action === "setBadge" || message.action === "clearBadge" || message.action === "updateBadge") {
    updateExtensionBadge();
    return;
  }

  if (message.action === "addToWatchlist") {
    chrome.storage.local.get("service_url", (result) => {
      const serviceUrl = result.service_url || "https://localhost:8080";
      fetch(`${serviceUrl}/createAnime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message.data),
        credentials: "omit",
        mode: "cors",
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Local DB yanıtı:", data);
          sendResponse({ success: true, data: data });
        })
        .catch((error) => {
          console.error("Local DB hatası:", error);
          sendResponse({ success: false, error: error.message });
        });
    });
    return true;
  }

  if (message.action === "updateAnimeStatus") {
    chrome.storage.local.get("service_url", (result) => {
      const serviceUrl = result.service_url || "https://localhost:8080";
      fetch(`${serviceUrl}/updateAnimeStatus`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message.data),
        credentials: "omit",
        mode: "cors",
      })
        .then((response) => response.json())
        .then((data) => {
          console.log("Local DB yanıtı:", data);
          sendResponse({ success: true, data: data });
        })
        .catch((error) => {
          console.error("Local DB hatası:", error);
          sendResponse({ success: false, error: error.message });
        });
    });
    return true;
  }
});
