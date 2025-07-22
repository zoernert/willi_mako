# Coding Standards & Style Guide

## Überblick

Dieser Leitfaden definiert die Code-Standards für das Willi Mako Projekt. Die Einhaltung dieser Standards gewährleistet Konsistenz, Lesbarkeit und Wartbarkeit der Codebase.

## TypeScript Standards

### 1. Naming Conventions

#### Variablen und Funktionen
```typescript
// ✅ camelCase für Variablen und Funktionen
const userName = 'john_doe';
const isAuthenticated = true;

function getUserProfile(userId: string): UserProfile {
  return userRepository.findById(userId);
}

// ❌ Vermeiden
const user_name = 'john_doe';
const IsAuthenticated = true;
```

#### Klassen und Interfaces
```typescript
// ✅ PascalCase für Klassen und Interfaces
class UserService {
  constructor(private userRepository: UserRepository) {}
}

interface UserRepository {
  findById(id: string): Promise<User | null>;
}

// ✅ Interface-Naming mit 'I' Prefix optional, aber konsistent
interface IUserService {
  createUser(userData: CreateUserDto): Promise<User>;
}
```

#### Konstanten
```typescript
// ✅ SCREAMING_SNAKE_CASE für Konstanten
const DATABASE_URL = process.env.DATABASE_URL;
const MAX_RETRY_ATTEMPTS = 3;
const API_ENDPOINTS = {
  USERS: '/api/users',
  WORKSPACES: '/api/workspaces'
} as const;
```

#### Dateien und Ordner
```bash
# ✅ kebab-case für Dateien
user-service.ts
quiz-repository.ts
workspace-controller.ts

# ✅ camelCase für Ordner
src/modules/userManagement/
src/services/authService/
```

### 2. Type Definitions

#### Explizite Typisierung
```typescript
// ✅ Explizite Return-Types für Funktionen
function calculateScore(answers: Answer[]): number {
  return answers.reduce((sum, answer) => sum + answer.points, 0);
}

// ✅ Interface für komplexe Objekte
interface CreateQuizRequest {
  title: string;
  description?: string;
  questions: QuizQuestion[];
  timeLimit?: number;
}

// ❌ Vermeiden: any-Type
function processData(data: any): any {
  return data;
}

// ✅ Generics verwenden
function processData<T>(data: T): T {
  return data;
}
```

#### Union Types und Type Guards
```typescript
// ✅ Union Types für begrenzte Werte
type QuizDifficulty = 'easy' | 'medium' | 'hard';
type UserRole = 'admin' | 'user' | 'moderator';

// ✅ Type Guards für Laufzeit-Validierung
function isUser(obj: unknown): obj is User {
  return typeof obj === 'object' && 
         obj !== null && 
         'id' in obj && 
         'email' in obj;
}
```

### 3. Error Handling

#### Custom Error Classes
```typescript
// ✅ Spezifische Error-Klassen
export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User with ID ${userId} not found`);
    this.name = 'UserNotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public value: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

#### Error Handling Pattern
```typescript
// ✅ Result Pattern für fehlerträchtige Operationen
type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

async function createUser(userData: CreateUserDto): Promise<Result<User>> {
  try {
    const user = await userRepository.create(userData);
    return { success: true, data: user };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('Unknown error') 
    };
  }
}
```

## React/Frontend Standards

### 1. Component Structure

#### Functional Components
```typescript
// ✅ Functional Components mit TypeScript
interface UserProfileProps {
  userId: string;
  onUpdate?: (user: User) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  userId, 
  onUpdate 
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hooks zuerst
  useEffect(() => {
    loadUser();
  }, [userId]);

  // Event Handlers
  const handleUpdate = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    onUpdate?.(updatedUser);
  }, [onUpdate]);

  // Render Logic
  if (loading) return <LoadingSpinner />;
  if (!user) return <ErrorMessage message="User not found" />;

  return (
    <div className="user-profile">
      {/* Component content */}
    </div>
  );
};
```

#### Custom Hooks
```typescript
// ✅ Custom Hooks für wiederverwendbare Logik
export function useUser(userId: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      try {
        setLoading(true);
        setError(null);
        const userData = await apiClient.getUser(userId);
        if (mounted) {
          setUser(userData);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [userId]);

  return { user, loading, error };
}
```

### 2. State Management

#### Context Pattern
```typescript
// ✅ Typisierte Contexts
interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

## Backend/API Standards

### 1. Route Structure

#### RESTful APIs
```typescript
// ✅ RESTful Route-Definitionen
router.get('/users', getUsersHandler);           // GET /api/users
router.get('/users/:id', getUserByIdHandler);    // GET /api/users/123
router.post('/users', createUserHandler);        // POST /api/users
router.put('/users/:id', updateUserHandler);     // PUT /api/users/123
router.delete('/users/:id', deleteUserHandler);  // DELETE /api/users/123

// ✅ Nested Resources
router.get('/users/:userId/workspaces', getUserWorkspacesHandler);
router.post('/users/:userId/workspaces', createWorkspaceHandler);
```

#### Request/Response Types
```typescript
// ✅ Typisierte Request/Response
interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
}

// ✅ Handler mit Typisierung
export const createUserHandler = async (
  req: Request<{}, UserResponse, CreateUserRequest>,
  res: Response<UserResponse>
): Promise<void> => {
  try {
    const userData = req.body;
    const user = await userService.createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};
```

### 2. Service Layer

#### Service Pattern
```typescript
// ✅ Service-Klassen für Business Logic
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private logger: Logger
  ) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    // Validation
    this.validateUserData(userData);

    // Business Logic
    const hashedPassword = await this.hashPassword(userData.password);
    const user = await this.userRepository.create({
      ...userData,
      password: hashedPassword
    });

    // Logging
    this.logger.info('User created', { userId: user.id });

    // Events
    await this.eventEmitter.emit('user.created', user);

    return user;
  }

  private validateUserData(userData: CreateUserDto): void {
    if (!userData.email || !isValidEmail(userData.email)) {
      throw new ValidationError('Invalid email', 'email', userData.email);
    }
  }
}
```

## Database Standards

### 1. Migration Naming
```sql
-- ✅ Naming Convention: YYYYMMDD_HHMMSS_description.sql
-- 20241201_143000_create_users_table.sql
-- 20241201_144500_add_user_profile_fields.sql
-- 20241201_150000_create_quiz_leaderboard.sql
```

### 2. Schema Design
```sql
-- ✅ Konsistente Namenskonventionen
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ✅ Foreign Key Constraints
CREATE TABLE user_workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id)
);
```

## Testing Standards

### 1. Test Structure

#### Unit Tests
```typescript
// ✅ Descriptive Test Names
describe('UserService', () => {
  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result.email).toBe(userData.email);
      expect(result.id).toBeDefined();
    });

    it('should throw ValidationError for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

#### Integration Tests
```typescript
// ✅ Integration Test Pattern
describe('User API Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should create and retrieve user via API', async () => {
    // Create user
    const createResponse = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      })
      .expect(201);

    const userId = createResponse.body.id;

    // Retrieve user
    const getResponse = await request(app)
      .get(`/api/users/${userId}`)
      .expect(200);

    expect(getResponse.body.email).toBe('test@example.com');
  });
});
```

## Documentation Standards

### 1. Code Comments

#### Function Documentation
```typescript
/**
 * Erstellt ein neues Quiz basierend auf den bereitgestellten Daten.
 * 
 * @param quizData - Die Daten für das neue Quiz
 * @param authorId - Die ID des Quiz-Autors
 * @returns Promise mit dem erstellten Quiz
 * @throws ValidationError wenn Quiz-Daten ungültig sind
 * @throws UserNotFoundError wenn Autor nicht existiert
 * 
 * @example
 * ```typescript
 * const quiz = await quizService.createQuiz({
 *   title: 'TypeScript Basics',
 *   questions: [...]
 * }, 'user-123');
 * ```
 */
async function createQuiz(
  quizData: CreateQuizDto, 
  authorId: string
): Promise<Quiz> {
  // Implementation
}
```

#### Complex Logic Comments
```typescript
// Berechne den finalen Score basierend auf Antworten und Zeitbonus
// Score = (Korrekte Antworten / Gesamt Antworten) * 100 + Zeitbonus
const baseScore = (correctAnswers / totalQuestions) * 100;
const timeBonus = Math.max(0, (timeLimit - timeUsed) / timeLimit * 10);
const finalScore = Math.round(baseScore + timeBonus);
```

### 2. README Standards

#### Modul README Template
```markdown
# Module Name

## Überblick
Kurze Beschreibung des Moduls und seiner Verantwortlichkeiten.

## Features
- Feature 1
- Feature 2
- Feature 3

## API
### Public Interface
\`\`\`typescript
interface ModuleService {
  method1(param: Type): Promise<ReturnType>;
  method2(param: Type): ReturnType;
}
\`\`\`

## Usage
\`\`\`typescript
// Beispiel-Code
\`\`\`

## Dependencies
- Dependency 1
- Dependency 2
```

## Performance Standards

### 1. Database Queries

#### Optimierung
```typescript
// ✅ Verwende Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_quiz_author_id ON quizzes(author_id);

// ✅ Lazy Loading für große Datenmengen
async function getUserWorkspaces(userId: string, limit = 20, offset = 0) {
  return await db.query(`
    SELECT w.* FROM workspaces w
    JOIN user_workspaces uw ON w.id = uw.workspace_id
    WHERE uw.user_id = $1
    ORDER BY w.updated_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset]);
}

// ❌ Vermeiden: N+1 Queries
// Stattdessen: Joins oder Batch-Loading verwenden
```

### 2. Frontend Performance

#### Optimierung
```typescript
// ✅ React.memo für teure Komponenten
export const QuizQuestion = React.memo<QuizQuestionProps>(({ 
  question, 
  onAnswer 
}) => {
  // Component implementation
});

// ✅ useMemo für teure Berechnungen
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(props.data);
}, [props.data]);

// ✅ Lazy Loading für Routen
const LazyQuizPage = lazy(() => import('./pages/Quiz'));
```

## Security Standards

### 1. Input Validation

```typescript
// ✅ Validation Schema
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50)
});

// ✅ Sanitization
function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input);
}
```

### 2. Authentication & Authorization

```typescript
// ✅ JWT Token Validation
function validateToken(token: string): User | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload as User;
  } catch (error) {
    return null;
  }
}

// ✅ Role-based Access Control
function requireRole(role: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}
```

## Code Quality Tools

### 1. ESLint Configuration
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "prefer-const": "error",
    "no-var": "error"
  }
}
```

### 2. Prettier Configuration
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

## Commit Standards

### 1. Commit Message Format
```
type(scope): description

[optional body]

[optional footer]
```

### 2. Commit Types
- `feat`: Neue Features
- `fix`: Bug Fixes
- `docs`: Dokumentation
- `style`: Code-Formatierung
- `refactor`: Code-Refactoring
- `test`: Tests
- `chore`: Build/Tooling

### 3. Beispiele
```
feat(quiz): add AI-powered question generation
fix(auth): resolve JWT token expiration issue
docs(api): update user endpoint documentation
refactor(workspace): extract service layer
test(user): add integration tests for user creation
```

## Fazit

Die Einhaltung dieser Standards gewährleistet:
- **Konsistenz** in der gesamten Codebase
- **Lesbarkeit** für alle Entwickler
- **Wartbarkeit** und einfache Erweiterung
- **Qualität** durch automatisierte Checks
- **Performance** durch bewährte Praktiken
- **Sicherheit** durch validierte Patterns

Alle neuen Code-Beiträge sollten diesen Standards entsprechen und durch Code-Reviews validiert werden.
