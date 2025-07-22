# Feature Development Template

## Überblick

Dieses Template bietet eine strukturierte Anleitung für die Entwicklung neuer Features im Willi Mako Projekt. Es gewährleistet Konsistenz, Qualität und vollständige Dokumentation aller neuen Funktionalitäten.

## Feature Planning Phase

### 1. Feature Definition

#### Feature Request Template
```markdown
# Feature Request: [Feature Name]

## Beschreibung
Kurze Beschreibung der gewünschten Funktionalität.

## Business Value
- Warum ist dieses Feature wichtig?
- Welchen Nutzen bringt es den Benutzern?
- Wie passt es in die Gesamtvision?

## User Stories
### Story 1
**Als** [Benutzertyp]
**möchte ich** [Funktionalität]
**damit** [Nutzen/Ziel]

**Akzeptanzkriterien:**
- [ ] Kriterium 1
- [ ] Kriterium 2
- [ ] Kriterium 3

### Story 2
[Weitere Stories...]

## Requirements
### Funktionale Anforderungen
- [ ] Anforderung 1
- [ ] Anforderung 2

### Nicht-funktionale Anforderungen
- [ ] Performance: [Spezifikation]
- [ ] Sicherheit: [Anforderungen]
- [ ] Usability: [Standards]

## Constraints
- Technische Einschränkungen
- Zeitlimits
- Ressourcenbeschränkungen
```

### 2. Technical Design

#### Design Document Template
```markdown
# Technical Design: [Feature Name]

## Architecture Overview
### System Components
- Frontend Components
- Backend Services
- Database Changes
- External Dependencies

### Data Flow
```
User → Frontend → API → Service → Repository → Database
```

## Database Design
### New Tables
```sql
-- Beispiel: neue Tabelle
CREATE TABLE feature_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Schema Changes
- Neue Spalten
- Index-Änderungen
- Migration Scripts

## API Design
### Endpoints
```typescript
// GET /api/feature/:id
interface FeatureResponse {
  id: string;
  data: FeatureData;
  metadata: FeatureMetadata;
}

// POST /api/feature
interface CreateFeatureRequest {
  data: FeatureData;
  options?: FeatureOptions;
}
```

## Security Considerations
- Authentication requirements
- Authorization rules
- Input validation
- Data protection

## Performance Considerations
- Expected load
- Caching strategy
- Database optimization
- Frontend optimization
```

## Implementation Phase

### 3. Backend Development

#### Module Structure Setup
```bash
# 1. Erstelle Modul-Struktur
mkdir -p src/modules/[feature-name]/{interfaces,repositories,services}

# 2. Basis-Dateien erstellen
touch src/modules/[feature-name]/interfaces/[feature].interface.ts
touch src/modules/[feature-name]/interfaces/[feature].repository.interface.ts
touch src/modules/[feature-name]/interfaces/[feature].service.interface.ts
touch src/modules/[feature-name]/repositories/postgres-[feature].repository.ts
touch src/modules/[feature-name]/services/[feature].service.ts
```

#### Interface Definition
```typescript
// src/modules/[feature-name]/interfaces/[feature].interface.ts
export interface Feature {
  id: string;
  userId: string;
  data: FeatureData;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureData {
  title: string;
  description?: string;
  settings: FeatureSettings;
}

export interface FeatureSettings {
  enabled: boolean;
  options: Record<string, unknown>;
}

// Repository Interface
export interface FeatureRepository {
  findById(id: string): Promise<Feature | null>;
  findByUserId(userId: string): Promise<Feature[]>;
  create(data: CreateFeatureDto): Promise<Feature>;
  update(id: string, data: UpdateFeatureDto): Promise<Feature>;
  delete(id: string): Promise<void>;
}

// Service Interface
export interface FeatureService {
  getFeature(id: string): Promise<Feature>;
  getUserFeatures(userId: string): Promise<Feature[]>;
  createFeature(userId: string, data: CreateFeatureDto): Promise<Feature>;
  updateFeature(id: string, data: UpdateFeatureDto): Promise<Feature>;
  deleteFeature(id: string): Promise<void>;
}
```

#### Repository Implementation
```typescript
// src/modules/[feature-name]/repositories/postgres-[feature].repository.ts
import { Pool } from 'pg';
import { FeatureRepository, Feature, CreateFeatureDto, UpdateFeatureDto } from '../interfaces/[feature].interface';

export class PostgresFeatureRepository implements FeatureRepository {
  constructor(private db: Pool) {}

  async findById(id: string): Promise<Feature | null> {
    const query = `
      SELECT id, user_id, data, created_at, updated_at 
      FROM features 
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToFeature(result.rows[0]);
  }

  async findByUserId(userId: string): Promise<Feature[]> {
    const query = `
      SELECT id, user_id, data, created_at, updated_at 
      FROM features 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows.map(row => this.mapRowToFeature(row));
  }

  async create(data: CreateFeatureDto): Promise<Feature> {
    const query = `
      INSERT INTO features (user_id, data)
      VALUES ($1, $2)
      RETURNING id, user_id, data, created_at, updated_at
    `;

    const result = await this.db.query(query, [
      data.userId,
      JSON.stringify(data.data)
    ]);

    return this.mapRowToFeature(result.rows[0]);
  }

  async update(id: string, data: UpdateFeatureDto): Promise<Feature> {
    const query = `
      UPDATE features 
      SET data = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING id, user_id, data, created_at, updated_at
    `;

    const result = await this.db.query(query, [
      id,
      JSON.stringify(data.data)
    ]);

    if (result.rows.length === 0) {
      throw new Error(`Feature with ID ${id} not found`);
    }

    return this.mapRowToFeature(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM features WHERE id = $1';
    const result = await this.db.query(query, [id]);

    if (result.rowCount === 0) {
      throw new Error(`Feature with ID ${id} not found`);
    }
  }

  private mapRowToFeature(row: any): Feature {
    return {
      id: row.id,
      userId: row.user_id,
      data: row.data,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}
```

#### Service Implementation
```typescript
// src/modules/[feature-name]/services/[feature].service.ts
import { FeatureService, FeatureRepository, Feature, CreateFeatureDto, UpdateFeatureDto } from '../interfaces/[feature].interface';
import { Logger } from '../../../core/logging/logger.interface';
import { ValidationError, NotFoundError } from '../../../utils/errors';

export class FeatureServiceImpl implements FeatureService {
  constructor(
    private featureRepository: FeatureRepository,
    private logger: Logger
  ) {}

  async getFeature(id: string): Promise<Feature> {
    this.logger.debug('Getting feature', { featureId: id });

    const feature = await this.featureRepository.findById(id);
    
    if (!feature) {
      throw new NotFoundError(`Feature with ID ${id} not found`);
    }

    return feature;
  }

  async getUserFeatures(userId: string): Promise<Feature[]> {
    this.logger.debug('Getting user features', { userId });

    return await this.featureRepository.findByUserId(userId);
  }

  async createFeature(userId: string, data: CreateFeatureDto): Promise<Feature> {
    this.logger.debug('Creating feature', { userId, data });

    // Validation
    this.validateFeatureData(data);

    // Business Logic
    const featureData = {
      ...data,
      userId
    };

    const feature = await this.featureRepository.create(featureData);

    this.logger.info('Feature created', { 
      featureId: feature.id, 
      userId: feature.userId 
    });

    return feature;
  }

  async updateFeature(id: string, data: UpdateFeatureDto): Promise<Feature> {
    this.logger.debug('Updating feature', { featureId: id, data });

    // Check if feature exists
    await this.getFeature(id);

    // Validation
    this.validateFeatureData(data);

    const feature = await this.featureRepository.update(id, data);

    this.logger.info('Feature updated', { featureId: feature.id });

    return feature;
  }

  async deleteFeature(id: string): Promise<void> {
    this.logger.debug('Deleting feature', { featureId: id });

    // Check if feature exists
    await this.getFeature(id);

    await this.featureRepository.delete(id);

    this.logger.info('Feature deleted', { featureId: id });
  }

  private validateFeatureData(data: Partial<CreateFeatureDto>): void {
    if (data.data?.title && data.data.title.trim().length === 0) {
      throw new ValidationError('Title cannot be empty', 'title', data.data.title);
    }

    // Weitere Validierungen...
  }
}
```

#### Route Implementation
```typescript
// src/routes/[feature].ts
import { Router, Request, Response, NextFunction } from 'express';
import { FeatureService } from '../modules/[feature-name]/interfaces/[feature].interface';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();

// GET /api/feature/:id
router.get('/:id', requireAuth, async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const feature = await featureService.getFeature(req.params.id);
    res.json(feature);
  } catch (error) {
    next(error);
  }
});

// GET /api/feature/user/:userId
router.get('/user/:userId', requireAuth, async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const features = await featureService.getUserFeatures(req.params.userId);
    res.json(features);
  } catch (error) {
    next(error);
  }
});

// POST /api/feature
router.post('/', requireAuth, validateRequest(createFeatureSchema), async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const feature = await featureService.createFeature(
      req.user!.id,
      req.body
    );
    res.status(201).json(feature);
  } catch (error) {
    next(error);
  }
});

// PUT /api/feature/:id
router.put('/:id', requireAuth, validateRequest(updateFeatureSchema), async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const feature = await featureService.updateFeature(
      req.params.id,
      req.body
    );
    res.json(feature);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/feature/:id
router.delete('/:id', requireAuth, async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    await featureService.deleteFeature(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

### 4. Frontend Development

#### Component Structure
```bash
# Erstelle Component-Struktur
mkdir -p client/src/components/[FeatureName]
touch client/src/components/[FeatureName]/index.ts
touch client/src/components/[FeatureName]/[FeatureName].tsx
touch client/src/components/[FeatureName]/[FeatureName].module.css
touch client/src/components/[FeatureName]/[FeatureName].test.tsx
```

#### API Service
```typescript
// client/src/services/[feature]Api.ts
import { apiClient } from './apiClient';
import { Feature, CreateFeatureDto, UpdateFeatureDto } from '../types/[feature]';

export const featureApi = {
  getFeature: async (id: string): Promise<Feature> => {
    const response = await apiClient.get(`/feature/${id}`);
    return response.data;
  },

  getUserFeatures: async (userId: string): Promise<Feature[]> => {
    const response = await apiClient.get(`/feature/user/${userId}`);
    return response.data;
  },

  createFeature: async (data: CreateFeatureDto): Promise<Feature> => {
    const response = await apiClient.post('/feature', data);
    return response.data;
  },

  updateFeature: async (id: string, data: UpdateFeatureDto): Promise<Feature> => {
    const response = await apiClient.put(`/feature/${id}`, data);
    return response.data;
  },

  deleteFeature: async (id: string): Promise<void> => {
    await apiClient.delete(`/feature/${id}`);
  }
};
```

#### React Component
```typescript
// client/src/components/[FeatureName]/[FeatureName].tsx
import React, { useState, useEffect } from 'react';
import { Feature, CreateFeatureDto } from '../../types/[feature]';
import { featureApi } from '../../services/[feature]Api';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import styles from './[FeatureName].module.css';

interface FeatureNameProps {
  userId?: string;
  onFeatureCreated?: (feature: Feature) => void;
}

export const FeatureName: React.FC<FeatureNameProps> = ({
  userId,
  onFeatureCreated
}) => {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState<CreateFeatureDto>({
    data: {
      title: '',
      description: '',
      settings: {
        enabled: true,
        options: {}
      }
    }
  });

  useEffect(() => {
    if (userId || user?.id) {
      loadFeatures();
    }
  }, [userId, user?.id]);

  const loadFeatures = async () => {
    try {
      setLoading(true);
      const targetUserId = userId || user?.id;
      if (targetUserId) {
        const userFeatures = await featureApi.getUserFeatures(targetUserId);
        setFeatures(userFeatures);
      }
    } catch (error) {
      showSnackbar('Fehler beim Laden der Features', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setCreating(true);
      const feature = await featureApi.createFeature(formData);
      
      setFeatures(prev => [feature, ...prev]);
      setFormData({
        data: {
          title: '',
          description: '',
          settings: {
            enabled: true,
            options: {}
          }
        }
      });
      
      showSnackbar('Feature erfolgreich erstellt', 'success');
      onFeatureCreated?.(feature);
    } catch (error) {
      showSnackbar('Fehler beim Erstellen des Features', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (featureId: string) => {
    try {
      await featureApi.deleteFeature(featureId);
      setFeatures(prev => prev.filter(f => f.id !== featureId));
      showSnackbar('Feature gelöscht', 'success');
    } catch (error) {
      showSnackbar('Fehler beim Löschen des Features', 'error');
    }
  };

  if (loading) {
    return <div className={styles.loading}>Lädt Features...</div>;
  }

  return (
    <div className={styles.container}>
      <h2>Features</h2>
      
      {/* Create Form */}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title">Titel</label>
          <input
            id="title"
            type="text"
            value={formData.data.title}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              data: { ...prev.data, title: e.target.value }
            }))}
            required
          />
        </div>
        
        <div className={styles.formGroup}>
          <label htmlFor="description">Beschreibung</label>
          <textarea
            id="description"
            value={formData.data.description}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              data: { ...prev.data, description: e.target.value }
            }))}
          />
        </div>
        
        <button 
          type="submit" 
          disabled={creating}
          className={styles.submitButton}
        >
          {creating ? 'Erstelle...' : 'Feature erstellen'}
        </button>
      </form>

      {/* Features List */}
      <div className={styles.featuresList}>
        {features.length === 0 ? (
          <p>Keine Features vorhanden.</p>
        ) : (
          features.map(feature => (
            <div key={feature.id} className={styles.featureCard}>
              <h3>{feature.data.title}</h3>
              {feature.data.description && (
                <p>{feature.data.description}</p>
              )}
              <div className={styles.featureActions}>
                <button 
                  onClick={() => handleDelete(feature.id)}
                  className={styles.deleteButton}
                >
                  Löschen
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

#### CSS Styles
```css
/* client/src/components/[FeatureName]/[FeatureName].module.css */
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #666;
}

.form {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.formGroup {
  margin-bottom: 16px;
}

.formGroup label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
}

.formGroup input,
.formGroup textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.formGroup textarea {
  min-height: 80px;
  resize: vertical;
}

.submitButton {
  background: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.submitButton:hover {
  background: #0056b3;
}

.submitButton:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.featuresList {
  display: grid;
  gap: 16px;
}

.featureCard {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
}

.featureCard h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.featureCard p {
  margin: 0 0 16px 0;
  color: #666;
}

.featureActions {
  display: flex;
  gap: 8px;
}

.deleteButton {
  background: #dc3545;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.deleteButton:hover {
  background: #c82333;
}
```

### 5. Database Migration

#### Migration Script
```sql
-- migrations/[timestamp]_create_[feature]_table.sql
-- Migration: Add [Feature] functionality
-- Date: [Current Date]
-- Author: [Developer Name]

-- Create features table
CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_features_user_id ON features(user_id);
CREATE INDEX IF NOT EXISTS idx_features_created_at ON features(created_at);
CREATE INDEX IF NOT EXISTS idx_features_data_gin ON features USING gin(data);

-- Add comments
COMMENT ON TABLE features IS 'Stores feature data for users';
COMMENT ON COLUMN features.id IS 'Unique identifier for the feature';
COMMENT ON COLUMN features.user_id IS 'Reference to the user who owns this feature';
COMMENT ON COLUMN features.data IS 'JSON data containing feature information';
COMMENT ON COLUMN features.created_at IS 'Timestamp when the feature was created';
COMMENT ON COLUMN features.updated_at IS 'Timestamp when the feature was last updated';

-- Insert audit log entry
INSERT INTO system_logs (level, message, metadata, created_at)
VALUES (
  'info',
  'Database migration completed: create_features_table',
  '{"migration": "create_features_table", "version": "1.0"}',
  NOW()
);
```

## Testing Phase

### 6. Unit Tests

#### Backend Tests
```typescript
// src/modules/[feature-name]/services/[feature].service.test.ts
import { FeatureServiceImpl } from './[feature].service';
import { FeatureRepository } from '../interfaces/[feature].interface';
import { Logger } from '../../../core/logging/logger.interface';
import { NotFoundError, ValidationError } from '../../../utils/errors';

describe('FeatureService', () => {
  let featureService: FeatureServiceImpl;
  let mockRepository: jest.Mocked<FeatureRepository>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };

    featureService = new FeatureServiceImpl(mockRepository, mockLogger);
  });

  describe('getFeature', () => {
    it('should return feature when found', async () => {
      // Arrange
      const featureId = 'feature-123';
      const expectedFeature = {
        id: featureId,
        userId: 'user-123',
        data: { title: 'Test Feature' },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      mockRepository.findById.mockResolvedValue(expectedFeature);

      // Act
      const result = await featureService.getFeature(featureId);

      // Assert
      expect(result).toEqual(expectedFeature);
      expect(mockRepository.findById).toHaveBeenCalledWith(featureId);
    });

    it('should throw NotFoundError when feature not found', async () => {
      // Arrange
      const featureId = 'non-existent';
      mockRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(featureService.getFeature(featureId))
        .rejects
        .toThrow(NotFoundError);
    });
  });

  describe('createFeature', () => {
    it('should create feature with valid data', async () => {
      // Arrange
      const userId = 'user-123';
      const createData = {
        data: {
          title: 'New Feature',
          description: 'Feature description',
          settings: { enabled: true, options: {} }
        }
      };
      
      const expectedFeature = {
        id: 'feature-123',
        userId,
        ...createData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.create.mockResolvedValue(expectedFeature);

      // Act
      const result = await featureService.createFeature(userId, createData);

      // Assert
      expect(result).toEqual(expectedFeature);
      expect(mockRepository.create).toHaveBeenCalledWith({
        ...createData,
        userId
      });
    });

    it('should throw ValidationError for empty title', async () => {
      // Arrange
      const userId = 'user-123';
      const createData = {
        data: {
          title: '',
          settings: { enabled: true, options: {} }
        }
      };

      // Act & Assert
      await expect(featureService.createFeature(userId, createData))
        .rejects
        .toThrow(ValidationError);
    });
  });
});
```

#### Frontend Tests
```typescript
// client/src/components/[FeatureName]/[FeatureName].test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeatureName } from './[FeatureName]';
import { featureApi } from '../../services/[feature]Api';
import { AuthContext } from '../../contexts/AuthContext';
import { SnackbarContext } from '../../contexts/SnackbarContext';

// Mock API
jest.mock('../../services/[feature]Api');
const mockFeatureApi = featureApi as jest.Mocked<typeof featureApi>;

// Mock contexts
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

describe('FeatureName Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render feature creation form', () => {
    // Arrange
    mockFeatureApi.getUserFeatures.mockResolvedValue([]);

    // Act
    renderWithContext(<FeatureName />);

    // Assert
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByLabelText('Titel')).toBeInTheDocument();
    expect(screen.getByLabelText('Beschreibung')).toBeInTheDocument();
    expect(screen.getByText('Feature erstellen')).toBeInTheDocument();
  });

  it('should load and display user features', async () => {
    // Arrange
    const mockFeatures = [
      {
        id: 'feature-1',
        userId: 'user-123',
        data: {
          title: 'Test Feature 1',
          description: 'Description 1',
          settings: { enabled: true, options: {} }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'feature-2',
        userId: 'user-123',
        data: {
          title: 'Test Feature 2',
          settings: { enabled: true, options: {} }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockFeatureApi.getUserFeatures.mockResolvedValue(mockFeatures);

    // Act
    renderWithContext(<FeatureName />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Test Feature 1')).toBeInTheDocument();
      expect(screen.getByText('Description 1')).toBeInTheDocument();
      expect(screen.getByText('Test Feature 2')).toBeInTheDocument();
    });

    expect(mockFeatureApi.getUserFeatures).toHaveBeenCalledWith('user-123');
  });

  it('should create new feature when form is submitted', async () => {
    // Arrange
    const newFeature = {
      id: 'feature-new',
      userId: 'user-123',
      data: {
        title: 'New Feature',
        description: 'New description',
        settings: { enabled: true, options: {} }
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockFeatureApi.getUserFeatures.mockResolvedValue([]);
    mockFeatureApi.createFeature.mockResolvedValue(newFeature);

    renderWithContext(<FeatureName />);

    // Act
    fireEvent.change(screen.getByLabelText('Titel'), {
      target: { value: 'New Feature' }
    });
    fireEvent.change(screen.getByLabelText('Beschreibung'), {
      target: { value: 'New description' }
    });
    fireEvent.click(screen.getByText('Feature erstellen'));

    // Assert
    await waitFor(() => {
      expect(mockFeatureApi.createFeature).toHaveBeenCalledWith({
        data: {
          title: 'New Feature',
          description: 'New description',
          settings: { enabled: true, options: {} }
        }
      });
    });

    expect(mockSnackbarContext.showSnackbar).toHaveBeenCalledWith(
      'Feature erfolgreich erstellt',
      'success'
    );
  });

  it('should delete feature when delete button is clicked', async () => {
    // Arrange
    const mockFeatures = [
      {
        id: 'feature-1',
        userId: 'user-123',
        data: {
          title: 'Test Feature',
          settings: { enabled: true, options: {} }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    mockFeatureApi.getUserFeatures.mockResolvedValue(mockFeatures);
    mockFeatureApi.deleteFeature.mockResolvedValue();

    renderWithContext(<FeatureName />);

    await waitFor(() => {
      expect(screen.getByText('Test Feature')).toBeInTheDocument();
    });

    // Act
    fireEvent.click(screen.getByText('Löschen'));

    // Assert
    await waitFor(() => {
      expect(mockFeatureApi.deleteFeature).toHaveBeenCalledWith('feature-1');
    });

    expect(mockSnackbarContext.showSnackbar).toHaveBeenCalledWith(
      'Feature gelöscht',
      'success'
    );
  });
});
```

### 7. Integration Tests

#### API Integration Tests
```typescript
// tests/integration/[feature].integration.test.ts
import request from 'supertest';
import { app } from '../../src/server';
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database';
import { createTestUser, getAuthToken } from '../helpers/auth';

describe('Feature API Integration', () => {
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  beforeEach(async () => {
    const user = await createTestUser();
    userId = user.id;
    authToken = await getAuthToken(user);
  });

  describe('POST /api/feature', () => {
    it('should create new feature', async () => {
      // Arrange
      const featureData = {
        data: {
          title: 'Integration Test Feature',
          description: 'Test description',
          settings: {
            enabled: true,
            options: { test: true }
          }
        }
      };

      // Act
      const response = await request(app)
        .post('/api/feature')
        .set('Authorization', `Bearer ${authToken}`)
        .send(featureData)
        .expect(201);

      // Assert
      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId,
        data: featureData.data,
        createdAt: expect.any(String),
        updatedAt: expect.any(String)
      });
    });

    it('should return 400 for invalid data', async () => {
      // Arrange
      const invalidData = {
        data: {
          title: '', // Empty title should fail validation
          settings: { enabled: true, options: {} }
        }
      };

      // Act & Assert
      await request(app)
        .post('/api/feature')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      // Arrange
      const featureData = {
        data: {
          title: 'Test Feature',
          settings: { enabled: true, options: {} }
        }
      };

      // Act & Assert
      await request(app)
        .post('/api/feature')
        .send(featureData)
        .expect(401);
    });
  });

  describe('GET /api/feature/:id', () => {
    it('should get feature by id', async () => {
      // Arrange - Create a feature first
      const createResponse = await request(app)
        .post('/api/feature')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          data: {
            title: 'Test Feature',
            settings: { enabled: true, options: {} }
          }
        });

      const featureId = createResponse.body.id;

      // Act
      const response = await request(app)
        .get(`/api/feature/${featureId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.id).toBe(featureId);
      expect(response.body.data.title).toBe('Test Feature');
    });

    it('should return 404 for non-existent feature', async () => {
      // Act & Assert
      await request(app)
        .get('/api/feature/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
```

## Documentation Phase

### 8. API Documentation

#### OpenAPI/Swagger Documentation
```yaml
# docs/api/[feature]-api.yaml
paths:
  /api/feature:
    post:
      summary: Create new feature
      tags:
        - Features
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateFeatureRequest'
      responses:
        '201':
          description: Feature created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Feature'
        '400':
          description: Invalid request data
        '401':
          description: Unauthorized

  /api/feature/{id}:
    get:
      summary: Get feature by ID
      tags:
        - Features
      security:
        - bearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
            format: uuid
      responses:
        '200':
          description: Feature found
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Feature'
        '404':
          description: Feature not found

components:
  schemas:
    Feature:
      type: object
      properties:
        id:
          type: string
          format: uuid
        userId:
          type: string
          format: uuid
        data:
          $ref: '#/components/schemas/FeatureData'
        createdAt:
          type: string
          format: date-time
        updatedAt:
          type: string
          format: date-time

    FeatureData:
      type: object
      properties:
        title:
          type: string
        description:
          type: string
        settings:
          $ref: '#/components/schemas/FeatureSettings'

    FeatureSettings:
      type: object
      properties:
        enabled:
          type: boolean
        options:
          type: object
          additionalProperties: true

    CreateFeatureRequest:
      type: object
      required:
        - data
      properties:
        data:
          $ref: '#/components/schemas/FeatureData'
```

### 9. User Documentation

#### Feature Documentation
```markdown
# [Feature Name] Documentation

## Überblick
Beschreibung der Feature-Funktionalität und ihrer Vorteile.

## Erste Schritte

### Feature erstellen
1. Navigiere zu [URL/Route]
2. Klicke auf "Feature erstellen"
3. Fülle die erforderlichen Felder aus:
   - **Titel**: Eindeutiger Name für das Feature
   - **Beschreibung**: Optionale Beschreibung
4. Klicke auf "Erstellen"

### Feature verwalten
- **Anzeigen**: Alle Features werden in der Übersicht angezeigt
- **Bearbeiten**: Klicke auf ein Feature zum Bearbeiten
- **Löschen**: Verwende den Löschen-Button

## Features im Detail

### Feature-Einstellungen
- **Aktiviert**: Feature ein-/ausschalten
- **Optionen**: Anpassbare Parameter

### Erweiterte Funktionen
- Feature-spezifische Funktionalitäten

## Troubleshooting

### Häufige Probleme
**Problem**: Feature wird nicht angezeigt
**Lösung**: Überprüfe Berechtigungen und lade die Seite neu

**Problem**: Erstellungsfehler
**Lösung**: Validiere alle Eingabefelder
```

## Deployment Phase

### 10. Deployment Checklist

#### Pre-Deployment
```markdown
## Pre-Deployment Checklist

### Code Quality
- [ ] Alle Tests bestehen (Unit, Integration, E2E)
- [ ] Code Review abgeschlossen
- [ ] Linting und Formatierung OK
- [ ] Performance-Tests bestanden
- [ ] Security-Scan durchgeführt

### Documentation
- [ ] API-Dokumentation aktualisiert
- [ ] User-Dokumentation erstellt
- [ ] CHANGELOG.md aktualisiert
- [ ] Migration-Scripts getestet

### Database
- [ ] Migration-Scripts erstellt
- [ ] Backup-Strategie definiert
- [ ] Rollback-Plan erstellt
- [ ] Index-Performance getestet

### Environment
- [ ] Environment-Variablen konfiguriert
- [ ] Secrets aktualisiert
- [ ] Load-Tests durchgeführt
- [ ] Monitoring konfiguriert
```

#### Deployment Steps
```bash
# 1. Database Migration
npm run migrate

# 2. Build Application
npm run build

# 3. Deploy Backend
npm run deploy:backend

# 4. Deploy Frontend
npm run deploy:frontend

# 5. Health Check
npm run health-check

# 6. Smoke Tests
npm run test:smoke
```

### 11. Monitoring Setup

#### Feature Metrics
```typescript
// Monitoring für Feature-Usage
export const featureMetrics = {
  featureCreated: (userId: string, featureType: string) => {
    metrics.increment('feature.created', {
      userId,
      featureType
    });
  },

  featureUsed: (featureId: string, action: string) => {
    metrics.increment('feature.used', {
      featureId,
      action
    });
  },

  featureError: (error: Error, context: object) => {
    metrics.increment('feature.error', {
      errorType: error.constructor.name,
      ...context
    });
  }
};
```

## Post-Deployment

### 12. Success Metrics

#### KPIs definieren
```markdown
## Feature Success Metrics

### Usage Metrics
- Feature-Adoption-Rate
- Tägliche/Wöchentliche aktive Nutzer
- Feature-Retention-Rate
- Durchschnittliche Session-Dauer

### Performance Metrics
- Response-Zeiten
- Error-Rate
- Throughput
- Availability

### Business Metrics
- User-Satisfaction-Score
- Support-Tickets
- Conversion-Rate
- Revenue-Impact
```

#### Monitoring Dashboard
```markdown
## Feature Dashboard

### Real-time Metrics
- Active Users
- Error Rate
- Response Time P95
- Database Performance

### Alerts
- Error Rate > 1%
- Response Time > 2s
- Database Connections > 80%
- Disk Space < 20%
```

## Fazit

Dieses Template gewährleistet:
- **Strukturierte Entwicklung** mit klaren Phasen
- **Qualitätssicherung** durch Tests und Reviews
- **Vollständige Dokumentation** für alle Stakeholder
- **Monitoring und Metriken** für langfristigen Erfolg
- **Best Practices** in allen Bereichen

Verwende dieses Template als Ausgangspunkt für neue Features und passe es an spezifische Anforderungen an.
