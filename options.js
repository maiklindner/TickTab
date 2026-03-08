let currentMessages = {};

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
        document.getElementById('langSelect').value = data.language;
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
    document.getElementById('title').textContent = getMessage("optionsTitle");
    document.getElementById('description').textContent = getMessage("optionsDescription");
    document.getElementById('labelTime').textContent = getMessage("optionsLabelTime");
    document.getElementById('opt1Day').textContent = getMessage("options1Day");
    document.getElementById('opt3Days').textContent = getMessage("options3Days");
    document.getElementById('opt1Week').textContent = getMessage("options1Week");
    document.getElementById('opt2Weeks').textContent = getMessage("options2Weeks");
    document.getElementById('opt1Month').textContent = getMessage("options1Month");
    document.getElementById('optCustom').textContent = getMessage("optionsCustom");
    document.getElementById('labelMinutes').textContent = getMessage("optionsMinutes");
    document.getElementById('saveBtn').textContent = getMessage("optionsSaveBtn");
    document.title = getMessage("extName");
}

document.addEventListener('DOMContentLoaded', () => {
    initLocalization();

    document.getElementById('langSelect').addEventListener('change', (e) => {
        chrome.storage.sync.set({ language: e.target.value }, () => {
            initLocalization();
        });
    });

    const timeSelect = document.getElementById('timeSelect');
    const customInputWrapper = document.getElementById('customInputWrapper');
    const customMinutesInput = document.getElementById('customMinutes');
    const saveBtn = document.getElementById('saveBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Load saved settings
    chrome.storage.local.get(['expirationMinutes'], (result) => {
        const savedMinutes = result.expirationMinutes || 10080; // default 1 week

        // Check if it matches a preset
        const optionExists = Array.from(timeSelect.options).some(opt => opt.value == savedMinutes);

        if (optionExists) {
            timeSelect.value = savedMinutes;
            customInputWrapper.style.display = 'none';
        } else {
            timeSelect.value = 'custom';
            customInputWrapper.style.display = 'flex';
            customMinutesInput.value = savedMinutes;
        }
    });

    // Handle dropdown change
    timeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customInputWrapper.style.display = 'flex';
            if (!customMinutesInput.value) {
                customMinutesInput.value = "10080"; // Default pre-fill
            }
        } else {
            customInputWrapper.style.display = 'none';
        }
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        let minutesToSave;

        if (timeSelect.value === 'custom') {
            const val = parseInt(customMinutesInput.value, 10);
            if (isNaN(val) || val < 1 || val > 5256000) { // Max 10 years in minutes
                statusMessage.textContent = getMessage("optionsErrorRange");
                statusMessage.style.color = "#ef4444"; // Red
                setTimeout(() => statusMessage.textContent = '', 3000);
                return;
            }
            minutesToSave = val;
        } else {
            minutesToSave = parseInt(timeSelect.value, 10);
        }

        chrome.storage.local.set({ expirationMinutes: minutesToSave }, () => {
            statusMessage.textContent = getMessage("optionsSavedSuccess");
            statusMessage.style.color = "#10b981"; // Green
            setTimeout(() => statusMessage.textContent = '', 2000);
        });
    });
});
