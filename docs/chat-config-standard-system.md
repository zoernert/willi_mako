# Chat-Konfiguration - Standard-System

## Überblick

Das Standard-Konfigurationssystem ermöglicht es Administratoren, eine einzige Chat-Konfiguration als Standard für alle Nutzer zu setzen. Dies ist eine einfache und effektive Lösung für die meisten Anwendungsfälle.

## Funktionsweise

### 🎯 Für Administratoren

#### Chat-Konfiguration als Standard setzen
1. Navigiere zu `/admin` → "Chat-Config"
2. Wähle eine Konfiguration aus der Liste
3. Klicke auf den grünen "Als Standard setzen" Button
4. Die Konfiguration wird als "Standard (Aktiv)" markiert

#### Wichtige Regeln
- **Nur eine Standard-Konfiguration**: Es kann immer nur eine Konfiguration gleichzeitig als Standard aktiv sein
- **Automatische Deaktivierung**: Beim Setzen einer neuen Standard-Konfiguration wird die vorherige automatisch deaktiviert
- **Sofortige Wirkung**: Die Änderung wirkt sich sofort auf alle neuen Chat-Anfragen aus

### 👤 Für normale Nutzer

#### Verwendung der Standard-Konfiguration
- Alle Chat-Anfragen verwenden automatisch die vom Administrator gesetzte Standard-Konfiguration
- Nutzer können die aktuelle Konfiguration über das Dashboard einsehen (falls verfügbar)
- Keine manuelle Auswahl erforderlich - das System funktioniert transparent

## Technische Implementierung

### Backend-Services

#### ChatConfigurationService
```typescript
// Standard-Konfiguration setzen
await chatConfigurationService.setAsDefault(configId);

// Aktuelle Standard-Konfiguration abrufen
const activeConfig = await chatConfigurationService.getActiveConfiguration();

// Aktuelle Standard-Konfigurations-ID abrufen
const activeId = await chatConfigurationService.getActiveConfigurationId();
```

#### Datenbank-Struktur
```sql
-- In der chat_configurations Tabelle
is_active BOOLEAN DEFAULT false  -- Nur eine Konfiguration kann true sein
```

### API-Endpunkte

#### Admin-Endpunkte
```
POST /api/admin/chat-config/:configId/activate
  - Setzt eine Konfiguration als Standard
  - Deaktiviert automatisch alle anderen Konfigurationen

GET /api/admin/chat-config/active
  - Ruft die aktuelle Standard-Konfiguration ab
```

### Frontend-Komponenten

#### AdminChatConfiguration
- Zeigt "Standard (Aktiv)" vs "Inaktiv" Status
- "Als Standard setzen" Button für inaktive Konfigurationen
- Erfolgs-/Fehlermeldungen auf Deutsch

#### ChatConfigurationInfo (optional)
- Informationsseite für normale Nutzer
- Zeigt die aktuell verwendete Konfiguration an
- Erklärung der verschiedenen Einstellungen

## Vorteile des Standard-Systems

### ✅ Einfachheit
- **Keine komplexe Zuordnungslogik**: Ein einfaches Boolean-Feld entscheidet
- **Klare Verantwortlichkeiten**: Nur Administratoren können Standards setzen
- **Sofortige Wirkung**: Änderungen sind sofort aktiv

### ✅ Wartbarkeit
- **Einfache Datenstruktur**: Nur ein `is_active` Feld erforderlich
- **Keine komplexen Beziehungen**: Keine User-Config-Zuordnungen
- **Einfaches Debugging**: Klar nachvollziehbar, welche Konfiguration verwendet wird

### ✅ Performance
- **Caching-freundlich**: Aktive Konfiguration wird gecacht
- **Wenige Datenbankabfragen**: Nur eine Abfrage pro Chat-Anfrage
- **Keine komplexe Logik**: Schnelle Konfigurationsauflösung

## Zukünftige Erweiterungen

Falls später erweiterte Zuordnungen benötigt werden, kann das System schrittweise ausgebaut werden:

### Stufe 2: Nutzer-spezifische Zuordnung
```sql
ALTER TABLE users ADD COLUMN chat_config_id UUID REFERENCES chat_configurations(id);
```

### Stufe 3: Team-basierte Zuordnung
```sql
ALTER TABLE teams ADD COLUMN chat_config_id UUID REFERENCES chat_configurations(id);
```

### Stufe 4: Subscription-Level-basierte Zuordnung
```sql
ALTER TABLE chat_configurations ADD COLUMN required_subscription_level VARCHAR(50);
```

## Best Practices

### 🎯 Für Administratoren
- **Standard immer gesetzt**: Stelle sicher, dass immer eine Konfiguration als Standard aktiv ist
- **Testen vor Aktivierung**: Teste neue Konfigurationen ausführlich bevor du sie als Standard setzt
- **Dokumentation**: Dokumentiere Änderungen an der Standard-Konfiguration
- **Backup**: Behalte vorherige funktionierende Konfigurationen als Backup

### 🔍 Monitoring
- **Performance-Metriken**: Überwache die Performance nach Konfigurationsänderungen
- **Nutzer-Feedback**: Sammle Feedback zu Chat-Qualität nach Änderungen
- **Error-Tracking**: Verfolge Fehlerrate bei neuen Konfigurationen

### 🚨 Troubleshooting
- **Keine Standard-Konfiguration**: System fällt automatisch auf Default-Konfiguration zurück
- **Cache-Probleme**: Cache wird automatisch geleert bei Konfigurationsänderungen
- **API-Fehler**: Detaillierte Fehlermeldungen für besseres Debugging

## Fazit

Das Standard-Konfigurationssystem bietet eine einfache, wartbare und performante Lösung für die Chat-Konfigurationsverwaltung. Es erfüllt die Anforderungen der meisten Anwendungsfälle und kann bei Bedarf schrittweise erweitert werden.

---

**Status**: ✅ Implementiert und einsatzbereit  
**Erstellt**: 27. Januar 2025  
**Version**: 1.0
