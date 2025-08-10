
# Change Request: Gesteuerter Zugriff auf die Wissensdatenbank 'cs30' (Schleupen System)

- **ID:** CR-CS30-INTEGRATION
- **Datum:** 2025-08-10
- **Autor:** Gemini
- **Status:** Vorschlag

## 1. Zusammenfassung
Dieser Change Request beschreibt die Erweiterung des Systems, um autorisierten Benutzern den Zugriff auf eine zusätzliche Qdrant-Collection namens `cs30` zu ermöglichen. Diese Collection enthält spezifische Dokumentationen und Anleitungen für das Schleupen-System. Der Zugriff soll pro Benutzer durch einen Administrator gesteuert werden. Für freigeschaltete Benutzer soll der Chat nach der primären Antwort eine zweite, kontextuell passende Antwort generieren, die ausschließlich auf den Inhalten der `cs30`-Collection basiert.

## 2. Business Value / Motivation
- **Gezielte Wissensvermittlung:** Mitarbeiter, die das Schleupen-System aktiv nutzen, erhalten direkten Zugriff auf hochrelevante Anleitungen und Prozessbeschreibungen, die über das allgemeine Wissen der `willi_mako` Collection hinausgehen.
- **Effizienzsteigerung:** Anstatt allgemeine Prozessbeschreibungen zu erhalten, bekommen Schleupen-Anwender konkrete, umsetzbare Lösungsansätze für ihre spezifischen Anfragen, was die Problemlösungszeit verkürzt.
- **Rechtemanagement & Compliance:** Der Zugriff auf potenziell sensible oder lizenzierte Schleupen-Dokumentation wird auf den berechtigten Personenkreis beschränkt. Dies stellt sicher, dass nur autorisierte Mitarbeiter diese Informationen einsehen können.
- **Verbesserte User Experience:** Die Trennung der Antworten (allgemein vs. spezifisch) sorgt für Klarheit und vermeidet Verwirrung bei Anwendern, die keinen Zugang zum Schleupen-System haben.

## 3. Ist-Zustand
- Die Anwendung nutzt eine einzige Qdrant-Collection (`willi_mako`) als Wissensbasis für alle Benutzer.
- Alle Benutzer erhalten die gleichen Antworten basierend auf dem Inhalt dieser einen Collection.
- Es gibt keine Möglichkeit, den Zugriff auf spezifische Wissensdatenbanken pro Benutzer zu differenzieren.
- Die `cs30` Collection existiert, wird aber von der Anwendung nicht genutzt.

## 4. Soll-Zustand / Funktionale Anforderungen

### 4.1. Zugriffssteuerung durch Administratoren
- **Benutzerverwaltung erweitern:** In der administrativen Benutzerverwaltungsoberfläche muss es eine neue Option (z.B. eine Checkbox) geben: "Zugriff auf Schleupen-Wissensbasis (cs30) gewähren".
- **Datenbank-Erweiterung:** Das Benutzermodell in der Datenbank (vermutlich in der `users`-Tabelle) muss um ein neues Feld erweitert werden, z.B. `can_access_cs30 BOOLEAN DEFAULT FALSE`.
- **Backend-Logik:** Das Backend muss bei jeder Anfrage die Berechtigung des Benutzers prüfen können.

### 4.2. Anpassung des Chat-Ablaufs für autorisierte Benutzer
Für einen Benutzer mit `can_access_cs30 = TRUE` wird der Chat-Ablauf wie folgt modifiziert:
1.  Der Benutzer stellt eine Anfrage.
2.  Das System generiert wie gewohnt die **erste Antwort** basierend auf der `willi_mako` Collection. Diese wird dem Benutzer sofort angezeigt.
3.  **Parallel oder direkt anschließend** initiiert das System einen zweiten, internen Prozess (siehe 4.3).
4.  Wenn dieser Prozess relevante Ergebnisse liefert, wird eine **zweite, separate Antwort** generiert und unterhalb der ersten angezeigt. Diese Antwort muss klar als Zusatzinformation aus der Schleupen-Wissensbasis gekennzeichnet sein (z.B. mit einer Überschrift "Zusätzliche Informationen aus der Schleupen-Dokumentation:").

### 4.3. Logik für die konditionale Zusatzantwort
Dieser Prozess stellt sicher, dass die zweite Antwort nur generiert wird, wenn sie auch wirklich hilfreich ist:
1.  **Suche in `cs30`:** Das System nimmt die ursprüngliche Benutzeranfrage und führt eine reine Vektorsuche (ohne LLM-Generierung) auf der `cs30` Collection durch.
2.  **Relevanz-Evaluierung:** Die Suchergebnisse (z.B. die Top-3-Chunks) werden anhand ihres Similarity-Scores bewertet. Es muss ein Schwellenwert (Threshold) definiert werden (z.B. `score > 0.80`).
3.  **Entscheidung:**
    - **Wenn** mindestens ein Suchergebnis den Schwellenwert überschreitet, werden die relevanten Chunks als Kontext an das KI/LLM-Modell übergeben.
    - **Dann** wird die zweite, auf `cs30` basierende Antwort generiert und an das Frontend gesendet.
    - **Andernfalls** (wenn kein Ergebnis den Schwellenwert erreicht) wird der Prozess abgebrochen und keine zweite Antwort generiert. Dies geschieht still im Hintergrund, der Benutzer merkt davon nichts.

## 5. Betroffene Komponenten
- **Datenbank:** Schema der `users`-Tabelle muss migriert werden.
- **Backend:**
    - `AuthService` / `UserService`: Muss die neue Berechtigung verwalten und prüfen.
    - `AdminController`: Muss Endpunkte zur Aktualisierung der Benutzerberechtigung bereitstellen.
    - `ChatService` / `SearchService`: Muss die neue, zweistufige Antwortlogik implementieren und mit beiden Qdrant-Collections interagieren können.
- **Frontend:**
    - `Admin/UserManagement`-Seite: Muss die neue Checkbox zur Rechtevergabe enthalten.
    - `Chat`-Komponente: Muss in der Lage sein, die zweite Antwort asynchron nachzuladen und entsprechend darzustellen.

## 6. Akzeptanzkriterien
- [ ] Ein Administrator kann einem Benutzer erfolgreich das Recht für den `cs30`-Zugriff erteilen und entziehen.
- [ ] Ein Benutzer **ohne** die Berechtigung erhält immer nur eine Antwort aus der `willi_mako` Collection.
- [ ] Ein Benutzer **mit** der Berechtigung erhält die erste Antwort aus `willi_mako`.
- [ ] Wenn die Anfrage für die `cs30` Collection relevant ist, erhält der berechtigte Benutzer eine zweite, klar gekennzeichnete Antwort.
- [ ] Wenn die Anfrage für die `cs30` Collection **nicht** relevant ist (unter dem definierten Score-Schwellenwert), erhält auch der berechtigte Benutzer **keine** zweite Antwort.
- [ ] Die Performance der ersten Antwort darf durch die zusätzliche Logik nicht beeinträchtigt werden.

## 7. Außerhalb des Scopes (Out of Scope)
- Das Befüllen oder Aktualisieren der `cs30` Collection.
- Die Erstellung der administrativen Benutzerverwaltungsoberfläche, falls diese noch nicht existiert.
- Änderungen am Design oder Inhalt der `cs30` Dokumente selbst.
