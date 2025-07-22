# Plugin Development Guide

## Übersicht

Das Plugin-System ermöglicht es, die Anwendung einfach um neue Features zu erweitern, ohne den Core-Code zu modifizieren. Plugins können HTTP-Routes, Background-Jobs, UI-Komponenten und Event-Handler hinzufügen.

## Plugin-Architektur

### Plugin Interface

Jedes Plugin muss das `IPlugin` Interface implementieren:

```typescript
interface IPlugin {
  metadata: PluginMetadata;
  initialize(context: PluginContext, api: PluginAPI): Promise<void>;
  activate(): Promise<void>;
  deactivate(): Promise<void>;
}
```

### Plugin-Lebenszyklus

1. **Registration**: Plugin wird registriert
2. **Initialization**: `initialize()` wird aufgerufen
3. **Activation**: `activate()` wird aufgerufen
4. **Runtime**: Plugin ist aktiv und Event-Hooks werden ausgeführt
5. **Deactivation**: `deactivate()` wird aufgerufen
6. **Unregistration**: Plugin wird entfernt

## Plugin erstellen

### 1. Plugin-Verzeichnis erstellen

```bash
mkdir src/plugins/my-plugin
cd src/plugins/my-plugin
```

### 2. package.json erstellen

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "Mein erstes Plugin",
  "main": "index.js",
  "author": "Dein Name",
  "license": "MIT",
  "pluginMetadata": {
    "apiVersion": "1.0.0",
    "dependencies": []
  }
}
```

### 3. Plugin-Klasse implementieren

```typescript
// index.js
import { IPlugin, PluginMetadata, PluginContext, PluginAPI } from '../../core/plugins/plugin.interface';

export class MyPlugin implements IPlugin {
  metadata: PluginMetadata = {
    name: 'my-plugin',
    version: '1.0.0',
    description: 'Mein erstes Plugin',
    author: 'Dein Name',
    apiVersion: '1.0.0',
    dependencies: []
  };

  async initialize(context: PluginContext, api: PluginAPI): Promise<void> {
    // Plugin-Routes registrieren
    api.addRoute('GET', '/my-plugin/status', this.getStatus.bind(this));
    
    // Dashboard-Widget hinzufügen
    api.addDashboardWidget({
      id: 'my-widget',
      title: 'Mein Widget',
      component: 'MyWidget',
      position: 'sidebar'
    });
  }

  async activate(): Promise<void> {
    console.log('My Plugin activated');
  }

  async deactivate(): Promise<void> {
    console.log('My Plugin deactivated');
  }

  private async getStatus(req: any, res: any): Promise<void> {
    res.json({ status: 'active', plugin: this.metadata.name });
  }
}

module.exports = MyPlugin;
```

## Plugin-API

### HTTP-Routes

```typescript
// GET Route
api.addRoute('GET', '/my-endpoint', (req, res) => {
  res.json({ message: 'Hello from plugin' });
});

// POST Route mit Middleware
api.addRoute('POST', '/my-endpoint', async (req, res) => {
  const data = req.body;
  // Verarbeitung...
  res.json({ result: 'success' });
});

// Middleware hinzufügen
api.addMiddleware((req, res, next) => {
  // Plugin-spezifische Middleware-Logik
  next();
});
```

### UI-Erweiterungen

```typescript
// Dashboard-Widget
api.addDashboardWidget({
  id: 'analytics-widget',
  title: 'Analytics',
  component: 'AnalyticsWidget',
  position: 'top', // 'top', 'sidebar', 'bottom'
  permissions: ['admin'] // Optional
});

// Settings-Seite
api.addSettingsPage({
  id: 'my-settings',
  title: 'Plugin Settings',
  icon: 'settings',
  component: 'MySettingsPage',
  permissions: ['admin']
});

// Menü-Item
api.addMenuItem({
  id: 'my-menu',
  label: 'My Plugin',
  icon: 'extension',
  route: '/my-plugin',
  position: 'main', // 'main', 'admin', 'user'
  permissions: ['user']
});
```

### Background-Jobs

```typescript
// Geplante Jobs (Cron-Format)
api.scheduleJob('cleanup-job', '0 2 * * *', async () => {
  console.log('Running daily cleanup');
  // Cleanup-Logik...
});

// Worker für Queue-Verarbeitung
api.addWorker('email-worker', async (data) => {
  console.log('Processing email:', data);
  // E-Mail-Versand-Logik...
});
```

### Datenbank-Migrationen

```typescript
api.addMigration(`
  CREATE TABLE my_plugin_data (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );
`);
```

## Event-Hooks

### User-Events

```typescript
async onUserCreated(user: any, context: PluginContext): Promise<void> {
  console.log('New user registered:', user.username);
  // Welcome-E-Mail senden, Default-Einstellungen setzen, etc.
}

async onUserLogin(user: any, context: PluginContext): Promise<void> {
  console.log('User logged in:', user.username);
  // Login-Analytics, Sicherheitschecks, etc.
}
```

### Document-Events

```typescript
async onDocumentUploaded(document: any, context: PluginContext): Promise<void> {
  console.log('Document uploaded:', document.title);
  // Auto-Tagging, Virus-Scan, OCR, etc.
}

async onDocumentProcessed(document: any, context: PluginContext): Promise<void> {
  // Notification senden, Index aktualisieren, etc.
}
```

### Quiz-Events

```typescript
async onQuizAttemptCompleted(attempt: any, context: PluginContext): Promise<void> {
  console.log('Quiz completed with score:', attempt.score);
  // Achievement-System, Performance-Analytics, etc.
}
```

## Plugin-Context

Der Context bietet Zugriff auf Core-Services:

```typescript
async someMethod(context: PluginContext): Promise<void> {
  // Database-Zugriff
  const result = await context.database.executeQuery('SELECT * FROM users');
  
  // Logging
  context.logger.info('Plugin operation completed');
  
  // Event-System
  context.emit('my-event', { data: 'test' });
  context.on('other-event', (data) => {
    console.log('Received event:', data);
  });
  
  // Konfiguration
  const apiKey = context.config.get('myPlugin.apiKey');
}
```

## Plugin-Konfiguration

### Default-Konfiguration

```typescript
getDefaultConfig(): Record<string, any> {
  return {
    enabled: true,
    apiKey: '',
    maxItems: 100,
    settings: {
      notifications: true,
      theme: 'default'
    }
  };
}
```

### Konfiguration validieren

```typescript
validateConfig(config: Record<string, any>): boolean {
  if (!config.apiKey || typeof config.apiKey !== 'string') {
    return false;
  }
  
  if (config.maxItems && (typeof config.maxItems !== 'number' || config.maxItems < 1)) {
    return false;
  }
  
  return true;
}
```

## Health Checks

```typescript
async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
  try {
    // Plugin-spezifische Health Checks
    const apiResponse = await fetch('https://external-api.com/status');
    
    if (!apiResponse.ok) {
      return { status: 'unhealthy', message: 'External API not available' };
    }
    
    return { status: 'healthy' };
  } catch (error) {
    return { 
      status: 'unhealthy', 
      message: error.message 
    };
  }
}
```

## Plugin-Dependencies

### Dependencies definieren

```json
{
  "pluginMetadata": {
    "dependencies": ["auth-plugin", "notification-plugin"]
  }
}
```

### Inter-Plugin-Kommunikation

```typescript
async initialize(context: PluginContext, api: PluginAPI): Promise<void> {
  // Auf andere Plugins zugreifen
  const authPlugin = api.getPlugin('auth-plugin');
  
  // Events von anderen Plugins hören
  context.on('auth-plugin:user-login', (data) => {
    // Reagiere auf Login-Event
  });
}
```

## Debugging

### Logging

```typescript
async onUserLogin(user: any, context: PluginContext): Promise<void> {
  context.logger
    .setContext('my-plugin')
    .setUserId(user.id)
    .info('User login processed', { timestamp: new Date() });
}
```

### Development-Modus

```typescript
if (context.config.get('environment') === 'development') {
  // Development-spezifische Logik
  context.logger.debug('Development mode active');
}
```

## Best Practices

### 1. Error Handling

```typescript
async performOperation(context: PluginContext): Promise<void> {
  try {
    // Plugin-Logik
  } catch (error) {
    context.logger.error('Plugin operation failed', 'my-plugin', {
      error: error.message,
      stack: error.stack
    });
    
    // Graceful fallback
  }
}
```

### 2. Resource Cleanup

```typescript
async deactivate(): Promise<void> {
  // Timers stoppen
  if (this.intervalTimer) {
    clearInterval(this.intervalTimer);
  }
  
  // Connections schließen
  if (this.externalConnection) {
    await this.externalConnection.close();
  }
  
  // Event-Listener entfernen
  this.context?.off('user-login', this.onUserLogin);
}
```

### 3. Security

```typescript
api.addRoute('POST', '/sensitive-endpoint', async (req, res) => {
  // Authentication prüfen
  if (!req.user || !req.user.hasPermission('admin')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  
  // Input validieren
  const { data } = req.body;
  if (!data || typeof data !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }
  
  // Verarbeitung...
});
```

## Testing

```typescript
// Plugin-Tests
describe('MyPlugin', () => {
  let plugin: MyPlugin;
  let mockContext: PluginContext;
  let mockAPI: PluginAPI;
  
  beforeEach(() => {
    plugin = new MyPlugin();
    mockContext = createMockContext();
    mockAPI = createMockAPI();
  });
  
  test('should initialize correctly', async () => {
    await plugin.initialize(mockContext, mockAPI);
    expect(plugin.isInitialized).toBe(true);
  });
  
  test('should handle user login event', async () => {
    const user = { id: '123', username: 'test' };
    await plugin.onUserLogin(user, mockContext);
    expect(mockContext.logger.info).toHaveBeenCalled();
  });
});
```

## Deployment

1. **Development**: Plugin direkt in `/src/plugins/` entwickeln
2. **Production**: Plugin als npm-Package bereitstellen
3. **Installation**: Über Plugin-Registry oder manuell installieren

```bash
# Plugin installieren
npm install my-plugin

# Plugin aktivieren
curl -X POST /api/admin/plugins/activate -d '{"name": "my-plugin"}'
```

## Beispiel-Plugins

- **Analytics Plugin**: Erweiterte Benutzer- und System-Analytics
- **Notification Plugin**: E-Mail, Push, Slack-Benachrichtigungen
- **Backup Plugin**: Automatische Daten-Backups
- **Social Plugin**: Social Media Integration
- **AI Enhancement Plugin**: Erweiterte AI-Features

Das Plugin-System bietet maximale Flexibilität bei gleichzeitiger Stabilität des Core-Systems.
