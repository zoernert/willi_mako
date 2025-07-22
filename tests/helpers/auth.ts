import jwt from 'jsonwebtoken';

export interface TestUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export function generateTestToken(user: TestUser): string {
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

export function createMockUser(overrides: Partial<TestUser> = {}): TestUser {
  return {
    id: 'test-user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    ...overrides
  };
}

export function createMockAuthContext(user?: TestUser) {
  return {
    user: user || createMockUser(),
    login: jest.fn(),
    logout: jest.fn(),
    loading: false
  };
}

export function createMockSnackbarContext() {
  return {
    showSnackbar: jest.fn(),
    hideSnackbar: jest.fn()
  };
}
