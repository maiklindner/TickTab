# ColdTab 🧊

A smart Google Chrome extension that automatically closes inactive tabs to save memory and keep your browser clean. 
Unlike many other extensions, ColdTab survives browser restarts by carefully tracking URL activity in the local storage.

## Features
- **Auto-Close Inactive Tabs**: Choose an expiration time ranging from 1 minute up to 10 years.
- **Smart Exceptions**:
  - Pinned tabs are ignored.
  - The currently active tab in any window is secure.
  - Tabs playing audio (e.g., Spotify, YouTube, Netflix) are ignored.
- **Restart Resilient**: ColdTab uses `chrome.alarms` and persistent storage to reliably track tab inactivity even if you constantly close and reopen your browser.

## Installation
1. Download or clone this repository.
2. Open Google Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click on **Load unpacked**.
5. Select the folder containing this repository.

## Usage & Settings
Once installed, click on the **ColdTab** icon in the extensions toolbar to open the settings menu. You can customize the expiration time there.

## Privacy
ColdTab operates 100% locally on your machine. It does not send any of your browsing data, URLs, or activity to any external server. 
