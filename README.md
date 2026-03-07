# TickTab 🧊

A smart browser extension that automatically closes inactive tabs to save memory and keep your browser clean. 
Unlike many other extensions, TickTab survives browser restarts by carefully tracking URL activity in the local storage.

## Features
- **Auto-Close Inactive Tabs**: Choose an expiration time ranging from 1 minute up to 10 years.
- **Smart Exceptions**:
  - Pinned tabs are ignored.
  - The currently active tab in any window is secure.
  - Tabs playing audio (e.g., Spotify, YouTube, Netflix) are ignored.
- **Restart Resilient**: TickTab uses `chrome.alarms` and persistent storage to reliably track tab inactivity even if you constantly close and reopen your browser.

## Installation
1. Download or clone this repository.
2. Open your browser and go to the extensions page (e.g., `chrome://extensions/` or `edge://extensions/`).
3. Enable **Developer mode** in the top right corner.
4. Click on **Load unpacked**.
5. Select the folder containing this repository.

## Usage & Settings
Once installed, click on the **TickTab** icon in the extensions toolbar to open the settings menu. You can customize the expiration time there.

## Privacy
TickTab operates 100% locally on your machine. It does not send any of your browsing data, URLs, or activity to any external server. 
