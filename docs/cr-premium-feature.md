Absolut! Hier ist ein detaillierter Implementierungsplan, der auf Ihrer Beschreibung basiert und auf die bestehende Codebase des Willi Mako-Projekts zugeschnitten ist. Dieser Plan ist so strukturiert, dass ein KI-Agent die Aufgaben schrittweise umsetzen kann.

---

## Implementierungsplan: Premium-Funktionen für Willi Mako

Dieses Dokument beschreibt die schrittweise Implementierung von zwei neuen Premium-Funktionen: **Human-Assisted Deep Analysis** und **Online Video/Screensharing Sessions**.

### Phase 1: Vorbereitung und gemeinsame Komponenten

#### Aufgabe 1.1: Umgebung einrichten
1.  **Branch erstellen**: Erstelle einen neuen Git-Branch namens `feature/premium-monetization` vom `main`-Branch.
2.  **Abhängigkeiten installieren**: Stelle sicher, dass alle notwendigen Projektabhängigkeiten mit `npm install` oder `yarn install` installiert sind.

---

### Phase 2: Feature 1 - Human-Assisted Deep Analysis

#### Aufgabe 2.1: Backend-Implementierung (Deep Analysis)

1.  **Datenbank-Migration erstellen**:
    * Erstelle eine neue Migrationsdatei im Verzeichnis `migrations/`.
    * Name der Datei: `[timestamp]_create_premium_analysis_requests_table.js`.
    * Definiere in der `up`-Methode die SQL-Anweisung zur Erstellung der Tabelle `premium_analysis_requests` genau wie in der Beschreibung spezifiziert. Füge die `down`-Methode hinzu, um die Tabelle wieder zu entfernen (`DROP TABLE premium_analysis_requests;`).
    * **Felder**: `id`, `user_id`, `admin_id`, `chat_id`, `request_message`, `status`, `admin_notes`, `price_quote_amount`, `price_quote_currency`, `price_quote_description`, `quoted_at`, `accepted_at`, `completion_message`, `workspace_access_granted`, `created_at`, `updated_at`, `expires_at`.

2.  **Neues Modul erstellen**:
    * Erstelle einen neuen Ordner `src/modules/premium_analysis`.
    * Erstelle in diesem Ordner die Datei `PremiumAnalysisService.ts`.

3.  **PremiumAnalysisService implementieren**:
    * Implementiere in `PremiumAnalysisService.ts` die folgenden Methoden. Nutze die bestehenden Datenbank-Konnektoren und Modelle.
        * `requestDeepAnalysis(userId, chatId, message)`: Erstellt einen neuen Eintrag in `premium_analysis_requests` mit dem Status `pending_admin_assignment`.
        * `getPendingRequestsForAdmin()`: Ruft alle Anfragen mit dem Status `pending_admin_assignment` ab.
        * `assignAdminToRequest(requestId, adminId)`: Aktualisiert das Feld `admin_id` und den Status auf `awaiting_quote`.
        * `createPriceQuote(requestId, adminId, amount, currency, description)`: Füllt die Preis-Felder und setzt den Status auf `quoted`.
        * `acceptPriceQuote(requestId, userId)`: Setzt den Status auf `awaiting_payment` (oder `in_progress`, falls keine Zahlungs-Gateway-Integration erfolgt).
        * `submitAnalysisResult(requestId, adminId, result)`: Speichert die Analyse in `completion_message` und setzt den Status auf `completed`.
        * `getUserRequests(userId)`: Ruft alle Anfragen für eine gegebene `user_id` ab.
        * `grantWorkspaceAccess(requestId, userId)`: Setzt `workspace_access_granted` auf `true`.
        * `getWorkspaceDataForAdmin(requestId, adminId)`: Implementiert die Sicherheitsprüfung (Request-Status, `admin_id`, `workspace_access_granted`) und ruft bei Erfolg die Chat-Historie und Workspace-Dokumente ab.

4.  **API-Routen definieren**:
    * Erstelle eine neue Datei `src/routes/premium_analysis.ts`.
    * Definiere die folgenden Endpunkte und verknüpfe sie mit den entsprechenden Methoden im `PremiumAnalysisService`.
        * `POST /api/premium/analyze`
        * `GET /api/premium/admin/requests`
        * `POST /api/premium/admin/requests/:requestId/assign`
        * `POST /api/premium/admin/requests/:requestId/quote`
        * `POST /api/premium/requests/:requestId/accept-quote`
        * `POST /api/premium/admin/requests/:requestId/complete`
        * `GET /api/premium/requests/my`
        * `POST /api/premium/requests/:requestId/grant-access`
        * `GET /api/premium/admin/requests/:requestId/workspace-data`
    * Sichere die Routen mit den vorhandenen Middleware-Funktionen `authenticateToken` und `requireAdmin` (für Admin-Routen).
    * Registriere die neuen Routen in der Haupt-Anwendungsdatei (vermutlich `src/app.ts` oder `src/server.ts`).

5.  **Benachrichtigungen erweitern**:
    * Öffne `src/services/emailService.ts`.
    * Füge neue Methoden hinzu, um E-Mails für folgende Ereignisse zu versenden:
        * `sendQuoteIssuedEmail(user, quoteDetails)`
        * `sendAnalysisCompletedEmail(user, analysisDetails)`
        * `sendNewAnalysisRequestEmailToAdmins(requestDetails)`
    * Integriere diese Methoden in den `PremiumAnalysisService` an den entsprechenden Stellen (z. B. nach `createPriceQuote` oder `submitAnalysisResult`).

#### Aufgabe 2.2: Frontend-Implementierung (Deep Analysis)

1.  **API-Endpunkte hinzufügen**:
    * Öffne `client/src/services/apiEndpoints.ts`.
    * Füge die neuen Endpunkte für die Deep Analysis Funktion hinzu.

2.  **Client-seitigen API-Service erstellen**:
    * Erstelle eine neue Datei `client/src/services/premiumApi.ts`.
    * Implementiere Funktionen, die die neuen Backend-Endpunkte aufrufen (z.B. `requestAnalysis`, `getAdminRequests`, `acceptQuote`).

3.  **UI-Komponenten implementieren**:
    * **Anfrage-Modal**: Erstelle eine neue React-Komponente (z.B. `RequestAnalysisModal.tsx`), die vom Chat-Fenster aus geöffnet werden kann. Diese Komponente sollte ein Textfeld für die Anfrage und einen Senden-Button enthalten.
    * **Nutzer-Dashboard-Seite**: Erstelle eine neue Seite (`MyAnalysisRequests.tsx`) und füge sie zum Nutzer-Dashboard hinzu. Diese Seite listet alle Anfragen des Nutzers auf, zeigt deren Status und ermöglicht die Interaktion (z.B. Angebot annehmen).
    * **Admin-Dashboard-Seite**: Erstelle eine neue Seite (`AdminAnalysisDashboard.tsx`) für den Admin-Bereich. Diese Seite listet alle Anfragen auf, ermöglicht die Zuweisung, Angebotserstellung und den Zugriff auf Workspace-Daten (falls freigegeben).

---

### Phase 3: Feature 2 - Online Video/Screensharing Sessions

#### Aufgabe 3.1: Backend-Implementierung (Video Sessions)

1.  **Datenbank-Migration erstellen**:
    * Erstelle eine neue Migrationsdatei im Verzeichnis `migrations/`.
    * Name der Datei: `[timestamp]_create_video_sessions_table.js`.
    * Definiere die `up`-Methode zur Erstellung der `video_sessions`-Tabelle mit den spezifizierten Feldern. Füge eine entsprechende `down`-Methode hinzu.
    * **Felder**: `id`, `user_id`, `admin_id`, `status`, `price_per_minute`, `price_currency`, `proposed_by`, `suggested_times`, `scheduled_start_time`, `scheduled_end_time`, `meeting_link`, `actual_start_time`, `actual_end_time`, `total_cost`, `notes`, `created_at`, `updated_at`.

2.  **Neues Modul erstellen**:
    * Erstelle einen neuen Ordner `src/modules/video_sessions`.
    * Erstelle in diesem Ordner die Datei `VideoSessionService.ts`.

3.  **VideoSessionService implementieren**:
    * Implementiere in `VideoSessionService.ts` die folgenden Methoden:
        * `createVideoSessionRequest(...)`: Erstellt einen neuen Eintrag in `video_sessions`.
        * `proposeMeetingTimes(sessionId, proposerId, times)`: Speichert vorgeschlagene Zeiten im Feld `suggested_times`.
        * `acceptMeetingTime(sessionId, acceptorId, acceptedTime)`: Setzt `scheduled_start_time`, `scheduled_end_time` und den Status auf `scheduled`.
        * `generateMeetingLink(sessionId)`: Erzeugt eine einzigartige Jitsi-URL (`https://meet.jitsi.siem.be/{sessionId}`) und speichert sie in `meeting_link`.
        * `startSession(sessionId)`: Setzt `actual_start_time` und den Status auf `in_progress`.
        * `endSession(sessionId)`: Setzt `actual_end_time`, berechnet `total_cost` und setzt den Status auf `completed`.
        * `getUserVideoSessions(userId)` und `getAdminVideoSessions(adminId)`: Rufen die Sessions für den jeweiligen Nutzer ab.

4.  **API-Routen definieren**:
    * Erstelle eine neue Datei `src/routes/video_sessions.ts`.
    * Definiere die folgenden Endpunkte und sichere sie mit der `authenticateToken`-Middleware:
        * `POST /api/video-sessions/request`
        * `POST /api/video-sessions/:sessionId/propose-times`
        * `POST /api/video-sessions/:sessionId/accept-time`
        * `POST /api/video-sessions/:sessionId/start`
        * `POST /api/video-sessions/:sessionId/end`
        * `GET /api/video-sessions/my`
        * `GET /api/video-sessions/admin` (mit `requireAdmin`-Middleware)
    * Registriere die neuen Routen in der Haupt-Anwendungsdatei.

#### Aufgabe 3.2: Frontend-Implementierung (Video Sessions)

1.  **API-Endpunkte und Service erweitern**:
    * Füge die neuen Video-Session-Endpunkte zu `client/src/services/apiEndpoints.ts` hinzu.
    * Erstelle `client/src/services/videoSessionApi.ts` und implementiere die Client-seitigen Funktionen zum Aufrufen der neuen Endpunkte.

2.  **UI-Komponenten implementieren**:
    * **Session-Dashboard**: Erstelle eine neue Seite (`VideoSessions.tsx`) im Dashboard, auf der Nutzer und Admins Sessions anfragen, geplante Sessions einsehen und vergangene Sessions überprüfen können.
    * **Terminplanungs-Komponente**: Implementiere eine Komponente (`TimeSlotScheduler.tsx`) mit Datums- und Zeitauswahlfeldern (z.B. mit `Material-UI Pickers`), um Termine vorzuschlagen und anzunehmen.
    * **Meeting-Komponente**: Erstelle eine Komponente (`JitsiMeeting.tsx`), die den Meeting-Link anzeigt und entweder über einen Button in einem neuen Tab öffnet oder Jitsi direkt in einem `<iframe>` einbettet.

---

### Phase 4: Allgemeine Überlegungen und Abschluss

1.  **Fehlerbehandlung**: Stelle sicher, dass für alle neuen API-Endpunkte und Service-Methoden die bestehenden `AppError`-Klassen und das `errorHandler`-Middleware konsistent verwendet werden.
2.  **Logging**: Integriere das bestehende Logging-System aus `src/core/logging/` in die neuen Services, um wichtige Ereignisse (z.B. Erstellung einer Anfrage, Start/Ende einer Session) zu protokollieren.
3.  **Tests**: Erstelle Unit-Tests für die neue Business-Logik in den Service-Klassen und Integrationstests für die neuen API-Endpunkte.
4.  **Dokumentation**: Aktualisiere die interne API-Dokumentation (z.B. Swagger/OpenAPI, falls vorhanden), um die neuen Endpunkte zu beschreiben.
5.  **Code-Review und Merge**: Führe einen gründlichen Code-Review durch, bevor der Feature-Branch in den `main`-Branch gemerged wird.

Dieser Plan bietet eine klare Roadmap für die Implementierung. Jeder Schritt ist darauf ausgelegt, modular und testbar zu sein, was sich gut in die bestehende Architektur einfügt.