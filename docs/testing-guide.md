# Testing Guide

## Überblick

Dieser Guide beschreibt die Test-Strategien, Tools und Best Practices für das Stromhaltig-Projekt. Das Testing-Framework basiert auf Jest mit zusätzlichen Tools für Integration- und E2E-Tests.

## Test-Strategie

### Testing-Pyramide

```
       /\
      /  \     E2E Tests (wenige, kritische User-Journeys)
     /____\
    /      \   Integration Tests (API-Endpunkte, Module-Interaktion)
   /________\
  /          \  Unit Tests (Business Logic, Utilities, Components)
 /__________\
```

### Test-Kategorien

1. **Unit Tests** (70%): Einzelne Funktionen, Services, Components
2. **Integration Tests** (20%): API-Endpunkte, Database-Interaktion
3. **E2E Tests** (10%): Kritische User-Workflows

## Test-Setup

### Dependencies installieren

```bash
npm install --save-dev \
  jest \
  @types/jest \
  supertest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  msw \
  ts-jest
```

### Jest-Konfiguration

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/**/*.interface.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000
};
```

### Test-Setup-Datei

```typescript
// tests/setup.ts
import { DatabaseHelper } from '../src/utils/database';
import { createLogger, LogLevel } from '../src/core/logging/logger';

// Logger für Tests konfigurieren
createLogger({
  level: LogLevel.ERROR,
  enableConsole: false,
  enableFile: false,
  enableDatabase: false
});

// Test-Database Setup
beforeAll(async () => {
  // Test-Datenbank initialisieren
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = 'postgresql://test_user:test_password@localhost:5432/stromhaltig_test';
});

afterAll(async () => {
  // Connections schließen
  await DatabaseHelper.closeConnections();
});

// Global Test Utilities
global.mockUser = {
  id: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com'
};
```

## Unit Testing

### 1. Service Unit Tests

```typescript
// tests/unit/modules/user/services/user.service.test.ts
import { UserService } from '../../../../../src/modules/user/services/user.service';
import { IUserRepository } from '../../../../../src/modules/user/interfaces/user.repository.interface';
import { ValidationError, ConflictError } from '../../../../../src/utils/errors';
import { PasswordUtils } from '../../../../../src/utils/password';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = {
      createUser: jest.fn(),
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      validateCredentials: jest.fn()
    };
    userService = new UserService(mockRepository);
  });

  describe('registerUser', () => {
    const validUserData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePassword123!'
    };

    it('should register user successfully', async () => {
      const expectedUser = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockRepository.getUserByEmail.mockResolvedValue(null);
      mockRepository.createUser.mockResolvedValue(expectedUser);

      const result = await userService.registerUser(validUserData);

      expect(result).toEqual(expectedUser);
      expect(mockRepository.getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: expect.any(String)
        })
      );
    });

    it('should throw ValidationError for invalid email', async () => {
      const invalidData = { ...validUserData, email: 'invalid-email' };

      await expect(userService.registerUser(invalidData))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ConflictError for existing email', async () => {
      const existingUser = { id: 'existing-id', email: 'test@example.com' };
      mockRepository.getUserByEmail.mockResolvedValue(existingUser as any);

      await expect(userService.registerUser(validUserData))
        .rejects
        .toThrow(ConflictError);
    });
  });

  describe('authenticateUser', () => {
    it('should authenticate user with valid credentials', async () => {
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: await PasswordUtils.hash('password123')
      };

      mockRepository.getUserByEmail.mockResolvedValue(user as any);
      jest.spyOn(PasswordUtils, 'verify').mockResolvedValue(true);

      const result = await userService.authenticateUser('test@example.com', 'password123');

      expect(result).toEqual(user);
      expect(PasswordUtils.verify).toHaveBeenCalledWith('password123', user.passwordHash);
    });

    it('should throw UnauthorizedError for invalid password', async () => {
      const user = { id: 'user-id', email: 'test@example.com', passwordHash: 'hashed' };
      mockRepository.getUserByEmail.mockResolvedValue(user as any);
      jest.spyOn(PasswordUtils, 'verify').mockResolvedValue(false);

      await expect(userService.authenticateUser('test@example.com', 'wrong-password'))
        .rejects
        .toThrow('Invalid credentials');
    });
  });
});
```

### 2. Repository Unit Tests

```typescript
// tests/unit/modules/user/repositories/postgres-user.repository.test.ts
import { PostgresUserRepository } from '../../../../../src/modules/user/repositories/postgres-user.repository';
import { DatabaseHelper } from '../../../../../src/utils/database';
import { ConflictError, DatabaseError } from '../../../../../src/utils/errors';

jest.mock('../../../../../src/utils/database');

describe('PostgresUserRepository', () => {
  let repository: PostgresUserRepository;
  let mockDatabaseHelper: jest.Mocked<typeof DatabaseHelper>;

  beforeEach(() => {
    mockDatabaseHelper = DatabaseHelper as jest.Mocked<typeof DatabaseHelper>;
    repository = new PostgresUserRepository();
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      };

      const mockDbResult = {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        password_hash: 'hashed-password',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockDatabaseHelper.executeQuerySingle.mockResolvedValue(mockDbResult);

      const result = await repository.createUser(userData);

      expect(result).toEqual({
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        created_at: mockDbResult.created_at,
        updated_at: mockDbResult.updated_at
      });
    });

    it('should throw ConflictError for duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed-password'
      };

      const dbError = new Error('Duplicate key value');
      (dbError as any).code = '23505';
      (dbError as any).constraint = 'users_email_key';

      mockDatabaseHelper.executeQuerySingle.mockRejectedValue(dbError);

      await expect(repository.createUser(userData))
        .rejects
        .toThrow(ConflictError);
    });
  });
});
```

### 3. Utility Unit Tests

```typescript
// tests/unit/utils/validation.test.ts
import { ValidationUtils } from '../../../src/utils/validation';

describe('ValidationUtils', () => {
  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org'
      ];

      validEmails.forEach(email => {
        const result = ValidationUtils.validateEmail(email);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com'
      ];

      invalidEmails.forEach(email => {
        const result = ValidationUtils.validateEmail(email);
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('validateLength', () => {
    it('should validate string length', () => {
      expect(ValidationUtils.validateLength('test', 3, 10).isValid).toBe(true);
      expect(ValidationUtils.validateLength('te', 3, 10).isValid).toBe(false);
      expect(ValidationUtils.validateLength('this is too long string', 3, 10).isValid).toBe(false);
    });
  });
});
```

## Integration Testing

### 1. API Integration Tests

```typescript
// tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/server';
import { DatabaseHelper } from '../../src/utils/database';

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clean test database
    await DatabaseHelper.executeQuery('TRUNCATE users CASCADE');
  });

  describe('POST /api/auth/register', () => {
    it('should register new user', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        username: 'testuser',
        email: 'test@example.com'
      });
      expect(response.body.data.password).toBeUndefined();
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register with same email
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...userData, username: 'differentuser' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.email).toBe('test@example.com');
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    let authToken: string;

    beforeEach(async () => {
      // Register and login
      await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });

      authToken = loginResponse.body.data.token;
    });

    it('should return user profile for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/auth/profile')
        .expect(401);
    });
  });
});
```

### 2. Database Integration Tests

```typescript
// tests/integration/database.test.ts
import { DatabaseHelper } from '../../src/utils/database';

describe('Database Integration', () => {
  describe('DatabaseHelper', () => {
    it('should execute simple query', async () => {
      const result = await DatabaseHelper.executeQuery('SELECT 1 as test');
      expect(result).toHaveLength(1);
      expect(result[0].test).toBe(1);
    });

    it('should execute parameterized query', async () => {
      const result = await DatabaseHelper.executeQuery(
        'SELECT $1::text as message',
        ['Hello World']
      );
      expect(result[0].message).toBe('Hello World');
    });

    it('should handle transaction', async () => {
      await DatabaseHelper.executeTransaction(async (client) => {
        await client.query('CREATE TEMP TABLE test_temp (id serial, name text)');
        await client.query('INSERT INTO test_temp (name) VALUES ($1)', ['test']);
        
        const result = await client.query('SELECT * FROM test_temp');
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0].name).toBe('test');
      });
    });

    it('should rollback transaction on error', async () => {
      try {
        await DatabaseHelper.executeTransaction(async (client) => {
          await client.query('CREATE TEMP TABLE test_rollback (id serial, name text)');
          await client.query('INSERT INTO test_rollback (name) VALUES ($1)', ['test']);
          throw new Error('Simulated error');
        });
      } catch (error) {
        expect(error.message).toBe('Simulated error');
      }

      // Verify table doesn't exist after rollback
      try {
        await DatabaseHelper.executeQuery('SELECT * FROM test_rollback');
        fail('Table should not exist after rollback');
      } catch (error) {
        expect(error.message).toContain('does not exist');
      }
    });
  });
});
```

## Frontend Testing

### 1. React Component Tests

```typescript
// client/src/components/__tests__/UserProfile.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UserProfile } from '../UserProfile';
import { AuthContext } from '../../contexts/AuthContext';
import { userApi } from '../../services/userApi';

jest.mock('../../services/userApi');
const mockUserApi = userApi as jest.Mocked<typeof userApi>;

const mockAuthContext = {
  user: {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com'
  },
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render user information', () => {
    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );

    expect(screen.getByText('testuser')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('should handle profile update', async () => {
    mockUserApi.updateProfile.mockResolvedValue({
      id: 'user-1',
      username: 'updateduser',
      email: 'test@example.com'
    });

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );

    // Click edit button
    fireEvent.click(screen.getByText('Edit Profile'));

    // Update username
    const usernameInput = screen.getByDisplayValue('testuser');
    fireEvent.change(usernameInput, { target: { value: 'updateduser' } });

    // Save changes
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(mockUserApi.updateProfile).toHaveBeenCalledWith('user-1', {
        username: 'updateduser'
      });
    });
  });

  it('should show error message on update failure', async () => {
    mockUserApi.updateProfile.mockRejectedValue(new Error('Update failed'));

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <UserProfile />
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### 2. API Service Tests

```typescript
// client/src/services/__tests__/userApi.test.ts
import { userApi } from '../userApi';
import { apiClient } from '../apiClient';

jest.mock('../apiClient');
const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('userApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('should fetch user profile', async () => {
      const mockUser = { id: 'user-1', username: 'testuser', email: 'test@example.com' };
      mockApiClient.get.mockResolvedValue({ data: mockUser });

      const result = await userApi.getProfile();

      expect(mockApiClient.get).toHaveBeenCalledWith('/auth/profile');
      expect(result).toEqual(mockUser);
    });

    it('should handle API error', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(userApi.getProfile()).rejects.toThrow('Network error');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      const userId = 'user-1';
      const updateData = { username: 'newusername' };
      const updatedUser = { id: userId, username: 'newusername', email: 'test@example.com' };

      mockApiClient.put.mockResolvedValue({ data: updatedUser });

      const result = await userApi.updateProfile(userId, updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith(`/users/${userId}`, updateData);
      expect(result).toEqual(updatedUser);
    });
  });
});
```

## E2E Testing

### 1. Playwright Setup

```bash
npm install --save-dev @playwright/test
npx playwright install
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI
  }
});
```

### 2. E2E Test Examples

```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register and login user', async ({ page }) => {
    // Navigate to registration
    await page.goto('/register');

    // Fill registration form
    await page.fill('[data-testid=username-input]', 'testuser');
    await page.fill('[data-testid=email-input]', 'test@example.com');
    await page.fill('[data-testid=password-input]', 'SecurePassword123!');
    await page.fill('[data-testid=confirm-password-input]', 'SecurePassword123!');

    // Submit registration
    await page.click('[data-testid=register-button]');

    // Should redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid=success-message]')).toContainText('Registration successful');

    // Login with new credentials
    await page.fill('[data-testid=email-input]', 'test@example.com');
    await page.fill('[data-testid=password-input]', 'SecurePassword123!');
    await page.click('[data-testid=login-button]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid=user-menu]')).toContainText('testuser');
  });

  test('should handle login errors', async ({ page }) => {
    await page.goto('/login');

    // Try invalid credentials
    await page.fill('[data-testid=email-input]', 'nonexistent@example.com');
    await page.fill('[data-testid=password-input]', 'wrongpassword');
    await page.click('[data-testid=login-button]');

    // Should show error message
    await expect(page.locator('[data-testid=error-message]')).toContainText('Invalid credentials');
    await expect(page).toHaveURL('/login');
  });
});
```

```typescript
// tests/e2e/document-upload.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Document Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid=email-input]', 'test@example.com');
    await page.fill('[data-testid=password-input]', 'SecurePassword123!');
    await page.click('[data-testid=login-button]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should upload document successfully', async ({ page }) => {
    await page.goto('/documents');

    // Upload file
    await page.setInputFiles('[data-testid=file-input]', 'tests/fixtures/sample.pdf');
    await page.fill('[data-testid=title-input]', 'Test Document');
    await page.fill('[data-testid=description-input]', 'This is a test document');
    await page.click('[data-testid=upload-button]');

    // Should show success message
    await expect(page.locator('[data-testid=success-message]')).toContainText('Document uploaded successfully');

    // Should appear in document list
    await expect(page.locator('[data-testid=document-list]')).toContainText('Test Document');
  });

  test('should handle upload errors', async ({ page }) => {
    await page.goto('/documents');

    // Try to upload without file
    await page.fill('[data-testid=title-input]', 'Test Document');
    await page.click('[data-testid=upload-button]');

    // Should show error
    await expect(page.locator('[data-testid=error-message]')).toContainText('Please select a file');
  });
});
```

## Test-Daten und Mocking

### 1. Test-Fixtures

```typescript
// tests/fixtures/user.ts
export const mockUsers = {
  regular: {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  },
  admin: {
    id: 'admin-1',
    username: 'admin',
    email: 'admin@example.com',
    role: 'admin',
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01')
  }
};

export const mockUserCreateRequest = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'SecurePassword123!'
};
```

### 2. Database Mocking

```typescript
// tests/utils/database-mock.ts
export class DatabaseMock {
  private data: Map<string, any[]> = new Map();

  constructor() {
    this.reset();
  }

  reset(): void {
    this.data.clear();
    this.data.set('users', []);
    this.data.set('documents', []);
    this.data.set('quiz_attempts', []);
  }

  async executeQuery(query: string, params?: any[]): Promise<any[]> {
    // Simple mock implementation for testing
    if (query.includes('SELECT * FROM users')) {
      return this.data.get('users') || [];
    }
    
    if (query.includes('INSERT INTO users')) {
      const user = { id: 'mock-id', ...params };
      this.data.get('users')?.push(user);
      return [user];
    }

    return [];
  }

  insertTestData(table: string, data: any[]): void {
    this.data.set(table, data);
  }
}
```

### 3. API Mocking mit MSW

```typescript
// tests/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login', (req, res, ctx) => {
    const { email, password } = req.body as any;
    
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.json({
          success: true,
          data: {
            token: 'mock-jwt-token',
            user: { id: 'user-1', email: 'test@example.com' }
          }
        })
      );
    }
    
    return res(
      ctx.status(401),
      ctx.json({
        success: false,
        error: { message: 'Invalid credentials' }
      })
    );
  }),

  // User endpoints
  rest.get('/api/auth/profile', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader === 'Bearer mock-jwt-token') {
      return res(
        ctx.json({
          success: true,
          data: { id: 'user-1', username: 'testuser', email: 'test@example.com' }
        })
      );
    }
    
    return res(ctx.status(401));
  })
];
```

## Performance Testing

### 1. Load Testing mit Artillery

```bash
npm install --save-dev artillery
```

```yaml
# artillery.yml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 10
    - duration: 120
      arrivalRate: 50
    - duration: 60
      arrivalRate: 100

scenarios:
  - name: "API Load Test"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
          capture:
            - json: "$.data.token"
              as: "token"
      - get:
          url: "/api/documents"
          headers:
            Authorization: "Bearer {{ token }}"
      - post:
          url: "/api/quiz/1/attempt"
          headers:
            Authorization: "Bearer {{ token }}"
```

### 2. Memory-Leak Detection

```typescript
// tests/performance/memory-leak.test.ts
describe('Memory Leak Detection', () => {
  test('should not leak memory during user operations', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Simulate heavy operations
    for (let i = 0; i < 1000; i++) {
      await userService.createUser({
        username: `user${i}`,
        email: `user${i}@example.com`,
        password: 'password123'
      });
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## Test-Commands

### Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:e2e": "playwright test",
    "test:e2e:headed": "playwright test --headed",
    "test:performance": "artillery run artillery.yml",
    "test:all": "npm run test:unit && npm run test:integration && npm run test:e2e"
  }
}
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: stromhaltig_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run unit tests
        run: npm run test:unit
        
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/stromhaltig_test
          
      - name: Run E2E tests
        run: npm run test:e2e
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test-Coverage

### Coverage-Ziele

- **Unit Tests**: > 80% Coverage
- **Integration Tests**: Alle API-Endpunkte
- **E2E Tests**: Kritische User-Journeys

### Coverage-Reports

```bash
# Generate coverage report
npm run test:coverage

# View HTML report
open coverage/lcov-report/index.html
```

## Best Practices

### 1. Test-Naming

```typescript
// ✅ Good
describe('UserService', () => {
  describe('registerUser', () => {
    it('should create user with valid data', () => {});
    it('should throw ValidationError for invalid email', () => {});
    it('should throw ConflictError for existing email', () => {});
  });
});

// ❌ Bad
describe('UserService', () => {
  it('test1', () => {});
  it('test2', () => {});
});
```

### 2. Test-Isolation

```typescript
// ✅ Good - Isolated tests
beforeEach(() => {
  mockRepository = createMockRepository();
  service = new UserService(mockRepository);
});

// ❌ Bad - Shared state
let service = new UserService(realRepository);
```

### 3. Mocking-Strategy

```typescript
// ✅ Good - Mock external dependencies
jest.mock('../../../utils/database');
jest.mock('../../../external/emailService');

// ❌ Bad - Testing implementation details
expect(mockFunction).toHaveBeenCalledTimes(3);
```

### 4. Assertion-Quality

```typescript
// ✅ Good - Specific assertions
expect(response.body).toMatchObject({
  success: true,
  data: expect.objectContaining({
    email: 'test@example.com'
  })
});

// ❌ Bad - Vague assertions
expect(response.status).toBeTruthy();
```

Das Testing-Framework bietet umfassende Abdeckung aller System-Komponenten und gewährleistet Code-Qualität und Regression-Sicherheit.
