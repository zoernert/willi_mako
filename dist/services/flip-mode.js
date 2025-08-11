"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlipModeService = void 0;
const qdrant_1 = __importDefault(require("./qdrant"));
class FlipModeService {
    constructor() {
        this.AMBIGUITY_THRESHOLD = 0.5;
        this.energyTerms = [
            'Lieferantenwechsel', 'Marktkommunikation', 'Bilanzkreis',
            'Netzbetreiber', 'Messstellenbetreiber', 'Regulierung',
            'Energiemarkt', 'Strommarkt', 'Gasmarkt', 'Stadtwerke',
            'Energieversorgung', 'Verteilnetzbetreiber', 'Übertragungsnetzbetreiber',
            'Marktlokation', 'Zählpunkt', 'Abrechnung', 'Bilanzierung',
            'Energiedatenmanagement', 'Smart Meter', 'Lastgang',
            'Grundversorgung', 'Sondervertrag', 'Preisanpassung'
        ];
        this.contextKeywords = [
            'für Stadtwerke', 'als Netzbetreiber', 'im Kontext von',
            'bei uns', 'in unserem Fall', 'spezifisch für',
            'für unser Unternehmen', 'in der Praxis', 'konkret'
        ];
        this.genericTerms = [
            'wie funktioniert', 'was ist', 'erkläre', 'allgemein',
            'übersicht', 'grundlagen', 'alles über', 'beschreibe',
            'erläutere', 'informiere mich über', 'sage mir etwas über'
        ];
        this.activeSessions = new Map();
    }
    async analyzeClarificationNeed(query, userId) {
        try {
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
                const result = {
                    needsClarification: true,
                    ambiguityScore,
                    detectedTopics,
                    suggestedQuestions,
                    reasoning: this.explainReasoning(analysis),
                    sessionId
                };
                this.activeSessions.set(sessionId, {
                    id: sessionId,
                    userId,
                    originalQuery: query,
                    clarificationResult: result,
                    responses: [],
                    startedAt: new Date(),
                    status: 'awaiting_clarification'
                });
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
        }
        catch (error) {
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
    analyzeTopicBreadth(query) {
        const words = query.toLowerCase().split(/\s+/);
        const energyTermCount = this.energyTerms.filter(term => query.toLowerCase().includes(term.toLowerCase())).length;
        if (energyTermCount > 3)
            return 0.9;
        if (energyTermCount > 2)
            return 0.8;
        if (energyTermCount > 1)
            return 0.5;
        return 0.2;
    }
    analyzeSpecificity(query) {
        const hasGenericTerms = this.genericTerms.some(term => query.toLowerCase().includes(term));
        const questionWords = ['wie', 'was', 'wer', 'wo', 'wann', 'warum', 'welche'];
        const hasQuestionWords = questionWords.some(word => query.toLowerCase().includes(word));
        const hasSpecificNumbers = /\d+/.test(query);
        const hasSpecificDates = /\d{1,2}\.\d{1,2}\.\d{4}|\d{4}/.test(query);
        const hasSpecificCompany = /GmbH|AG|KG|OHG|mbH/.test(query);
        let score = 0;
        if (hasGenericTerms)
            score += 0.6;
        if (hasQuestionWords && !hasSpecificNumbers && !hasSpecificDates)
            score += 0.3;
        if (!hasSpecificCompany && !hasSpecificNumbers && !hasSpecificDates)
            score += 0.2;
        return Math.min(score, 1.0);
    }
    analyzeContextClarity(query) {
        const hasContextIndicators = this.contextKeywords.some(indicator => query.toLowerCase().includes(indicator));
        const hasTimeframe = /\d{4}|jahr|monat|quartal|seit|ab|bis/.test(query.toLowerCase());
        const hasLocation = /deutschland|europa|nrw|bayern|hamburg|berlin/.test(query.toLowerCase());
        const hasRegulation = /gesetz|verordnung|richtlinie|norm|standard/.test(query.toLowerCase());
        let score = hasContextIndicators ? 0.1 : 0.7;
        if (hasTimeframe)
            score -= 0.2;
        if (hasLocation)
            score -= 0.1;
        if (hasRegulation)
            score -= 0.1;
        return Math.max(score, 0.0);
    }
    analyzeStakeholderAmbiguity(query) {
        const stakeholders = [
            'Lieferant', 'Netzbetreiber', 'Messstellenbetreiber',
            'Kunde', 'Regulierer', 'Bilanzkreisverantwortlicher',
            'Stadtwerke', 'Energieversorgungsunternehmen', 'Verteilnetzbetreiber',
            'Übertragungsnetzbetreiber', 'Marktpartner', 'Endkunde'
        ];
        const mentionedStakeholders = stakeholders.filter(stakeholder => query.toLowerCase().includes(stakeholder.toLowerCase()));
        if (mentionedStakeholders.length === 0)
            return 0.8;
        if (mentionedStakeholders.length === 1)
            return 0.2;
        if (mentionedStakeholders.length > 2)
            return 0.6;
        return 0.4;
    }
    analyzeEnergyTypeAmbiguity(query) {
        const stromKeywords = ['strom', 'elektr', 'kwh', 'mwh', 'spannung', 'netz'];
        const gasKeywords = ['gas', 'erdgas', 'biogas', 'wasserstoff', 'cubic', 'm³'];
        const hasStromKeywords = stromKeywords.some(keyword => query.toLowerCase().includes(keyword));
        const hasGasKeywords = gasKeywords.some(keyword => query.toLowerCase().includes(keyword));
        if (hasStromKeywords && !hasGasKeywords)
            return 0.1;
        if (hasGasKeywords && !hasStromKeywords)
            return 0.1;
        if (hasStromKeywords && hasGasKeywords)
            return 0.3;
        return 0.7;
    }
    calculateAmbiguityScore(analysis) {
        return (analysis.topicBreadth * 0.25 +
            analysis.specificityLevel * 0.25 +
            analysis.contextClarity * 0.2 +
            analysis.stakeholderAmbiguity * 0.15 +
            analysis.energyTypeAmbiguity * 0.15);
    }
    extractTopics(query) {
        const topics = [];
        this.energyTerms.forEach(term => {
            if (query.toLowerCase().includes(term.toLowerCase())) {
                topics.push(term);
            }
        });
        return topics.slice(0, 5);
    }
    async generateClarificationQuestions(query, analysis) {
        const questions = [];
        if (analysis.energyTypeAmbiguity > 0.5) {
            questions.push({
                id: 'energy_type',
                question: 'Auf welchen Energieträger bezieht sich Ihre Frage?',
                category: 'energy_type',
                options: ['Strom', 'Gas', 'Beide'],
                priority: 1
            });
        }
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
            .slice(0, 3);
    }
    explainReasoning(analysis) {
        const reasons = [];
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
    generateSessionId() {
        return `flip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async getMinimalContext(query, limit = 2) {
        try {
            const results = await qdrant_1.default.searchByText(query, limit);
            return results.map(r => r.payload.text).join('\n').substring(0, 500);
        }
        catch (error) {
            console.error('Error getting minimal context:', error);
            return '';
        }
    }
    async recordClarificationResponse(sessionId, questionId, response) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return null;
        session.responses.push({
            questionId,
            response,
            timestamp: new Date()
        });
        return session;
    }
    async getSession(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    async isSessionComplete(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return false;
        const requiredQuestions = session.clarificationResult.suggestedQuestions.length;
        const answeredQuestions = session.responses.length;
        return answeredQuestions >= Math.min(requiredQuestions, 2);
    }
    async completeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.status = 'completed';
        }
    }
    async buildEnhancedQuery(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return '';
        let enhancedQuery = `Ursprüngliche Frage: ${session.originalQuery}\n\nPräzisierungen:\n`;
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
exports.FlipModeService = FlipModeService;
exports.default = new FlipModeService();
//# sourceMappingURL=flip-mode.js.map