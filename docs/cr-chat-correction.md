# Change Request: Interaktive Korrektur von Chat-Antworten mit Gamification

**Antragssteller:** Gemini-CLI
**Datum:** 2025-07-25
**Status:** Entwurf

## 1. Zusammenfassung

Dieser Change Request beschreibt die Implementierung einer neuen Funktionalität, die es allen Benutzern ermöglicht, von der KI generierte Antworten in Chats zu korrigieren. Diese Korrekturen durchlaufen einen Freigabeprozess durch einen Administrator. Nach der Freigabe wird die korrigierte Antwort in der Wissensdatenbank (Vektor-Store) gespeichert, um die Qualität zukünftiger Antworten zu verbessern. Als Anreiz erhalten Benutzer für genehmigte Korrekturen Gamification-Punkte.

## 2. Motivation

Die KI-generierten Antworten sind nicht immer perfekt. Um die Wissensbasis des Systems kontinuierlich und schnell zu verbessern, wird die gesamte Nutzerbasis in den Verbesserungsprozess einbezogen. Administratoren stellen die Qualität der Korrekturen sicher, während Gamification-Elemente die Benutzer zur Teilnahme motivieren. Dies führt zu einer schnelleren und breiteren Abdeckung von Wissen und erhöht die Genauigkeit des Systems.

## 3. Technische Umsetzung

### 3.1. Neue API-Endpunkte

*   **`POST /api/chats/:chatId/messages/:messageId/suggest-correction`**
    *   **Beschreibung:** Ermöglicht es jedem authentifizierten Benutzer, eine Korrektur für eine KI-Antwort vorzuschlagen.
    *   **Request Body:** `{"correctedContent": "Der korrigierte Text."}`
    *   **Rolle:** `user`, `admin`

*   **`GET /api/corrections/pending`**
    *   **Beschreibung:** Ruft eine Liste aller zur Genehmigung ausstehenden Korrekturvorschläge ab.
    *   **Rolle:** `admin`

*   **`POST /api/corrections/:correctionId/approve`**
    *   **Beschreibung:** Ein Administrator genehmigt einen Korrekturvorschlag.
    *   **Request Body:** `{"points": 3}` (1-5 Punkte)
    *   **Rolle:** `admin`

*   **`POST /api/corrections/:correctionId/reject`**
    *   **Beschreibung:** Ein Administrator lehnt einen Korrekturvorschlag ab.
    *   **Rolle:** `admin`

### 3.2. Datenbank-Erweiterungen

Die Tabelle `corrected_answers` wird erweitert, um den Freigabeprozess und die Punktevergabe abzubilden:

```sql
CREATE TYPE correction_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE IF NOT EXISTS answer_corrections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    suggested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_content TEXT NOT NULL,
    corrected_content TEXT NOT NULL,
    status correction_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Admin who reviewed
    reviewed_at TIMESTAMP WITH TIME ZONE,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_answer_corrections_status ON answer_corrections(status);
CREATE INDEX IF NOT EXISTS idx_answer_corrections_suggested_by ON answer_corrections(suggested_by);
```

### 3.3. Service-Schicht

*   **`CorrectionService` (neu):**
    *   `suggestCorrection(userId, messageId, correctedContent)`: Erstellt einen neuen Eintrag in `answer_corrections` mit dem Status `pending`.
    *   `getPendingCorrections()`: Listet alle Korrekturen mit Status `pending`.
    *   `approveCorrection(adminId, correctionId, points)`:
        1.  Ändert den Status der Korrektur zu `approved`.
        2.  Ruft den `GamificationService` auf, um dem vorschlagenden Benutzer die `points` gutzuschreiben.
        3.  Triggert asynchron das Update des Vektor-Stores.
    *   `rejectCorrection(adminId, correctionId)`: Ändert den Status zu `rejected`.

*   **`GamificationService` (Erweiterung):**
    *   `awardPointsForCorrection(userId, points)`: Fügt dem Benutzer Punkte für eine genehmigte Korrektur hinzu.

### 3.4. Vektor-Store Update

Der Prozess zum Aktualisieren des Vektor-Stores wird nur nach der Genehmigung durch einen Administrator angestoßen:

1.  Der `CorrectionService` ruft nach der Genehmigung eine Methode im `QdrantService` auf.
2.  Diese Methode ruft die ursprüngliche Benutzeranfrage ab, die zur korrigierten KI-Antwort geführt hat.
3.  Es wird ein neues Embedding für die Kombination aus **ursprünglicher Benutzeranfrage und der vom Admin genehmigten, korrigierten Antwort** generiert.
4.  Dieser neue Datenpunkt (Embedding + Payload mit dem korrigierten Text) wird dem `system` Vektor-Store hinzugefügt, um für zukünftige Suchen zur Verfügung zu stehen.

## 4. Auswirkungen

*   **Frontend:**
    *   Für alle Benutzer muss bei KI-Nachrichten eine "Korrektur vorschlagen"-Funktion hinzugefügt werden.
    *   Für Administratoren ist eine neue Verwaltungsseite erforderlich, auf der sie ausstehende Korrekturen einsehen, genehmigen (mit Punktevergabe) oder ablehnen können.
*   **Backend:** Die Implementierung erfordert neue API-Endpunkte, eine neue Service-Schicht für die Korrekturlogik und eine Erweiterung des `GamificationService`.
*   **Datenbank:** Die neue Tabelle `answer_corrections` wird eingeführt.
*   **Performance:** Der Prozess zur Aktualisierung des Vektor-Stores sollte asynchron erfolgen, um die API-Antwortzeit für den Admin nicht zu blockieren.

## 5. Akzeptanzkriterien

1.  Jeder Benutzer kann eine Korrektur für eine KI-Antwort vorschlagen.
2.  Der Vorschlag wird in der `answer_corrections`-Tabelle mit dem Status `pending` gespeichert.
3.  Ein Administrator kann eine Liste der ausstehenden Vorschläge sehen.
4.  Ein Administrator kann einen Vorschlag genehmigen und dabei 1-5 Punkte vergeben.
5.  Nach der Genehmigung wird der Status auf `approved` gesetzt, der Benutzer erhält die Punkte, und der Vektor-Store wird mit der neuen Information aktualisiert.
6.  Ein Administrator kann einen Vorschlag ablehnen, wodurch der Status auf `rejected` gesetzt wird.
7.  Bei einer neuen, ähnlichen Anfrage wird die genehmigte, korrigierte Antwort bei der Generierung der neuen Antwort berücksichtigt.