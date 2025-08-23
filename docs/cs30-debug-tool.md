# CS30 Chat Flow Debug Tool

Diese Debug-Tool wurde entwickelt, um den Chat-Flow mit der CS30 Collection zu analysieren und zu optimieren.

## Zweck

Das Tool simuliert den Chat-Flow der Willi-Mako Anwendung und protokolliert dabei alle Reasoning-Schritte, Kontexte aus den Collections und Antworten in eine Debug.json-Datei. Diese Datei kann dann zur Optimierung des Flows genutzt werden.

## Kompatibilität mit verschiedenen Collections

Das Tool wurde so konzipiert, dass es sowohl mit der CS30 Collection als auch mit anderen Collections wie "willi_mako" kompatibel ist. Es berücksichtigt unterschiedliche Feldstrukturen:

- In der CS30 Collection wird der Haupttext typischerweise im Feld `content` gespeichert
- In anderen Collections wie "willi_mako" wird der Haupttext oft im Feld `text` gespeichert

Das Tool extrahiert automatisch den Inhalt aus dem jeweils verfügbaren Feld.

## Technische Details

- **Embedding-Modell**: Das Tool verwendet das `text-embedding-004` von Google zur Generierung der Vektoreinbettungen für die Suche.
- **LLM-Modell**: Für die Generierung von Antworten und die Query-Expansion wird `gemini-2.5-pro` verwendet.
- **Vector Store**: Qdrant wird als Vektorstore verwendet, mit einer Einbettungsdimension von 768 und Cosine-Distanz als Ähnlichkeitsmaß.

Diese modernen KI-Modelle bieten eine gute Basis für semantische Suche und Textgenerierung, können jedoch von Optimierungen der Datenqualität und der Suchparameter profitieren.

## Neue Funktionen in Version 2.0

Die neue Version des Debug-Tools implementiert fortschrittliche Suchtechniken, die mit der Produktionsumgebung übereinstimmen:

1. **HyDE (Hypothetical Document Embeddings)**: Generiert eine hypothetische Antwort auf die Anfrage, die dann für die Vektorsuche verwendet wird. Dies verbessert die semantische Übereinstimmung erheblich, da die erzeugten Einbettungen kontextreicher sind.

2. **Intelligente Filterung**: Basierend auf einer Analyse der Anfrage werden automatisch Filter erstellt, die gezielt nach bestimmten Dokumenttypen, Definitionen oder Tabelleninhalten suchen.

3. **Optimierte Suchstrategie**: Das Tool implementiert nun die `searchWithOptimizations`-Methode aus dem Produktionscode, die mehrere Optimierungstechniken kombiniert.

4. **Vergleichsmodus**: Sie können beide Suchmethoden (basic und optimiert) parallel ausführen und vergleichen, um die Unterschiede zu verstehen.

## Installation

Stellen Sie sicher, dass die notwendigen Abhängigkeiten installiert sind:

```bash
npm install @qdrant/js-client-rest @google/generative-ai dotenv
```

## Verwendung

Sie können das Tool auf zwei Arten verwenden:

### 1. Über das Bash-Script (empfohlen)

```bash
./debug-cs30-v2.sh [optionen] [Anfrage]
```

Verfügbare Optionen:
- `-h, --help`: Zeigt diese Hilfeseite an
- `-v, --verbose`: Zeigt detaillierte Debug-Informationen
- `-i, --inspect`: Nur CS30 Collection inspizieren (keine Anfrageverarbeitung)
- `-l, --lower-threshold`: Niedrigeren Score-Threshold verwenden (0.3 statt 0.6)
- `-e, --expand-query`: Query-Expansion zur Verbesserung der Suchergebnisse nutzen
- `-s, --sample-points`: Beispielpunkte aus der CS30 Collection extrahieren
- `-y, --hyde`: HyDE (Hypothetical Document Embeddings) für die Suche verwenden
- `-f, --no-filters`: Intelligente Filter deaktivieren
- `-o, --no-optimizations`: Optimierte Suche deaktivieren und Standard-Suche verwenden
- `-c, --compare`: Beide Suchmethoden ausführen und vergleichen
- `-q, --show-query`: Vollständige generierte Anfragen in den Logs anzeigen
- `-a, --all`: Alle Optimierungstechniken verwenden (-l -e -s -y -c -v -q)

Beispiele:

```bash
# Standard-Anfrage verwenden
./debug-cs30-v2.sh

# Benutzerdefinierte Anfrage mit niedrigerem Threshold und Query-Expansion
./debug-cs30-v2.sh -l -e "Wie lege ich einen Vertrag an?"

# Nur die CS30 Collection inspizieren
./debug-cs30-v2.sh -i -s

# HyDE und Vergleichsmodus verwenden
./debug-cs30-v2.sh -y -c "Wie kann ich einen Zählerwechsel melden?"

# Alle Optimierungstechniken verwenden
./debug-cs30-v2.sh -a "Wo finde ich den Menüpunkt für Vertragsanlagen?"
```

### 2. Direkt über Node.js

```bash
node debug-cs30-chat-flow-v2.js [optionen] [Anfrage]
```

Optionen sind die gleichen wie oben, jedoch in der Node.js-Syntax:
```
--help             # Hilfe anzeigen
--verbose          # Detaillierte Infos
--inspect-only     # Nur Collection inspizieren
--lower-threshold  # Niedrigerer Threshold
--expand-query     # Query-Expansion
--sample-points    # Beispielpunkte extrahieren
--hyde             # HyDE-Suche verwenden
--no-filters       # Filter deaktivieren
--no-optimizations # Optimierte Suche deaktivieren
--compare          # Suchmethoden vergleichen
--show-query       # Vollständige Anfragen anzeigen
```

## Optimierungstechniken

Das Tool bietet verschiedene Techniken zur Verbesserung der Suchergebnisse:

### 1. Niedrigerer Score-Threshold

Mit `-l` oder `--lower-threshold` wird der Score-Threshold von 0.6 auf 0.3 gesenkt. Dies ermöglicht es, auch weniger relevante Ergebnisse zu finden, was nützlich sein kann, um zu verstehen, warum keine hochrelevanten Ergebnisse gefunden werden.

### 2. Query-Expansion

Mit `-e` oder `--expand-query` wird die Anfrage erweitert, indem relevante Fachbegriffe und Schleupen-spezifische Terminologie hinzugefügt werden. Dies kann helfen, die semantische Lücke zwischen der Anfrage und den Dokumenten zu überbrücken.

### 3. HyDE (Hypothetical Document Embeddings)

Mit `-y` oder `--hyde` wird die HyDE-Technik aktiviert. Diese Methode generiert zunächst eine hypothetische Antwort auf die Anfrage und verwendet dann diese Antwort (anstelle der ursprünglichen Anfrage) für die Vektorsuche. Dies kann die Qualität der Ergebnisse erheblich verbessern, da die generierte Antwort oft mehr relevante Fachbegriffe enthält als die ursprüngliche Anfrage.

### 4. Intelligente Filterung

Das Tool analysiert die Anfrage automatisch, um zu erkennen, ob es sich um eine Definition, tabellarische Daten oder dokumentspezifische Anfragen handelt. Basierend auf dieser Analyse werden intelligente Filter erstellt. Diese können mit `-f` oder `--no-filters` deaktiviert werden.

### 5. Methodenvergleich

Mit `-c` oder `--compare` führt das Tool sowohl die Basis-Suche als auch die optimierte Suche durch und vergleicht die Ergebnisse. Dies ist nützlich, um zu verstehen, welche Auswirkungen die Optimierungen haben.

## Ausgabe

Das Tool erstellt eine JSON-Datei im Verzeichnis `debug-logs` mit dem Präfix `cs30-` und einem Zeitstempel. 
Die Datei enthält:

- Die ursprüngliche Anfrage
- Die erweiterte Anfrage (wenn Query-Expansion aktiviert ist)
- Die hypothetische Antwort (wenn HyDE aktiviert ist)
- Den vollständigen Flow mit Zeitstempeln
- Informationen zur CS30 Collection
- Beispielpunkte aus der Collection (wenn aktiviert)
- Suchergebnisse und Scores (sowohl für die Basis- als auch für die optimierte Suche, wenn Vergleich aktiviert)
- Angewandte Filter und deren Analyse
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
   - Verwenden Sie `-y` für HyDE-basierte Suche
   - Verwenden Sie `-s` um zu prüfen, ob die Collection überhaupt Daten enthält

2. **Niedrige Relevanz der CS30-Ergebnisse**
   - Überprüfen Sie die `searchScores` im Debug-Output
   - Verwenden Sie `-c` um zu sehen, welche Suchmethode bessere Ergebnisse liefert
   - Prüfen Sie mit `-s`, ob die richtigen Daten in der Collection sind

3. **Unzureichende CS30-Antworten**
   - Analysieren Sie die Vergleichsanalyse unter `response.analysis`
   - Prüfen Sie, ob der Kontext relevant für die Anfrage ist

## Verbesserungsvorschläge

- **Embeddings**: Die Qualität der Einbettungen verbessern durch Vorverarbeitung der Dokumente
- **Prompt Engineering**: Den System-Prompt für CS30-Antworten optimieren für die spezifischen Bedürfnisse
- **Context Engineering**: Die Art und Weise verbessern, wie der Kontext extrahiert und zusammengestellt wird
- **Datenqualität**: Sicherstellen, dass die CS30-Collection hochwertige, aktuelle und strukturierte Daten enthält
- **Reranking**: Ein zweistufiges Ranking-System implementieren, das zunächst auf semantischer Ähnlichkeit und dann auf spezifischen Qualitätskriterien basiert

## Flow Debug Visualisierung

Um den gesamten Chat-Flow detaillierter zu analysieren und visualisieren, können Sie das Flow-Debug-Tool verwenden. Dieses Tool erstellt visuelle Darstellungen des Prozesses, zeigt Timing-Metriken an und hilft, Engpässe oder Optimierungsmöglichkeiten zu identifizieren.

### Installation

Das Flow-Debug-Tool ist bereits Teil des Projekts und verwendet die Mermaid-Bibliothek für Diagramme, die automatisch aus CDN geladen wird.

### Verwendung

```bash
./flow-debug.sh [optionen] [debug-datei.json]
```

Verfügbare Optionen:
- `-h, --help`: Zeigt die Hilfeseite an
- `-f, --format FORMAT`: Ausgabeformat: html, markdown oder json (Standard: html)
- `-n, --no-timing`: Deaktiviert die Anzeige von Timing-Metriken
- `-d, --no-diagram`: Deaktiviert die Generierung des Flow-Diagramms
- `-c, --compare FILE`: Vergleicht mit einer Baseline-Datei
- `-m, --no-metrics`: Deaktiviert die Einbettung von Performance-Metriken
- `-l, --latest`: Verwendet die neueste Debug-Datei (Standard)

Beispiele:

```bash
# Visualisiere die neueste Debug-Datei
./flow-debug.sh

# Generiere einen Markdown-Bericht
./flow-debug.sh -f markdown

# Vergleiche mit einer früheren Ausführung
./flow-debug.sh -c debug-logs/cs30-wie_lege_ich_einen_vertrag_an_2025-08-15.json

# Verwende eine bestimmte Debug-Datei
./flow-debug.sh debug-logs/cs30-wie_kann_ich_einen_zählerwechsel_melden_2025-08-22.json
```

### Generierte Berichte

Das Tool erstellt einen Bericht mit:

1. **Flow-Diagramm**: Visualisiert den gesamten Chat-Flow mit allen Schritten, Zeitstempeln und wichtigen Ereignissen.
2. **Timing-Metriken**: Zeigt die Dauer jedes Schritts im Flow an, um Engpässe zu identifizieren.
3. **Suchergebnisse**: Stellt die gefundenen Dokumente mit Scores übersichtlich dar.
4. **Antwortvergleich**: Zeigt die Antworten mit und ohne CS30-Kontext nebeneinander.
5. **Baseline-Vergleich**: Bei Verwendung der `-c` Option werden Vergleiche mit einer früheren Ausführung angezeigt.
6. **Detaillierte Schrittliste**: Auflistung aller Schritte mit Zeitstempeln und Details.

### HTML-Bericht

Der HTML-Bericht öffnet sich automatisch im Browser und bietet eine interaktive Analyse des Flows. Die Diagramme werden mit Mermaid gerendert und können für bessere Lesbarkeit angepasst werden.

### Markdown-Bericht

Der Markdown-Bericht eignet sich gut für die Dokumentation oder zum Teilen der Ergebnisse in Systemen, die Markdown unterstützen.

### Vergleich verschiedener Optimierungsstrategien

Ein besonders nützliches Feature ist der Vergleich verschiedener Optimierungsstrategien:

```bash
# Führe einen Chat-Flow mit Standardeinstellungen aus
./debug-cs30-v2.sh "Wie lege ich einen Vertrag an?"

# Führe den gleichen Chat-Flow mit HyDE aus
./debug-cs30-v2.sh -y "Wie lege ich einen Vertrag an?"

# Vergleiche die Ergebnisse
./flow-debug.sh -c debug-logs/cs30-wie_lege_ich_einen_vertrag_an_[timestamp1].json debug-logs/cs30-wie_lege_ich_einen_vertrag_an_[timestamp2].json
```

Dies erlaubt einen direkten Vergleich der Performance-Unterschiede zwischen verschiedenen Suchstrategien für die gleiche Anfrage.

## Batch-Testing mit mehreren Anfragen

Für umfangreichere Tests bietet das Batch-Testing-Tool die Möglichkeit, mehrere Anfragen automatisiert zu testen und die Ergebnisse zu vergleichen.

### Installation

Das Batch-Testing-Tool ist bereits Teil des Projekts und verwendet intern die CS30 Debug- und Flow-Debug-Tools.

### Verwendung

```bash
./batch-test.sh [optionen]
```

Verfügbare Optionen:
- `-h, --help`: Zeigt die Hilfeseite an
- `-q, --queries FILE`: JSON-Datei mit Testanfragen (Standard: test-queries.json)
- `-o, --output DIR`: Ausgabeverzeichnis für Debug-Logs (Standard: debug-logs)
- `-c, --create-queries`: Erstellt eine Standard-Testanfragen-Datei

Beispiele:

```bash
# Verwende Standard-Testanfragen
./batch-test.sh

# Verwende benutzerdefinierte Testanfragen
./batch-test.sh -q custom-queries.json

# Erstelle eine Standard-Testanfragen-Datei
./batch-test.sh -c
```

### Testanfragen-Datei

Die Testanfragen-Datei ist eine einfache JSON-Datei mit einem Array von Strings:

```json
[
  "Wie lege ich einen neuen Vertrag in CS30 an?",
  "Was bedeutet GPKE?",
  "Wie melde ich einen Zählerwechsel?",
  "Tabelle mit allen BDEW-Codes anzeigen",
  "Wie bearbeite ich einen Anwendungsfehler?"
]
```

### Durchführung von Batch-Tests

Beim Batch-Testing werden automatisch:

1. Jede Anfrage mit verschiedenen Optionskombinationen ausgeführt:
   - Standard (ohne spezielle Optionen)
   - HyDE (mit -y Option)
   - Query-Expansion (mit -e Option)
   - Alle Optimierungen (mit -a Option)

2. Für jede Anfrage werden Vergleichsberichte erstellt:
   - Standard vs. HyDE
   - Standard vs. Query-Expansion
   - Standard vs. Alle Optimierungen

3. Eine Zusammenfassung der Tests wird in einer JSON-Datei gespeichert:
   - Zeitstempel des Tests
   - Liste aller Anfragen mit ihren Ergebnisdateien
   - Liste aller Vergleiche zwischen verschiedenen Optimierungsstrategien

### Analysieren der Batch-Test-Ergebnisse

Die Ergebnisse des Batch-Tests können über die generierten Flow-Debug-Berichte eingesehen werden. Dies ermöglicht einen systematischen Vergleich verschiedener Optimierungsstrategien über eine Vielzahl von Anfragen.

Mit dieser Methode können Sie:

- Die konsistente Leistung von HyDE über verschiedene Anfragetypen bewerten
- Die Wirksamkeit von Query-Expansion für verschiedene Anfrageformate analysieren
- Identifizieren, welche Optimierungen für bestimmte Anfragetypen am besten funktionieren
- Problematische Anfragen finden, die unabhängig von der Optimierungsstrategie schlechte Ergebnisse liefern
