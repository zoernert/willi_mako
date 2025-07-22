# Testing Strategy & Implementation

## Überblick

Diese Dokumentation beschreibt die umfassende Testing-Strategie für das Willi Mako Projekt nach dem Refactoring. Alle kritischen Module, Services und APIs werden durch automatisierte Tests abgedeckt.

## Test-Pyramide

```
                    E2E Tests
                   ╱           ╲
                  ╱ Integration ╲
                 ╱               ╲
                ╱    Unit Tests   ╲
               ╱___________________╲
```

### Test-Coverage-Ziele
- **Unit Tests**: 90%+ Coverage
- **Integration Tests**: 80%+ Critical Paths
- **E2E Tests**: 70%+ User Journeys

## Unit Tests

### Backend Unit Tests

#### User Module Tests
```typescript
// tests/unit/modules/user/user.service.test.ts
import { UserServiceImpl } from '../../../../src/modules/user/services/user.service';
import { UserRepository } from '../../../../src/modules/user/interfaces/user.interface';
import { Logger } from '../../../../src/core/logging/logger.interface';
import { ValidationError, NotFoundError } from '../../../../src/utils/errors';
import { hashPassword } from '../../../../src/utils/password';

jest.mock('../../../../src/utils/password');

describe('UserService', () => {
  let userService: UserServiceImpl;
  let mockUserRepository: jest.Mocked<UserRepository>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    userService = new UserServiceImpl(mockUserRepository, mockLogger);
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const hashedPassword = 'hashed_password_123';
      (hashPassword as jest.Mock).mockResolvedValue(hashedPassword);

      const expectedUser = {
        id: 'user-123',
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        passwordHash: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.create.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(hashPassword).toHaveBeenCalledWith(userData.password);
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        ...userData,
        password: hashedPassword
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User created',
        { userId: expectedUser.id, email: expectedUser.email }
      );
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

    it('should throw ValidationError for weak password', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        password: '123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for duplicate email', async () => {
      // Arrange
      const userData = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const existingUser = {
        id: 'existing-user',
        email: userData.email,
        firstName: 'Jane',
        lastName: 'Smith',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      // Arrange
      const userId = 'user-123';
      const expectedUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.getUserById(userId);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw NotFoundError when user not found', async () => {
      // Arrange
      const userId = 'non-existent';
      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.getUserById(userId))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('updateUser', () => {
    it('should update user with valid data', async () => {
      // Arrange
      const userId = 'user-123';
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith'
      };

      const existingUser = {
        id: userId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const updatedUser = {
        ...existingUser,
        ...updateData,
        updatedAt: new Date()
      };

      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await userService.updateUser(userId, updateData);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserRepository.update).toHaveBeenCalledWith(userId, updateData);
    });

    it('should throw NotFoundError when updating non-existent user', async () => {
      // Arrange
      const userId = 'non-existent';
      const updateData = { firstName: 'Jane' };

      mockUserRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(userService.updateUser(userId, updateData))
        .rejects
        .toThrow(NotFoundError);
    });
  });
});
```

#### Quiz Module Tests
```typescript
// tests/unit/modules/quiz/quiz.service.test.ts
import { QuizServiceImpl } from '../../../../src/modules/quiz/services/quiz.service';
import { QuizRepository } from '../../../../src/modules/quiz/interfaces/quiz.interface';
import { Logger } from '../../../../src/core/logging/logger.interface';
import { GeminiService } from '../../../../src/services/gemini';
import { ValidationError, NotFoundError } from '../../../../src/utils/errors';

describe('QuizService', () => {
  let quizService: QuizServiceImpl;
  let mockQuizRepository: jest.Mocked<QuizRepository>;
  let mockLogger: jest.Mocked<Logger>;
  let mockGeminiService: jest.Mocked<GeminiService>;

  beforeEach(() => {
    mockQuizRepository = {
      findById: jest.fn(),
      findByAuthorId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    mockGeminiService = {
      generateQuizQuestions: jest.fn(),
      analyzeQuizDifficulty: jest.fn()
    };

    quizService = new QuizServiceImpl(
      mockQuizRepository,
      mockGeminiService,
      mockLogger
    );
  });

  describe('createQuiz', () => {
    it('should create quiz with AI-generated questions', async () => {
      // Arrange
      const authorId = 'user-123';
      const quizData = {
        title: 'TypeScript Basics',
        description: 'A quiz about TypeScript fundamentals',
        topic: 'typescript',
        difficulty: 'medium' as const,
        questionCount: 5
      };

      const generatedQuestions = [
        {
          id: 'q1',
          question: 'What is TypeScript?',
          options: ['A language', 'A framework', 'A library', 'A tool'],
          correctAnswer: 0,
          explanation: 'TypeScript is a programming language'
        }
      ];

      const expectedQuiz = {
        id: 'quiz-123',
        title: quizData.title,
        description: quizData.description,
        authorId,
        questions: generatedQuestions,
        difficulty: quizData.difficulty,
        timeLimit: 300,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockGeminiService.generateQuizQuestions.mockResolvedValue(generatedQuestions);
      mockQuizRepository.create.mockResolvedValue(expectedQuiz);

      // Act
      const result = await quizService.createQuiz(authorId, quizData);

      // Assert
      expect(result).toEqual(expectedQuiz);
      expect(mockGeminiService.generateQuizQuestions).toHaveBeenCalledWith(
        quizData.topic,
        quizData.questionCount,
        quizData.difficulty
      );
      expect(mockQuizRepository.create).toHaveBeenCalledWith({
        ...quizData,
        authorId,
        questions: generatedQuestions
      });
    });

    it('should throw ValidationError for invalid quiz data', async () => {
      // Arrange
      const authorId = 'user-123';
      const invalidQuizData = {
        title: '', // Empty title
        topic: 'typescript',
        difficulty: 'medium' as const,
        questionCount: 5
      };

      // Act & Assert
      await expect(quizService.createQuiz(authorId, invalidQuizData))
        .rejects
        .toThrow(ValidationError);
    });
  });

  describe('startQuizAttempt', () => {
    it('should start new quiz attempt', async () => {
      // Arrange
      const quizId = 'quiz-123';
      const userId = 'user-123';

      const quiz = {
        id: quizId,
        title: 'Test Quiz',
        authorId: 'author-123',
        questions: [
          {
            id: 'q1',
            question: 'Test question?',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 0,
            explanation: 'Test explanation'
          }
        ],
        difficulty: 'medium' as const,
        timeLimit: 300,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const expectedAttempt = {
        id: 'attempt-123',
        quizId,
        userId,
        startTime: new Date(),
        answers: [],
        completed: false,
        score: null
      };

      mockQuizRepository.findById.mockResolvedValue(quiz);
      mockQuizRepository.createAttempt.mockResolvedValue(expectedAttempt);

      // Act
      const result = await quizService.startQuizAttempt(quizId, userId);

      // Assert
      expect(result).toEqual(expectedAttempt);
      expect(mockQuizRepository.createAttempt).toHaveBeenCalledWith({
        quizId,
        userId,
        startTime: expect.any(Date)
      });
    });
  });
});
```

#### Workspace Module Tests
```typescript
// tests/unit/modules/workspace/workspace.service.test.ts
import { WorkspaceServiceImpl } from '../../../../src/modules/workspace/services/workspace.service';
import { WorkspaceRepository } from '../../../../src/modules/workspace/interfaces/workspace.interface';
import { Logger } from '../../../../src/core/logging/logger.interface';

describe('WorkspaceService', () => {
  let workspaceService: WorkspaceServiceImpl;
  let mockWorkspaceRepository: jest.Mocked<WorkspaceRepository>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockWorkspaceRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
      getNotes: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    workspaceService = new WorkspaceServiceImpl(mockWorkspaceRepository, mockLogger);
  });

  describe('createWorkspace', () => {
    it('should create workspace with valid data', async () => {
      // Arrange
      const userId = 'user-123';
      const workspaceData = {
        name: 'My Workspace',
        description: 'A test workspace'
      };

      const expectedWorkspace = {
        id: 'workspace-123',
        name: workspaceData.name,
        description: workspaceData.description,
        userId,
        settings: {
          isPublic: false,
          allowCollaboration: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockWorkspaceRepository.create.mockResolvedValue(expectedWorkspace);

      // Act
      const result = await workspaceService.createWorkspace(userId, workspaceData);

      // Assert
      expect(result).toEqual(expectedWorkspace);
      expect(mockWorkspaceRepository.create).toHaveBeenCalledWith({
        ...workspaceData,
        userId
      });
    });
  });

  describe('addNoteToWorkspace', () => {
    it('should add note to existing workspace', async () => {
      // Arrange
      const workspaceId = 'workspace-123';
      const noteData = {
        title: 'Test Note',
        content: 'This is a test note',
        tags: ['test', 'example']
      };

      const workspace = {
        id: workspaceId,
        name: 'Test Workspace',
        userId: 'user-123',
        settings: { isPublic: false, allowCollaboration: false },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const expectedNote = {
        id: 'note-123',
        workspaceId,
        title: noteData.title,
        content: noteData.content,
        tags: noteData.tags,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockWorkspaceRepository.findById.mockResolvedValue(workspace);
      mockWorkspaceRepository.addNote.mockResolvedValue(expectedNote);

      // Act
      const result = await workspaceService.addNoteToWorkspace(workspaceId, noteData);

      // Assert
      expect(result).toEqual(expectedNote);
      expect(mockWorkspaceRepository.addNote).toHaveBeenCalledWith(workspaceId, noteData);
    });
  });
});
```

### Frontend Unit Tests

#### React Component Tests
```typescript
// client/src/components/Quiz/QuizCreator.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuizCreator } from './QuizCreator';
import { quizApi } from '../../services/quizApi';
import { AuthContext } from '../../contexts/AuthContext';
import { SnackbarContext } from '../../contexts/SnackbarContext';

jest.mock('../../services/quizApi');
const mockQuizApi = quizApi as jest.Mocked<typeof quizApi>;

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe'
};

const mockAuthContext = {
  user: mockUser,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

const mockSnackbarContext = {
  showSnackbar: jest.fn(),
  hideSnackbar: jest.fn()
};

const renderWithContext = (component: React.ReactElement) => {
  return render(
    <AuthContext.Provider value={mockAuthContext}>
      <SnackbarContext.Provider value={mockSnackbarContext}>
        {component}
      </SnackbarContext.Provider>
    </AuthContext.Provider>
  );
};

describe('QuizCreator Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render quiz creation form', () => {
    renderWithContext(<QuizCreator />);

    expect(screen.getByText('Quiz erstellen')).toBeInTheDocument();
    expect(screen.getByLabelText('Titel')).toBeInTheDocument();
    expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
    expect(screen.getByLabelText('Thema')).toBeInTheDocument();
    expect(screen.getByLabelText('Schwierigkeit')).toBeInTheDocument();
    expect(screen.getByLabelText('Anzahl Fragen')).toBeInTheDocument();
  });

  it('should create quiz when form is submitted', async () => {
    const newQuiz = {
      id: 'quiz-123',
      title: 'TypeScript Basics',
      description: 'A quiz about TypeScript',
      topic: 'typescript',
      difficulty: 'medium',
      questionCount: 5,
      questions: [],
      authorId: 'user-123',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockQuizApi.createQuiz.mockResolvedValue(newQuiz);

    renderWithContext(<QuizCreator />);

    // Fill form
    fireEvent.change(screen.getByLabelText('Titel'), {
      target: { value: 'TypeScript Basics' }
    });
    fireEvent.change(screen.getByLabelText('Beschreibung'), {
      target: { value: 'A quiz about TypeScript' }
    });
    fireEvent.change(screen.getByLabelText('Thema'), {
      target: { value: 'typescript' }
    });
    fireEvent.change(screen.getByLabelText('Schwierigkeit'), {
      target: { value: 'medium' }
    });
    fireEvent.change(screen.getByLabelText('Anzahl Fragen'), {
      target: { value: '5' }
    });

    // Submit form
    fireEvent.click(screen.getByText('Quiz erstellen'));

    await waitFor(() => {
      expect(mockQuizApi.createQuiz).toHaveBeenCalledWith({
        title: 'TypeScript Basics',
        description: 'A quiz about TypeScript',
        topic: 'typescript',
        difficulty: 'medium',
        questionCount: 5
      });
    });

    expect(mockSnackbarContext.showSnackbar).toHaveBeenCalledWith(
      'Quiz erfolgreich erstellt',
      'success'
    );
  });

  it('should show validation errors for invalid input', async () => {
    renderWithContext(<QuizCreator />);

    // Submit form without filling required fields
    fireEvent.click(screen.getByText('Quiz erstellen'));

    await waitFor(() => {
      expect(screen.getByText('Titel ist erforderlich')).toBeInTheDocument();
      expect(screen.getByText('Thema ist erforderlich')).toBeInTheDocument();
    });

    expect(mockQuizApi.createQuiz).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    mockQuizApi.createQuiz.mockRejectedValue(new Error('API Error'));

    renderWithContext(<QuizCreator />);

    // Fill and submit form
    fireEvent.change(screen.getByLabelText('Titel'), {
      target: { value: 'Test Quiz' }
    });
    fireEvent.change(screen.getByLabelText('Thema'), {
      target: { value: 'test' }
    });
    fireEvent.click(screen.getByText('Quiz erstellen'));

    await waitFor(() => {
      expect(mockSnackbarContext.showSnackbar).toHaveBeenCalledWith(
        'Fehler beim Erstellen des Quiz',
        'error'
      );
    });
  });
});
```

#### API Service Tests
```typescript
// client/src/services/quizApi.test.ts
import { quizApi } from './quizApi';
import { apiClient } from './apiClient';

jest.mock('./apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('quizApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getQuizzes', () => {
    it('should fetch all quizzes', async () => {
      const mockQuizzes = [
        {
          id: 'quiz-1',
          title: 'Quiz 1',
          description: 'First quiz',
          authorId: 'user-1',
          questions: [],
          difficulty: 'easy',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      ];

      mockApiClient.get.mockResolvedValue({ data: mockQuizzes });

      const result = await quizApi.getQuizzes();

      expect(result).toEqual(mockQuizzes);
      expect(mockApiClient.get).toHaveBeenCalledWith('/quiz');
    });

    it('should handle API errors', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(quizApi.getQuizzes()).rejects.toThrow('Network error');
    });
  });

  describe('createQuiz', () => {
    it('should create new quiz', async () => {
      const quizData = {
        title: 'New Quiz',
        description: 'A new quiz',
        topic: 'javascript',
        difficulty: 'medium' as const,
        questionCount: 10
      };

      const mockCreatedQuiz = {
        id: 'quiz-new',
        ...quizData,
        authorId: 'user-123',
        questions: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z'
      };

      mockApiClient.post.mockResolvedValue({ data: mockCreatedQuiz });

      const result = await quizApi.createQuiz(quizData);

      expect(result).toEqual(mockCreatedQuiz);
      expect(mockApiClient.post).toHaveBeenCalledWith('/quiz', quizData);
    });
  });

  describe('startQuizAttempt', () => {
    it('should start quiz attempt', async () => {
      const quizId = 'quiz-123';
      const mockAttempt = {
        id: 'attempt-123',
        quizId,
        userId: 'user-123',
        startTime: '2024-01-01T00:00:00.000Z',
        answers: [],
        completed: false,
        score: null
      };

      mockApiClient.post.mockResolvedValue({ data: mockAttempt });

      const result = await quizApi.startQuizAttempt(quizId);

      expect(result).toEqual(mockAttempt);
      expect(mockApiClient.post).toHaveBeenCalledWith(`/quiz/${quizId}/attempt`);
    });
  });
});
```

## Integration Tests

### API Integration Tests
```typescript
// tests/integration/api/auth.integration.test.ts
import request from 'supertest';
import { app } from '../../../src/server';
import { setupTestDatabase, cleanupTestDatabase } from '../../helpers/database';

describe('Auth API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    it('should register new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toMatchObject({
        user: {
          id: expect.any(String),
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        },
        token: expect.any(String)
      });
    });

    it('should return 400 for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Second registration with same email
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const userData = {
        email: 'login@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      };

      // Register user first
      await request(app)
        .post('/api/auth/register')
        .send(userData);

      // Login
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        })
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        },
        token: expect.any(String)
      });
    });

    it('should return 401 for invalid credentials', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });
  });
});
```

### Database Integration Tests
```typescript
// tests/integration/database/user.repository.integration.test.ts
import { Pool } from 'pg';
import { PostgresUserRepository } from '../../../src/modules/user/repositories/postgres-user.repository';
import { setupTestDatabase, cleanupTestDatabase, getTestDbConnection } from '../../helpers/database';

describe('UserRepository Integration', () => {
  let db: Pool;
  let userRepository: PostgresUserRepository;

  beforeAll(async () => {
    await setupTestDatabase();
    db = getTestDbConnection();
    userRepository = new PostgresUserRepository(db);
  });

  afterAll(async () => {
    await cleanupTestDatabase();
    await db.end();
  });

  beforeEach(async () => {
    // Clean users table before each test
    await db.query('DELETE FROM users');
  });

  describe('create', () => {
    it('should create user in database', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe'
      };

      const user = await userRepository.create(userData);

      expect(user).toMatchObject({
        id: expect.any(String),
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });

      // Verify in database
      const result = await db.query('SELECT * FROM users WHERE id = $1', [user.id]);
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].email).toBe(userData.email);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'findme@example.com',
        password: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe'
      };

      const createdUser = await userRepository.create(userData);
      const foundUser = await userRepository.findByEmail(userData.email);

      expect(foundUser).toEqual(createdUser);
    });

    it('should return null for non-existent email', async () => {
      const foundUser = await userRepository.findByEmail('nonexistent@example.com');
      expect(foundUser).toBeNull();
    });
  });
});
```

## E2E Tests

### Playwright E2E Tests
```typescript
// tests/e2e/auth.e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });

  test('should register and login user', async ({ page }) => {
    // Navigate to register page
    await page.click('text=Registrieren');
    await expect(page).toHaveURL('/register');

    // Fill registration form
    await page.fill('[data-testid=firstName]', 'John');
    await page.fill('[data-testid=lastName]', 'Doe');
    await page.fill('[data-testid=email]', 'e2e@example.com');
    await page.fill('[data-testid=password]', 'password123');

    // Submit registration
    await page.click('[data-testid=submit]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Willkommen, John!')).toBeVisible();

    // Logout
    await page.click('[data-testid=logout]');
    await expect(page).toHaveURL('/');

    // Login again
    await page.click('text=Anmelden');
    await page.fill('[data-testid=email]', 'e2e@example.com');
    await page.fill('[data-testid=password]', 'password123');
    await page.click('[data-testid=submit]');

    // Should be back at dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Willkommen, John!')).toBeVisible();
  });

  test('should show error for invalid login', async ({ page }) => {
    await page.click('text=Anmelden');
    await page.fill('[data-testid=email]', 'invalid@example.com');
    await page.fill('[data-testid=password]', 'wrongpassword');
    await page.click('[data-testid=submit]');

    await expect(page.locator('text=Ungültige Anmeldedaten')).toBeVisible();
  });
});
```

```typescript
// tests/e2e/quiz.e2e.test.ts
import { test, expect } from '@playwright/test';
import { createTestUser, loginUser } from '../helpers/auth';

test.describe('Quiz Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, 'quiz@example.com', 'password123');
  });

  test('should create and take quiz', async ({ page }) => {
    // Navigate to quiz creation
    await page.goto('/quiz/create');

    // Fill quiz form
    await page.fill('[data-testid=title]', 'E2E Test Quiz');
    await page.fill('[data-testid=description]', 'A quiz created by E2E test');
    await page.fill('[data-testid=topic]', 'javascript');
    await page.selectOption('[data-testid=difficulty]', 'medium');
    await page.fill('[data-testid=questionCount]', '3');

    // Create quiz
    await page.click('[data-testid=create-quiz]');

    // Should redirect to quiz list
    await expect(page).toHaveURL('/quiz');
    await expect(page.locator('text=E2E Test Quiz')).toBeVisible();

    // Start quiz
    await page.click('text=Quiz starten');

    // Should be on quiz page
    await expect(page).toHaveURL(/\/quiz\/[^\/]+\/attempt/);
    await expect(page.locator('[data-testid=quiz-question]')).toBeVisible();

    // Answer questions (assuming multiple choice)
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid=option-0]'); // Always select first option
      await page.click('[data-testid=next-question]');
    }

    // Submit quiz
    await page.click('[data-testid=submit-quiz]');

    // Should show results
    await expect(page.locator('text=Quiz abgeschlossen')).toBeVisible();
    await expect(page.locator('[data-testid=final-score]')).toBeVisible();
  });
});
```

## Test Helpers

### Database Test Helpers
```typescript
// tests/helpers/database.ts
import { Pool } from 'pg';

let testDb: Pool;

export async function setupTestDatabase(): Promise<void> {
  testDb = new Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'willi_mako_test',
    user: process.env.TEST_DB_USER || 'test_user',
    password: process.env.TEST_DB_PASSWORD || 'test_password'
  });

  // Run migrations
  await runMigrations(testDb);
}

export async function cleanupTestDatabase(): Promise<void> {
  if (testDb) {
    await testDb.end();
  }
}

export function getTestDbConnection(): Pool {
  return testDb;
}

export async function clearAllTables(): Promise<void> {
  const tables = [
    'quiz_attempts',
    'quiz_leaderboard',
    'quiz_questions',
    'quizzes',
    'workspace_notes',
    'workspaces',
    'user_profiles',
    'users',
    'system_logs'
  ];

  for (const table of tables) {
    await testDb.query(`DELETE FROM ${table}`);
  }
}

async function runMigrations(db: Pool): Promise<void> {
  // Run all migration files
  const fs = require('fs');
  const path = require('path');
  
  const migrationFiles = [
    'workspace_schema.sql',
    'quiz_gamification_schema.sql',
    'enhanced_logging_system.sql'
  ];

  for (const file of migrationFiles) {
    const migrationPath = path.join(__dirname, '../../migrations', file);
    const migration = fs.readFileSync(migrationPath, 'utf8');
    await db.query(migration);
  }
}
```

### Auth Test Helpers
```typescript
// tests/helpers/auth.ts
import { Page } from '@playwright/test';
import { Pool } from 'pg';
import { hashPassword } from '../../src/utils/password';
import jwt from 'jsonwebtoken';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
}

export async function createTestUser(
  db: Pool,
  userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }
): Promise<TestUser> {
  const passwordHash = await hashPassword(userData.password);
  
  const result = await db.query(`
    INSERT INTO users (email, password_hash, first_name, last_name)
    VALUES ($1, $2, $3, $4)
    RETURNING id, email, first_name, last_name, password_hash, created_at, updated_at
  `, [userData.email, passwordHash, userData.firstName, userData.lastName]);

  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    passwordHash: user.password_hash
  };
}

export async function getAuthToken(user: TestUser): Promise<string> {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
}

export async function loginUser(
  page: Page, 
  email: string, 
  password: string
): Promise<void> {
  await page.goto('/login');
  await page.fill('[data-testid=email]', email);
  await page.fill('[data-testid=password]', password);
  await page.click('[data-testid=submit]');
  await page.waitForURL('/dashboard');
}
```

## Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.tsx'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'client/src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/server.ts',
    '!client/src/index.tsx'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@client/(.*)$': '<rootDir>/client/src/$1'
  },
  testTimeout: 30000
};
```

## Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
  webServer: [
    {
      command: 'npm run server:dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run client:dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
```

## CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: willi_mako_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install client dependencies
        run: cd client && npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Unit tests
        run: npm test -- --coverage
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: willi_mako_test
          TEST_DB_USER: test_user
          TEST_DB_PASSWORD: test_password
          JWT_SECRET: test_secret

      - name: Integration tests
        run: npm run test:integration
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: willi_mako_test
          TEST_DB_USER: test_user
          TEST_DB_PASSWORD: test_password

      - name: Install Playwright
        run: npx playwright install

      - name: E2E tests
        run: npm run test:e2e
        env:
          TEST_DB_HOST: localhost
          TEST_DB_PORT: 5432
          TEST_DB_NAME: willi_mako_test
          TEST_DB_USER: test_user
          TEST_DB_PASSWORD: test_password

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella

      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: test-results
          path: |
            test-results/
            playwright-report/
```

## Coverage Reporting

### Coverage Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:integration": "jest --config jest.integration.config.js",
    "test:e2e": "playwright test",
    "test:all": "npm run test:coverage && npm run test:integration && npm run test:e2e"
  }
}
```

## Test Metrics

### Coverage Targets
- **Unit Tests**: 90% Line Coverage, 85% Branch Coverage
- **Integration Tests**: 80% Critical Path Coverage
- **E2E Tests**: 70% User Journey Coverage

### Performance Targets
- **Unit Tests**: < 100ms per test
- **Integration Tests**: < 1s per test
- **E2E Tests**: < 30s per test suite

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No critical security vulnerabilities
- Performance tests must pass
- Code quality checks must pass

## Fazit

Diese umfassende Test-Strategie gewährleistet:
- **Hohe Code-Qualität** durch extensive Test-Coverage
- **Zuverlässige Deployments** durch automatisierte Tests
- **Regression-Prevention** durch umfassende Test-Suites
- **Performance-Monitoring** durch Performance-Tests
- **Benutzer-Zufriedenheit** durch E2E-Tests
