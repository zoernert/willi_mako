# Development Guide

## Überblick

Dieser Guide beschreibt den empfohlenen Entwicklungsworkflow für das Stromhaltig-Projekt. Er basiert auf der modularen Architektur und den etablierten Best Practices.

## Entwicklungsworkflow

### 1. Feature-Entwicklung Workflow

```mermaid
graph LR
    A[Issue/Feature Request] --> B[Branch erstellen]
    B --> C[Module identifizieren]
    C --> D[Interface definieren]
    D --> E[Tests schreiben]
    E --> F[Implementation]
    F --> G[Testing]
    G --> H[Code Review]
    H --> I[Merge]
```

### 2. Branch-Strategy

#### Branch-Typen

```bash
# Feature-Branches
feature/user-authentication
feature/quiz-ai-generation
feature/document-processing

# Bugfix-Branches
bugfix/login-error-handling
bugfix/quiz-scoring-calculation

# Hotfix-Branches (für Production)
hotfix/security-patch
hotfix/critical-database-fix

# Release-Branches
release/v1.2.0
release/v1.3.0
```

#### Branch-Workflow

```bash
# Feature-Branch erstellen
git checkout -b feature/new-feature-name

# Regelmäßig mit main synchronisieren
git fetch origin
git rebase origin/main

# Feature fertigstellen
git push origin feature/new-feature-name
# Pull Request erstellen
```

## Modulare Entwicklung

### 1. Modul-Struktur verstehen

```
src/modules/{domain}/
├── interfaces/          # Contracts & Types
│   ├── {domain}.interface.ts
│   ├── {domain}.repository.interface.ts
│   └── {domain}.service.interface.ts
├── repositories/        # Datenzugriff
│   └── postgres-{domain}.repository.ts
├── services/           # Business Logic
│   └── {domain}.service.ts
└── index.ts           # Module-Export
```

### 2. Neues Modul erstellen

```bash
# Modul-Verzeichnis erstellen
mkdir -p src/modules/my-module/{interfaces,repositories,services}

# Interface-Dateien erstellen
touch src/modules/my-module/interfaces/my-module.interface.ts
touch src/modules/my-module/interfaces/my-module.repository.interface.ts
touch src/modules/my-module/interfaces/my-module.service.interface.ts
```

#### Interface-Template

```typescript
// src/modules/my-module/interfaces/my-module.interface.ts

export interface MyEntity {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface MyEntityCreateRequest {
  name: string;
}

export interface MyEntityUpdateRequest {
  name?: string;
}

export interface MyEntitySearchQuery {
  name?: string;
  limit?: number;
  offset?: number;
}
```

#### Repository Interface Template

```typescript
// src/modules/my-module/interfaces/my-module.repository.interface.ts

import { MyEntity, MyEntityCreateRequest, MyEntityUpdateRequest, MyEntitySearchQuery } from './my-module.interface';

export interface IMyModuleRepository {
  create(data: MyEntityCreateRequest): Promise<MyEntity>;
  getById(id: string): Promise<MyEntity | null>;
  search(query: MyEntitySearchQuery): Promise<MyEntity[]>;
  update(id: string, data: MyEntityUpdateRequest): Promise<MyEntity | null>;
  delete(id: string): Promise<boolean>;
}
```

#### Service Interface Template

```typescript
// src/modules/my-module/interfaces/my-module.service.interface.ts

import { MyEntity, MyEntityCreateRequest, MyEntityUpdateRequest, MyEntitySearchQuery } from './my-module.interface';

export interface IMyModuleService {
  createEntity(data: MyEntityCreateRequest): Promise<MyEntity>;
  getEntity(id: string): Promise<MyEntity>;
  searchEntities(query: MyEntitySearchQuery): Promise<MyEntity[]>;
  updateEntity(id: string, data: MyEntityUpdateRequest): Promise<MyEntity>;
  deleteEntity(id: string): Promise<void>;
}
```

### 3. Repository implementieren

```typescript
// src/modules/my-module/repositories/postgres-my-module.repository.ts

import { IMyModuleRepository } from '../interfaces/my-module.repository.interface';
import { MyEntity, MyEntityCreateRequest, MyEntityUpdateRequest, MyEntitySearchQuery } from '../interfaces/my-module.interface';
import { DatabaseHelper } from '../../../utils/database';
import { getLogger } from '../../../core/logging/logger';

export class PostgresMyModuleRepository implements IMyModuleRepository {
  private logger = getLogger().setContext('MyModuleRepository');

  async create(data: MyEntityCreateRequest): Promise<MyEntity> {
    const query = `
      INSERT INTO my_entities (name, created_at, updated_at)
      VALUES ($1, NOW(), NOW())
      RETURNING *
    `;

    try {
      const result = await DatabaseHelper.executeQuerySingle(query, [data.name]);
      return this.mapRowToEntity(result);
    } catch (error) {
      this.logger.logError(error as Error, 'create');
      throw error;
    }
  }

  // ... weitere Methoden

  private mapRowToEntity(row: any): MyEntity {
    return {
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
```

### 4. Service implementieren

```typescript
// src/modules/my-module/services/my-module.service.ts

import { IMyModuleService } from '../interfaces/my-module.service.interface';
import { IMyModuleRepository } from '../interfaces/my-module.repository.interface';
import { MyEntity, MyEntityCreateRequest, MyEntityUpdateRequest, MyEntitySearchQuery } from '../interfaces/my-module.interface';
import { ValidationUtils } from '../../../utils/validation';
import { NotFoundError, ValidationError } from '../../../utils/errors';
import { getLogger } from '../../../core/logging/logger';

export class MyModuleService implements IMyModuleService {
  private logger = getLogger().setContext('MyModuleService');

  constructor(private repository: IMyModuleRepository) {}

  async createEntity(data: MyEntityCreateRequest): Promise<MyEntity> {
    // Validierung
    if (!ValidationUtils.required(data.name)) {
      throw new ValidationError('Name is required', 'name');
    }

    try {
      const entity = await this.repository.create(data);
      this.logger.info('Entity created', { entityId: entity.id });
      return entity;
    } catch (error) {
      this.logger.logError(error as Error, 'createEntity');
      throw error;
    }
  }

  // ... weitere Methoden
}
```

### 5. Route erstellen

```typescript
// src/routes/my-module.ts

import { Router } from 'express';
import { MyModuleService } from '../modules/my-module/services/my-module.service';
import { PostgresMyModuleRepository } from '../modules/my-module/repositories/postgres-my-module.repository';
import { auth } from '../middleware/auth';
import { ResponseUtils } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Service-Container (in Production: Dependency Injection)
const repository = new PostgresMyModuleRepository();
const service = new MyModuleService(repository);

// Routes
router.post('/', auth, asyncHandler(async (req, res) => {
  const entity = await service.createEntity(req.body);
  return ResponseUtils.created(res, entity);
}));

router.get('/:id', auth, asyncHandler(async (req, res) => {
  const entity = await service.getEntity(req.params.id);
  return ResponseUtils.success(res, entity);
}));

router.get('/', auth, asyncHandler(async (req, res) => {
  const entities = await service.searchEntities(req.query);
  return ResponseUtils.success(res, entities);
}));

router.put('/:id', auth, asyncHandler(async (req, res) => {
  const entity = await service.updateEntity(req.params.id, req.body);
  return ResponseUtils.success(res, entity);
}));

router.delete('/:id', auth, asyncHandler(async (req, res) => {
  await service.deleteEntity(req.params.id);
  return ResponseUtils.noContent(res);
}));

export { router as myModuleRoutes };
```

## Frontend-Entwicklung

### 1. Component-Struktur

```
client/src/
├── components/
│   ├── common/          # Wiederverwendbare Components
│   ├── forms/           # Form Components
│   ├── layout/          # Layout Components
│   └── {domain}/        # Domain-spezifische Components
├── pages/               # Page Components
├── services/            # API Services
├── contexts/            # React Contexts
├── hooks/               # Custom Hooks
└── utils/               # Frontend Utilities
```

### 2. API-Service erstellen

```typescript
// client/src/services/myModuleApi.ts

import { apiClient } from './apiClient';
import { MyEntity, MyEntityCreateRequest, MyEntityUpdateRequest } from '../types/myModule';

export const myModuleApi = {
  // Erstellen
  create: async (data: MyEntityCreateRequest): Promise<MyEntity> => {
    const response = await apiClient.post('/my-module', data);
    return response.data;
  },

  // Abrufen
  getById: async (id: string): Promise<MyEntity> => {
    const response = await apiClient.get(`/my-module/${id}`);
    return response.data;
  },

  // Suchen
  search: async (query: any): Promise<MyEntity[]> => {
    const response = await apiClient.get('/my-module', { params: query });
    return response.data;
  },

  // Aktualisieren
  update: async (id: string, data: MyEntityUpdateRequest): Promise<MyEntity> => {
    const response = await apiClient.put(`/my-module/${id}`, data);
    return response.data;
  },

  // Löschen
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/my-module/${id}`);
  }
};
```

### 3. React Component erstellen

```tsx
// client/src/components/MyModule/MyModuleList.tsx

import React, { useState, useEffect } from 'react';
import { myModuleApi } from '../../services/myModuleApi';
import { MyEntity } from '../../types/myModule';
import { useSnackbar } from '../../contexts/SnackbarContext';

interface MyModuleListProps {
  onEntitySelect?: (entity: MyEntity) => void;
}

export const MyModuleList: React.FC<MyModuleListProps> = ({ onEntitySelect }) => {
  const [entities, setEntities] = useState<MyEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    loadEntities();
  }, []);

  const loadEntities = async () => {
    try {
      setLoading(true);
      const data = await myModuleApi.search({});
      setEntities(data);
    } catch (error) {
      showSnackbar('Failed to load entities', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await myModuleApi.delete(id);
      setEntities(entities.filter(e => e.id !== id));
      showSnackbar('Entity deleted successfully', 'success');
    } catch (error) {
      showSnackbar('Failed to delete entity', 'error');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {entities.map(entity => (
        <div key={entity.id} onClick={() => onEntitySelect?.(entity)}>
          <h3>{entity.name}</h3>
          <button onClick={() => handleDelete(entity.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
};
```

## Testing-Workflow

### 1. Test-Struktur

```
tests/
├── unit/                # Unit Tests
│   ├── modules/
│   │   └── my-module/
│   │       ├── services/
│   │       └── repositories/
├── integration/         # Integration Tests
├── e2e/                # End-to-End Tests
└── fixtures/           # Test Data
```

### 2. Unit Test schreiben

```typescript
// tests/unit/modules/my-module/services/my-module.service.test.ts

import { MyModuleService } from '../../../../../src/modules/my-module/services/my-module.service';
import { IMyModuleRepository } from '../../../../../src/modules/my-module/interfaces/my-module.repository.interface';
import { ValidationError } from '../../../../../src/utils/errors';

describe('MyModuleService', () => {
  let service: MyModuleService;
  let mockRepository: jest.Mocked<IMyModuleRepository>;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      getById: jest.fn(),
      search: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    service = new MyModuleService(mockRepository);
  });

  describe('createEntity', () => {
    it('should create entity successfully', async () => {
      const createData = { name: 'Test Entity' };
      const expectedEntity = { id: '1', name: 'Test Entity', created_at: new Date(), updated_at: new Date() };
      
      mockRepository.create.mockResolvedValue(expectedEntity);

      const result = await service.createEntity(createData);

      expect(result).toEqual(expectedEntity);
      expect(mockRepository.create).toHaveBeenCalledWith(createData);
    });

    it('should throw ValidationError for empty name', async () => {
      const createData = { name: '' };

      await expect(service.createEntity(createData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

### 3. Integration Test schreiben

```typescript
// tests/integration/my-module.test.ts

import request from 'supertest';
import { app } from '../../src/server';
import { DatabaseHelper } from '../../src/utils/database';

describe('MyModule API', () => {
  let authToken: string;

  beforeAll(async () => {
    // Setup test database
    await DatabaseHelper.executeQuery('TRUNCATE my_entities CASCADE');
    
    // Login and get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password' });
    
    authToken = loginResponse.body.token;
  });

  describe('POST /api/my-module', () => {
    it('should create entity', async () => {
      const response = await request(app)
        .post('/api/my-module')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Entity' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('Test Entity');
    });
  });

  describe('GET /api/my-module/:id', () => {
    it('should get entity by id', async () => {
      // First create entity
      const createResponse = await request(app)
        .post('/api/my-module')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Entity' });

      const entityId = createResponse.body.data.id;

      // Then get it
      const response = await request(app)
        .get(`/api/my-module/${entityId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(entityId);
    });
  });
});
```

## Code-Review-Prozess

### 1. Pull Request Checkliste

- [ ] **Branch ist up-to-date** mit main
- [ ] **Tests sind geschrieben** und laufen durch
- [ ] **Code folgt den Coding-Standards**
- [ ] **Dokumentation ist aktualisiert**
- [ ] **Breaking Changes sind dokumentiert**
- [ ] **Security-Considerations sind berücksichtigt**

### 2. Review-Kriterien

#### Code-Qualität
- Lesbarkeit und Verständlichkeit
- Einhaltung der Coding-Standards
- Angemessene Kommentierung
- Error-Handling implementiert

#### Architektur
- Module-Boundaries eingehalten
- Interface-Contracts befolgt
- Dependency Injection verwendet
- Lose Kopplung gewährleistet

#### Testing
- Unit Tests für Business Logic
- Integration Tests für API-Endpunkte
- Edge Cases abgedeckt
- Test-Coverage > 80%

#### Security
- Input-Validierung implementiert
- Authentication/Authorization korrekt
- Sensitive Daten geschützt
- SQL-Injection verhindert

### 3. Review-Workflow

```bash
# Code-Review anfordern
gh pr create --title "Feature: New Module Implementation" --body "Description of changes"

# Review-Kommentare bearbeiten
git add .
git commit -m "Address review comments"
git push origin feature-branch

# Nach Approval mergen
gh pr merge --squash
```

## Performance-Monitoring

### 1. Development-Monitoring

```typescript
// Performance-Tracking im Development
const timer = logger.startTimer('api-request');

try {
  const result = await service.processData(data);
  timer(); // Timing beenden
  return result;
} catch (error) {
  timer(); // Auch bei Fehlern timing beenden
  throw error;
}
```

### 2. Database-Performance

```bash
# Slow Query Monitoring
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Index-Usage prüfen
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes;
```

### 3. Frontend-Performance

```typescript
// React Performance Monitoring
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log('Component render time:', { id, phase, actualDuration });
}

<Profiler id="MyComponent" onRender={onRenderCallback}>
  <MyComponent />
</Profiler>
```

## Debugging

### 1. Backend-Debugging

```bash
# Debug-Modus starten
DEBUG=* npm run server:dev

# Spezifische Module debuggen
DEBUG=app:auth,app:quiz npm run server:dev
```

### 2. Database-Debugging

```typescript
// Query-Logging aktivieren
const result = await DatabaseHelper.executeQuery(query, params, true); // Debug-Flag
```

### 3. Frontend-Debugging

```typescript
// React DevTools verwenden
console.log('Component state:', state);
console.log('API response:', response);

// Network-Requests debuggen
axios.interceptors.request.use(request => {
  console.log('Starting Request:', request);
  return request;
});
```

## Deployment-Workflow

### 1. Environment-Setup

```bash
# Production Environment
NODE_ENV=production
LOG_LEVEL=warn
DATABASE_URL=postgresql://prod_user:secure_password@db-server:5432/stromhaltig_prod

# Staging Environment  
NODE_ENV=staging
LOG_LEVEL=info
DATABASE_URL=postgresql://staging_user:password@staging-db:5432/stromhaltig_staging
```

### 2. Build-Prozess

```bash
# Production Build
npm run build          # Backend TypeScript → JavaScript
npm run build:client   # Frontend React → Static Files

# Deployment
npm start             # Production Server starten
```

### 3. Migration-Workflow

```bash
# Database Migrations vor Deployment
psql -h prod-db -U prod_user -d stromhaltig_prod -f migrations/new_migration.sql

# Rollback-Script bereithalten
psql -h prod-db -U prod_user -d stromhaltig_prod -f rollback/rollback_migration.sql
```

## Best Practices

### 1. Entwicklung
- **Kleine, fokussierte Commits** mit aussagekräftigen Messages
- **Feature-Branches** für jede neue Funktionalität
- **Tests schreiben** vor oder während der Implementation
- **Code-Reviews** für alle Änderungen

### 2. Code-Qualität
- **Interfaces definieren** bevor Implementation
- **Error-Handling** konsequent implementieren
- **Logging** strukturiert und aussagekräftig
- **Performance** von Anfang an berücksichtigen

### 3. Sicherheit
- **Input-Validierung** auf allen Ebenen
- **Secrets** nie in Code committen
- **Authentication** für alle geschützten Endpoints
- **Rate-Limiting** implementieren

### 4. Dokumentation
- **README aktuell halten**
- **API-Änderungen dokumentieren**
- **Breaking Changes** kommunizieren
- **Code kommentieren** wo nötig

Dieser Guide wird kontinuierlich erweitert und aktualisiert. Bei Fragen oder Verbesserungsvorschlägen bitte Issues erstellen oder direkt beitragen!
