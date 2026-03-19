let currentMessages = {};
let tabTimestamps = {};
let sortOrder = 'asc';

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
    document.getElementById('noInactiveLoc').textContent = getMessage('popupNoInactive');
}

function updateSortIcon() {
    const ascIcon = document.getElementById('sortIconAsc');
    const descIcon = document.getElementById('sortIconDesc');
    if (sortOrder === 'asc') {
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
    const syncData = await chrome.storage.sync.get({ sortOrder: 'asc' });
    
    sortOrder = syncData.sortOrder;
    updateSortIcon();

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
        
        return sortOrder === 'asc' ? diff : -diff;
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
            window.close();
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
    }
});

document.addEventListener('DOMContentLoaded', () => {
    initLocalization(() => {
        renderTabs();
    });

    document.getElementById('optionsBtn').addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    document.getElementById('sortBtn').addEventListener('click', () => {
        sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
        chrome.storage.sync.set({ sortOrder }, () => {
            renderTabs();
        });
    });

    document.getElementById('cleanTabsBtn').addEventListener('click', async () => {
        chrome.runtime.sendMessage({ action: 'nukeInactive' }, () => {
            setTimeout(renderTabs, 500);
        });
    });
});
