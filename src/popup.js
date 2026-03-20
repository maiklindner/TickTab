let currentMessages = {};
let tabTimestamps = {};

function getMessage(key) {
    return currentMessages[key] ? currentMessages[key].message : key;
}

function initLocalization(callback) {
    chrome.storage.sync.get({ language: 'auto' }, (data) => {
        let lang = data.language;
        if (lang === 'auto') {
            lang = chrome.i18n.getUILanguage().replace('-', '_');
            const supported = ['en', 'de', 'es', 'fr', 'ja', 'pt_BR', 'zh_CN'];
            if (!supported.includes(lang)) {
                lang = lang.split('_')[0];
                if (!supported.includes(lang)) lang = 'en';
            }
        }
        
        fetch(`/_locales/${lang}/messages.json`)
            .then(res => res.ok ? res.json() : fetch(`/_locales/en/messages.json`).then(r => r.json()))
            .then(messages => {
                currentMessages = messages;
                localizeHtmlPage();
                if (callback) callback();
            })
            .catch(err => {
                console.error("Failed to load locales", err);
                if (callback) callback();
            });
    });
}

function localizeHtmlPage() {
    document.getElementById('popupTitle').textContent = getMessage('extName');
    document.getElementById('optionsBtn').title = getMessage('optionsTitle');
    document.getElementById('cleanTabsBtn').title = getMessage('popupCloseStale');
    document.getElementById('sortBtn').title = getMessage('popupSortTitle');
    
    document.getElementById('activeTabBtn').textContent = getMessage('popupTabActive');
    document.getElementById('historyTabBtn').textContent = getMessage('popupTabHistory');
    
    document.getElementById('noInactiveLoc').textContent = getMessage('popupNoInactive');
    document.getElementById('noHistoryLoc').textContent = getMessage('popupNoHistory');
}

function updateSortIcon(order) {
    const ascIcon = document.getElementById('sortIconAsc');
    const descIcon = document.getElementById('sortIconDesc');
    if (order === 'asc') {
        ascIcon.classList.remove('hidden');
        descIcon.classList.add('hidden');
    } else {
        ascIcon.classList.add('hidden');
        descIcon.classList.remove('hidden');
    }
}

function formatAge(ms) {
    const mins = Math.floor(ms / (1000 * 60));
    if (mins < 1) return getMessage('popupAgeJustNow');
    if (mins < 60) return getMessage('popupAgeMinutes').replace('$mins$', mins);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return getMessage('popupAgeHours').replace('$hours$', hours);
    const days = Math.floor(hours / 24);
    return getMessage('popupAgeDays').replace('$days$', days);
}

async function renderTabs() {
    const container = document.getElementById('tabList');
    const noTabsMsg = document.getElementById('noTabsMsg');
    
    const tabs = await chrome.tabs.query({ pinned: false });
    const storageData = await chrome.storage.local.get(null);
    const syncData = await chrome.storage.sync.get({ sortOrderActive: 'asc' });
    
    const sortOrderActive = syncData.sortOrderActive;
    updateSortIcon(sortOrderActive);

    // Filter storage for tab timestamps
    tabTimestamps = {};
    Object.keys(storageData).forEach(key => {
        if (key.startsWith('tab_')) {
            tabTimestamps[key.replace('tab_', '')] = storageData[key];
        }
    });

    if (tabs.length === 0) {
        container.innerHTML = '';
        noTabsMsg.classList.remove('hidden');
        return;
    }
    if (noTabsMsg) noTabsMsg.classList.add('hidden');
    container.innerHTML = '';

    // Sort tabs: oldest (inactive longest) first by default (asc)
    // Among multiple active tabs (different windows), newest timestamp stays at the end
    const now = Date.now();
    tabs.sort((a, b) => {
        const timeA = a.active ? now : (tabTimestamps[a.url] || 0);
        const timeB = b.active ? now : (tabTimestamps[b.url] || 0);
        
        let diff = 0;
        if (timeA !== timeB) {
            diff = timeA - timeB;
        } else {
            // Tie-breaker for untracked tabs: active ones go below inactive ones
            if (a.active && !b.active) diff = 1;
            else if (!a.active && b.active) diff = -1;
        }
        
        return sortOrderActive === 'asc' ? diff : -diff;
    });

    tabs.forEach(tab => {
        if (!tab.url || tab.url.startsWith('chrome://')) return;

        const item = document.createElement('div');
        item.className = 'tab-item';
        
        const favicon = document.createElement('img');
        favicon.className = 'tab-favicon';
        favicon.src = tab.favIconUrl || 'icons/logo16.png';
        favicon.onerror = () => favicon.src = 'icons/logo16.png';
        
        const info = document.createElement('div');
        info.className = 'tab-info';
        
        const title = document.createElement('div');
        title.className = 'tab-title';
        title.textContent = tab.title || tab.url;
        
        const age = document.createElement('div');
        age.className = 'tab-age';
        const timestamp = tabTimestamps[tab.url];
        if (timestamp) {
            age.textContent = tab.active ? getMessage('popupAgeJustNow') : formatAge(now - timestamp);
        } else {
            age.textContent = getMessage('popupAgeJustNow');
        }
        
        info.appendChild(title);
        info.appendChild(age);
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.title = getMessage('popupCloseTab');
        closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            chrome.tabs.remove(tab.id);
            chrome.storage.local.remove(`tab_${tab.url}`);
            item.remove();
        });

        item.appendChild(favicon);
        item.appendChild(info);
        item.appendChild(closeBtn);
        
        // Switch to tab on click
        item.style.cursor = 'pointer';
        item.addEventListener('click', async () => {
            if (tab.url) {
                const timestampKey = `tab_${tab.url}`;
                await chrome.storage.local.set({ [timestampKey]: Date.now() });
            }

            chrome.tabs.update(tab.id, { active: true });
            chrome.windows.update(tab.windowId, { focused: true });
        });
        
        container.appendChild(item);
    });
}

// Global listener for storage changes (to update "Age" live)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        const hasTabChanges = Object.keys(changes).some(k => k.startsWith('tab_'));
        if (hasTabChanges) {
            renderTabs();
        }
        if (changes.closedTabsHistory) {
            const historyView = document.getElementById('historyView');
            if (historyView.classList.contains('active')) {
                renderHistory();
            }
        }
    }
});

function switchView(view, skipAnimation = false) {
    const activeTabBtn = document.getElementById('activeTabBtn');
    const historyTabBtn = document.getElementById('historyTabBtn');
    const activeView = document.getElementById('activeView');
    const historyView = document.getElementById('historyView');
    const navSlider = document.getElementById('navSlider');

    if (skipAnimation) {
        navSlider.style.transition = 'none';
    }

    if (view === 'active') {
        activeTabBtn.classList.add('active');
        historyTabBtn.classList.remove('active');
        activeView.classList.add('active');
        activeView.classList.remove('hidden');
        historyView.classList.remove('active');
        historyView.classList.add('hidden');
        navSlider.style.transform = 'translateX(0)';
        document.getElementById('cleanTabsBtn').title = getMessage('popupCloseStale');
        renderTabs();
    } else {
        activeTabBtn.classList.remove('active');
        historyTabBtn.classList.add('active');
        activeView.classList.remove('active');
        activeView.classList.add('hidden');
        historyView.classList.add('active');
        historyView.classList.remove('hidden');
        navSlider.style.transform = 'translateX(100%)';
        document.getElementById('cleanTabsBtn').title = getMessage('popupClearHistory');
        renderHistory();
    }
    
    if (skipAnimation) {
        // Force reflow
        navSlider.offsetHeight;
        navSlider.style.transition = '';
    }
    
    // Save last view
    chrome.storage.local.set({ lastView: view });
}

async function renderHistory() {
    try {
        const container = document.getElementById('historyList');
        const noHistoryMsg = document.getElementById('noHistoryMsg');
        
        const res = await chrome.storage.local.get(['closedTabsHistory']);
        let history = res.closedTabsHistory || [];
        
        if (!Array.isArray(history)) {
            console.error("[TickTab] history data is invalid, resetting to empty array", history);
            history = [];
        }

        const syncData = await chrome.storage.sync.get({ sortOrderHistory: 'desc' });
        const sortOrderHistory = syncData.sortOrderHistory;
        updateSortIcon(sortOrderHistory);
        
        // Sort history by closedAt
        history.sort((a, b) => {
            if (sortOrderHistory === 'asc') {
                return a.closedAt - b.closedAt; // Oldest closed first
            } else {
                return b.closedAt - a.closedAt; // Newest closed first
            }
        });

        console.log("[TickTab] Rendering history. Found items:", history.length);

        if (history.length === 0) {
            container.innerHTML = '';
            noHistoryMsg.classList.remove('hidden');
            return;
        }

        noHistoryMsg.classList.add('hidden');
        container.innerHTML = '';

        history.forEach((item, index) => {
            if (!item.url && !item.title) return; // Skip invalid entries

            const row = document.createElement('div');
            row.className = 'tab-item';
            
            const favicon = document.createElement('img');
            favicon.className = 'tab-favicon';
            favicon.src = item.favIconUrl || 'icons/logo16.png';
            favicon.onerror = () => favicon.src = 'icons/logo16.png';
            
            const info = document.createElement('div');
            info.className = 'tab-info';
            
            const title = document.createElement('div');
            title.className = 'tab-title';
            title.textContent = item.title || item.url || "Unknown Tab";
            
            const age = document.createElement('div');
            age.className = 'tab-age';
            
            const diff = Date.now() - (item.closedAt || Date.now());
            age.textContent = formatHistoryAge(diff);
            
            info.appendChild(title);
            info.appendChild(age);
            
            const restoreBtn = document.createElement('button');
            restoreBtn.className = 'close-btn restore-btn'; // Use greenish hover
            restoreBtn.title = getMessage('popupRestoreTab');
            restoreBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>';
            
            restoreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                chrome.runtime.sendMessage({ action: 'restoreTab', url: item.url }, () => {
                    renderHistory();
                });
            });

            row.appendChild(favicon);
            row.appendChild(info);
            row.appendChild(restoreBtn);
            
            row.addEventListener('click', () => {
                if (item.url) {
                    chrome.runtime.sendMessage({ action: 'restoreTab', url: item.url });
                }
            });
            
            container.appendChild(row);
        });
    } catch (err) {
        console.error("[TickTab] Fatal error in renderHistory:", err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initLocalization(() => {
        chrome.storage.local.get(['lastView'], (res) => {
            const lastView = res.lastView || 'active';
            switchView(lastView, true); // Skip animation on initial load
        });
    });

    document.getElementById('activeTabBtn').addEventListener('click', () => switchView('active'));
    document.getElementById('historyTabBtn').addEventListener('click', () => switchView('history'));

    document.getElementById('optionsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById('sortBtn').addEventListener('click', async () => {
        const activeView = document.getElementById('activeView');
        const isHistory = !activeView.classList.contains('active');
        const key = isHistory ? 'sortOrderHistory' : 'sortOrderActive';
        const defaultValue = isHistory ? 'desc' : 'asc';

        const res = await chrome.storage.sync.get({ [key]: defaultValue });
        const currentOrder = res[key];
        const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
        
        await chrome.storage.sync.set({ [key]: newOrder });
        
        if (isHistory) {
            renderHistory();
        } else {
            renderTabs();
        }
    });
    
    document.getElementById('cleanTabsBtn').addEventListener('click', async () => {
        const activeView = document.getElementById('activeView');
        const isHistory = !activeView.classList.contains('active');
        
        if (isHistory) {
            chrome.runtime.sendMessage({ action: 'clearHistory' }, () => {
                renderHistory();
            });
        } else {
            chrome.runtime.sendMessage({ action: 'nukeInactive' }, () => {
                renderTabs();
            });
        }
    });
});

function formatHistoryAge(ms) {
    const mins = Math.floor(ms / (1000 * 60));
    if (mins < 1) return getMessage('popupAgeJustNow');
    if (mins < 60) return getMessage('popupHistoryAgeMinutes').replace('$mins$', mins);
    const hours = Math.floor(mins / 60);
    if (hours < 24) return getMessage('popupHistoryAgeHours').replace('$hours$', hours);
    const days = Math.floor(hours / 24);
    return getMessage('popupHistoryAgeDays').replace('$days$', days);
}
