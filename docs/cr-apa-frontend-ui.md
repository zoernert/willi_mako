# Change Request: APA Frontend UI & User Experience

- **CR-ID:** CR-APA-003
- **Datum:** 2025-07-23
- **Autor:** Gemini AI Assistant
- **Status:** Vorgeschlagen

## 1. Zusammenfassung

Dieses Dokument beschreibt die Konzeption und den Implementierungsplan für alle neuen Frontend-Komponenten und User-Flows, die für das **Assisted Process Automation (APA) System** erforderlich sind. Ziel ist es, eine intuitive und geführte Benutzererfahrung zu schaffen, die es Anwendern ermöglicht, Automatisierungen vollumfänglich zu erstellen, zu trainieren, zu verwalten und auszuführen.

## 2. Hintergrund

Eine leistungsstarke Backend-Logik für die Automatisierung ist nur so gut wie die Benutzeroberfläche, die sie zugänglich macht. Der Benutzer muss nahtlos durch den gesamten Lebenszyklus einer Automatisierung geführt werden. Dies beginnt bei der Überprüfung und Installation der Browser-Erweiterung und reicht bis zur Erstellung und Verwaltung komplexer, lernender Prozess-Flows.

### 2.1. Bestehende Frontend-Architektur

#### 2.1.1. Workspace-Tab-System
Die Anwendung nutzt bereits ein **Tab-basiertes Navigation-System** in `Workspace.tsx`:
- **Bestehende Tabs:** Meine Notizen, Meine Dokumente, Einstellungen
- **Tab-Navigation:** Material-UI Tabs mit Icons und Accessibility-Support
- **Mobile-Support:** Responsive Design mit `scrollable` Tabs für mobile Geräte
- **TabPanel-Pattern:** Wiederverwendbare `TabPanel`-Komponente für Content-Bereiche

#### 2.1.2. Bestehende UI-Komponenten-Struktur
Modulare Komponenten in `client/src/components/Workspace/`:
- **DocumentsManager.tsx:** Vollständige Dokumentenverwaltung mit Upload/Preview
- **NotesManager.tsx:** Notizen-Verwaltung mit CRUD-Operationen
- **WorkspaceSettings.tsx:** Benutzereinstellungen und Preferences
- **GlobalSearch.tsx:** Workspace-weite Suchfunktion
- **Material-UI Design System:** Konsistente UI mit Theme-Support

#### 2.1.3. Bestehende API-Integration
- **Zentralisierter apiClient.ts:** Axios-basierte HTTP-Kommunikation mit standardisierten Response-Handling
- **Service-Pattern:** Modulare API-Services für verschiedene Bereiche
- **JWT-Authentication:** Automatische Token-Verwaltung und -Erneuerung
- **Error Handling:** Zentralisierte Fehlerbehandlung mit Snackbar-Notifications

#### 2.1.4. Bestehende User Experience Patterns
- **Guided Workflows:** Schritt-für-Schritt-Anleitungen in bestehenden Features
- **Context-sensitive Actions:** Kontextmenüs (z.B. Rechtsklick auf Dokumente)
- **Real-time Status Updates:** Live-Updates für Verarbeitungsstatus
- **Mobile-first Design:** Touch-friendly Interface mit Gesten-Unterstützung

## 3. Detaillierte UI/UX-Spezifikation

### 3.1. Überprüfung und Installation der Browser-Erweiterung

Die Anwendung muss sicherstellen, dass der Benutzer die korrekte Version der APA-Browser-Erweiterung installiert hat.

- **Komponente:** `ExtensionOnboarding.tsx`
- **Funktionsweise:**
  1.  Die React-Anwendung sucht beim Start nach einem spezifischen DOM-Element, das von der Erweiterung injiziert wird (z.B. `<div id="mako-willi-apa-agent" data-version="1.1.0"></div>`).
  2.  Wenn das Element nicht gefunden wird oder die `data-version` nicht mit der vom Backend geforderten Mindestversion übereinstimmt, wird eine nicht-invasive, aber klar sichtbare Banner-Komponente am oberen Rand der Seite oder im "Automatisierungen"-Tab angezeigt.
- **UI-Elemente des Banners:**
  - **Text:** "Für die Prozessautomatisierung wird der Mako Willi APA Agent benötigt. Bitte installieren Sie die Erweiterung oder aktualisieren Sie auf die neueste Version."
  - **Button/Link:** "Chrome-Erweiterung installieren" (verlinkt auf den Chrome Web Store).
  - **Statusanzeige:** "Status: Nicht installiert" oder "Status: Veraltet (Version 1.0.0 gefunden, 1.1.0 benötigt)".

### 3.2. Hauptansicht: Der "Automatisierungen"-Tab

**Integration in bestehende Tab-Struktur:**
- **Position:** Vierter Tab zwischen "Meine Dokumente" und "Einstellungen"
- **Tab-Konfiguration in `Workspace.tsx`:**
  ```typescript
  <Tab
    label="Automatisierungen"
    icon={<AutoAwesome />}  // oder <PrecisionManufacturing />
    iconPosition="start"
    id="workspace-tab-3"
    aria-controls="workspace-tabpanel-3"
    aria-label="Navigate to process automations"
  />
  ```
- **TabPanel-Integration:**
  ```typescript
  <TabPanel value={activeTab} index={3}>
    <AutomationStudio onStatsUpdate={fetchWorkspaceStats} />
  </TabPanel>
  ```

- **Integration:** Ein neuer Tab mit dem Titel "Automatisierungen" und einem passenden Icon (z.B. ein Roboter- oder Flow-Chart-Icon) wird in `client/src/pages/Workspace.tsx` hinzugefügt.
- **Hauptkomponente:** `AutomationStudio.tsx`
- **Layout:** Ein zweispaltiges Layout (folgt dem Pattern von `DocumentsManager.tsx`).
  - **Linke Spalte:** `AutomationList.tsx` - Eine Liste aller Automatisierungen.
  - **Rechte Spalte:** `AutomationDetail.tsx` - Der Detailbereich für die ausgewählte Automatisierung.

**Responsive Design-Pattern:**
- **Desktop:** Zwei-Spalten-Layout mit fixer Sidebar
- **Mobile:** Stack-Layout mit Navigation zwischen Liste und Detail
- **Touch-Navigation:** Swipe-Gesten für Tab-Wechsel (nutzt bestehende Touch-Handler)

### 3.3. User Flow: Erstellung einer neuen Automatisierung

1.  **Start:** Der Benutzer klickt auf den Button "+ Neue Automatisierung" in der `AutomationList`.
2.  **Modal (`CreateAutomationModal.tsx`):**
    - Ein einfaches Modal erscheint und fragt nach:
      - `Name der Automatisierung` (z.B. "APERAK Z20 Fehlerbehebung")
      - `Beschreibung` (optional)
3.  **Anleitungsansicht (im `AutomationDetail.tsx`):**
    - Nach dem Erstellen wird eine geführte Anleitung angezeigt.
    - **Titel:** "Aufzeichnung starten"
    - **Schritt-für-Schritt-Anleitung:**
      1.  "Öffnen Sie die Anwendung (z.B. Schleupen), in der Sie den Prozess aufzeichnen möchten, in einem neuen Browser-Tab."
      2.  "Klicken Sie auf das Mako Willi Icon in Ihrer Browser-Symbolleiste."
      3.  "Wählen Sie **'Aufzeichnung starten'**."
      4.  "Führen Sie nun alle Schritte des Prozesses manuell durch."
      5.  "Wenn Sie fertig sind, klicken Sie im Erweiterungs-Popup auf **'Aufzeichnung beenden'**."
    - **Visueller Status:** Eine animierte Grafik oder ein Text "Warte auf Aufzeichnung von der Erweiterung..." wird angezeigt.

### 3.4. User Flow: Verwaltung einer Automatisierung

Der `AutomationDetail.tsx`-Bereich passt seine Anzeige dynamisch an den Status der Automatisierung an.

-   **Wenn Status = `DRAFT` oder `IN_TRAINING`:**
    - **Titel:** "Trainingsmodus"
    - **Statusanzeige:** "Status: Wird trainiert (Confidence: 40%)"
    - **Fortschrittsbalken:** "Trainingsläufe: 2 von 5 empfohlenen Läufen abgeschlossen."
    - **Aktion:** Ein Button **"Neue Trainingssitzung starten"**. Ein Klick darauf sendet ein Signal an die Erweiterung, den geführten Assistenzmodus zu beginnen.
    - **Prozess-Visualisierung:** Eine schreibgeschützte Ansicht des `process_graph` (z.B. als Liste oder einfaches Flussdiagramm), damit der Benutzer die erkannten Schritte nachvollziehen kann.

-   **Wenn Status = `CONFIDENT` oder `AUTONOMOUS`:**
    - **Titel:** "Automatisierung bereit"
    - **Statusanzeige:** "Status: Einsatzbereit (Confidence: 98%)"
    - **Aktion:** Ein primärer Button **"Automatisierung ausführen"**.
    - **Kontext-Eingabefelder:** Falls der Prozess Variablen benötigt (z.B. eine Rechnungs-ID), werden hier dynamisch Eingabefelder gerendert.
    - **Lauf-Historie (`AutomationRunHistory.tsx`):** Eine Tabelle oder Liste der letzten Ausführungen mit Status (Erfolgreich, Fehlgeschlagen), Datum und Dauer.

### 3.5. Integration mit anderen Modulen

**Integration mit DocumentsManager.tsx:**
- **Bestehende Struktur:** `DocumentsManager.tsx` nutzt bereits Kontextmenüs (Material-UI Menu-Component)
- **Erweiterung des Kontextmenüs:**
  ```typescript
  // Ergänzung in DocumentsManager.tsx
  const contextMenuItems = [
    // ...bestehende Items...
    {
      label: "Automatisierung anwenden...",
      icon: <AutoAwesome />,
      onClick: () => handleApplyAutomation(document.id)
    }
  ];
  ```
- **Modal-Integration:** Nutzt bestehende Modal-Pattern (Material-UI Dialog)
- **API-Integration:** Erweitert bestehende `documentsApi.ts` um Automation-Context

**Integration mit GlobalSearch.tsx:**
- **Suchbereich-Erweiterung:** Automatisierungen werden in bestehende Workspace-Suche integriert
- **Search-Filter:** Neuer Filter-Type "Automatisierungen" in der Suchleiste
- **Quick-Actions:** Direkte Ausführung von Automatisierungen aus Suchergebnissen

**Workspace Stats Integration:**
- **Statistik-Erweiterung:** Neue Metriken in `fetchWorkspaceStats()`:
  - Anzahl Automatisierungen
  - Ausführungsstatistiken
  - Erfolgsrate
- **Dashboard-Integration:** Neue Cards für Automation-Metriken im Workspace-Dashboard

## 4. Neue Frontend-Komponenten

Folgende neue React-Komponenten werden in `client/src/components/Automation/` erstellt:

**Komponenten-Architektur (folgt bestehenden Patterns):**

### 4.1. Hauptkomponenten
-   **`AutomationStudio.tsx`**: Die Hauptcontainer-Komponente für den Tab.
    - **Pattern:** Folgt `WorkspaceSettings.tsx` als Container-Component
    - **Props:** `onStatsUpdate: () => void` für Workspace-Stats-Refresh
    - **State Management:** Local State mit useState/useEffect
    - **Layout:** Material-UI Grid-System für responsive Zwei-Spalten-Layout

-   **`AutomationList.tsx`**: Die linke Spalte mit der Liste der Flows.
    - **Pattern:** Ähnlich `DocumentsManager.tsx` List-View
    - **Material-UI:** List, ListItem, ListItemText, ListItemIcon
    - **Features:** Sortierung, Filterung, Suche
    - **Actions:** Create-Button, Context-Menu pro Item

-   **`AutomationDetail.tsx`**: Die rechte Spalte, die den Zustand des ausgewählten Flows anzeigt.
    - **Pattern:** Detail-Panel ähnlich `DocumentPreview.tsx`
    - **Dynamic Content:** Rendert verschiedene Views basierend auf Automation-Status
    - **Material-UI:** Card, CardContent, Stepper für Workflow-Anzeige

### 4.2. Spezialisierte Komponenten
-   **`ExtensionOnboarding.tsx`**: Der Banner zur Überprüfung der Erweiterung.
    - **Pattern:** Alert/Banner-Component (Material-UI Alert)
    - **Position:** Persistent am oberen Rand oder als In-Tab-Banner
    - **Detection Logic:** DOM-Element-Suche nach Extension-Marker

-   **`CreateAutomationModal.tsx`**: Das Modal zur Erstellung eines neuen Flows.
    - **Pattern:** Folgt bestehenden Dialog-Patterns mit Material-UI Dialog
    - **Form-Handling:** Formik oder React Hook Form für Validation
    - **Integration:** Direkte API-Calls mit Error-Handling

-   **`ProcessVisualizer.tsx`**: Eine Komponente zur Anzeige des Prozessgraphen.
    - **Library:** `react-flow-renderer` oder `reactflow`
    - **Features:** Read-only Graph-Visualization
    - **Integration:** Rendert `process_graph` JSONB-Daten als visueller Flow

-   **`AutomationRunHistory.tsx`**: Zeigt die Historie der Ausführungen an.
    - **Pattern:** Ähnlich bestehenden Table-Components
    - **Material-UI:** DataGrid oder Table mit Pagination
    - **Features:** Sortierung, Filterung nach Status/Datum

### 4.3. API-Service Integration
**Neuer Service: `client/src/services/automationApi.ts`**
- **Base-Class:** Erweitert/nutzt bestehenden `apiClient.ts`
- **Methods:** CRUD-Operationen + Execution-Management
- **Error Handling:** Konsistent mit bestehenden API-Services
- **Type Safety:** TypeScript-Interfaces für alle API-Responses

## 5. Auswirkungen

- **UI/UX:** Fügt einen neuen, wesentlichen Bereich zur Anwendung hinzu. Die Komplexität der Benutzeroberfläche steigt, wird aber durch eine stark geführte User Journey beherrschbar gemacht.
  - **Tab-Erweiterung:** Vierter Tab in bestehender Navigation
  - **Konsistenz:** Folgt etablierten Design-Patterns und Material-UI Theme
  - **Mobile Compatibility:** Responsive Design mit bestehenden Breakpoint-System
- **Abhängigkeiten:** Benötigt eine Bibliothek zur Visualisierung von Graphen (z.B. `react-flow-renderer`).
  - **Package-Addition:** `npm install reactflow` oder alternative Graph-Library
  - **Bundle-Size Impact:** Zusätzliche ~100-200KB für Graph-Visualization
- **API-Nutzung:** Nutzt intensiv den neuen `automationApi.ts` Service.
  - **Network Load:** Neue API-Endpoints für Automation-Management
  - **Real-time Updates:** Potentielle WebSocket-Integration für Live-Status-Updates
- **Performance-Überlegungen:**
  - **Component Lazy-Loading:** Tab-Content wird nur bei Bedarf geladen
  - **Graph-Rendering:** Virtualization für große Process-Graphs
  - **Memory Management:** Proper Cleanup von Graph-Visualizations

**Technische Integration:**
- **State Management:** Lokaler State mit potentieller Zustand-Synchronisation
- **Accessibility:** ARIA-Labels und Keyboard-Navigation für alle neuen Komponenten
- **Testing:** Unit Tests für alle neuen Komponenten mit bestehender Jest/Testing-Library-Setup
- **Documentation:** Storybook-Stories für alle neuen UI-Komponenten

## 6. Rollback-Plan

- Das Git-Commit mit den neuen Frontend-Komponenten wird zurückgesetzt.
- Da die Änderungen modular in einem neuen Verzeichnis (`/components/Automation`) und einem neuen Tab gekapselt sind, ist das Risiko für bestehende Funktionalität gering. Ein Rollback ist durch das Entfernen der Integration in `Workspace.tsx` einfach zu bewerkstelligen.

**Detaillierter Rollback-Plan:**

### 6.1. Schnelles Rollback (Feature-Toggle)
- **Tab-Visibility:** Bedingtes Rendern des Automation-Tabs basierend auf Feature-Flag
- **Code-Isolation:** Alle neuen Komponenten sind in separatem `/Automation`-Verzeichnis
- **Minimal Impact:** Nur 3-4 Zeilen Änderung in `Workspace.tsx` für vollständige Deaktivierung

### 6.2. Vollständiges Rollback
1. **Git-Revert:** Rückgängigmachen aller Commits für Frontend-Changes
2. **Dependency-Cleanup:** 
   ```bash
   npm uninstall reactflow  # oder andere neue Graph-Libraries
   npm audit fix  # Cleanup von package-lock.json
   ```
3. **File-Cleanup:** Löschen des gesamten `client/src/components/Automation/`-Verzeichnisses
4. **Service-Cleanup:** Entfernen von `client/src/services/automationApi.ts`
5. **Type-Cleanup:** Entfernen von `client/src/types/automation.types.ts`

### 6.3. Graduelle Deaktivierung
- **Progressive Deactivation:** Schrittweise Deaktivierung einzelner Features
- **User Communication:** In-App-Notifications über temporäre Deaktivierung
- **Fallback-UI:** Placeholder-Tab mit "Coming Soon"-Nachricht

**Rollback-Zeit:** < 30 Minuten für vollständiges Rollback durch modulare Architektur
