// ============================================================
// AniTracker Pro + AniSyncer Unified Background Service Worker
// ============================================================

function updateExtensionBadge() {
    chrome.storage.local.get(["extension_enabled", "service_url"], (result) => {
        if (!result.service_url) {
            chrome.action.setBadgeText({ text: "!" });
            chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
        } else if (result.extension_enabled !== false) {
            chrome.action.setBadgeText({ text: "●" });
            chrome.action.setBadgeBackgroundColor({ color: "#10b981" });
        } else {
            chrome.action.setBadgeText({ text: "●" });
            chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });
        }
    });
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(['trackingActive', 'totalSkips', 'animeHistory', 'theme', 'extension_enabled'], (data) => {
        const defaults = {};
        if (data.trackingActive === undefined) defaults.trackingActive = false;
        if (data.totalSkips === undefined) defaults.totalSkips = 0;
        if (data.anime === undefined) defaults.anime = null;
        if (data.tempo === undefined) defaults.tempo = 5;
        if (data.overlayMode === undefined) defaults.overlayMode = 'detailed';
        if (data.animeHistory === undefined) defaults.animeHistory = {};
        if (data.theme === undefined) defaults.theme = 'dark';
        if (data.extension_enabled === undefined) defaults.extension_enabled = true;

        if (Object.keys(defaults).length > 0) {
            chrome.storage.local.set(defaults);
        }
    });
    updateExtensionBadge();
});

chrome.runtime.onStartup.addListener(() => {
    updateExtensionBadge();
});

// ============================================================
// Skip & URL Tracking State (AniTracker Core)
// ============================================================

let pendingSkips = 0;
let isUpdating = false;

function handleUrlChange(newUrl) {
    chrome.storage.local.get(['trackingActive', 'anime', 'animeHistory'], (data) => {
        if (data.trackingActive && data.anime) {
            let hist = data.animeHistory || {};
            let entry = hist[data.anime.dbId];
            if (entry) {
                let stats = entry.stats || [];
                if (stats.length === 0 || stats[stats.length - 1].url !== newUrl) {
                    stats.push({ url: newUrl, skips: 0 });
                    entry.stats = stats;
                    chrome.storage.local.set({ animeHistory: hist });
                }
            }
        }
    });
}

function processSkips(currentUrl) {
    if (isUpdating || pendingSkips === 0) return;
    isUpdating = true;
    
    const skipsToAdd = pendingSkips;
    pendingSkips = 0;
    
    chrome.storage.local.get(['trackingActive', 'totalSkips', 'anime', 'animeHistory'], (data) => {
        if (data.trackingActive && data.anime) {
            const newTotal = (data.totalSkips || 0) + skipsToAdd;
            
            let hist = data.animeHistory || {};
            let entry = hist[data.anime.dbId] || { status: 'watching', skips: 0, score: null, stats: [], title: data.anime.title, image: data.anime.image };
            
            entry.skips = newTotal;
            entry.status = entry.status === 'completed' ? 'completed' : 'watching';
            
            if (!entry.stats) entry.stats = [];
            if (entry.stats.length === 0) {
                entry.stats.push({ url: currentUrl || 'Bilinmeyen Bölüm', skips: skipsToAdd });
            } else {
                entry.stats[entry.stats.length - 1].skips += skipsToAdd;
            }
            
            hist[data.anime.dbId] = entry;

            chrome.storage.local.set({ totalSkips: newTotal, animeHistory: hist }, () => {
                isUpdating = false;
                processSkips(currentUrl);
            });
        } else {
            isUpdating = false;
            pendingSkips = 0;
        }
    });
}

// ============================================================
// Message Listener (Unified: Skip + AniSyncer)
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. AniTracker Mesajları
    if (request.action === 'skip_pressed') {
        pendingSkips++;
        processSkips(request.url);
        return;
    } 
    
    if (request.action === 'url_changed') {
        handleUrlChange(request.url);
        return;
    } 
    
    if (request.action === 'relay_blink') {
        if (sender.tab && sender.tab.id) {
            chrome.tabs.sendMessage(sender.tab.id, { action: 'blink_indicator' });
        }
        return;
    }

    // 2. AniSyncer Extension Toggle ve Badge
    if (request.action === "toggleExtension") {
        updateExtensionBadge();
        chrome.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                chrome.tabs.sendMessage(tab.id, { action: "extensionToggled", enabled: request.enabled }, () => {});
            }
        });
        return;
    }

    if (request.action === "updateBadge" || request.action === "setBadge" || request.action === "clearBadge") {
        updateExtensionBadge();
        return;
    }

    // 3. AniSyncer Backend API Proxy
    if (request.action === "addToWatchlist") {
        chrome.storage.local.get("service_url", (result) => {
            const serviceUrl = result.service_url || "https://localhost:8080";
            fetch(`${serviceUrl}/createAnime`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request.data),
                credentials: "omit",
                mode: "cors"
            })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        });
        return true;
    }

    if (request.action === "updateAnimeStatus") {
        chrome.storage.local.get("service_url", (result) => {
            const serviceUrl = result.service_url || "https://localhost:8080";
            // Backend'in updateAnimeEpisode fonksiyonu /api/anime/update-episode rotasındadır
            fetch(`${serviceUrl}/api/anime/update-episode`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(request.data),
                credentials: "omit",
                mode: "cors"
            })
            .then(res => res.json())
            .then(data => sendResponse({ success: true, data }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        });
        return true;
    }
});
