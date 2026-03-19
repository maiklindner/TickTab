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
    // Check every 1 minute to stay responsive for short expiration settings
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });

    // Set default values if not exists
    chrome.storage.local.get(['expirationMinutes', 'enabled'], (res) => {
        if (!res.expirationMinutes) {
            chrome.storage.local.set({ expirationMinutes: DEFAULT_EXPIRATION_MINUTES });
        }
        if (res.enabled === undefined) {
            chrome.storage.local.set({ enabled: true });
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
    const data = await chrome.storage.local.get(['expirationMinutes', 'enabled']);
    if (data.enabled === false) return; // Exit early if globally disabled

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
        showManualFeedback(closedCount);
    }
}

// Function for "Smart Nuke": Closes ALL inactive tabs (non-pinned, non-audible)
async function nukeInactiveTabs() {
    const tabs = await chrome.tabs.query({});
    let closedCount = 0;

    for (const tab of tabs) {
        // === EXCEPTIONS ===
        if (tab.active) continue;
        if (tab.pinned) continue;
        if (tab.audible) continue;
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) continue;

        const key = `tab_${tab.url}`;
        chrome.tabs.remove(tab.id).catch(e => console.error("Error nuking tab", e));

        // Remove from storage
        chrome.storage.local.remove(key);
        closedCount++;
    }

    showManualFeedback(closedCount);
}

function showManualFeedback(closedCount) {
    if (closedCount > 0) {
        chrome.action.setBadgeText({ text: closedCount.toString() });
    } else {
        chrome.action.setBadgeText({ text: '0' });
    }
    chrome.action.setBadgeBackgroundColor({ color: '#333333' });
    if (chrome.action.setBadgeTextColor) {
        chrome.action.setBadgeTextColor({ color: '#eeeeee' });
    }

    // Remove badge after 2 seconds
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '' });
    }, 2000);
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'checkAndClose') {
        checkAndCloseTickTabs(request.isManual).then(() => {
            sendResponse({ success: true });
        });
        return true; 
    }
    if (request.action === 'nukeInactive') {
        nukeInactiveTabs().then(() => {
            sendResponse({ success: true });
        });
        return true;
    }
});

// Rule evaluation and closing triggers are handled via alarms and the management popup.
