# Change Request: Prozesse und Verfahren - Deep Research Funktion

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
- 🔄 Runtime-Testing läuft

## Nächste Schritte
1. End-to-End Testing mit echten Mermaid-Daten
2. Performance-Optimierung für große Diagramme
3. Erweiterte Export-Optionen (SVG, PDF)
4. Kollaborative Features (Teilen, Kommentieren)
