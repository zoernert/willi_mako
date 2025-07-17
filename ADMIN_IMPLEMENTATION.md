# Admin Panel Implementation

Die folgenden Funktionen wurden in der Admin-Seite implementiert:

## 1. Admin Dashboard
- **Übersicht**: Zeigt wichtige Systemstatistiken in Karten-Format
- **Metriken**: Gesamtanzahl Benutzer, Dokumente, Chats, Nachrichten
- **Trend-Daten**: Neue Benutzer und Chats der letzten 30 Tage
- **Aktivitäten**: Letzte Systemaktivitäten (Registrierungen, Chats, Uploads)

## 2. Benutzerverwaltung
- **Benutzer-Tabelle**: Übersicht aller registrierten Benutzer
- **Informationen**: Name, E-Mail, Rolle, Firma, Registrierungsdatum
- **Funktionen**:
  - Benutzer-Rolle ändern (User ↔ Admin)
  - Benutzer löschen (mit Bestätigung)
  - Benutzer-Details anzeigen

## 3. Dokumentenverwaltung
- **Dokument-Upload**: PDF-Dateien hochladen mit Titel und Beschreibung
- **Dokument-Tabelle**: Übersicht aller hochgeladenen Dokumente
- **Funktionen**:
  - Dokument-Details bearbeiten
  - Dokumente aktivieren/deaktivieren
  - Dokumente löschen (inkl. Dateisystem und Vektordatenbank)
  - Dateigröße anzeigen

## 4. FAQ-Verwaltung (bereits vorhanden)
- **Chat-zu-FAQ**: Chats auswählen und zu FAQs konvertieren
- **FAQ-Editor**: FAQs bearbeiten und verwalten
- **KI-Unterstützung**: Automatische FAQ-Generierung und Kontexterweiterung

## 5. Statistiken
- **Übersicht**: Detaillierte Systemstatistiken
- **Benutzer-Statistiken**: Aufschlüsselung nach Rollen
- **Content-Statistiken**: Dokumente und FAQs
- **Aktivitäts-Statistiken**: Chats und Nachrichten
- **Beliebte FAQs**: Meistaufgerufene FAQ-Einträge

## 6. Einstellungen
- **Allgemeine Einstellungen**: 
  - Systemname und -beschreibung
  - Maximale Dateigröße
  - Registrierung aktivieren/deaktivieren
  - Gastzugang aktivieren/deaktivieren
- **API-Konfiguration**:
  - Gemini API-Schlüssel
  - Qdrant URL und API-Schlüssel
  - Verbindungstest für Qdrant
- **E-Mail-Einstellungen**:
  - SMTP-Konfiguration
  - E-Mail-Benachrichtigungen
  - SMTP-Verbindungstest
- **Sicherheit**: Placeholder für zukünftige Funktionen

## Backend-Endpunkte (neu hinzugefügt)

### Benutzer-Management
- `GET /admin/users` - Alle Benutzer auflisten
- `GET /admin/users/:id` - Benutzer-Details
- `PUT /admin/users/:id/role` - Benutzer-Rolle ändern
- `DELETE /admin/users/:id` - Benutzer löschen

### Dokumenten-Management
- `GET /admin/documents` - Alle Dokumente auflisten
- `POST /admin/documents` - Dokument hochladen
- `PUT /admin/documents/:id` - Dokument bearbeiten
- `DELETE /admin/documents/:id` - Dokument löschen

### Statistiken
- `GET /admin/stats` - Basis-Statistiken
- `GET /admin/stats/detailed` - Detaillierte Statistiken
- `GET /admin/activity` - Letzte Aktivitäten

### Einstellungen
- `GET /admin/settings` - Aktuelle Einstellungen
- `PUT /admin/settings` - Einstellungen aktualisieren
- `POST /admin/settings/test-qdrant` - Qdrant-Verbindung testen
- `POST /admin/settings/test-smtp` - SMTP-Verbindung testen

## Datenbank-Änderungen

### Erweiterte Tabellen
- **users**: Spalten `full_name`, `company` hinzugefügt
- **documents**: Spalten `title`, `description`, `is_active`, `uploaded_by`, `updated_at` hinzugefügt

### Neue Indizes
- Indizes für bessere Performance bei Abfragen
- Volltext-Suche für Dokumente und FAQs

## Sicherheit
- Alle Admin-Routen sind mit `requireAdmin` Middleware geschützt
- Benutzer können sich nicht selbst löschen
- Datei-Upload ist auf PDF beschränkt (50MB Limit)
- Passwörter und API-Schlüssel werden in Einstellungen maskiert

## Nächste Schritte
1. Datenbank-Migration ausführen: `psql -f migration.sql`
2. Umgebungsvariablen für Einstellungen konfigurieren
3. SMTP-Verbindungstest implementieren
4. Sicherheitseinstellungen erweitern
5. Erweiterte Statistiken mit Diagrammen hinzufügen
