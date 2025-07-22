# Getting Started

## Überblick

Willkommen beim Stromhaltig-Projekt! Diese Anleitung führt dich durch die ersten Schritte zur Einrichtung und Entwicklung der Anwendung.

## Systemanforderungen

### Software-Voraussetzungen

- **Node.js**: Version 18+ (empfohlen: 20+)
- **npm**: Version 8+ (oder yarn)
- **PostgreSQL**: Version 12+
- **Git**: Neueste Version
- **Code Editor**: VS Code (empfohlen mit empfohlenen Extensions)

### Empfohlene VS Code Extensions

```json
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-json",
    "ms-vscode.hexeditor",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-node-azure-pack"
  ]
}
```

## Projekt-Setup

### 1. Repository klonen

```bash
git clone https://github.com/stromdao/stromhaltig.git
cd stromhaltig
```

### 2. Dependencies installieren

```bash
# Root und Client Dependencies
npm run install:all

# Oder einzeln:
npm install          # Backend Dependencies
cd client && npm install  # Frontend Dependencies
```

### 3. Environment-Konfiguration

Erstelle eine `.env` Datei im Projekt-Root:

```bash
cp .env.example .env
```

Konfiguriere die folgenden Umgebungsvariablen:

```env
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/stromhaltig
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stromhaltig
DB_USER=your_username
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3001
NODE_ENV=development

# AI Services
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=50MB

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/app.log
```

### 4. Datenbank-Setup

#### PostgreSQL installieren (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### Datenbank und Benutzer erstellen

```bash
sudo -u postgres psql

-- In PostgreSQL Shell:
CREATE USER your_username WITH PASSWORD 'your_password';
CREATE DATABASE stromhaltig OWNER your_username;
GRANT ALL PRIVILEGES ON DATABASE stromhaltig TO your_username;
\\q
```

#### Datenbank-Schema einrichten

```bash
# Führe die Migrations aus
psql -h localhost -U your_username -d stromhaltig -f migrations/workspace_schema.sql
psql -h localhost -U your_username -d stromhaltig -f migrations/quiz_gamification_schema.sql
psql -h localhost -U your_username -d stromhaltig -f migrations/enhanced_logging_system.sql
```

### 5. Verzeichnisse erstellen

```bash
# Upload-Verzeichnisse
mkdir -p uploads/documents
mkdir -p uploads/temp

# Log-Verzeichnisse
mkdir -p logs

# Plugin-Verzeichnisse (falls nicht vorhanden)
mkdir -p src/plugins
```

## Entwicklung starten

### Development-Server

```bash
# Vollständige Development-Umgebung (Backend + Frontend)
npm run dev

# Oder einzeln:
npm run server:dev    # Backend Development Server (Port 3001)
npm run client:dev    # Frontend Development Server (Port 3000)
```

### Verfügbare Kommandos

```bash
# Backend
npm run server:dev      # Development Server mit Hot-Reload
npm run server:start    # Production Server
npm run build          # TypeScript kompilieren

# Frontend
npm run client:dev     # React Development Server
npm run build:client   # React Production Build

# Testing
npm test              # Jest Tests ausführen
npm run test:watch    # Tests mit Watch-Mode

# Vollständig
npm run dev           # Backend + Frontend Development
npm start            # Production Start (nach Build)
```

## Erste Schritte

### 1. Backend-Status prüfen

```bash
curl http://localhost:3001/api/health
```

Erwartete Antwort:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

### 2. Frontend aufrufen

Öffne [http://localhost:3000](http://localhost:3000) im Browser.

### 3. Admin-Benutzer erstellen

```bash
curl -X POST http://localhost:3001/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "admin",
    "email": "admin@stromhaltig.de",
    "password": "secure_password_123"
  }'
```

### 4. Login testen

```bash
curl -X POST http://localhost:3001/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@stromhaltig.de",
    "password": "secure_password_123"
  }'
```

## Projekt-Struktur verstehen

```
stromhaltig/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/     # React Components
│   │   ├── pages/         # Page Components
│   │   ├── services/      # API Services
│   │   └── contexts/      # React Contexts
├── src/                   # Backend Source
│   ├── modules/           # Domain Modules
│   │   ├── user/         # User Management
│   │   ├── workspace/    # Document & Notes
│   │   ├── quiz/         # Quiz System
│   │   └── documents/    # FAQ & Chat
│   ├── core/             # Core System
│   │   ├── plugins/      # Plugin System
│   │   └── logging/      # Logging System
│   ├── utils/            # Utility Functions
│   ├── middleware/       # Express Middleware
│   ├── routes/           # API Routes
│   └── services/         # Business Services
├── migrations/           # Database Migrations
├── docs/                # Documentation
├── uploads/             # File Uploads
└── logs/               # Application Logs
```

## API-Endpunkte testen

### Authentication

```bash
# Register
POST /api/auth/register

# Login
POST /api/auth/login

# Profile
GET /api/auth/profile
```

### Documents

```bash
# Upload Document
POST /api/documents/upload

# Get Documents
GET /api/documents

# Get Document
GET /api/documents/:id
```

### Quiz

```bash
# Get Quizzes
GET /api/quiz

# Create Quiz
POST /api/quiz

# Start Quiz Attempt
POST /api/quiz/:id/attempt
```

## Development-Tools

### Database-Verwaltung

```bash
# PostgreSQL Shell
psql -h localhost -U your_username -d stromhaltig

# Tabellen anzeigen
\\dt

# Benutzer anzeigen
SELECT * FROM users;
```

### Log-Monitoring

```bash
# Application Logs
tail -f logs/app.log

# Server Logs (Development)
npm run server:dev  # Logs erscheinen in Terminal
```

### Plugin-Development

```bash
# Beispiel-Plugin kopieren
cp -r src/plugins/example-plugin src/plugins/my-plugin

# Plugin aktivieren
curl -X POST http://localhost:3001/api/admin/plugins/activate \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -d '{"name": "my-plugin"}'
```

## Häufige Probleme

### Problem: Port bereits belegt

```bash
# Prozess finden und beenden
lsof -ti:3000 | xargs kill -9  # Frontend
lsof -ti:3001 | xargs kill -9  # Backend
```

### Problem: Datenbank-Verbindung fehlschlägt

```bash
# PostgreSQL Status prüfen
sudo systemctl status postgresql

# PostgreSQL starten
sudo systemctl start postgresql

# Verbindung testen
psql -h localhost -U your_username -d stromhaltig -c "SELECT 1;"
```

### Problem: Dependencies-Konflikte

```bash
# Node modules löschen und neu installieren
rm -rf node_modules client/node_modules
npm run install:all
```

### Problem: TypeScript-Fehler

```bash
# TypeScript Cache löschen
npx tsc --build --clean

# Neu kompilieren
npm run build
```

## Nützliche Entwickler-Ressourcen

### API-Dokumentation

- **Backend API**: [http://localhost:3001/api-docs](http://localhost:3001/api-docs) (Swagger, falls konfiguriert)
- **Module-Interfaces**: [docs/module-interfaces.md](./module-interfaces.md)
- **Plugin-Development**: [docs/plugin-development.md](./plugin-development.md)
- **Error-Handling**: [docs/error-handling.md](./error-handling.md)

### Development-Guides

- **Development-Workflow**: [docs/development-guide.md](./development-guide.md)
- **Testing-Guide**: [docs/testing-guide.md](./testing-guide.md)
- **Coding-Standards**: [docs/coding-standards.md](./coding-standards.md)

### External Services Setup

#### Gemini AI Setup

1. Gehe zu [Google AI Studio](https://makersuite.google.com/)
2. Erstelle einen API-Key
3. Füge den Key zu `.env` hinzu: `GEMINI_API_KEY=your_key`

#### Vector Database (Optional)

```bash
# Qdrant Installation (falls gewünscht)
docker run -p 6333:6333 qdrant/qdrant
```

## Nächste Schritte

1. 📖 **Lies die [Development-Guide](./development-guide.md)** für detaillierten Entwicklungsworkflow
2. 🧪 **Befolge die [Testing-Guide](./testing-guide.md)** für Testing-Best-Practices  
3. 🎨 **Studiere die [Coding-Standards](./coding-standards.md)** für Code-Qualität
4. 🔌 **Entwickle dein erstes Plugin** mit der [Plugin-Development-Guide](./plugin-development.md)
5. 🚀 **Deployment-Setup** mit der [Deployment-Guide](./deployment-guide.md)

## Hilfe & Support

- **Documentation**: [docs/](./docs/)
- **Issues**: [GitHub Issues](https://github.com/stromdao/stromhaltig/issues)
- **Development-Chat**: Slack/Discord (falls konfiguriert)

Viel Erfolg beim Entwickeln! 🚀
