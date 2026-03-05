document.addEventListener('DOMContentLoaded', () => {
    // Load localizations
    document.getElementById('title').textContent = chrome.i18n.getMessage("optionsTitle");
    document.getElementById('description').textContent = chrome.i18n.getMessage("optionsDescription");
    document.getElementById('labelTime').textContent = chrome.i18n.getMessage("optionsLabelTime");
    document.getElementById('opt1Day').textContent = chrome.i18n.getMessage("options1Day");
    document.getElementById('opt3Days').textContent = chrome.i18n.getMessage("options3Days");
    document.getElementById('opt1Week').textContent = chrome.i18n.getMessage("options1Week");
    document.getElementById('opt2Weeks').textContent = chrome.i18n.getMessage("options2Weeks");
    document.getElementById('opt1Month').textContent = chrome.i18n.getMessage("options1Month");
    document.getElementById('optCustom').textContent = chrome.i18n.getMessage("optionsCustom");
    document.getElementById('labelMinutes').textContent = chrome.i18n.getMessage("optionsMinutes");
    document.getElementById('saveBtn').textContent = chrome.i18n.getMessage("optionsSaveBtn");
    document.title = chrome.i18n.getMessage("extName");

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
                statusMessage.textContent = chrome.i18n.getMessage("optionsErrorRange");
                statusMessage.style.color = "#ef4444"; // Red
                setTimeout(() => statusMessage.textContent = '', 3000);
                return;
            }
            minutesToSave = val;
        } else {
            minutesToSave = parseInt(timeSelect.value, 10);
        }

        chrome.storage.local.set({ expirationMinutes: minutesToSave }, () => {
            statusMessage.textContent = chrome.i18n.getMessage("optionsSavedSuccess");
            statusMessage.style.color = "#10b981"; // Green
            setTimeout(() => statusMessage.textContent = '', 2000);
        });
    });
});
