# Quick Start: Message Analyzer Enhanced

## Lokales Entwicklungs-Setup

### 1. Dependencies installieren

```bash
# Root-Projekt (Backend)
npm install

# Legacy App (Frontend)
cd app-legacy
npm install
```

### 2. Entwicklungsserver starten

```bash
# Terminal 1: Backend
npm run dev:backend-only
# → läuft auf Port 3009

# Terminal 2: Frontend (Legacy App)
cd app-legacy
npm start
# → läuft auf Port 3002
```

### 3. Zugriff

```
Frontend: http://localhost:3002/message-analyzer
Backend API: http://localhost:3009/api/message-analyzer
```

## API-Endpunkte testen

### Mit curl

```bash
# 1. Login und Token holen
TOKEN=$(curl -X POST http://localhost:3009/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  | jq -r '.token')

# 2. Initiale Analyse
curl -X POST http://localhost:3009/api/message-analyzer/ai-explanation \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }'

# 3. Chat-Anfrage
curl -X POST http://localhost:3009/api/message-analyzer/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "Welcher Nachrichtentyp ist das?",
    "chatHistory": [],
    "currentEdifactMessage": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }'

# 4. Modifikation
curl -X POST http://localhost:3009/api/message-analyzer/modify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "instruction": "Ändere die Nachrichtennummer auf 9999999999",
    "currentMessage": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }'

# 5. Validierung
curl -X POST http://localhost:3009/api/message-analyzer/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "message": "UNH+00000000001111+MSCONS:D:11A:UN:2.6e\nBGM+E01+1234567890+9\nUNT+3+00000000001111"
  }'
```

## Testdaten

### MSCONS-Beispiel (komplett)

```edifact
UNH+00000000001111+MSCONS:D:11A:UN:2.6e
BGM+E01+1234567890+9
DTM+137:20251107:102
NAD+MS+++9900123456789::293
NAD+MR+++9900987654321::293
IDE+24+DE0001234567890123456789012345
LOC+172+DE0001234567890123456789012345::Z25
LIN+1++DE0001234567890123456789012345::Z25
QTY+220:1234.567:KWH
DTM+163:202511010000:303
DTM+164:202511010015:303
LIN+2++DE0001234567890123456789012345::Z25
QTY+220:1345.678:KWH
DTM+163:202511010015:303
DTM+164:202511010030:303
UNT+14+00000000001111
```

### UTILMD-Beispiel

```edifact
UNH+123456+UTILMD:D:11A:UN:5.2c
BGM+E03+REF123+9
DTM+137:20251107:102
NAD+MS+++9900123456789::293
NAD+MR+++9900987654321::293
IDE+24+DE0001234567890123456789012345
LOC+172+DE0001234567890123456789012345::Z25
DTM+92:20251201:102
STS+7++E01
UNT+9+123456
```

## Frontend-Komponenten

### Wichtige State-Variablen

```typescript
// Nachricht & Versionen
currentMessage: string
messageHistory: MessageVersion[]
currentVersionIndex: number

// Chat
chatHistory: ChatMessage[]
chatInput: string

// UI-State
loading: boolean
chatLoading: boolean
showDiff: boolean
validation: ValidationResult | null
```

### Event-Handler

```typescript
handleInitialAnalysis()    // Startet erste Analyse
handleChatSend()           // Sendet Chat-Nachricht
handleUndo()               // Geht eine Version zurück
handleRedo()               // Geht eine Version vor
handleCopyToClipboard()    // Kopiert aktuelle Nachricht
```

## Debugging

### Backend-Logs aktivieren

```bash
# In src/routes/message-analyzer.ts
console.log('🔍 Chat request:', { message, chatHistory, currentEdifactMessage });

# In src/modules/message-analyzer/services/message-analyzer.service.ts
console.log('✅ Validation result:', validation);
```

### Frontend-Logs

```typescript
// In MessageAnalyzerEnhanced.tsx
console.log('Chat history updated:', chatHistory);
console.log('Message version changed:', messageHistory[currentVersionIndex]);
```

### Browser DevTools

1. Network Tab → Filter: `message-analyzer`
2. Console → Suche nach Fehlern
3. React DevTools → Inspect State/Props

## Häufige Probleme

### 1. "Property 'validate' does not exist"
→ TypeScript-Cache löschen: `rm -rf node_modules/.cache`

### 2. Chat-Response ist leer
→ LLM-Service prüfen: `src/services/llmProvider.ts`
→ Gemini API-Key in `.env` prüfen

### 3. Diff wird nicht angezeigt
→ `showDiff` State prüfen
→ `diff` Package installiert? `npm ls diff`

### 4. Validierung schlägt fehl
→ EDIFACT-Format prüfen (Trennzeichen, Segmente)
→ Backend-Logs: `validateEdifactMessage` Ausgabe

## Code-Struktur

```
willi_mako/
├── src/
│   ├── routes/
│   │   └── message-analyzer.ts          # API-Routen
│   └── modules/message-analyzer/
│       ├── interfaces/
│       │   └── message-analyzer.interface.ts
│       └── services/
│           └── message-analyzer.service.ts  # Kern-Logik
│
├── app-legacy/
│   └── src/
│       ├── pages/
│       │   ├── MessageAnalyzer.tsx          # Alt (Classic)
│       │   └── MessageAnalyzerEnhanced.tsx  # Neu (Enhanced)
│       ├── services/
│       │   └── messageAnalyzerApi.ts        # API-Client
│       └── types/
│           └── diff.d.ts                    # Type Declarations
│
└── docs/
    ├── MESSAGE_ANALYZER_ENHANCED.md         # Feature-Doku
    └── MESSAGE_ANALYZER_IMPLEMENTATION.md   # Tech-Doku
```

## Testing-Workflow

1. **Unit-Tests** (TODO):
   ```bash
   npm test -- message-analyzer
   ```

2. **Integration-Tests**:
   ```bash
   ./test-message-analyzer-enhanced.sh
   ```

3. **Manuelles Testing**:
   - MSCONS einfügen → Analyse prüfen
   - Chat-Frage stellen
   - Modifikation durchführen
   - Undo/Redo testen
   - Validierung prüfen

## Deployment

### Production Build

```bash
# Backend kompilieren
npm run build:backend

# Frontend kompilieren
cd app-legacy
npm run build

# Build nach public/app kopieren
cd ..
npm run move:legacy

# Next.js Build
npm run build:next
```

### Deployment-Check

```bash
# Type-Check
npm run type-check

# Build Next.js
npm run build:next
```

## Erweiterungen

### Neuen Chat-Befehl hinzufügen

1. Backend: `/api/message-analyzer/chat` erweitern
2. Prompt anpassen für neue Funktionalität
3. Frontend: UI-Feedback hinzufügen

### Neue Validierungsregel

1. `validateEdifactMessage()` in `message-analyzer.service.ts` erweitern
2. Neue Fehler/Warnung zur Rückgabe hinzufügen
3. Frontend: Neue Alert-Komponente für spezifische Regel

### Export-Format hinzufügen

1. Neue Methode in `messageAnalyzerApi.ts`
2. Backend-Endpunkt für Export erstellen
3. UI-Button in Enhanced-Komponente

## Ressourcen

- **EDIFACT-Specs**: `/docs/edifact/`
- **Willi-Mako MCP**: MCP-Tool-Documentation
- **Material-UI**: https://mui.com/
- **React Hooks**: https://react.dev/reference/react

---

**Happy Coding!** 🚀
