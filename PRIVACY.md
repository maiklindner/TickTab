### ## Deutsch

**Datenschutzrichtlinie für die Erweiterung "ColdTab"**

**Letzte Aktualisierung:** 05. März 2026

Diese Datenschutzrichtlinie beschreibt, wie die Browser-Erweiterung "ColdTab" (im Folgenden "die Erweiterung" genannt), entwickelt von Maik Lindner, mit Daten umgeht.

Der Schutz Ihrer Privatsphäre ist uns sehr wichtig. Die Erweiterung wurde nach dem Prinzip der Datensparsamkeit entwickelt. Es werden nur die Daten verarbeitet, die für die Kernfunktionalität der Erweiterung absolut notwendig sind.

**1. Welche Daten werden erfasst?**

Die Erweiterung erfasst und speichert **lokal auf Ihrem Gerät** die folgenden Informationen:

*   **Zeitstempel der Tab-Aktivität:** Um zu berechnen, wann ein Tab geschlossen werden sollte, speichert die Erweiterung den Zeitpunkt, wann Sie einen Web-Tab das letzte Mal aufgerufen haben. Diese Zeitpunkte werden mit der URL des jeweiligen Tabs verknüpft (z.B. `tab_https://example.com/ = 1712435...`).
*   **Ihre Einstellungen:** Die konfigurierte Schließungszeit (z.B. "1 Woche" oder "120 Minuten").

Die Erweiterung erfasst, sammelt oder verarbeitet **keine** persönlichen Daten, E-Mail-Adressen oder Identifikatoren. **Es werden niemals Browser-Verläufe, besuchte Webseiten oder Zeitstempel an externe Server gesendet.**

**2. Wie und wo werden die Daten gespeichert?**

Alle oben genannten Daten werden ausschließlich auf Ihrem eigenen Computer und in Ihrem Browser gespeichert.

*   Die **Zeitstempel (letzter Besuch eines Tabs)** und Ihre **Einstellungen** werden mit der `chrome.storage.local` API gespeichert.
*   Diese Daten verbleiben ausschließlich lokal auf Ihrem Gerät und werden **nicht** in die Cloud synchronisiert. **Der Entwickler hat keinen Zugriff auf diese Daten.**

**3. Datenübertragung**

Es findet **keine Datenübertragung** statt. Die Erweiterung arbeitet zu 100 % offline. Es gibt keine Analyse-Tools, Third-Party-Tracker, oder Telemetrie.

**4. Notwendige Berechtigungen und deren Zweck**

Bei der Installation bittet die Erweiterung um folgende Berechtigungen:

*   **`tabs`**: Wird benötigt, um die Dauer der Inaktivität zu überprüfen, festzustellen ob im Tab Ton abgespielt wird, und um veraltete Tabs schließlich schließen zu können.
*   **`storage`**: Wird benötigt, um Ihre Einstellungen und die nötigen Zeitstempel (Wann wurde der Tab zuletzt angesehen?) lokal zu speichern.
*   **`alarms`**: Wird benötigt, um die regelmäßige Überprüfung (im Intervall von ca. 15 Minuten) ressourcenschonend im Hintergrund des Browsers auszuführen.

**5. Änderungen an dieser Richtlinie**

Diese Datenschutzrichtlinie kann zukünftig aktualisiert werden, um Änderungen in der Funktionalität der Erweiterung widerzuspiegeln. Wesentliche Änderungen werden im Beschreibungstext des Add-on Stores kommuniziert.

**6. Kontakt**

Wenn Sie Fragen zu dieser Datenschutzrichtlinie haben, kontaktieren Sie bitte den Entwickler unter der im Store hinterlegten Mailadresse.

***

### ## English

**Privacy Policy for the "ColdTab" Extension**

**Last Updated:** March 05, 2026

This Privacy Policy describes how the "ColdTab" browser extension (hereafter "the extension"), developed by Maik Lindner, handles data.

Protecting your privacy is very important to us. The extension was developed following the principle of data minimization. Only the data absolutely necessary for the core functionality of the extension is processed.

**1. What Data Is Collected?**

The extension collects and stores **locally on your device** the following information:

*   **Tab Activity Timestamps:** In order to calculate when a tab should be closed, the extension saves the exact time when you last focused on a web tab. These timestamps are linked to the URL of the respective tab (e.g. `tab_https://example.com/ = 1712435...`).
*   **Your Settings:** The configured closure timeout (e.g. "1 week" or "120 minutes").

The extension does **not** collect, gather, or process any personal data, email addresses, or identifiers. **Browsing history, visited websites, or timestamps are never sent to external servers.**

**2. How and Where Is Data Stored?**

All the data mentioned above is stored exclusively on your own computer and within your browser.

*   The **timestamps (last visit of a tab)** and your **settings** are stored using the `chrome.storage.local` API.
*   This data remains exclusively on your local device and is **not** synchronized to the cloud. **The developer has no access to this data.**

**3. Data Transmission**

There is **no data transmission** of any kind. The extension works 100% offline. There are no analytics tools, third-party trackers, or telemetry built in.

**4. Required Permissions and Their Purpose**

During installation, the extension requests the following permissions:

*   **`tabs`**: Required to check the duration of inactivity, determine if sound is currently playing, and ultimately to close outdated tabs securely.
*   **`storage`**: Required to save your settings and necessary timestamps (When was the tab last viewed?) locally.
*   **`alarms`**: Required to reliably run the periodic check (at an interval of ~15 minutes) in a resource-friendly way in the browser's background.

**5. Changes to This Policy**

This Privacy Policy may be updated in the future to reflect changes in the extension's functionality. Significant changes will be communicated in the add-on store's description text.

**6. Contact**

If you have any questions about this Privacy Policy, please contact the developer at the email address provided in the Web Store.
