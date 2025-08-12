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

## 5. Technische Anforderungen

### 5.1. Frontend (React)

#### 5.1.1. Neue Komponenten
- `BilateralClearing/Dashboard`
- `BilateralClearing/CaseForm`
- `BilateralClearing/CaseDetail`
- `BilateralClearing/AttachmentManager`
- `BilateralClearing/NotesEditor`
- `BilateralClearing/EmailIntegration`
- `BilateralClearing/AIAssistant`

#### 5.1.2. State Management
- Redux-Slice für Klärfall-State
- Async Thunks für API-Calls
- Caching für Dashboard-Performance

#### 5.1.3. UI/UX
- Responsive Design für verschiedene Bildschirmgrößen
- Accessibility (WCAG 2.1 AA)
- Offline-Funktionalität für kritische Bereiche

### 5.2. Backend-Erweiterungen

#### 5.2.1. Neue API-Endpoints
```
POST   /api/bilateral-clearing/cases
GET    /api/bilateral-clearing/cases
GET    /api/bilateral-clearing/cases/:id
PUT    /api/bilateral-clearing/cases/:id
DELETE /api/bilateral-clearing/cases/:id

POST   /api/bilateral-clearing/cases/:id/attachments
GET    /api/bilateral-clearing/cases/:id/attachments
DELETE /api/bilateral-clearing/attachments/:id

POST   /api/bilateral-clearing/cases/:id/notes
PUT    /api/bilateral-clearing/notes/:id

POST   /api/bilateral-clearing/cases/:id/emails

POST   /api/bilateral-clearing/ai/analyze
POST   /api/bilateral-clearing/ai/suggest-actions
POST   /api/bilateral-clearing/ai/generate-response
```

#### 5.2.2. Datenmodell
```typescript
interface BilateralCase {
  id: string;
  marktpartner: MarketPartner;
  dar: string; // Datenaustauschreferenz
  problemType: 'stammdaten' | 'messwerte' | 'prozess';
  status: 'offen' | 'in_bearbeitung' | 'abgeschlossen' | 'eskaliert';
  priority: 'niedrig' | 'mittel' | 'hoch' | 'kritisch';
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: User;
  attachments: Attachment[];
  notes: Note[];
  emails: EmailRecord[];
  aiAnalysis?: AIAnalysis;
}

interface Attachment {
  id: string;
  filename: string;
  type: 'edifact' | 'response' | 'document';
  category: 'ursprung' | 'fehler' | 'korrektur';
  version: number;
  uploadedAt: Date;
  uploadedBy: User;
}

interface Note {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: User;
  step?: 'fehleridentifikation' | 'ursachenforschung' | 'korrektur' | 'abschluss';
}

interface EmailRecord {
  id: string;
  direction: 'eingehend' | 'ausgehend';
  content: string;
  timestamp: Date;
  from?: string;
  to?: string;
  subject?: string;
}

interface AIAnalysis {
  problemCategory: string;
  confidence: number;
  suggestedActions: string[];
  regulatoryNotes: string[];
  similarCases: string[];
  riskLevel: 'niedrig' | 'mittel' | 'hoch';
}
```

### 5.3. KI/LLM-Integration

#### 5.3.1. Prompt-Engineering
- Spezifische Prompts für verschiedene Klärfall-Typen
- Regulatorisches Wissen aus GPKE/MaBiS-Dokumenten
- Beispiel-Cases für Few-Shot-Learning

#### 5.3.2. Wissensbank
- EDIFACT-Nachrichtentypen und deren Bedeutung
- Typische Fehlerszenarien und Lösungsansätze
- BNetzA-Festlegungen und BDEW-Anwendungshilfen
- Fristen und Eskalationspfade

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

## 7. Implementierungsphasen

### Phase 1: Grundfunktionalität (Sprint 1-2)
- [ ] Datenmodell und Backend-APIs
- [ ] Dashboard mit Basis-CRUD-Operationen
- [ ] Einfache Klärfall-Erstellung

### Phase 2: Erweiterte Features (Sprint 3)
- [ ] Attachment-Management
- [ ] Notizen-System
- [ ] Email-Integration

### Phase 3: KI-Integration (Sprint 4)
- [ ] AI-Analyse-Service
- [ ] Handlungsempfehlungen
- [ ] Compliance-Prüfung

### Phase 4: Optimierung (Sprint 5)
- [ ] Performance-Tuning
- [ ] UI/UX-Verbesserungen
- [ ] Erweiterte Reporting-Features

## 8. Testkriterien

### 8.1. Unit Tests
- [ ] 90% Code Coverage für neue Komponenten
- [ ] API-Endpoint-Tests
- [ ] KI-Service-Mock-Tests

### 8.2. Integration Tests
- [ ] End-to-End-Klärfall-Workflow
- [ ] Multi-User-Szenarien
- [ ] File-Upload-Tests

### 8.3. User Acceptance Tests
- [ ] Realistische Klärfall-Szenarien
- [ ] Performance unter Last
- [ ] Benutzerfreundlichkeits-Tests

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

### 11.2. Interne Voraussetzungen
- Bestehende User-Management-System
- Chat-Integration-API
- Marktpartnersuche-Funktionalität

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
