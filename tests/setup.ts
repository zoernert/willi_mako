// Jest setup for all tests
import 'jest-extended';

// Setup environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_testing';
process.env.TEST_DB_NAME = 'willi_mako_test';
process.env.LOG_LEVEL = 'error'; // Suppress logs during testing

// Mock console methods to avoid noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup test timeout
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Any global setup can go here
});

afterAll(async () => {
  // Any global cleanup can go here
});

// Reset mocks between tests
afterEach(() => {
  jest.clearAllMocks();
});
