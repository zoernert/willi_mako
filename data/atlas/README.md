# Datenatlas der Energiewirtschaft

Dieses Verzeichnis bündelt alle Artefakte des "Datenatlas der Energiewirtschaft" für unabhängige Weiterverarbeitung. Ein separates Team kann diese Dateien nutzen, um eine interaktive Webanwendung auf einer bestehenden Plattform aufzubauen. Die zugehörigen Vektor-Embeddings sind **nicht** Teil dieses Pakets und verbleiben im Qdrant-Vector-Store.

## Struktur

```
./data/atlas/
├── data_atlas.json
├── process_definitions.json
└── uml_diagrams/
    ├── *.puml
    ├── png/
    │   └── *.png
    └── svg/
        └── *.svg
```

### `data_atlas.json`
- Enthält den vollständigen Datenatlas.
- Top-Level-Felder:
  - `generatedAt`: ISO-Zeitstempel der Erzeugung.
  - `collection`: Referenz auf die Qdrant-Collection, aus der die Inhalte hervorgegangen sind (z. B. `willi_mako`).
  - `elementCount` & `messageCount`: Anzahl der im Atlas erfassten EDIFACT-Elemente bzw. ihrer Nachrichteninstanzen.
  - `elements`: Liste aller Datenelemente. Jedes Element enthält u. a.:
    - `EDIFACT_Element_ID` (z. B. `ALC:5463`), `segmentName`, `elementCode`, `elementName`, `segmentGroup`.
    - `description`: Kurzzusammenfassung inklusive Quelle und Prozessen.
    - `processContext`: Zuordnung der Prozesse inklusive gesetzlicher Grundlagen (`relevantLaws`).
    - `messages`: Alle Nachrichtenkontexte mit Pflichtkennzeichen, Wiederholbarkeits-Regeln, Codes, Quellen und Prozesszuordnungen.

### `process_definitions.json`
- Enthält die kanonischen Prozessbeschreibungen, die im Datenatlas referenziert werden.
- Format: JSON-Array, jedes Objekt beschreibt einen Prozess mit Feldern wie `process_name`, `trigger_question`, `search_keywords`, `relevant_laws`.
- Die Verknüpfung zu `data_atlas.json` erfolgt über `processContext[*].processName`.

### `uml_diagrams/`
- Für jedes Datenelement existiert
  - eine PlantUML-Quelle (`*.puml`),
  - optional ein gerendertes PNG (`png/*.png`),
  - optional ein gerendertes SVG (`svg/*.svg`).
- Die Basis-Dateinamen leiten sich von `EDIFACT_Element_ID` ab:
  - Doppelpunkte (`:`) werden zu Unterstrichen (`_`), alle anderen Nicht-Alphanumerika entfernt.
  - Beispiel: `EDIFACT_Element_ID = "ALC:5463"` → `ALC_5463.puml`, `ALC_5463.png`, `ALC_5463.svg`.
- Fehlende PNG- oder SVG-Dateien bedeuten, dass das öffentliche PlantUML-Rendering trotz mehrfacher Retries temporär fehlgeschlagen ist. In solchen Fällen kann der Renderer erneut mit einem stabileren PlantUML-Server ausgeführt werden.

## Empfehlung für die Webanwendung

1. **Datenelemente laden**
   - `data_atlas.json` parsen und im Frontend oder Backend zwischenspeichern.
   - Die Felder `processContext` und `messages[*].processContext` nutzen, um Relationen zwischen Prozessen, EDIFACT-Segmenten und Nachrichten visualisierbar zu machen.

2. **Prozesswissen verknüpfen**
   - `process_definitions.json` importieren und über `process_name` mit dem Atlas verbinden.
   - Die Felder `trigger_question`, `relevant_laws` und `search_keywords` eignen sich für erklärende Texte, Tooltips oder Volltextsuche.

3. **Diagramme einbinden**
   - Für jedes Datenelement zunächst prüfen, ob eine SVG-Datei vorhanden ist (`uml_diagrams/svg/<name>.svg`).
     - SVG eignet sich für interaktive und skalierbare Einbettungen.
   - Falls nicht verfügbar, PNG-Fallback (`uml_diagrams/png/<name>.png`).
   - Bei Bedarf kann die zugehörige PlantUML-Datei (`uml_diagrams/<name>.puml`) zur Laufzeit erneut gerendert oder angepasst werden.

4. **Vector-Store (extern)**
   - Die Qdrant-Vektoren sind nicht in diesem Verzeichnis enthalten. Das Zielsystem muss – falls semantische Suche oder Retrieval-Augmented Generation benötigt werden – eine eigene Verbindung zur Qdrant-Collection (z. B. `willi_mako`) aufbauen.

5. **Namenskonventionen berücksichtigen**
   - Element-IDs folgen dem Muster `<Segment>:<Elementcode>` und werden in Dateinamen mit `_` statt `:` gespeichert.
   - Nachrichten-bezogene Zusätze (z. B. `EBD:E_0515`) behalten ihren Präfix und ersetzen zusätzliche Sonderzeichen analog.
   - Prozess-spezifische PlantUML-Dateien nutzen denselben Mechanismus (z. B. `QUOTES_EBENE.puml`).

## Weiterführende Hinweise

- Die JSON-Dateien sind UTF-8 codiert und können mit Standard-Parsern verarbeitet werden.

