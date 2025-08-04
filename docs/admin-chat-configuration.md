# Admin Chat-Konfiguration System

## Überblick

Das Admin Chat-Konfiguration System ermöglicht es Administratoren, den gesamten Chat-Antwort-Generierungsprozess zu optimieren und zu testen. Es bietet eine benutzerfreundliche Oberfläche zur Konfiguration verschiedener Verarbeitungsschritte und deren Parameter.

## Features

### 🔧 Konfigurierbare Verarbeitungsschritte

Das System unterteilt die Chat-Antwort-Generierung in mehrere konfigurierbare Schritte:

1. **Anfrage-Verständnis** (`query_understanding`)
   - Analysiert die Benutzeranfrage und extrahiert die Kernfrage
   - Generiert alternative Suchanfragen bei aktivierter Query-Expansion

2. **Kontext-Suche** (`context_search`)
   - Durchsucht den Qdrant Vector Store mit den generierten Suchanfragen
   - Konfigurierbare Parameter: Anzahl Suchanfragen, Ergebnis-Limit, Score-Schwellenwert

3. **Kontext-Optimierung** (`context_optimization`)
   - Optimiert und synthetisiert den gefundenen Kontext
   - Entfernt Duplikate und priorisiert relevante Informationen

4. **Antwort-Generierung** (`response_generation`)
   - Erstellt die finale Antwort basierend auf dem optimierten Kontext
   - Verwendet konfigurierbaren System-Prompt

5. **Antwort-Validierung** (`response_validation`)
   - Validiert die Antwort auf Qualität und Korrektheit
   - Prüft Mindestlänge und potenzielle Halluzinationen

### ⚙️ Konfigurierbare Parameter

#### Allgemeine Einstellungen
- **Max. Iterationen**: Maximale Anzahl von Verarbeitungszyklen
- **System-Prompt**: Grundlegender Prompt für die AI-Antwort-Generierung

#### Vector Search Konfiguration
- **Search Type**: Art der Suche (Semantic, Hybrid, Keyword, Fuzzy)
- **Max. Suchanfragen**: Anzahl der generierten Suchanfragen (1-10)
- **Ergebnis-Limit**: Maximale Anzahl Suchergebnisse pro Anfrage (1-50)
- **Score-Schwellenwert**: Mindest-Ähnlichkeitsscore (0-1)
- **Query-Expansion**: Automatische Generierung alternativer Suchanfragen
- **Hybrid Alpha**: Gewichtung zwischen Semantic (0.0) und Keyword (1.0) bei Hybrid Search
- **Diversity Threshold**: Vermeidung zu ähnlicher Ergebnisse

#### Kontext-Synthese
- **Aktivierung**: Ein/Aus-Schalter für intelligente Kontext-Synthese
- **Max. Länge**: Maximale Länge des synthetisierten Kontexts

#### Qualitätsprüfungen
- **Aktivierung**: Ein/Aus-Schalter für Qualitätsprüfungen
- **Min. Antwort-Länge**: Mindestlänge für generierte Antworten
- **Halluzination-Prüfung**: Erkennung unsicherer oder spekulativer Antworten

### 🧪 Test-Framework

#### Live-Testing
- **Test-Anfrage**: Eingabe beliebiger Testfragen
- **Echtzeit-Ausführung**: Sofortige Verarbeitung mit der aktuellen Konfiguration
- **Detaillierte Ergebnisse**: Anzeige aller Verarbeitungsschritte und Metriken
- **Multi-Iteration Support**: Vollständige Verfolgung mehrerer Verarbeitungszyklen
- **QDrant Vector Store Details**: Detaillierte Anzeige der Suchergebnisse mit Scores, Content-Previews und Metadaten

#### Iterations-Tracking
- **Iteration-für-Iteration Analyse**: Separate Anzeige jeder Verarbeitungsiteration
- **Confidence-Scoring**: Automatische Bewertung der Antwortqualität pro Iteration
- **Schritt-Details**: Timing, Input/Output und Erfolgs-Status für jeden Verarbeitungsschritt
- **Vector Search Ergebnisse**: Vollständige QDrant-Suchergebnisse mit:
  - **Relevanz-Scores**: Numerische Bewertung der Dokumentenrelevanz (0-1)
  - **Content-Previews**: Erste 300 Zeichen des gefundenen Inhalts
  - **Source-Information**: Quelldatei und Chunk-Index
  - **Metadaten**: Zusätzliche Dokumenteninformationen
  - **Search-Summary**: Gesamtstatistiken und Durchschnittswerte

#### Test-Historie
- **Persistente Speicherung**: Alle Tests werden für spätere Analyse gespeichert
- **Performance-Metriken**: Antwortzeit, Erfolgsrate, Kontext-Qualität
- **Admin-Bewertung**: 5-Sterne-Bewertungssystem mit Notizen

#### A/B-Testing
- **Mehrere Konfigurationen**: Gleichzeitige Verwaltung verschiedener Setups
- **Vergleichsmetriken**: Direkter Vergleich von Performance-Daten
- **Graduelle Einführung**: Sichere Aktivierung neuer Konfigurationen

### 📊 Performance-Monitoring

#### Automatische Metriken
- **Durchschnittliche Antwortzeit**: Kontinuierliche Messung der Response-Zeit
- **Erfolgsrate**: Prozentsatz erfolgreicher Antwort-Generierungen
- **Test-Anzahl**: Gesamtzahl durchgeführter Tests

#### Verarbeitungsschritt-Analyse
- **Schritt-spezifische Zeiten**: Messung der Dauer einzelner Verarbeitungsschritte
- **Iterations-Performance**: Analyse der Performance über mehrere Verarbeitungszyklen
- **Vector Search Metriken**: Detaillierte Analyse der QDrant-Suchergebnisse:
  - **Score-Verteilung**: Histogramm der Relevanz-Scores gefundener Dokumente
  - **Query-Effectiveness**: Erfolgsrate verschiedener Suchanfragen
  - **Content-Quality**: Bewertung der Inhaltsqualität basierend auf Metadaten
- **Bottleneck-Identifikation**: Erkennung langsamer Verarbeitungsschritte
- **Confidence-Tracking**: Verfolgung der Antwortqualität über Iterationen
- **Ressourcen-Optimierung**: Datenbasierte Empfehlungen für Verbesserungen

## Installation und Setup

### 1. Datenbank-Migration

```bash
# Migration ausführen
./deploy-chat-config.sh
```

### 2. Service-Integration

Der `ChatConfigurationService` wird automatisch in die bestehende Chat-Route integriert:

```typescript
// In chat.ts wird automatisch die aktive Konfiguration verwendet
import chatConfigurationService from '../services/chatConfigurationService';

// Antwort-Generierung mit konfigurierter Pipeline
const configuredResult = await chatConfigurationService.generateConfiguredResponse(
  content,
  userId,
  previousMessages.rows,
  userPreferences.rows[0] || {},
  contextSettings
);
```

### 3. Admin-Interface

Das Admin-Interface ist über das Admin-Panel verfügbar:
- Navigiere zu `/admin`
- Wechsle zum Tab "Chat-Config"
- Erstelle und verwalte Konfigurationen

## Verwendung

### Neue Konfiguration erstellen

1. **Admin-Panel öffnen**: Navigiere zu `/admin` → "Chat-Config"
2. **"Neue Konfiguration" klicken**: Startet den Erstellungsprozess
3. **Grundeinstellungen konfigurieren**:
   - Name und Beschreibung eingeben
   - System-Prompt anpassen
   - Max. Iterationen festlegen

4. **Verarbeitungsschritte konfigurieren**:
   - Gewünschte Schritte aktivieren/deaktivieren
   - Spezifische Prompts für jeden Schritt definieren
   - Reihenfolge anpassen

5. **Vector Search optimieren**:
   - Anzahl Suchanfragen konfigurieren
   - Score-Schwellenwerte anpassen
   - Query-Expansion aktivieren

6. **Qualitätsprüfungen einrichten**:
   - Mindestlänge für Antworten festlegen
   - Halluzination-Erkennung aktivieren

### Konfiguration testen

1. **Test-Modal öffnen**: "Test"-Button (▶️) in der Konfigurationsansicht oder beim Editieren
2. **Test-Anfrage eingeben**: Realistische Benutzeranfrage im Modal formulieren
3. **Automatisches Speichern**: Aktuelle Änderungen werden vor dem Test automatisch gespeichert
4. **Test starten**: "Test durchführen"-Button startet die Verarbeitung
5. **Ergebnisse analysieren**:
   - **Generierte Antwort bewerten**: Finale AI-Antwort auf Relevanz und Qualität prüfen
   - **Iterations-Details einsehen**: Jeden Verarbeitungszyklus einzeln analysieren
   - **Vector Search Ergebnisse mit Relevanz-Scores prüfen**: Detaillierte QDrant-Suchergebnisse anzeigen
     - Relevanz-Scores (0-1 Skala) für jedes gefundene Dokument
     - Content-Previews mit ersten 300 Zeichen des Inhalts
     - Source-Information (Dateiname, Chunk-Index)
     - Gesamtstatistiken (Anzahl Ergebnisse, Durchschnittsscore)
   - **Verarbeitungsschritte mit Zeitmessungen überprüfen**: Timing-Analyse für Performance-Optimierung
   - **Verwendeten Kontext analysieren**: Qualität und Relevanz des zusammengestellten Kontexts
   - **Performance-Metriken bewerten**: Antwortzeit, Confidence-Score, Iterationsanzahl
   - **Confidence-Entwicklung verfolgen**: Vertrauenswerte über mehrere Iterationen hinweg

### Konfiguration aktivieren

1. **Konfiguration auswählen**: Gewünschte Konfiguration in der Liste anklicken
2. **"Aktivieren" klicken**: Macht die Konfiguration zur Standard-Konfiguration
3. **Bestätigung**: System verwendet ab sofort die neue Konfiguration

## Best Practices

### 🎯 Konfiguration-Optimierung

#### Schrittweise Optimierung
1. **Baseline etablieren**: Starte mit Standard-Konfiguration
2. **Einzelne Parameter ändern**: Teste jeweils nur eine Änderung
3. **Messbare Verbesserung**: Verwende Metriken zur Bewertung
4. **Dokumentation**: Notiere Änderungen und deren Auswirkungen

#### Performance vs. Qualität
- **Weniger Schritte**: Bessere Performance, möglicherweise niedrigere Qualität
- **Mehr Kontext**: Bessere Antworten, längere Verarbeitungszeit
- **Query-Expansion**: Vollständigere Ergebnisse, höhere Kosten

### 🧪 Effektives Testing

#### Test-Szenarien
- **Häufige Anfragen**: Teste typische Benutzeranfragen
- **Edge Cases**: Teste ungewöhnliche oder schwierige Anfragen
- **Domain-spezifisch**: Teste energiewirtschaftliche Fachbegriffe
- **Mehrsprachig**: Teste verschiedene Sprachstile

#### Bewertungskriterien
- **Relevanz**: Ist die Antwort zur Frage passend?
- **Vollständigkeit**: Werden alle Aspekte der Frage behandelt?
- **Genauigkeit**: Sind die Informationen korrekt?
- **Klarheit**: Ist die Antwort verständlich formuliert?

### 📈 Monitoring und Wartung

#### Regelmäßige Überprüfung
- **Wöchentliche Reviews**: Analyse der Performance-Metriken
- **Monatliche Tests**: Umfassende Test-Sessions mit neuen Szenarien
- **Quartalsweise Optimierung**: Größere Konfigurationsanpassungen

#### Alarme und Benachrichtigungen
- **Performance-Degradation**: Überwachung der Antwortzeiten
- **Erfolgsrate-Einbrüche**: Benachrichtigung bei niedrigen Erfolgsraten
- **Ressourcen-Limits**: Monitoring der Qdrant- und Gemini-API-Nutzung

## Technische Details

### Architektur

```
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   Admin UI      │    │ ChatConfiguration │    │   Chat Route    │
│   (React)       │◄──►│     Service       │◄──►│   (Express)     │
└─────────────────┘    └───────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │   Configuration   │    │  Gemini API     │
│   (Configs)     │    │      Cache        │    │   (Generation)  │
└─────────────────┘    └───────────────────┘    └─────────────────┘
```

### Datenbank-Schema

```sql
-- Chat-Konfigurationen
CREATE TABLE chat_configurations (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    config JSONB NOT NULL,
    avg_response_time_ms INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    test_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Test-Sessions
CREATE TABLE chat_test_sessions (
    id UUID PRIMARY KEY,
    configuration_id UUID REFERENCES chat_configurations(id),
    admin_user_id UUID REFERENCES users(id),
    test_query TEXT NOT NULL,
    response_time_ms INTEGER,
    generated_response TEXT,
    context_used TEXT,
    search_queries JSONB,
    processing_steps JSONB, -- Legacy field for backward compatibility
    iterations JSONB, -- New field for detailed iteration tracking
    iteration_count INTEGER DEFAULT 1,
    final_confidence DECIMAL(3,2) DEFAULT 0.80,
    was_successful BOOLEAN DEFAULT false,
    admin_rating INTEGER CHECK (admin_rating >= 1 AND admin_rating <= 5),
    admin_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### API-Endpunkte

```typescript
// Konfigurationen verwalten
GET    /api/admin/chat-config                    // Alle Konfigurationen
GET    /api/admin/chat-config/:id               // Spezifische Konfiguration
POST   /api/admin/chat-config                   // Neue Konfiguration
PUT    /api/admin/chat-config/:id               // Konfiguration aktualisieren
DELETE /api/admin/chat-config/:id               // Konfiguration löschen

// Tests durchführen
POST   /api/admin/chat-config/:id/test          // Test ausführen
GET    /api/admin/chat-config/:id/test-history  // Test-Historie
PUT    /api/admin/chat-config/test/:sessionId/rating // Test bewerten

// Konfiguration aktivieren
POST   /api/admin/chat-config/:id/activate      // Konfiguration aktivieren
```

## Troubleshooting

### Häufige Probleme

#### 401 Unauthorized Error im Admin-Interface
**Problem**: Chat-Config Tab zeigt "401 Unauthorized" obwohl Admin eingeloggt ist
**Lösung**: 
```bash
# 1. Prüfe ob Admin-Token korrekt gesetzt ist
localStorage.getItem('token') // sollte einen JWT-Token zurückgeben

# 2. Prüfe Browser-Konsole auf CORS-Errors
# 3. Stelle sicher dass Backend läuft auf Port 3009
curl http://localhost:3009/api/admin/chat-config -H "Authorization: Bearer YOUR_TOKEN"

# 4. Lösche Browser-Cache und starte neu
```

### Database Connection

Alle Datenbankoperationen verwenden die Einstellungen aus der `.env`-Datei:

```bash
# Datenbank-Verbindung testen
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "SELECT version();"

# Migration ausführen
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -f migrations/add_iteration_tracking_fields.sql

# Tabellenstruktur prüfen
PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "\d chat_test_sessions"
```

#### Konfiguration wird nicht geladen
```typescript
// Cache leeren
chatConfigurationService.clearCache();

// Manuelle Konfiguration laden
const config = await chatConfigurationService.getActiveConfiguration();
console.log('Active config:', config);
```

#### Tests schlagen fehl oder zeigen keine Vector Store Ergebnisse
**Problem**: QDrant Vector Store Ergebnisse werden nicht in den Test-Ergebnissen angezeigt
**Ursache**: Nicht alle notwendigen Verarbeitungsschritte sind aktiviert
**Lösung**: 
1. **Alle Schritte aktivieren**: Stelle sicher, dass folgende Schritte in der Konfiguration aktiviert sind:
   - `query_understanding` (für Query-Expansion)
   - `context_search` (für Vector Store Suche) - **ERFORDERLICH für Vector Store Ergebnisse**
   - `context_optimization` (für Kontext-Synthese)
   - `response_generation` (für Antwort-Generierung)
   - `response_validation` (für Qualitätsprüfung)

2. **Konfiguration prüfen**:
```javascript
// Die Konfiguration sollte alle Schritte enthalten:
{
  "processingSteps": [
    {
      "name": "query_understanding",
      "enabled": true,
      "prompt": "Analysiere die Benutzeranfrage..."
    },
    {
      "name": "context_search",  // <- WICHTIG für Vector Store Ergebnisse
      "enabled": true,
      "prompt": "Durchsuche den Qdrant Vector Store..."
    }
    // ... weitere Schritte
  ]
}
```

3. **Vector Search Parameter**:
```javascript
{
  "vectorSearch": {
    "maxQueries": 3,
    "limit": 10,
    "scoreThreshold": 0.3,  // Niedrigeren Threshold für mehr Ergebnisse
    "useQueryExpansion": true
  }
}
```

**Testen**: Verwende das Test-Skript `test-complete-vector-config.js` um eine vollständige Konfiguration zu erstellen

- **Qdrant-Verbindung prüfen**: Sicherstellen, dass Qdrant-Service läuft
- **Gemini-API-Key prüfen**: API-Schlüssel und Quota überprüfen
- **Konfiguration validieren**: JSON-Schema der Konfiguration prüfen

### Logs und Debugging

```typescript
// Aktiviere Debug-Logging
process.env.DEBUG = 'chat-config:*';

// Wichtige Log-Nachrichten
console.log('Loading active configuration...');
console.log('Configuration cache miss, fetching from database');
console.log('Test execution started:', { configId, testQuery });
console.error('Configuration test failed:', error);
```

## Weiterentwicklung

### Geplante Features

#### v2.0
- **Visual Pipeline Editor**: Drag-and-Drop Interface für Verarbeitungsschritte
- **Real-time Monitoring**: Live-Dashboard für Performance-Metriken
- **Machine Learning Integration**: Automatische Konfiguration-Optimierung
- **Multi-Tenant Support**: Benutzer-spezifische Konfigurationen

#### v2.1
- **A/B-Testing Framework**: Automatisierte Vergleichstests
- **Integration Tests**: End-to-End-Testing der gesamten Pipeline
- **Configuration Templates**: Vorgefertigte Konfigurationen für verschiedene Use Cases
- **Export/Import**: Konfigurationen zwischen Systemen übertragen

### Beitragen

1. **Issues melden**: GitHub Issues für Bugs und Feature-Requests
2. **Pull Requests**: Code-Beiträge sind willkommen
3. **Dokumentation**: Verbesserungen an dieser Dokumentation
4. **Testing**: Beta-Testing neuer Features

## Support

Bei Fragen oder Problemen:
1. **Dokumentation prüfen**: Diese README und Code-Kommentare
2. **Logs analysieren**: Server- und Browser-Konsole überprüfen
3. **Issue erstellen**: Detaillierte Problembeschreibung mit Logs
4. **Community**: Discord/Slack-Kanal für schnelle Hilfe

---

*Letzte Aktualisierung: 26. Januar 2025*
