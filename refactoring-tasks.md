# GitHub Copilot Agent - Refactoring-Aufgaben

Dieses Dokument gliedert den gesamten Refactoring-Prozess in einzelne, atomare Aufgaben, die vom GitHub Copilot Agent ausgeführt werden können. Jede Aufgabe enthält eine klare Beschreibung, die zu ergreifenden Maßnahmen und Verweise auf alle relevanten Designdokumente.

---

### Task 1: Basis-Struktur und Core-Utilities einrichten

**Ziel:** Schaffung der grundlegenden Verzeichnisstruktur und Auslagerung von wiederverwendbaren Hilfsfunktionen gemäß der neuen Architektur.

**Aktionen:**
1.  Erstelle die neuen Verzeichnisstrukturen für `src/core`, `src/modules` und `src/utils`.
2.  Migriere bestehende Hilfsfunktionen (z.B. aus `src/services` oder direkt in den Routen) in die entsprechenden neuen Utility-Module:
    *   `src/utils/database.ts`: Für Datenbank-Verbindungslogik.
    *   `src/utils/response.ts`: Für standardisierte API-Antworten.
    *   `src/utils/errors.ts`: Für benutzerdefinierte Fehlerklassen.
    *   `src/utils/validation.ts`: Für Validierungslogik.
    *   `src/utils/password.ts`: Für Passwort-Hashing und -Vergleich.
3.  Implementiere das zentrale Logging-System unter `src/core/logging/`.
4.  Stelle sicher, dass alle neuen Utility-Funktionen den definierten Coding-Standards entsprechen.

**Referenzen:**
-   `docs/new-architecture.md`
-   `docs/coding-standards.md`
-   `docs/error-handling.md`

---

### Task 2: Refactoring der Service-Schicht

**Ziel:** Verlagerung der Business-Logik aus den alten Service-Dateien in die neue modulare Struktur.

**Aktionen:**
1.  Analysiere die bestehenden Services (`quizService.ts`, `userProfile.ts`, etc.).
2.  Identifiziere die Kernlogik, die zu den neuen Modulen (User, Quiz, Workspace) gehört.
3.  Verschiebe die Logik schrittweise in die neuen Service-Klassen innerhalb der jeweiligen Module (z.B. `src/modules/user/user.service.ts`).
4.  Passe die Importe in den alten Routen an, um vorübergehend die neuen Services zu nutzen, bis die Routen selbst refaktorisiert werden.

**Referenzen:**
-   `docs/new-architecture.md`
-   `docs/refactoring-roadmap.md`
-   `docs/module-interfaces.md`

---

### Task 3: Modul-Migration - `user` ✅ **COMPLETED**

**Ziel:** Vollständiges Refactoring des User-Moduls gemäß der neuen Architektur.

**Aktionen:**
1.  ✅ Erstelle die Verzeichnisstruktur `src/modules/user/` mit `controller`, `service`, `routes`, `interfaces` und `tests`.
2.  ✅ Implementiere `user.service.ts` mit der gesamten Benutzer-bezogenen Geschäftslogik.
3.  ✅ Implementiere `user.controller.ts`, das die Service-Logik kapselt und für die Routen bereitstellt.
4.  ✅ Erstelle `user.routes.ts` und migriere die alten Authentifizierungs- und Benutzer-Routen (`src/routes/auth.ts`, `src/routes/user.ts`).
5.  🔄 Schreibe Unit-Tests für den `user.service.ts` gemäß der Testing-Strategie.

**Ergebnisse:**
- ✅ Authentication endpoints successfully migrated (`/api/auth/register`, `/api/auth/login`, `/api/auth/profile`)
- ✅ Frontend login integration working
- ✅ JWT token-based authentication implemented
- ✅ Password validation and hashing implemented
- ✅ Database integration with proper user schema

**Referenzen:**
-   `docs/new-architecture.md`
-   `docs/module-interfaces.md` (Abschnitt User)
-   `docs/testing-strategy.md`
-   `tests/unit/modules/user/user.service.test.ts` (als Vorlage)

---

### Task 4: Modul-Migration - `quiz` ✅ **COMPLETED**

**Ziel:** Refactoring des komplexen Quiz-Moduls und Archivierung veralteter Routen.

**Aktionen:**
1.  ✅ Erstelle die Verzeichnisstruktur `src/modules/quiz/`.
2.  ✅ Implementiere `quiz.service.ts` und `quiz.controller.ts` und migriere die Logik aus `quizService.ts` und `quiz.ts`.
3.  ✅ Erstelle `quiz.routes.ts` für die neuen, sauberen API-Endpunkte.
4.  ✅ Verschiebe die alten, fehlerhaften Quiz-Routendateien (`quiz_old.ts`, `quiz_fixed.ts`) in ein `src/routes/archived/` Verzeichnis.
5.  ✅ Aktualisiere die Server-Konfiguration, um nur noch die neuen `quiz.routes.ts` zu verwenden.

**Ergebnisse:**
- ✅ Quiz module structure implemented (`/api/v2/quiz/` endpoints)
- ✅ Quiz controller and service migrated with full functionality
- ✅ Legacy routes archived (`quiz_legacy.ts`, `quiz_old.ts`, `quiz_fixed.ts`)
- ✅ Gamification service integrated into quiz module
- ✅ Server configuration updated to use new routes
- ✅ Quiz endpoints tested and working (quiz listing, creation, submission)

**Referenzen:**
-   `docs/new-architecture.md`
-   `docs/refactoring-roadmap.md`
-   `docs/module-interfaces.md` (Abschnitt Quiz)

---

### Task 5: Frontend-Services an die neue API anpassen ✅ **COMPLETED**

**Ziel:** Aktualisierung der Frontend-API-Clients, um die neuen, refaktorisierten Backend-Endpunkte zu nutzen.

**Aktionen:**
1.  ✅ Refaktorisiere `client/src/services/apiClient.ts` und `client/src/services/apiEndpoints.ts`, um die neuen Routenstrukturen (`/api/v2/user/`, `/api/v2/quiz/` etc.) abzubilden.
2.  ✅ Aktualisiere die Frontend-Komponenten, die diese Services nutzen, um sicherzustellen, dass die Datenstrukturen mit den neuen API-Antworten übereinstimmen.
3.  ✅ Teste die Frontend-Anwendung umfassend gegen das refaktorierte Backend.

**Ergebnisse:**
- ✅ API base URL updated to use `/api` with relative endpoints
- ✅ Quiz API endpoints updated to use `/v2/quiz/` structure
- ✅ User API endpoints updated to use `/v2/user/` structure
- ✅ Auth endpoints properly configured for `/auth/` paths
- ✅ Frontend builds successfully with updated endpoint configuration
- ✅ Existing AuthContext integration continues to work
- ✅ **CRITICAL FIX:** Infinite loop problems resolved in Workspace, NotesManager, and DocumentsManager components
- ✅ Dashboard API endpoint mismatches fixed to prevent rate limit exhaustion
- ✅ **TEXT SELECTION FIX:** Text selection functionality working in Chat and FAQ pages for creating notes (timing issues resolved)
- ✅ **DOCUMENTS FIX:** Documents infinite loop resolved, proper API endpoint created

**Referenzen:**
-   `docs/new-architecture.md` (Abschnitt API Gateway)
-   `client/src/services/quizApi.ts` (als Beispiel für eine spezifische API-Implementierung)

---

### Task 6: Implementierung der Test-Strategie

**Ziel:** Aufbau der Testinfrastruktur und Implementierung von Tests für die neuen Module.

**Aktionen:**
1.  Konfiguriere Jest für Unit- und Integrationstests (`jest.config.js`, `jest.integration.config.js`).
2.  Erstelle die Test-Helper (`tests/helpers/database.ts`, `tests/helpers/auth.ts`).
3.  Schreibe Unit-Tests für alle neuen Service-Klassen in den Modulen.
4.  Schreibe Integrationstests für die wichtigsten API-Endpunkte jedes Moduls.
5.  Richte Playwright für E2E-Tests ein (`playwright.config.ts`) und erstelle einen ersten Testfall für den Login-Flow.

**Referenzen:**
-   `docs/testing-strategy.md`
-   `docs/testing-guide.md`
-   `jest.config.js`
-   `playwright.config.ts`

---

### Task 7: Aufräumen und Abschluss

**Ziel:** Entfernen von veraltetem Code und Aktualisierung der Dokumentation.

**Aktionen:**
1.  Lösche alle alten Routen- und Service-Dateien, die vollständig durch die neue Modulstruktur ersetzt wurden.
2.  Überprüfe und aktualisiere die `README.md` und die `docs/getting-started.md`, um die neue Projektstruktur und den Startprozess widerzuspiegeln.
3.  Führe alle Tests (Unit, Integration, E2E) ein letztes Mal aus, um die Stabilität des Systems zu gewährleisten.

**Referenzen:**
-   `docs/refactoring-roadmap.md`
-   `docs/documentation-migration.md`
