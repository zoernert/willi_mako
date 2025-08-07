"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlipModeService = void 0;
const user_service_1 = __importDefault(require("../modules/user/user.service"));
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
            const userPreferences = await user_service_1.default.getFlipModePreferences(userId);
            const analysis = {
                topicBreadth: this.analyzeTopicBreadth(query),
                specificityLevel: this.analyzeSpecificity(query),
                contextClarity: this.analyzeContextClarity(query, userPreferences),
                stakeholderAmbiguity: this.analyzeStakeholderAmbiguity(query, userPreferences),
                energyTypeAmbiguity: this.analyzeEnergyTypeAmbiguity(query, userPreferences)
            };
            const ambiguityScore = this.calculateAmbiguityScore(analysis);
            const needsClarification = ambiguityScore > this.AMBIGUITY_THRESHOLD;
            console.log('Flip Mode Analysis:', {
                query,
                analysis,
                ambiguityScore,
                needsClarification,
                threshold: this.AMBIGUITY_THRESHOLD,
            });
            if (needsClarification) {
                const sessionId = this.generateSessionId();
                const detectedTopics = this.extractTopics(query);
                const suggestedQuestions = await this.generateClarificationQuestions(query, analysis, userPreferences);
                if (suggestedQuestions.length === 0) {
                    return {
                        needsClarification: false,
                        ambiguityScore,
                        detectedTopics,
                        suggestedQuestions: [],
                        reasoning: 'Die Frage wurde durch gespeicherte Voreinstellungen ausreichend präzisiert.'
                    };
                }
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
        if (hasGenericTerms)
            return 0.8;
        return 0.3;
    }
    analyzeContextClarity(query, prefs) {
        if (prefs === null || prefs === void 0 ? void 0 : prefs.context_specificity)
            return 0.1;
        const hasContextIndicators = this.contextKeywords.some(indicator => query.toLowerCase().includes(indicator));
        return hasContextIndicators ? 0.2 : 0.7;
    }
    analyzeStakeholderAmbiguity(query, prefs) {
        if (prefs === null || prefs === void 0 ? void 0 : prefs.stakeholder_perspective)
            return 0.1;
        const stakeholders = [
            'Lieferant', 'Netzbetreiber', 'Messstellenbetreiber',
            'Kunde', 'Regulierer', 'Bilanzkreisverantwortlicher'
        ];
        const mentionedStakeholders = stakeholders.filter(s => query.toLowerCase().includes(s.toLowerCase()));
        if (mentionedStakeholders.length === 0)
            return 0.8;
        if (mentionedStakeholders.length === 1)
            return 0.2;
        return 0.6;
    }
    analyzeEnergyTypeAmbiguity(query, prefs) {
        if (prefs === null || prefs === void 0 ? void 0 : prefs.energy_type)
            return 0.0;
        const hasStrom = query.toLowerCase().includes('strom');
        const hasGas = query.toLowerCase().includes('gas');
        if (hasStrom && !hasGas)
            return 0.1;
        if (hasGas && !hasStrom)
            return 0.1;
        if (hasStrom && hasGas)
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
        return this.energyTerms.filter(term => query.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
    }
    async generateClarificationQuestions(query, analysis, prefs) {
        const questions = [];
        if (analysis.energyTypeAmbiguity > 0.5 && !(prefs === null || prefs === void 0 ? void 0 : prefs.energy_type)) {
            questions.push({
                id: 'energy_type',
                question: 'Auf welchen Energieträger bezieht sich Ihre Frage?',
                category: 'energy_type',
                options: ['Strom', 'Gas', 'Beide'],
                priority: 1
            });
        }
        if (analysis.stakeholderAmbiguity > 0.5 && !(prefs === null || prefs === void 0 ? void 0 : prefs.stakeholder_perspective)) {
            questions.push({
                id: 'stakeholder_perspective',
                question: 'Aus welcher Sicht möchten Sie die Information?',
                category: 'stakeholder',
                options: ['Energielieferant', 'Netzbetreiber', 'Messstellenbetreiber', 'Stadtwerke', 'Endkunde'],
                priority: 2
            });
        }
        if (analysis.contextClarity > 0.5 && !(prefs === null || prefs === void 0 ? void 0 : prefs.context_specificity)) {
            questions.push({
                id: 'context_specificity',
                question: 'Für welchen Anwendungsbereich benötigen Sie die Information?',
                category: 'context',
                options: ['Geschäftsprozesse', 'Technische Umsetzung', 'Rechtliche Anforderungen', 'Kundenbetreuung'],
                priority: 3
            });
        }
        if (analysis.specificityLevel > 0.6 && !(prefs === null || prefs === void 0 ? void 0 : prefs.detail_level)) {
            questions.push({
                id: 'detail_level',
                question: 'Welchen Detailgrad benötigen Sie?',
                category: 'detail_level',
                options: ['Kurzer Überblick', 'Detaillierte Erklärung', 'Schritt-für-Schritt Anleitung'],
                priority: 4
            });
        }
        if (analysis.topicBreadth > 0.6 && !(prefs === null || prefs === void 0 ? void 0 : prefs.topic_focus)) {
            questions.push({
                id: 'topic_focus',
                question: 'Welcher Aspekt des Themas interessiert Sie am meisten?',
                category: 'scope',
                options: ['Grundlagen', 'Prozesse & Abläufe', 'Fristen & Termine', 'Praktische Beispiele'],
                priority: 5
            });
        }
        return questions.sort((a, b) => a.priority - b.priority).slice(0, 3);
    }
    explainReasoning(analysis) {
        const reasons = [];
        if (analysis.topicBreadth > 0.6)
            reasons.push('breites Thema');
        if (analysis.specificityLevel > 0.6)
            reasons.push('allgemein formuliert');
        if (analysis.contextClarity > 0.5)
            reasons.push('unklarer Kontext');
        if (analysis.stakeholderAmbiguity > 0.5)
            reasons.push('unklare Perspektive');
        if (analysis.energyTypeAmbiguity > 0.5)
            reasons.push('unklarer Energieträger');
        return reasons.length > 0 ? `Präzisierung wegen: ${reasons.join(', ')}` : 'Spezifisch genug';
    }
    generateSessionId() {
        return `flip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    async saveClarificationResponses(userId, responses) {
        const preferences = {};
        const validKeys = [
            'energy_type',
            'stakeholder_perspective',
            'context_specificity',
            'detail_level',
            'topic_focus'
        ];
        for (const response of responses) {
            if (validKeys.includes(response.questionId)) {
                preferences[response.questionId] = response.answer;
            }
        }
        if (Object.keys(preferences).length > 0) {
            await user_service_1.default.saveFlipModePreferences(userId, preferences);
        }
    }
    async buildEnhancedQuery(originalQuery, userId, liveResponses = []) {
        var _a, _b, _c, _d, _e;
        const sessionResponses = new Map(liveResponses.map(r => [r.questionId, r.answer]));
        const userPreferences = await user_service_1.default.getFlipModePreferences(userId);
        const finalAnswers = {
            energy_type: (_a = sessionResponses.get('energy_type')) !== null && _a !== void 0 ? _a : userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.energy_type,
            stakeholder_perspective: (_b = sessionResponses.get('stakeholder_perspective')) !== null && _b !== void 0 ? _b : userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.stakeholder_perspective,
            context_specificity: (_c = sessionResponses.get('context_specificity')) !== null && _c !== void 0 ? _c : userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.context_specificity,
            detail_level: (_d = sessionResponses.get('detail_level')) !== null && _d !== void 0 ? _d : userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.detail_level,
            topic_focus: (_e = sessionResponses.get('topic_focus')) !== null && _e !== void 0 ? _e : userPreferences === null || userPreferences === void 0 ? void 0 : userPreferences.topic_focus,
        };
        let enhancedQuery = `Ursprüngliche Frage: "${originalQuery}"\n\nBitte beantworte die Frage unter Berücksichtigung der folgenden Präzisierungen:\n`;
        if (finalAnswers.energy_type)
            enhancedQuery += `- Energieträger: ${finalAnswers.energy_type}\n`;
        if (finalAnswers.stakeholder_perspective)
            enhancedQuery += `- Perspektive: ${finalAnswers.stakeholder_perspective}\n`;
        if (finalAnswers.context_specificity)
            enhancedQuery += `- Anwendungsbereich: ${finalAnswers.context_specificity}\n`;
        if (finalAnswers.detail_level)
            enhancedQuery += `- Detailgrad: ${finalAnswers.detail_level}\n`;
        if (finalAnswers.topic_focus)
            enhancedQuery += `- Fokus: ${finalAnswers.topic_focus}\n`;
        return enhancedQuery;
    }
    // Session Management
    async recordClarificationResponse(sessionId, questionId, answer) {
        const session = this.activeSessions.get(sessionId);
        if (!session)
            return null;
        const existingResponse = session.responses.find(r => r.questionId === questionId);
        if (existingResponse) {
            existingResponse.answer = answer;
        }
        else {
            session.responses.push({ questionId, answer });
        }
        return session;
    }
    async getSession(sessionId) {
        return this.activeSessions.get(sessionId) || null;
    }
    async completeSession(sessionId) {
        const session = this.activeSessions.get(sessionId);
        if (session) {
            session.status = 'completed';
            await this.saveClarificationResponses(session.userId, session.responses);
            this.activeSessions.delete(sessionId);
        }
    }
}
exports.FlipModeService = FlipModeService;
exports.default = new FlipModeService();
//# sourceMappingURL=flip-mode.js.map