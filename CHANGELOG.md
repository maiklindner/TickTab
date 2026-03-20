# Changelog - TickTab

All notable changes to this project will be documented in this file.

## [1.5.2] - 2026-03-20

### Changed
- **Popup Persistence**: Removed explicit `window.close()` commands when switching tabs or restoring history, allowing for sequential management.
- **Improved Hit Areas**: Increased the interactive area for the "Close Tab" button and disabled pointer events on icons to ensure better click reliability.

## [1.5.1] - 2026-03-20

### Added
- **Clear History**: The trash can icon now clears the history when the History tab is active.
- **Dynamic Tooltips**: Tooltips for action buttons now update based on the current view for better clarity.

## [1.5.0] - 2026-03-20

### Added
- **Recently Closed History**: New history view for restoring tabs closed by TickTab.
- **View Persistence**: The popup now remembers your last active view (Active or History).
- **Independent Sorting**: Separate sorting preferences for active tabs and closed history.
- **UI Modernization**: Complete redesign with a sleek segmented control and a cleaner, "airy" layout.
- **Action Color Coding**: Green hover effects for restore actions vs red for closing actions.

### Changed
- **Focus Preservation**: Switched to atomic batch removal of tabs to prevent focus-stealing on macOS.
- **Refined Transitions**: Suppressed sliding animations on startup for a snappier feel.

### Fixed
- **History Reliability**: Resolved race conditions and data structure issues in tab history tracking.

## [1.4.0] - 2026-03-19

### Added
- **Sort Options**: Toggle between ascending (oldest first) and descending (newest first) tab sorting in the popup.
- **Persistent Settings**: Your preferred sort order is now saved across sessions.

### Changed
- **Smart Nuke**: The "Trash Can" button now closes all inactive tabs instantly while preserving pinned and media-playing tabs.
- **Faster Cleanup**: Increased the background check frequency to 1 minute for better responsiveness with short timers.
- **Instant Feedback**: Changing auto-close settings now triggers an immediate cleanup check.

### Fixed
- **Sorting Logic**: Active tabs are now consistently handled as "Just now" in the list.
- **Popup Stability**: Resolved an intermittent `TypeError` when re-rendering the tab list.

## [1.3.0] - 2026-03-19

### Added
- **Management Popup**: A new interactive popup to visualize and manage tab expiration.
- **Tab Life-Tracker**: Real-time display of how long each open tab has been inactive.
- **Manual Cleanup**: Options to close individual tabs or all stale tabs directly from the popup.
- **Improved UX**: Redesigned the extension icon action to provide more transparency and control.

## [1.2.2] - 2026-03-18

### Added
- **Screenshot Support**: Added full support for localized screenshot generation.

## [1.2.1] - 2026-03-18

### Changed
- **UI Standardization**: Modernized options page UI with refined toggle switches to match the extension suite style.

## [1.2] - 2026-03-09

### Changed
- **Project Structure**: Optimized project organization using the new `src/` directory layout.
- **UI Refinement**: Minor visual adjustments for a more polished experience.

---

## [1.1] - 2026-03-07

### Changed
- **Brand Refresh**: Formally renamed the extension from "ColdTab" to "TickTab".
- **Visual Updates**: New application icons and UI color refinements.
- **UI Logic**: Switched the badge to show '0' instead of '✓' for zero inactive tabs for better clarity.

---

## [1.0] - 2026-03-07

### Added
- **Initial Release**: Launch as "ColdTab" for Chrome and Edge.
- **Inactive Tab Closer**: Automatically close tabs that have been idle for too long to save memory and CPU.
- **Customizable Idle Time**: Set your own threshold for when a tab should be considered "inactive".
- **Refined UI**: A clean, modern options page with full Dark Mode support.
- **One-Click Close**: Manually close all inactive tabs instantly via the extension icon.
- **Internationalization**: Native support for English, German, French, and more.
- **Privacy First**: No tracking, no data collection, 100% local processing.
