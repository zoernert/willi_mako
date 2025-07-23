# Change Request: APA Browser Extension Agent

- **CR-ID:** CR-APA-002
- **Datum:** 2025-07-23
- **Autor:** Gemini AI Assistant
- **Status:** Vorgeschlagen

## 1. Zusammenfassung

Dieses Dokument beschreibt die Konzeption und den Implementierungsplan für eine neue Browser-Erweiterung, die als "Agent" für das **Assisted Process Automation (APA) System** dient. Die Erweiterung wird als separates Projekt entwickelt und agiert als Brücke zwischen dem Mako Willi Backend und den webbasierten Zielsystemen des Benutzers (z.B. SAP, Schleupen).

## 2. Hintergrund

Die direkte Interaktion mit dem DOM von Drittanbieter-Webseiten ist aus einer zentralen Webanwendung heraus aus Sicherheitsgründen nicht möglich. Eine Browser-Erweiterung ist die Standardlösung, um diese Lücke zu schließen. Sie kann sicher im Browser des Benutzers ausgeführt werden, auf den Inhalt von Webseiten zugreifen und als "Hände und Augen" für den Automatisierungs-Orchestrator im Mako Willi Backend fungieren.

## 3. Vorgeschlagene Architektur

Die Erweiterung wird als eigenständiges Projekt mit TypeScript, HTML und CSS entwickelt, gebündelt mit einem Tool wie Webpack.

### 3.1. Projektstruktur

```
/mako-willi-extension
├── /src
│   ├── background.ts     # Service Worker, Kommunikationszentrale
│   ├── content.ts        # DOM-Interaktion, wird in die Zielseite injiziert
│   ├── /popup            # UI für das Extension-Popup
│   │   ├── popup.html
│   │   └── popup.ts
│   └── /common           # Geteilte Typen und Funktionen
│       └── types.ts
├── /dist                 # Gebündelte, produktive Dateien
├── manifest.json         # Konfigurationsdatei der Erweiterung
└── package.json
```

### 3.2. Komponenten

- **`manifest.json`**: Definiert die grundlegenden Eigenschaften und Berechtigungen.
  - `name`: "Mako Willi APA Agent"
  - `version`: "1.0.0"
  - `manifest_version`: 3
  - `permissions`: `storage` (für Einstellungen), `activeTab`, `scripting`
  - `host_permissions`: Muss konfigurierbar sein, um auf die Zielsysteme des Kunden zugreifen zu können (z.B. `https://*.sap.example.com/*`).
  - `background`: Verweist auf `background.js`.
  - `content_scripts`: Konfiguriert die Injektion von `content.js` auf den Zielseiten.
  - `action`: Definiert das `popup.html` für das Klick-Menü.

- **`background.ts` (Service Worker)**: Die Kommunikationszentrale.
  - **Aufgaben:**
    - Hält eine persistente Verbindung (WebSocket oder Long-Polling) zum Mako Willi Backend aufrecht, um Anweisungen zu empfangen.
    - Empfängt Nachrichten vom `content.ts` (z.B. "Benutzer hat auf X geklickt").
    - Leitet Anweisungen vom Backend an das `content.ts` im aktiven Tab weiter.
    - Verwaltet den globalen Zustand der Erweiterung (z.B. `isRecording`, `currentRunId`).

- **`content.ts` (Injected Script)**: Die "Hände und Augen" auf der Seite.
  - **Aufgaben:**
    - **Execution Mode:**
      - Rendert das UI-Overlay zur Anleitung des Benutzers (z.B. "Klicken Sie hier").
      - Hebt UI-Elemente basierend auf Anweisungen vom Backend hervor.
      - Führt Aktionen aus (z.B. `element.click()`, `element.value = '...'`).
    - **Teaching Mode:**
      - Fügt Event-Listener hinzu, um Benutzerinteraktionen (Klicks, Eingaben) zu erfassen.
      - Öffnet einen Dialog, um den Benutzer nach einer semantischen Beschreibung für ein angeklicktes Element zu fragen.
      - Sammelt Metadaten über das Element und sendet sie zur Speicherung an das Backend.
    - **Trigger-Scanner:**
      - Scannt das DOM im Hintergrund auf Trigger-Bedingungen (z.B. das Vorhandensein von "Fehler Z20") und benachrichtigt das Backend.

- **`popup.html` / `popup.ts`**: Die Benutzeroberfläche.
  - **Funktionen:**
    - Anzeige des aktuellen Status ("Inaktiv", "Aufzeichnung läuft", "Automatisierung aktiv").
    - Button zum Starten/Stoppen des "Teaching Mode".
    - Link zum Automatisierungs-Dashboard im Mako Willi Frontend.
    - Anzeige von Fehlermeldungen oder Benachrichtigungen.

### 3.3. Detaillierte Kommunikationsspezifikation

Die Kommunikation zwischen der Erweiterung und dem Backend ist entscheidend. Sie erfolgt über die API-Endpunkte, die im Backend-CR (CR-APA-001) definiert sind.

#### **Nachrichten von der Extension an das Backend**

1.  **`POST /api/v2/automations/create-from-log`**
    - **Zweck:** Sendet eine neue, vom Benutzer aufgezeichnete Klickanleitung.
    - **Payload:**
      ```json
      {
        "name": "Bearbeitung APERAK Z20",
        "rawActions": [
          { "type": "navigate", "url": "https://schleupen.example.com/processes" },
          { "type": "input", "value": "APERAK-12345", "element": { "tagName": "INPUT", "id": "search-field" } },
          { "type": "click", "element": { "tagName": "BUTTON", "text": "Suchen" } }
        ]
      }
      ```

2.  **`POST /api/v2/automations/runs/:runId/update`**
    - **Zweck:** Sendet Status-Updates während eines Automatisierungslaufs.
    - **Payload-Varianten:**
      - `eventType: "STEP_COMPLETED"`: Wenn der Benutzer dem Guide gefolgt ist oder ein Auto-Schritt erfolgreich war.
      - `eventType: "DEVIATION_DETECTED"`: Wenn der Benutzer im Trainingsmodus eine andere Aktion ausgeführt hat.
      - `eventType: "DEVIATION_CONFIRMED"`: Wenn der Benutzer die Abweichung als gültige Alternative bestätigt hat.
      - `eventType: "USER_TOOK_CONTROL"`: Wenn der Benutzer die Automatik unterbricht.

3.  **`POST /api/v2/automations/find-by-trigger`**
    - **Zweck:** Informiert das Backend, dass ein definierter Trigger auf der aktuellen Seite gefunden wurde.
    - **Payload:**
      ```json
      {
        "triggerType": "ON_TEXT_FOUND",
        "details": {
          "url": "https://schleupen.example.com/processes/APERAK-12345",
          "text": "Fehler Z20"
        }
      }
      ```

#### **Nachrichten vom Backend an die Extension (Antwort auf `GET /next-step`)**

1.  **Anweisung im Trainingsmodus (`mode: "GUIDANCE"`)**
    - **Zweck:** Leitet den Benutzer an, den nächsten Schritt auszuführen.
    - **Payload:**
      ```json
      {
        "runId": "run-abc",
        "stepId": "node-2",
        "mode": "GUIDANCE",
        "action": "CLICK",
        "element": { "name": "Suchen Button", "attributes": { "tagName": "BUTTON", "text": "Suchen" } },
        "guidanceText": "Bitte klicken Sie auf den 'Suchen'-Button, um fortzufahren."
      }
      ```
    - **Aktion der Erweiterung:** Hebt das Zielelement hervor und zeigt den `guidanceText` an. Beobachtet die nächste Benutzeraktion.

2.  **Anweisung im Automatikmodus (`mode: "EXECUTION"`)**
    - **Zweck:** Führt einen Schritt autonom aus.
    - **Payload:**
      ```json
      {
        "runId": "run-xyz",
        "stepId": "node-5",
        "mode": "EXECUTION",
        "action": "FILL_INPUT",
        "element": { "name": "Referenzfeld", "attributes": { "tagName": "INPUT", "id": "ref-123" } },
        "value": "Korrektur-Ref-456"
      }
      ```
    - **Aktion der Erweiterung:** Findet das Element basierend auf den Attributen und führt die Aktion aus. Zeigt danach die "Weiter..."-Bestätigung an.

3.  **Abschlussmeldung (`mode: "COMPLETED"`)**
    - **Zweck:** Informiert den Benutzer über das Ende des Prozesses.
    - **Payload:**
      ```json
      {
        "runId": "run-abc",
        "mode": "COMPLETED",
        "message": "Prozess erfolgreich abgeschlossen!"
      }
      ```
    - **Aktion der Erweiterung:** Zeigt die Abschlussmeldung an und beendet den Lauf.


## 4. Sicherheit

- Die gesamte Kommunikation zwischen Erweiterung und Backend muss über HTTPS/WSS erfolgen.
- Die Erweiterung wird nur die minimal notwendigen Berechtigungen anfordern.
- Die `host_permissions` werden so spezifisch wie möglich gehalten, um den Zugriff auf nicht relevante Seiten zu verhindern.
- Sensible Daten (wie extrahierte Werte) werden nur für die Dauer der Ausführung im Speicher gehalten und nicht in der Erweiterung persistent gespeichert.

## 5. Rollback-Plan

- Da die Erweiterung ein separates Projekt ist, kann sie unabhängig von der Hauptanwendung versioniert und bereitgestellt werden.
- Ein Rollback erfolgt durch die Deaktivierung oder Deinstallation der Erweiterung im Browser des Benutzers oder durch die Bereitstellung einer älteren Version über den jeweiligen Browser-Store.
