# Feature Request: Deadline and Task Management (Fristenmanagement)

## Beschreibung
This feature provides a dedicated module for creating, tracking, and managing tasks and deadlines related to market communication processes. Users can create tasks, set due dates, add descriptions, and directly link tasks to relevant paragraphs within the regulatory documents stored in the knowledge base. This helps clerks organize their work and ensure compliance with time-sensitive processes.

## Business Value
- **Risk Reduction:** Helps prevent missing critical deadlines ("Fristen"), which can lead to significant financial penalties and compliance violations.
- **Increased Productivity:** Provides a centralized overview of all open tasks and upcoming deadlines, helping clerks to prioritize their work effectively.
- **Improved Traceability:** Linking tasks directly to regulations provides context and justification for actions taken, improving quality and simplifying audits.

## User Stories
### Story 1
**Als** Sachbearbeiter
**möchte ich** eine Aufgabe für einen "Lieferantenwechselprozess" mit einem Fälligkeitsdatum anlegen
**damit** ich den Vorgang nicht vergesse und rechtzeitig bearbeite.

**Akzeptanzkriterien:**
- [ ] Ich kann ein Formular öffnen, um eine neue Aufgabe zu erstellen.
- [ ] Das Formular enthält Felder für Titel, Beschreibung und Fälligkeitsdatum.
- [ ] Die erstellte Aufgabe erscheint in einer Aufgabenliste.

### Story 2
**Als** Sachbearbeiter
**möchte ich** eine Aufgabe mit einem spezifischen Paragrafen aus einem Regulierungsdokument verknüpfen
**damit** ich bei der Bearbeitung der Aufgabe sofort den relevanten Kontext zur Hand habe.

**Akzeptanzkriterien:**
- [ ] Beim Erstellen oder Bearbeiten einer Aufgabe gibt es eine Funktion, um nach Inhalten im Wissensspeicher zu suchen.
- [ ] Ich kann einen oder mehrere relevante Textabschnitte auswählen und mit der Aufgabe verknüpfen.
- [ ] Die verknüpften Abschnitte sind direkt in der Aufgabendetailansicht einsehbar.

### Story 3
**Als** Sachbearbeiter
**möchte ich** eine Übersicht aller meiner Aufgaben sehen, sortiert nach Fälligkeitsdatum,
**damit** ich meine Arbeit für den Tag oder die Woche planen kann.

**Akzeptanzkriterien:**
- [ ] Es gibt eine Dashboard-Ansicht für alle Aufgaben.
- [ ] Die Aufgaben können nach Fälligkeitsdatum, Priorität oder Status sortiert werden.
- [ ] Fällige oder überfällige Aufgaben sind visuell hervorgehoben.

## Requirements
### Funktionale Anforderungen
- [ ] **Backend:**
    - [ ] Neue Datenbanktabelle `tasks` (id, user_id, title, description, due_date, status, created_at, updated_at).
    - [ ] Neue Datenbanktabelle `task_links` (task_id, document_id, chunk_id) zur Verknüpfung mit Qdrant-Quellen.
    - [ ] CRUD-API-Endpunkte unter `/api/tasks` zur Verwaltung von Aufgaben.
    - [ ] API-Endpunkt zum Verknüpfen einer Aufgabe mit einem Dokumenten-Chunk.
- [ ] **Frontend:**
    - [ ] Eine neue Seite/Modul für das "Fristenmanagement".
    - [ ] Eine Listenansicht für alle Aufgaben mit Sortier- und Filteroptionen.
    - [ ] Eine Detailansicht für einzelne Aufgaben, die auch die verknüpften Dokumente anzeigt.
    - [ ] Ein Formular zum Erstellen und Bearbeiten von Aufgaben.

### Nicht-funktionale Anforderungen
- [ ] **Performance:** Das Laden der Aufgabenliste sollte auch bei hunderten von Einträgen schnell sein.
- [ ] **Sicherheit:** Benutzer dürfen nur ihre eigenen Aufgaben sehen und verwalten, es sei denn, eine Team-Funktion wird später hinzugefügt.
- [ ] **Usability:** Das Erstellen und Verwalten von Aufgaben muss schnell und intuitiv sein.
