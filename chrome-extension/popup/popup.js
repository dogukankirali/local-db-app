document.addEventListener("DOMContentLoaded", () => {
  const statusMessage = document.getElementById("statusMessage");
  const addToWatchlistBtn = document.getElementById("addToWatchlist");
  const openWatchlistBtn = document.getElementById("openWatchlist");
  const markAsWatchingBtn = document.getElementById("markAsWatching");
  const markAsCompletedBtn = document.getElementById("markAsCompleted");
  const markAsPlannedBtn = document.getElementById("markAsPlanned");
  const toggleExtensionBtn = document.getElementById("toggleExtensionBtn");

  // --- Service & Dashboard URL logic ---
  const serviceUrlContainer = document.getElementById("serviceUrlContainer");
  const serviceUrlInput = document.getElementById("serviceUrlInput");
  const saveServiceUrlBtn = document.getElementById("saveServiceUrlBtn");
  const dashboardUrlContainer = document.getElementById("dashboardUrlContainer");
  const dashboardUrlInput = document.getElementById("dashboardUrlInput");
  const saveDashboardUrlBtn = document.getElementById("saveDashboardUrlBtn");
  const changeUrlBtnGroup = document.getElementById("changeUrlBtnGroup");
  const changeServiceUrlBtn = document.getElementById("changeServiceUrlBtn");
  const changeDashboardUrlBtn = document.getElementById("changeDashboardUrlBtn");
  const currentUrlsBox = document.getElementById("currentUrlsBox");
  const currentServiceUrlTextBox = document.getElementById("currentServiceUrlTextBox");
  const currentDashboardUrlTextBox = document.getElementById("currentDashboardUrlTextBox");

  function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.display = "block";
    statusMessage.className = `status-message ${isError ? "error" : "success"}`;
    setTimeout(() => {
      statusMessage.style.display = "none";
    }, 3000);
  }

  async function getServiceUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get("service_url", (result) => {
        resolve(result.service_url || "");
      });
    });
  }
  async function getDashboardUrl() {
    return new Promise((resolve) => {
      chrome.storage.local.get("dashboard_url", (result) => {
        resolve(result.dashboard_url || "");
      });
    });
  }
  async function isExtensionEnabled() {
    return new Promise((resolve) => {
      chrome.storage.local.get("extension_enabled", (result) => {
        resolve(result.extension_enabled !== false);
      });
    });
  }

  addToWatchlistBtn.addEventListener("click", async () => {
    if (!(await isExtensionEnabled())) return;
    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await chrome.tabs.sendMessage(tabs[0].id, {
        action: "getAnimeInfo",
      });
      if (response && response.animeInfo) {
        const serviceUrl = await getServiceUrl();
        const result = await fetch(`${serviceUrl}/createAnime`, {
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

  openWatchlistBtn.addEventListener("click", async () => {
    if (!(await isExtensionEnabled())) return;
    const dashboardUrl = await getDashboardUrl();
    chrome.tabs.create({ url: `${dashboardUrl}/watchlist` });
  });

  // Hızlı durum değiştirme butonları için event listener'lar
  if (markAsWatchingBtn) {
    markAsWatchingBtn.addEventListener("click", async () => {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: "getAnimeInfo",
          status: "watching",
        });
        showStatus("Status updated to Watching");
      } catch (error) {
        showStatus("Error updating status", true);
      }
    });
  }

  if (markAsCompletedBtn) {
    markAsCompletedBtn.addEventListener("click", async () => {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: "getAnimeInfo",
          status: "completed",
        });
        showStatus("Status updated to Completed");
      } catch (error) {
        showStatus("Error updating status", true);
      }
    });
  }

  if (markAsPlannedBtn) {
    markAsPlannedBtn.addEventListener("click", async () => {
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        const response = await chrome.tabs.sendMessage(tabs[0].id, {
          action: "getAnimeInfo",
          status: "planned",
        });
        showStatus("Status updated to Plan to Watch");
      } catch (error) {
        showStatus("Error updating status", true);
      }
    });
  }

  function updateServiceUrlUI() {
    chrome.storage.local.get("service_url", (result) => {
      if (!result.service_url) {
        serviceUrlContainer.style.display = "flex";
      } else {
        serviceUrlContainer.style.display = "none";
      }
    });
  }
  updateServiceUrlUI();

  function updateDashboardUrlUI() {
    chrome.storage.local.get("dashboard_url", (result) => {
      if (!result.dashboard_url) {
        dashboardUrlContainer.style.display = "flex";
      } else {
        dashboardUrlContainer.style.display = "none";
      }
    });
  }
  updateDashboardUrlUI();

  function updateUrlBtnGroupUI() {
    chrome.storage.local.get(["service_url", "dashboard_url"], (result) => {
      if (result.service_url || result.dashboard_url) {
        changeUrlBtnGroup.style.display = "flex";
      } else {
        changeUrlBtnGroup.style.display = "none";
      }
    });
  }
  updateUrlBtnGroupUI();

  function updateCurrentUrlsBox() {
    chrome.storage.local.get(["service_url", "dashboard_url"], (result) => {
      const hasService = !!result.service_url;
      const hasDashboard = !!result.dashboard_url;
      if (hasService || hasDashboard) {
        currentUrlsBox.style.display = "block";
        currentServiceUrlTextBox.textContent = hasService ? result.service_url : "-";
        currentDashboardUrlTextBox.textContent = hasDashboard ? result.dashboard_url : "-";
      } else {
        currentUrlsBox.style.display = "none";
      }
    });
  }
  updateCurrentUrlsBox();

  saveServiceUrlBtn.addEventListener("click", () => {
    const url = serviceUrlInput.value.trim();
    if (url) {
      chrome.storage.local.set({ service_url: url }, () => {
        serviceUrlContainer.style.display = "none";
        showStatus("Service URL kaydedildi!");
        updateServiceUrlUI();
        updateDashboardUrlUI();
        updateUrlBtnGroupUI();
        updateCurrentUrlsBox();
      });
    }
  });
  saveDashboardUrlBtn.addEventListener("click", () => {
    const url = dashboardUrlInput.value.trim();
    if (url) {
      chrome.storage.local.set({ dashboard_url: url }, () => {
        dashboardUrlContainer.style.display = "none";
        showStatus("Dashboard URL kaydedildi!");
        updateServiceUrlUI();
        updateDashboardUrlUI();
        updateUrlBtnGroupUI();
        updateCurrentUrlsBox();
      });
    }
  });
  changeServiceUrlBtn.addEventListener("click", () => {
    serviceUrlContainer.style.display = "flex";
    changeUrlBtnGroup.style.display = "none";
    chrome.storage.local.get("service_url", (result) => {
      serviceUrlInput.value = result.service_url || "";
    });
  });
  changeDashboardUrlBtn.addEventListener("click", () => {
    dashboardUrlContainer.style.display = "flex";
    changeUrlBtnGroup.style.display = "none";
    chrome.storage.local.get("dashboard_url", (result) => {
      dashboardUrlInput.value = result.dashboard_url || "";
    });
  });

  function updateToggleButtonUI(enabled) {
    if (enabled) {
      toggleExtensionBtn.textContent = " Extension: On";
      toggleExtensionBtn.classList.remove("off");
      toggleExtensionBtn.classList.add("on");
      toggleExtensionBtn.style.backgroundColor = "#00c853";
    } else {
      toggleExtensionBtn.textContent = " Extension: Off";
      toggleExtensionBtn.classList.remove("on");
      toggleExtensionBtn.classList.add("off");
      toggleExtensionBtn.style.backgroundColor = "#ff1744";
    }
    // Add icon (remove old first)
    const oldIcon = toggleExtensionBtn.querySelector("i");
    if (oldIcon) oldIcon.remove();
    const icon = document.createElement("i");
    icon.className = "fas fa-power-off";
    icon.style.marginRight = "8px";
    toggleExtensionBtn.prepend(icon);
  }

  // Load initial state on popup open
  chrome.storage.local.get("extension_enabled", (result) => {
    const enabled = result.extension_enabled !== false; // default: true
    updateToggleButtonUI(enabled);
  });

  toggleExtensionBtn.addEventListener("click", () => {
    chrome.storage.local.get("extension_enabled", (result) => {
      const enabled = !(result.extension_enabled !== false); // toggle
      chrome.storage.local.set({ extension_enabled: enabled }, () => {
        chrome.storage.local.get("extension_enabled", (newResult) => {
          const newEnabled = newResult.extension_enabled !== false;
          updateToggleButtonUI(newEnabled);
        });
        chrome.runtime.sendMessage({ action: "toggleExtension", enabled });
      });
    });
  });

  // On popup open, update all UI elements
  updateServiceUrlUI();
  updateDashboardUrlUI();
  updateUrlBtnGroupUI();
  updateCurrentUrlsBox();

  // DEBUG: Force show all URL controls
  document.getElementById("serviceUrlContainer").style.display = "flex";
  document.getElementById("dashboardUrlContainer").style.display = "flex";
  document.getElementById("changeUrlBtnGroup").style.display = "flex";
  document.getElementById("currentUrlsBox").style.display = "block";
});
