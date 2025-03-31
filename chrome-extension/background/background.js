// Background script başlangıç logu
console.log("Background script yükleniyor...", new Date().toISOString());

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background script'e mesaj geldi:", message);

  if (message.action === "addToWatchlist") {
    // Local DB'ye anime ekleme isteği
    fetch("https://localhost:8080/createAnime", {
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

    return true; // Asenkron yanıt için gerekli
  }

  if (message.action === "updateAnimeStatus") {
    // Local DB'ye anime durumu güncelleme isteği
    fetch("https://localhost:8080/updateAnimeStatus", {
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

    return true; // Asenkron yanıt için gerekli
  }
});
