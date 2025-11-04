"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCorrectionSuggestionService = exports.ChatCorrectionSuggestionService = void 0;
const uuid_1 = require("uuid");
const js_client_rest_1 = require("@qdrant/js-client-rest");
const database_1 = __importDefault(require("../../config/database"));
const ensureCorrectionsTable_1 = require("./ensureCorrectionsTable");
const correctionDetector_1 = require("./correctionDetector");
const embeddingProvider_1 = require("../../services/embeddingProvider");
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'willi_mako';
const COLLECTION_NAME = (0, embeddingProvider_1.getCollectionName)(BASE_COLLECTION);
class ChatCorrectionSuggestionService {
    constructor() {
        this.qdrantClient = null;
    }
    async detectAndStore(params) {
        const { chatId, userId, userMessage, assistantMessage, history } = params;
        if (!assistantMessage || !assistantMessage.id) {
            return null;
        }
        await (0, ensureCorrectionsTable_1.ensureCorrectionsTable)();
        const conversation = history.map((msg) => ({
            role: msg.role || 'user',
            content: msg.content
        }));
        const detection = await correctionDetector_1.correctionDetector.detect({ conversation });
        if (!detection) {
            return null;
        }
        const assistantIndex = history.findIndex((msg) => msg.id === assistantMessage.id);
        const originalQuestion = this.resolveOriginalQuestion(history, assistantIndex);
        const snapshot = history.slice(Math.max(0, history.length - 8));
        const id = (0, uuid_1.v4)();
        await database_1.default.query(`INSERT INTO chat_correction_suggestions (
        id, chat_id, user_id, assistant_message_id, user_message_id,
        original_question, assistant_response, corrected_information,
        correction_summary, correction_text, vector_title, vector_suggestion,
        confidence, severity, detection_reason, metadata, conversation_snapshot,
        tags
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18
      )`, [
            id,
            chatId,
            userId,
            assistantMessage.id,
            userMessage.id,
            originalQuestion,
            assistantMessage.content,
            detection.correctedInformation || null,
            detection.summary || null,
            userMessage.content,
            detection.vectorTitle || null,
            detection.vectorSuggestion || null,
            detection.confidence,
            detection.severity,
            detection.reason || null,
            JSON.stringify({ detection }),
            JSON.stringify(snapshot),
            detection.tags && detection.tags.length ? detection.tags : null
        ]);
        return { id, detection };
    }
    async listSuggestions(status) {
        await (0, ensureCorrectionsTable_1.ensureCorrectionsTable)();
        const result = await database_1.default.query(`SELECT * FROM chat_correction_suggestions
       WHERE $1::text IS NULL OR status = $1
       ORDER BY created_at DESC
       LIMIT 200`, [status || null]);
        return result.rows;
    }
    async getSuggestion(id) {
        await (0, ensureCorrectionsTable_1.ensureCorrectionsTable)();
        const result = await database_1.default.query('SELECT * FROM chat_correction_suggestions WHERE id = $1 LIMIT 1', [id]);
        return result.rows[0] || null;
    }
    async approveSuggestion(id, adminUserId, options = {}) {
        var _a, _b, _c;
        await (0, ensureCorrectionsTable_1.ensureCorrectionsTable)();
        const suggestion = await this.getSuggestion(id);
        if (!suggestion) {
            throw new Error('Korrekturvorschlag wurde nicht gefunden');
        }
        if (suggestion.status !== 'pending') {
            throw new Error('Korrekturvorschlag wurde bereits bearbeitet');
        }
        const detection = (_a = suggestion.metadata) === null || _a === void 0 ? void 0 : _a.detection;
        const tags = Array.isArray(options.tags)
            ? options.tags
            : Array.isArray(suggestion.tags)
                ? suggestion.tags
                : Array.isArray(detection === null || detection === void 0 ? void 0 : detection.tags)
                    ? detection === null || detection === void 0 ? void 0 : detection.tags
                    : [];
        const sanitizedTags = (tags || [])
            .map((tag) => String(tag || '').trim())
            .filter((tag) => tag.length > 0);
        const vectorTitle = ((_b = options.vectorTitle) === null || _b === void 0 ? void 0 : _b.trim()) || suggestion.vector_title || (detection === null || detection === void 0 ? void 0 : detection.vectorTitle) || 'Chat-Korrektur';
        const vectorText = ((_c = options.vectorText) === null || _c === void 0 ? void 0 : _c.trim()) || suggestion.vector_suggestion || suggestion.correction_text;
        if (!vectorText || vectorText.length < 10) {
            throw new Error('Vector-Text ist zu kurz oder nicht vorhanden');
        }
        const pointId = suggestion.vector_point_id || (0, uuid_1.v4)();
        const vectorPayload = {
            content_type: 'correction_feedback',
            title: vectorTitle,
            text: vectorText,
            corrected_information: suggestion.corrected_information || (detection === null || detection === void 0 ? void 0 : detection.correctedInformation) || null,
            correction_summary: suggestion.correction_summary || (detection === null || detection === void 0 ? void 0 : detection.summary) || null,
            severity: suggestion.severity || (detection === null || detection === void 0 ? void 0 : detection.severity) || 'low',
            tags: sanitizedTags,
            chat_id: suggestion.chat_id,
            assistant_message_id: suggestion.assistant_message_id,
            user_message_id: suggestion.user_message_id,
            source: 'chat_correction',
            created_at: new Date().toISOString()
        };
        await this.upsertVector(pointId, vectorText, vectorPayload);
        const update = await database_1.default.query(`UPDATE chat_correction_suggestions
       SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(),
           review_notes = $3, vector_point_id = $4, vector_payload = $5::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`, [id, adminUserId, options.notes || null, pointId, JSON.stringify({ ...vectorPayload, tags: sanitizedTags })]);
        return update.rows[0];
    }
    async rejectSuggestion(id, adminUserId, notes) {
        await (0, ensureCorrectionsTable_1.ensureCorrectionsTable)();
        const suggestion = await this.getSuggestion(id);
        if (!suggestion) {
            throw new Error('Korrekturvorschlag wurde nicht gefunden');
        }
        if (suggestion.status !== 'pending') {
            throw new Error('Korrekturvorschlag wurde bereits bearbeitet');
        }
        const update = await database_1.default.query(`UPDATE chat_correction_suggestions
       SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(),
           review_notes = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`, [id, adminUserId, notes || null]);
        return update.rows[0];
    }
    resolveOriginalQuestion(history, assistantIndex) {
        var _a;
        if (assistantIndex <= 0) {
            return null;
        }
        for (let i = assistantIndex - 1; i >= 0; i -= 1) {
            if (((_a = history[i]) === null || _a === void 0 ? void 0 : _a.role) === 'user') {
                return history[i].content;
            }
        }
        return null;
    }
    async upsertVector(pointId, text, payload) {
        if (!this.qdrantClient) {
            this.qdrantClient = new js_client_rest_1.QdrantClient({
                url: QDRANT_URL,
                apiKey: QDRANT_API_KEY,
                checkCompatibility: false
            });
        }
        const vector = await (0, embeddingProvider_1.generateEmbedding)(text);
        await this.qdrantClient.upsert(COLLECTION_NAME, {
            wait: true,
            points: [
                {
                    id: pointId,
                    vector,
                    payload
                }
            ]
        });
    }
}
exports.ChatCorrectionSuggestionService = ChatCorrectionSuggestionService;
exports.chatCorrectionSuggestionService = new ChatCorrectionSuggestionService();
//# sourceMappingURL=chatCorrectionSuggestion.service.js.map