# Refactoring Agent Tasks

Dieses Dokument gliedert den Refactoring-Prozess in einzelne, ausführbare Aufgaben für den GitHub Copilot Agent. Jede Aufgabe ist so konzipiert, dass sie einen spezifischen Teil des Refactorings abdeckt und klare Anweisungen und Referenzen enthält.

---

## Phase 1: User-Modul Migration

### Task 1.1: User-Service Logik migrieren

**Ziel:** Die Business-Logik aus dem alten `src/services/userProfile.ts` in den neuen `src/modules/user/user.service.ts` migrieren.

**Anweisungen:**
1.  Analysiere `src/services/userProfile.ts` und `src/routes/user.ts`, um die bestehende User-bezogene Logik zu identifizieren (Profil-Erstellung, -Abruf, -Aktualisierung).
2.  Implementiere die identifizierte Logik im neuen `src/modules/user/user.service.ts` gemäß den in `docs/new-architecture.md` und `docs/coding-standards.md` definierten Standards.
3.  Verwende die neuen Utility-Module (`src/utils/database.ts`, `src/utils/errors.ts`) und das neue Logging-System (`src/core/logging/logger.ts`).
4.  Erstelle eine `user.interface.ts` in `src/modules/user/` für die notwendigen Typ-Definitionen.
5.  Stelle sicher, dass die neue Implementierung testbar ist.

**Referenzdokumente:**
-   `docs/refactoring-roadmap.md`
-   `docs/new-architecture.md`
-   `docs/coding-standards.md`
-   `docs/module-interfaces.md`

---

### Task 1.2: User-Routen refactorn

**Ziel:** Die User-API-Endpunkte in `src/routes/user.ts` an die neue Service-Logik anpassen.

**Anweisungen:**
1.  Refaktoriere die Routen in `src/routes/user.ts`, um den neuen `UserService` aus `src/modules/user/user.service.ts` zu verwenden.
2.  Entferne die Abhängigkeiten zum alten `userProfile.ts` Service.
3.  Implementiere die Request-Validierung mit dem `src/utils/validation.ts` Modul.
4.  Standardisiere die API-Antworten mit dem `src/utils/response.ts` Modul.
5.  Passe das Error-Handling gemäß `docs/error-handling.md` an.

**Referenzdokumente:**
-   `docs/refactoring-roadmap.md`
-   `docs/new-architecture.md`
-   `docs/error-handling.md`

---

### Task 1.3: Unit-Tests für User-Service erstellen

**Ziel:** Umfassende Unit-Tests für den neuen `UserService` erstellen.

**Anweisungen:**
1.  Erstelle eine Test-Datei `tests/unit/modules/user/user.service.test.ts`.
2.  Schreibe Unit-Tests für alle Methoden im `UserService`.
3.  Verwende die bereitgestellten Test-Helper (`tests/helpers/database.ts`, `tests/helpers/auth.ts`) für das Mocking von Abhängigkeiten.
4.  Stelle sicher, dass alle Tests erfolgreich durchlaufen und eine hohe Code-Abdeckung erreicht wird.

**Referenzdokumente:**
-   `docs/testing-guide.md`
-   `docs/testing-strategy.md`
-   `jest.config.js`

---

## Phase 2: Quiz-Modul Migration

### Task 2.1: Quiz-Service Logik migrieren

**Ziel:** Die komplexe Quiz-Logik aus `src/services/quizService.ts` und `src/routes/quiz.ts` in das neue `src/modules/quiz/quiz.service.ts` Modul überführen.

**Anweisungen:**
1.  Analysiere die bestehende Quiz-Logik (Erstellung, Beantwortung, Gamification, Leaderboard).
2.  Migriere die Logik schrittweise in den `quiz.service.ts` und erstelle bei Bedarf weitere Sub-Services (z.B. `gamification.service.ts`).
3.  Definiere die notwendigen Interfaces in `src/modules/quiz/quiz.interface.ts`.
4.  Integriere die neuen Utility- und Core-Module.

**Referenzdokumente:**
-   `docs/refactoring-roadmap.md`
-   `docs/new-architecture.md`
-   `docs/module-interfaces.md`

---

### Task 2.2: Quiz-Routen refactorn

**Ziel:** Die Quiz-API-Endpunkte an die neue Modulstruktur anpassen.

**Anweisungen:**
1.  Refaktoriere `src/routes/quiz.ts`, um den neuen `QuizService` zu verwenden.
2.  Passe die Routen an die neue, modulare Logik an.
3.  Implementiere Validierung, standardisierte Antworten und Error-Handling.

**Referenzdokumente:**
-   `docs/refactoring-roadmap.md`
-   `docs/new-architecture.md`

---

### Task 2.3: Unit- und Integrationstests für Quiz-Modul

**Ziel:** Die korrekte Funktion des Quiz-Moduls durch Tests sicherstellen.

**Anweisungen:**
1.  Schreibe Unit-Tests für den `QuizService` und alle Sub-Services.
2.  Erstelle Integrationstests, die das Zusammenspiel von Routen, Service und Datenbank für kritische Quiz-Flows überprüfen.
3.  Führe die Tests aus und behebe alle gefundenen Fehler.

**Referenzdokumente:**
-   `docs/testing-guide.md`
-   `jest.integration.config.js`

---

## Phase 3: Frontend-Anpassungen

### Task 3.1: Frontend API-Client anpassen

**Ziel:** Den Frontend-API-Client an die refaktorierten Backend-Endpunkte anpassen.

**Anweisungen:**
1.  Analysiere die Änderungen an den User- und Quiz-API-Endpunkten.
2.  Aktualisiere die API-Client-Implementierungen in `client/src/services/apiClient.ts` und `client/src/services/quizApi.ts`.
3.  Stelle sicher, dass alle Frontend-Komponenten, die diese Services nutzen, weiterhin korrekt funktionieren.

**Referenzdokumente:**
-   `client/src/services/apiEndpoints.ts` (zur Dokumentation der neuen Endpunkte)

---

## Phase 4: Legacy-Code entfernen und Validierung

### Task 4.1: Alten Code entfernen

**Ziel:** Veraltete Service- und Routen-Dateien nach erfolgreicher Migration entfernen.

**Anweisungen:**
1.  Überprüfe, ob die gesamte Logik aus `src/services/userProfile.ts` und `src/services/quizService.ts` migriert wurde.
2.  Lösche die alten Service-Dateien.
3.  Bereinige die alten Routen-Dateien (`quiz_old.ts`, `quiz_fixed.ts`) und stelle sicher, dass `quiz.ts` und `user.ts` nur noch die neue Logik verwenden.

**Referenzdokumente:**
-   `docs/documentation-migration.md`

---

### Task 4.2: End-to-End-Tests und finale Validierung

**Ziel:** Den gesamten Anwendungsfluss mit E2E-Tests validieren und das Refactoring abschließen.

**Anweisungen:**
1.  Führe die Playwright E2E-Tests aus, um die User- und Quiz-Funktionalität aus Endbenutzersicht zu testen.
2.  Führe eine manuelle Überprüfung der gesamten Anwendung durch.
3.  Aktualisiere die Abschlussdokumente (`docs/refactoring-summary.md`) mit den Ergebnissen.
4.  Bereite den Code für das Deployment vor.

**Referenzdokumente:**
-   `playwright.config.ts`
-   `docs/deployment-guide.md`
-   `docs/refactoring-summary.md`
