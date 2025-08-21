# CS30 Chat Flow Debug Tool

Diese Debug-Tool wurde entwickelt, um den Chat-Flow mit der CS30 Collection zu analysieren und zu optimieren.

## Zweck

Das Tool simuliert den Chat-Flow der Willi-Mako Anwendung und protokolliert dabei alle Reasoning-Schritte, Kontexte aus den Collections und Antworten in eine Debug.json-Datei. Diese Datei kann dann zur Optimierung des Flows genutzt werden.

## Kompatibilität mit verschiedenen Collections

Das Tool wurde so konzipiert, dass es sowohl mit der CS30 Collection als auch mit anderen Collections wie "willi_mako" kompatibel ist. Es berücksichtigt unterschiedliche Feldstrukturen:

- In der CS30 Collection wird der Haupttext typischerweise im Feld `content` gespeichert
- In anderen Collections wie "willi_mako" wird der Haupttext oft im Feld `text` gespeichert

Das Tool extrahiert automatisch den Inhalt aus dem jeweils verfügbaren Feld.

## Installation

Stellen Sie sicher, dass die notwendigen Abhängigkeiten installiert sind:

```bash
npm install @qdrant/js-client-rest @google/generative-ai dotenv
```

## Verwendung

Sie können das Tool auf zwei Arten verwenden:

### 1. Über das Bash-Script (empfohlen)

```bash
./debug-cs30.sh [optionen] [Anfrage]
```

Verfügbare Optionen:
- `-h, --help`: Zeigt diese Hilfeseite an
- `-v, --verbose`: Zeigt detaillierte Debug-Informationen
- `-i, --inspect`: Nur CS30 Collection inspizieren (keine Anfrageverarbeitung)
- `-l, --lower-threshold`: Niedrigeren Score-Threshold verwenden (0.3 statt 0.6)
- `-e, --expand-query`: Query-Expansion zur Verbesserung der Suchergebnisse nutzen
- `-s, --sample-points`: Beispielpunkte aus der CS30 Collection extrahieren
- `-a, --all`: Alle Optimierungstechniken verwenden (-l -e -s -v)

Beispiele:

```bash
# Standard-Anfrage verwenden
./debug-cs30.sh

# Benutzerdefinierte Anfrage mit niedrigerem Threshold und Query-Expansion
./debug-cs30.sh -l -e "Wie lege ich einen Vertrag an?"

# Nur die CS30 Collection inspizieren
./debug-cs30.sh -i -s

# Alle Optimierungstechniken verwenden
./debug-cs30.sh -a "Wo finde ich den Menüpunkt für Vertragsanlagen?"
```

### 2. Direkt über Node.js

```bash
node debug-cs30-chat-flow.js [optionen] [Anfrage]
```

Optionen sind die gleichen wie oben, jedoch in der Node.js-Syntax:
```
--help            # Hilfe anzeigen
--verbose         # Detaillierte Infos
--inspect-only    # Nur Collection inspizieren
--lower-threshold # Niedrigerer Threshold
--expand-query    # Query-Expansion
--sample-points   # Beispielpunkte extrahieren
```

## Optimierungstechniken

Das Tool bietet verschiedene Techniken zur Verbesserung der Suchergebnisse:

### 1. Niedrigerer Score-Threshold

Mit `-l` oder `--lower-threshold` wird der Score-Threshold von 0.6 auf 0.3 gesenkt. Dies ermöglicht es, auch weniger relevante Ergebnisse zu finden, was nützlich sein kann, um zu verstehen, warum keine hochrelevanten Ergebnisse gefunden werden.

### 2. Query-Expansion

Mit `-e` oder `--expand-query` wird die Anfrage erweitert, indem relevante Fachbegriffe und Schleupen-spezifische Terminologie hinzugefügt werden. Dies kann helfen, die semantische Lücke zwischen der Anfrage und den Dokumenten zu überbrücken.

### 3. Antwortvergleich

Das Tool führt automatisch einen Vergleich zwischen der Standardantwort und der CS30-spezifischen Antwort durch, um zu analysieren, welche Antwort informativer und relevanter ist.

## Ausgabe

Das Tool erstellt eine JSON-Datei im Verzeichnis `debug-logs` mit dem Präfix `cs30-` und einem Zeitstempel. 
Die Datei enthält:

- Die ursprüngliche Anfrage
- Die erweiterte Anfrage (wenn Query-Expansion aktiviert ist)
- Den vollständigen Flow mit Zeitstempeln
- Informationen zur CS30 Collection
- Beispielpunkte aus der Collection (wenn aktiviert)
- Suchergebnisse und Scores
- Fallback-Ergebnisse mit niedrigerem Threshold (wenn keine Ergebnisse gefunden wurden)
- Den verwendeten Kontext
- Die generierten Antworten (mit und ohne CS30-Kontext)
- Eine Vergleichsanalyse der Antworten
- Leistungsmetriken

## Analyse der Ergebnisse

Um die Ergebnisse zu analysieren, können Sie die JSON-Datei mit einem Editor öffnen oder das Tool `jq` verwenden:

```bash
cat debug-logs/cs30-[timestamp].json | jq
```

Oder in VS Code öffnen:

```bash
code debug-logs/cs30-[timestamp].json
```

## Typische Probleme und Lösungen

1. **Keine Suchergebnisse**
   - Verwenden Sie `-l` für einen niedrigeren Threshold
   - Verwenden Sie `-e` für Query-Expansion
   - Verwenden Sie `-s` um zu prüfen, ob die Collection überhaupt Daten enthält

2. **Niedrige Relevanz der CS30-Ergebnisse**
   - Überprüfen Sie die `searchScores` im Debug-Output
   - Prüfen Sie mit `-s`, ob die richtigen Daten in der Collection sind

3. **Unzureichende CS30-Antworten**
   - Analysieren Sie die Vergleichsanalyse unter `response.analysis`
   - Prüfen Sie, ob der Kontext relevant für die Anfrage ist

## Verbesserungsvorschläge

- **Embeddings**: Die Qualität der Einbettungen verbessern
- **Prompt Engineering**: Den System-Prompt für CS30-Antworten optimieren
- **Context Engineering**: Die Art und Weise verbessern, wie der Kontext extrahiert und zusammengestellt wird
- **Datenqualität**: Sicherstellen, dass die CS30-Collection hochwertige und strukturierte Daten enthält
