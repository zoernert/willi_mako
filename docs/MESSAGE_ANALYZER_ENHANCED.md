# Energiemarkt-Nachrichten Analyzer (Erweitert)

## Übersicht

Der erweiterte Energiemarkt-Nachrichten Analyzer ist ein KI-gestütztes Tool für die interaktive Analyse und Bearbeitung von EDIFACT-Nachrichten in der deutschen Energiewirtschaft. Es kombiniert tiefes Wissen über edi@energy-Formate mit moderner KI-Technologie, um ein "Must Have"-Tool für Mitarbeiter in der Marktkommunikation zu schaffen.

## Features

### 1. **Initiale KI-Analyse**
- Umfassende Analyse von EDIFACT-Nachrichten (MSCONS, UTILMD, ORDERS, INVOIC, etc.)
- Erkennung von Nachrichtentyp, Akteuren und Inhalten
- Strukturelle Validierung mit Fehler- und Warnungserkennung
- Plausibilitätsprüfungen basierend auf edi@energy-Standards

### 2. **Interaktiver Chat**
- **Fragen stellen**: Hinterfragen Sie jeden Aspekt der Nachricht
  - "In welchem Zeitfenster ist der Verbrauch am höchsten?"
  - "Was bedeutet das NAD-Segment in dieser Nachricht?"
  - "Welche Marktpartner sind beteiligt?"
  
- **Nachricht modifizieren**: Natürlichsprachliche Änderungsaufträge
  - "Erhöhe den Verbrauch in jedem Zeitfenster um 10%"
  - "Ändere die Marktpartnerkennung des Absenders auf XYZ"
  - "Ersetze das Enddatum durch den 31.12.2025"

### 3. **Änderungsverfolgung (Version Control)**
- Automatische Speicherung jeder Änderung als neue Version
- Undo/Redo-Funktionalität zum Vor- und Zurücknavigieren
- Visuelle Diff-Ansicht zeigt exakt, was geändert wurde
  - Grün markiert: Hinzugefügte Inhalte
  - Rot markiert/durchgestrichen: Entfernte Inhalte
- Versionszähler und Änderungsbeschreibung für jede Version

### 4. **Validierung & Qualitätssicherung**
- Echtzeit-Validierung der EDIFACT-Struktur
- Segmentanzahl-Prüfung
- Nachrichtentypspezifische Validierungen
- Fehlermeldungen und Warnungen mit klaren Handlungsempfehlungen

### 5. **Benutzerfreundlichkeit**
- **Copy-to-Clipboard**: Ein Klick zum Kopieren der aktuellen Nachricht
- Responsive Design für Desktop und Tablet
- Intuitive Chat-Oberfläche mit Zeitstempeln
- Klare visuelle Trennung zwischen Benutzer- und KI-Nachrichten

## Technische Architektur

### Backend (Express/TypeScript)

#### API-Endpunkte

```typescript
POST /api/message-analyzer/analyze
// Initiale Strukturanalyse der EDIFACT-Nachricht

POST /api/message-analyzer/ai-explanation
// KI-generierte verständliche Erklärung

POST /api/message-analyzer/chat
// Interaktiver Chat über die Nachricht
Body: { message, chatHistory, currentEdifactMessage }

POST /api/message-analyzer/modify
// Modifizierung basierend auf natürlichsprachlicher Anweisung
Body: { instruction, currentMessage }

POST /api/message-analyzer/validate
// Validierung der EDIFACT-Struktur und Semantik
```

#### Kernservices

**MessageAnalyzerService** (`src/modules/message-analyzer/services/message-analyzer.service.ts`):
- `analyze()`: Strukturanalyse und Code-Lookup
- `validateEdifactStructure()`: Basis-Validierung
- `validateEdifactMessage()`: Vollständige Validierung mit Fehler-/Warnungsliste
- Integration mit Qdrant-Vektordatenbank für kontextbasierte Analyse
- Integration mit CodeLookupService für BDEW/EIC-Code-Auflösung

### Frontend (React/TypeScript)

**MessageAnalyzerEnhanced** (`app-legacy/src/pages/MessageAnalyzerEnhanced.tsx`):
- State Management für Nachrichten-Versionen
- Chat-History-Verwaltung
- Diff-Visualisierung mit `diff` Library
- Material-UI v7 Komponenten

**API Client** (`app-legacy/src/services/messageAnalyzerApi.ts`):
- Typisierte API-Calls
- Response-Parsing und Error-Handling

## Verwendung

### Zugriff
```
https://stromhaltig.de/app/message-analyzer
```

### Workflow

1. **EDIFACT-Nachricht einfügen**
   - Kopieren Sie eine EDIFACT-Nachricht in das Eingabefeld
   - Klicken Sie auf "KI-Analyse starten"

2. **Analyse verstehen**
   - Lesen Sie die initiale KI-Analyse im linken Panel
   - Prüfen Sie die Validierungsergebnisse (Fehler/Warnungen)

3. **Interaktiv arbeiten**
   - **Fragen stellen** im Chat, z.B.:
     ```
     Welche Zählerstände sind in dieser MSCONS enthalten?
     ```
   
   - **Modifikationen durchführen**:
     ```
     Erhöhe alle Verbrauchswerte um 5%
     ```
   
   - **Änderungen überprüfen**:
     - Klicken Sie auf "Änderungen anzeigen" für Diff-Ansicht
     - Nutzen Sie Undo/Redo-Buttons bei Bedarf

4. **Nachricht exportieren**
   - Klicken Sie auf das Kopier-Icon
   - Fügen Sie die Nachricht in Ihr Zielsystem ein

## Expertenwissen-Integration

Das Tool nutzt das Willi-Mako MCP (Model Context Protocol) Wissensarchiv:
- GPKE, WiM, GeLi Gas Prozesse
- EnWG, StromNZV, EEG Regulierung
- EDIFACT/edi@energy Format-Spezifikationen
- BDEW MaKo-Richtlinien
- Prüfkataloge und Best Practices

## Beispiele

### Beispiel 1: MSCONS-Analyse
```
Frage: "In welchem Zeitraum liegt der höchste Verbrauch?"
→ KI analysiert LIN-Segmente und identifiziert Spitzenlast-Zeitfenster
```

### Beispiel 2: UTILMD-Modifikation
```
Auftrag: "Ändere die Marktlokation von DE0001234567890 auf DE0009876543210"
→ KI ersetzt alle Vorkommen und validiert die neue ID
```

### Beispiel 3: ORDERS-Validierung
```
Nach Eingabe wird automatisch geprüft:
✓ UNH und UNT vorhanden
✓ Segmentanzahl stimmt überein
⚠ BGM-Segment empfohlen für ORDERS
```

## Sicherheit & Compliance

- ✅ Authentifizierung erforderlich (`requireAuth` Middleware)
- ✅ Validierung aller Eingaben
- ✅ Rate-Limiting auf API-Ebene
- ✅ Keine Persistierung sensibler Daten (Session-basiert)
- ✅ GDPR-konform (keine personenbezogenen Daten in Nachrichten)

## Zukünftige Erweiterungen

- [ ] Batch-Verarbeitung mehrerer Nachrichten
- [ ] Template-Bibliothek für gängige Nachrichtentypen
- [ ] Export in verschiedene Formate (JSON, XML)
- [ ] Vergleich zweier EDIFACT-Nachrichten
- [ ] Automatische Anomalie-Erkennung
- [ ] Integration mit Bilateral Clarifications
- [ ] Kollaborative Bearbeitung (Team-Features)

## Support

Bei Fragen oder Problemen:
- Dokumentation: `/docs`
- Community: `/app/community`
- Admin: support@stromhaltig.de

---

**Version**: 2.0 (Enhanced)  
**Letzte Aktualisierung**: November 2025  
**Lizenz**: Proprietär
