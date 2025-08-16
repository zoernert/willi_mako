# Willi-Mako Chrome Extension

Eine Chrome Extension für die automatische Extraktion von Energiewirtschafts-Codes aus Screenshots.

## Funktionen

- **Screenshot-Aufnahme**: Direktes Erstellen von Screenshots im Browser
- **Zwischenablage-Support**: Einfügen von Bildern aus der Zwischenablage  
- **KI-Analyse**: Automatische Erkennung von MaLo, MeLo, EIC und BDEW Codes
- **BDEW-Integration**: Automatische Verknüpfung mit BDEW-Marktpartner-Datenbank
- **Schnelle Ergebnisse**: Analyseergebnisse in Sekunden
- **Datenschutz**: DSGVO-konforme Verarbeitung

## Installation

### Aus dem Chrome Web Store (Empfohlen)
1. Besuchen Sie die [Extension-Seite](https://stromhaltig.de/chrome-extension)
2. Klicken Sie auf "Zu Chrome hinzufügen"
3. Bestätigen Sie die Installation

### Entwickler-Installation
1. Laden Sie den Quellcode herunter
2. Öffnen Sie Chrome und gehen Sie zu `chrome://extensions/`
3. Aktivieren Sie den "Entwicklermodus"
4. Klicken Sie auf "Entpackte Erweiterung laden"
5. Wählen Sie den `chrome-extension` Ordner aus

## Verwendung

### Grundlegende Nutzung
1. Klicken Sie auf das Willi-Mako Icon in der Browser-Leiste
2. Wählen Sie eine der Optionen:
   - **Neuen Screenshot erstellen**: Erstellt einen Screenshot der aktuellen Seite
   - **Aus Zwischenablage einfügen**: Analysiert ein bereits kopiertes Bild

### Tastenkombinationen
- `Ctrl+Shift+W`: Extension-Popup öffnen
- `Ctrl+V`: Bild aus Zwischenablage einfügen (im Popup)

### Kontextmenü
- Rechtsklick auf beliebige Webseite → "Mit Willi-Mako analysieren"

## Dateien

```
chrome-extension/
├── manifest.json          # Extension-Konfiguration
├── popup.html             # Hauptbenutzeroberfläche
├── popup.css              # Styling für die Benutzeroberfläche
├── popup.js               # Hauptlogik für Screenshot-Analyse
├── background.js          # Service Worker für Extension-Events
├── content.js             # Content-Script für Seiteninteraktion
└── icons/                 # Extension-Icons
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## Technische Details

### Berechtigungen
- `activeTab`: Zugriff auf die aktuelle Seite für Screenshots
- `storage`: Lokale Speicherung von Einstellungen
- `https://stromhaltig.de/*`: API-Zugriff für Analyse

### API-Integration
Die Extension nutzt die gleiche API wie die Web-Anwendung:
- Endpoint: `https://stromhaltig.de/api/analyze-screenshot`
- Methode: POST (multipart/form-data)
- Authentifizierung: Nicht erforderlich

### Unterstützte Dateiformate
- PNG (empfohlen)
- JPEG
- WebP
- Maximum Dateigröße: 10MB

## Entwicklung

### Voraussetzungen
- Chrome Browser (Version 88+)
- Node.js (für Build-Prozess)

### Lokale Entwicklung
1. Extension im Entwicklermodus laden
2. Änderungen an den Dateien vornehmen
3. Extension-Seite aktualisieren oder Extension neu laden

### Debugging
- Popup: Rechtsklick auf Extension-Icon → "Popup untersuchen"
- Background Script: `chrome://extensions/` → Details → "Hintergrundseite"
- Content Script: Browser-DevTools der jeweiligen Seite

## Architektur

### Popup (popup.js)
- Hauptbenutzeroberfläche der Extension
- Screenshot-Aufnahme und Zwischenablage-Verarbeitung
- API-Kommunikation und Ergebnisanzeige

### Background Script (background.js)
- Service Worker für Extension-Events
- Kontextmenü-Verwaltung
- Tastenkombinationen-Handling

### Content Script (content.js)
- Seiteninteraktion und Bildererkennung
- Hervorhebung erkannter Codes
- Kontextanalyse

## Konfiguration

### Einstellungen
Die Extension speichert folgende Einstellungen lokal:
- API-Endpoint URL
- Automatische Analyse-Optionen
- Maximale Dateigröße

### Anpassung
Entwickler können die Extension anpassen:
- `manifest.json`: Berechtigungen und Konfiguration
- `popup.css`: Styling und Branding
- API-URL in `popup.js` ändern

## Sicherheit

### Datenschutz
- Screenshots werden nicht lokal gespeichert
- Übertragung erfolgt verschlüsselt (HTTPS)
- Keine Tracking- oder Analytics-Daten

### Berechtigungen
Die Extension benötigt minimale Berechtigungen:
- Zugriff nur auf aktive Tabs für Screenshots
- Keine dauerhaften Speicher-Zugriffe
- API-Zugriff nur auf Willi-Mako Server

## Fehlerbehebung

### Häufige Probleme

**Extension lädt nicht**
- Überprüfen Sie die Chrome-Version (88+ erforderlich)
- Deaktivieren Sie andere Extensions temporär
- Löschen Sie den Browser-Cache

**Screenshot-Aufnahme funktioniert nicht**
- Überprüfen Sie die Tab-Berechtigungen
- Stellen Sie sicher, dass die Seite vollständig geladen ist
- Prüfen Sie ob JavaScript aktiviert ist

**API-Fehler**
- Überprüfen Sie die Internetverbindung
- Prüfen Sie ob der Willi-Mako Server erreichbar ist
- Kontaktieren Sie den Support bei anhaltenden Problemen

**Zwischenablage funktioniert nicht**
- Erlauben Sie Zwischenablage-Zugriff in den Browser-Einstellungen
- Kopieren Sie ein Bild vor dem Einfügen
- Stellen Sie sicher, dass das Bildformat unterstützt wird

## Support

Bei Problemen oder Fragen:
- E-Mail: support@stromhaltig.de
- Web-Version: https://stromhaltig.de/screenshot-analysis
- GitHub: https://github.com/stromhaltig/willi-mako

## Lizenz

Diese Extension ist Teil der Willi-Mako Plattform und unterliegt den gleichen Lizenzbedingungen.

## Changelog

### Version 1.0.0 (Initial Release)
- Screenshot-Aufnahme und Zwischenablage-Support
- KI-basierte Code-Erkennung (MaLo, MeLo, EIC, BDEW)
- BDEW-Datenbank Integration
- Willi-Mako Branding und Design
- Kontextmenü und Tastenkombinationen
