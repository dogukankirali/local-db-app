document.addEventListener("DOMContentLoaded", () => {
  const statusMessage = document.getElementById("statusMessage");
  const addToWatchlistBtn = document.getElementById("addToWatchlist");
  const openWatchlistBtn = document.getElementById("openWatchlist");
  const markAsWatchingBtn = document.getElementById("markAsWatching");
  const markAsCompletedBtn = document.getElementById("markAsCompleted");
  const markAsPlannedBtn = document.getElementById("markAsPlanned");

  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.display = "block";
    statusMessage.className = `status-message ${isError ? "error" : "success"}`;
    setTimeout(() => {
      statusMessage.style.display = "none";
    }, 3000);
  }

  addToWatchlistBtn.addEventListener("click", async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await browser.tabs.sendMessage(tabs[0].id, {
        action: "getAnimeInfo",
      });

      if (response && response.animeInfo) {
        const result = await fetch("https://localhost:8080/createAnime", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(response.animeInfo),
          credentials: "omit",
          mode: "cors",
        });

        if (result.ok) {
          const data = await result.json();
          showStatus("Anime successfully added to watchlist!");
        } else {
          const errorData = await result.json();
          let errorMessage = "Failed to add anime to watchlist";

          if (
            errorData.message &&
            errorData.message.includes("duplicate key value")
          ) {
            errorMessage = "This anime is already in your watchlist!";
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }

          showStatus(errorMessage, true);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      showStatus("An error occurred while adding anime to watchlist", true);
    }
  });

  openWatchlistBtn.addEventListener("click", () => {
    browser.tabs.create({ url: "http://localhost:3000/watchlist" });
  });

  // Hızlı durum değiştirme butonları için event listener'lar
  markAsWatchingBtn.addEventListener("click", async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await browser.tabs.sendMessage(tabs[0].id, {
        action: "getAnimeInfo",
        status: "watching",
      });
      showStatus("Status updated to Watching");
    } catch (error) {
      showStatus("Error updating status", true);
    }
  });

  markAsCompletedBtn.addEventListener("click", async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await browser.tabs.sendMessage(tabs[0].id, {
        action: "getAnimeInfo",
        status: "completed",
      });
      showStatus("Status updated to Completed");
    } catch (error) {
      showStatus("Error updating status", true);
    }
  });

  markAsPlannedBtn.addEventListener("click", async () => {
    try {
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await browser.tabs.sendMessage(tabs[0].id, {
        action: "getAnimeInfo",
        status: "planned",
      });
      showStatus("Status updated to Plan to Watch");
    } catch (error) {
      showStatus("Error updating status", true);
    }
  });
});
