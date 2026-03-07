const ALARM_NAME = 'ticktab-checker';
const DEFAULT_EXPIRATION_MINUTES = 7 * 24 * 60; // 1 week

// Helper to update the timestamp
async function updateTabTimestamp(url, onlyIfNotExists = false) {
    if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
        return;
    }

    const key = `tab_${url}`;

    if (onlyIfNotExists) {
        const data = await chrome.storage.local.get([key]);
        if (data[key]) {
            return; // Already exists
        }
    }

    await chrome.storage.local.set({ [key]: Date.now() });
}

// Event: Tab is switched / entered
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
    if (tab && tab.url) {
        await updateTabTimestamp(tab.url);
    }
});

// Event: Tab loads / changes URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tab.url) {
        // Update timer if active
        if (tab.active) {
            await updateTabTimestamp(tab.url);
        } else {
            // If opened in background, set only if it doesn't exist
            // This starts the timer for "open in background and forget" immediately
            await updateTabTimestamp(tab.url, true);
        }
    }
});

// Alarm setup on installation (and initialization)
chrome.runtime.onInstalled.addListener(() => {
    // Check every 15 minutes
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 15 });

    // Set default value if not exists
    chrome.storage.local.get(['expirationMinutes'], (res) => {
        if (!res.expirationMinutes) {
            chrome.storage.local.set({ expirationMinutes: DEFAULT_EXPIRATION_MINUTES });
        }
    });

    // "Capture" all currently open tabs
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url) updateTabTimestamp(tab.url, true);
        });
    });
});

// The alarm periodically triggers the closing process
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        await checkAndCloseTickTabs();
    }
});

async function checkAndCloseTickTabs(isManual = false) {
    const data = await chrome.storage.local.get(['expirationMinutes']);
    const expirationMinutes = data.expirationMinutes || DEFAULT_EXPIRATION_MINUTES;
    const expirationMs = expirationMinutes * 60 * 1000;
    const now = Date.now();

    const tabs = await chrome.tabs.query({});
    let closedCount = 0;

    for (const tab of tabs) {
        // === EXCEPTIONS ===
        if (tab.active) continue; // The currently active tab must not be closed
        if (tab.pinned) continue; // Ignore pinned tabs
        if (tab.audible) continue; // Ignore tabs currently playing sound (e.g. music, video)
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) continue; // Ignore internal pages

        const key = `tab_${tab.url}`;
        const storageData = await chrome.storage.local.get([key]);
        const lastActive = storageData[key];

        if (!lastActive) {
            // Missed internally, e.g. browser crashed too early.
            // Stamp it now and leave it alone this time.
            await updateTabTimestamp(tab.url);
            continue;
        }

        if (now - lastActive > expirationMs) {
            console.log(`[TickTab] Closing inactive tab: ${tab.url} (Inactive for > ${expirationMinutes} minutes)`);
            chrome.tabs.remove(tab.id).catch(e => console.error("Error closing tab", e));

            // Remove from storage
            chrome.storage.local.remove(key);
            closedCount++;
        }
    }

    // Visual feedback on manual click
    if (isManual) {
        if (closedCount > 0) {
            chrome.action.setBadgeText({ text: closedCount.toString() });
            chrome.action.setBadgeBackgroundColor({ color: '#3498db' }); // Blue
        } else {
            chrome.action.setBadgeText({ text: '✓' });
            chrome.action.setBadgeBackgroundColor({ color: '#2ecc71' }); // Green
        }

        // Remove badge after 2 seconds
        setTimeout(() => {
            chrome.action.setBadgeText({ text: '' });
        }, 2000);
    }
}

// Garbage collection for manually closed tabs
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    // Unfortunately we don't get a URL here. A complete GC run over all entries
    // on browser startup would be possible, but since URLs are just small strings and numbers,
    // we ignore this for now (5MB limit for local.storage is plenty).
});

// Listener for extension icon click (manual cleanup)
chrome.action.onClicked.addListener(async (tab) => {
    await checkAndCloseTickTabs(true);
});
