# Aktuelle Codebase-Struktur

## Überblick
**Projekttitel**: Stromhaltig - Digital Energy Infrastructure for tomorrow  
**Typ**: Full-Stack TypeScript/React Anwendung  
**Architektur**: Client-Server Modell mit PostgreSQL Database  

## Ordnerstruktur

### Root-Level
```
/
├── client/                 # React Frontend
├── src/                   # Node.js Backend
├── docs/                  # Dokumentation (neu erstellt)
├── migrations/            # Datenbank-Migrationen
├── uploads/               # Datei-Uploads
├── *.md                   # Verschiedene Dokumentations-Dateien
├── *.sh                   # Shell-Skripte für Deployment/Migration
├── *.sql                  # SQL-Skripte
└── Config-Dateien
```

### Backend-Struktur (`/src/`)
```
src/
├── server.ts             # Haupt-Server-Datei
├── init.ts               # Initialisierung
├── config/
│   └── database.ts       # Datenbank-Konfiguration
├── middleware/
│   ├── auth.ts           # Authentifizierung
│   └── errorHandler.ts   # Fehlerbehandlung
├── routes/
│   ├── admin.ts          # Admin-Routen
│   ├── auth.ts           # Authentifizierungs-Routen
│   ├── chat.ts           # Chat-Funktionalität
│   ├── documents.ts      # Dokument-Management
│   ├── faq.ts            # FAQ-System
│   ├── notes.ts          # Notizen-System
│   ├── quiz.ts           # Quiz-System (mehrere Versionen)
│   ├── user.ts           # Benutzer-Management
│   └── workspace.ts      # Workspace-Funktionalität
├── services/
│   ├── contextManager.ts    # Kontext-Management
│   ├── documentProcessor.ts # Dokument-Verarbeitung
│   ├── flip-mode.ts         # Flip-Mode Feature
│   ├── gamification.ts      # Gamification-System
│   ├── gemini.ts           # Google Gemini AI Integration
│   ├── notesService.ts     # Notizen-Service
│   ├── qdrant.ts           # Vector Database Service
│   ├── quizService.ts      # Quiz-Service
│   ├── userProfile.ts      # Benutzer-Profile
│   └── workspaceService.ts # Workspace-Service
└── types/
    ├── quiz.ts           # Quiz-TypeScript-Typen
    └── workspace.ts      # Workspace-TypeScript-Typen
```

### Frontend-Struktur (`/client/src/`)
```
client/src/
├── App.tsx               # Haupt-App-Komponente
├── index.tsx             # Entry Point
├── components/
│   ├── AdminQuizManager.tsx
│   ├── ClarificationUI.tsx
│   ├── FlipModeDemo.tsx
│   ├── IntelligentQuizCreator.tsx
│   ├── Layout.tsx
│   ├── MarkdownRenderer.tsx
│   ├── ProtectedRoute.tsx
│   ├── Quiz/
│   │   ├── QuizDashboard.tsx
│   │   └── QuizPlayer.tsx
│   └── Workspace/
│       ├── ContextIndicator.tsx
│       ├── DocumentPreview.tsx
│       ├── DocumentUpload.tsx
│       ├── DocumentsManager.tsx
│       ├── GlobalSearch.tsx
│       ├── NotesManager.tsx
│       ├── QuickNoteButton.tsx
│       ├── SmartSearch.tsx
│       ├── TextSelectionMenu.tsx
│       └── WorkspaceSettings.tsx
├── contexts/
│   ├── AuthContext.tsx   # Authentifizierungs-Kontext
│   └── SnackbarContext.tsx # Notification-Kontext
├── hooks/
│   └── useTextSelection.ts # Custom Hook für Textauswahl
└── pages/
    ├── Admin.tsx         # Admin-Dashboard
    ├── Chat.tsx          # Chat-Interface
    ├── Dashboard.tsx     # Haupt-Dashboard
    ├── Documents.tsx     # Dokument-Seite
    ├── FAQDetail.tsx     # FAQ-Details
    ├── FAQList.tsx       # FAQ-Liste
    ├── Login.tsx         # Login-Seite
    ├── Profile.tsx       # Benutzer-Profil
    ├── Register.tsx      # Registrierung
    └── Workspace.tsx     # Workspace-Seite
```

## Hauptkomponenten und deren Zweck

### Backend-Services
- **QdrantService**: Vector Database für semantische Suche
- **DocumentProcessorService**: PDF-Verarbeitung und Textextraktion
- **QuizService**: Quiz-Logik und -Management
- **GamificationService**: Punkte- und Achievement-System
- **UserProfileService**: Benutzer-Profile und Präferenzen
- **ContextManager**: Intelligente Kontext-Erkennung
- **WorkspaceService**: Workspace-Management und -Operationen

### Frontend-Komponenten
- **Layout**: Haupt-Layout mit Navigation
- **Workspace**: Zentrale Arbeitsbereich-Komponente
- **DocumentsManager**: Dokument-Upload und -Verwaltung
- **QuizDashboard/QuizPlayer**: Quiz-System Frontend
- **SmartSearch**: KI-gestützte Suchfunktion
- **NotesManager**: Notizen-System mit Markdown-Support
- **ContextIndicator**: Anzeige des aktuellen Kontexts

## Externe Dependencies

### Backend
- **Kernframeworks**: Express.js, TypeScript
- **Datenbank**: PostgreSQL (pg)
- **KI/ML**: @google/generative-ai, langchain
- **Authentifizierung**: jsonwebtoken, bcryptjs
- **Dateiverarbeitung**: multer, pdf-parse
- **Sicherheit**: helmet, cors, express-rate-limit

### Frontend
- **Kernframeworks**: React 19, TypeScript
- **UI-Framework**: Material-UI (@mui/material)
- **Routing**: react-router-dom
- **HTTP-Client**: axios
- **Markdown**: react-markdown, remark-gfm
- **Datei-Upload**: react-dropzone

## Besonderheiten

### Dokumentations-Dateien (Markdown)
1. **CLEANUP.md**: Refactoring-Plan (aktuell)
2. **README.md**: Haupt-Dokumentation
3. **WORKSPACE.md**: Workspace-Funktionalität
4. **QUIZ.md**: Quiz-System Dokumentation
5. **DEPLOYMENT_README.md**: Deployment-Anweisungen
6. **FAQ_RELEVANCE_FIX.md**: FAQ-System Bugfixes
7. **INTELLIGENT_QUIZ_IMPLEMENTATION.md**: KI-Quiz Implementierung
8. **WORKSPACE_IMPLEMENTATION_ANALYSIS.md**: Workspace-Analyse
9. **WORKSPACE_PHASE1_COMPLETED.md**: Abgeschlossene Phase 1
10. **WORKSPACE_PHASE4_COMPLETED.md**: Abgeschlossene Phase 4

### Shell-Skripte
- **deploy.sh**: Deployment-Automatisierung
- **setup.sh**: Initial-Setup
- **migrate-admin.sh**: Admin-Migrationen
- **monitor.sh**: System-Monitoring
- **rollback.sh**: Rollback-Funktionalität
- **update.sh**: Update-Prozess

### SQL-Migrationen
- **init.sql**: Basis-Schema
- **migration.sql**: Allgemeine Migrationen
- **user_profile_migration.sql**: Benutzer-Profile
- **migrations/**: Strukturierte Migrationen

## Identifizierte Architektur-Pattern
- **MVC-Pattern**: Trennung von Routes, Services und Models
- **Repository-Pattern**: Service-Layer für Datenbank-Zugriff
- **Context-Pattern**: React-Contexts für State-Management
- **Middleware-Pattern**: Express-Middleware für Authentifizierung
- **Plugin-Architecture**: Modulare Services (teilweise implementiert)

## Technische Besonderheiten
- **AI-Integration**: Google Gemini für intelligente Features
- **Vector-Search**: Qdrant für semantische Dokumentensuche
- **Real-time Features**: Potenziell WebSocket-basiert (zu verifizieren)
- **Markdown-Support**: Umfangreiche Markdown-Verarbeitung
- **File-Processing**: PDF-Extraktion und -Analyse
- **Gamification**: Punkte-, Level- und Achievement-System

## Build-System
- **Backend**: TypeScript → JavaScript (tsc)
- **Frontend**: Create React App Build-System
- **Development**: Nodemon für Backend, React Dev Server
- **Production**: Static Build + Node.js Server
