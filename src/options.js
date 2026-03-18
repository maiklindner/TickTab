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
    document.getElementById('titleH1').textContent = getMessage('extName');
    document.getElementById('optionsDescription').textContent = getMessage('optionsDescription');
    document.getElementById('labelTime').textContent = getMessage("optionsLabelTime");
    document.getElementById('opt1Day').textContent = getMessage("options1Day");
    document.getElementById('opt3Days').textContent = getMessage("options3Days");
    document.getElementById('opt1Week').textContent = getMessage("options1Week");
    document.getElementById('opt1Month').textContent = getMessage("options1Month");
    document.getElementById('optCustom').textContent = getMessage("optionsCustom");
    document.getElementById('optUnitMinutes').textContent = getMessage("optionsUnitMinutes") || "Minutes";
    document.getElementById('optUnitHours').textContent = getMessage("optionsUnitHours") || "Hours";
    document.getElementById('optUnitDays').textContent = getMessage("optionsUnitDays") || "Days";
    document.getElementById('optUnitWeeks').textContent = getMessage("optionsUnitWeeks") || "Weeks";
    if (document.getElementById('labelMinutes')) {
      document.getElementById('labelMinutes').textContent = getMessage("optionsMinutes");
    }
    document.getElementById('enableTitle').textContent = getMessage("optionsEnableTitle") || "Enable TickTab";
    document.getElementById('enableDesc').textContent = getMessage("optionsEnableDesc") || "Toggle whether inactive tabs should be closed automatically.";
    document.getElementById('customMinutes').placeholder = getMessage("optionsPlaceholderMinutes") || "e.g. 60";
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
    const unitSelect = document.getElementById('unitSelect');
    const masterToggle = document.getElementById('masterToggle');

    // Load saved settings
    chrome.storage.local.get(['expirationMinutes', 'enabled'], (result) => {
        masterToggle.checked = result.enabled !== false; // default true
        const savedMinutes = result.expirationMinutes || 10080; // default 1 week

        // Check if it matches a preset
        const optionExists = Array.from(timeSelect.options).some(opt => opt.value == savedMinutes);

        if (optionExists) {
            timeSelect.value = savedMinutes;
            customInputWrapper.style.display = 'none';
        } else {
            timeSelect.value = 'custom';
            customInputWrapper.style.display = 'flex';
            
            // Reverse engineer the unit
            let val = savedMinutes;
            let unit = '1';
            
            if (val % 10080 === 0) {
                unit = '10080';
                val = val / 10080;
            } else if (val % 1440 === 0) {
                unit = '1440';
                val = val / 1440;
            } else if (val % 60 === 0) {
                unit = '60';
                val = val / 60;
            }
            
            unitSelect.value = unit;
            customMinutesInput.value = val;
        }
    });

    // Handle dropdown change
    timeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customInputWrapper.style.display = 'flex';
            if (!customMinutesInput.value) {
                customMinutesInput.value = "60"; // Default pre-fill to 60 as requested
            }
        } else {
            customInputWrapper.style.display = 'none';
        }
        saveSettings(); // Automatically save as soon as selection changes
    });

    masterToggle.addEventListener('change', () => {
        chrome.storage.local.set({ enabled: masterToggle.checked });
    });

    function saveSettings() {
        let minutesToSave;

        if (timeSelect.value === 'custom') {
            const val = parseInt(customMinutesInput.value, 10);
            const multiplier = parseInt(unitSelect.value, 10);
            if (isNaN(val) || val < 1 || val > 100000) {
                return; // Silently fail on invalid input during auto-save
            }
            minutesToSave = val * multiplier;
        } else {
            minutesToSave = parseInt(timeSelect.value, 10);
        }

        chrome.storage.local.set({ expirationMinutes: minutesToSave });
    }

    // Auto-save on input typing for custom value
    customMinutesInput.addEventListener('input', saveSettings);
    unitSelect.addEventListener('change', saveSettings);
});
