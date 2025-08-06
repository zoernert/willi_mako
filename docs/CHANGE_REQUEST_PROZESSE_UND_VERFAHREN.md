# Change Request: Prozesse und Verfahren - Deep Research Funktion

## Status: ✅ IMPLEMENTIERT mit aktiven Verbesserungen (v2.0)

**Zuletzt aktualisiert:** 6. August 2025

## 🔧 Aktuelle Verbesserungen (v2.0)

### Behobene Probleme

1. **Mermaid-Diagramm Rendering**
   - ✅ Verbesserte Fehlerbehandlung und Logging
   - ✅ Getrennte Scale-Effekte zur Vermeidung von Re-Rendering
   - ✅ Bessere TypeScript-Unterstützung für Mermaid-API
   - ✅ Erweiterte Debug-Ausgaben für Entwicklung

2. **Content-Bereinigung**
   - ✅ Entfernung von Markdown-Artefakten (`####`, `[cite: 123]`)
   - ✅ Bessere Titel-Bereinigung und Duplikat-Vermeidung
   - ✅ Intelligente Content-Filterung ohne Redundanz

3. **Markdown-Rendering**
   - ✅ Installation von `react-markdown`
   - ✅ Proper Markdown-Rendering für KI-Erklärungen
   - ✅ Formatierte Konversationshistorie

4. **UI/UX Verbesserungen**
   - ✅ Mermaid-Code Validierung vor Rendering
   - ✅ Debug-Informationen nur in Development-Modus
   - ✅ Verbesserte Error-Messages und Fallback-Inhalte
   - ✅ Erhöhte Diagramm-Höhe für bessere Sichtbarkeit

### Debugging Features

- **Development-Only Debug Panel**: Zeigt Mermaid-Code-Status und Validation
- **API Health Check**: Teste Backend-Verbindung direkt
- **Token Validation**: Überprüfe Authentifizierung-Status
- **Enhanced Logging**: Detaillierte Console-Ausgaben für Troubleshooting

### Geänderte Dateien (v2.0)

```
app-legacy/src/pages/ProcessesAndProcedures.tsx
├── + ReactMarkdown Import
├── + cleanContent() Funktion
├── + isValidMermaidCode() Validation
├── + Verbesserte Debug-Funktionen
└── + Markdown-Rendering für Explanations

app-legacy/src/components/Processes/MermaidRenderer.tsx
├── + Erweiterte Error-Behandlung
├── + Getrennte Scale-Effekte
├── + Bessere TypeScript-Unterstützung
├── + Debug-Logging
└── + Robuste Diagram-Validierung

package.json
└── + react-markdown Dependency
```

### 🎯 Nächste Optimierungen

1. **Performance-Tests** mit echten Daten
2. **Export-Funktionalität** finalisieren (PNG/SVG)
3. **Weitere UI-Optimierungen** basierend auf User-Feedback
4. **Caching-Strategien** für häufig abgerufene Diagramme

---

## Übersicht
Integration einer neuen Basisfunktion "Prozesse und Verfahren" in die Willi-Mako Anwendung, die Deep Research mit Mermaid-Diagrammen ermöglicht.

## Ziele
- Natürlichsprachige Erstellung von Prozessbeschreibungen
- Visualisierung durch Mermaid-Diagramme basierend auf Qdrant Collection
- Iterative Optimierung der Prozesse durch weitere Anfragen
- Fehlerfreie Darstellung entsprechend der Beschreibungen in der Collection

## Technische Anforderungen

### Frontend (Legacy App)
- [x] Neuer Menüpunkt "Prozesse und Verfahren" in Layout.tsx
- [ ] Neue Seite `ProcessesAndProcedures.tsx`
- [ ] Mermaid-Rendering Komponente
- [ ] Chat-ähnliche UI für iterative Prozessoptimierung
- [ ] Export-Funktionalität für Prozessdiagramme

### Backend
- [ ] Neue API Route `/api/processes`
- [ ] Service für Mermaid-Diagramm Suche und Verarbeitung
- [ ] Integration mit bestehender Qdrant Collection
- [ ] Prozessoptimierung durch LLM-Integration

### Dependencies
- [ ] Mermaid.js für Diagramm-Rendering
- [ ] html2canvas für Export-Funktionalität

## Implementierungsplan

### Phase 1: Grundstruktur ✅
- [x] Change Request Dokumentation
- [x] Menüpunkt hinzufügen
- [x] Neue Seite erstellen
- [x] Routing konfigurieren

### Phase 2: Backend Services ✅
- [x] Mermaid Service implementieren
- [x] API Endpunkte erstellen
- [x] Qdrant Integration für Diagramm-Suche

### Phase 3: Frontend Komponenten ✅
- [x] Mermaid Renderer Komponente
- [x] Process Chat Interface
- [x] Export Funktionalität (basis)

### Phase 4: Integration & Testing 🔄
- [ ] End-to-End Integration testen
- [ ] Testing der Mermaid-Suche
- [ ] UI/UX Optimierung

## Dateien die geändert werden

### Neue Dateien
- `/app-legacy/src/pages/ProcessesAndProcedures.tsx`
- `/app-legacy/src/components/Processes/`
  - `ProcessChat.tsx`
  - `MermaidRenderer.tsx`
  - `ProcessExport.tsx`
- `/src/services/processService.ts`
- `/src/routes/processes.ts`

### Geänderte Dateien
- `/app-legacy/src/App.tsx` - Neue Route
- `/app-legacy/src/components/Layout.tsx` - Neuer Menüpunkt
- `/app-legacy/package.json` - Mermaid Dependencies

## Aktueller Implementierungsstand

### ✅ Abgeschlossen
- Change Request Dokumentation erstellt
- Codebase analysiert
- Menüpunkt in Layout.tsx hinzugefügt (AccountTree Icon)
- Neue Route '/processes' zu App.tsx hinzugefügt
- ProcessesAndProcedures.tsx Seite erstellt
- ProcessService.ts Backend-Service implementiert
- API-Routen in processes.ts erstellt
- Server.ts um Process-Routes erweitert
- Mermaid.js und html2canvas Dependencies installiert
- MermaidRenderer Komponente erstellt
- Mermaid-Integration in ProcessesAndProcedures Seite

### 🔄 In Arbeit
- Testing der Backend-Services
- Frontend-Backend Integration testen

### ⏳ Geplant
- Performance-Optimierung
- Erweiterte Export-Funktionalität
- E2E Testing

## Risiken & Mitigationen

### Risiko 1: Mermaid Rendering Performance
**Mitigation:** Lazy Loading und Caching von gerenderten Diagrammen

### Risiko 2: Qdrant Integration Komplexität
**Mitigation:** Nutzung der bestehenden QdrantService Infrastruktur

### Risiko 3: User Experience bei komplexen Diagrammen
**Mitigation:** Progressive Enhancement und Zoom-Funktionalität

## Qualitätssicherung
- [ ] Unit Tests für neue Services
- [ ] Integration Tests für API Endpunkte
- [ ] E2E Tests für User Workflows
- [ ] Performance Tests für Mermaid Rendering

## Deployment
- Lokale Entwicklung: `npm run dev`
- Produktionsdeployment: `./quick-deploy.sh`

---

**Erstellt:** 2025-01-05  
**Autor:** GitHub Copilot  
**Status:** Implementierung abgeschlossen - Testing in Arbeit  
**Nächste Review:** Nach erfolgreichen Tests

## Implementierte Features

### Frontend (Legacy App)
- **Neuer Menüpunkt:** "Prozesse und Verfahren" mit AccountTree Icon
- **ProcessesAndProcedures.tsx:** Vollständige Chat-Interface für Prozesssuche
- **MermaidRenderer.tsx:** Komponente für interaktives Mermaid-Diagramm Rendering
- **Features:** Zoom, Export (PNG), Konversationsverlauf, semantische Suche

### Backend
- **ProcessService.ts:** Kompletter Service für Mermaid-Diagramm Suche
- **API Routes:** `/api/processes/search`, `/api/processes/optimize`, `/api/processes/related`
- **Qdrant Integration:** Semantische Suche nach `type: "mermaid_diagram"`
- **KI-Integration:** Gemini für Prozesserklärungen und Optimierungen

### Dependencies
- **Mermaid.js:** Für Diagramm-Rendering
- **html2canvas:** Für PNG-Export der Diagramme

## Getestete Komponenten
- ✅ Build-Prozess erfolgreich
- ✅ TypeScript Kompilierung ohne Fehler  
- ✅ API-Routen registriert
- ✅ File Watcher Problem gelöst (siehe FILE_WATCHER_SOLUTIONS.md)
- 🔄 Runtime-Testing läuft

## Entwicklungsumgebung
- **Standard:** `npm run dev` (ohne File Watching für Backend)
- **Alternative:** `npm run dev:limited` (reduziertes File Watching)
- **Einzeln:** `npm run dev:backend-no-watch` + `npm run dev:next-only`
- **Dokumentation:** `docs/FILE_WATCHER_SOLUTIONS.md`

## Nächste Schritte
1. End-to-End Testing mit echten Mermaid-Daten
2. Authentication-Problem lösen (Token-Check implementiert)
3. Performance-Optimierung für große Diagramme
4. Erweiterte Export-Optionen (SVG, PDF)
5. Kollaborative Features (Teilen, Kommentieren)

## Debugging & Troubleshooting

### Authentication-Probleme
Die Seite enthält Debug-Buttons zum Testen:
- **"API Test"** - Testet die Verbindung zur `/api/processes/health` Route
- **"Token Check"** - Überprüft, ob ein Token im localStorage vorhanden ist

### Häufige Probleme
1. **401 Unauthorized:** Benutzer ist nicht angemeldet oder Token abgelaufen
2. **404 Not Found:** API-Route ist nicht deployed oder Server läuft nicht
3. **Token fehlt:** Benutzer muss sich über `/app/login` anmelden

### Logs überprüfen
```bash
# Backend-Logs
tail -f /path/to/server.log

# Browser Console
F12 → Console → ProcessesAndProcedures Logs
```
