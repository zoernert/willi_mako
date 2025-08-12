# Change Request: Bilaterale Klärung - Implementierung in Willi-Mako

## 1. Zusammenfassung

**Titel:** Implementierung einer umfassenden Bilaterale-Klärung-Funktionalität in der Willi-Mako React-Anwendung

**Typ:** Feature Enhancement

**Priorität:** Hoch

**Geschätzter Aufwand:** 3-4 Sprints

**Verantwortlich:** Entwicklungsteam Willi-Mako

## 2. Fachlicher Hintergrund

### 2.1. Definition Bilaterale Klärung

Eine bilaterale Klärung ist ein direkter, zwischen zwei Marktpartnern stattfindender Prozess zur Behebung von Daten- oder Prozessfehlern, die im standardisierten, maschinellen Datenaustausch aufgetreten sind. Sie tritt in Kraft, wenn automatisierte Nachrichtenflows (GPKE/MaBiS) aufgrund von Inkonsistenzen, Fristüberschreitungen oder falschen Daten fehlschlagen.

### 2.2. Typische Anwendungsfälle

- **Stammdatenfehler:** Falsche MaLo-ID, Adressdaten oder Zuordnungsermächtigungen
- **Messwertfehler:** Fehlerhafte Zählerstände, Ablesefehler, Mengenabweichungen
- **Prozessfehler:** Abgelehnte An-/Abmeldungen, Fristenüberschreitungen, Stornierungsprobleme

### 2.3. Regulatorischer Rahmen

Die bilaterale Klärung ist ein explizit vorgesehener Mechanismus in den BNetzA-Festlegungen (GPKE, MaBiS) und ein geplantes Sicherheitsventil des Systems.

## 3. Geschäftsanforderungen

### 3.1. Primäre Ziele

1. **Effizienzsteigerung:** Strukturierte Bearbeitung von Klärfällen
2. **Rechtssicherheit:** Nachvollziehbare Dokumentation aller Klärschritte
3. **Compliance:** Einhaltung der MaKo-Standards und Fristen
4. **Automatisierung:** KI-gestützte Unterstützung bei der Fallbearbeitung

### 3.2. Zielgruppen

- **Primär:** Marktkommunikations-Experten in Energieversorgungsunternehmen
- **Sekundär:** Kundenservice-Mitarbeiter mit MaKo-Kenntnissen
- **Tertiär:** Compliance-Verantwortliche und Führungskräfte

## 4. Funktionale Anforderungen

### 4.1. Klärfall-Dashboard

**Als** Marktkommunikations-Experte  
**möchte ich** eine zentrale Übersicht über alle meine Klärfälle haben  
**damit** ich den Status und die Prioritäten schnell erfassen kann.

#### Akzeptanzkriterien:
- [ ] Dashboard mit Filter- und Suchfunktionen
- [ ] Kategorisierung nach Status: Offen, In Bearbeitung, Abgeschlossen, Eskaliert
- [ ] Sortierung nach Priorität, Datum, Marktpartner, Frist
- [ ] Visuelle Kennzeichnung überfälliger Fälle
- [ ] Export-Funktion für Reporting
- [ ] Separate Ansichten: "Meine Klärfälle" und "Team-Klärfälle"
- [ ] Kennzeichnung von Team-freigegebenen Klärfällen
- [ ] Filter nach Sichtbarkeit: Privat, Team-freigegeben, Alle

### 4.2. Klärfall-Erstellung

**Als** Marktkommunikations-Experte  
**möchte ich** neue Klärfälle aus verschiedenen Quellen anlegen können  
**damit** ich flexibel auf Probleme reagieren kann.

#### Akzeptanzkriterien:
- [ ] Erstellung aus Marktpartnersuche
- [ ] Erstellung aus Chat-Konversation
- [ ] Manuelle Erstellung mit Formular
- [ ] Verknüpfung mit spezifischem Marktpartner (Pflichtfeld)
- [ ] Kategorisierung nach Problemtyp (Stammdaten, Messwerte, Prozess)
- [ ] Automatische Vergabe einer eindeutigen Klärfall-ID

### 4.3. Datenaustauschreferenz (DAR)

**Als** Marktkommunikations-Experte  
**möchte ich** die relevante Datenaustauschreferenz erfassen  
**damit** der Marktpartner den Geschäftsvorfall eindeutig zuordnen kann.

#### Akzeptanzkriterien:
- [ ] Eingabefeld für DAR-Nummer
- [ ] Validierung der DAR-Format
- [ ] Verknüpfung mit ursprünglicher EDIFACT-Nachricht (falls vorhanden)
- [ ] Historie aller DAR-Änderungen

### 4.4. Attachment-Management

**Als** Marktkommunikations-Experte  
**möchte ich** Marktnachrichten und Antworten als Attachments hinzufügen  
**damit** alle relevanten Dokumente zentral verfügbar sind.

#### Akzeptanzkriterien:
- [ ] Upload von EDIFACT-Nachrichten (APERAK, UTILMD, MSCONS, etc.)
- [ ] Upload von Antwort-Nachrichten
- [ ] Kategorisierung: Ursprungsnachricht, Fehlermeldung, Korrektur
- [ ] Versionierung bei mehrfachen Korrekturen
- [ ] Vorschau-Funktion für EDIFACT-Nachrichten

### 4.5. Notizen-System

**Als** Marktkommunikations-Experte  
**möchte ich** strukturierte Notizen zu jedem Klärfall führen  
**damit** der Bearbeitungsfortschritt dokumentiert ist.

#### Akzeptanzkriterien:
- [ ] Zeitgestempelte Notizen mit Autor
- [ ] Rich-Text-Editor für Formatierung
- [ ] Verknüpfung von Notizen mit spezifischen Bearbeitungsschritten
- [ ] Such-Funktion in Notizen
- [ ] Export von Notizen für externe Kommunikation

### 4.6. Email-Integration

**Als** Marktkommunikations-Experte  
**möchte ich** Email-Korrespondenz per Copy & Paste hinzufügen  
**damit** die gesamte Kommunikation nachvollziehbar ist.

#### Akzeptanzkriterien:
- [ ] Eingabefeld für Email-Text mit automatischer Formatierung
- [ ] Richtungsangabe: Eingehend/Ausgehend
- [ ] Zeitstempel und Absender/Empfänger-Erfassung
- [ ] Parsing von Email-Headers für Metadaten
- [ ] Integration in Kommunikations-Timeline

### 4.7. KI-Unterstützung

**Als** Marktkommunikations-Experte  
**möchte ich** KI-gestützte Analyse und Handlungsempfehlungen  
**damit** ich Klärfälle effizienter und regulatorisch korrekt bearbeite.

#### Akzeptanzkriterien:
- [ ] Automatische Kategorisierung des Problemtyps
- [ ] Regulatorische Compliance-Prüfung
- [ ] Vorschläge für nächste Schritte basierend auf Falltyp
- [ ] Generierung von Standardantworten
- [ ] Fristenmonitoring mit Warnungen
- [ ] Identifikation ähnlicher historischer Fälle

### 4.8. Team-Klärfall-Management

**Als** Marktkommunikations-Experte  
**möchte ich** Klärfälle für mein Team freigeben können  
**damit** Kollegen bei der Bearbeitung unterstützen oder voneinander lernen können.

#### Akzeptanzkriterien:
- [ ] Option "Für Team freigeben" in der Klärfall-Detail-Ansicht
- [ ] Team-freigegebene Klärfälle sind für alle Team-Mitglieder sichtbar
- [ ] Visuelle Kennzeichnung von Team-Klärfällen vs. privaten Klärfällen
- [ ] Berechtigung: Nur Ersteller und Team-Leads können Freigabe-Status ändern
- [ ] Team-Mitglieder können Kommentare zu freigegebenen Klärfällen hinzufügen
- [ ] Notification an Team bei Freigabe eines Klärfalls
- [ ] Möglichkeit, Freigabe wieder zu entziehen

## 5. Technische Anforderungen

### 5.1. Frontend (React Legacy App)

Die Bilaterale Klärung wird in die bestehende Legacy React-App (`/app-legacy`) integriert, die bereits folgende Infrastruktur bietet:

#### 5.1.1. Bestehende Architektur
- **Framework:** React 19.1.0 mit TypeScript
- **UI Library:** Material-UI (MUI) 7.2.0
- **Routing:** React Router DOM 7.6.3
- **HTTP Client:** Axios mit standardisiertem `apiClient`
- **State Management:** React Context + useState (kein Redux)
- **Authentication:** JWT-basiert über `AuthContext`

#### 5.1.2. Neue Komponenten-Struktur
```
app-legacy/src/
├── pages/
│   └── BilateralClearing/
│       ├── Dashboard.tsx
│       ├── CaseDetail.tsx
│       └── CaseForm.tsx
├── components/
│   └── BilateralClearing/
│       ├── CaseCard.tsx
│       ├── AttachmentManager.tsx
│       ├── NotesEditor.tsx
│       ├── EmailIntegration.tsx
│       ├── AIAssistant.tsx
│       ├── StatusBadge.tsx
│       ├── PriorityIndicator.tsx
│       ├── MarketPartnerSelector.tsx
│       ├── DARInput.tsx
│       ├── TeamShareDialog.tsx
│       ├── TeamCaseIndicator.tsx
│       └── TeamComments.tsx
├── services/
│   └── bilateralClearingApi.ts
└── contexts/
    └── BilateralClearingContext.tsx
```

#### 5.1.3. Integration mit bestehenden Services
- **Chat-Integration:** Nutzung des bestehenden `chatApi` für KI-Unterstützung
- **Marktpartner-Suche:** Integration mit der bestehenden `CodeLookup` Komponente
- **User-Management:** Nutzung des `AuthContext` für Benutzerauthentifizierung
- **File-Upload:** Erweiterung des bestehenden Document-Upload-Systems

#### 5.1.4. Routing-Erweiterungen in App.tsx
```tsx
// Neue Routes hinzufügen:
<Route path="bilateral-clearing" element={<ProtectedRoute><BilateralClearingDashboard /></ProtectedRoute>} />
<Route path="bilateral-clearing/new" element={<ProtectedRoute><BilateralClearingForm /></ProtectedRoute>} />
<Route path="bilateral-clearing/:caseId" element={<ProtectedRoute><BilateralClearingDetail /></ProtectedRoute>} />
```

#### 5.1.5. Navigation Integration in Layout.tsx
```tsx
// Neuer Menüpunkt in bestehende menuItems:
{ 
  text: 'Bilaterale Klärung', 
  icon: <GavelIcon />, 
  path: '/bilateral-clearing' 
}
```

### 5.2. Backend-Erweiterungen (Node.js/Express)

Die bestehende Backend-Architektur nutzt:
- **Framework:** Express.js mit TypeScript
- **Database:** MongoDB + PostgreSQL (hybrid)
- **Authentication:** JWT mit bcrypt
- **File Handling:** Multer für Uploads
- **AI Integration:** Bestehende LLM-Services (Google Gemini)

#### 5.2.1. Neue API-Endpoints (Erweiterung von apiEndpoints.ts)
```typescript
// Ergänzung in API_ENDPOINTS:
bilateralClearing: {
  cases: '/bilateral-clearing/cases',
  case: (caseId: string) => `/bilateral-clearing/cases/${caseId}`,
  attachments: (caseId: string) => `/bilateral-clearing/cases/${caseId}/attachments`,
  attachment: (attachmentId: string) => `/bilateral-clearing/attachments/${attachmentId}`,
  notes: (caseId: string) => `/bilateral-clearing/cases/${caseId}/notes`,
  note: (noteId: string) => `/bilateral-clearing/notes/${noteId}`,
  emails: (caseId: string) => `/bilateral-clearing/cases/${caseId}/emails`,
  
  // Team-Funktionalität
  shareWithTeam: (caseId: string) => `/bilateral-clearing/cases/${caseId}/share`,
  unshareFromTeam: (caseId: string) => `/bilateral-clearing/cases/${caseId}/unshare`,
  teamComments: (caseId: string) => `/bilateral-clearing/cases/${caseId}/team-comments`,
  teamCases: '/bilateral-clearing/team-cases',
  
  // KI-Integration
  aiAnalysis: (caseId: string) => `/bilateral-clearing/cases/${caseId}/ai-analysis`,
  aiSuggestActions: (caseId: string) => `/bilateral-clearing/cases/${caseId}/ai-suggest-actions`,
  aiGenerateResponse: (caseId: string) => `/bilateral-clearing/cases/${caseId}/ai-generate-response`,
  marketPartnerSearch: '/bilateral-clearing/market-partners/search',
  validateDAR: '/bilateral-clearing/validate-dar',
}
```

#### 5.2.2. Neue Service-Architektur
```
src/
├── services/
│   └── bilateralClearingService.ts
├── repositories/
│   └── bilateralClearingRepository.ts
├── controllers/
│   └── bilateralClearingController.ts
├── routes/
│   └── bilateralClearing.routes.ts
└── middleware/
    └── bilateralClearingMiddleware.ts
```

#### 5.2.3. Integration mit bestehenden Services
- **Code Lookup Service:** Nutzung für Marktpartner-Suche
- **Chat/AI Service:** Erweiterte KI-Analyse für Klärfälle
- **Document Service:** Attachment-Management
- **Email Service:** Integration für Email-Parsing und -Versand
- **User Service:** Benutzer- und Team-Management

#### 5.2.4. Datenmodell (MongoDB Collections)
```typescript
// Neue Collection: bilateral_cases
interface BilateralCase {
  _id: ObjectId;
  caseNumber: string; // Automatisch generiert: BC-YYYY-XXXXX
  title: string;
  description?: string;
  
  // Marktpartner-Integration
  marketPartner: {
    id: string; // Referenz auf Code Lookup
    name: string;
    code?: string;
    type: 'bdew' | 'eic';
    contact?: {
      name?: string;
      email?: string;
      phone?: string;
    };
  };
  
  // DAR und Prozess-Info
  dar: string; // Datenaustauschreferenz
  problemType: 'stammdaten' | 'messwerte' | 'prozess' | 'sonstiges';
  edifactMessageType?: 'APERAK' | 'UTILMD' | 'MSCONS' | 'ORDERS' | 'INVOIC';
  
  // Status und Priorität
  status: 'offen' | 'in_bearbeitung' | 'abgeschlossen' | 'eskaliert' | 'storniert';
  priority: 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
  
  // Zeitmanagement
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  
  // Benutzer-Zuordnung
  assignedTo: ObjectId; // User ID
  createdBy: ObjectId; // User ID
  teamId?: ObjectId; // Team-Zuordnung
  
  // Team-Freigabe
  isSharedWithTeam: boolean; // Für Team freigegeben
  sharedAt?: Date; // Zeitpunkt der Freigabe
  sharedBy?: ObjectId; // User ID des Freigeber
  teamPermissions: {
    canView: boolean; // Team kann Case einsehen
    canComment: boolean; // Team kann kommentieren
    canEdit: boolean; // Team kann bearbeiten (nur für Team-Leads)
  };
  
  // Verknüpfungen
  attachments: ObjectId[]; // Referenzen auf attachment_files
  notes: ObjectId[]; // Referenzen auf case_notes
  emails: ObjectId[]; // Referenzen auf case_emails
  
  // KI-Analyse
  aiAnalysis?: {
    lastAnalyzed: Date;
    problemCategory: string;
    confidence: number;
    suggestedActions: string[];
    regulatoryNotes: string[];
    similarCases: string[];
    riskLevel: 'niedrig' | 'mittel' | 'hoch';
    nextSteps?: string[];
  };
  
  // Audit Trail
  statusHistory: Array<{
    status: string;
    changedAt: Date;
    changedBy: ObjectId;
    reason?: string;
  }>;
  
  // Metadaten
  tags?: string[];
  externalReferences?: Array<{
    type: 'chat' | 'document' | 'email' | 'external';
    id: string;
    description?: string;
  }>;
}

// Neue Collection: case_attachments
interface CaseAttachment {
  _id: ObjectId;
  caseId: ObjectId;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  
  // Kategorisierung
  type: 'edifact' | 'response' | 'document' | 'email' | 'screenshot';
  category: 'ursprung' | 'fehler' | 'korrektur' | 'kommunikation';
  
  // Versionierung
  version: number;
  parentAttachmentId?: ObjectId;
  
  // Metadaten
  uploadedAt: Date;
  uploadedBy: ObjectId;
  description?: string;
  
  // File Storage
  storageType: 'local' | 'mongodb' | 's3';
  storagePath: string;
  
  // EDIFACT-spezifische Felder
  edifactParsed?: {
    messageType: string;
    sender: string;
    receiver: string;
    timestamp?: Date;
    segments: Array<{
      tag: string;
      elements: string[];
    }>;
  };
}

// Neue Collection: case_notes
interface CaseNote {
  _id: ObjectId;
  caseId: ObjectId;
  content: string; // Markdown-formatted
  
  // Kategorisierung
  step?: 'fehleridentifikation' | 'ursachenforschung' | 'korrektur' | 'abschluss' | 'allgemein';
  noteType: 'internal' | 'customer_communication' | 'regulatory' | 'technical' | 'team_comment';
  
  // Benutzer-Info
  createdAt: Date;
  createdBy: ObjectId;
  updatedAt?: Date;
  updatedBy?: ObjectId;
  
  // Team-Funktionalität
  isTeamComment: boolean; // Kommentar von Team-Mitglied
  visibleToTeam: boolean; // Für Team sichtbar
  
  // Verknüpfungen
  linkedAttachments?: ObjectId[];
  linkedEmails?: ObjectId[];
  
  // Tags
  tags?: string[];
}

// Neue Collection: team_case_activities
interface TeamCaseActivity {
  _id: ObjectId;
  caseId: ObjectId;
  teamId: ObjectId;
  userId: ObjectId;
  
  // Activity-Details
  activityType: 'shared' | 'unshared' | 'commented' | 'viewed' | 'helped';
  description: string;
  timestamp: Date;
  
  // Metadaten
  metadata?: {
    commentId?: ObjectId;
    noteId?: ObjectId;
    previousStatus?: string;
    newStatus?: string;
  };
}

// Neue Collection: case_emails
interface CaseEmailRecord {
  _id: ObjectId;
  caseId: ObjectId;
  
  // Email-Metadaten
  direction: 'eingehend' | 'ausgehend';
  subject?: string;
  from?: string;
  to?: string[];
  cc?: string[];
  timestamp: Date;
  
  // Content
  content: string; // Original Email Body
  contentType: 'text' | 'html' | 'mixed';
  
  // Parsing
  parsedHeaders?: Record<string, string>;
  attachmentCount?: number;
  
  // Verarbeitung
  addedAt: Date;
  addedBy: ObjectId;
  source: 'manual_paste' | 'forward' | 'import';
  
  // Kategorisierung
  emailType: 'clarification_request' | 'response' | 'escalation' | 'notification' | 'other';
}
```

### 5.3. KI/LLM-Integration (Erweiterte bestehende Services)

Das System nutzt die bereits vorhandene KI-Infrastruktur und erweitert sie für die bilaterale Klärung:

#### 5.3.1. Integration mit bestehenden AI-Services
- **Chat API:** Nutzung des bestehenden `chatApi` für kontextuelle Beratung
- **Google Gemini:** Erweiterte Prompts für EDIFACT-Analyse
- **Vector Database:** Qdrant für Ähnlichkeitssuche in historischen Fällen
- **Document Processing:** Mammoth + PDF-Parse für Attachment-Analyse

#### 5.3.2. Spezielle Prompt-Engineering für Bilateral Clearing
```typescript
// Neue Prompt-Templates in aiResponseUtils.ts
export const BILATERAL_CLEARING_PROMPTS = {
  caseAnalysis: `
    Analysiere den folgenden bilateralen Klärfall im Kontext der deutschen Marktkommunikation:
    
    Problem-Typ: {problemType}
    DAR: {dar}
    Marktpartner: {marketPartner}
    Beschreibung: {description}
    
    Berücksichtige dabei:
    1. GPKE/MaBiS-Regelungen
    2. BDEW-Anwendungshilfen
    3. Typische EDIFACT-Fehlerszenarien
    4. Fristen und Eskalationspfade
    
    Liefere eine strukturierte Analyse mit:
    - Problemkategorisierung
    - Risikobewertung
    - Nächste Schritte
    - Regulatorische Hinweise
  `,
  
  edifactAnalysis: `
    Analysiere die folgende EDIFACT-Nachricht im Kontext einer bilateralen Klärung:
    
    {edifactContent}
    
    Identifiziere:
    1. Nachrichtentyp und -struktur
    2. Fehlerhafte Segmente
    3. Mögliche Ursachen
    4. Korrekturvorschläge nach BDEW-Standards
  `,
  
  responseGeneration: `
    Generiere eine professionelle Antwort für eine bilaterale Klärung:
    
    Kontext: {context}
    Empfänger: {marketPartner}
    Thema: {subject}
    
    Die Antwort soll:
    - Professionell und sachlich sein
    - Regulatorische Anforderungen berücksichtigen
    - Klare nächste Schritte definieren
    - Fristen erwähnen
  `
};
```

#### 5.3.3. Erweiterte Wissensbank-Integration
```typescript
// Erweiterung der bestehenden Vector-Store-Abfrage
interface BilateralClearingKnowledge {
  edifactMessages: {
    type: string;
    structure: any;
    commonErrors: string[];
    examples: any[];
  }[];
  
  regulatoryRules: {
    source: 'GPKE' | 'MaBiS' | 'MPES' | 'WiM';
    rule: string;
    applicability: string[];
    deadlines: string[];
  }[];
  
  marketPartnerTemplates: {
    type: string;
    responseTemplates: string[];
    escalationPaths: string[];
  }[];
  
  historicalCases: {
    problemType: string;
    solution: string;
    outcome: string;
    timeToResolution: number;
  }[];
}
```

### 5.4. Integrationspunkte mit bestehenden Funktionen

#### 5.4.1. Marktpartner-Suche Integration
```typescript
// Erweiterte CodeLookup-Komponente
interface MarketPartnerSelectorProps {
  onSelect: (partner: CodeSearchResult) => void;
  prefilter?: {
    codeType?: 'bdew' | 'eic';
    city?: string;
    companyName?: string;
  };
}

// Integration mit bestehender Search-API
const searchMarketPartners = async (query: string) => {
  return await fetch('/api/v1/codes/search', {
    method: 'POST',
    body: JSON.stringify({ searchTerm: query })
  });
};
```

#### 5.4.2. Chat-Integration für KI-Unterstützung
```typescript
// Neue Chat-Context für Bilateral Clearing
interface BilateralClearingChatContext {
  caseId: string;
  marketPartner: CodeSearchResult;
  dar: string;
  problemType: string;
  attachments: CaseAttachment[];
  notes: CaseNote[];
}

// Integration mit bestehendem ChatAPI
const getBilateralClearingAdvice = async (
  context: BilateralClearingChatContext,
  question: string
) => {
  return await chatApi.sendMessage({
    content: question,
    contextSettings: {
      useWorkspaceOnly: false,
      workspacePriority: 'medium',
      includeUserDocuments: true,
      includeUserNotes: true,
      includeSystemKnowledge: true,
      includeM2CRoles: true,
      customContext: {
        type: 'bilateral_clearing',
        data: context
      }
    }
  });
};
```

#### 5.4.3. User-Management und Teams Integration
```typescript
// Nutzung des bestehenden AuthContext
interface BilateralClearingPermissions {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canEscalate: boolean;
  canViewAllCases: boolean; // Teamleiter/Admin
  canAssignCases: boolean;
  canShareWithTeam: boolean; // Eigene Cases mit Team teilen
  canViewTeamCases: boolean; // Team-Cases einsehen
  canCommentOnTeamCases: boolean; // Kommentare zu Team-Cases
  canEditTeamCases: boolean; // Team-Cases bearbeiten (nur Leads)
}

// Integration mit Team-System
const getBilateralClearingPermissions = (
  user: User,
  userTeam?: Team,
  caseOwner?: User
): BilateralClearingPermissions => {
  const isOwner = caseOwner?.id === user.id;
  const isTeamLead = userTeam?.role === 'lead';
  const isAdmin = user.role === 'admin';

  return {
    canCreate: true,
    canEdit: isOwner || isAdmin || isTeamLead,
    canDelete: isOwner || isAdmin,
    canEscalate: true,
    canViewAllCases: isAdmin || isTeamLead,
    canAssignCases: isAdmin || isTeamLead,
    canShareWithTeam: isOwner || isAdmin,
    canViewTeamCases: !!userTeam, // Nur wenn Teil eines Teams
    canCommentOnTeamCases: !!userTeam,
    canEditTeamCases: isAdmin || isTeamLead
  };
};

// Team-Notification-Service
interface TeamNotificationService {
  notifyTeamAboutSharedCase: (caseId: string, teamId: string, sharedBy: User) => Promise<void>;
  notifyTeamAboutNewComment: (caseId: string, commentId: string, teamId: string) => Promise<void>;
  notifyOwnerAboutTeamActivity: (caseId: string, activity: TeamCaseActivity) => Promise<void>;
}
```

#### 5.4.4. Document Management Integration
```typescript
// Erweiterte Nutzung des bestehenden Document-Upload-Systems
interface BilateralClearingUploadConfig {
  allowedTypes: string[];
  maxFileSize: number;
  uploadPath: string;
  virusScan: boolean;
  edifactParsing: boolean;
}

const BILATERAL_CLEARING_UPLOAD_CONFIG: BilateralClearingUploadConfig = {
  allowedTypes: [
    'application/pdf',
    'text/plain',
    'application/xml',
    'message/rfc822', // Email files
    'image/jpeg',
    'image/png'
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  uploadPath: '/bilateral-clearing/attachments',
  virusScan: true,
  edifactParsing: true
};
```

## 6. Nicht-funktionale Anforderungen

### 6.1. Performance
- Dashboard-Ladezeit < 2 Sekunden
- KI-Analyse < 5 Sekunden
- Datei-Upload < 30 Sekunden (bis 10MB)

### 6.2. Sicherheit
- Verschlüsselung sensibler Daten
- Audit-Log für alle Änderungen
- Rollenbasierte Zugriffskontrolle
- DSGVO-konforme Datenverarbeitung

### 6.3. Verfügbarkeit
- 99.5% Uptime
- Automatische Backups
- Disaster Recovery Plan

### 6.4. Skalierbarkeit
- Unterstützung für bis zu 10.000 aktive Klärfälle
- Horizontale Skalierung der KI-Services

## 7. Implementierungsphasen (detailliert)

### Phase 1: Grundfunktionalität und Integration (Sprint 1-2)

#### Sprint 1: Backend-Foundation
**Ziel:** Grundlegende API und Datenstrukturen

**Backend-Tasks:**
- [ ] MongoDB Collections erstellen (`bilateral_cases`, `case_attachments`, `case_notes`, `case_emails`)
- [ ] Repository-Layer implementieren (`BilateralClearingRepository`)
- [ ] Service-Layer grundlegend implementieren (`BilateralClearingService`)
- [ ] REST-API Endpoints für CRUD-Operationen
- [ ] Integration mit bestehender Authentication (JWT-Middleware)
- [ ] Basis-Validierung für Case-Erstellung

**Frontend-Tasks:**
- [ ] Neue Routing-Struktur in `App.tsx`
- [ ] Navigation-Integration in `Layout.tsx`
- [ ] Basic Dashboard-Komponente (`BilateralClearingDashboard`)
- [ ] Case-List-Komponente mit MUI DataGrid
- [ ] `bilateralClearingApi.ts` Service implementieren
- [ ] TypeScript-Interfaces für alle Datenstrukturen

**Integration-Tasks:**
- [ ] `apiEndpoints.ts` um Bilateral-Clearing-Endpoints erweitern
- [ ] Bestehende `apiClient.ts` für neue Endpoints konfigurieren
- [ ] Error-Handling für neue API-Routes

#### Sprint 2: Core-Features
**Ziel:** Case-Management und Marktpartner-Integration

**Backend-Tasks:**
- [ ] Marktpartner-Integration mit Code-Lookup-Service
- [ ] DAR-Validierung implementieren
- [ ] Status-Management und Workflow-Logic
- [ ] Audit-Trail für Statusänderungen
- [ ] File-Upload-Integration für Attachments
- [ ] Team-Freigabe-Funktionalität implementieren
- [ ] Team-Permissions und Sichtbarkeits-Logic

**Frontend-Tasks:**
- [ ] Case-Erstellungs-Formular (`CaseForm.tsx`)
- [ ] Marktpartner-Selector mit bestehender CodeLookup-Integration
- [ ] DAR-Input-Komponente mit Validierung
- [ ] Status-Badge und Priority-Indicator Komponenten
- [ ] Basic Case-Detail-View (`CaseDetail.tsx`)
- [ ] Team-Share-Dialog (`TeamShareDialog.tsx`)
- [ ] Team-Case-Indicator für Dashboard

**Integration-Tasks:**
- [ ] CodeLookup-Komponente für Bilateral-Clearing anpassen
- [ ] Bestehende Upload-Funktionalität erweitern
- [ ] Team-Integration für Case-Assignment und -Sharing
- [ ] Notification-System für Team-Aktivitäten

### Phase 2: Erweiterte Features (Sprint 3)

#### Sprint 3: Attachment und Kommunikation
**Ziel:** File-Management und Kommunikations-Features

**Backend-Tasks:**
- [ ] EDIFACT-Parser-Integration
- [ ] Email-Parsing-Service für Copy&Paste
- [ ] Advanced File-Processing (Virus-Scan, Metadata-Extraction)
- [ ] Notes-Management mit Rich-Text-Support
- [ ] Email-Record-Management

**Frontend-Tasks:**
- [ ] Attachment-Manager mit Drag&Drop (`AttachmentManager.tsx`)
- [ ] EDIFACT-File-Viewer mit Syntax-Highlighting
- [ ] Rich-Text-Notes-Editor (`NotesEditor.tsx`)
- [ ] Email-Integration-Component (`EmailIntegration.tsx`)
- [ ] Timeline-View für Case-History
- [ ] Team-Comments-Komponente (`TeamComments.tsx`)
- [ ] Team-Activity-Feed für freigegebene Cases

**Integration-Tasks:**
- [ ] Bestehende Document-Service erweitern
- [ ] File-Preview-Integration
- [ ] Notification-System für Status-Changes
- [ ] Team-Notification-Service für Comments und Activities

### Phase 3: KI-Integration (Sprint 4)

#### Sprint 4: AI-Assistant und Smart Features
**Ziel:** KI-gestützte Analyse und Handlungsempfehlungen

**Backend-Tasks:**
- [ ] AI-Analysis-Service mit Gemini-Integration
- [ ] Prompt-Engineering für EDIFACT-Analyse
- [ ] Vector-Search für ähnliche Cases
- [ ] Regulatory-Compliance-Checker
- [ ] Smart-Response-Generation

**Frontend-Tasks:**
- [ ] AI-Assistant-Komponente (`AIAssistant.tsx`)
- [ ] Analysis-Results-Display
- [ ] Smart-Suggestions-Panel
- [ ] Compliance-Checker-UI
- [ ] Similar-Cases-Finder

**Integration-Tasks:**
- [ ] Chat-API für Bilateral-Clearing-Context erweitern
- [ ] Bestehende Vector-Database-Integration
- [ ] Knowledge-Base mit GPKE/MaBiS-Inhalten erweitern

### Phase 4: Optimierung und Reporting (Sprint 5)

#### Sprint 5: Performance und Analytics
**Ziel:** Optimierung und Business-Intelligence

**Backend-Tasks:**
- [ ] Performance-Optimierung (Caching, Indexing)
- [ ] Reporting-API für Management-Dashboards
- [ ] Bulk-Operations für Case-Management
- [ ] Advanced Search mit Elasticsearch/MongoDB-Text-Search
- [ ] API-Rate-Limiting und Monitoring

**Frontend-Tasks:**
- [ ] Advanced-Filter für Dashboard
- [ ] Export-Funktionen (PDF, Excel, CSV)
- [ ] Analytics-Dashboard für Führungskräfte
- [ ] Bulk-Actions für Case-Management
- [ ] Performance-Optimierung (Lazy-Loading, Virtualization)

**Integration-Tasks:**
- [ ] Bestehende Monitoring-Tools erweitern
- [ ] Business-Intelligence-Integration
- [ ] Advanced-Caching-Strategien implementieren

## 8. Testkriterien (erweitert)

### 8.1. Unit Tests (Ziel: 90% Coverage)

#### Backend Unit Tests
- [ ] `BilateralClearingService` - alle CRUD-Operationen
- [ ] `BilateralClearingRepository` - MongoDB-Interaktionen
- [ ] EDIFACT-Parser-Service - Verschiedene Nachrichtentypen
- [ ] Email-Parsing-Service - Header-Extraktion und Content-Parsing
- [ ] AI-Analysis-Service - Mock-Tests mit vordefinierten Antworten
- [ ] Validation-Service - DAR-Format und Business-Rules
- [ ] Authentication-Integration - JWT-Token-Handling

#### Frontend Unit Tests
- [ ] `BilateralClearingDashboard` - Rendering und Filter-Funktionen
- [ ] `CaseForm` - Validierung und Submission
- [ ] `AttachmentManager` - File-Upload und -Display
- [ ] `MarketPartnerSelector` - Integration mit CodeLookup
- [ ] `AIAssistant` - Response-Handling und Error-States
- [ ] `bilateralClearingApi` - HTTP-Client-Mocks
- [ ] Custom Hooks - State-Management und Side-Effects

### 8.2. Integration Tests

#### API Integration Tests
- [ ] **Case-Lifecycle-Test:** Erstellen → Bearbeiten → Abschließen
- [ ] **Marktpartner-Integration:** CodeLookup-Service-Verbindung
- [ ] **File-Upload-Workflow:** EDIFACT-Upload → Parsing → Storage
- [ ] **Email-Integration:** Copy&Paste → Parsing → Storage
- [ ] **AI-Service-Integration:** Case-Analysis → Suggestions → Response-Generation
- [ ] **Authentication-Flow:** Login → Case-Access → Permissions
- [ ] **Team-Integration:** Case-Assignment → Permission-Checks

#### Database Integration Tests
- [ ] **MongoDB-Operations:** CRUD mit komplexen Queries
- [ ] **Cross-Collection-Queries:** Cases mit Attachments und Notes
- [ ] **Audit-Trail-Verification:** Status-Changes werden korrekt geloggt
- [ ] **Data-Consistency:** Referential Integrity zwischen Collections
- [ ] **Performance-Tests:** Large Dataset Queries

### 8.3. User Acceptance Tests (UAT)

#### Realistic Scenario Testing
- [ ] **Stammdaten-Klärfall:** MaLo-ID-Konflikt zwischen LF und VNB
  - Marktpartner auswählen
  - DAR eingeben
  - UTILMD-Fehlermeldung hochladen
  - KI-Analyse abrufen
  - Korrektur-Email verfassen
  - Case abschließen

- [ ] **Messwerte-Klärfall:** Falsche Zählerstände im MSCONS
  - APERAK-Nachricht hochladen
  - Fehleranalyse durch KI
  - Kommunikation mit MSB dokumentieren
  - Korrigierte MSCONS verarbeiten

- [ ] **Prozess-Klärfall:** Verspätete Anmeldung zur Netznutzung
  - Fristenüberschreitung dokumentieren
  - Eskalationspfad durchlaufen
  - Regulatorische Compliance prüfen

#### Multi-User Scenarios
- [ ] **Team-Collaboration:** Case-Assignment zwischen Team-Mitgliedern
- [ ] **Team-Sharing:** Case für Team freigeben und Team-Kommentare hinzufügen
- [ ] **Permission-Testing:** Admin vs. User vs. Guest vs. Team-Lead Permissions
- [ ] **Concurrent-Access:** Mehrere User bearbeiten gleichen Case
- [ ] **Team-Notifications:** Benachrichtigungen bei Team-Activities
- [ ] **Audit-Trail:** Nachvollziehbarkeit aller Änderungen und Team-Aktivitäten

#### Performance Under Load
- [ ] **Dashboard-Performance:** 1000+ Cases mit verschiedenen Filtern
- [ ] **File-Upload-Performance:** Gleichzeitige Uploads verschiedener Größen
- [ ] **AI-Analysis-Performance:** Batch-Processing mehrerer Cases
- [ ] **Search-Performance:** Volltext-Suche in Notes und Attachments

### 8.4. Spezifische Fachliche Tests

#### EDIFACT-Message-Processing
- [ ] **APERAK-Parsing:** Korrekte Extraktion von Fehlercodes
- [ ] **UTILMD-Analysis:** Stammdaten-Plausibilitätsprüfung
- [ ] **MSCONS-Validation:** Messwert-Konsistenz-Checks
- [ ] **ORDERS-Processing:** Anfragen-Response-Matching

#### Regulatory Compliance Tests
- [ ] **GPKE-Compliance:** Fristen-Einhaltung bei Lieferantenwechsel
- [ ] **MaBiS-Compliance:** Bilanzkreis-Zuordnungen korrekt
- [ ] **BNetzA-Festlegungen:** Dokumentationspflichten erfüllt
- [ ] **BDEW-Guidelines:** Best-Practices befolgt

#### AI/LLM Accuracy Tests
- [ ] **Problem-Classification:** Korrekte Kategorisierung von 95% der Test-Cases
- [ ] **Regulatory-Notes:** Relevante Hinweise für 90% der Cases
- [ ] **Similar-Cases:** Mindestens 3 relevante ähnliche Cases
- [ ] **Response-Quality:** Generated Responses sind fachlich korrekt

### 8.5. Security und Compliance Tests

#### Data Protection (DSGVO)
- [ ] **Personal-Data-Handling:** Keine PII in Logs
- [ ] **Data-Retention:** Automatische Löschung nach Aufbewahrungsfristen
- [ ] **Access-Control:** Rollenbasierte Datenzugriffe
- [ ] **Audit-Logging:** Vollständige Nachverfolgbarkeit

#### Security Tests
- [ ] **Authentication-Security:** JWT-Token-Validation
- [ ] **Authorization-Security:** Permission-Based-Access-Control
- [ ] **File-Upload-Security:** Virus-Scanning und Type-Validation
- [ ] **Input-Validation:** SQL-Injection und XSS-Prevention
- [ ] **Rate-Limiting:** API-Abuse-Prevention

### 8.6. Browser-Compatibility Tests

#### Cross-Browser Testing
- [ ] **Chrome:** Version 120+ (Primary Browser)
- [ ] **Firefox:** Version 118+ 
- [ ] **Safari:** Version 16+ (MacOS)
- [ ] **Edge:** Version 118+ (Corporate Environment)

#### Responsive Design Tests
- [ ] **Desktop:** 1920x1080, 1366x768
- [ ] **Tablet:** iPad (1024x768), Android Tablets
- [ ] **Mobile:** iPhone (390x844), Android Phones (360x800)

### 8.7. Performance Benchmarks

#### Load-Time Requirements
- [ ] **Dashboard Initial Load:** < 2 Sekunden
- [ ] **Case Detail View:** < 1.5 Sekunden
- [ ] **AI Analysis:** < 5 Sekunden
- [ ] **File Upload (10MB):** < 30 Sekunden
- [ ] **Search Results:** < 1 Sekunde

#### Concurrent User Tests
- [ ] **50 Concurrent Users:** Dashboard responsive
- [ ] **20 Concurrent File Uploads:** System stable
- [ ] **100 Concurrent API Calls:** Response times acceptable

## 9. Risiken und Mitigationen

### 9.1. Hohe Risiken
- **KI-Halluzinationen:** Validierung durch Fachexperten, Confidence-Scores
- **Regulatorische Compliance:** Enge Abstimmung mit Rechtsabteilung
- **Performance bei großen Datenmengen:** Profiling und Optimierung

### 9.2. Mittlere Risiken
- **User Adoption:** Umfassende Schulungen und Change Management
- **Datenqualität:** Validierungsregeln und Datenbereinigung

## 10. Erfolgs-Metriken

### 10.1. Quantitative Metriken
- Reduzierung der durchschnittlichen Klärfall-Bearbeitungszeit um 40%
- Erhöhung der First-Time-Fix-Rate auf 80%
- Compliance-Rate von 98% bei Fristen-Einhaltung

### 10.2. Qualitative Metriken
- User Satisfaction Score > 4.0/5.0
- Reduzierung von Eskalationen an BNetzA
- Verbesserung der Audit-Ergebnisse

## 11. Abhängigkeiten und Voraussetzungen

### 11.1. Externe Abhängigkeiten
- Marktpartner-Stammdaten-API
- EDIFACT-Parser-Bibliothek
- KI/LLM-Service (OpenAI/Claude)

### 11.2. Interne Voraussetzungen und Integrationspunkte

#### 11.2.1. Bestehende Systeme (bereits vorhanden)
- ✅ **User-Management-System:** AuthContext mit JWT-basierter Authentifizierung
- ✅ **Chat-Integration-API:** Vollständig implementiert mit KI-Unterstützung
- ✅ **Marktpartnersuche-Funktionalität:** CodeLookup-Komponente mit BDEW/EIC-Daten
- ✅ **Document-Upload-System:** Multer-basiert mit verschiedenen Dateiformaten
- ✅ **Team-Management:** Vollständig implementiert mit Rollen und Permissions
- ✅ **Email-Service:** NodeMailer mit Template-System
- ✅ **Vector Database:** Qdrant für Ähnlichkeitssuche
- ✅ **AI/LLM-Services:** Google Gemini Integration

#### 11.2.2. Erforderliche Erweiterungen bestehender Services

**1. Code Lookup Service**
```typescript
// Erweiterte API für Bilateral Clearing
interface MarketPartnerSearchExtension {
  searchForBilateralClearing: (query: string) => Promise<CodeSearchResult[]>;
  getMarketPartnerDetails: (code: string) => Promise<MarketPartnerDetails>;
  validateMarketPartnerCode: (code: string, type: 'bdew' | 'eic') => Promise<ValidationResult>;
}
```

**2. Chat API Erweiterung**
```typescript
// Neue Context-Settings für Bilateral Clearing
interface BilateralClearingContext extends ContextSettings {
  caseContext?: {
    caseId: string;
    problemType: string;
    marketPartner: string;
    dar: string;
    currentStatus: string;
  };
}
```

**3. Document Service Erweiterung**
```typescript
// EDIFACT-spezifische Parser
interface EDIFACTParser {
  parseMessage: (content: string) => Promise<ParsedEDIFACT>;
  validateStructure: (message: ParsedEDIFACT) => ValidationResult;
  extractErrors: (message: ParsedEDIFACT) => ErrorAnalysis[];
}
```

**4. Email Service Erweiterung**
```typescript
// Email-Parsing für Copy&Paste-Funktionalität
interface EmailParsingService {
  parseEmailText: (emailText: string) => ParsedEmail;
  extractHeaders: (emailText: string) => EmailHeaders;
  detectDirection: (email: ParsedEmail) => 'eingehend' | 'ausgehend';
}
```

#### 11.2.3. Neue Service-Abhängigkeiten

**1. EDIFACT Parsing Library**
```bash
npm install edifact-parser xml2js
```

**2. Email Parsing Utilities**
```bash
npm install emailjs-mime-parser mailparser-mit
```

**3. Validation Libraries**
```bash
npm install joi zod
```

#### 11.2.4. Database Schema Erweiterungen

**MongoDB Collections (neu):**
- `bilateral_cases`
- `case_attachments`
- `case_notes`
- `case_emails`
- `case_audit_logs`
- `team_case_activities`

**PostgreSQL Erweiterungen (optional):**
```sql
-- Für bessere Reporting-Performance
CREATE TABLE bilateral_cases_summary (
  id SERIAL PRIMARY KEY,
  case_id VARCHAR(255) UNIQUE,
  market_partner_code VARCHAR(50),
  problem_type VARCHAR(50),
  status VARCHAR(50),
  priority VARCHAR(50),
  created_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolution_time_hours INTEGER,
  is_shared_with_team BOOLEAN DEFAULT FALSE,
  team_id INTEGER,
  shared_at TIMESTAMP
);

-- Index für Team-Queries
CREATE INDEX idx_bilateral_cases_team ON bilateral_cases_summary(team_id, is_shared_with_team);
CREATE INDEX idx_bilateral_cases_shared_at ON bilateral_cases_summary(shared_at) WHERE is_shared_with_team = TRUE;
```

#### 11.2.5. API-Gateway Konfiguration

**Route-Registrierung in Express:**
```typescript
// In src/server.ts
import bilateralClearingRoutes from './routes/bilateralClearing';

app.use('/api/bilateral-clearing', 
  authMiddleware, 
  bilateralClearingRoutes
);
```

**Proxy-Konfiguration für Legacy App:**
```typescript
// Bestehende setupProxy.js erweitern
app.use('/api/bilateral-clearing', 
  createProxyMiddleware({
    target: 'http://localhost:3009',
    changeOrigin: true
  })
);
```

## 12. Dokumentation und Schulung

### 12.1. Technische Dokumentation
- [ ] API-Dokumentation (OpenAPI/Swagger)
- [ ] Architektur-Diagramme
- [ ] Deployment-Guides

### 12.2. Benutzer-Dokumentation
- [ ] Feature-Handbuch
- [ ] Video-Tutorials
- [ ] FAQ und Troubleshooting

### 12.3. Schulungsplan
- [ ] Train-the-Trainer-Programm
- [ ] Webinare für End-User
- [ ] E-Learning-Module

## 13. Nächste Schritte

1. **Review und Freigabe** dieses Change Requests durch Stakeholder
2. **Detailliertes Technical Design** für Phase 1
3. **Team-Zusammenstellung** und Sprint-Planung
4. **Prototyping** der KI-Integration
5. **Stakeholder-Alignment** zu regulatorischen Anforderungen

---

**Erstellt:** 12. August 2025  
**Version:** 1.0  
**Status:** Draft  
**Review-Datum:** TBD

## 14. Code Agent Implementation Guide

### 14.1 Atomare Implementation Tasks

#### Phase 1: Core Data Models und Database Setup

**Task 1.1: Database Schema Extension**
- **Datei**: `/migration-bilateral-clarifications.sql`
- **Erstellen**: Neue SQL-Migration für PostgreSQL
- **Validierung**: Führe Migration aus und prüfe Tabellenerstellung

```sql
-- PostgreSQL Schema Extension für Bilaterale Klärfälle
CREATE TABLE bilateral_clarifications (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    market_partner_code VARCHAR(20) NOT NULL,
    market_partner_name VARCHAR(255),
    case_type VARCHAR(50) NOT NULL CHECK (case_type IN ('B2B', 'GENERAL', 'TECHNICAL', 'BILLING')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')) DEFAULT 'OPEN',
    priority VARCHAR(20) CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    resolution_date TIMESTAMP,
    resolution_notes TEXT,
    tags TEXT[],
    shared_with_team BOOLEAN DEFAULT FALSE,
    team_id UUID REFERENCES teams(id),
    external_case_id VARCHAR(100),
    source_system VARCHAR(50) DEFAULT 'MANUAL'
);

CREATE TABLE clarification_attachments (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE clarification_notes (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    note_type VARCHAR(50) DEFAULT 'USER' CHECK (note_type IN ('USER', 'SYSTEM', 'AI_SUGGESTION')),
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_internal BOOLEAN DEFAULT FALSE
);

CREATE TABLE clarification_team_comments (
    id SERIAL PRIMARY KEY,
    clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    parent_comment_id INTEGER REFERENCES clarification_team_comments(id)
);

-- Indizes für Performance
CREATE INDEX idx_bilateral_clarifications_status ON bilateral_clarifications(status);
CREATE INDEX idx_bilateral_clarifications_created_by ON bilateral_clarifications(created_by);
CREATE INDEX idx_bilateral_clarifications_market_partner ON bilateral_clarifications(market_partner_code);
CREATE INDEX idx_bilateral_clarifications_team_shared ON bilateral_clarifications(shared_with_team, team_id);
CREATE INDEX idx_clarification_attachments_clarification_id ON clarification_attachments(clarification_id);
CREATE INDEX idx_clarification_notes_clarification_id ON clarification_notes(clarification_id);
CREATE INDEX idx_clarification_team_comments_clarification_id ON clarification_team_comments(clarification_id);
```

**Task 1.2: TypeScript Interfaces**
- **Datei**: `/app-legacy/src/types/bilateral.ts`
- **Erstellen**: TypeScript Interface-Definitionen
- **Validierung**: Keine TypeScript-Kompilierfehler

### 14.2 Implementierungsreihenfolge und Abhängigkeiten

#### Dependency Matrix
```
Task 1.1 (DB Schema) → Task 1.2 (TypeScript Types)
Task 1.2 → Task 2.1 (Backend API)
Task 2.1 → Task 2.2 (Frontend Service)
Task 2.2 → Task 3.1 (Main Component)
Task 3.1 → Task 3.2 (List Component)
Task 3.2 → Task 4.1 (Router)
Task 4.1 → Task 4.2 (Navigation)
```

#### Implementierungsschritte
1. **Database Setup** (Task 1.1) - Erstelle Migration und führe aus
2. **Type Definitions** (Task 1.2) - TypeScript-Interfaces erstellen
3. **Backend API** (Task 2.1) - Express-Router implementieren
4. **Frontend Service** (Task 2.2) - API-Service-Klasse erstellen
5. **Core Components** (Task 3.1, 3.2) - React-Komponenten implementieren
6. **Integration** (Task 4.1, 4.2) - Router und Navigation integrieren

### 14.3 Validierungskriterien

#### Task 1.1 Validierung
```sql
-- Prüfe Tabellenerstellung
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'bilateral%';
```

#### Task 1.2 Validierung
```bash
npm run type-check  # Keine TypeScript-Fehler
```

### 14.4 Integration-Checkpoints

#### Checkpoint 1: Database & Types Ready
- [ ] Migration erfolgreich ausgeführt
- [ ] Alle Tabellen existieren  
- [ ] TypeScript-Interfaces kompilieren ohne Fehler

#### Checkpoint 2: Backend API Functional
- [ ] Alle CRUD-Endpoints antworten
- [ ] Authentication funktioniert
- [ ] Error-Handling funktioniert

#### Checkpoint 3: Frontend Integration Complete
- [ ] Components laden ohne Errors
- [ ] Navigation funktioniert
- [ ] End-to-End User Flow funktioniert

### 14.5 Rollback-Strategie

#### Database Rollback
```sql
DROP TABLE IF EXISTS clarification_team_comments;
DROP TABLE IF EXISTS clarification_notes; 
DROP TABLE IF EXISTS clarification_attachments;
DROP TABLE IF EXISTS bilateral_clarifications;
```

#### Code Rollback
```bash
# Remove added files
rm -rf /app-legacy/src/components/BilateralClarifications/
rm /app-legacy/src/types/bilateral.ts
rm /app-legacy/src/services/bilateralClarificationService.ts

# Restore modified files from git  
git checkout HEAD -- /app-legacy/src/components/AppRouter.tsx
git checkout HEAD -- /app-legacy/src/components/Navigation.tsx
```