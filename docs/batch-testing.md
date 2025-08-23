# Willi-Mako Chat Flow Batch Testing

## Überblick

Die Batch-Testing-Tools ermöglichen die Analyse des Chat-Flows für zwei verschiedene Collections:

1. **CS30 Collection** - Für Administratoren und Entwickler
2. **willi_mako Collection** - Für normale Benutzer

Beide Test-Flows verwenden direkten Zugriff auf die Qdrant Vector-Datenbank, um den kompletten Chat-Flow zu simulieren und zu analysieren.

## Voraussetzungen

- Node.js (v14 oder höher)
- Zugriff auf den Qdrant-Server (URL und API-Key in .env konfiguriert)
- Zugriff auf Google Gemini API (API-Key in .env konfiguriert)

## Verwendung

### CS30 Collection Test (Standard)

```bash
./batch-test.sh [optionen]
```

Dieser Test simuliert den Chat-Flow für die CS30 Collection und analysiert alle Schritte:
- Vector Search
- Query Expansion
- HyDE (Hypothetical Document Embeddings)
- Response Generation

### willi_mako Collection Test (Normale Nutzer)

```bash
./batch-test.sh -n [optionen]
```

Dieser Test simuliert den Chat-Flow für die willi_mako Collection, die von normalen Nutzern verwendet wird.

## Parameter und Optionen

Beide Test-Modi unterstützen folgende Optionen:

- `-h, --help` - Zeigt die Hilfeseite an
- `-q, --queries FILE` - JSON-Datei mit Testanfragen (Standard: test-queries.json)
- `-o, --output DIR` - Ausgabeverzeichnis für Debug-Logs (Standard: debug-logs)
- `-c, --create-queries` - Erstellt eine Standard-Testanfragen-Datei
- `-n, --normal-user` - Test mit der willi_mako Collection für normale Nutzer

## Test-Anfragen

Test-Anfragen werden in einer JSON-Datei gespeichert, die ein Array von Strings enthält:

```json
[
  "Wie lege ich einen neuen Vertrag an?",
  "Was bedeutet GPKE?",
  "Wie melde ich einen Zählerwechsel?"
]
```

Es gibt zwei vorgefertigte Anfragedateien:
- `test-queries.json`: Technische Fragen für CS30 Debug-Tests
- `user-queries.json`: Typische Endnutzerfragen für normale Nutzertests

## Debug-Tools

Zusätzlich können die Debug-Tools direkt für einzelne Anfragen verwendet werden:

### CS30 Debug Tool

```bash
./debug-cs30-v2.sh [optionen] "Anfrage"
```

### willi_mako Debug Tool

```bash
./debug-willi-mako.sh [optionen] "Anfrage"
```

Beide Debug-Tools unterstützen folgende Optionen:
- `-v, --verbose` - Zeigt detaillierte Debug-Informationen
- `-i, --inspect` - Nur Collection inspizieren
- `-l, --lower-threshold` - Niedrigeren Score-Threshold verwenden (0.3 statt 0.6)
- `-e, --expand-query` - Query-Expansion zur Verbesserung der Suchergebnisse nutzen
- `-y, --hyde` - HyDE für die Suche verwenden
- `-a, --all` - Alle Optimierungstechniken verwenden

## Analyse der Ergebnisse

Die Debug-Logs enthalten detaillierte Informationen zu jedem Schritt des Chat-Flows:
- Anfrage und erweiterte Anfrage
- Vector Search Ergebnisse
- Kontext für die Antwortgenerierung
- Generierte Antwort
- Timing-Informationen

Diese Informationen können verwendet werden, um die Leistung des Chat-Flows zu analysieren und zu optimieren.

## Tipps für effektive Tests

1. **Kategorisieren Sie Ihre Anfragen**:
   - Definitionsfragen (z.B. "Was bedeutet GPKE?")
   - Prozessfragen (z.B. "Wie melde ich einen Zählerwechsel?")
   - Tabellenfragen (z.B. "Liste aller BDEW-Codes")

2. **Vergleichen Sie Suchstrategien**:
   Die Debug-Tools ermöglichen den Vergleich verschiedener Strategien:
   - Standard-Suche
   - HyDE-basierte Suche
   - Erweiterte Suche
   - Kombinierte Strategie

3. **Analysieren Sie die Ergebnisse**:
   - Vergleichen Sie Relevanzwerte
   - Prüfen Sie die Konsistenz der Antworten
   - Identifizieren Sie Muster bei fehlgeschlagenen Anfragen

## Fehlerbehebung

Bei Verbindungsproblemen zum Qdrant-Server überprüfen Sie:
1. Die QDRANT_URL und QDRANT_API_KEY in der .env Datei
2. Die Netzwerkverbindung zum Qdrant-Server
3. Die Verfügbarkeit der Collections im Qdrant-Server

## Weiterentwicklung

Die Test-Tools können erweitert werden, um weitere Aspekte des Chat-Flows zu analysieren:
- A/B-Tests verschiedener Prompts
- Optimierung der Vector Search Parameter
- Vergleich verschiedener Embedding-Modelle
