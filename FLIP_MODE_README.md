# Flip Mode Implementierung

## Übersicht

Der "Flip Mode" ist eine intelligente Funktionalität, die mehrdeutige Benutzeranfragen erkennt und durch gezielte Rückfragen präzisiert, bevor eine detaillierte Antwort generiert wird.

## Funktionsweise

### 1. Automatische Erkennung mehrdeutiger Anfragen

Das System analysiert eingehende Benutzeranfragen auf verschiedene Ambiguitätsfaktoren:

- **Themenbreite**: Anzahl der verschiedenen Energiethemen in der Anfrage
- **Spezifitätsgrad**: Verwendung allgemeiner vs. spezifischer Begriffe
- **Kontextklarheit**: Vorhandensein von Kontext-Indikatoren
- **Stakeholder-Ambiguität**: Eindeutigkeit der Perspektive/Rolle
- **Energietyp-Ambiguität**: Klarheit über Strom vs. Gas

### 2. Präzisierungsfragen

Bei einem Ambiguity Score > 0.7 werden bis zu 3 gezielte Fragen gestellt:

- **Energieträger**: "Auf welchen Energieträger bezieht sich Ihre Frage?"
- **Stakeholder-Perspektive**: "Aus welcher Sicht möchten Sie die Information?"
- **Anwendungsbereich**: "Für welchen Anwendungsbereich benötigen Sie die Information?"
- **Detailgrad**: "Welchen Detailgrad benötigen Sie?"
- **Themenfokus**: "Welcher Aspekt interessiert Sie am meisten?"

### 3. Benutzerfreundliche Darstellung

Die Präzisierungsfragen werden in einer intuitiven UI präsentiert:

- **Fortschrittsanzeige**: Zeigt den aktuellen Schritt an
- **Kategorisierung**: Fragen sind nach Kategorien gruppiert
- **Multiple Choice**: Einfache Auswahl durch Radio-Buttons
- **Erkannte Themen**: Anzeige der automatisch erkannten Themen
- **Begründung**: Erklärung, warum Präzisierung notwendig ist

## Implementierung

### Backend (Node.js/TypeScript)

#### FlipModeService (`src/services/flip-mode.ts`)

```typescript
// Hauptservice für Flip Mode Logik
export class FlipModeService {
  async analyzeClarificationNeed(query: string, userId: string): Promise<ClarificationResult>
  async recordClarificationResponse(sessionId: string, questionId: string, response: string): Promise<FlipSession | null>
  async buildEnhancedQuery(sessionId: string): Promise<string>
}
```

#### Chat Route Erweiterung (`src/routes/chat.ts`)

```typescript
// Neue Route für Clarification Responses
router.post('/chats/:chatId/clarification', asyncHandler(async (req, res) => {
  // Verarbeitet Präzisierungsantworten und generiert finale Antwort
}));
```

### Frontend (React/TypeScript)

#### ClarificationUI Komponente (`client/src/components/ClarificationUI.tsx`)

```typescript
interface ClarificationUIProps {
  clarificationResult: ClarificationResult;
  onSubmit: (responses: { questionId: string; answer: string }[]) => void;
  onSkip: () => void;
  loading?: boolean;
}
```

#### Chat.tsx Erweiterung

- State Management für Clarification Sessions
- Integration der ClarificationUI in den Chat-Flow
- Handling von Clarification Responses

## Benutzerfreundlichkeit

### Klare Kommunikation

- **Einleitung**: "Ich möchte Ihnen die bestmögliche Antwort geben!"
- **Fortschritt**: Visueller Fortschrittsbalken und Schritt-Anzeige
- **Themen**: Automatisch erkannte Themen werden angezeigt
- **Begründung**: Erklärung der Präzisierungsnotwendigkeit

### Benutzerführung

- **Schritt-für-Schritt**: Maximal 3 Fragen, einzeln präsentiert
- **Kategorisierung**: Fragen sind nach Themen kategorisiert
- **Icons**: Visuelle Hinweise für verschiedene Fragenkategorien
- **Überspringen**: Option zum Überspringen der Präzisierung

### Responsive Design

- **Mobile First**: Optimiert für mobile Geräte
- **Accessibility**: Barrierefreie Bedienung
- **Performance**: Minimale Ladezeiten

## Konfiguration

### Ambiguity Threshold

```typescript
private readonly AMBIGUITY_THRESHOLD = 0.7;
```

- Standardwert: 0.7 (70%)
- Kann je nach Bedarf angepasst werden
- Höhere Werte = weniger Flip Mode Aktivierungen

### Maximale Fragen

```typescript
.slice(0, 3); // Maximal 3 Fragen
```

- Beschränkt auf maximal 3 Fragen
- Vermeidet Benutzer-Frustration
- Fokus auf wichtigste Präzisierungen

## Beispiel-Szenarien

### Scenario 1: Allgemeine Frage

**Eingabe**: "Wie funktioniert der Lieferantenwechsel?"

**Flip Mode aktiviert** (Score: 0.85)

**Fragen**:
1. "Auf welchen Energieträger bezieht sich Ihre Frage?" → Strom
2. "Aus welcher Sicht möchten Sie die Information?" → Endkunde
3. "Welchen Detailgrad benötigen Sie?" → Schritt-für-Schritt Anleitung

**Resultat**: Präzise Antwort für Strom-Lieferantenwechsel aus Endkunden-Sicht

### Scenario 2: Spezifische Frage

**Eingabe**: "Welche Fristen gelten für Stadtwerke beim Stromlieferantenwechsel für Gewerbekunden?"

**Flip Mode nicht aktiviert** (Score: 0.3)

**Resultat**: Direkte Antwort ohne Präzisierung

## Monitoring & Analytics

### Metriken

- **Aktivierungsrate**: Anteil der Fragen, die Flip Mode auslösen
- **Completion Rate**: Anteil der abgeschlossenen Präzisierungen
- **Benutzer-Zufriedenheit**: Bewertung der präzisierten Antworten
- **Abbruchrate**: Anteil der abgebrochenen Präzisierungen

### Logging

```typescript
console.log('Flip Mode Analysis:', {
  query,
  analysis,
  ambiguityScore,
  needsClarification,
  threshold: this.AMBIGUITY_THRESHOLD
});
```

## Vorteile

### Für Benutzer

- **Präzisere Antworten**: Zielgerichtete Informationen statt allgemeiner Überblicke
- **Zeitersparnis**: Keine Nachfragen oder Verwirrung
- **Bessere Nutzererfahrung**: Geführte Interaktion statt Rätselraten

### Für das System

- **Reduced Ambiguity**: Weniger mehrdeutige Anfragen
- **Better Context**: Mehr Kontext für bessere Antworten
- **Learning Data**: Sammlung von Präzisierungsmustern

## Ausblick

### Verbesserungen

- **Machine Learning**: Automatische Optimierung der Ambiguity Thresholds
- **Personalisierung**: Anpassung basierend auf Benutzerverhalten
- **Erweiterte Kontexte**: Integration weiterer Energie-Domänen

### Erweiterungen

- **Voice Interface**: Sprachbasierte Präzisierung
- **Multi-Modal**: Integration von Bildern/Dokumenten
- **Collaborative**: Team-basierte Präzisierung

## Fazit

Der Flip Mode reduziert die Informationsüberflutung und führt zu präziseren, wertvolleren Antworten für Benutzer im Energiesektor. Durch die intelligente Erkennung mehrdeutiger Anfragen und die benutzerfreundliche Präzisierung wird die Qualität der AI-Antworten erheblich verbessert.
