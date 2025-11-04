"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.correctionDetector = exports.CorrectionDetector = void 0;
const llmProvider_1 = __importDefault(require("../../services/llmProvider"));
class CorrectionDetector {
    constructor(minConfidence = Number(process.env.CHAT_CORRECTION_MIN_CONFIDENCE || '0.55')) {
        this.minConfidence = minConfidence;
    }
    /**
     * Uses the LLM to decide whether the latest user turn corrects the assistant.
     */
    async detect(input) {
        if (!Array.isArray(input.conversation) || input.conversation.length < 2) {
            return null;
        }
        const trimmedWindow = input.conversation.slice(-8);
        const formatted = trimmedWindow
            .map((turn) => `${turn.role.toUpperCase()}: ${turn.content.trim()}`)
            .join('\n');
        const prompt = [
            'Analysiere den folgenden Dialog zwischen einem Energie-Marktkommunikations-Assistenten und einem Nutzer.',
            'Bewerte ausschließlich die letzte Nutzernachricht. Stelle fest, ob sie eine faktische Korrektur oder Ergänzung zur vorherigen Assistentenantwort enthält.',
            'Liefere deine Antwort als gültiges JSON mit diesen Feldern:',
            '{',
            '  "is_correction": boolean,',
            '  "confidence": number, // 0.0 bis 1.0',
            '  "summary": string, // kurzer Satz, worum es in der Korrektur geht',
            '  "corrected_information": string, // prägnante Darstellung der korrigierten Information',
            '  "vector_title": string, // max. 80 Zeichen, sprechende Überschrift für einen Wissenseintrag',
            '  "vector_suggestion": string, // 2-3 Sätze, die direkt als Wissenseintrag für Qdrant taugen',
            '  "tags": string[], // max. 5 fachliche Stichworte in GROSSBUCHSTABEN oder CamelCase',
            '  "severity": "low" | "medium" | "high", // Einordnung der Fehlerrelevanz',
            '  "reason": string, // warum es sich (nicht) um eine Korrektur handelt',
            '  "follow_up_action": string | null // optionaler Vorschlag, wie Admins weiter verfahren sollten',
            '}',
            'Hinweise:',
            '- Wenn keine Korrektur vorliegt, setze "is_correction" auf false und lasse die übrigen Felder leer oder neutral.',
            '- Verwende ausschließlich Informationen aus dem Dialog.',
            '- Formatiere strikt als JSON ohne zusätzliche Erläuterungen.',
            '',
            'Dialog:',
            formatted
        ].join('\n');
        let raw;
        try {
            raw = await llmProvider_1.default.generateStructuredOutput(prompt);
        }
        catch (error) {
            console.warn('CorrectionDetector: structured output request failed', error);
            return null;
        }
        const candidate = this.normalize(raw);
        if (!candidate || !candidate.isCorrection) {
            return null;
        }
        if (candidate.confidence < this.minConfidence) {
            return null;
        }
        return candidate;
    }
    normalize(raw) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        if (!raw || typeof raw !== 'object') {
            return null;
        }
        const isCorrection = Boolean((_a = raw.is_correction) !== null && _a !== void 0 ? _a : raw.isCorrection);
        const confidence = Number((_b = raw.confidence) !== null && _b !== void 0 ? _b : 0);
        const summary = String((_d = (_c = raw.summary) !== null && _c !== void 0 ? _c : raw.correction_summary) !== null && _d !== void 0 ? _d : '').trim();
        const info = String((_f = (_e = raw.corrected_information) !== null && _e !== void 0 ? _e : raw.correctInformation) !== null && _f !== void 0 ? _f : '').trim();
        const vectorTitle = String((_h = (_g = raw.vector_title) !== null && _g !== void 0 ? _g : raw.vectorTitle) !== null && _h !== void 0 ? _h : summary).trim().slice(0, 120);
        const vectorSuggestion = String((_k = (_j = raw.vector_suggestion) !== null && _j !== void 0 ? _j : raw.vectorSnippet) !== null && _k !== void 0 ? _k : info).trim();
        const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
        const tags = tagsRaw
            .map((tag) => String(tag || '').trim())
            .filter((tag) => tag.length > 1)
            .slice(0, 5);
        const severity = this.normalizeSeverity(raw.severity);
        const reason = String((_l = raw.reason) !== null && _l !== void 0 ? _l : '').trim();
        const followUpAction = (_m = raw.follow_up_action) !== null && _m !== void 0 ? _m : raw.followUpAction;
        return {
            isCorrection,
            confidence: Math.max(0, Math.min(1, confidence || 0)),
            summary,
            correctedInformation: info,
            vectorTitle: vectorTitle || summary,
            vectorSuggestion: vectorSuggestion || info,
            tags,
            severity,
            reason,
            followUpAction: typeof followUpAction === 'string' ? followUpAction.trim() : undefined
        };
    }
    normalizeSeverity(value) {
        const normalized = String(value || '').toLowerCase();
        if (normalized === 'high')
            return 'high';
        if (normalized === 'medium' || normalized === 'mittel')
            return 'medium';
        return 'low';
    }
}
exports.CorrectionDetector = CorrectionDetector;
exports.correctionDetector = new CorrectionDetector();
//# sourceMappingURL=correctionDetector.js.map