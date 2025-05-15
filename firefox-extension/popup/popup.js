document.addEventListener("DOMContentLoaded", () => {
  const statusMessage = document.getElementById("statusMessage");
  const addToWatchlistBtn = document.getElementById("addToWatchlist");
  const openWatchlistBtn = document.getElementById("openWatchlist");
  const markAsWatchingBtn = document.getElementById("markAsWatching");
  const markAsCompletedBtn = document.getElementById("markAsCompleted");
  const markAsPlannedBtn = document.getElementById("markAsPlanned");
  const serviceUrlContainer = document.getElementById("serviceUrlContainer");
  const serviceUrlInput = document.getElementById("serviceUrlInput");
  const saveServiceUrlBtn = document.getElementById("saveServiceUrlBtn");
  const changeServiceUrlBtnContainer = document.getElementById("changeServiceUrlBtnContainer");
  const changeServiceUrlBtn = document.getElementById("changeServiceUrlBtn");
  const toggleExtensionBtn = document.getElementById("toggleExtensionBtn");
  const dashboardUrlContainer = document.getElementById("dashboardUrlContainer");
  const dashboardUrlInput = document.getElementById("dashboardUrlInput");
  const saveDashboardUrlBtn = document.getElementById("saveDashboardUrlBtn");
  const changeUrlBtnGroup = document.getElementById("changeUrlBtnGroup");
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

  // Check and show input or change button depending on service_url
  function updateServiceUrlUI() {
    browser.storage.local.get("service_url").then((result) => {
      if (!result.service_url) {
        serviceUrlContainer.style.display = "flex";
      } else {
        serviceUrlContainer.style.display = "none";
      }
    });
  }
  updateServiceUrlUI();

  // Helper to update badge based on service_url
  function updateBadge() {
    browser.storage.local.get("service_url").then((result) => {
      if (!result.service_url) {
        browser.runtime.sendMessage({ action: "setBadge", color: "red" });
      } else {
        browser.runtime.sendMessage({ action: "clearBadge" });
      }
    });
  }

  // Call on popup open
  updateBadge();

  function updateCurrentUrlsBox() {
    Promise.all([
      browser.storage.local.get("service_url"),
      browser.storage.local.get("dashboard_url")
    ]).then(([service, dashboard]) => {
      const hasService = !!service.service_url;
      const hasDashboard = !!dashboard.dashboard_url;
      if (hasService || hasDashboard) {
        currentUrlsBox.style.display = "block";
        currentServiceUrlTextBox.textContent = hasService ? service.service_url : "-";
        currentDashboardUrlTextBox.textContent = hasDashboard ? dashboard.dashboard_url : "-";
      } else {
        currentUrlsBox.style.display = "none";
      }
    });
  }
  updateCurrentUrlsBox();

  saveServiceUrlBtn.addEventListener("click", () => {
    const url = serviceUrlInput.value.trim();
    if (url) {
      browser.storage.local.set({ service_url: url }).then(() => {
        serviceUrlContainer.style.display = "none";
        showStatus("Service URL kaydedildi!");
        updateServiceUrlUI();
        updateBadge();
        browser.runtime.sendMessage({ action: "updateBadge" });
        updateUrlBtnGroupUI();
        updateCurrentUrlsBox();
      });
    }
  });

  changeServiceUrlBtn.addEventListener("click", () => {
    serviceUrlContainer.style.display = "flex";
    changeUrlBtnGroup.style.display = "none";
    browser.storage.local.get("service_url").then((result) => {
      serviceUrlInput.value = result.service_url || "";
    });
  });

  async function getServiceUrl() {
    const result = await browser.storage.local.get("service_url");
    return result.service_url || "";
  }

  async function getDashboardUrl() {
    const result = await browser.storage.local.get("dashboard_url");
    return result.dashboard_url || "";
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
    const dashboardUrl = await getDashboardUrl();
    browser.tabs.create({ url: `${dashboardUrl}/watchlist` });
  });

  // Hızlı durum değiştirme butonları için event listener'lar
  if (markAsWatchingBtn) {
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
  }

  if (markAsCompletedBtn) {
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
  }

  if (markAsPlannedBtn) {
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
  }

  // Load initial state on popup open
  browser.storage.local.get("extension_enabled").then((result) => {
    const enabled = result.extension_enabled !== false; // default: true
    updateToggleButtonUI(enabled);
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

  // Toggle logic
  if (toggleExtensionBtn) {
    toggleExtensionBtn.addEventListener("click", () => {
      browser.storage.local.get("extension_enabled").then((result) => {
        const enabled = !(result.extension_enabled !== false); // toggle
        browser.storage.local.set({ extension_enabled: enabled }).then(() => {
          browser.storage.local.get("extension_enabled").then((newResult) => {
            const newEnabled = newResult.extension_enabled !== false;
            updateToggleButtonUI(newEnabled);
          });
          browser.runtime.sendMessage({ action: "toggleExtension", enabled });
          browser.runtime.sendMessage({ action: "updateBadge" });
        });
      });
    });
  } else {
    console.error("toggleExtensionBtn bulunamadı!");
  }

  // Check and show input if dashboard_url is not set
  browser.storage.local.get("dashboard_url").then((result) => {
    if (!result.dashboard_url) {
      dashboardUrlContainer.style.display = "flex";
    } else {
      dashboardUrlContainer.style.display = "none";
    }
  });

  saveDashboardUrlBtn.addEventListener("click", () => {
    const url = dashboardUrlInput.value.trim();
    if (url) {
      browser.storage.local.set({ dashboard_url: url }).then(() => {
        dashboardUrlContainer.style.display = "none";
        showStatus("Dashboard URL kaydedildi!");
        updateUrlBtnGroupUI();
        updateCurrentUrlsBox();
      });
    }
  });

  async function getDashboardUrl() {
    const result = await browser.storage.local.get("dashboard_url");
    return result.dashboard_url || "http://localhost:3000/watchlist";
  }

  // Show button group if either url is set
  function updateUrlBtnGroupUI() {
    Promise.all([
      browser.storage.local.get("service_url"),
      browser.storage.local.get("dashboard_url")
    ]).then(([service, dashboard]) => {
      if (service.service_url || dashboard.dashboard_url) {
        changeUrlBtnGroup.style.display = "flex";
      } else {
        changeUrlBtnGroup.style.display = "none";
      }
    });
  }
  updateUrlBtnGroupUI();

  // Change Dashboard URL logic
  changeDashboardUrlBtn.addEventListener("click", () => {
    dashboardUrlContainer.style.display = "flex";
    changeUrlBtnGroup.style.display = "none";
    browser.storage.local.get("dashboard_url").then((result) => {
      dashboardUrlInput.value = result.dashboard_url || "";
    });
  });
});
