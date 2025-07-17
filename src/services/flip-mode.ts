import geminiService from './gemini';
import QdrantService from './qdrant';

export interface ClarificationResult {
  needsClarification: boolean;
  ambiguityScore: number;
  detectedTopics: string[];
  suggestedQuestions: ClarificationQuestion[];
  reasoning: string;
  sessionId?: string;
}

export interface ClarificationQuestion {
  id: string;
  question: string;
  category: 'scope' | 'context' | 'detail_level' | 'stakeholder' | 'energy_type';
  options?: string[];
  priority: number;
}

export interface FlipSession {
  id: string;
  userId: string;
  originalQuery: string;
  clarificationResult: ClarificationResult;
  responses: ClarificationResponse[];
  startedAt: Date;
  status: 'awaiting_clarification' | 'completed' | 'expired';
}

export interface ClarificationResponse {
  questionId: string;
  response: string;
  timestamp: Date;
}

export class FlipModeService {
  private readonly AMBIGUITY_THRESHOLD = 0.5;
  private readonly energyTerms = [
    'Lieferantenwechsel', 'Marktkommunikation', 'Bilanzkreis', 
    'Netzbetreiber', 'Messstellenbetreiber', 'Regulierung',
    'Energiemarkt', 'Strommarkt', 'Gasmarkt', 'Stadtwerke',
    'Energieversorgung', 'Verteilnetzbetreiber', 'Übertragungsnetzbetreiber',
    'Marktlokation', 'Zählpunkt', 'Abrechnung', 'Bilanzierung',
    'Energiedatenmanagement', 'Smart Meter', 'Lastgang',
    'Grundversorgung', 'Sondervertrag', 'Preisanpassung'
  ];

  private readonly contextKeywords = [
    'für Stadtwerke', 'als Netzbetreiber', 'im Kontext von',
    'bei uns', 'in unserem Fall', 'spezifisch für',
    'für unser Unternehmen', 'in der Praxis', 'konkret'
  ];

  private readonly genericTerms = [
    'wie funktioniert', 'was ist', 'erkläre', 'allgemein',
    'übersicht', 'grundlagen', 'alles über', 'beschreibe',
    'erläutere', 'informiere mich über', 'sage mir etwas über'
  ];

  private activeSessions = new Map<string, FlipSession>();

  async analyzeClarificationNeed(
    query: string, 
    userId: string
  ): Promise<ClarificationResult> {
    try {
      // Use minimal context for flip mode analysis to avoid interference
      const minimalContext = await this.getMinimalContext(query, 2);
      
      const analysis = {
        topicBreadth: this.analyzeTopicBreadth(query),
        specificityLevel: this.analyzeSpecificity(query),
        contextClarity: this.analyzeContextClarity(query),
        stakeholderAmbiguity: this.analyzeStakeholderAmbiguity(query),
        energyTypeAmbiguity: this.analyzeEnergyTypeAmbiguity(query)
      };

      const ambiguityScore = this.calculateAmbiguityScore(analysis);
      const needsClarification = ambiguityScore > this.AMBIGUITY_THRESHOLD;

      console.log('Flip Mode Analysis:', {
        query,
        analysis,
        ambiguityScore,
        needsClarification,
        threshold: this.AMBIGUITY_THRESHOLD,
        contextLength: minimalContext.length
      });

      if (needsClarification) {
        const sessionId = this.generateSessionId();
        const detectedTopics = this.extractTopics(query);
        const suggestedQuestions = await this.generateClarificationQuestions(query, analysis);
        
        const result: ClarificationResult = {
          needsClarification: true,
          ambiguityScore,
          detectedTopics,
          suggestedQuestions,
          reasoning: this.explainReasoning(analysis),
          sessionId
        };

        // Store session
        this.activeSessions.set(sessionId, {
          id: sessionId,
          userId,
          originalQuery: query,
          clarificationResult: result,
          responses: [],
          startedAt: new Date(),
          status: 'awaiting_clarification'
        });

        // Auto-cleanup after 10 minutes
        setTimeout(() => {
          this.activeSessions.delete(sessionId);
        }, 10 * 60 * 1000);

        return result;
      }

      return {
        needsClarification: false,
        ambiguityScore,
        detectedTopics: [],
        suggestedQuestions: [],
        reasoning: 'Die Frage ist spezifisch genug für eine direkte Antwort'
      };
    } catch (error) {
      console.error('Error in analyzeClarificationNeed:', error);
      return {
        needsClarification: false,
        ambiguityScore: 0,
        detectedTopics: [],
        suggestedQuestions: [],
        reasoning: 'Fehler bei der Analyse - direkte Antwort wird generiert'
      };
    }
  }

  private analyzeTopicBreadth(query: string): number {
    const words = query.toLowerCase().split(/\s+/);
    const energyTermCount = this.energyTerms.filter(term => 
      query.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    // Mehr als 2 verschiedene Energiethemen = höhere Unklarheit
    if (energyTermCount > 3) return 0.9;
    if (energyTermCount > 2) return 0.8;
    if (energyTermCount > 1) return 0.5;
    return 0.2;
  }

  private analyzeSpecificity(query: string): number {
    const hasGenericTerms = this.genericTerms.some(term => 
      query.toLowerCase().includes(term)
    );
    
    const questionWords = ['wie', 'was', 'wer', 'wo', 'wann', 'warum', 'welche'];
    const hasQuestionWords = questionWords.some(word => 
      query.toLowerCase().includes(word)
    );
    
    const hasSpecificNumbers = /\d+/.test(query);
    const hasSpecificDates = /\d{1,2}\.\d{1,2}\.\d{4}|\d{4}/.test(query);
    const hasSpecificCompany = /GmbH|AG|KG|OHG|mbH/.test(query);
    
    let score = 0;
    if (hasGenericTerms) score += 0.6;
    if (hasQuestionWords && !hasSpecificNumbers && !hasSpecificDates) score += 0.3;
    if (!hasSpecificCompany && !hasSpecificNumbers && !hasSpecificDates) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  private analyzeContextClarity(query: string): number {
    const hasContextIndicators = this.contextKeywords.some(indicator =>
      query.toLowerCase().includes(indicator)
    );
    
    const hasTimeframe = /\d{4}|jahr|monat|quartal|seit|ab|bis/.test(query.toLowerCase());
    const hasLocation = /deutschland|europa|nrw|bayern|hamburg|berlin/.test(query.toLowerCase());
    const hasRegulation = /gesetz|verordnung|richtlinie|norm|standard/.test(query.toLowerCase());
    
    let score = hasContextIndicators ? 0.1 : 0.7;
    if (hasTimeframe) score -= 0.2;
    if (hasLocation) score -= 0.1;
    if (hasRegulation) score -= 0.1;
    
    return Math.max(score, 0.0);
  }

  private analyzeStakeholderAmbiguity(query: string): number {
    const stakeholders = [
      'Lieferant', 'Netzbetreiber', 'Messstellenbetreiber', 
      'Kunde', 'Regulierer', 'Bilanzkreisverantwortlicher',
      'Stadtwerke', 'Energieversorgungsunternehmen', 'Verteilnetzbetreiber',
      'Übertragungsnetzbetreiber', 'Marktpartner', 'Endkunde'
    ];
    
    const mentionedStakeholders = stakeholders.filter(stakeholder =>
      query.toLowerCase().includes(stakeholder.toLowerCase())
    );
    
    if (mentionedStakeholders.length === 0) return 0.8;
    if (mentionedStakeholders.length === 1) return 0.2;
    if (mentionedStakeholders.length > 2) return 0.6;
    return 0.4;
  }

  private analyzeEnergyTypeAmbiguity(query: string): number {
    const stromKeywords = ['strom', 'elektr', 'kwh', 'mwh', 'spannung', 'netz'];
    const gasKeywords = ['gas', 'erdgas', 'biogas', 'wasserstoff', 'cubic', 'm³'];
    
    const hasStromKeywords = stromKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    );
    const hasGasKeywords = gasKeywords.some(keyword =>
      query.toLowerCase().includes(keyword)
    );
    
    if (hasStromKeywords && !hasGasKeywords) return 0.1;
    if (hasGasKeywords && !hasStromKeywords) return 0.1;
    if (hasStromKeywords && hasGasKeywords) return 0.3;
    return 0.7; // Weder Strom noch Gas spezifisch erwähnt
  }

  private calculateAmbiguityScore(analysis: any): number {
    return (
      analysis.topicBreadth * 0.25 +
      analysis.specificityLevel * 0.25 +
      analysis.contextClarity * 0.2 +
      analysis.stakeholderAmbiguity * 0.15 +
      analysis.energyTypeAmbiguity * 0.15
    );
  }

  private extractTopics(query: string): string[] {
    const topics: string[] = [];
    
    this.energyTerms.forEach(term => {
      if (query.toLowerCase().includes(term.toLowerCase())) {
        topics.push(term);
      }
    });
    
    return topics.slice(0, 5); // Maximal 5 Themen
  }

  private async generateClarificationQuestions(
    query: string, 
    analysis: any
  ): Promise<ClarificationQuestion[]> {
    const questions: ClarificationQuestion[] = [];
    
    // Energie-Typ Fragen
    if (analysis.energyTypeAmbiguity > 0.5) {
      questions.push({
        id: 'energy_type',
        question: 'Auf welchen Energieträger bezieht sich Ihre Frage?',
        category: 'energy_type',
        options: ['Strom', 'Gas', 'Beide'],
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
          'Stadtwerke',
          'Endkunde',
          'Regulierungsbehörde'
        ],
        priority: 2
      });
    }
    
    // Kontext-Fragen
    if (analysis.contextClarity > 0.5) {
      questions.push({
        id: 'context_specificity',
        question: 'Für welchen Anwendungsbereich benötigen Sie die Information?',
        category: 'context',
        options: [
          'Geschäftsprozesse',
          'Technische Umsetzung',
          'Rechtliche Anforderungen',
          'Kundenbetreuung',
          'Abrechnung'
        ],
        priority: 3
      });
    }
    
    // Detail-Level Fragen
    if (analysis.specificityLevel > 0.6) {
      questions.push({
        id: 'detail_level',
        question: 'Welchen Detailgrad benötigen Sie?',
        category: 'detail_level',
        options: [
          'Kurzer Überblick',
          'Detaillierte Erklärung',
          'Schritt-für-Schritt Anleitung',
          'Rechtliche Grundlagen',
          'Technische Spezifikationen'
        ],
        priority: 4
      });
    }
    
    // Scope-Fragen für breite Themen
    if (analysis.topicBreadth > 0.6) {
      questions.push({
        id: 'topic_focus',
        question: 'Welcher Aspekt interessiert Sie am meisten?',
        category: 'scope',
        options: [
          'Grundlagen und Definitionen',
          'Prozesse und Abläufe',
          'Fristen und Termine',
          'Verantwortlichkeiten',
          'Praktische Beispiele'
        ],
        priority: 5
      });
    }
    
    return questions
      .sort((a, b) => a.priority - b.priority)
      .slice(0, 3); // Maximal 3 Fragen
  }

  private explainReasoning(analysis: any): string {
    const reasons: string[] = [];
    
    if (analysis.topicBreadth > 0.6) {
      reasons.push('Die Frage umfasst mehrere Themenbereiche');
    }
    if (analysis.specificityLevel > 0.6) {
      reasons.push('Die Frage ist sehr allgemein formuliert');
    }
    if (analysis.contextClarity > 0.5) {
      reasons.push('Der Anwendungskontext ist nicht klar');
    }
    if (analysis.stakeholderAmbiguity > 0.5) {
      reasons.push('Die Perspektive/Rolle ist nicht eindeutig');
    }
    if (analysis.energyTypeAmbiguity > 0.5) {
      reasons.push('Der Energieträger (Strom/Gas) ist nicht spezifiziert');
    }
    
    return reasons.length > 0 
      ? `Präzisierung gewünscht: ${reasons.join(', ')}`
      : 'Frage ist ausreichend spezifisch';
  }

  private generateSessionId(): string {
    return `flip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getMinimalContext(query: string, limit: number = 2): Promise<string> {
    try {
      const results = await QdrantService.searchByText(query, limit);
      return results.map(r => r.payload.text).join('\n').substring(0, 500); // Kurzer Context
    } catch (error) {
      console.error('Error getting minimal context:', error);
      return ''; // Kein Context bei Fehlern
    }
  }

  // Session Management
  async recordClarificationResponse(
    sessionId: string,
    questionId: string,
    response: string
  ): Promise<FlipSession | null> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return null;

    session.responses.push({
      questionId,
      response,
      timestamp: new Date()
    });

    return session;
  }

  async getSession(sessionId: string): Promise<FlipSession | null> {
    return this.activeSessions.get(sessionId) || null;
  }

  async isSessionComplete(sessionId: string): Promise<boolean> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    const requiredQuestions = session.clarificationResult.suggestedQuestions.length;
    const answeredQuestions = session.responses.length;

    return answeredQuestions >= Math.min(requiredQuestions, 2); // Min 2 Fragen beantwortet
  }

  async completeSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.status = 'completed';
    }
  }

  async buildEnhancedQuery(sessionId: string): Promise<string> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return '';

    let enhancedQuery = `Ursprüngliche Frage: ${session.originalQuery}\n\nPräzisierungen:\n`;
    
    // Add clarification context in a structured way
    session.responses.forEach(response => {
      const question = session.clarificationResult.suggestedQuestions.find(q => q.id === response.questionId);
      if (question) {
        enhancedQuery += `- ${question.question}\n  Antwort: ${response.response}\n`;
      }
    });

    enhancedQuery += `\nBitte beantworte die ursprüngliche Frage mit den gegebenen Präzisierungen.`;

    return enhancedQuery;
  }
}

export default new FlipModeService();
