# Flip-Modus Implementierung für GitHub Copilot Agent

## Übersicht

Der "Flip-Modus" ist ein intelligenter Query-Präzisierungsmechanismus, der mehrdeutige Benutzeranfragen erkennt und durch gezielte Rückfragen präzisiert, bevor eine detaillierte Antwort generiert wird.

## 1. GitHub Copilot Agent Setup

### 1.1 Agent-Konfiguration

Erstellen Sie eine neue GitHub Copilot Extension mit folgender Grundstruktur:

```typescript
// copilot-agent.ts
import { CopilotAgent, CopilotMessage, CopilotResponse } from '@github/copilot-sdk';
import { FlipModeService } from './services/flip-mode.service';
import { EnergyKnowledgeService } from './services/energy-knowledge.service';

export class EnergyMarketCopilotAgent extends CopilotAgent {
  private flipModeService: FlipModeService;
  private knowledgeService: EnergyKnowledgeService;

  constructor() {
    super({
      name: 'energy-market-coach',
      description: 'AI-Coach für Energiewirtschaft und Marktkommunikation',
      version: '1.0.0'
    });
    
    this.flipModeService = new FlipModeService();
    this.knowledgeService = new EnergyKnowledgeService();
  }

  async processMessage(message: CopilotMessage): Promise<CopilotResponse> {
    const userQuery = message.content;
    
    // Flip-Modus Analyse
    const clarificationNeeded = await this.flipModeService.analyzeClarificationNeed(userQuery);
    
    if (clarificationNeeded.needsClarification) {
      return this.generateClarificationResponse(clarificationNeeded);
    }
    
    // Normale Antwort generieren
    return this.generateDirectResponse(userQuery, message.context);
  }
}
```

### 1.2 Manifest-Datei

```json
{
  "name": "energiemarkt-coach",
  "version": "1.0.0",
  "description": "Mako Willi - Ihr AI-Coach für Energiewirtschaft",
  "main": "dist/index.js",
  "copilot": {
    "agent": {
      "name": "mako-willi",
      "description": "Spezialist für Marktkommunikation und Energiewirtschaft",
      "capabilities": [
        "energy-market-analysis",
        "regulatory-guidance",
        "market-communication",
        "flip-mode-clarification"
      ]
    }
  }
}
```

## 2. Flip-Modus Service Implementation

### 2.1 Clarification Analysis Service

```typescript
// services/flip-mode.service.ts
export interface ClarificationResult {
  needsClarification: boolean;
  ambiguityScore: number;
  detectedTopics: string[];
  suggestedQuestions: ClarificationQuestion[];
  reasoning: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  category: 'scope' | 'context' | 'detail_level' | 'stakeholder';
  options?: string[];
  priority: number;
}

export class FlipModeService {
  private readonly AMBIGUITY_THRESHOLD = 0.7;
  private readonly energyTerms = [
    'Lieferantenwechsel', 'Marktkommunikation', 'Bilanzkreis', 
    'Netzbetreiber', 'Messstellenbetreiber', 'Regulierung'
  ];
  
  async analyzeClarificationNeed(query: string): Promise<ClarificationResult> {
    const analysis = {
      topicBreadth: this.analyzeTopicBreadth(query),
      specificityLevel: this.analyzeSpecificity(query),
      contextClarity: this.analyzeContextClarity(query),
      stakeholderAmbiguity: this.analyzeStakeholderAmbiguity(query)
    };
    
    const ambiguityScore = this.calculateAmbiguityScore(analysis);
    const needsClarification = ambiguityScore > this.AMBIGUITY_THRESHOLD;
    
    if (needsClarification) {
      return {
        needsClarification: true,
        ambiguityScore,
        detectedTopics: this.extractTopics(query),
        suggestedQuestions: await this.generateClarificationQuestions(query, analysis),
        reasoning: this.explainReasoning(analysis)
      };
    }
    
    return {
      needsClarification: false,
      ambiguityScore,
      detectedTopics: [],
      suggestedQuestions: [],
      reasoning: 'Query ist spezifisch genug für direkte Antwort'
    };
  }

  private analyzeTopicBreadth(query: string): number {
    const words = query.toLowerCase().split(/\s+/);
    const energyTermCount = this.energyTerms.filter(term => 
      query.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    // Mehr als 2 verschiedene Energiethemen = höhere Unklarheit
    return energyTermCount > 2 ? 0.8 : energyTermCount > 1 ? 0.5 : 0.2;
  }

  private analyzeSpecificity(query: string): number {
    const genericTerms = [
      'wie funktioniert', 'was ist', 'erkläre', 'allgemein',
      'übersicht', 'grundlagen', 'alles über'
    ];
    
    const hasGenericTerms = genericTerms.some(term => 
      query.toLowerCase().includes(term)
    );
    
    return hasGenericTerms ? 0.9 : 0.3;
  }

  private analyzeContextClarity(query: string): number {
    const contextIndicators = [
      'für Stadtwerke', 'als Netzbetreiber', 'im Kontext von',
      'bei uns', 'in unserem Fall', 'spezifisch für'
    ];
    
    const hasContextIndicators = contextIndicators.some(indicator =>
      query.toLowerCase().includes(indicator)
    );
    
    return hasContextIndicators ? 0.2 : 0.7;
  }

  private analyzeStakeholderAmbiguity(query: string): number {
    const stakeholders = [
      'Lieferant', 'Netzbetreiber', 'Messstellenbetreiber', 
      'Kunde', 'Regulierer', 'Bilanzkreisverantwortlicher'
    ];
    
    const mentionedStakeholders = stakeholders.filter(stakeholder =>
      query.toLowerCase().includes(stakeholder.toLowerCase())
    );
    
    return mentionedStakeholders.length === 0 ? 0.8 : 0.2;
  }

  private calculateAmbiguityScore(analysis: any): number {
    return (
      analysis.topicBreadth * 0.3 +
      analysis.specificityLevel * 0.3 +
      analysis.contextClarity * 0.2 +
      analysis.stakeholderAmbiguity * 0.2
    );
  }

  private async generateClarificationQuestions(
    query: string, 
    analysis: any
  ): Promise<ClarificationQuestion[]> {
    const questions: ClarificationQuestion[] = [];
    
    // Kontext-Fragen
    if (analysis.contextClarity > 0.5) {
      questions.push({
        id: 'context_energy_type',
        question: 'Bezieht sich Ihre Frage auf Strom oder Gas?',
        category: 'context',
        options: ['Strom', 'Gas', 'Beides'],
        priority: 1
      });
    }
    
    // Stakeholder-Fragen
    if (analysis.stakeholderAmbiguity > 0.5) {
      questions.push({
        id: 'stakeholder_perspective',
        question: 'Aus welcher Sicht möchten Sie die Information?',
        category: 'stakeholder',
        options: [
          'Energielieferant',
          'Netzbetreiber', 
          'Messstellenbetreiber',
          'Endkunde',
          'Regulierungsbehörde'
        ],
        priority: 2
      });
    }
    
    // Detail-Level Fragen
    if (analysis.specificityLevel > 0.6) {
      questions.push({
        id: 'detail_level',
        question: 'Welchen Detailgrad benötigen Sie?',
        category: 'detail_level',
        options: [
          'Überblick und Grundlagen',
          'Detaillierte Umsetzung',
          'Rechtliche Anforderungen',
          'Technische Spezifikation'
        ],
        priority: 3
      });
    }
    
    return questions.sort((a, b) => a.priority - b.priority);
  }
}
```

### 2.2 Response Generation

```typescript
// services/response-generator.service.ts
export class ResponseGeneratorService {
  async generateClarificationResponse(
    clarificationResult: ClarificationResult
  ): Promise<CopilotResponse> {
    const questions = clarificationResult.suggestedQuestions;
    
    return {
      type: 'clarification',
      content: this.buildClarificationContent(questions),
      actions: this.buildClarificationActions(questions),
      metadata: {
        flipMode: true,
        ambiguityScore: clarificationResult.ambiguityScore,
        reasoning: clarificationResult.reasoning
      }
    };
  }

  private buildClarificationContent(questions: ClarificationQuestion[]): string {
    let content = "🎯 **Präzisierung gewünscht** - Ich möchte Ihnen die bestmögliche Antwort geben!\n\n";
    content += "Ihre Frage betrifft ein umfangreiches Thema. Mit ein paar zusätzlichen Informationen kann ich Ihnen eine viel zielgerichtetere Antwort liefern:\n\n";
    
    questions.forEach((q, index) => {
      content += `**${index + 1}. ${q.question}**\n`;
      if (q.options) {
        q.options.forEach(option => {
          content += `   • ${option}\n`;
        });
      }
      content += "\n";
    });
    
    content += "💡 *Alternativ können Sie auch \"Vollständige Antwort\" wählen, um eine umfassende Übersicht zu erhalten.*";
    
    return content;
  }

  private buildClarificationActions(
    questions: ClarificationQuestion[]
  ): CopilotAction[] {
    const actions: CopilotAction[] = [];
    
    // Für jede Frage mit Optionen, erstelle Quick-Actions
    questions.forEach(question => {
      if (question.options) {
        question.options.forEach(option => {
          actions.push({
            id: `clarify_${question.id}_${option.toLowerCase().replace(/\s+/g, '_')}`,
            label: option,
            type: 'quick_reply',
            data: {
              questionId: question.id,
              selectedOption: option
            }
          });
        });
      }
    });
    
    // Fallback-Option
    actions.push({
      id: 'skip_clarification',
      label: '📋 Vollständige Antwort geben',
      type: 'action',
      data: {
        skipClarification: true
      }
    });
    
    return actions;
  }
}
```

## 3. Knowledge Base Integration

### 3.1 Energy Domain Service

```typescript
// services/energy-knowledge.service.ts
export class EnergyKnowledgeService {
  private knowledgeAreas = {
    'marktkommunikation': {
      keywords: ['MaKo', 'Marktkommunikation', 'EDI', 'EDIFACT'],
      commonQuestions: [
        'Wie funktioniert MaKo?',
        'Welche Fristen gelten?',
        'Wer ist beteiligt?'
      ]
    },
    'lieferantenwechsel': {
      keywords: ['Lieferantenwechsel', 'Wechselprozess', 'Kündigung'],
      commonQuestions: [
        'Wie läuft der Wechselprozess ab?',
        'Welche Fristen sind zu beachten?',
        'Wer informiert wen?'
      ]
    },
    'bilanzkreis': {
      keywords: ['Bilanzkreis', 'Bilanzierung', 'Ausgleichsenergie'],
      commonQuestions: [
        'Was ist ein Bilanzkreis?',
        'Wie funktioniert die Bilanzierung?',
        'Wer trägt welche Verantwortung?'
      ]
    }
  };

  async generateContextualResponse(
    originalQuery: string,
    clarificationData: any
  ): Promise<string> {
    const enhancedContext = this.buildEnhancedContext(clarificationData);
    const relevantKnowledge = await this.retrieveRelevantKnowledge(originalQuery, enhancedContext);
    
    return this.synthesizeResponse(originalQuery, enhancedContext, relevantKnowledge);
  }

  private buildEnhancedContext(clarificationData: any): EnhancedContext {
    return {
      energyType: clarificationData.energy_type || 'both',
      stakeholderPerspective: clarificationData.stakeholder_perspective,
      detailLevel: clarificationData.detail_level || 'overview',
      specificCompanyType: clarificationData.company_type,
      regulatoryFocus: clarificationData.regulatory_focus
    };
  }
}
```

## 4. GitHub Copilot Integration

### 4.1 Command Handler

```typescript
// handlers/command.handler.ts
export class EnergyCoachCommandHandler {
  private flipModeService: FlipModeService;
  private responseGenerator: ResponseGeneratorService;
  
  @CopilotCommand('explain')
  async handleExplainCommand(
    @CopilotParam('topic') topic: string,
    context: CopilotContext
  ): Promise<CopilotResponse> {
    
    // Aktiviere Flip-Modus für "explain" Commands
    const clarificationResult = await this.flipModeService.analyzeClarificationNeed(topic);
    
    if (clarificationResult.needsClarification) {
      return this.responseGenerator.generateClarificationResponse(clarificationResult);
    }
    
    return this.generateDirectExplanation(topic, context);
  }

  @CopilotCommand('analyze')
  async handleAnalyzeCommand(
    @CopilotParam('scenario') scenario: string,
    context: CopilotContext
  ): Promise<CopilotResponse> {
    
    // Immer Flip-Modus für Analysen aktivieren
    const clarificationResult = await this.flipModeService.analyzeClarificationNeed(scenario);
    
    return this.responseGenerator.generateClarificationResponse(clarificationResult);
  }

  @CopilotAction('clarification_response')
  async handleClarificationResponse(
    clarificationData: any,
    originalContext: CopilotContext
  ): Promise<CopilotResponse> {
    
    // Verarbeite die Klarstellung und generiere finale Antwort
    return this.knowledgeService.generateContextualResponse(
      originalContext.originalQuery,
      clarificationData
    );
  }
}
```

### 4.2 Context Management

```typescript
// services/context.service.ts
export class ContextManagementService {
  private activeFlipSessions = new Map<string, FlipSession>();
  
  async startFlipSession(
    userId: string, 
    originalQuery: string,
    clarificationResult: ClarificationResult
  ): Promise<string> {
    
    const sessionId = this.generateSessionId();
    const session: FlipSession = {
      id: sessionId,
      userId,
      originalQuery,
      clarificationResult,
      responses: [],
      startedAt: new Date(),
      status: 'awaiting_clarification'
    };
    
    this.activeFlipSessions.set(sessionId, session);
    
    // Auto-cleanup nach 10 Minuten
    setTimeout(() => {
      this.activeFlipSessions.delete(sessionId);
    }, 10 * 60 * 1000);
    
    return sessionId;
  }

  async recordClarificationResponse(
    sessionId: string,
    questionId: string,
    response: string
  ): Promise<FlipSession | null> {
    
    const session = this.activeFlipSessions.get(sessionId);
    if (!session) return null;
    
    session.responses.push({
      questionId,
      response,
      timestamp: new Date()
    });
    
    return session;
  }

  async isSessionComplete(sessionId: string): Promise<boolean> {
    const session = this.activeFlipSessions.get(sessionId);
    if (!session) return false;
    
    const requiredQuestions = session.clarificationResult.suggestedQuestions.length;
    const answeredQuestions = session.responses.length;
    
    return answeredQuestions >= Math.min(requiredQuestions, 3); // Max 3 Fragen
  }
}
```

## 5. Performance Optimierung

### 5.1 Caching Strategy

```typescript
// services/cache.service.ts
export class FlipModeCacheService {
  private clarificationCache = new Map<string, ClarificationResult>();
  private responseCache = new Map<string, string>();
  
  async getCachedClarification(queryHash: string): Promise<ClarificationResult | null> {
    return this.clarificationCache.get(queryHash) || null;
  }
  
  async cacheClarification(queryHash: string, result: ClarificationResult): Promise<void> {
    this.clarificationCache.set(queryHash, result);
    
    // Cache-Cleanup nach 1 Stunde
    setTimeout(() => {
      this.clarificationCache.delete(queryHash);
    }, 60 * 60 * 1000);
  }
  
  private generateQueryHash(query: string): string {
    return require('crypto')
      .createHash('md5')
      .update(query.toLowerCase().trim())
      .digest('hex');
  }
}
```

### 5.2 Metrics & Analytics

```typescript
// services/analytics.service.ts
export class FlipModeAnalyticsService {
  async trackFlipModeActivation(
    query: string,
    ambiguityScore: number,
    questionsGenerated: number
  ): Promise<void> {
    
    const metrics = {
      event: 'flip_mode_activated',
      query_length: query.length,
      ambiguity_score: ambiguityScore,
      questions_generated: questionsGenerated,
      timestamp: new Date()
    };
    
    // Sende an Analytics-Service
    await this.sendMetrics(metrics);
  }
  
  async trackClarificationCompletion(
    sessionId: string,
    timeToCompletion: number,
    questionsAnswered: number,
    userSatisfaction?: number
  ): Promise<void> {
    
    const metrics = {
      event: 'clarification_completed',
      session_id: sessionId,
      time_to_completion: timeToCompletion,
      questions_answered: questionsAnswered,
      user_satisfaction: userSatisfaction,
      timestamp: new Date()
    };
    
    await this.sendMetrics(metrics);
  }
}
```

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// tests/flip-mode.service.test.ts
describe('FlipModeService', () => {
  let service: FlipModeService;
  
  beforeEach(() => {
    service = new FlipModeService();
  });
  
  it('should detect ambiguous queries', async () => {
    const ambiguousQuery = 'Wie funktioniert der Lieferantenwechsel?';
    const result = await service.analyzeClarificationNeed(ambiguousQuery);
    
    expect(result.needsClarification).toBe(true);
    expect(result.ambiguityScore).toBeGreaterThan(0.7);
    expect(result.suggestedQuestions.length).toBeGreaterThan(0);
  });
  
  it('should not trigger flip mode for specific queries', async () => {
    const specificQuery = 'Welche Fristen gelten für Stadtwerke beim Lieferantenwechsel für Stromkunden?';
    const result = await service.analyzeClarificationNeed(specificQuery);
    
    expect(result.needsClarification).toBe(false);
    expect(result.ambiguityScore).toBeLessThan(0.7);
  });
  
  it('should generate appropriate clarification questions', async () => {
    const query = 'Erkläre mir die Marktkommunikation';
    const result = await service.analyzeClarificationNeed(query);
    
    expect(result.suggestedQuestions).toContainEqual(
      expect.objectContaining({
        category: 'context',
        question: expect.stringContaining('Strom oder Gas')
      })
    );
  });
});
```

### 6.2 Integration Tests

```typescript
// tests/integration/flip-mode.integration.test.ts
describe('Flip Mode Integration', () => {
  let agent: EnergyMarketCopilotAgent;
  
  beforeEach(() => {
    agent = new EnergyMarketCopilotAgent();
  });
  
  it('should handle complete flip mode flow', async () => {
    // 1. Trigger flip mode
    const initialMessage = createMockMessage('Wie funktioniert der Energiemarkt?');
    const response1 = await agent.processMessage(initialMessage);
    
    expect(response1.type).toBe('clarification');
    expect(response1.actions.length).toBeGreaterThan(0);
    
    // 2. Provide clarification
    const clarificationMessage = createMockMessage('Stadtwerke, Strom, Detaillierte Umsetzung');
    const response2 = await agent.processMessage(clarificationMessage);
    
    expect(response2.type).toBe('answer');
    expect(response2.content).toContain('Stadtwerke');
    expect(response2.content).toContain('Strom');
  });
});
```

## 7. Deployment & Configuration

### 7.1 Environment Configuration

```yaml
# .github/copilot-agent.yml
name: energiemarkt-coach
description: "Mako Willi - AI-Coach für Energiewirtschaft"

flip_mode:
  enabled: true
  ambiguity_threshold: 0.7
  max_questions: 3
  session_timeout: 600 # 10 minutes
  
knowledge_base:
  primary_domains:
    - marktkommunikation
    - lieferantenwechsel
    - bilanzkreis
    - regulierung
    
performance:
  cache_enabled: true
  cache_ttl: 3600 # 1 hour
  max_concurrent_sessions: 100

analytics:
  enabled: true
  track_user_satisfaction: true
  export_metrics: true
```

### 7.2 GitHub Actions Workflow

```yaml
# .github/workflows/deploy-copilot-agent.yml
name: Deploy Energy Market Copilot Agent

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run build
      
      - name: Deploy to GitHub Copilot
        uses: github/copilot-agent-deploy@v1
        with:
          agent-manifest: './dist/manifest.json'
          api-token: ${{ secrets.GITHUB_TOKEN }}
```

## 8. Monitoring & Maintenance

### 8.1 Success Metrics

- **Clarification Accuracy**: % der Fälle, wo Flip-Modus korrekt aktiviert wurde
- **User Satisfaction**: Bewertung der finalen Antworten nach Klarstellung
- **Time to Resolution**: Durchschnittliche Zeit bis zur zufriedenstellenden Antwort
- **Abandonment Rate**: % der abgebrochenen Flip-Mode-Sessions

### 8.2 Continuous Improvement

```typescript
// services/improvement.service.ts
export class FlipModeImprovementService {
  async analyzeSessionData(): Promise<ImprovementSuggestions> {
    const sessions = await this.getCompletedSessions();
    
    return {
      frequentlyAskedQuestions: this.identifyFrequentQuestions(sessions),
      ambiguityPatterns: this.analyzeAmbiguityPatterns(sessions),
      questionEffectiveness: this.measureQuestionEffectiveness(sessions),
      userBehaviorInsights: this.analyzeUserBehavior(sessions)
    };
  }
  
  async updateClarificationRules(insights: ImprovementSuggestions): Promise<void> {
    // Automatically update clarification logic based on insights
    await this.updateAmbiguityThresholds(insights.ambiguityPatterns);
    await this.optimizeQuestionGeneration(insights.questionEffectiveness);
  }
}
```

## Zusammenfassung

Diese Implementierung bietet:

1. **Intelligente Erkennung** mehrdeutiger Anfragen
2. **Kontextuelle Rückfragen** basierend auf Energiewirtschafts-Domäne
3. **Nahtlose Integration** in GitHub Copilot
4. **Performance-Optimierung** durch Caching und Analytics
5. **Kontinuierliche Verbesserung** durch Datenanalyse

Der "Flip-Modus" reduziert die Informationsüberflutung und führt zu präziseren, wertvolleren Antworten für Benutzer im Energiesektor.