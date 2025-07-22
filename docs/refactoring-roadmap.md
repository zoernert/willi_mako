# Refactoring-Roadmap

## Überblick

**Ziel**: Schrittweise Migration der bestehenden Codebase zur neuen Architektur mit minimalen Risiken und kontinuierlicher Funktionalität.

**Strategie**: Strangler Fig Pattern - Neue Architektur parallel aufbauen und schrittweise die alte ersetzen.

## Phase 1: Foundation (Woche 1-2) - NIEDRIG RISIKO

### 1.1 Core-Infrastructure Setup

#### Woche 1.1: Basis-Utilities erstellen
```
Aufgaben:
├── core/utils/Logger.ts                 # Logging-System
├── core/utils/Validator.ts              # Validation-Utilities  
├── core/utils/DatabaseHelper.ts         # DB-Query-Helper
├── core/config/Environment.ts           # Zentralisierte Config
└── core/types/Common.ts                 # Shared Types

Risiko: NIEDRIG - Nur neue Dateien, keine bestehenden Änderungen
Rollback: Einfache Datei-Löschung
Tests: Unit-Tests für alle Utilities
```

#### Woche 1.2: Interface-Definitionen
```
Aufgaben:
├── core/interfaces/IRepository.ts       # Repository-Pattern
├── core/interfaces/IService.ts          # Service-Pattern
├── infrastructure/interfaces/           # External Service Interfaces
│   ├── IAIService.ts
│   ├── IVectorService.ts
│   └── IFileStorage.ts
└── domain/interfaces/                   # Domain Interfaces

Risiko: NIEDRIG - Reine Interface-Definitionen
Rollback: Interface-Dateien entfernen
Tests: TypeScript-Compilation-Tests
```

### 1.2 Dependency Injection Setup

#### Woche 1.3: DI-Container Implementation
```
Aufgaben:
├── core/di/Container.ts                 # DI-Container
├── core/di/ServiceRegistry.ts           # Service-Registration
└── core/di/Decorators.ts                # Dependency-Injection-Decorators

Risiko: NIEDRIG - Parallel zur bestehenden Struktur
Rollback: DI-System nicht verwenden
Tests: DI-Container-Unit-Tests
```

#### Woche 1.4: Error-Handling Standardisierung
```
Aufgaben:
├── core/errors/AppError.ts              # Error-Hierarchie
├── core/errors/ValidationError.ts       # Spezifische Errors
├── core/errors/BusinessLogicError.ts    # Business-Logic-Errors
└── core/middleware/ErrorHandler.ts      # Global Error Handler

Risiko: NIEDRIG - Parallel zu bestehendem Error-Handling
Rollback: Alte Error-Handler behalten
Tests: Error-Handling-Integration-Tests
```

## Phase 2: Service Layer Refactoring (Woche 3-4) - MITTEL RISIKO

### 2.1 Repository Pattern Implementation

#### Woche 2.1: Base Repository
```
Aufgaben:
├── infrastructure/database/BaseRepository.ts    # Abstract Repository
├── infrastructure/database/PostgresRepository.ts # Postgres Implementation
└── Migration: Existing Services → Repository Pattern

Betroffene Services:
├── src/services/userProfile.ts → domain/user/repositories/
├── src/services/workspaceService.ts → domain/workspace/repositories/
└── src/services/quizService.ts → domain/quiz/repositories/

Risiko: MITTEL - Datenbank-Zugriff-Pattern ändern
Rollback: Alte Services parallel lassen, schrittweise migrieren
Tests: Repository-Integration-Tests mit echter DB
```

#### Woche 2.2: Domain Services Extraktion
```
Aufgaben:
├── domain/user/services/UserDomainService.ts
├── domain/workspace/services/WorkspaceDomainService.ts
├── domain/quiz/services/QuizDomainService.ts
└── Business Logic aus Routes → Domain Services

Risiko: MITTEL - Business Logic verschieben
Rollback: Logik zurück in Routes/Services
Tests: Domain-Service-Unit-Tests
```

### 2.2 Infrastructure Services Refactoring

#### Woche 2.3: AI-Service-Abstraktion
```
Aufgaben:
├── infrastructure/ai/GeminiService.ts → IGeminiService Implementation
├── infrastructure/ai/AIServiceFactory.ts
└── Alle Gemini-Aufrufe → Interface-basiert

Betroffene Dateien:
├── src/services/gemini.ts
├── src/services/quizService.ts (Gemini-Calls)
├── src/services/contextManager.ts (Gemini-Calls)
└── src/services/notesService.ts (Gemini-Calls)

Risiko: MITTEL - AI-Integration ändern
Rollback: Direkte Gemini-Calls wiederherstellen
Tests: AI-Service-Integration-Tests mit Mocks
```

#### Woche 2.4: Vector-Database-Abstraktion
```
Aufgaben:
├── infrastructure/vector/QdrantService.ts → IVectorService
├── infrastructure/vector/VectorServiceFactory.ts
└── Qdrant-Aufrufe → Interface-basiert

Betroffene Dateien:
├── src/services/qdrant.ts
├── src/services/documentProcessor.ts (Qdrant-Integration)
└── src/services/flip-mode.ts (Qdrant-Calls)

Risiko: MITTEL - Vector-Database-Zugriff ändern
Rollback: Direkte Qdrant-Calls
Tests: Vector-Service-Integration-Tests
```

## Phase 3: Application Layer (Woche 5-6) - MITTEL RISIKO

### 3.1 Use Case Implementation

#### Woche 3.1: User Use Cases
```
Aufgaben:
├── application/user/commands/CreateUserCommand.ts
├── application/user/commands/UpdateUserCommand.ts
├── application/user/queries/GetUserQuery.ts
├── application/user/handlers/UserCommandHandler.ts
└── application/user/handlers/UserQueryHandler.ts

Migration von:
├── src/routes/auth.ts → User Commands/Queries
└── src/routes/user.ts → User Commands/Queries

Risiko: MITTEL - Route-Logic in Use Cases verschieben
Rollback: Routes mit direkten Service-Calls
Tests: Use-Case-Unit-Tests + Integration-Tests
```

#### Woche 3.2: Workspace Use Cases
```
Aufgaben:
├── application/workspace/commands/ (Document, Note Commands)
├── application/workspace/queries/ (Search, Context Queries)
└── application/workspace/handlers/

Migration von:
├── src/routes/workspace.ts
├── src/routes/documents.ts
└── src/routes/notes.ts

Risiko: MITTEL - Komplexe Workspace-Logic migrieren
Rollback: Alte Routes parallel betreiben
Tests: Workspace-Use-Case-Tests
```

### 3.2 CQRS Pattern Implementation

#### Woche 3.3: Command/Query Separation
```
Aufgaben:
├── core/cqrs/Command.ts                 # Command Base Class
├── core/cqrs/Query.ts                   # Query Base Class
├── core/cqrs/CommandBus.ts              # Command Bus
├── core/cqrs/QueryBus.ts                # Query Bus
└── Integration in bestehende Use Cases

Risiko: MITTEL - Neue Architektur-Pattern einführen
Rollback: Direkte Service-Calls statt CQRS
Tests: CQRS-Pattern-Tests
```

#### Woche 3.4: Event System
```
Aufgaben:
├── core/events/DomainEvent.ts           # Event Base Class
├── core/events/EventBus.ts              # Event Bus Implementation
├── domain/user/events/UserCreatedEvent.ts
├── domain/workspace/events/DocumentUploadedEvent.ts
└── Event Handlers für Notifications, Analytics

Risiko: NIEDRIG - Zusätzliches Event-System
Rollback: Event-System deaktivieren
Tests: Event-System-Integration-Tests
```

## Phase 4: Presentation Layer (Woche 7-8) - HOCH RISIKO

### 4.1 Route Refactoring

#### Woche 4.1: Controller-Abstraktion
```
Aufgaben:
├── presentation/http/controllers/UserController.ts
├── presentation/http/controllers/WorkspaceController.ts
├── presentation/http/controllers/QuizController.ts
└── Route-Migration von src/routes/ → Controllers

Betroffene Dateien (HOCH RISIKO):
├── src/routes/auth.ts
├── src/routes/user.ts
├── src/routes/workspace.ts
├── src/routes/documents.ts
├── src/routes/notes.ts
├── src/routes/quiz.ts
├── src/routes/chat.ts
├── src/routes/admin.ts
└── src/routes/faq.ts

Risiko: HOCH - Alle API-Endpoints betroffen
Rollback: Alte Routes reaktivieren
Tests: API-Integration-Tests für alle Endpoints
```

#### Woche 4.2: Middleware-Standardisierung
```
Aufgaben:
├── presentation/http/middleware/AuthenticationMiddleware.ts
├── presentation/http/middleware/AuthorizationMiddleware.ts
├── presentation/http/middleware/ValidationMiddleware.ts
├── presentation/http/middleware/ErrorHandlingMiddleware.ts
└── Middleware-Migration

Migration von:
├── src/middleware/auth.ts
└── src/middleware/errorHandler.ts

Risiko: HOCH - Authentication/Authorization betroffen
Rollback: Alte Middleware verwenden
Tests: Middleware-Integration-Tests
```

### 4.2 Validation & Serialization

#### Woche 4.3: Input-Validation
```
Aufgaben:
├── presentation/http/validators/UserValidator.ts
├── presentation/http/validators/WorkspaceValidator.ts
├── presentation/http/validators/QuizValidator.ts
└── Validation-Middleware-Integration

Risiko: MITTEL - Input-Validation standardisieren
Rollback: Manuelle Validation in Routes
Tests: Validation-Unit-Tests + E2E-Tests
```

#### Woche 4.4: Response-Serialization
```
Aufgaben:
├── presentation/http/serializers/UserSerializer.ts
├── presentation/http/serializers/WorkspaceSerializer.ts
├── presentation/http/serializers/QuizSerializer.ts
└── Konsistente API-Response-Formate

Risiko: NIEDRIG - Response-Format-Verbesserung
Rollback: Bestehende Response-Formate
Tests: API-Response-Format-Tests
```

## Phase 5: Frontend-Refactoring (Woche 9-10) - MITTEL RISIKO - IN PROGRESS ✅

### 5.1 State Management Refactoring

#### Woche 5.1: API-Service-Standardisierung - COMPLETED ✅
```
Aufgaben:
├── ✅ shared/services/api/apiClient.ts     # Standardisierter HTTP-Client
├── ✅ shared/services/api/userService.ts   # User-spezifische API-Calls
├── ✅ shared/services/api/quizService.ts   # Quiz-spezifische API-Calls
├── ✅ shared/services/api/documentsApi.ts  # Documents API-Service
├── ✅ shared/services/api/workspaceApi.ts  # Workspace API-Service
├── ✅ shared/services/api/notesApi.ts      # Notes API-Service
└── ✅ Migration aller wichtiger Components → API-Services

Betroffene Dateien (MIGRATION COMPLETED):
├── ✅ client/src/components/AdminQuizManager.tsx
├── ✅ client/src/components/IntelligentQuizCreator.tsx  
├── ✅ client/src/components/Quiz/QuizDashboard.tsx
├── ✅ client/src/components/Quiz/QuizPlayer.tsx
├── ✅ client/src/pages/Profile.tsx
├── ✅ client/src/components/Workspace/DocumentPreview.tsx
├── ✅ client/src/components/Workspace/NotesManager.tsx
├── ✅ client/src/components/Workspace/WorkspaceSettings.tsx
├── ✅ client/src/components/Workspace/DocumentUpload.tsx
├── ✅ client/src/components/Workspace/TextSelectionMenu.tsx
├── ✅ client/src/components/Workspace/QuickNoteButton.tsx
├── ✅ client/src/components/Workspace/GlobalSearch.tsx
├── ✅ client/src/components/Workspace/SmartSearch.tsx
└── ✅ client/src/components/Workspace/DocumentsManager.tsx

Status: ✅ COMPLETED - Alle wichtigen Komponenten auf neue API-Services migriert
Build Status: ✅ SUCCESSFUL - Frontend baut erfolgreich
Type Safety: ✅ IMPROVED - Typen konsolidiert und erweitert
Rollback: Direkte fetch-Calls komplett ersetzt durch standardisierte API-Services
Tests: Frontend-Build erfolgreich, bereit für weitere Tests
```

#### Backend API Enhancement - COMPLETED ✅
```
Aufgaben:
├── ✅ Enhanced quiz.routes.ts with missing endpoints (suggestions, stats, generation)
├── ✅ Extended QuizController with new methods
├── ✅ Enhanced QuizService with user stats, suggestions, quiz generation
├── ✅ Fixed type compatibility between frontend and backend
├── ✅ Created comprehensive workspace types
└── ✅ Resolved backend compilation errors

Status: Backend API now supports all frontend requirements
Nächster Schritt: Complete frontend build fixes and remaining migrations
```

### 5.2 Component Architecture - PENDING

#### Woche 5.3: Feature-basierte Organisation - PENDING
```
Aufgaben:
├── features/auth/components/           # Auth-Components
├── features/workspace/components/      # Workspace-Components  
├── features/quiz/components/           # Quiz-Components
├── features/chat/components/           # Chat-Components
└── Component-Migration nach Features

Migration von:
├── client/src/components/ → features/*/components/
├── client/src/pages/ → features/*/pages/

Risiko: MITTEL - Große Datei-Reorganisation
Rollback: Alte Struktur parallel
Tests: Component-Tests nach Migration
```
