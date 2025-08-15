
# Change Request: "Gesteuerter Zugriff auf die Wissensdatenbank 'cs30' (Schleupen System)"

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

### 5.1. Datenbank-Migration
- **Datei:** Neue Migration `add_cs30_access_column.sql`
- **Schema:** `users`-Tabelle um Spalte `can_access_cs30 BOOLEAN DEFAULT FALSE` erweitern

### 5.2. Backend-Anpassungen
- **Authentifizierung:** `src/middleware/auth.ts` - Erweitern um cs30-Berechtigung
- **Admin-Route:** `src/routes/admin.ts` - Neue Endpunkte für cs30-Rechtevergabe
- **Chat-Service:** `src/routes/chat.ts` - Zweistufige Antwortlogik implementieren
- **Qdrant-Service:** `src/services/qdrant.ts` - Support für cs30-Collection hinzufügen

### 5.3. Frontend-Anpassungen (Legacy App)
- **Admin-Interface:** `app-legacy/src/pages/Admin.tsx` - Checkbox für cs30-Berechtigung
- **Chat-Interface:** `app-legacy/src/pages/Chat.tsx` - Zweite Antwort-Darstellung

### 5.4. Spezifische Implementierungsdetails
- **Qdrant-Collections:** 
  - Bestehend: `willi_mako` (oder `ewilli` basierend auf ENV)
  - Neu: `cs30` Collection muss verfügbar sein
- **Score-Threshold:** Standardwert 0.80 für cs30-Relevanz-Evaluierung
- **API-Endpunkte:**
  - `PUT /api/admin/users/:id/cs30-access` - cs30-Berechtigung setzen
  - Erweitern: `POST /api/chat/messages` - Zweistufige Antwortlogik

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

## 8. Implementierungsfortschritt

### ✅ Phase 1: Codebase-Analyse (Abgeschlossen)
- [x] Datenbankstruktur analysiert (`init.sql`, `users`-Tabelle identifiziert)
- [x] Backend-Architektur verstanden (Express.js Server in `src/server.ts`)
- [x] Admin-Interface lokalisiert (`app-legacy/src/pages/Admin.tsx`)
- [x] Chat-Service identifiziert (`src/routes/chat.ts`)
- [x] Qdrant-Service analysiert (`src/services/qdrant.ts`)
- [x] Bestehende Collection-Konfiguration verstanden (`QDRANT_COLLECTION = ewilli`)

### ✅ Phase 2: Datenbank-Migration (Abgeschlossen)
- [x] Migration für `can_access_cs30` Spalte erstellt
- [x] Migration ausgeführt und getestet
- [x] CS30_COLLECTION in .env konfiguriert

### ✅ Phase 3: Backend-Implementierung (Abgeschlossen)
- [x] Admin-Endpunkt für cs30-Berechtigung implementiert (`PUT /api/admin/users/:id/cs30-access`)
- [x] Qdrant-Service für cs30-Collection erweitert (searchCs30, isCs30Available Methoden)
- [x] Chat-Service um zweistufige Logik erweitert (generateCs30AdditionalResponse)
- [x] CS30_COLLECTION in .env konfiguriert (`cs30`)
- [x] Entwicklungsumgebung erfolgreich gestartet
- [x] CS30-Collection verfügbar und erkannt

### ✅ Phase 4: Frontend-Implementierung (Abgeschlossen)
- [x] Admin-Interface um cs30-Checkbox erweitert
- [x] Chat-Interface um zweite Antwort-Darstellung erweitert
- [x] Legacy App erfolgreich gebaut und deployed

### 🔄 Phase 5: Testing & Validierung (In Bearbeitung)
- [x] CS30-Collection Struktur analysiert (verwendet `content` Feld, 768-dim Vektoren)
- [x] Payload-Format identifiziert (`source`, `type`, `content` Felder)
- [x] Backend-Code an cs30-Struktur angepasst
- [x] Test-Benutzer mit cs30-Zugriff erstellt
- [x] Debugging-Logs hinzugefügt
- [x] Score-Threshold auf 0.60 reduziert für bessere Ergebnisse
- [ ] End-to-End Test: Chat mit cs30-Zusatzantwort
- [ ] Admin-Interface für cs30-Berechtigung testen  
- [ ] Akzeptanzkriterien validieren

### 🔧 Erkenntnisse aus Tests:
- ✅ CS30-Collection existiert und hat 281,239 Dokumente
- ✅ Verwendet 768-dimensionale Vektoren (nicht 1536)
- ✅ Payload-Struktur: `{source, type, content}` (nicht `text`)
- ✅ Test-Benutzer haben cs30-Zugriff
- ⚠️ Frontend cs30AdditionalResponse Display implementiert aber noch nicht getestet

### ⏳ Phase 5: Testing & Validierung (Ausstehend)
- [ ] Akzeptanzkriterien validieren
- [ ] End-to-End Tests durchführen
