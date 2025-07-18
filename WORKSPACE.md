# Implementierungsplan: "Mein Workspace" - Persönliches Wissenszentrum

## Projektübersicht

**Ziel:** Erweiterung des bestehenden Stromhaltig-Systems um einen persönlichen Workspace-Bereich für Benutzer zur Verwaltung eigener Notizen und Dokumente mit KI-gestützter Kontextualisierung.

**Bestehende Infrastruktur:**
- React/TypeScript Frontend
- Node.js/Express Backend mit TypeScript
- PostgreSQL Datenbank
- Qdrant Vector Database für RAG
- Google Gemini AI Service
- Bestehende Chat- und FAQ-Funktionalität

## Phase 1: Backend-Infrastruktur (Woche 1-2)

### 1.1 Datenbank-Schema Erweiterung

**Neue Tabellen:**
```sql
-- Erweiterte user_documents Tabelle für persönliche Dokumente
CREATE TABLE user_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    original_name VARCHAR(255) NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    is_ai_context_enabled BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notizen-Tabelle für kontextbezogene Notizen
CREATE TABLE user_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500),
    content TEXT NOT NULL,
    source_type VARCHAR(50), -- 'chat', 'faq', 'document', 'manual'
    source_id UUID, -- Chat-ID, FAQ-ID, Document-ID
    source_context TEXT, -- Original text wo die Notiz erstellt wurde
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workspace-Einstellungen pro Benutzer
CREATE TABLE user_workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    ai_context_enabled BOOLEAN DEFAULT false,
    auto_tag_enabled BOOLEAN DEFAULT true,
    storage_used_mb INTEGER DEFAULT 0,
    storage_limit_mb INTEGER DEFAULT 500,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Datei:** `migrations/workspace_schema.sql`

### 1.2 Backend Services Erweiterung

**Neue Services:**

**1. Document Processing Service**
```typescript
// src/services/documentProcessor.ts
class DocumentProcessorService {
  async processUserDocument(documentId: string, userId: string): Promise<void>
  async extractTextContent(filePath: string, mimeType: string): Promise<string>
  async createDocumentChunks(documentId: string, content: string): Promise<void>
  async updateVectorDatabase(documentId: string, chunks: string[]): Promise<void>
  async deleteDocumentVectors(documentId: string): Promise<void>
}
```

**2. Notes Service**
```typescript
// src/services/notesService.ts
class NotesService {
  async createNote(userId: string, data: CreateNoteData): Promise<Note>
  async updateNote(noteId: string, userId: string, data: UpdateNoteData): Promise<Note>
  async deleteNote(noteId: string, userId: string): Promise<void>
  async getUserNotes(userId: string, filters?: NoteFilters): Promise<Note[]>
  async searchNotes(userId: string, query: string): Promise<Note[]>
  async linkNoteToSource(noteId: string, sourceType: string, sourceId: string): Promise<void>
}
```

**3. Workspace Service**
```typescript
// src/services/workspaceService.ts
class WorkspaceService {
  async getUserWorkspaceSettings(userId: string): Promise<WorkspaceSettings>
  async updateWorkspaceSettings(userId: string, settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings>
  async getStorageUsage(userId: string): Promise<StorageInfo>
  async checkStorageLimit(userId: string, additionalSize: number): Promise<boolean>
  async getWorkspaceDashboard(userId: string): Promise<WorkspaceDashboard>
}
```

### 1.3 API Endpunkte

**Neue Router-Dateien:**

**1. Workspace Router**
```typescript
// src/routes/workspace.ts
// GET /api/workspace/dashboard
// GET /api/workspace/settings  
// PUT /api/workspace/settings
// GET /api/workspace/storage
```

**2. User Documents Router**
```typescript
// src/routes/userDocuments.ts
// GET /api/workspace/documents
// POST /api/workspace/documents (upload)
// GET /api/workspace/documents/:id
// PUT /api/workspace/documents/:id
// DELETE /api/workspace/documents/:id
// POST /api/workspace/documents/:id/toggle-ai-context
// POST /api/workspace/documents/:id/reprocess
```

**3. Notes Router**
```typescript
// src/routes/notes.ts
// GET /api/workspace/notes
// POST /api/workspace/notes
// GET /api/workspace/notes/:id
// PUT /api/workspace/notes/:id
// DELETE /api/workspace/notes/:id
// GET /api/workspace/notes/search?q=...
// POST /api/notes/from-chat/:chatId/message/:messageId
// POST /api/notes/from-faq/:faqId
```

## Phase 2: Frontend-Implementierung (Woche 3-4)

### 2.1 Workspace Dashboard Komponente

**Hauptkomponente:**
```typescript
// client/src/pages/Workspace.tsx
const Workspace: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <WorkspaceHeader />
      <WorkspaceStats />
      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tab label="Meine Notizen" />
        <Tab label="Meine Dokumente" />
        <Tab label="Einstellungen" />
      </Tabs>
      <TabPanel value={activeTab} index={0}>
        <NotesManager />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <DocumentsManager />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <WorkspaceSettings />
      </TabPanel>
    </Container>
  );
};
```

### 2.2 Notizen-Management Komponenten

**1. Notes Manager**
```typescript
// client/src/components/Workspace/NotesManager.tsx
const NotesManager: React.FC = () => {
  return (
    <Box>
      <NotesToolbar />
      <NotesGrid />
      <NoteEditor />
    </Box>
  );
};
```

**2. Quick Note Button für Chat/FAQ**
```typescript
// client/src/components/Workspace/QuickNoteButton.tsx
const QuickNoteButton: React.FC<{
  sourceType: 'chat' | 'faq';
  sourceId: string;
  selectedText?: string;
}> = ({ sourceType, sourceId, selectedText }) => {
  // Floating Action Button für schnelle Notizen
};
```

### 2.3 Dokument-Management Komponenten

**1. Document Manager**
```typescript
// client/src/components/Workspace/DocumentsManager.tsx
const DocumentsManager: React.FC = () => {
  return (
    <Box>
      <DocumentUpload />
      <DocumentGrid />
      <DocumentViewer />
    </Box>
  );
};
```

**2. Document Upload mit Drag & Drop**
```typescript
// client/src/components/Workspace/DocumentUpload.tsx
const DocumentUpload: React.FC = () => {
  // Dropzone mit Progress, Preview und Metadaten-Eingabe
};
```

### 2.4 Integration in bestehende Komponenten

**Chat-Komponente erweitern:**
```typescript
// Erweitere client/src/pages/Chat.tsx
// Füge QuickNoteButton zu Chat-Messages hinzu
// Zeige Workspace-Dokumente als Kontext-Quelle an
```

**FAQ-Komponente erweitern:**
```typescript
// Erweitere client/src/pages/FAQDetail.tsx  
// Füge Note-Button zu FAQ-Einträgen hinzu
```

## Phase 3: KI-Integration und Kontextualisierung (Woche 5)

### 3.1 Enhanced Chat Service

**Erweitere bestehenden Chat Service:**
```typescript
// src/services/gemini.ts - Erweiterung
class GeminiService {
  async generateResponseWithUserContext(
    messages: ChatMessage[],
    publicContext: string,
    userDocuments: string[], // Neuer Parameter
    userNotes: string[], // Neuer Parameter
    userPreferences: any
  ): Promise<string>
  
  async generateTagsForNote(content: string): Promise<string[]>
  async generateTagsForDocument(content: string, title: string): Promise<string[]>
  async suggestRelatedContent(userId: string, query: string): Promise<any[]>
}
```

### 3.2 Enhanced Retrieval mit User Context

**Erweitere Advanced Retrieval:**
```typescript
// src/routes/chat.ts - Erweiterung
class AdvancedRetrieval {
  async getPersonalizedResults(
    query: string,
    userId: string,
    includeUserDocuments: boolean = true
  ): Promise<any[]> {
    // Kombiniert öffentliche Dokumente mit Benutzer-Dokumenten
    // Priorisiert basierend auf User-Präferenzen
  }
}
```

### 3.3 Smart Context Switching

**Context-Aware Chat:**
```typescript
// Neuer Service: src/services/contextManager.ts
class ContextManager {
  async determineOptimalContext(
    query: string,
    userId: string,
    chatHistory: ChatMessage[]
  ): Promise<{
    publicContext: string[];
    userContext: string[];
    suggestedDocuments: string[];
    relatedNotes: string[];
  }>
}
```

## Phase 4: UI/UX Verbesserungen (Woche 6)

### 4.1 Workspace-spezifische UI-Komponenten

**1. Smart Search Bar**
```typescript
// client/src/components/Workspace/SmartSearch.tsx
const SmartSearch: React.FC = () => {
  // Durchsucht Notizen, Dokumente und kann direkt Chat starten
  // Mit Auto-Vervollständigung und Kontext-Vorschlägen
};
```

**2. Context Indicators**
```typescript
// client/src/components/Workspace/ContextIndicators.tsx
const ContextIndicators: React.FC = () => {
  // Zeigt an, welche User-Dokumente im aktuellen Chat-Kontext verwendet werden
  // Toggle-Buttons für Ein/Ausschalten einzelner Dokumente
};
```

### 4.2 Responsive Design und Mobile Optimierung

**Mobile-first Workspace:**
- Swipe-Navigation zwischen Notizen/Dokumenten
- Touch-optimierte Upload-Bereiche
- Kollapsible Sidebar für bessere Platznutzung

### 4.3 Accessibility Verbesserungen

- Keyboard-Navigation für alle Workspace-Funktionen
- Screen-Reader optimierte Notiz-Listen
- ARIA-Labels für Drag&Drop-Bereiche

## Phase 5: Testing und Optimierung (Woche 7)

### 5.1 Backend Tests

**Unit Tests:**
```typescript
// tests/services/workspaceService.test.ts
// tests/services/documentProcessor.test.ts
// tests/services/notesService.test.ts
```

**Integration Tests:**
```typescript
// tests/routes/workspace.test.ts
// tests/routes/userDocuments.test.ts
// tests/routes/notes.test.ts
```

### 5.2 Frontend Tests

**Component Tests:**
```typescript
// client/src/components/Workspace/__tests__/
// NotesManager.test.tsx
// DocumentsManager.test.tsx
// WorkspaceSettings.test.tsx
```

**E2E Tests:**
```typescript
// cypress/integration/workspace.spec.ts
// - Document upload und processing
// - Notiz erstellen und verknüpfen
// - KI-Kontext aktivieren/deaktivieren
// - Chat mit User-Dokumenten
```

### 5.3 Performance Optimierung

**Backend:**
- Database Query Optimization
- Vector Search Performance Tuning
- Caching für häufig abgerufene User-Dokumente

**Frontend:**
- Lazy Loading für große Dokumentenlisten
- Virtualized Lists für viele Notizen
- Optimistic Updates für bessere UX

## Phase 6: Deployment und Monitoring (Woche 8)

### 6.1 Deployment-Vorbereitung

**Migrations:**
```bash
# deployment/migrations/
# 001_workspace_schema.sql
# 002_workspace_indexes.sql
# 003_workspace_initial_data.sql
```

**Environment Variables:**
```env
# Neue Workspace-spezifische Einstellungen
WORKSPACE_STORAGE_LIMIT_MB=500
WORKSPACE_MAX_FILE_SIZE_MB=50
WORKSPACE_ALLOWED_EXTENSIONS=pdf,doc,docx,txt,md
WORKSPACE_VECTOR_CHUNK_SIZE=1000
```

### 6.2 Monitoring und Analytics

**Neue Metriken:**
- Workspace adoption rate
- Document processing erfolgsrate
- Notizen-Nutzung pro User
- KI-Kontext-Aktivierung rate
- Storage usage trends

**Dashboard Updates:**
```typescript
// Erweitere client/src/pages/Admin.tsx
// Neue Admin-Statistiken für Workspace-Nutzung
```

## Technische Spezifikationen

### Datei-Upload Limits
- Maximale Dateigröße: 50MB
- Erlaubte Formate: PDF, DOC, DOCX, TXT, MD
- Maximaler Storage pro User: 500MB (konfigurierbar)

### Vector Database Integration
- Separate Namespaces für User-Dokumente
- Chunk-Größe: 1000 Zeichen mit 200 Zeichen Overlap
- Embedding-Model: Konsistent mit bestehendem System

### Security Considerations
- Strikte Nutzer-Isolation für Dokumente und Notizen
- Verschlüsselung sensitiver Metadaten
- Rate-Limiting für Upload-Endpunkte
- Malware-Scanning für hochgeladene Dateien

## Zeitplan Übersicht

| Phase | Zeitraum | Deliverables |
|-------|----------|--------------|
| 1 | Woche 1-2 | Backend-Infrastruktur, APIs |
| 2 | Woche 3-4 | Frontend-Komponenten, UI |
| 3 | Woche 5 | KI-Integration, Kontextualisierung |
| 4 | Woche 6 | UI/UX-Verbesserungen |
| 5 | Woche 7 | Testing, QA |
| 6 | Woche 8 | Deployment, Monitoring |

## Ressourcen-Anforderungen

### Entwicklung
- 1 Backend-Entwickler (TypeScript/Node.js)
- 1 Frontend-Entwickler (React/TypeScript)
- 0.5 DevOps Engineer (Deployment/Monitoring)
- 0.5 QA Engineer (Testing)

### Infrastruktur
- Zusätzlicher Storage für User-Dokumente
- Erhöhte Vector Database Kapazität
- Monitoring-Tools für neue Metriken

## Risiken und Mitigation

### Technische Risiken
1. **Vector Database Performance:** Monitoring und Optimization von Query-Performance
2. **Storage Costs:** Implementierung von Cleanup-Policies und Storage-Limits
3. **KI-Context Quality:** A/B Testing verschiedener Context-Strategien

### Business Risiken
1. **User Adoption:** Schrittweise Einführung mit User-Feedback
2. **Privacy Concerns:** Transparente Kommunikation über Datennutzung
3. **Compliance:** GDPR-konforme Implementierung mit Daten-Export/Löschung

## Success Metrics

### Quantitative Metriken
- User Adoption Rate (% der aktiven User die Workspace nutzen)
- Document Upload Volume
- Notizen pro aktiver User
- Chat-Qualität mit User-Context (User-Bewertungen)
- Storage Utilization

### Qualitative Metriken
- User Satisfaction Scores
- Feature Usage Patterns
- Support Ticket Reduktion
- User Retention Improvement

---

Dieser Implementierungsplan baut optimal auf der bestehenden Stromhaltig-Infrastruktur auf und erweitert sie um leistungsstarke Workspace-Funktionalität, die den Nutzern ermöglicht, ihre persönlichen Wissensdatenbanken zu erstellen und mit der KI zu nutzen.