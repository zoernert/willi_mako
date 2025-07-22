# Error Handling Guide

## Übersicht

Das System implementiert ein einheitliches Error-Handling mit strukturiertem Logging, um Debugging zu vereinfachen und eine konsistente User Experience zu gewährleisten.

## Error-Hierarchie

### Base Error Classes

```typescript
// src/utils/errors.ts

// Basis-Error-Klasse
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: string;
  public readonly metadata?: Record<string, any>;

  constructor(message: string, statusCode: number = 500, context?: string, metadata?: Record<string, any>) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.context = context;
    this.metadata = metadata;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Spezifische Error-Klassen
export class ValidationError extends AppError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 400, 'validation', { field, value });
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    super(`${resource} not found`, 404, 'not-found', { resource, identifier });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'authorization');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'authorization');
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 409, 'conflict', details);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, query?: string, params?: any[]) {
    super(message, 500, 'database', { query, params });
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, statusCode?: number) {
    super(`${service}: ${message}`, statusCode || 502, 'external-service', { service });
  }
}
```

## Error-Handling-Patterns

### 1. Service-Layer Error Handling

```typescript
// src/modules/user/services/user.service.ts

import { ErrorUtils } from '../../../utils/errors';
import { getLogger } from '../../../core/logging/logger';

export class UserService implements IUserService {
  private logger = getLogger().setContext('UserService');

  async createUser(userData: UserCreateRequest): Promise<User> {
    try {
      // Validierung
      const validation = ValidationUtils.validateUserData(userData);
      if (!validation.isValid) {
        throw new ValidationError(validation.message, validation.field);
      }

      // Business Logic
      const existingUser = await this.repository.getUserByEmail(userData.email);
      if (existingUser) {
        throw new ConflictError('User with this email already exists', { email: userData.email });
      }

      // User erstellen
      const user = await this.repository.createUser(userData);
      
      this.logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;

    } catch (error) {
      // Error-Logging mit Context
      this.logger.logError(error, 'createUser', undefined, { userData: { ...userData, password: '[REDACTED]' } });
      
      // Error-Handling
      throw ErrorUtils.handleServiceError(error, 'Failed to create user');
    }
  }
}
```

### 2. Repository-Layer Error Handling

```typescript
// src/modules/user/repositories/postgres-user.repository.ts

import { DatabaseError } from '../../../utils/errors';
import { getLogger } from '../../../core/logging/logger';

export class PostgresUserRepository implements IUserRepository {
  private logger = getLogger().setContext('UserRepository');

  async createUser(userData: UserCreateRequest): Promise<User> {
    const query = `
      INSERT INTO users (username, email, password_hash, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING *
    `;

    try {
      const startTime = performance.now();
      
      const result = await DatabaseHelper.executeQuerySingle(query, [
        userData.username,
        userData.email,
        userData.passwordHash
      ]);

      const duration = performance.now() - startTime;
      this.logger.logDatabaseQuery(query, duration);

      return this.mapRowToUser(result);

    } catch (error) {
      this.logger.logDatabaseQuery(query, 0, error as Error);
      
      if (error.code === '23505') { // Unique constraint violation
        throw new ConflictError('User already exists', { 
          constraint: error.constraint,
          detail: error.detail 
        });
      }
      
      throw new DatabaseError('Failed to create user', query, [userData.username, userData.email]);
    }
  }
}
```

### 3. Route-Layer Error Handling

```typescript
// src/routes/user.ts

import { ErrorUtils, ResponseUtils } from '../utils';
import { getLogger } from '../core/logging/logger';

export const userRoutes = Router();

userRoutes.post('/users', async (req: Request, res: Response, next: NextFunction) => {
  const logger = getLogger()
    .setContext('UserRoute')
    .setRequestId(req.headers['x-request-id'] as string)
    .setUserId(req.user?.id);

  try {
    const userData = req.body;
    
    logger.info('Creating new user', { email: userData.email });
    
    const user = await userService.createUser(userData);
    
    logger.logUserAction(user.id, 'user-created', { method: 'POST' });
    
    return ResponseUtils.created(res, user, 'User created successfully');

  } catch (error) {
    logger.logError(error as Error, 'createUser');
    next(error); // Weiterleitung an Error-Middleware
  }
});
```

## Error-Middleware

### Global Error Handler

```typescript
// src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { getLogger } from '../core/logging/logger';

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const logger = getLogger()
    .setContext('ErrorHandler')
    .setRequestId(req.headers['x-request-id'] as string)
    .setUserId(req.user?.id);

  // Operational Errors (erwartete Fehler)
  if (error instanceof AppError && error.isOperational) {
    logger.warn('Operational error', {
      message: error.message,
      statusCode: error.statusCode,
      context: error.context,
      metadata: error.metadata,
      path: req.path,
      method: req.method
    });

    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        context: error.context,
        ...(process.env.NODE_ENV === 'development' && { 
          metadata: error.metadata,
          stack: error.stack 
        })
      }
    });
  }

  // Unerwartete Fehler (Programming Errors)
  logger.error('Unexpected error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  // In Production: Generische Fehlermeldung
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(500).json({
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack 
      })
    }
  });
};
```

### 404 Handler

```typescript
// src/middleware/notFoundHandler.ts

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const logger = getLogger().setContext('NotFoundHandler');
  
  logger.warn('Route not found', {
    path: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      path: req.path,
      method: req.method
    }
  });
};
```

## Async Error Handling

### Promise Wrapper

```typescript
// src/utils/asyncHandler.ts

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Verwendung
userRoutes.post('/users', asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.createUser(req.body);
  return ResponseUtils.created(res, user);
}));
```

### Service Error Handler

```typescript
// src/utils/errors.ts (Ergänzung)

export class ErrorUtils {
  static handleServiceError(error: unknown, fallbackMessage: string): never {
    if (error instanceof AppError) {
      throw error; // Re-throw operational errors
    }

    if (error instanceof Error) {
      // Log programming errors
      getLogger().error('Programming error in service', {
        message: error.message,
        stack: error.stack
      });
      
      throw new AppError(fallbackMessage, 500, 'service-error', {
        originalError: error.message
      });
    }

    // Unknown error type
    throw new AppError(fallbackMessage, 500, 'unknown-error');
  }

  static async handleAsyncOperation<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackMessage: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      throw this.handleServiceError(error, fallbackMessage);
    }
  }
}
```

## Validation Error Handling

### Input Validation

```typescript
// src/utils/validation.ts (Ergänzung)

export class ValidationUtils {
  static validateAndThrow<T>(
    data: any,
    schema: any,
    context?: string
  ): T {
    const result = this.validate(data, schema);
    
    if (!result.isValid) {
      throw new ValidationError(
        result.message || 'Validation failed',
        result.field,
        result.value
      );
    }
    
    return data as T;
  }

  static async validateAsync<T>(
    data: any,
    validatorFn: (data: any) => Promise<ValidationResult>
  ): Promise<T> {
    const result = await validatorFn(data);
    
    if (!result.isValid) {
      throw new ValidationError(result.message, result.field, result.value);
    }
    
    return data as T;
  }
}
```

## Plugin Error Handling

### Plugin Error Isolation

```typescript
// src/core/plugins/plugin-registry.ts (Ergänzung)

export class PluginRegistryImpl {
  async executeHook(hookName: string, ...args: any[]): Promise<void> {
    const promises = [];
    
    for (const plugin of this.getActivePlugins()) {
      const hook = (plugin as any)[hookName];
      if (typeof hook === 'function') {
        // Plugin-Fehler isolieren
        const pluginPromise = this.executePluginHookSafely(
          plugin.metadata.name,
          hook,
          plugin,
          args
        );
        promises.push(pluginPromise);
      }
    }

    await Promise.allSettled(promises);
  }

  private async executePluginHookSafely(
    pluginName: string,
    hook: Function,
    plugin: any,
    args: any[]
  ): Promise<void> {
    try {
      await hook.apply(plugin, [...args, this.context]);
    } catch (error) {
      const logger = getLogger().setContext('PluginRegistry');
      
      logger.logError(error as Error, 'plugin-hook-error', undefined, {
        pluginName,
        hookName: hook.name
      });

      // Plugin bei kritischen Fehlern deaktivieren
      if (this.isCriticalPluginError(error)) {
        logger.warn('Deactivating plugin due to critical error', { pluginName });
        await this.deactivate(pluginName);
      }
    }
  }

  private isCriticalPluginError(error: any): boolean {
    // Memory leaks, security violations, etc.
    return error.code === 'CRITICAL_ERROR' || 
           error.message.includes('security') ||
           error.name === 'OutOfMemoryError';
  }
}
```

## Error Monitoring & Alerting

### Error Analytics

```typescript
// src/core/logging/error-analytics.ts

export class ErrorAnalytics {
  static async getErrorStats(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalErrors: number;
    errorsByType: Record<string, number>;
    errorsByContext: Record<string, number>;
    topErrors: Array<{ message: string; count: number; lastOccurred: Date }>;
  }> {
    const timeFilter = this.getTimeFilter(timeRange);
    
    const query = `
      SELECT 
        level,
        context,
        message,
        COUNT(*) as count,
        MAX(timestamp) as last_occurred
      FROM application_logs 
      WHERE level = 'error' AND timestamp >= $1
      GROUP BY level, context, message
      ORDER BY count DESC
    `;

    const result = await DatabaseHelper.executeQuery(query, [timeFilter]);
    
    return {
      totalErrors: result.reduce((sum, row) => sum + parseInt(row.count), 0),
      errorsByType: this.groupByField(result, 'context'),
      errorsByContext: this.groupByField(result, 'context'),
      topErrors: result.slice(0, 10).map(row => ({
        message: row.message,
        count: parseInt(row.count),
        lastOccurred: row.last_occurred
      }))
    };
  }

  static async alertOnErrorSpike(): Promise<void> {
    const recentErrors = await this.getErrorStats('hour');
    const threshold = 50; // Threshold für Error-Spike
    
    if (recentErrors.totalErrors > threshold) {
      const logger = getLogger().setContext('ErrorAnalytics');
      
      logger.error('Error spike detected', {
        totalErrors: recentErrors.totalErrors,
        threshold,
        topErrors: recentErrors.topErrors.slice(0, 5)
      });

      // Alert senden (E-Mail, Slack, etc.)
      await this.sendErrorAlert(recentErrors);
    }
  }
}
```

## Best Practices

### 1. Error Logging

```typescript
// DO: Strukturierte Errors mit Context
logger.logError(error, 'userRegistration', userId, {
  email: userData.email,
  registrationSource: 'web'
});

// DON'T: Unspezifische Errors
console.error('Error:', error);
```

### 2. Sensitive Data Protection

```typescript
// DO: Sensitive Daten redaktieren
const safeUserData = {
  ...userData,
  password: '[REDACTED]',
  creditCard: '[REDACTED]'
};
logger.error('Registration failed', { userData: safeUserData });

// DON'T: Sensitive Daten loggen
logger.error('Registration failed', { userData }); // Kann Passwort enthalten
```

### 3. Error Recovery

```typescript
// DO: Graceful Degradation
try {
  await sendEmail(user.email, 'Welcome');
} catch (error) {
  logger.warn('Failed to send welcome email', { userId: user.id, error: error.message });
  // User trotzdem erstellen, E-Mail später retry
}

// DON'T: Kritische Operationen wegen non-kritischer Fehler stoppen
try {
  const user = await createUser(userData);
  await sendEmail(user.email, 'Welcome'); // Fehler hier sollte User-Erstellung nicht stoppen
} catch (error) {
  throw error; // User-Erstellung fehlgeschlagen wegen E-Mail-Problem
}
```

### 4. Error Boundaries

```typescript
// Frontend Error Boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: any) {
    // Error an Backend-Logging senden
    fetch('/api/client-errors', {
      method: 'POST',
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        url: window.location.href,
        userAgent: navigator.userAgent
      })
    });
  }
}
```

## Testing Error Handling

```typescript
// Error Handling Tests
describe('UserService Error Handling', () => {
  test('should throw ValidationError for invalid email', async () => {
    const invalidUserData = { email: 'invalid-email' };
    
    await expect(userService.createUser(invalidUserData))
      .rejects
      .toThrow(ValidationError);
  });

  test('should handle database errors gracefully', async () => {
    // Mock database error
    jest.spyOn(DatabaseHelper, 'executeQuery').mockRejectedValue(new Error('Connection lost'));
    
    await expect(userService.createUser(validUserData))
      .rejects
      .toThrow(DatabaseError);
  });
});
```

Dieses Error-Handling-System bietet:
- Konsistente Error-Responses
- Strukturiertes Logging für Debugging
- Error-Isolation für Plugins
- Monitoring und Alerting
- Graceful Degradation
- Security durch Data Redaction
