# Neue System-Architektur

## Überblick

**Ziel**: Modular aufgebaute, erweiterbare und wartbare Architektur basierend auf bewährten Design-Patterns und klaren Schichten-Trennung.

## Architektur-Prinzipien

### 1. Separation of Concerns
- Klare Trennung zwischen Business Logic, Datenaccess und Presentation
- Jede Schicht hat eine klar definierte Verantwortlichkeit
- Minimale Abhängigkeiten zwischen Schichten

### 2. Dependency Inversion
- High-level Module hängen nicht von Low-level Modulen ab
- Beide hängen von Abstraktionen ab
- Interfaces definieren Contracts zwischen Schichten

### 3. Single Responsibility
- Jedes Modul hat genau eine Verantwortlichkeit
- Klassen und Funktionen haben einen klaren, einzelnen Zweck
- Einfache Testbarkeit und Wartung

### 4. Open/Closed Principle
- Offen für Erweiterungen, geschlossen für Modifikationen
- Neue Features durch Plugins/Extensions
- Bestehender Code bleibt unverändert

## Backend-Architektur

### Neue Schichten-Struktur

```
src/
├── core/                    # Core-Infrastruktur (niedrigste Schicht)
│   ├── config/             # Konfiguration und Environment
│   ├── database/           # Database-Abstraktion und Migrations
│   ├── interfaces/         # Core-Interfaces und Contracts
│   ├── utils/              # Shared Utilities
│   └── types/              # Shared Type Definitions
│
├── infrastructure/          # External Services (Adapters)
│   ├── ai/                 # AI-Service-Adapters (Gemini, etc.)
│   ├── storage/            # File-Storage-Adapters
│   ├── vector/             # Vector-Database-Adapters (Qdrant)
│   ├── email/              # Email-Service-Adapters
│   └── cache/              # Cache-Service-Adapters
│
├── domain/                  # Business Logic (Domain Layer)
│   ├── user/               # User Domain
│   │   ├── entities/       # User, Profile, Preferences
│   │   ├── services/       # User Business Logic
│   │   ├── repositories/   # User Data Access Interfaces
│   │   └── events/         # User Domain Events
│   │
│   ├── workspace/          # Workspace Domain  
│   │   ├── entities/       # Document, Note, Context
│   │   ├── services/       # Workspace Business Logic
│   │   ├── repositories/   # Workspace Data Access Interfaces
│   │   └── events/         # Workspace Domain Events
│   │
│   ├── quiz/               # Quiz/Gamification Domain
│   │   ├── entities/       # Quiz, Question, Score, Achievement
│   │   ├── services/       # Quiz Business Logic
│   │   ├── repositories/   # Quiz Data Access Interfaces
│   │   └── events/         # Quiz Domain Events
│   │
│   └── chat/               # Chat Domain
│       ├── entities/       # Chat, Message, Context
│       ├── services/       # Chat Business Logic
│       ├── repositories/   # Chat Data Access Interfaces
│       └── events/         # Chat Domain Events
│
├── application/             # Application Services (Use Cases)
│   ├── user/               # User Use Cases
│   │   ├── commands/       # Create, Update, Delete User
│   │   ├── queries/        # Get User, List Users
│   │   └── handlers/       # Command/Query Handlers
│   │
│   ├── workspace/          # Workspace Use Cases
│   │   ├── commands/       # Create Document, Add Note
│   │   ├── queries/        # Search Documents, Get Context
│   │   └── handlers/       # Command/Query Handlers
│   │
│   ├── quiz/               # Quiz Use Cases
│   │   ├── commands/       # Create Quiz, Submit Answer
│   │   ├── queries/        # Get Quiz, Get Leaderboard
│   │   └── handlers/       # Command/Query Handlers
│   │
│   └── shared/             # Shared Application Services
│       ├── security/       # Authentication, Authorization
│       ├── notifications/  # Email, Push Notifications
│       └── analytics/      # Usage Analytics, Monitoring
│
├── presentation/            # API Layer (Controllers)
│   ├── http/               # HTTP REST API
│   │   ├── controllers/    # Route Controllers
│   │   ├── middleware/     # HTTP Middleware
│   │   ├── validators/     # Request Validation
│   │   └── serializers/    # Response Serialization
│   │
│   ├── websocket/          # WebSocket API
│   │   ├── handlers/       # WebSocket Event Handlers
│   │   └── rooms/          # Socket Room Management
│   │
│   └── graphql/            # GraphQL API (optional)
│       ├── schema/         # GraphQL Schema
│       ├── resolvers/      # GraphQL Resolvers
│       └── subscriptions/  # GraphQL Subscriptions
│
└── plugins/                 # Plugin System
    ├── interfaces/         # Plugin Interfaces
    ├── registry/           # Plugin Registry
    ├── loader/             # Plugin Loader
    └── examples/           # Example Plugins
```

### Schichten-Abhängigkeiten

```
Presentation Layer (HTTP/WebSocket/GraphQL)
       ↓ (depends on)
Application Layer (Use Cases/Commands/Queries) 
       ↓ (depends on)
Domain Layer (Business Logic/Entities/Services)
       ↓ (depends on)
Infrastructure Layer (External Services/Adapters)
       ↓ (depends on)
Core Layer (Config/Utils/Interfaces)
```

### Interface-Definitionen

#### Core Interfaces

```typescript
// core/interfaces/IRepository.ts
export interface IRepository<T, ID> {
  findById(id: ID): Promise<T | null>;
  findAll(filters?: any): Promise<T[]>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, updates: Partial<T>): Promise<T>;
  delete(id: ID): Promise<void>;
}

// core/interfaces/IService.ts
export interface IService {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  healthCheck(): Promise<boolean>;
}

// core/interfaces/IEventBus.ts
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string, 
    handler: (event: T) => Promise<void>
  ): void;
}
```

#### Domain Interfaces

```typescript
// domain/user/repositories/IUserRepository.ts
export interface IUserRepository extends IRepository<User, string> {
  findByEmail(email: string): Promise<User | null>;
  findByRole(role: UserRole): Promise<User[]>;
  updateLastLogin(userId: string): Promise<void>;
}

// domain/workspace/repositories/IDocumentRepository.ts
export interface IDocumentRepository extends IRepository<Document, string> {
  findByUserId(userId: string): Promise<Document[]>;
  findByTags(tags: string[]): Promise<Document[]>;
  search(query: string, userId: string): Promise<Document[]>;
}

// domain/quiz/repositories/IQuizRepository.ts
export interface IQuizRepository extends IRepository<Quiz, string> {
  findByDifficulty(level: DifficultyLevel): Promise<Quiz[]>;
  findActiveQuizzes(): Promise<Quiz[]>;
  findByTopicArea(topic: string): Promise<Quiz[]>;
}
```

#### Infrastructure Interfaces

```typescript
// infrastructure/ai/interfaces/IAIService.ts
export interface IAIService extends IService {
  generateText(prompt: string, options?: AIOptions): Promise<string>;
  generateQuiz(content: string, options?: QuizOptions): Promise<QuizData>;
  analyzeContext(text: string): Promise<ContextAnalysis>;
}

// infrastructure/vector/interfaces/IVectorService.ts
export interface IVectorService extends IService {
  createCollection(name: string, config: VectorConfig): Promise<void>;
  addPoints(collection: string, points: VectorPoint[]): Promise<void>;
  search(collection: string, query: number[], limit?: number): Promise<SearchResult[]>;
}

// infrastructure/storage/interfaces/IFileStorage.ts
export interface IFileStorage extends IService {
  upload(file: Buffer, path: string): Promise<string>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  exists(path: string): Promise<boolean>;
}
```

## Frontend-Architektur

### Neue Component-Struktur

```
client/src/
├── app/                     # App-Level Configuration
│   ├── config/             # App Configuration
│   ├── providers/          # Global Providers
│   ├── router/             # Routing Configuration
│   └── store/              # Global State Management
│
├── shared/                  # Shared Resources
│   ├── components/         # Reusable UI Components
│   │   ├── ui/             # Basic UI Components (Button, Input)
│   │   ├── layout/         # Layout Components
│   │   ├── forms/          # Form Components
│   │   └── feedback/       # Loading, Error, Success Components
│   │
│   ├── hooks/              # Custom Hooks
│   │   ├── api/            # API-related Hooks
│   │   ├── state/          # State Management Hooks
│   │   └── utils/          # Utility Hooks
│   │
│   ├── services/           # API Services
│   │   ├── api/            # HTTP Client Configuration
│   │   ├── auth/           # Authentication Service
│   │   ├── websocket/      # WebSocket Service
│   │   └── storage/        # Local Storage Service
│   │
│   ├── utils/              # Utility Functions
│   │   ├── validation/     # Validation Helpers
│   │   ├── formatting/     # Data Formatting
│   │   └── constants/      # App Constants
│   │
│   └── types/              # Shared Type Definitions
│       ├── api/            # API Response Types
│       ├── ui/             # UI Component Types
│       └── common/         # Common Types
│
├── features/                # Feature-based Organization
│   ├── auth/               # Authentication Feature
│   │   ├── components/     # Auth-specific Components
│   │   ├── hooks/          # Auth-specific Hooks
│   │   ├── services/       # Auth API Services
│   │   ├── store/          # Auth State Management
│   │   └── pages/          # Auth Pages
│   │
│   ├── workspace/          # Workspace Feature
│   │   ├── components/     # Workspace Components
│   │   │   ├── documents/  # Document-related Components
│   │   │   ├── notes/      # Notes-related Components
│   │   │   └── search/     # Search-related Components
│   │   ├── hooks/          # Workspace Hooks
│   │   ├── services/       # Workspace API Services
│   │   ├── store/          # Workspace State
│   │   └── pages/          # Workspace Pages
│   │
│   ├── quiz/               # Quiz Feature
│   │   ├── components/     # Quiz Components
│   │   │   ├── player/     # Quiz Player Components
│   │   │   ├── admin/      # Quiz Admin Components
│   │   │   └── leaderboard/ # Leaderboard Components
│   │   ├── hooks/          # Quiz Hooks
│   │   ├── services/       # Quiz API Services
│   │   ├── store/          # Quiz State
│   │   └── pages/          # Quiz Pages
│   │
│   ├── chat/               # Chat Feature
│   │   ├── components/     # Chat Components
│   │   ├── hooks/          # Chat Hooks
│   │   ├── services/       # Chat Services
│   │   ├── store/          # Chat State
│   │   └── pages/          # Chat Pages
│   │
│   └── admin/              # Admin Feature
│       ├── components/     # Admin Components
│       ├── hooks/          # Admin Hooks
│       ├── services/       # Admin Services
│       ├── store/          # Admin State
│       └── pages/          # Admin Pages
│
└── pages/                   # Route-level Pages (thin layer)
    ├── HomePage.tsx
    ├── WorkspacePage.tsx
    ├── QuizPage.tsx
    └── NotFoundPage.tsx
```

### State Management Architecture

```typescript
// Zustand-based State Management
// app/store/index.ts
interface AppState {
  auth: AuthState;
  workspace: WorkspaceState;
  quiz: QuizState;
  chat: ChatState;
  ui: UIState;
}

// Feature-based Stores
// features/auth/store/authStore.ts
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  permissions: Permission[];
}

// features/workspace/store/workspaceStore.ts
interface WorkspaceState {
  documents: Document[];
  notes: Note[];
  currentContext: WorkspaceContext | null;
  searchResults: SearchResult[];
}
```

## Namenskonventionen

### Backend

#### Datei-Namenskonventionen
```
PascalCase für Klassen:         UserService.ts
camelCase für Funktionen:       userService.ts
kebab-case für Verzeichnisse:   user-profile/
UPPER_CASE für Konstanten:      MAX_FILE_SIZE.ts
```

#### Code-Namenskonventionen
```typescript
// Interfaces: I-Prefix
interface IUserRepository { }

// Abstract Classes: Abstract-Prefix
abstract class AbstractRepository { }

// Enums: PascalCase
enum UserRole { ADMIN, USER }

// Constants: UPPER_SNAKE_CASE
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;

// Private Members: underscore prefix
private _internalState: any;
```

### Frontend

#### Component-Namenskonventionen
```typescript
// Components: PascalCase
const UserProfile: React.FC = () => { };

// Hooks: use-Prefix
const useAuthentication = () => { };

// Context: PascalCase + Context suffix
const UserAuthContext = createContext();

// Types: PascalCase + Type suffix
interface UserProfileType { }
```

#### Datei-Namenskonventionen
```
Components:     UserProfile.tsx
Hooks:          useAuthentication.ts
Services:       userApi.ts
Types:          user.types.ts
Constants:      api.constants.ts
Utils:          validation.utils.ts
```

## Gemeinsame Utilities und Services

### Backend Utilities

```typescript
// core/utils/Logger.ts
export class Logger {
  static info(message: string, context?: any): void;
  static error(message: string, error?: Error, context?: any): void;
  static debug(message: string, context?: any): void;
  static warn(message: string, context?: any): void;
}

// core/utils/Validator.ts
export class Validator {
  static email(email: string): boolean;
  static password(password: string): ValidationResult;
  static uuid(id: string): boolean;
  static sanitizeHtml(html: string): string;
}

// core/utils/Crypto.ts
export class CryptoUtils {
  static generateHash(data: string): string;
  static generateSalt(): string;
  static compareHash(data: string, hash: string): boolean;
  static generateJWT(payload: any): string;
  static verifyJWT(token: string): any;
}
```

### Frontend Utilities

```typescript
// shared/utils/api.utils.ts
export const apiUtils = {
  handleApiError: (error: AxiosError) => ErrorInfo,
  formatApiResponse: <T>(response: AxiosResponse<T>) => T,
  createApiHeaders: (token?: string) => Record<string, string>
};

// shared/utils/validation.utils.ts
export const validationUtils = {
  email: (email: string) => ValidationResult,
  password: (password: string) => ValidationResult,
  required: (value: any) => ValidationResult
};

// shared/utils/format.utils.ts
export const formatUtils = {
  currency: (amount: number) => string,
  date: (date: Date, format?: string) => string,
  fileSize: (bytes: number) => string,
  truncate: (text: string, length: number) => string
};
```

## Plugin-Architektur

### Plugin-Interface

```typescript
// plugins/interfaces/IPlugin.ts
export interface IPlugin {
  name: string;
  version: string;
  description: string;
  dependencies?: string[];
  
  initialize(context: PluginContext): Promise<void>;
  shutdown(): Promise<void>;
  
  // Lifecycle hooks
  beforeRequest?(req: Request): Promise<Request>;
  afterResponse?(res: Response): Promise<Response>;
  
  // Extension points
  registerRoutes?(router: Router): void;
  registerServices?(container: DIContainer): void;
  registerMiddleware?(app: Application): void;
}

// plugins/interfaces/PluginContext.ts
export interface PluginContext {
  logger: ILogger;
  config: IConfig;
  database: IDatabaseConnection;
  eventBus: IEventBus;
  serviceContainer: DIContainer;
}
```

### Plugin-Registry

```typescript
// plugins/registry/PluginRegistry.ts
export class PluginRegistry {
  private plugins: Map<string, IPlugin> = new Map();
  
  async register(plugin: IPlugin): Promise<void>;
  async unregister(name: string): Promise<void>;
  async initializeAll(): Promise<void>;
  async shutdownAll(): Promise<void>;
  
  getPlugin(name: string): IPlugin | undefined;
  getAllPlugins(): IPlugin[];
  isRegistered(name: string): boolean;
}
```

## Dependency Injection

### DI-Container

```typescript
// core/di/Container.ts
export class DIContainer {
  private services: Map<string, any> = new Map();
  private factories: Map<string, () => any> = new Map();
  
  // Service Registration
  register<T>(name: string, implementation: T): void;
  registerFactory<T>(name: string, factory: () => T): void;
  registerSingleton<T>(name: string, implementation: T): void;
  
  // Service Resolution
  resolve<T>(name: string): T;
  resolveAll<T>(tag: string): T[];
  
  // Lifecycle Management
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

// Service Registration Example
container.register('IUserRepository', new PostgresUserRepository());
container.register('IEmailService', new SendGridEmailService());
container.registerFactory('ILogger', () => new Logger(config.logLevel));
```

## Monitoring und Observability

### Logging-Strategie

```typescript
// core/monitoring/Logger.ts
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: any;
  userId?: string;
  requestId?: string;
  error?: Error;
}

export class StructuredLogger implements ILogger {
  log(entry: LogEntry): void;
  info(message: string, context?: any): void;
  error(message: string, error?: Error, context?: any): void;
  debug(message: string, context?: any): void;
  warn(message: string, context?: any): void;
}
```

### Metrics und Analytics

```typescript
// core/monitoring/Metrics.ts
export interface IMetrics {
  increment(metric: string, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
}

// Usage Examples
metrics.increment('user.login.success', { method: 'email' });
metrics.timing('api.request.duration', 150, { endpoint: '/users' });
metrics.gauge('active.connections', activeConnections);
```

## Fehlerbehandlung

### Einheitliche Error-Hierarchie

```typescript
// core/errors/AppError.ts
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;
}

export class BusinessLogicError extends AppError {
  readonly statusCode = 422;
  readonly isOperational = true;
}
```

## Testing-Architektur

### Test-Struktur

```
tests/
├── unit/                   # Unit Tests
│   ├── domain/            # Domain Logic Tests
│   ├── application/       # Use Case Tests
│   └── infrastructure/    # Infrastructure Tests
│
├── integration/           # Integration Tests
│   ├── api/              # API Integration Tests
│   ├── database/         # Database Integration Tests
│   └── external/         # External Service Tests
│
├── e2e/                  # End-to-End Tests
│   ├── features/         # Feature-based E2E Tests
│   └── performance/      # Performance Tests
│
└── fixtures/             # Test Data and Fixtures
    ├── data/            # Test Data
    ├── mocks/           # Mock Objects
    └── builders/        # Test Data Builders
```

### Test-Utilities

```typescript
// tests/utils/TestContainer.ts
export class TestContainer extends DIContainer {
  static create(): TestContainer;
  
  registerMock<T>(name: string, mock: T): void;
  resetMocks(): void;
  
  // Database helpers
  setupTestDatabase(): Promise<void>;
  cleanupTestDatabase(): Promise<void>;
  
  // Authentication helpers
  createTestUser(role?: UserRole): Promise<User>;
  generateAuthToken(user: User): string;
}
```

Diese Architektur bietet:

✅ **Klare Schichtentrennung** mit definierten Abhängigkeiten  
✅ **Hohe Testbarkeit** durch Dependency Injection  
✅ **Einfache Erweiterbarkeit** durch Plugin-System  
✅ **Konsistente Code-Organisation** mit Namenskonventionen  
✅ **Robuste Fehlerbehandlung** mit strukturierten Errors  
✅ **Überwachbarkeit** mit Logging und Metrics  
✅ **Wartbarkeit** durch modulare Struktur
