# Stromhaltig - Digital Energy Infrastructure for tomorrow

Eine hochwertige Webanwendung für einen AI-gestützten Coach "Mako Willi" in der Energiewirtschaft und Marktkommunikation.

## 🚀 Features

### 🤖 AI-Chat mit Mako Willi (Gemini 2.5 Pro)
- Intelligente Gespräche über Energiewirtschaft und Marktkommunikation
- Kontextuelle Kompression und Multi-Query Retrieval
- Personalisierte Antworten basierend auf Benutzerpräferenzen
- Chat-Verlauf und -Verwaltung

### 📚 Dokumentenverwaltung
- PDF-Upload und -Verarbeitung durch Administratoren
- Automatische Vektorisierung für semantische Suche
- Kuratierte Spickzettel und Cheat Sheets
- Direkte PDF-Anzeige und Download

### 👥 Benutzerverwaltung
- Sichere Authentifizierung mit JWT
- Rollen-basierte Zugriffskontrolle (Admin/User)
- Benutzerpräferenzen für bessere Personalisierung
- Profilverwaltung

### 🔍 Erweiterte Suche
- Qdrant Vector Database für semantische Suche
- Contextual Compression Retriever
- Multi Query Retriever für optimale Ergebnisse
- Firmen- und themenspezifische Filterung

### 🛡️ Sicherheit & Performance
- Helmet.js für Sicherheits-Header
- Rate Limiting zum Schutz vor Missbrauch
- Kompression für bessere Performance
- Sichere Passwort-Hashing mit bcrypt

## 🏗️ Architektur

### Backend (Node.js + TypeScript)
- **Framework**: Express.js mit modular aufgebauter Architektur
- **Datenbank**: PostgreSQL
- **Vector Store**: Qdrant
- **AI Service**: Google Gemini 2.5 Pro
- **Authentifizierung**: JWT
- **File Upload**: Multer

#### Modular Architecture
```
src/
├── modules/                    # Business Logic Modules
│   ├── user/                  # User Management
│   │   ├── user.service.ts    # Business logic
│   │   └── user.interface.ts  # Type definitions
│   └── quiz/                  # Quiz & Gamification
│       ├── quiz.service.ts    # Business logic
│       ├── gamification.service.ts
│       └── quiz.interface.ts  # Type definitions
├── presentation/              # HTTP Layer
│   └── http/
│       ├── controllers/       # Request handlers
│       └── routes/           # API routes
├── utils/                     # Shared utilities
│   ├── database.ts           # Database helpers
│   ├── response.ts           # API responses
│   └── errors.ts             # Error handling
└── services/                  # External integrations
    ├── gemini.ts             # AI service
    └── qdrant.ts             # Vector database
```

### Frontend (React + TypeScript)
- **Framework**: React 18 mit TypeScript
- **UI Library**: Material-UI (MUI)
- **Routing**: React Router
- **API Client**: Standardized service layer
- **State Management**: Context API
- **HTTP Client**: Axios

### Infrastruktur
- **Database**: PostgreSQL
- **Vector Database**: Qdrant (10.0.0.2:6333)
- **File Storage**: Lokales Dateisystem
- **PDF Processing**: pdf-parse

## 🚀 Installation

### Voraussetzungen
- Node.js 18+
- PostgreSQL 13+
- Qdrant Vector Database
- Google Gemini API Key

### Automatisches Setup
```bash
# Repository klonen
git clone https://github.com/zoernert/willi_mako.git
cd willi_mako

# Setup-Skript ausführen
./setup.sh
```

### Manuelle Installation
```bash
# Backend Dependencies installieren
npm install

# Frontend Dependencies installieren
cd client && npm install && cd ..

# Umgebungsvariablen konfigurieren
cp .env.example .env
# Bearbeiten Sie die .env Datei mit Ihren Konfigurationen

# Datenbank und Vector Store initialisieren
npm run build
node dist/init.js

# Anwendung starten
npm run dev
```

## ⚙️ Konfiguration

### Umgebungsvariablen (.env)
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=willi_mako
DB_USER=willi_user
DB_PASSWORD=willi_password

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Qdrant
QDRANT_URL=http://10.0.0.2:6333
QDRANT_API_KEY=str0mdao0
QDRANT_COLLECTION=willi

# Gemini
GEMINI_API_KEY=your-gemini-api-key

# Server
NODE_ENV=development
PORT=3003
```

## 🔧 Verwendung

### Anwendung starten
```bash
# Beide Services auf einem Port
npm run dev

# Einzeln starten
npm run server:dev  # Backend + Frontend (Port 3003)
npm run client:dev  # Frontend separat (Port 3002) - nur für Entwicklung
```

### Zugriff
- **Anwendung**: http://localhost:3003
- **API**: http://localhost:3003/api

### Standard-Admin-Login
- **E-Mail**: admin@willi-mako.com
- **Passwort**: admin123

### API-Endpunkte

#### Authentifizierung
- `POST /api/auth/login` - Benutzer anmelden
- `POST /api/auth/register` - Benutzer registrieren
- `POST /api/auth/refresh` - Token aktualisieren

#### Chat
- `GET /api/chat/chats` - Alle Chats abrufen
- `POST /api/chat/chats` - Neuen Chat erstellen
- `POST /api/chat/chats/:id/messages` - Nachricht senden

#### Dokumente
- `GET /api/user/documents` - Verfügbare Dokumente
- `POST /api/admin/documents` - Dokument hochladen (Admin)

#### Benutzerverwaltung
- `GET /api/user/profile` - Benutzerprofil abrufen
- `PUT /api/user/profile` - Profil aktualisieren
- `GET /api/user/preferences` - Präferenzen abrufen

## 🎯 Zielgruppe

Diese Anwendung richtet sich an:
- **Energieversorger** und Stadtwerke
- **Netzbetreiber** und Messstellenbetreiber
- **Energiehändler** und Bilanzkreisverantwortliche
- **Regulierungsbehörden** und Consultants
- **Fachkräfte** in der Energiewirtschaft

## 💡 Kernfunktionalitäten

### Für Benutzer
- **Intelligente Chat-Beratung** zu Energiewirtschaft und Marktkommunikation
- **Personalisierte Antworten** basierend auf Unternehmen und Interessensgebieten
- **Zugriff auf kuratierte Dokumente** und Spickzettel
- **Chat-Verlauf** und Wiederaufnahme von Gesprächen

### Für Administratoren
- **Dokumentenverwaltung** mit PDF-Upload und automatischer Vektorisierung
- **Benutzerverwaltung** mit Rollen und Berechtigungen
- **Markdown-Editor** für Spickzettel und Cheat Sheets
- **Systemstatistiken** und Nutzungsanalysen

## 🔮 Technische Highlights

### AI & Machine Learning
- **Gemini 2.5 Pro** Integration für hochwertige Antworten
- **Contextual Compression** für relevante Kontextextraktion
- **Multi-Query Retrieval** für umfassende Informationssuche
- **Semantic Search** mit Qdrant Vector Database

### Benutzerfreundlichkeit
- **ChatGPT-ähnliche Benutzeroberfläche** mit hohem Komfort
- **Responsive Design** für alle Gerätegrößen
- **Moderne Material-UI** mit ansprechendem Design
- **Echtzeit-Feedback** und Ladezustände

### Sicherheit & Skalierbarkeit
- **JWT-basierte Authentifizierung** mit Refresh-Token
- **Rollen-basierte Zugriffskontrolle**
- **Rate Limiting** zum Schutz vor Missbrauch
- **Sichere Dateiverarbeitung** mit Validierung

## 📊 Datenmodell

### Hauptentitäten
- **Users**: Benutzer mit Rollen und Profildaten
- **Chats**: Chat-Sitzungen mit Metadaten
- **Messages**: Einzelne Nachrichten in Chats
- **Documents**: PDF-Dokumente mit Metadaten
- **User_Preferences**: Personalisierungseinstellungen

### Vector Store Schema
- **Text Chunks**: Aufgeteilte Dokumentinhalte
- **Embeddings**: Vektorrepräsentationen für semantische Suche
- **Metadata**: Quellinformationen und Kategorien

## 🚀 Deployment

### Production Build
```bash
npm run build
cd client && npm run build
```

### Docker (Optional)
```dockerfile
# Dockerfile für Backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/server.js"]
```

## 📈 Performance & Skalierung

### Optimierungen
- **Kompression** für reduzierte Bandbreite
- **Caching** für häufig angeforderte Daten
- **Lazy Loading** für große Dokumentsammlungen
- **Pagination** für Chat-Verläufe

### Monitoring
- **Structured Logging** für bessere Debugging
- **Error Tracking** mit Stack Traces
- **Performance Metrics** für API-Endpunkte

## 🤝 Mitwirkende

- Entwicklung: GitHub Copilot & Benutzer
- Architektur: Moderne Web-Technologien
- Design: Material-UI Design System

## 📝 Lizenz

ISC License - Siehe [LICENSE](LICENSE) für Details

## 🔗 Links

- [Website](https://stromhaltig.de/)
- [STROMDAO GmbH](https://stromdao.de/)
- [GitHub Repository](https://github.com/stromdao/stromhaltig)

---

**Stromhaltig** - Digital Energy Infrastructure for tomorrow 🏭⚡  
Powered by **Mako Willi** - Ihr intelligenter Begleiter in der Energiewirtschaft

© 2025 [STROMDAO GmbH](https://stromdao.de/)
