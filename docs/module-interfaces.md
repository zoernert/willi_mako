# Module Interfaces Documentation

## Übersicht

Die neue modulare Architektur definiert klare Boundaries zwischen den verschiedenen Domänen der Anwendung. Jedes Modul folgt dem gleichen Muster: Interfaces → Repositories → Services → Public APIs.

## Modul-Struktur

```
src/modules/
├── user/
│   ├── interfaces/
│   │   ├── user.interface.ts
│   │   ├── user.repository.interface.ts
│   │   └── user.service.interface.ts
│   ├── repositories/
│   │   └── postgres-user.repository.ts
│   └── services/
│       └── user.service.ts
├── workspace/
│   ├── interfaces/
│   │   ├── workspace.interface.ts
│   │   ├── workspace.repository.interface.ts
│   │   └── workspace.service.interface.ts
│   ├── repositories/
│   └── services/
├── quiz/
│   ├── interfaces/
│   │   ├── quiz.interface.ts
│   │   ├── quiz.repository.interface.ts
│   │   └── quiz.service.interface.ts
│   ├── repositories/
│   └── services/
└── documents/
    ├── interfaces/
    │   ├── documents.interface.ts
    │   ├── documents.repository.interface.ts
    │   └── documents.service.interface.ts
    ├── repositories/
    └── services/
```

## User Module

### Entities
- **User**: Basisbenutzerinformationen und Authentifizierung
- **UserProfile**: Erweiterte Benutzerprofile mit Einstellungen

### Repository Interface (`IUserRepository`)
**Zweck**: Datenzugriff für Benutzer-Management

**Hauptoperationen**:
- `createUser()` - Benutzer erstellen
- `getUserById()` - Benutzer per ID finden
- `getUserByEmail()` - Benutzer per E-Mail finden
- `updateUser()` - Benutzerinformationen aktualisieren
- `deleteUser()` - Benutzer löschen
- `validateCredentials()` - Anmeldedaten validieren

### Service Interface (`IUserService`)
**Zweck**: Business Logic für Benutzer-Management

**Hauptoperationen**:
- `registerUser()` - Benutzerregistrierung mit Validierung
- `authenticateUser()` - Benutzeranmeldung
- `updateProfile()` - Profilaktualisierung
- `resetPassword()` - Passwort zurücksetzen
- `deactivateUser()` - Benutzer deaktivieren

## Workspace Module

### Entities
- **UserDocument**: Hochgeladene Dokumente
- **UserNote**: Benutzererstellte Notizen
- **UserWorkspaceSettings**: Workspace-Konfiguration
- **UserDocumentChunk**: Dokumenten-Segmente für AI-Verarbeitung

### Repository Interface (`IWorkspaceRepository`)
**Zweck**: Datenzugriff für Workspace-Funktionen

**Hauptoperationen**:
- **Document Operations**: `createDocument()`, `getDocumentById()`, `searchDocuments()`
- **Note Operations**: `createNote()`, `getNotesByUserId()`, `searchNotes()`
- **Settings Operations**: `getWorkspaceSettings()`, `updateWorkspaceSettings()`
- **Storage Management**: `calculateStorageUsed()`, `updateStorageUsed()`

### Service Interface (`IWorkspaceService`)
**Zweck**: Business Logic für Workspace-Management

**Hauptoperationen**:
- **Document Management**: `uploadDocument()`, `processDocument()`, `deleteDocument()`
- **AI Context**: `enableAIContext()`, `getAIContext()`
- **Note Management**: `createNote()`, `searchNotes()`
- **Storage**: `getStorageInfo()`, `checkStorageLimit()`

## Quiz Module

### Entities
- **Quiz**: Quiz-Definitionen
- **QuizQuestion**: Einzelne Fragen
- **UserQuizAttempt**: Benutzer-Quiz-Versuche
- **QuizLeaderboard**: Ranglisten

### Repository Interface (`IQuizRepository`)
**Zweck**: Datenzugriff für Quiz-System

**Hauptoperationen**:
- **Quiz CRUD**: `createQuiz()`, `getQuizWithQuestions()`, `searchQuizzes()`
- **Question Management**: `createQuestion()`, `getQuestionsByQuizId()`
- **Attempt Tracking**: `createQuizAttempt()`, `completeQuizAttempt()`
- **Leaderboards**: `getQuizLeaderboard()`, `updateLeaderboard()`

### Service Interface (`IQuizService`)
**Zweck**: Business Logic für Quiz-System

**Hauptoperationen**:
- **Quiz Management**: `createQuiz()`, `updateQuiz()`, `deleteQuiz()`
- **Quiz Taking**: `startQuizAttempt()`, `submitQuizAttempt()`
- **AI Generation**: `generateQuizFromFAQ()`, `generateQuizFromDocuments()`
- **Analytics**: `getQuizStatistics()`, `getQuizPerformanceAnalysis()`

## Documents Module

### Entities
- **FAQ**: Häufig gestellte Fragen
- **ChatSession**: Chat-Sitzungen
- **ChatMessage**: Einzelne Chat-Nachrichten
- **DocumentProcessingJob**: Verarbeitungsjobs

### Repository Interface (`IDocumentsRepository`)
**Zweck**: Datenzugriff für Dokumenten-Management

**Hauptoperationen**:
- **FAQ Operations**: `createFAQ()`, `searchFAQs()`, `updateFAQHelpfulness()`
- **Chat Operations**: `createChatSession()`, `createChatMessage()`
- **Processing**: `createProcessingJob()`, `updateProcessingJob()`
- **Search**: `searchContent()`

### Service Interface (`IDocumentsService`)
**Zweck**: Business Logic für Dokumenten-Management

**Hauptoperationen**:
- **FAQ Management**: `createFAQ()`, `generateFAQFromChat()`
- **Chat**: `sendMessage()`, `generateAIResponse()`
- **Context Management**: `enableContextForSession()`, `getRelevantContext()`
- **Analytics**: `getFAQAnalytics()`, `getChatAnalytics()`

## Inter-Modul-Kommunikation

### Dependency Injection Pattern
```typescript
// Service-Container für Module
class ServiceContainer {
  private services: Map<string, any> = new Map();
  
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }
  
  get<T>(name: string): T {
    return this.services.get(name);
  }
}
```

### Event-Driven Communication
```typescript
// Module können Events für Seiteneffekte senden
userService.on('user-created', async (user) => {
  await workspaceService.initializeUserWorkspace(user.id);
  await quizService.createDefaultQuizzes(user.id);
});
```

## Public Module APIs

Jedes Modul exponiert eine einheitliche Public API:

```typescript
// Module-Export-Pattern
export class UserModule {
  constructor(
    private repository: IUserRepository,
    private service: IUserService
  ) {}
  
  // Public API
  getService(): IUserService {
    return this.service;
  }
  
  getRepository(): IUserRepository {
    return this.repository;
  }
}
```

## Vorteile der modularen Architektur

1. **Separation of Concerns**: Jedes Modul verantwortet eine klar abgegrenzte Domäne
2. **Testbarkeit**: Module können isoliert getestet werden
3. **Skalierbarkeit**: Module können unabhängig entwickelt und deployed werden
4. **Wiederverwendbarkeit**: Repositories und Services können in verschiedenen Kontexten genutzt werden
5. **Maintainability**: Änderungen sind lokalisiert und haben minimale Seiteneffekte

## Naming Conventions

- **Interfaces**: `I{Name}Repository`, `I{Name}Service`
- **Implementations**: `{Database}{Name}Repository`, `{Name}Service`
- **Types**: `{Entity}`, `{Entity}CreateRequest`, `{Entity}UpdateRequest`
- **Modules**: `{Domain}Module`

## Nächste Schritte

1. Repository-Implementierungen für alle Module erstellen
2. Service-Implementierungen mit Business Logic
3. Module-Container und Dependency Injection einrichten
4. Tests für alle Module-Interfaces
5. Migration bestehender Routes auf neue Module
