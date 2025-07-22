# Feature Request: Semantic Search with Citations

## Beschreibung
This feature introduces a dedicated search interface allowing clerks to ask questions in natural language. The system will query the Qdrant vector store to find the most relevant information from regulations, laws, and processes, and then use an AI model to generate a concise answer. Crucially, every answer will be accompanied by precise citations and links to the source documents, ensuring all information is verifiable and trustworthy.

## Business Value
- **Increased Efficiency:** Drastically reduces the time clerks spend searching for information in dense legal and procedural documents.
- **Improved Accuracy:** Minimizes the risk of human error from misinterpreting or overlooking critical information.
- **Enhanced Compliance:** Provides auditable, citable answers, ensuring that actions are based on the correct, up-to-date regulations.

## User Stories
### Story 1
**Als** Sachbearbeiter
**möchte ich** eine Frage in natürlicher Sprache stellen (z.B. "Was ist die Frist für die Antwort auf eine Netznutzungsrechnungskorrektur?")
**damit** ich schnell und ohne das manuelle Durchsuchen von Dokumenten eine präzise Antwort erhalte.

**Akzeptanzkriterien:**
- [ ] Es gibt ein Eingabefeld auf der Benutzeroberfläche, um eine Suchanfrage zu starten.
- [ ] Die Anfrage wird an das Backend gesendet.
- [ ] Das System liefert eine von der KI generierte, zusammenfassende Antwort.

### Story 2
**Als** Sachbearbeiter
**möchte ich** zu jeder Antwort die genauen Quellenangaben (Dokumentenname, Abschnitt, etc.) sehen
**damit** ich die Information überprüfen und in meiner Arbeit korrekt zitieren kann.

**Akzeptanzkriterien:**
- [ ] Unter der KI-generierten Antwort wird eine Liste von Quellen angezeigt.
- [ ] Jede Quelle enthält Metadaten wie Dokumentenname, Seite oder Paragraf.
- [ ] Ein Klick auf eine Quelle zeigt den exakten Textausschnitt aus dem Quelldokument an.

## Requirements
### Funktionale Anforderungen
- [ ] Ein neues Frontend-Modul mit einer Suchleiste und einem Ergebnisbereich.
- [ ] Ein neuer Backend-Endpunkt (z.B. `/api/search`), der eine Textanfrage entgegennimmt.
- [ ] Der Endpunkt führt eine semantische Suche im Qdrant Vector Store durch, um relevante Dokumenten-Chunks abzurufen.
- [ ] Die abgerufenen Chunks werden an den Gemini-Service gesendet, um eine Antwort zu synthetisieren.
- [ ] Die API-Antwort muss das generierte Ergebnis und ein Array von Quell-Objekten (mit Metadaten und Originaltext) enthalten.
- [ ] Das Frontend muss die Antwort und die klickbaren Quellen rendern.

### Nicht-funktionale Anforderungen
- [ ] **Performance:** Die Suchanfrage sollte im Durchschnitt weniger als 5 Sekunden dauern.
- [ ] **Sicherheit:** Alle Anfragen müssen authentifiziert sein.
- [ ] **Usability:** Die Suchoberfläche muss intuitiv und einfach zu bedienen sein.
