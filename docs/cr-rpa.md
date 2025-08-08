# Detaillierter Implementierungsplan: OpenRPA Multi-Tenant Integration

## 1. Zusammenfassung und Ziele

Dieses Dokument beschreibt den detaillierten Plan zur Integration einer mandantenfähigen OpenRPA-Lösung in die bestehende Willi Mako Plattform. Ziel ist es, den Nutzern die Automatisierung von energiewirtschaftlichen Prozessen direkt aus der Anwendung heraus zu ermöglichen. Die Integration erfolgt als erweiterndes Feature in die bestehende Anwendungsstruktur.

**Primäre Ziele:**
1.  **Backend-Integration:** Schaffung der serverseitigen Logik zur Verwaltung von RPA-Instanzen und Workflows.
2.  **Datenbank-Erweiterung:** Anpassung des Datenbankschemas zur Speicherung RPA-spezifischer Daten.
3.  **Admin-Funktionalität:** Ermöglichen der Freischaltung und Verwaltung der RPA-Funktion für einzelne Benutzer durch Administratoren.
4.  **Frontend-Integration:** Bereitstellung eines RPA-Dashboards für freigeschaltete Benutzer zum Management ihrer Workflows und zum Zugriff auf den RPA-Editor.
5.  **Sichere Mandanten-Trennung:** Gewährleistung, dass jeder Nutzer nur auf seine eigene, isolierte RPA-Umgebung zugreifen kann.

## 2. Analyse der bestehenden Architektur & Integrationspunkte

Die Integration erfolgt in die bestehende Node.js/Next.js-basierte Anwendung. Folgende Schlüsselbereiche werden betroffen sein:

*   **Datenbank (PostgreSQL):** Das Schema wird erweitert. Eine neue Migration wird erstellt, um die `users`-Tabelle zu modifizieren und neue Tabellen für RPA-Instanzen und Workflows hinzuzufügen.
*   **Backend (server.js / API-Routen):** Neue API-Endpunkte unter `/api/rpa/*` und `/api/admin/users/*` werden geschaffen. Ein neuer `rpaService` wird die Geschäftslogik kapseln.
*   **Frontend (React Components):** Ein neues Set von Komponenten für das RPA-Dashboard wird entwickelt. Bestehende UI-Elemente (z.B. Navigation, Admin-Panel) werden angepasst.
*   **Authentifizierung:** Bestehende Auth-Mechanismen werden genutzt, um die neuen Endpunkte und Frontend-Komponenten abzusichern.

## 3. Detaillierter Implementierungsplan

### Phase 0: Vorbereitung & Schema-Anpassung (Sprint 1)

1.  **Datenbank-Migration erstellen (`migration_rpa.sql`):**
    *   Erweitern der `users`-Tabelle um eine neue Spalte, um die RPA-Freischaltung zu steuern.
    ```sql
    ALTER TABLE users ADD COLUMN is_rpa_enabled BOOLEAN DEFAULT FALSE;
    ```
    *   Erstellen der neuen Tabellen für die RPA-Verwaltung.
    ```sql
    -- RPA Instanzen pro Nutzer
    CREATE TABLE user_rpa_instances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      container_id VARCHAR(255) UNIQUE NOT NULL,
      status VARCHAR(50) DEFAULT 'provisioning',
      openflow_endpoint TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active TIMESTAMP
    );

    -- RPA Workflows
    CREATE TABLE rpa_workflows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      workflow_definition JSONB NOT NULL,
      status VARCHAR(50) DEFAULT 'draft',
      last_executed TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```

2.  **Admin-Backend-Anpassung:**
    *   Erstellen eines neuen API-Endpunkts, um den RPA-Status eines Nutzers zu ändern.
    *   **Endpoint:** `PUT /api/admin/users/:userId/rpa-access`
    *   **Body:** `{ "enabled": true/false }`
    *   **Logik:** Aktualisiert den Wert `is_rpa_enabled` für den spezifizierten Benutzer in der Datenbank.

3.  **Admin-Frontend-Anpassung:**
    *   In der Benutzerverwaltungs-Tabelle im Admin-Bereich eine neue Spalte "RPA-Zugriff" hinzufügen.
    *   Pro Benutzer eine Checkbox oder einen Schalter integrieren, der den o.g. API-Endpunkt aufruft, um den RPA-Zugriff zu aktivieren oder zu deaktivieren.

### Phase 1: Backend-Services & API (Sprint 2-3)

1.  **RPA-Service erstellen (`core/services/rpaService.ts`):**
    *   Dieser Service kapselt die gesamte Logik für die Interaktion mit Docker/Kubernetes und der Datenbank.
    *   `provisionRPAInstance(userId)`: Startet einen neuen Docker-Container für den Nutzer und speichert die Instanz-Details in `user_rpa_instances`.
    *   `getUserRPAInstance(userId)`: Ruft die Details der RPA-Instanz für den Nutzer ab.
    *   `getUserWorkflows(userId)`: Listet alle Workflows für den Nutzer aus der `rpa_workflows`-Tabelle auf.
    *   `createWorkflow(userId, workflowData)`: Erstellt einen neuen Workflow-Eintrag.

2.  **RPA-API-Endpunkte implementieren:**
    *   `POST /api/rpa/instance`: (Für den eingeloggten Nutzer) Ruft `rpaService.provisionRPAInstance` auf. Nur für Nutzer mit `is_rpa_enabled = true`.
    *   `GET /api/rpa/instance`: Ruft `rpaService.getUserRPAInstance` auf.
    *   `GET /api/rpa/workflows`: Ruft `rpaService.getUserWorkflows` auf.
    *   `POST /api/rpa/workflows`: Ruft `rpaService.createWorkflow` auf.

3.  **Infrastruktur-Setup (Docker):**
    *   Konfiguration eines Docker-Netzwerks (`willi-mako-rpa`), um die Kommunikation zwischen der Hauptanwendung und den RPA-Containern zu ermöglichen.
    *   Der `rpaService` kommuniziert über die Docker-API (z.B. via `dockerode` npm package), um Container zu verwalten.

### Phase 2: Frontend-Integration für Benutzer (Sprint 4-5)

1.  **Hauptnavigation anpassen:**
    *   Einen neuen Menüpunkt "RPA Automation" hinzufügen.
    *   Dieser Menüpunkt ist nur sichtbar, wenn der eingeloggte Benutzer `is_rpa_enabled = true` hat.

2.  **RPA-Dashboard-Seite erstellen (`/rpa-dashboard`):**
    *   Diese Seite ist der zentrale Anlaufpunkt für den Nutzer.
    *   **Initialer Zustand:** Wenn noch keine RPA-Instanz provisioniert wurde, wird eine Willkommensnachricht mit einem "RPA-Umgebung jetzt starten"-Button angezeigt. Ein Klick ruft `POST /api/rpa/instance` auf.
    *   **Aktiver Zustand:** Wenn eine Instanz existiert, werden folgende Komponenten angezeigt:
        *   **Instanz-Status:** Zeigt den Status der RPA-Instanz an (z.B. "Läuft", "Gestoppt").
        *   **Workflow-Liste:** Listet die Workflows des Nutzers (`GET /api/rpa/workflows`). Ermöglicht das Ansehen von Details.
        *   **Zugriff auf Editor:** Ein prominenter Button "RPA Editor öffnen", der den Nutzer zu seiner persönlichen, web-basierten OpenRPA-Instanz weiterleitet. Der Link muss dynamisch generiert werden (z.B. `https://rpa.willi-mako.de/tenant/${user_id}`).

3.  **Implementierung der React-Komponenten:**
    *   `RPADashboard.tsx`: Hauptcontainer für die Seite.
    *   `RPAInstanceStatus.tsx`: Zeigt den Status der Instanz an.
    *   `WorkflowsList.tsx`: Zeigt die Liste der Workflows an.
    *   `ProvisionRPA.tsx`: Die initiale Ansicht mit dem Start-Button.

### Phase 3: KI-gestützte Workflow-Generierung (Optional, Sprint 6)

*   Diese Phase wird als optional betrachtet und kann nach dem initialen Rollout implementiert werden.
*   **Backend-Erweiterung:**
    *   Implementierung der `generateWorkflowFromProcess`-Methode im `rpaService` wie im ursprünglichen Konzept beschrieben.
    *   Nutzung eines externen LLM-Service (z.B. Gemini API) zur Konvertierung von Prozessbeschreibungen in ein strukturiertes OpenRPA-Workflow-Format (JSON).
*   **Frontend-Integration:**
    *   Im UI eine Möglichkeit schaffen, einen erkannten Prozess auszuwählen und daraus einen Workflow-Entwurf generieren zu lassen.

## 4. User Stories

*   **Als Admin:** möchte ich in der Benutzerverwaltung sehen, welcher Nutzer für RPA freigeschaltet ist, und diesen Status mit einem Klick ändern können, um die Kontrolle über dieses Premium-Feature zu behalten.
*   **Als freigeschalteter Nutzer:** möchte ich einen Menüpunkt "RPA Automation" sehen, um direkt zu meinem Dashboard zu gelangen.
*   **Als Nutzer auf dem RPA-Dashboard:** möchte ich meine persönliche RPA-Umgebung mit einem Klick provisionieren können, um schnell mit der Automatisierung starten zu können.
*   **Als Nutzer auf dem RPA-Dashboard:** möchte ich eine Liste meiner erstellten Workflows sehen und verwalten können.
*   **Als Nutzer auf dem RPA-Dashboard:** möchte ich einen direkten Link haben, um den OpenRPA Editor zu öffnen, in dem ich meine Workflows visuell erstellen und bearbeiten kann.

## 5. Technische Überlegungen & Risiken

*   **Sicherheit:** Die Kommunikation mit der Docker-API muss abgesichert werden. Die RPA-Container müssen in einem isolierten Netzwerk laufen, das nur die notwendige Kommunikation mit dem OpenFlow-Orchestrator und der Hauptanwendung erlaubt.
*   **Skalierbarkeit:** Die initiale Implementierung mit Docker ist für eine begrenzte Nutzerzahl geeignet. Für ein größeres Deployment muss der Wechsel zu einer Container-Orchestrierungslösung wie Kubernetes (wie im ursprünglichen Konzept beschrieben) geplant werden.
*   **Ressourcen-Management:** Die RPA-Container sind ressourcenintensiv. Es müssen Limits für CPU und Speicher pro Container festgelegt werden, um eine Überlastung des Host-Systems zu vermeiden.
*   **Abhängigkeit:** Die Funktionalität ist stark von OpenRPA und dessen Stabilität abhängig.

## 6. Nächste Schritte

1.  Erstellung des Migrations-Skripts und Ausführung in der Entwicklungs-Datenbank.
2.  Beginn der Implementierung der Admin-Backend- und Frontend-Anpassungen (Phase 0).
3.  Parallel dazu: Aufsetzen einer Test-Umgebung für Docker und OpenRPA.