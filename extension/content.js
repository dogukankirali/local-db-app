// ============================================================
// AniTracker Pro + AniSyncer Unified Content Script
// ============================================================

// ============================================================
// PART 1: AniTracker Core (Overlay & Skip Counter)
// ============================================================

let isTrackingActive = false;
let indicator = null;
let currentSkips = 0;
let currentMode = 'detailed';
let currentAnime = null;
let hideTimeout = null;
let lastUrl = location.href;
const isTopFrame = window === window.top;
let extensionEnabled = true;

chrome.storage.local.get(['trackingActive', 'totalSkips', 'overlayMode', 'anime', 'extension_enabled'], (data) => {
    isTrackingActive = data.trackingActive || false;
    currentSkips = data.totalSkips || 0;
    currentMode = data.overlayMode || 'detailed';
    currentAnime = data.anime || null;
    extensionEnabled = data.extension_enabled !== false;
    
    if (isTrackingActive) updateIndicator();
    if (isTopFrame) initSyncerButtons();
});

chrome.storage.onChanged.addListener((changes) => {
    let needsUpdate = false;
    if (changes.trackingActive) { isTrackingActive = changes.trackingActive.newValue; needsUpdate = true; }
    if (changes.totalSkips) { currentSkips = changes.totalSkips.newValue; needsUpdate = true; }
    if (changes.overlayMode) { currentMode = changes.overlayMode.newValue; needsUpdate = true; }
    if (changes.anime) { currentAnime = changes.anime.newValue; needsUpdate = true; }
    if (changes.extension_enabled) {
        extensionEnabled = changes.extension_enabled.newValue !== false;
        if (!extensionEnabled) {
            removeSyncerButtons();
        } else if (isTopFrame) {
            initSyncerButtons();
        }
    }
    if (needsUpdate) updateIndicator();
});

// URL Değişim Kontrolü
setInterval(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isTrackingActive) {
            chrome.runtime.sendMessage({ action: 'url_changed', url: lastUrl });
        }
        if (isTopFrame && extensionEnabled) {
            setTimeout(initSyncerButtons, 500);
        }
    }
}, 1000);

function createIndicator() {
    if (document.getElementById('anitracker-indicator')) return document.getElementById('anitracker-indicator');
    
    indicator = document.createElement('div');
    indicator.id = 'anitracker-indicator';
    
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes at-pulse { 0% { opacity: 1; } 50% { opacity: 0.2; } 100% { opacity: 1; } }
        .at-rec-dot { animation: at-pulse 1.5s infinite; font-size: 10px; margin-right: 4px; color: #ef4444; }
        
        #anitracker-indicator {
            position: fixed; top: 20px; right: 20px; background: rgba(18, 18, 18, 0.9); color: #fff;
            padding: 8px 12px; border-radius: 8px; font-family: "Roboto", -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 13px; font-weight: 500; z-index: 2147483647; display: none; flex-direction: column;
            border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(8px); 
            transition: max-height 0.3s ease, margin 0.3s ease, opacity 0.5s ease, border-color 0.15s ease;
            overflow: hidden; box-sizing: border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.5);
            opacity: 1;
        }
        
        #anitracker-indicator.detailed { pointer-events: auto; }
        #anitracker-indicator.minimal { pointer-events: none; }
        
        .at-header { display: flex; align-items: center; white-space: nowrap; transition: color 0.15s ease; cursor: default; }
        .at-details { display: flex; gap: 10px; max-height: 0; opacity: 0; margin-top: 0; transition: all 0.3s ease; }
        
        #anitracker-indicator.detailed:hover .at-details { max-height: 120px; opacity: 1; margin-top: 10px; }
        
        .at-details img { width: 50px; height: 75px; object-fit: cover; border-radius: 4px; }
        .at-info { display: flex; flex-direction: column; justify-content: center; max-width: 160px; }
        .at-info strong { font-size: 13px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; margin-bottom: 2px; }
        .at-info small { font-size: 11px; color: #4f46e5; margin-bottom: 6px; }
        .at-info span { font-size: 12px; color: #aaa; font-weight: 400; }
        .at-info span b { color: #ef4444; font-weight: 600; font-size: 14px; }
    `;
    document.head.appendChild(style);

    indicator.innerHTML = `
        <div class="at-header">
            <span class="at-rec-dot">🔴</span> 
            <span>AniTracker: <span id="at-skip-count">0</span></span>
        </div>
        <div class="at-details">
            <img id="at-anime-cover" src="" alt="anime cover" />
            <div class="at-info">
                <strong id="at-anime-title">Anime Seçilmedi</strong>
                <small id="at-anime-season">1. Sezon</small>
                <span>Toplam Skip: <b id="at-skip-count-detail">0</b></span>
            </div>
        </div>
    `;
    
    return indicator;
}

function wakeUpIndicator() {
    if (!indicator || !isTrackingActive) return;
    indicator.style.opacity = '1';
    indicator.style.pointerEvents = currentMode === 'detailed' ? 'auto' : 'none';
    clearTimeout(hideTimeout);
    
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
        hideTimeout = setTimeout(() => {
            if (indicator) {
                indicator.style.opacity = '0';
                indicator.style.pointerEvents = 'none';
            }
        }, 3000);
    }
}

document.addEventListener('mousemove', wakeUpIndicator);

function updateIndicator() {
    if (!isTrackingActive) {
        if (indicator) indicator.style.display = 'none';
        return;
    }
    
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    const shouldShow = isTopFrame || fsEl;
    
    if (shouldShow) {
        if (!indicator) indicator = createIndicator();
        
        indicator.className = currentMode;
        indicator.querySelector('#at-skip-count').innerText = currentSkips;
        indicator.querySelector('#at-skip-count-detail').innerText = currentSkips;
        
        if (currentAnime) {
            indicator.querySelector('#at-anime-cover').src = currentAnime.image || '';
            indicator.querySelector('#at-anime-title').innerText = currentAnime.title || 'Bilinmiyor';
            indicator.querySelector('#at-anime-season').innerText = (currentAnime.season || 1) + '. Sezon';
            indicator.querySelector('.at-details').style.display = 'flex';
        } else {
            indicator.querySelector('.at-details').style.display = 'none';
        }
        
        indicator.style.display = 'flex';
        wakeUpIndicator();
        
        if (fsEl) {
            if (fsEl.tagName.toLowerCase() === 'video') {
                if (fsEl.parentNode) fsEl.parentNode.appendChild(indicator);
            } else {
                fsEl.appendChild(indicator);
            }
        } else {
            if (document.body) document.body.appendChild(indicator);
        }
    } else {
        if (indicator) indicator.style.display = 'none';
    }
}

document.addEventListener('fullscreenchange', updateIndicator);
document.addEventListener('webkitfullscreenchange', updateIndicator);

function isVideoPlaying() {
    let isPlaying = false;
    const checkRoot = (root) => {
        const videos = root.querySelectorAll('video');
        for (let v of videos) {
            if (!v.paused && !v.ended) { isPlaying = true; return; }
        }
        const allElements = root.querySelectorAll('*');
        for (let el of allElements) {
            if (el.shadowRoot) checkRoot(el.shadowRoot);
            if (isPlaying) return;
        }
    };
    checkRoot(document);
    return isPlaying;
}

function flashIndicator() {
    if (indicator && indicator.style.display !== 'none') {
        indicator.style.borderColor = 'rgba(239, 68, 68, 0.9)';
        wakeUpIndicator();
        setTimeout(() => { indicator.style.borderColor = 'rgba(255,255,255,0.1)'; }, 150);
    }
}

window.addEventListener('keydown', (e) => {
    if (!isTrackingActive) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.key === 'ArrowRight') {
        const hostname = window.location.hostname.toLowerCase();
        const blacklist = ['youtube.', 'youtu.be', 'twitch.tv', 'netflix.', 'primevideo.', 'disneyplus.', 'exxen.', 'blutv.'];
        const isBlacklisted = blacklist.some(domain => hostname.includes(domain));
        
        let titleMatch = false;
        if (currentAnime && currentAnime.title) {
            const firstWord = currentAnime.title.toLowerCase().split(' ')[0];
            if (firstWord.length > 2 && document.title.toLowerCase().includes(firstWord)) titleMatch = true;
        }
        
        if (isBlacklisted && !titleMatch) return;

        if (isVideoPlaying()) {
            chrome.runtime.sendMessage({ action: 'skip_pressed', url: location.href });
            flashIndicator();
            chrome.runtime.sendMessage({ action: 'relay_blink' });
        }
    }
});


// ============================================================
// PART 2: AniSyncer Site Butonları (MAL + TurkAnime + Tranimeizle + Anizium)
// ============================================================

function extractEpisodeNumber(url) {
    const epPattern = /episode-(\d+)/i;
    const epMatch = url.match(epPattern);
    if (epMatch) return parseInt(epMatch[1]);

    const bolumPattern = /([0-9]+)[._-]bolum/i;
    const bMatch = url.match(bolumPattern);
    if (bMatch) return parseInt(bMatch[1]);

    return 0;
}

function cleanTitle(title) {
    if (!title) return '';
    return title.replace(/[^\w\s-]/g, "").trim();
}

function getMALAnimeData() {
    const nameEl = document.querySelector(".title-name.h1_bold_none strong");
    if (!nameEl) return null;

    const statusEl = Array.from(document.querySelectorAll(".spaceit_pad")).find(el => el.textContent.includes("Status:"));
    const episodesEl = Array.from(document.querySelectorAll(".spaceit_pad")).find(el => el.textContent.includes("Episodes:"));
    const typeEl = Array.from(document.querySelectorAll(".spaceit_pad")).find(el => el.textContent.includes("Type:"));
    const coverEl = document.querySelector(".leftside img");

    return {
        Name: nameEl.textContent.trim(),
        AnimeStatus: statusEl ? statusEl.textContent.replace("Status:", "").trim() : "",
        WatchStatus: 0,
        TotalNumberOfEpisodes: episodesEl ? parseInt(episodesEl.textContent.replace("Episodes:", "").trim()) || 0 : 0,
        IsMovie: typeEl ? typeEl.textContent.replace("Type:", "").trim().toLowerCase() === "movie" : false,
        Score: -1,
        MALScore: 0,
        Notes: "",
        MALAnimeLink: window.location.href,
        Cover: coverEl ? coverEl.src : "",
        AnimeLink: "",
        Series: 0,
        PlanToWatch: false
    };
}

function getStreamingEpisodeData() {
    const url = window.location.href;
    const episode = extractEpisodeNumber(url);

    let title = "";
    if (url.includes("tranimeizle.top")) {
        const titleEl = document.querySelector(".playlist-title h1") || document.querySelector("h1");
        if (titleEl) title = cleanTitle(titleEl.textContent);
    } else {
        const h1 = document.querySelector("h1");
        if (h1) title = cleanTitle(h1.textContent);
    }

    return {
        name: title,
        currentEpisode: episode
    };
}

function addMALWatchlistButton() {
    const url = window.location.href;
    if (!url.includes("myanimelist.net/anime/")) return;

    const container = document.querySelector(".user-status-block");
    if (container && !document.querySelector(".add-to-watchlist-btn")) {
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
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
            font-weight: 500;
        `;

        watchlistButton.addEventListener("mouseover", () => watchlistButton.style.backgroundColor = "#3c5aa6");
        watchlistButton.addEventListener("mouseout", () => watchlistButton.style.backgroundColor = "#4f74c8");

        watchlistButton.addEventListener("click", async () => {
            const data = getMALAnimeData();
            if (!data) return alert("Anime bilgileri okunamadı!");

            watchlistButton.textContent = "Ekleniyor...";
            watchlistButton.disabled = true;

            chrome.runtime.sendMessage({ action: "addToWatchlist", data }, (response) => {
                if (response && response.success) {
                    watchlistButton.textContent = "Added to Watchlist ✓";
                    watchlistButton.style.backgroundColor = "#10b981";
                    watchlistButton.style.borderColor = "#059669";
                } else {
                    const msg = response?.error?.includes("duplicate") ? "Zaten Listede" : "Hata!";
                    watchlistButton.textContent = msg;
                    watchlistButton.style.backgroundColor = "#ef4444";
                    watchlistButton.disabled = false;
                }
            });
        });

        container.appendChild(watchlistButton);
    }
}

function addStreamingUpdateButton() {
    const url = window.location.href;
    const isTargetSite = ["tranimeizle.top", "turkanime.co", "anizium.com"].some(d => url.includes(d));
    if (!isTargetSite) return;

    if (document.querySelector(".update-watch-status-btn")) return;

    const button = document.createElement("a");
    button.className = "update-watch-status-btn";
    button.textContent = "İzleme Durumunu Güncelle";
    button.href = "#";

    if (url.includes("tranimeizle.top")) {
        const playlistTitle = document.querySelector(".playlist-title");
        if (playlistTitle) {
            playlistTitle.style.display = "flex";
            playlistTitle.style.justifyContent = "space-between";
            playlistTitle.style.alignItems = "center";
            playlistTitle.style.flexWrap = "wrap";
            button.style.cssText = `
                display: inline-block; padding: 6px 14px; background-color: #4f46e5;
                color: #fff; text-decoration: none; border-radius: 6px; font-size: 13px;
                font-weight: 500; cursor: pointer; transition: all 0.2s;
            `;
            playlistTitle.appendChild(button);
        } else {
            attachFloatingButton(button);
        }
    } else {
        attachFloatingButton(button);
    }

    button.addEventListener("click", (e) => {
        e.preventDefault();
        const epData = getStreamingEpisodeData();
        if (!epData || !epData.name) {
            button.textContent = "Hata: Anime adı bulunamadı";
            button.style.backgroundColor = "#ef4444";
            return;
        }

        const originalText = button.textContent;
        button.textContent = "Güncelleniyor...";
        button.style.backgroundColor = "#6366f1";

        chrome.runtime.sendMessage({
            action: "updateAnimeStatus",
            data: {
                name: epData.name,
                watchStatus: epData.currentEpisode
            }
        }, (response) => {
            if (response && response.success) {
                button.textContent = "Güncellendi ✓";
                button.style.backgroundColor = "#10b981";
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = "#4f46e5";
                }, 2500);
            } else {
                button.textContent = "Hata: " + (response?.error || "Kayıt başarısız");
                button.style.backgroundColor = "#ef4444";
            }
        });
    });
}

function attachFloatingButton(button) {
    button.style.cssText = `
        display: inline-block; padding: 8px 16px; background-color: #4f46e5;
        color: #fff; text-decoration: none; border-radius: 6px; font-size: 13px;
        font-weight: 500; cursor: pointer; position: fixed; bottom: 20px; left: 20px;
        z-index: 2147483646; box-shadow: 0 4px 12px rgba(0,0,0,0.3); transition: all 0.2s;
    `;
    button.addEventListener("mouseover", () => button.style.backgroundColor = "#4338ca");
    button.addEventListener("mouseout", () => button.style.backgroundColor = "#4f46e5");
    document.body.appendChild(button);
}

function removeSyncerButtons() {
    document.querySelectorAll(".add-to-watchlist-btn, .update-watch-status-btn").forEach(el => el.remove());
}

function initSyncerButtons() {
    if (!extensionEnabled) {
        removeSyncerButtons();
        return;
    }
    addMALWatchlistButton();
    addStreamingUpdateButton();
}

// ============================================================
// PART 3: Popup Request Listeners (getAnimeInfo & getEpisodeInfo)
// ============================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'blink_indicator') {
        flashIndicator();
        return;
    }

    if (request.action === "extensionToggled") {
        extensionEnabled = request.enabled;
        if (!extensionEnabled) removeSyncerButtons();
        else initSyncerButtons();
        return;
    }

    if (request.action === "getAnimeInfo") {
        const info = getMALAnimeData();
        sendResponse({ animeInfo: info });
        return true;
    }

    if (request.action === "getEpisodeInfo") {
        const epData = getStreamingEpisodeData();
        sendResponse({
            episodeInfo: epData && epData.name ? {
                name: epData.name,
                watchStatus: epData.currentEpisode
            } : null
        });
        return true;
    }
});
