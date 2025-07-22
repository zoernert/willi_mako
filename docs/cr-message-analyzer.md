# Feature Request: Marktkommunikations-Nachrichten-Analysator (EDIFACT/XML)

## Beschreibung
Dieses Feature ermöglicht es Sachbearbeitern, rohe EDIFACT- oder XML-Nachrichten direkt in die Anwendung hochzuladen oder hineinzukopieren. Das System analysiert die Nachricht, bereitet die Daten in einer menschenlesbaren Form auf und reichert sie mit kontextuellen Informationen aus der Wissensdatenbank (Qdrant) an. Es soll nicht nur übersetzen, was in der Nachricht steht, sondern auch prüfen, ob sie im Kontext des jeweiligen Geschäftsprozesses plausibel und korrekt ist.

## Business Value
- **Fehlerreduktion:** Sachbearbeiter können fehlerhafte oder unerwartete Nachrichten von Marktpartnern sofort erkennen, bevor diese zu Problemen im Abrechnungssystem führen.
- **Effizienzsteigerung:** Die manuelle "Übersetzung" von komplexen Nachrichten und das Nachschlagen von Codes (z.B. Prüfidentifikatoren, OBIS-Kennzahlen) entfällt vollständig.
- **Schnellere Einarbeitung:** Neue Mitarbeiter können die komplexen Nachrichtenformate und Prozesse deutlich schneller erlernen, da das System als "Übersetzer" und "Prüfer" fungiert.

## User Stories
### Story 1
**Als** Sachbearbeiter
**möchte ich** eine komplette EDIFACT-Nachricht (z.B. eine UTILMD) in ein Textfeld kopieren
**damit** ich sofort eine klare Zusammenfassung sehe, wie z.B. "Anmeldung des Lieferanten X für die Marktlokation Y zum Datum Z".

**Akzeptanzkriterien:**
- [ ] Es gibt eine neue Seite "Nachrichten-Analyse" mit einem großen Textfeld.
- [ ] Nach dem Einfügen des Textes und Klick auf "Analysieren" wird eine von der KI generierte Zusammenfassung angezeigt.
- [ ] Die einzelnen Segmente der Nachricht (z.B. NAD, DTM, LIN) werden in einer strukturierten, lesbaren Form (z.B. Tabelle oder Baumansicht) dargestellt.

### Story 2
**Als** Sachbearbeiter
**möchte ich** für spezifische Codes in der Nachricht (z.B. den Transaktionsgrund `E01` in einem `CAVIN`-Segment) eine Erklärung direkt in der Oberfläche sehen
**damit** ich nicht in externen Handbüchern nach der Bedeutung suchen muss.

**Akzeptanzkriterien:**
- [ ] Wenn ich mit der Maus über einen Code fahre oder darauf klicke, wird ein Tooltip oder eine Infobox mit der Definition aus der Wissensdatenbank angezeigt.
- [ ] Die Erklärung wird durch eine Abfrage an das Backend (welches Qdrant nutzt) dynamisch geladen.

### Story 3
**Als** Sachbearbeiter
**möchte ich** dass das System die Nachricht automatisch auf Plausibilität und formale Korrektheit im Rahmen des Geschäftsprozesses prüft
**damit** ich sofort auf mögliche Probleme hingewiesen werde, z.B. "Warnung: Das angegebene Einzugsdatum liegt in der Vergangenheit" oder "Fehler: Der Prüfidentifikator 'ABC' ist für diesen Prozess ungültig".

**Akzeptanzkriterien:**
- [ ] Das Analyseergebnis enthält einen eigenen Abschnitt für "Validierungsergebnisse".
- [ ] Das Backend nutzt die Wissensdatenbank, um die Daten in der Nachricht gegen bekannte Prozessregeln zu prüfen.
- [ ] Etwaige Warnungen oder Fehler werden klar und verständlich mit einer Handlungsempfehlung angezeigt.

## Requirements
### Funktionale Anforderungen
- [ ] **Frontend:**
    - [ ] Eine neue Seite `/message-analyzer`.
    - [ ] Ein Textarea-Eingabefeld für die Nachricht und einen Button zum Starten der Analyse.
    - [ ] Ein Ergebnisbereich, der die KI-Zusammenfassung, die strukturierte Datenansicht und die Validierungsergebnisse anzeigt.
    - [ ] Interaktive Elemente (z.B. Klick/Hover), um Erklärungen für einzelne Datenfelder anzuzeigen.
- [ ] **Backend:**
    - [ ] Ein neuer API-Endpunkt, z.B. `POST /api/analyze-message`.
    - [ ] Der Endpunkt akzeptiert ein JSON-Objekt mit dem Nachrichteninhalt (`{ "message": "UNB+UNOA:2..." }`).
    - [ ] Implementierung eines Parsers für EDIFACT (z.B. über eine passende Bibliothek) und XML.
    - [ ] Nach dem Parsen werden Schlüsselinformationen extrahiert (Nachrichtentyp, Prozess, Datenpunkte).
    - [ ] Diese Schlüsselinformationen werden genutzt, um relevante Regeln und Definitionen aus dem Qdrant Vector Store abzufragen.
    - [ ] Die geparste Nachricht und die Kontextinformationen werden an den Gemini-Service gesendet, um eine Zusammenfassung und eine Validierungsanalyse zu erstellen.
    - [ ] Die API gibt ein strukturiertes JSON-Objekt zurück, das alle Informationen für die Anzeige im Frontend enthält.

### Nicht-funktionale Anforderungen
- [ ] **Performance:** Die Analyse einer durchschnittlichen Nachricht sollte unter 10 Sekunden abgeschlossen sein.
- [ ] **Sicherheit:** Die Inhalte der Nachrichten dürfen nicht dauerhaft geloggt werden, es sei denn, es ist für eine temporäre Fehleranalyse explizit notwendig und wird dem Nutzer transparent gemacht.
- [ ] **Usability:** Die aufbereiteten Ergebnisse müssen extrem klar, übersichtlich und für Nicht-Techniker verständlich sein.
