"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MistralService = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const mistralai_1 = __importDefault(require("@mistralai/mistralai"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const aiResponseUtils_1 = require("../utils/aiResponseUtils");
dotenv_1.default.config();
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
const CHAT_MODEL = process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest';
function ensureApiKey() {
    if (!MISTRAL_API_KEY)
        throw new Error('MISTRAL_API_KEY is missing');
}
class MistralService {
    constructor() {
        this.client = null;
        if (MISTRAL_API_KEY) {
            try {
                this.client = new mistralai_1.default(MISTRAL_API_KEY);
            }
            catch (_a) {
                this.client = null;
            }
        }
    }
    /**
     * Return the model name used for the last/next request.
     */
    getLastUsedModel() {
        return CHAT_MODEL;
    }
    async chat(messages) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        ensureApiKey();
        // Try SDK
        try {
            if (this.client && typeof ((_a = this.client.chat) === null || _a === void 0 ? void 0 : _a.complete) === 'function') {
                const res = await this.client.chat.complete({ model: CHAT_MODEL, messages });
                const text = ((_c = (_b = res === null || res === void 0 ? void 0 : res.output) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) || ((_f = (_e = (_d = res === null || res === void 0 ? void 0 : res.choices) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.message) === null || _f === void 0 ? void 0 : _f.content);
                if (typeof text === 'string')
                    return text;
            }
        }
        catch (e) {
            // fall back to REST
        }
        // REST fallback
        const resp = await (0, node_fetch_1.default)('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ model: CHAT_MODEL, messages })
        });
        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Mistral chat HTTP ${resp.status}: ${txt}`);
        }
        const data = await resp.json();
        const content = (_j = (_h = (_g = data === null || data === void 0 ? void 0 : data.choices) === null || _g === void 0 ? void 0 : _g[0]) === null || _h === void 0 ? void 0 : _h.message) === null || _j === void 0 ? void 0 : _j.content;
        return typeof content === 'string' ? content : '';
    }
    async generateResponse(messages, context = '', userPreferences = {}, isEnhancedQuery = false, contextMode) {
        const systemPrompt = this.buildSystemPrompt(context, userPreferences, isEnhancedQuery, contextMode);
        // Avoid duplicating the last user turn: treat the last user message as the query to send,
        // and keep prior turns in the history only.
        const hasLastUser = messages.length > 0 && messages[messages.length - 1].role === 'user';
        const lastUserContent = hasLastUser ? messages[messages.length - 1].content : '';
        const history = (hasLastUser ? messages.slice(0, -1) : messages).map(m => ({ role: m.role, content: m.content }));
        const msgs = [
            { role: 'system', content: systemPrompt },
            ...history,
            ...(hasLastUser ? [{ role: 'user', content: lastUserContent }] : [])
        ];
        return (await this.chat(msgs)).trim();
    }
    async generateText(prompt, _userPreferences = {}) {
        const msgs = [{ role: 'user', content: prompt }];
        return (await this.chat(msgs)).trim();
    }
    async generateSearchQueries(query, _userPreferences = {}) {
        const prompt = `Analysiere die folgende Benutzeranfrage und generiere 3-5 alternative, detaillierte Suchanfragen als JSON-Array von Strings. Antworte NUR mit dem JSON-Array.\n\nAnfrage: "${query}"`;
        const text = await this.generateText(prompt);
        try {
            const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
            const arr = JSON.parse(cleaned);
            if (Array.isArray(arr))
                return arr.map((s) => String(s));
        }
        catch (_a) { }
        return [query];
    }
    async synthesizeContext(query, searchResults, _userPreferences = {}) {
        const documents = searchResults.map((r, i) => { var _a, _b; return `Dokument ${i + 1}:\n${((_a = r.payload) === null || _a === void 0 ? void 0 : _a.content) || r.content || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.text) || ''}`; }).join('\n\n---\n\n');
        const prompt = `Beantworte die Nutzeranfrage basierend auf den folgenden Dokumenten. Extrahiere alle relevanten technischen Details.\n\nFrage: ${query}\n\nDokumente:\n${documents}\n\nAntwort:`;
        return this.generateText(prompt);
    }
    async synthesizeContextWithChunkTypes(query, searchResults, _userPreferences = {}) {
        // Simplified version: reuse synthesizeContext
        return this.synthesizeContext(query, searchResults);
    }
    async generateResponseWithUserContext(messages, publicContext, userDocuments, userNotes, userPreferences = {}, contextMode) {
        let enhancedContext = publicContext || '';
        if (userDocuments === null || userDocuments === void 0 ? void 0 : userDocuments.length)
            enhancedContext += `\n\n=== PERSÖNLICHE DOKUMENTE ===\n${userDocuments.join('\n\n')}`;
        if (userNotes === null || userNotes === void 0 ? void 0 : userNotes.length)
            enhancedContext += `\n\n=== PERSÖNLICHE NOTIZEN ===\n${userNotes.join('\n\n')}`;
        return this.generateResponse(messages, enhancedContext, userPreferences, true, contextMode);
    }
    async generateChatTitle(userMessage, assistantResponse) {
        const prompt = `Erstelle einen kurzen Titel (max 6 Wörter) basierend auf:\nNutzer: ${userMessage}\nAssistent: ${assistantResponse}\nNur den Titel ausgeben.`;
        return (await this.generateText(prompt)).trim();
    }
    async generateStructuredOutput(prompt, _userPreferences = {}) {
        const text = await this.generateText(prompt);
        return (0, aiResponseUtils_1.safeParseJsonResponse)(text) || { needsMoreContext: false, answerable: true, confidence: 0.5 };
    }
    async generateTagsForNote(content) {
        const prompt = `Analysiere den Text und gib 3-5 Tags, durch Komma getrennt.\n\n${content}`;
        const text = await this.generateText(prompt);
        return text.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
    }
    async generateTagsForDocument(content, title) {
        const prompt = `Analysiere Titel und Inhalt und gib 3-5 Tags, durch Komma getrennt.\n\nTitel: ${title}\nInhalt: ${content.substring(0, 2000)}...`;
        const text = await this.generateText(prompt);
        return text.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
    }
    async generateMultipleChoiceQuestion(content, difficulty, topicArea) {
        const difficultyInstructions = {
            easy: 'Erstelle eine einfache Frage mit offensichtlichen Antworten',
            medium: 'Erstelle eine mittelschwere Frage mit plausiblen Distraktoren',
            hard: 'Erstelle eine schwere Frage mit sehr ähnlichen Antworten'
        };
        const prompt = `Basierend auf folgendem Inhalt, erstelle eine Multiple-Choice-Frage zum Thema "${topicArea}". Schwierigkeit: ${difficulty}. ${difficultyInstructions[difficulty]}\n\n${content}\n\nAntworte nur als JSON ohne Markdown mit Feldern question, options, correctIndex, explanation.`;
        const text = await this.generateText(prompt);
        const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
        const parsed = (0, aiResponseUtils_1.safeParseJsonResponse)(cleaned) || {};
        return {
            question: parsed.question || 'Frage',
            options: Array.isArray(parsed.options) ? parsed.options : ['A', 'B', 'C', 'D'],
            correctIndex: Number.isInteger(parsed.correctIndex) ? parsed.correctIndex : 0,
            explanation: parsed.explanation || ''
        };
    }
    async generateQuizQuestions(sourceContent, questionCount, difficulty, topicArea) {
        const out = [];
        for (let i = 0; i < Math.min(questionCount, sourceContent.length); i++) {
            try {
                out.push(await this.generateMultipleChoiceQuestion(sourceContent[i], difficulty, topicArea));
            }
            catch (e) {
                // skip
            }
        }
        return out;
    }
    async evaluateAnswerWithExplanation(question, userAnswer, correctAnswer) {
        const prompt = `Bewerte folgende Antwort:\n\nFrage: ${question}\nAntwort: ${userAnswer}\nKorrekte Antwort: ${correctAnswer}\n\nGib JSON mit isCorrect, explanation, improvementTips[].`;
        const text = await this.generateText(prompt);
        const parsed = (0, aiResponseUtils_1.safeParseJsonResponse)(text) || {};
        return {
            isCorrect: !!parsed.isCorrect,
            explanation: parsed.explanation || '',
            improvementTips: Array.isArray(parsed.improvementTips) ? parsed.improvementTips : []
        };
    }
    async generateHypotheticalAnswer(query) {
        const prompt = `Beantworte kurz und prägnant basierend auf allgemeinem Wissen. Nur die Antwort.\n\nFrage: ${query}`;
        const text = await this.generateText(prompt);
        return text.trim() || query;
    }
    // FAQ helpers for parity with GeminiService usage
    async generateFAQContent(messages) {
        const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');
        const prompt = `Erzeuge einen strukturierten FAQ-Eintrag (JSON) basierend auf folgendem Chat:\n\n${conversationText}\n\nFelder: title, description, context, answer, additionalInfo, tags[].`;
        const text = await this.generateText(prompt);
        const parsed = (0, aiResponseUtils_1.safeParseJsonResponse)(text) || {};
        return {
            title: parsed.title || 'FAQ',
            description: parsed.description || 'Beschreibung',
            context: parsed.context || 'Kontext',
            answer: parsed.answer || 'Antwort',
            additionalInfo: parsed.additionalInfo || '',
            tags: Array.isArray(parsed.tags) ? parsed.tags : ['Energiewirtschaft']
        };
    }
    async enhanceFAQWithContext(faqData, searchContext) {
        const prompt = `Verbessere diesen FAQ-Inhalt mithilfe des zusätzlichen Kontextes. Antworte als JSON mit denselben Feldern.\n\nFAQ: ${JSON.stringify(faqData)}\n\nKontext:\n${searchContext}`;
        const text = await this.generateText(prompt);
        const parsed = (0, aiResponseUtils_1.safeParseJsonResponse)(text) || {};
        return {
            title: parsed.title || faqData.title,
            description: parsed.description || faqData.description,
            context: parsed.context || faqData.context,
            answer: parsed.answer || faqData.answer,
            additionalInfo: parsed.additionalInfo || faqData.additionalInfo,
            tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : faqData.tags
        };
    }
    buildSystemPrompt(context, userPreferences, isEnhancedQuery, contextMode) {
        const mode = contextMode || 'standard';
        const prefs = userPreferences || {};
        const systemParts = [
            'Du bist ein hilfreicher Assistent für Marktkommunikation in der Energiewirtschaft. Antworte auf Deutsch.',
            `Kontextmodus: ${mode}`,
        ];
        if (context)
            systemParts.push('Kontext:\n' + context);
        if (prefs.preferred_topics)
            systemParts.push('Bevorzugte Themen: ' + JSON.stringify(prefs.preferred_topics));
        return systemParts.join('\n\n');
    }
}
exports.MistralService = MistralService;
exports.default = new MistralService();
//# sourceMappingURL=mistral.js.map