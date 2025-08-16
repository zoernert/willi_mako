# Datenschutz - Berechtigungen der Willi-Mako Chrome Extension

## Warum benötigt die Extension diese Berechtigungen?

### 1. **"activeTab" Berechtigung**
**Zweck:** Screenshot-Aufnahme der aktuellen Browser-Seite  
**Verwendung:** Ermöglicht der Extension, Screenshots des aktiven Browser-Tabs zu erstellen, wenn der Benutzer die Screenshot-Funktion verwendet.  
**Datenschutz:** 
- Zugriff erfolgt nur bei expliziter Benutzeraktion (Klick auf Extension-Icon)
- Keine automatische oder Hintergrund-Aktivierung
- Screenshot wird nicht gespeichert, nur temporär zur Analyse verwendet
- Kein Zugriff auf Seiteninhalte oder persönliche Daten

### 2. **"storage" Berechtigung**
**Zweck:** Speicherung von Extension-Einstellungen  
**Verwendung:** Lokale Speicherung von Benutzereinstellungen wie API-Endpoint-Konfiguration und Funktionspräferenzen.  
**Datenschutz:**
- Nur technische Konfigurationsdaten werden gespeichert
- Keine Screenshots, Analyseergebnisse oder persönliche Daten
- Daten bleiben lokal im Browser, keine Cloud-Synchronisation
- Benutzer kann Daten jederzeit über Browser-Einstellungen löschen

### 3. **"contextMenus" Berechtigung**
**Zweck:** Integration ins Browser-Kontextmenü  
**Verwendung:** Fügt einen "Mit Willi-Mako analysieren" Eintrag ins Rechtsklick-Menü hinzu für schnellen Zugriff.  
**Datenschutz:**
- Keine Datensammlung oder -übertragung
- Nur Interface-Erweiterung für bessere Benutzerfreundlichkeit
- Funktioniert nur bei expliziter Benutzeraktion

### 4. **"notifications" Berechtigung**
**Zweck:** Benutzerbenachrichtigungen bei Fehlern oder Erfolg  
**Verwendung:** Zeigt dem Benutzer Statusmeldungen an (z.B. "Analyse abgeschlossen" oder Fehlermeldungen).  
**Datenschutz:**
- Nur technische Statusmeldungen, keine sensiblen Daten
- Keine Übertragung von Benachrichtigungsinhalten an externe Server
- Benutzer kann Benachrichtigungen in Browser-Einstellungen deaktivieren

### 5. **Host-Berechtigung "https://stromhaltig.de/*"**
**Zweck:** API-Zugriff für Screenshot-Analyse  
**Verwendung:** Ermöglicht der Extension, Screenshots zur Analyse an die Willi-Mako API zu senden.  
**Datenschutz:**
- Ausschließlich Kommunikation mit offizieller Willi-Mako API
- Verschlüsselte HTTPS-Übertragung
- Screenshots werden nach Analyse sofort gelöscht, nicht dauerhaft gespeichert
- Keine Übertragung von Browser-Verlauf oder anderen Seiteninhalten
- API-Zugriff erfolgt nur bei expliziter Benutzeraktion (Screenshot-Analyse)

## Zusammenfassung der Datenschutz-Prinzipien:

✅ **Minimale Datensammlung:** Nur technisch notwendige Daten  
✅ **Explizite Zustimmung:** Alle Funktionen erfordern Benutzeraktion  
✅ **Keine Hintergrund-Aktivität:** Extension ist nur aktiv, wenn vom Benutzer verwendet  
✅ **Lokale Verarbeitung:** Einstellungen bleiben im Browser  
✅ **Sichere Übertragung:** Verschlüsselte HTTPS-Kommunikation  
✅ **Temporäre Verarbeitung:** Screenshots werden nicht dauerhaft gespeichert  
✅ **DSGVO-konform:** Vollständige Einhaltung europäischer Datenschutzstandards  

## Für Datenschutzerklärung (kurz):

*"Die Extension benötigt minimale Berechtigungen ausschließlich für ihre Kernfunktion: Screenshot-Aufnahme (activeTab), lokale Einstellungsspeicherung (storage), Benutzerinterface-Integration (contextMenus, notifications) und sichere API-Kommunikation mit stromhaltig.de für die Code-Analyse. Keine persönlichen Daten werden gesammelt oder dauerhaft gespeichert."*
