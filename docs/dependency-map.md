# Funktionale Abhängigkeiten-Mapping

## Backend-Abhängigkeitsanalyse

### Core-Layer (Niedrigste Abhängigkeiten)

#### 1. Config Layer
```
config/
├── database.ts          # KEINE internen Abhängigkeiten
│   ├── Uses: pg, dotenv
│   └── Exports: pool, initDatabase
```

#### 2. Types Layer
```
types/
├── quiz.ts             # KEINE Abhängigkeiten (reine Typen)
└── workspace.ts        # KEINE Abhängigkeiten (reine Typen)
```

#### 3. Middleware Layer
```
middleware/
├── errorHandler.ts     # KEINE internen Abhängigkeiten
│   ├── Uses: express
│   └── Exports: CustomError, errorHandler, AppError, asyncHandler
│
└── auth.ts            # 1 interne Abhängigkeit
    ├── Uses: express, jsonwebtoken
    ├── Imports: AppError from './errorHandler'
    └── Exports: AuthenticatedRequest, authenticateToken, requireAdmin, requireUser
```

### Service Layer (Mittlere Abhängigkeiten)

#### 1. Base Services (nur Config-Abhängigkeiten)
```
services/
├── gemini.ts           # CORE SERVICE - nur externe Dependencies
│   ├── Uses: @google/generative-ai, dotenv
│   └── Exports: GeminiService (default)
│
├── qdrant.ts          # CORE SERVICE - nur externe Dependencies
│   ├── Uses: axios, dotenv
│   └── Exports: QdrantPoint, SearchResult, QdrantService
│
└── userProfile.ts     # 2 interne Abhängigkeiten
    ├── Imports: pool from '../config/database'
    ├── Imports: geminiService from './gemini'
    └── Exports: UserProfile, UserProfileService
```

#### 2. Complex Services (mehrere interne Abhängigkeiten)
```
services/
├── gamification.ts    # 1 interne Abhängigkeit
│   ├── Uses: pg
│   ├── Imports: types from '../types/quiz'
│   └── Exports: GamificationService
│
├── quizService.ts     # 3 interne Abhängigkeiten
│   ├── Uses: pg
│   ├── Imports: types from '../types/quiz'
│   ├── Imports: GeminiService from './gemini'
│   ├── Imports: GamificationService from './gamification'
│   └── Exports: QuizService
│
├── documentProcessor.ts # 3 interne Abhängigkeiten
│   ├── Uses: fs, path, crypto, pdf-parse
│   ├── Imports: pool from '../config/database'
│   ├── Imports: QdrantService from './qdrant'
│   ├── Imports: types from '../types/workspace'
│   └── Exports: DocumentProcessorService
│
├── notesService.ts    # 2 interne Abhängigkeiten
│   ├── Imports: pool from '../config/database'
│   ├── Imports: types from '../types/workspace'
│   ├── Imports: GeminiService from './gemini'
│   └── Exports: NotesService
│
├── workspaceService.ts # 3 interne Abhängigkeiten
│   ├── Imports: pool from '../config/database'
│   ├── Imports: types from '../types/workspace'
│   ├── Imports: NotesService from './notesService'
│   ├── Imports: DocumentProcessorService from './documentProcessor'
│   └── Exports: WorkspaceService
│
├── contextManager.ts  # 4 interne Abhängigkeiten ⚠️ HIGHEST
│   ├── Imports: pool from '../config/database'
│   ├── Imports: WorkspaceService from './workspaceService'
│   ├── Imports: NotesService from './notesService'
│   ├── Imports: geminiService from './gemini'
│   └── Exports: UserContext, ContextDecision, ContextManager
│
└── flip-mode.ts       # 2 interne Abhängigkeiten
    ├── Imports: geminiService from './gemini'
    ├── Imports: QdrantService from './qdrant'
    └── Exports: FlipModeService
```

### Route Layer (Höchste Abhängigkeiten)

```
routes/
├── auth.ts            # Middleware + Database
├── admin.ts           # Middleware + Services
├── chat.ts            # Middleware + Gemini + Qdrant
├── documents.ts       # Middleware + DocumentProcessor + Qdrant
├── faq.ts             # Middleware + Database + Gemini
├── notes.ts           # Middleware + NotesService
├── quiz.ts            # Middleware + QuizService + Gamification
├── user.ts            # Middleware + UserProfile
└── workspace.ts       # Middleware + WorkspaceService + ContextManager
```

### Application Layer
```
├── init.ts            # initDatabase + QdrantService
└── server.ts          # Express + alle Routes + Middleware
```

## Frontend-Abhängigkeitsanalyse

### Core Layer (Niedrigste Abhängigkeiten)

#### 1. Utility & Hooks
```
hooks/
└── useTextSelection.ts # KEINE internen Abhängigkeiten
```

#### 2. Contexts (Shared State)
```
contexts/
├── SnackbarContext.tsx # KEINE internen Abhängigkeiten
└── AuthContext.tsx     # HTTP-Client (axios)
```

### Component Layer

#### 1. Basic Components
```
components/
├── ProtectedRoute.tsx     # 1 interne Abhängigkeit
│   └── Uses: AuthContext
│
├── MarkdownRenderer.tsx   # KEINE internen Abhängigkeiten
│   └── Uses: react-markdown, remark-gfm, @mui/material
│
└── FlipModeDemo.tsx      # KEINE internen Abhängigkeiten
    └── Uses: @mui/material
```

#### 2. Layout Components
```
components/
└── Layout.tsx            # 1 interne Abhängigkeit
    └── Uses: AuthContext
```

#### 3. Feature Components
```
components/
├── AdminQuizManager.tsx       # 1 interne Abhängigkeit
│   └── Uses: IntelligentQuizCreator
│
├── IntelligentQuizCreator.tsx # KEINE internen Abhängigkeiten
├── ClarificationUI.tsx        # KEINE internen Abhängigkeiten
│
└── Quiz/
    ├── QuizDashboard.tsx     # KEINE internen Abhängigkeiten
    └── QuizPlayer.tsx        # KEINE internen Abhängigkeiten
```

#### 4. Workspace Components (Höchste Abhängigkeiten)
```
components/Workspace/
├── TextSelectionMenu.tsx  # 1 interne Abhängigkeit
│   └── Uses: SnackbarContext
│
├── QuickNoteButton.tsx    # 1 interne Abhängigkeit
│   └── Uses: SnackbarContext
│
├── ContextIndicator.tsx   # KEINE internen Abhängigkeiten
├── DocumentPreview.tsx    # KEINE internen Abhängigkeiten
├── DocumentUpload.tsx     # KEINE internen Abhängigkeiten
├── DocumentsManager.tsx   # KEINE internen Abhängigkeiten
├── GlobalSearch.tsx       # KEINE internen Abhängigkeiten
├── NotesManager.tsx       # KEINE internen Abhängigkeiten
├── SmartSearch.tsx        # KEINE internen Abhängigkeiten
└── WorkspaceSettings.tsx  # KEINE internen Abhängigkeiten
```

### Page Layer (Höchste Abhängigkeiten)
```
pages/
├── Login.tsx       # AuthContext
├── Register.tsx    # AuthContext
├── Profile.tsx     # AuthContext
├── Admin.tsx       # AuthContext + AdminQuizManager
├── Chat.tsx        # AuthContext + Layout
├── Dashboard.tsx   # AuthContext + verschiedene Komponenten
├── Documents.tsx   # AuthContext + DocumentsManager
├── FAQDetail.tsx   # AuthContext
├── FAQList.tsx     # AuthContext
└── Workspace.tsx   # AuthContext + alle Workspace-Komponenten
```

## Kritische Abhängigkeits-Probleme

### 1. Zirkuläre Abhängigkeiten
**Status**: ✅ Keine gefunden
- Alle Abhängigkeiten folgen klarer Hierarchie

### 2. Tight Coupling (Hohe Kopplung)

#### Backend - Problematische Kopplungen:
1. **ContextManager** (4 interne Abhängigkeiten)
   - Abhängig von: WorkspaceService, NotesService, geminiService, database
   - **Problem**: Zentrale Komponente mit zu vielen Abhängigkeiten
   - **Lösung**: Interface-basierte Entkopplung

2. **WorkspaceService** (3 interne Abhängigkeiten)
   - Abhängig von: NotesService, DocumentProcessorService, database
   - **Problem**: Service-zu-Service Kopplung
   - **Lösung**: Dependency Injection Pattern

3. **QuizService** (3 interne Abhängigkeiten)
   - Abhängig von: GeminiService, GamificationService, types
   - **Problem**: Quiz-Logic zu stark gekoppelt
   - **Lösung**: Strategy Pattern für AI-Services

#### Frontend - Problematische Kopplungen:
1. **AuthContext überall verwendet**
   - **Problem**: Schwer testbar, tight coupling
   - **Lösung**: Auth-Provider mit kleineren Contexts

2. **Workspace.tsx** - Mega-Component
   - **Problem**: Wahrscheinlich zu viele Abhängigkeiten
   - **Lösung**: Component-Composition

### 3. Dependency Injection Fehlt

#### Backend-Services:
```typescript
// Aktuell: Direkte Imports (tight coupling)
import geminiService from './gemini';
import { NotesService } from './notesService';

// Besser: Dependency Injection
class ContextManager {
  constructor(
    private gemini: IGeminiService,
    private notes: INotesService,
    private workspace: IWorkspaceService
  ) {}
}
```

## Architektur-Verbesserungsvorschläge

### 1. Backend: Service-Layer Refactoring
```
Neue Struktur:
├── interfaces/        # Service-Interfaces
├── services/
│   ├── core/         # Base-Services (Gemini, Qdrant, Database)
│   ├── domain/       # Domain-Services (Quiz, Workspace, Notes)
│   └── orchestration/ # High-level Services (ContextManager)
├── di/               # Dependency Injection Container
└── factories/        # Service-Factories
```

### 2. Frontend: Context-Refactoring
```
Neue Struktur:
├── contexts/
│   ├── AuthContext.tsx      # Nur Auth-State
│   ├── AppStateContext.tsx  # App-weiter State
│   └── FeatureContexts/     # Feature-spezifische Contexts
├── providers/
│   └── AppProvider.tsx      # Combined Provider
└── hooks/
    ├── useAuth.ts          # Auth-spezifisch
    ├── useAppState.ts      # App-State
    └── useFeature.ts       # Feature-spezifisch
```

### 3. Modularisierung

#### Backend-Module:
```
modules/
├── auth/             # Authentifizierung (in sich geschlossen)
├── workspace/        # Workspace-Features
├── quiz/            # Quiz-System
├── chat/            # Chat-Funktionalität
└── shared/          # Geteilte Services
```

#### Frontend-Module:
```
modules/
├── auth/            # Auth-Components & Logic
├── workspace/       # Workspace-Features
├── quiz/           # Quiz-Components
└── shared/         # Shared-Components
```

## Risikobewertung

### Hohe Risiken:
1. **ContextManager Refactoring** - Zentrale Komponente
2. **WorkspaceService Dependencies** - Viele abhängige Components
3. **AuthContext überall** - Breaking Change bei Änderungen

### Mittlere Risiken:
1. **Service-Interface-Einführung** - Schrittweise möglich
2. **QuizService Entkopplung** - Isoliert testbar
3. **Component-Splitting** - Inkrementell machbar

### Niedrige Risiken:
1. **Utility-Functions-Extraktion** - Keine Abhängigkeiten
2. **Type-Definitions-Reorganisation** - Reine Refactorings
3. **Middleware-Optimierung** - Gut gekapselt

## Nächste Schritte

### 1. Sofort (Niedrig-Risiko):
- Interface-Definitionen für Services erstellen
- Utility-Functions in shared/utils extrahieren
- Type-Definitions konsolidieren

### 2. Kurzfristig (Mittel-Risiko):
- Dependency Injection für neue Services implementieren
- Context-Splitting in Frontend beginnen
- Service-Layer Tests ausbauen

### 3. Langfristig (Hoch-Risiko):
- ContextManager refactoring mit Interfaces
- Workspace-Module vollständig entkoppeln
- Frontend-Module-Struktur implementieren
