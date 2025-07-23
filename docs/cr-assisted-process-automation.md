# Change Request: Assisted Process Automation (APA) System

- **CR-ID:** CR-APA-001
- **Datum:** 2025-07-23
- **Autor:** Gemini AI Assistant
- **Status:** Vorgeschlagen

## 1. Zusammenfassung

Dieses Dokument beschreibt die notwendigen Änderungen an der Mako Willi Backend- und Frontend-Anwendung, um das **Assisted Process Automation (APA) System** zu implementieren. Ziel ist es, eine zentrale Plattform zu schaffen, auf der Automatisierungsprozesse definiert, verwaltet und mit dem Wissens-Hub der Anwendung verknüpft werden können.

## 2. Hintergrund

Um eine intelligente und flexible Prozessautomatisierung zu ermöglichen, die sich an kundenspezifische Zielsysteme anpasst, muss das Backend als "Gehirn" (Orchestrator) und Wissens-Hub fungieren. Das Frontend dient als "Kontrollzentrum", in dem Benutzer diese Automatisierungen erstellen, verwalten und überwachen. Dieses CR legt die Grundlage für die Kommunikation mit dem externen Browser-Agenten (Extension).

### 2.1. Bestehende Implementierung

#### 2.1.1. Bestehende Architektur
Die Anwendung nutzt eine moderne **Layered Architecture** mit:
- **Backend:** Node.js mit Express, TypeScript, PostgreSQL
- **Frontend:** React mit TypeScript, Material-UI
- **Authentifizierung:** JWT-basiert über `authenticateToken` Middleware
- **Datenbank:** PostgreSQL mit UUID als Primary Keys und gen_random_uuid()
- **API-Pattern:** RESTful APIs unter `/api` mit standardisiertem `apiClient.ts`

#### 2.1.2. Bestehende Module-Struktur
Das Projekt folgt einer **modularen Architektur** unter `src/modules/`:
```
src/modules/
├── documents/          # Dokumentenmanagement
│   ├── interfaces/
│   ├── repositories/
│   └── services/
├── quiz/              # Quiz-System (Referenz-Implementierung)
│   ├── quiz.service.ts
│   ├── repositories/
│   └── interfaces/
├── user/              # Benutzerverwaltung
└── workspace/         # Workspace-Funktionalität
```

#### 2.1.3. Bestehende Datenbank-Tabellen (Referenz)
Vorhandene Migrations in `migrations/`:
- `workspace_schema.sql`: Enthält `user_documents`, `user_notes`, `user_workspace_settings`
- Verwendung von **UUID Primary Keys** mit `gen_random_uuid()`
- **JSONB-Felder** für flexible Metadaten (z.B. `metadata JSONB DEFAULT '{}'`)
- **Foreign Key Constraints** mit `ON DELETE CASCADE`
- **Indexing-Pattern** für Performance

#### 2.1.4. Bestehende Route-Struktur
Routes sind in `src/routes/` organisiert:
- `documents.ts`: Vollständige Dokumentenverwaltung mit Multer-Upload
- `workspace.ts`: Workspace-Einstellungen und -Verwaltung
- **Authentifizierung:** Alle geschützten Routes verwenden `authenticateToken` Middleware
- **Error Handling:** Zentralisiert über `errorHandler` Middleware

#### 2.1.5. Frontend-Integration
- **Tab-basierte Navigation** in `Workspace.tsx` (Material-UI Tabs)
- **Bestehende Tabs:** Meine Notizen, Meine Dokumente, Einstellungen
- **API-Integration:** Zentralisierter `apiClient.ts` mit Axios
- **Komponenten-Struktur:** `client/src/components/Workspace/` für modulare UI-Komponenten

## 3. Vorgeschlagene Änderungen

### 3.1. Datenbank-Schema (SQL Migrations)

Es werden neue Tabellen in der PostgreSQL-Datenbank benötigt. Eine neue Migrationsdatei wird in `./migrations/` erstellt.

**Migration-File:** `assisted_process_automation_schema.sql` (folgt bestehender Naming-Convention)

**Orientierung an bestehenden Patterns:**
- **UUID Primary Keys:** Verwendung von `gen_random_uuid()` wie in `user_documents`
- **Foreign Key Constraints:** Mit `ON DELETE CASCADE` für Datenintegrität
- **JSONB für flexible Daten:** Ähnlich wie `metadata JSONB DEFAULT '{}'` in `user_documents`
- **Timestamp-Pattern:** `created_at`/`updated_at` mit `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- **ENUM-Types:** PostgreSQL ENUM für bessere Datenintegrität

- **`automations`**: Speichert die Definition eines Prozesses.
  - `id` (UUID, PK)
  - `name` (TEXT, NOT NULL)
  - `description` (TEXT)
  - `trigger_type` (ENUM: 'MANUAL', 'ON_URL', 'ON_TEXT_FOUND')
  - `trigger_details` (JSONB) - z.B. `{ "url_pattern": "/invoice/*", "text": "Fehler Z20" }`
  - `process_graph` (JSONB, NOT NULL) - Speichert die Knoten und Kanten des Prozessablaufs.
  - `created_by_user_id` (UUID, FK zu `users`)
  - `shared_with_org` (BOOLEAN, default: false)
  - `created_at` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)
  - `updated_at` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

- **`automation_elements`**: Der semantische Speicher für UI-Elemente.
  - `id` (UUID, PK)
  - `automation_id` (UUID, FK zu `automations`)
  - `name` (TEXT, NOT NULL) - z.B. "Rechnungsnummer-Eingabefeld"
  - `description` (TEXT)
  - `attributes` (JSONB) - z.B. `{ "label": "Rechnungs-Nr.", "tagName": "INPUT" }`
  - `created_at` (TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP)

- **`automation_runs`**: Verfolgt den Zustand jeder einzelnen Automatisierungsausführung.
  - `id` (UUID, PK)
  - `automation_id` (UUID, FK zu `automations`)
  - `user_id` (UUID, FK zu `users`)
  - `status` (ENUM: 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED')
  - `current_step_id` (TEXT) - ID des aktuellen Knotens im `process_graph`.
  - `context_data` (JSONB) - Laufzeitdaten, z.B. extrahierte Rechnungsnummer.
  - `created_at` / `updated_at` (TIMESTAMPTZ)

**Indexing-Strategy (basierend auf bestehenden Patterns):**
```sql
CREATE INDEX idx_automations_user_id ON automations(created_by_user_id);
CREATE INDEX idx_automation_runs_status ON automation_runs(status);
CREATE INDEX idx_automation_runs_user_automation ON automation_runs(user_id, automation_id);
```

### 3.2. Backend-Architektur (`./src`)

Ein neues Modul `automation` wird erstellt, das der Struktur von Modulen wie `./src/modules/quiz/` folgt.

**Orientierung an bestehender Architektur:**
- **Module-Pattern:** Folgt der bestehenden Struktur von `src/modules/quiz/` und `src/modules/documents/`
- **Service-Repository-Pattern:** Trennung von Business Logic (Services) und Datenzugriff (Repositories)
- **Route-Integration:** Neue Routes in `src/routes/automation.ts` nach dem Pattern von `documents.ts`
- **Middleware-Integration:** Verwendung der bestehenden `authenticateToken` Middleware
- **Error Handling:** Integration mit dem zentralen `errorHandler` Middleware

- **Neues Modul: `./src/modules/automation/`**
  - **Struktur folgt Quiz-Modul:**
    ```
    src/modules/automation/
    ├── interfaces/
    │   ├── automation.interface.ts
    │   ├── automation-run.interface.ts
    │   └── process-step.interface.ts
    ├── repositories/
    │   ├── automation.repository.ts
    │   └── automation-run.repository.ts
    ├── services/
    │   ├── automation.service.ts
    │   ├── orchestration.service.ts
    │   └── process-graph.service.ts
    └── automation.types.ts
    ```
  
  - **`src/routes/automation.ts`**: Definiert die neuen API-Endpunkte unter `/api/v2/automations`.
    - **Pattern:** Folgt `documents.ts` mit Express Router und Middleware-Integration
    - **Authentifizierung:** Alle Routes mit `authenticateToken` geschützt
    - **Endpoints:**
      - `POST /`: Neue Automatisierung erstellen (Teaching).
      - `GET /`: Alle verfügbaren Automatisierungen auflisten.
      - `POST /:id/start`: Einen neuen `automation_run` starten.
      - `GET /runs/:runId/next-step`: Für die Extension, um die nächste Anweisung abzurufen.
      - `POST /runs/:runId/update`: Für die Extension, um Daten oder Status zu senden.
  
  - **`automation.service.ts`**: Enthält die Kernlogik.
    - **Integration:** Nutzt bestehende Services (`gemini.ts`, `workspaceService.ts`)
    - **Database Access:** Über Repository-Pattern wie in Quiz-Modul
    - **Methods:**
      - `createAutomation(...)`: Speichert einen neuen Prozessgraphen.
      - `start(...)`: Erstellt einen `automation_run` und liefert den ersten Schritt.
      - `getNextStep(...)`: Implementiert die Orchestrierungslogik basierend auf dem `process_graph`.
      - `updateRunContext(...)`: Aktualisiert die Laufzeitdaten.
      - `findTriggeredAutomations(...)`: Sucht nach passenden Automatisierungen basierend auf URL/Text.
  
  - **Server-Integration:** Route wird in `server.ts` registriert (wie bestehende Routes):
    ```typescript
    import automationRoutes from './routes/automation';
    app.use('/api/v2/automations', automationRoutes);
    ```
  
### 3.3. Frontend-Architektur (`./client/src`)

**Orientierung an bestehender Frontend-Architektur:**
- **API-Service-Pattern:** Folgt `apiClient.ts` für konsistente HTTP-Kommunikation
- **Component-Structure:** Modulare Komponenten in `components/` nach Workspace-Pattern
- **Tab-Integration:** Erweiterung der bestehenden Tab-Navigation in `Workspace.tsx`
- **Material-UI Design System:** Konsistente UI mit bestehenden Komponenten

- **Neuer API-Service: `client/src/services/automationApi.ts`**
  - **Pattern:** Folgt bestehenden Service-Files mit ApiClient-Integration
  - **Base-Structure:**
    ```typescript
    import { apiClient } from './apiClient';
    import { Automation, AutomationRun } from '../types/automation.types';
    
    export class AutomationApi {
      async getAutomations(): Promise<Automation[]> {
        return apiClient.get<Automation[]>('/v2/automations');
      }
      
      async startAutomation(id: string, context: any): Promise<AutomationRun> {
        return apiClient.post<AutomationRun>(`/v2/automations/${id}/start`, context);
      }
      // ... weitere Methods
    }
    ```
  - **Integration:** Nutzt den bestehenden `apiClient.ts` mit Axios-Instance
  - **Error Handling:** Konsistent mit bestehenden API-Services

- **Neue UI-Komponenten: `client/src/components/Automation/`**
  - **Structure-Pattern:** Folgt `components/Workspace/` für modulare Organisation
  - **Komponenten-Liste:**
    ```
    components/Automation/
    ├── AutomationStudio.tsx      # Hauptkomponente (wie WorkspaceSettings.tsx)
    ├── AutomationList.tsx        # Liste (ähnlich DocumentsManager.tsx)
    ├── AutomationDetail.tsx      # Detailansicht
    ├── ProcessVisualizer.tsx     # Graph-Visualisierung
    ├── CreateAutomationModal.tsx # Modal (Material-UI Dialog)
    ├── AutomationRunHistory.tsx  # Tabelle mit MUI DataGrid
    └── ExtensionOnboarding.tsx   # Banner-Komponente
    ```
  
- **Tab-Integration in `Workspace.tsx`:**
  - **Erweiterung:** Neuer Tab "Automatisierungen" zwischen "Dokumente" und "Einstellungen"
  - **Icon:** Roboter/Flow-Chart Icon (Material-UI)
  - **Pattern:** Folgt bestehender TabPanel-Struktur
  - **Integration-Code:**
    ```typescript
    // Neuer Tab in bestehender Tab-Liste
    <Tab
      label="Automatisierungen"
      icon={<AutoAwesome />}
      iconPosition="start"
      id="workspace-tab-3"
      aria-controls="workspace-tabpanel-3"
    />
    
    // Neues TabPanel
    <TabPanel value={activeTab} index={3}>
      <AutomationStudio onStatsUpdate={fetchWorkspaceStats} />
    </TabPanel>
    ```
### 3.4. Detaillierte API- und Kommunikationsspezifikation

Die Kommunikation zwischen Backend und Browser-Erweiterung erfolgt über die unter 3.2 definierten REST-Endpunkte. Hier ist eine detaillierte Spezifikation der Payloads.

#### **Extension -> Backend**

1.  **Aufzeichnung einer neuen Anleitung**
    - **Endpunkt:** `POST /api/v2/automations/create-from-log`
    - **Payload:**
      ```json
      {
        "name": "Bearbeitung APERAK Z20",
        "rawActions": [
          { "type": "navigate", "url": "https://schleupen.example.com/processes" },
          { "type": "input", "value": "APERAK-12345", "element": { "tagName": "INPUT", "id": "search-field" } },
          { "type": "click", "element": { "tagName": "BUTTON", "text": "Suchen" } }
        ]
      }
      ```

2.  **Update eines Automatisierungslaufs (während Training & Ausführung)**
    - **Endpunkt:** `POST /api/v2/automations/runs/:runId/update`
    - **Payload-Varianten:**
      - **Schritt erfolgreich ausgeführt (konform):**
        ```json
        { "eventType": "STEP_COMPLETED", "stepId": "node-2", "status": "SUCCESS" }
        ```
      - **Abweichung erkannt:**
        ```json
        {
          "eventType": "DEVIATION_DETECTED",
          "stepId": "node-3",
          "deviation": {
            "type": "click",
            "element": { "tagName": "BUTTON", "text": "Erweiterte Suche" }
          }
        }
        ```
      - **Abweichung vom Benutzer bestätigt:**
        ```json
        { "eventType": "DEVIATION_CONFIRMED", "stepId": "node-3" }
        ```
      - **Benutzer hat Kontrolle übernommen:**
        ```json
        { "eventType": "USER_TOOK_CONTROL", "stepId": "node-4" }
        ```

3.  **Trigger gefunden**
    - **Endpunkt:** `POST /api/v2/automations/find-by-trigger`
    - **Payload:**
      ```json
      {
        "triggerType": "ON_TEXT_FOUND",
        "details": {
          "url": "https://schleupen.example.com/processes/APERAK-12345",
          "text": "Fehler Z20"
        }
      }
      ```

#### **Backend -> Extension**

1.  **Antwort auf `GET /runs/:runId/next-step`**
    - **Payload-Varianten:**
      - **Anleitung für Trainingsmodus:**
        ```json
        {
          "runId": "run-abc",
          "stepId": "node-2",
          "mode": "GUIDANCE",
          "action": "CLICK",
          "element": { "name": "Suchen Button", "attributes": { "tagName": "BUTTON", "text": "Suchen" } },
          "guidanceText": "Bitte klicken Sie auf den 'Suchen'-Button, um fortzufahren."
        }
        ```
      - **Anweisung für Automatikmodus:**
        ```json
        {
          "runId": "run-xyz",
          "stepId": "node-5",
          "mode": "EXECUTION",
          "action": "FILL_INPUT",
          "element": { "name": "Referenzfeld", "attributes": { "tagName": "INPUT", "id": "ref-123" } },
          "value": "Korrektur-Ref-456"
        }
        ```
      - **Prozess abgeschlossen:**
        ```json
        {
          "runId": "run-abc",
          "mode": "COMPLETED",
          "message": "Prozess erfolgreich abgeschlossen!"
        }
        ```


## 4. Auswirkungen

- **Datenbank:** Erfordert eine Migration, um die neuen Tabellen hinzuzufügen.
  - **Migration-File:** `assisted_process_automation_schema.sql` in `migrations/`
  - **Rollback-Migration:** `rollback_assisted_process_automation_schema.sql`
- **API:** Neue Endpunkte werden hinzugefügt. Bestehende Endpunkte sind nicht betroffen.
  - **Neue Route:** `/api/v2/automations` in `server.ts` registrieren
  - **Middleware:** Bestehende `authenticateToken` wird wiederverwendet
- **Sicherheit:** Die neuen API-Endpunkte müssen durch die bestehende `authenticateToken`-Middleware geschützt werden.
  - **JWT-Pattern:** Nutzt bestehende JWT-Implementierung
  - **User-Context:** Zugriff auf `req.user` durch bestehende Auth-Middleware
- **Benutzeroberfläche:** Eine neue, komplexe Sektion wird hinzugefügt.
  - **Tab-Erweiterung:** Vierter Tab in `Workspace.tsx`
  - **Component-Integration:** Neue `Automation/` Komponenten-Familie
  - **Dependencies:** Neue Graph-Visualisierungs-Bibliothek (z.B. `react-flow-renderer`)

**Technische Abhängigkeiten:**
- **Neue NPM-Packages:**
  - Frontend: `react-flow-renderer` oder `reactflow` für Process-Graph-Visualisierung
  - Backend: Keine neuen Dependencies erforderlich (nutzt bestehende Postgres/Express/JWT-Stack)
- **Environment Variables:** Keine neuen Umgebungsvariablen erforderlich
- **Database Permissions:** Nutzt bestehende PostgreSQL-Verbindung und -Berechtigungen
- **Frontend-Bibliotheken:** Möglicherweise Aktualisierungen für Material-UI oder andere UI-Bibliotheken erforderlich
