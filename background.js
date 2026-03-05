const ALARM_NAME = 'coldtab-checker';
const DEFAULT_EXPIRATION_MINUTES = 7 * 24 * 60; // 1 week

// Helfer zum Aktualisieren des Zeitstempels
async function updateTabTimestamp(url, onlyIfNotExists = false) {
    if (!url || url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:')) {
        return;
    }

    const key = `tab_${url}`;

    if (onlyIfNotExists) {
        const data = await chrome.storage.local.get([key]);
        if (data[key]) {
            return; // Bereits vorhanden
        }
    }

    await chrome.storage.local.set({ [key]: Date.now() });
}

// Event: Tab wird gewechselt / betreten
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId).catch(() => null);
    if (tab && tab.url) {
        await updateTabTimestamp(tab.url);
    }
});

// Event: Tab lädt / ändert URL
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (tab.url) {
        // Wenn er aktiv ist, Timer aktualisieren
        if (tab.active) {
            await updateTabTimestamp(tab.url);
        } else {
            // Wenn er im Hintergrund geöffnet wurde, nur setzen falls noch nichts da ist
            // So beginnt der Timer für "im Hintergrund öffnen und vergessen" sofort
            await updateTabTimestamp(tab.url, true);
        }
    }
});

// Alarm Setup bei Installation (und Initialisierung)
chrome.runtime.onInstalled.addListener(() => {
    // Check alle 15 Minuten
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: 15 });

    // Standardwert setzen, falls noch nicht vorhanden
    chrome.storage.local.get(['expirationMinutes'], (res) => {
        if (!res.expirationMinutes) {
            chrome.storage.local.set({ expirationMinutes: DEFAULT_EXPIRATION_MINUTES });
        }
    });

    // Alle aktuell offenen Tabs "aufnehmen"
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url) updateTabTimestamp(tab.url, true);
        });
    });
});

// Der Alarm löst periodisch den Schließvorgang aus
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === ALARM_NAME) {
        await checkAndCloseColdTabs();
    }
});

async function checkAndCloseColdTabs() {
    const data = await chrome.storage.local.get(['expirationMinutes']);
    const expirationMinutes = data.expirationMinutes || DEFAULT_EXPIRATION_MINUTES;
    const expirationMs = expirationMinutes * 60 * 1000;
    const now = Date.now();

    const tabs = await chrome.tabs.query({});

    for (const tab of tabs) {
        // === AUSNAHMEN ===
        if (tab.active) continue; // Der aktuell aktive Tab darf nicht geschlossen werden
        if (tab.pinned) continue; // Gepinnte Tabs ignorieren
        if (tab.audible) continue; // Tabs, die gerade Sound abspielen (z.B. Musik, Video) ignorieren
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) continue; // Interne Seiten ignorieren

        const key = `tab_${tab.url}`;
        const storageData = await chrome.storage.local.get([key]);
        const lastActive = storageData[key];

        if (!lastActive) {
            // Wurde intern verpasst, z.B. weil der Browser zu früh gecrasht ist.
            // Wir stempeln ihn jetzt und lassen ihn diesmal in Ruhe.
            await updateTabTimestamp(tab.url);
            continue;
        }

        if (now - lastActive > expirationMs) {
            console.log(`[ColdTab] Schließe inaktiven Tab: ${tab.url} (Inaktiv für > ${expirationMinutes} Minuten)`);
            chrome.tabs.remove(tab.id).catch(e => console.error("Fehler beim Schließen des Tabs", e));

            // Aus Speicher entfernen
            chrome.storage.local.remove(key);
        }
    }
}

// Garbage Collection für manuell geschlossene Tabs
chrome.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
    // Wir bekommen hier leider keine URL. Ein kompletter GC-Lauf über alle Einträge
    // beim Start des Browsers wäre denkbar, aber da die URLs nur kleine Strings und Zahlen sind,
    // ignorieren wir das erstmal (5MB Limit für local.storage ist sehr groß dafür).
});

// Listener für Klick auf das Extension-Icon
chrome.action.onClicked.addListener((tab) => {
    chrome.runtime.openOptionsPage();
});
