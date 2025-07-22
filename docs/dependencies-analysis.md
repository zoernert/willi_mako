# Externe Dependencies Analyse

## Backend Dependencies (package.json)

### Production Dependencies (15 Packages)

#### Core Framework & Server
- **express** (^4.18.2) - Web-Framework
- **cors** (^2.8.5) - Cross-Origin Resource Sharing
- **compression** (^1.7.4) - Response-Kompression
- **helmet** (^7.1.0) - Sicherheits-Header
- **express-rate-limit** (^7.4.0) - Rate Limiting
- **dotenv** (^17.2.0) - Environment Variables

#### Authentifizierung & Sicherheit
- **jsonwebtoken** (^9.0.2) - JWT-Token-Handling
- **bcrypt** (^6.0.0) - Password-Hashing (Hauptversion)
- **bcryptjs** (^2.4.3) - Password-Hashing (JavaScript-Implementation)
  - **⚠️ DUPLIKAT**: Zwei bcrypt-Implementierungen vorhanden

#### Datenbank & Storage
- **pg** (^8.11.3) - PostgreSQL-Client

#### AI & Machine Learning
- **@google/generative-ai** (^0.15.0) - Google Gemini AI
- **langchain** (^0.2.10) - LangChain Framework für LLM-Integration

#### Datei-Verarbeitung
- **multer** (^1.4.5-lts.1) - Multipart/form-data (Datei-Upload)
- **pdf-parse** (^1.1.1) - PDF-Text-Extraktion

#### HTTP Client & Utilities
- **axios** (^1.10.0) - HTTP-Client
- **uuid** (^9.0.1) - UUID-Generierung

### Development Dependencies (12 Packages)

#### TypeScript & Build Tools
- **typescript** (^5.5.0) - TypeScript-Compiler
- **ts-node** (^10.9.2) - TypeScript-Ausführung für Development
- **@types/node** (^20.14.0) - Node.js-TypeScript-Typen

#### Testing
- **jest** (^29.7.0) - Testing-Framework
- **@types/jest** (^29.5.12) - Jest-TypeScript-Typen

#### Development Tools
- **nodemon** (^3.1.0) - Auto-Restart bei Dateiänderungen
- **concurrently** (^8.2.2) - Parallel-Ausführung von Scripts

#### Type Definitions
- **@types/bcryptjs** (^2.4.6)
- **@types/compression** (^1.7.5)
- **@types/cors** (^2.8.17)
- **@types/express** (^4.17.21)
- **@types/jsonwebtoken** (^9.0.6)
- **@types/multer** (^1.4.11)
- **@types/pdf-parse** (^1.1.5)
- **@types/pg** (^8.11.6)
- **@types/uuid** (^9.0.8)

## Frontend Dependencies (client/package.json)

### Production Dependencies (25 Packages)

#### React Ecosystem
- **react** (^19.1.0) - React-Framework (Neueste Version)
- **react-dom** (^19.1.0) - React DOM-Rendering
- **react-router-dom** (^7.6.3) - Client-Side Routing
- **react-scripts** (5.0.1) - Create React App Build-Tools
- **web-vitals** (^2.1.4) - Performance-Metriken

#### Material-UI Framework
- **@mui/material** (^7.2.0) - Material-UI Core
- **@mui/icons-material** (^7.2.0) - Material-UI Icons
- **@mui/lab** (^7.0.0-beta.14) - Material-UI Lab (Beta)
- **@emotion/react** (^11.14.0) - CSS-in-JS für MUI
- **@emotion/styled** (^11.14.1) - Styled-Components für MUI

#### File Handling & UI Components
- **react-dropzone** (^14.3.8) - Drag & Drop Datei-Upload
- **react-markdown** (^10.1.0) - Markdown-Rendering
- **remark-gfm** (^4.0.1) - GitHub-Flavored Markdown

#### HTTP & Communication
- **axios** (^1.10.0) - HTTP-Client (gleiche Version wie Backend)

#### Testing Libraries
- **@testing-library/react** (^16.3.0) - React-Testing
- **@testing-library/jest-dom** (^6.6.3) - Jest DOM-Matcher
- **@testing-library/dom** (^10.4.0) - DOM-Testing-Utilities
- **@testing-library/user-event** (^13.5.0) - User-Interaction-Testing

#### TypeScript Typen
- **@types/jest** (^27.5.2)
- **@types/node** (^16.18.126)
- **@types/react** (^19.1.8)
- **@types/react-dom** (^19.1.6)
- **@types/react-dropzone** (^4.2.2)
- **@types/react-router-dom** (^5.3.3)
- **typescript** (^4.9.5) - TypeScript-Compiler

## Dependency-Analyse

### Kritische Beobachtungen

#### 1. Version-Inkonsistenzen
- **TypeScript**: Backend (^5.5.0) vs Frontend (^4.9.5)
  - Backend verwendet neuere TypeScript-Version
  - Könnte zu Kompatibilitätsproblemen führen

#### 2. Duplikate
- **bcrypt vs bcryptjs**: Beide im Backend
  - bcrypt ist native C++-Implementation (schneller)
  - bcryptjs ist pure JavaScript (kompatibel)
  - Empfehlung: Nur eine verwenden

#### 3. Axios-Versionen
- **Konsistent**: Beide verwenden ^1.10.0 ✅

#### 4. React Version
- **React 19.1.0**: Sehr neue Version (Januar 2025)
  - Mögliche Kompatibilitätsprobleme mit älteren Libraries
  - @types/react-router-dom (^5.3.3) könnte veraltet sein

### Sicherheits-Relevante Dependencies

#### Hohe Priorität
- **jsonwebtoken**: JWT-Sicherheit
- **bcrypt/bcryptjs**: Password-Hashing
- **helmet**: Sicherheits-Header
- **express-rate-limit**: DoS-Schutz

#### Zu überwachen
- **multer**: Datei-Upload (Sicherheitsrisiko)
- **pdf-parse**: Datei-Verarbeitung (Potentiell anfällig)

### Performance-Kritische Dependencies

#### Backend
- **express**: Core-Performance
- **pg**: Datenbank-Performance
- **compression**: Response-Kompression
- **langchain**: AI-Processing (kann langsam sein)

#### Frontend
- **react**: Rendering-Performance
- **@mui/material**: UI-Rendering (schwer)
- **react-markdown**: Markdown-Rendering

### Potentielle Optimierungen

#### 1. Dependency-Bereinigung
```json
// Backend: Entfernen einer bcrypt-Version
"bcrypt": "^6.0.0"  // Bevorzugt (native)
// ODER
"bcryptjs": "^2.4.3"  // Falls native Probleme

// Frontend: TypeScript-Version aktualisieren
"typescript": "^5.5.0"  // Angleichen an Backend
```

#### 2. Bundle-Size Optimierung
- **@mui/material**: Nur benötigte Komponenten importieren
- **langchain**: Prüfen ob vollständige Library benötigt wird
- **react-markdown**: Eventuell auf leichtere Alternative wechseln

#### 3. Sicherheits-Updates
- Regelmäßige `npm audit` Durchführung
- Automatisierte Dependency-Updates einrichten

### Dependency-Update-Strategie

#### Sofort (Breaking Changes möglich)
1. TypeScript-Versionen angleichen
2. bcrypt-Duplikat entfernen
3. Veraltete @types/react-router-dom aktualisieren

#### Mittelfristig (Testing erforderlich)
1. React 19 Kompatibilität testen
2. LangChain auf neueste Version
3. Material-UI auf stabile Version

#### Langfristig (Architektur-Überlegungen)
1. Bundle-Size-Analyse und Optimierung
2. Alternative zu schweren Dependencies evaluieren
3. Micro-Frontend-Approach für bessere Dependency-Isolation

## Monitoring-Empfehlungen

### Automated Tools
- **npm audit**: Sicherheits-Scanner
- **Dependabot**: Automatische Updates
- **Bundle Analyzer**: Frontend-Bundle-Analyse
- **npm outdated**: Veraltete Packages finden

### Manual Reviews
- Monatliche Dependency-Reviews
- Neue Major-Versions evaluieren
- Performance-Impact bei Updates messen
