"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const errorHandler_1 = require("../middleware/errorHandler");
const database_1 = __importDefault(require("../config/database"));
const llmProvider_1 = __importStar(require("../services/llmProvider"));
const qdrant_1 = require("../services/qdrant");
const flip_mode_1 = __importDefault(require("../services/flip-mode"));
const contextManager_1 = __importDefault(require("../services/contextManager"));
const advancedReasoningService_1 = __importDefault(require("../services/advancedReasoningService"));
const gamification_service_1 = require("../modules/quiz/gamification.service");
const ensureChatColumns_1 = require("./utils/ensureChatColumns");
const chatCorrectionSuggestion_service_1 = require("../modules/chat-corrections/chatCorrectionSuggestion.service");
const router = (0, express_1.Router)();
// Initialize services
const qdrantService = new qdrant_1.QdrantService();
const gamificationService = new gamification_service_1.GamificationService();
const MAX_SHORT_ANSWER_CHARS = 450;
const MAX_FOLLOW_UP_CHARS = 180;
const MAX_REWRITE_SOURCE_CHARS = 4000;
const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();
const extractFirstSentences = (text, maxSentences) => {
    const normalized = normalizeWhitespace(text);
    if (!normalized) {
        return '';
    }
    const sentences = normalized
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(Boolean);
    const sourceUnits = sentences.length > 0
        ? sentences
        : normalized
            .split(/\n+/)
            .map((sentence) => sentence.trim())
            .filter(Boolean);
    const candidate = sourceUnits.slice(0, Math.max(1, maxSentences)).join(' ');
    return candidate.slice(0, MAX_SHORT_ANSWER_CHARS).trim();
};
const deriveFollowUpQuestion = (userMessage) => {
    const normalized = userMessage.toLowerCase();
    const keywordMappings = [
        { keyword: /gpke/, question: 'In welchem GPKE-Schritt stehst du gerade und welche Rolle (z.\u202fB. NB, LF, MSB) nimmst du ein?' },
        { keyword: /wim/, question: 'Welche WiM-Prozessvariante betrifft dich und welches Ergebnis brauchst du konkret?' },
        { keyword: /mabis/, question: 'Geht es dir um eine MaBiS-Abrechnung oder um Fristen im Fahrplanprozess?' },
        { keyword: /utilmd/, question: 'Welche UTILMD-Nachricht möchtest du erzeugen oder prüfen?' },
        { keyword: /mscons/, question: 'Beziehst du dich auf MSCONS-Messwerte und wenn ja, für welchen Anwendungsfall?' },
        { keyword: /(redispatch|rd2)/, question: 'Beziehst du dich auf Redispatch 2.0 und welche Abstimmung hakt gerade?' }
    ];
    const matched = keywordMappings.find((entry) => entry.keyword.test(normalized));
    const question = matched
        ? matched.question
        : 'In welchem Marktprozess befindest du dich gerade und welche Information fehlt dir, um weiterzukommen?';
    return question.length > MAX_FOLLOW_UP_CHARS
        ? `${question.slice(0, MAX_FOLLOW_UP_CHARS - 1).trimEnd()}?`
        : question;
};
const heuristicCoachingRewrite = (userMessage, draftResponse) => {
    const shortAnswer = extractFirstSentences(draftResponse, 2);
    if (!shortAnswer) {
        return null;
    }
    const followUpQuestion = deriveFollowUpQuestion(userMessage);
    const sanitizedShortAnswer = shortAnswer.slice(0, MAX_SHORT_ANSWER_CHARS).trim();
    const sanitizedFollowUp = followUpQuestion.slice(0, MAX_FOLLOW_UP_CHARS).trim();
    const finalMessage = sanitizedFollowUp
        ? `${sanitizedShortAnswer}\n\n${sanitizedFollowUp}`
        : sanitizedShortAnswer;
    return {
        message: finalMessage,
        shortAnswer: sanitizedShortAnswer,
        followUpQuestion: sanitizedFollowUp,
        strategy: 'heuristic'
    };
};
const buildFirstTurnCoachingResponse = async (userMessage, draftResponse, userPreferences) => {
    if (!draftResponse || !draftResponse.trim()) {
        return null;
    }
    const truncatedDraft = draftResponse.slice(0, MAX_REWRITE_SOURCE_CHARS);
    const prompt = `Du bist Coach für Marktkommunikation (Energiewirtschaft) und möchtest zunächst ein kurzes, vertrauensbildendes Signal senden. Arbeite mit der Nutzerfrage und einer internen langen Antwort. Formatiere deine Antwort als JSON mit den Feldern short_answer und follow_up_question.\n\nRahmenbedingungen:\n- short_answer: maximal 3 Sätze, höchstens 450 Zeichen, klare Handlungsempfehlung oder Zusammenfassung.\n- follow_up_question: offene Rückfrage (keine Ja/Nein-Frage), maximal 180 Zeichen, um den Kontext des Nutzers besser zu verstehen.\n- Verwende die Ansprache \"du\".\n- Wenn dir Informationen fehlen, frage gezielt danach.\n\nNutzerfrage:\n"""${userMessage}"""\n\nInterne Antwort (nur als Hintergrund, ggf. gekürzt):\n"""${truncatedDraft}"""\n\nGib ausschließlich gültiges JSON mit den Feldern short_answer und follow_up_question zurück.`;
    try {
        const structured = await llmProvider_1.default.generateStructuredOutput(prompt, userPreferences);
        if (structured && typeof structured === 'object') {
            const shortAnswerRaw = normalizeWhitespace(String(structured.short_answer || structured.shortAnswer || ''));
            const followUpRaw = normalizeWhitespace(String(structured.follow_up_question || structured.followUpQuestion || ''));
            if (shortAnswerRaw) {
                const sanitizedShort = shortAnswerRaw.slice(0, MAX_SHORT_ANSWER_CHARS).trim();
                const sanitizedFollowUp = followUpRaw
                    ? followUpRaw.slice(0, MAX_FOLLOW_UP_CHARS).trim()
                    : deriveFollowUpQuestion(userMessage);
                const finalMessage = sanitizedFollowUp
                    ? `${sanitizedShort}\n\n${sanitizedFollowUp}`
                    : sanitizedShort;
                return {
                    message: finalMessage,
                    shortAnswer: sanitizedShort,
                    followUpQuestion: sanitizedFollowUp,
                    strategy: 'llm'
                };
            }
        }
    }
    catch (error) {
        console.warn('⚠️  Erste-Antwort-Coaching (LLM) fehlgeschlagen:', error);
    }
    return heuristicCoachingRewrite(userMessage, truncatedDraft);
};
const KNOWN_JARGON_TERMS = [
    'GPKE',
    'WIM',
    'WIM',
    'MABIS',
    'MABiS',
    'MSCONS',
    'UTILMD',
    'OBIS',
    'BDEW',
    'LPZ',
    'MPES',
    'RLM',
    'SLP',
    'EDIFACT',
    'EAN',
    'MaLo',
    'MaKo',
    'MaKo2022',
    'Bilanzkreis',
    'Fahrplan',
    'Lieferbeginn',
    'Schleupen',
    'NTP',
    'VDE',
    'DATENFAKTOR'
];
const detectDomainJargon = (text) => {
    if (!text) {
        return [];
    }
    const normalized = text.replace(/[^\w\s:\-\.]/g, ' ');
    const matches = new Set();
    for (const term of KNOWN_JARGON_TERMS) {
        const pattern = new RegExp(`\\b${term}\\b`, 'i');
        if (pattern.test(normalized)) {
            matches.add(term.toUpperCase());
        }
    }
    const obisMatches = normalized.match(/\b\d{1,2}-\d{1,2}:\d{1,2}\.\d{1,2}\.\d{1,2}\b/g);
    if (obisMatches) {
        obisMatches.forEach((code) => matches.add(code));
    }
    return Array.from(matches);
};
const formatTermList = (terms) => {
    if (terms.length === 0) {
        return '';
    }
    if (terms.length === 1) {
        return terms[0];
    }
    if (terms.length === 2) {
        return `${terms[0]} und ${terms[1]}`;
    }
    return `${terms.slice(0, -1).join(', ')} und ${terms[terms.length - 1]}`;
};
const buildClarificationPrompt = (topics, informationGap, missingInfo) => {
    if (topics.length >= 2) {
        const primary = formatTermList(topics.slice(0, 2));
        return `Ich sehe Bezug zu ${primary}. Was davon trifft auf deinen Fall am ehesten zu?`;
    }
    if (informationGap) {
        return `Damit ich gezielter unterstützen kann: Welche Details zu "${informationGap}" kennst du bereits?`;
    }
    if (missingInfo) {
        return `Welche Angaben hast du genau zu ${missingInfo}? Dann kann ich den nächsten Schritt sauber wählen.`;
    }
    return 'Magst du kurz beschreiben, welche Rollen (z. B. NB, LF, MSB) beteiligt sind und welches Ergebnis du brauchst?';
};
const buildAmbiguityPrompt = (topics, semanticClusters) => {
    if (topics.length >= 3) {
        const primary = formatTermList(topics.slice(0, 3));
        return `Es gibt mehrere mögliche Richtungen (${primary}). In welche davon möchtest du tiefer einsteigen?`;
    }
    if (topics.length === 2) {
        return `Soll der Fokus eher auf ${topics[0]} oder ${topics[1]} liegen? Dann passe ich die nächsten Schritte an.`;
    }
    return `Ich habe mehrere ähnliche Treffer gefunden. Gibt es einen konkreten Prozessschritt oder Zeitraum, den wir eingrenzen sollten?`;
};
const buildJargonPrompt = (terms) => {
    const formatted = formatTermList(terms.slice(0, 3));
    return `Es tauchen Begriffe wie ${formatted} auf. Soll ich sie kurz einordnen, bevor wir tiefer gehen?`;
};
const deduplicatePrompts = (prompts) => {
    const seen = new Set();
    return prompts.filter((prompt) => {
        const key = `${prompt.reason}|${prompt.question}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
};
const buildAdditionalCoachingPrompts = (assistantTurnsBefore, reasoningResult, responseMetadata, aiResponse, firstTurnApplied) => {
    var _a;
    if (!reasoningResult) {
        return [];
    }
    if (firstTurnApplied) {
        // Erstes Turn hat bereits gezielte Rückfrage erhalten
        return [];
    }
    const prompts = [];
    const qaAnalysis = reasoningResult.qaAnalysis || {};
    const contextAnalysis = reasoningResult.contextAnalysis || {};
    const semanticClusters = Array.isArray(contextAnalysis.semanticClusters)
        ? contextAnalysis.semanticClusters
        : [];
    const topics = Array.isArray(contextAnalysis.topicsIdentified)
        ? contextAnalysis.topicsIdentified.map((topic) => topic.trim()).filter(Boolean)
        : [];
    const informationGaps = Array.isArray(contextAnalysis.informationGaps)
        ? contextAnalysis.informationGaps.filter(Boolean)
        : [];
    const missingInfo = Array.isArray(qaAnalysis.missingInfo)
        ? qaAnalysis.missingInfo.filter(Boolean)
        : [];
    const qdrantResults = typeof responseMetadata.qdrantResults === 'number'
        ? responseMetadata.qdrantResults
        : 0;
    const allowClarification = assistantTurnsBefore <= 3 ||
        qaAnalysis.needsMoreContext === true ||
        informationGaps.length > 0 ||
        missingInfo.length > 0;
    if (allowClarification && (qaAnalysis.needsMoreContext || informationGaps.length > 0 || missingInfo.length > 0)) {
        prompts.push({
            id: (0, uuid_1.v4)(),
            question: buildClarificationPrompt(topics, informationGaps[0] || null, missingInfo[0] || null),
            tone: 'clarify',
            reason: 'needs_more_context',
            priority: 80,
            topics: topics.slice(0, 3)
        });
    }
    const ambiguousRetrieval = qdrantResults >= 12 &&
        semanticClusters.length >= 3 &&
        ((_a = contextAnalysis.contextQuality) !== null && _a !== void 0 ? _a : 0) <= 0.7;
    if (ambiguousRetrieval) {
        prompts.push({
            id: (0, uuid_1.v4)(),
            question: buildAmbiguityPrompt(topics, semanticClusters.length),
            tone: 'clarify',
            reason: 'ambiguous_context',
            priority: 60,
            topics: topics.slice(0, 5)
        });
    }
    const jargonTerms = detectDomainJargon(aiResponse);
    const allowJargon = assistantTurnsBefore <= 6 || jargonTerms.length >= 2;
    if (jargonTerms.length > 0 && allowJargon) {
        prompts.push({
            id: (0, uuid_1.v4)(),
            question: buildJargonPrompt(jargonTerms),
            tone: 'explain',
            reason: 'jargon_offer',
            priority: 40,
            relatedTerms: jargonTerms.slice(0, 3)
        });
    }
    const sorted = prompts.sort((a, b) => b.priority - a.priority);
    return deduplicatePrompts(sorted).slice(0, 2);
};
// CR-CS30: Helper function to generate CS30 additional response
async function generateCs30AdditionalResponse(userQuery, userHasCs30Access, userId) {
    if (!userHasCs30Access) {
        console.log('🔍 CS30: User does not have cs30 access');
        return { hasCs30Response: false };
    }
    try {
        // Check if cs30 collection is available
        const isCs30Available = await qdrantService.isCs30Available();
        if (!isCs30Available) {
            console.log('🔍 CS30: Collection not available, skipping cs30 response');
            return { hasCs30Response: false };
        }
        console.log('🔍 CS30: Collection available, searching...');
        // Search cs30 collection for relevant content with lower threshold for testing
        const cs30Results = await qdrantService.searchCs30(userQuery, 3, 0.75); // Require higher relevance to reduce noise
        console.log(`🔍 CS30: Found ${cs30Results.length} results`);
        if (cs30Results.length > 0) {
            console.log('🔍 CS30: Top result score:', cs30Results[0].score);
        }
        if (cs30Results.length === 0) {
            console.log('🔍 CS30: No relevant results found above threshold');
            return { hasCs30Response: false };
        }
        // Extract context from cs30 results
        const cs30Context = cs30Results.map(result => {
            var _a, _b;
            // CS30 uses 'content' field instead of 'text'
            return ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.content) || ((_b = result.payload) === null || _b === void 0 ? void 0 : _b.text) || '';
        }).join('\n\n');
        console.log('🔍 CS30: Generating response with context length:', cs30Context.length);
        // Generate cs30-specific response
        const cs30Response = await llmProvider_1.default.generateResponse([{ role: 'user', content: userQuery }], cs30Context, { userId }, false // not enhanced query
        );
        console.log(`✅ CS30: Generated response with ${cs30Results.length} sources`);
        return {
            hasCs30Response: true,
            cs30Response: cs30Response,
            cs30Sources: cs30Results.map(r => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
                return ({
                    source_document: ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.source) || 'Schleupen Dokumentation',
                    content_type: ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.type) || 'N/A',
                    document_name: ((_c = r.payload) === null || _c === void 0 ? void 0 : _c.document_name) || null,
                    chunk_type: ((_d = r.payload) === null || _d === void 0 ? void 0 : _d.chunk_type) || null,
                    score: r.score,
                    document_metadata: {
                        message_format: ((_e = r.payload) === null || _e === void 0 ? void 0 : _e.message_format) ||
                            (((_f = r.payload) === null || _f === void 0 ? void 0 : _f.type) === 'BDEW' ? 'BDEW' :
                                ((_g = r.payload) === null || _g === void 0 ? void 0 : _g.type) === 'BNetzA' ? 'BNetzA' :
                                    ((_h = r.payload) === null || _h === void 0 ? void 0 : _h.type) === 'FAQ' ? 'FAQ' :
                                        ((_j = r.payload) === null || _j === void 0 ? void 0 : _j.is_user_document) ? 'Mein Workspace' : 'Allgemein'),
                        document_name: ((_k = r.payload) === null || _k === void 0 ? void 0 : _k.document_name) || null,
                        document_base_name: ((_l = r.payload) === null || _l === void 0 ? void 0 : _l.document_base_name) || ((_m = r.payload) === null || _m === void 0 ? void 0 : _m.source) || null,
                        version: ((_o = r.payload) === null || _o === void 0 ? void 0 : _o.version) || null,
                        publication_date: ((_p = r.payload) === null || _p === void 0 ? void 0 : _p.publication_date) || null,
                        is_user_document: ((_q = r.payload) === null || _q === void 0 ? void 0 : _q.is_user_document) || false,
                        owner_id: ((_r = r.payload) === null || _r === void 0 ? void 0 : _r.user_id) || null,
                        access_control: ((_s = r.payload) === null || _s === void 0 ? void 0 : _s.access_control) || null
                    }
                });
            })
        };
    }
    catch (error) {
        console.error('❌ CS30: Error generating response:', error);
        return { hasCs30Response: false };
    }
}
// Advanced retrieval service for contextual compression
class AdvancedRetrieval {
    async getContextualCompressedResults(query, userPreferences, // userPreferences is kept for interface consistency, but not used in the new flow
    limit = 10) {
        try {
            // 1. Multi-Collection Search: Combined or Single (Feature Flag)
            // ENABLE_COMBINED_SEARCH=true enables willi_mako + willi-netz combined search
            const useCombinedSearch = process.env.ENABLE_COMBINED_SEARCH !== 'false';
            console.log(`🔎 AdvancedRetrieval: useCombinedSearch=${useCombinedSearch}, query="${query}"`);
            const guidedResults = useCombinedSearch
                ? await qdrant_1.QdrantService.semanticSearchCombined(query, {
                    limit: limit * 2,
                    outlineScoping: true,
                    excludeVisual: true
                })
                : await qdrant_1.QdrantService.semanticSearchGuided(query, {
                    limit: limit * 2,
                    outlineScoping: true,
                    excludeVisual: true
                });
            console.log(`📦 AdvancedRetrieval: Retrieved ${guidedResults.length} results`);
            if (guidedResults.length === 0) {
                // Fallback: einfache Suche über generierte Suchbegriffe
                const searchQueries = await llmProvider_1.default.generateSearchQueries(query);
                const allResults = [];
                for (const q of searchQueries) {
                    const results = await qdrantService.search('system', q, limit);
                    allResults.push(...results);
                }
                const uniqueResults = this.removeDuplicates(allResults);
                if (uniqueResults.length === 0) {
                    return [];
                }
                // Context Synthesis für Fallback
                const synthesizedContext = await llmProvider_1.default.synthesizeContext(query, uniqueResults);
                return [
                    {
                        payload: {
                            text: synthesizedContext,
                        },
                        score: 1.0,
                        id: (0, uuid_1.v4)(),
                    },
                ];
            }
            // 2. Entferne Duplikate
            const uniqueResults = this.removeDuplicates(guidedResults);
            // 3. Intelligente Post-Processing basierend auf chunk_type inkl. pseudocode_* Typen
            const contextualizedResults = this.enhanceResultsWithChunkTypeContext(uniqueResults);
            // 4. Context Synthesis mit verbessertem Kontext
            const synthesizedContext = await llmProvider_1.default.synthesizeContextWithChunkTypes(query, contextualizedResults);
            // Return the synthesized context in the expected format
            return [
                {
                    payload: {
                        text: synthesizedContext,
                        sources: uniqueResults.map(r => {
                            var _a, _b, _c, _d, _e;
                            return ({
                                source_document: ((_b = (_a = r.payload) === null || _a === void 0 ? void 0 : _a.document_metadata) === null || _b === void 0 ? void 0 : _b.document_base_name) || 'Unknown',
                                page_number: ((_c = r.payload) === null || _c === void 0 ? void 0 : _c.page_number) || 'N/A',
                                chunk_type: ((_d = r.payload) === null || _d === void 0 ? void 0 : _d.chunk_type) || 'paragraph',
                                score: (_e = r.score) !== null && _e !== void 0 ? _e : r.merged_score
                            });
                        })
                    },
                    score: 1.0,
                    id: (0, uuid_1.v4)(),
                },
            ];
        }
        catch (error) {
            console.error('Error in advanced retrieval:', error);
            return [];
        }
    }
    /**
     * Erweitert Ergebnisse mit kontextspezifischen Informationen basierend auf chunk_type
     */
    enhanceResultsWithChunkTypeContext(results) {
        return results.map(result => {
            var _a, _b, _c;
            const chunkType = ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.chunk_type) || 'paragraph';
            let contextualPrefix = '';
            switch (chunkType) {
                case 'structured_table':
                    contextualPrefix = '[TABELLE] ';
                    break;
                case 'definition':
                    contextualPrefix = '[DEFINITION] ';
                    break;
                case 'abbreviation':
                    contextualPrefix = '[ABKÜRZUNG] ';
                    break;
                case 'visual_summary':
                    contextualPrefix = '[DIAGRAMM-BESCHREIBUNG] ';
                    break;
                case 'full_page':
                    contextualPrefix = '[VOLLTEXT] ';
                    break;
                case 'pseudocode_flow':
                    contextualPrefix = '[PSEUDOCODE-FLOW] ';
                    break;
                case 'pseudocode_validations_rules':
                    contextualPrefix = '[VALIDIERUNGSREGELN] ';
                    break;
                case 'pseudocode_functions':
                    contextualPrefix = '[PSEUDOCODE-FUNKTIONEN] ';
                    break;
                case 'pseudocode_table_maps':
                    contextualPrefix = '[TABELLEN-MAPPINGS] ';
                    break;
                case 'pseudocode_entities_segments':
                    contextualPrefix = '[SEGMENT/ELEMENTE] ';
                    break;
                case 'pseudocode_header':
                    contextualPrefix = '[NACHRICHTEN-HEADER] ';
                    break;
                case 'pseudocode_examples':
                    contextualPrefix = '[BEISPIELE] ';
                    break;
                case 'pseudocode_anchors':
                    contextualPrefix = '[ANKER/HINWEISE] ';
                    break;
                default:
                    contextualPrefix = '[ABSATZ] ';
            }
            return {
                ...result,
                payload: {
                    ...result.payload,
                    contextual_content: contextualPrefix + (((_b = result.payload) === null || _b === void 0 ? void 0 : _b.text) || ((_c = result.payload) === null || _c === void 0 ? void 0 : _c.content) || ''),
                    chunk_type_description: this.getChunkTypeDescription(chunkType)
                }
            };
        });
    }
    /**
     * Beschreibt den Typ des Chunks für besseren Kontext
     */
    getChunkTypeDescription(chunkType) {
        const descriptions = {
            'structured_table': 'Tabellarische Darstellung von Daten',
            'definition': 'Offizielle Definition eines Begriffs',
            'abbreviation': 'Erklärung einer Abkürzung',
            'visual_summary': 'Textuelle Beschreibung eines Diagramms oder einer visuellen Darstellung',
            'full_page': 'Vollständiger Seiteninhalt',
            'paragraph': 'Textabsatz',
            'pseudocode_flow': 'Prozessflüsse in Pseudocode',
            'pseudocode_validations_rules': 'Validierungsregeln und Prüfungen',
            'pseudocode_functions': 'Funktionale Schritte/Logik',
            'pseudocode_table_maps': 'Mapping zwischen Tabellenfeldern und Segmenten',
            'pseudocode_entities_segments': 'Segmente und Datenfelder',
            'pseudocode_header': 'Nachrichtenkopf und Meta',
            'pseudocode_examples': 'Beispielsnippets',
            'pseudocode_anchors': 'Anker/Hinweise'
        };
        return descriptions[chunkType] || 'Allgemeiner Textinhalt';
    }
    removeDuplicates(results) {
        const seen = new Set();
        return results.filter(result => {
            if (seen.has(result.id)) {
                return false;
            }
            seen.add(result.id);
            return true;
        });
    }
}
const retrieval = new AdvancedRetrieval();
const parseShareEnabledFlag = (value) => {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
    }
    return Boolean(value);
};
const extractShareInfo = (metadata) => {
    var _a, _b, _c;
    if (!metadata) {
        return { shareEnabled: false, shareEnabledAt: null };
    }
    const shareEnabled = parseShareEnabledFlag((_a = metadata.share_enabled) !== null && _a !== void 0 ? _a : metadata.shareEnabled);
    const shareEnabledAtRaw = (_c = (_b = metadata.share_enabled_at) !== null && _b !== void 0 ? _b : metadata.shareEnabledAt) !== null && _c !== void 0 ? _c : null;
    let shareEnabledAt = null;
    if (shareEnabled) {
        if (typeof shareEnabledAtRaw === 'string') {
            shareEnabledAt = shareEnabledAtRaw;
        }
        else if (shareEnabledAtRaw instanceof Date) {
            shareEnabledAt = shareEnabledAtRaw.toISOString();
        }
        else if (shareEnabledAtRaw) {
            try {
                shareEnabledAt = new Date(shareEnabledAtRaw).toISOString();
            }
            catch (_d) {
                shareEnabledAt = null;
            }
        }
    }
    return { shareEnabled, shareEnabledAt };
};
const serializeChatRow = (row) => {
    const { shareEnabled, shareEnabledAt } = extractShareInfo(row.metadata);
    return {
        id: row.id,
        title: row.title,
        created_at: row.created_at,
        updated_at: row.updated_at,
        metadata: row.metadata,
        share_enabled: shareEnabled,
        shareEnabled,
        share_enabled_at: shareEnabledAt,
        shareEnabledAt,
    };
};
// Get user's chats
router.get('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    await (0, ensureChatColumns_1.ensureChatColumns)();
    const chats = await database_1.default.query('SELECT id, title, created_at, updated_at, metadata FROM chats WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
    const data = chats.rows.map(serializeChatRow);
    res.json({
        success: true,
        data
    });
}));
// Search user's chats
router.get('/chats/search', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.id;
    const query = req.query.q;
    if (!query || query.trim() === '') {
        throw new errorHandler_1.AppError('Search query is required', 400);
    }
    await (0, ensureChatColumns_1.ensureChatColumns)();
    // Suche in Chat-Titeln und Nachrichteninhalten
    const searchResults = await database_1.default.query(`SELECT c.id, c.title, c.created_at, c.updated_at, c.metadata,
            (SELECT COUNT(*) FROM messages WHERE chat_id = c.id) as message_count,
            (
              SELECT STRING_AGG(SUBSTRING(content, 1, 100), '... ') 
              FROM messages 
              WHERE chat_id = c.id AND content ILIKE $2
              LIMIT 3
            ) as matching_snippets
     FROM chats c
     WHERE c.user_id = $1 AND (
       c.title ILIKE $2 OR
       EXISTS (
         SELECT 1 FROM messages m 
         WHERE m.chat_id = c.id AND m.content ILIKE $2
       )
     )
     ORDER BY c.updated_at DESC`, [userId, `%${query}%`]);
    const data = searchResults.rows.map(row => ({
        ...serializeChatRow(row),
        message_count: row.message_count,
        matching_snippets: row.matching_snippets,
    }));
    res.json({
        success: true,
        data
    });
}));
// Get specific chat with messages
router.get('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    await (0, ensureChatColumns_1.ensureChatColumns)();
    // Verify chat belongs to user
    const chat = await database_1.default.query('SELECT id, title, created_at, updated_at, metadata FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const chatPayload = serializeChatRow(chat.rows[0]);
    // Get messages
    const messages = await database_1.default.query('SELECT id, role, content, metadata, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    res.json({
        success: true,
        data: {
            chat: chatPayload,
            messages: messages.rows
        }
    });
}));
router.post('/chats/:chatId/share', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { enabled } = req.body;
    const userId = req.user.id;
    await (0, ensureChatColumns_1.ensureChatColumns)();
    if (typeof enabled !== 'boolean') {
        throw new errorHandler_1.AppError('Field "enabled" must be a boolean', 400);
    }
    const chatResult = await database_1.default.query('SELECT metadata FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chatResult.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const existingMetadata = chatResult.rows[0].metadata ? { ...chatResult.rows[0].metadata } : {};
    if (enabled) {
        existingMetadata.share_enabled = true;
        existingMetadata.share_enabled_at = new Date().toISOString();
    }
    else {
        existingMetadata.share_enabled = false;
        delete existingMetadata.share_enabled_at;
    }
    await database_1.default.query('UPDATE chats SET metadata = $1, updated_at = NOW() WHERE id = $2', [existingMetadata, chatId]);
    const { shareEnabled, shareEnabledAt } = extractShareInfo(existingMetadata);
    res.json({
        success: true,
        data: {
            share_enabled: shareEnabled,
            shareEnabled,
            share_enabled_at: shareEnabledAt,
            shareEnabledAt,
        }
    });
}));
// Create new chat
router.post('/chats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { title } = req.body;
    const userId = req.user.id;
    await (0, ensureChatColumns_1.ensureChatColumns)();
    const chat = await database_1.default.query('INSERT INTO chats (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at, updated_at', [userId, title || 'Neuer Chat']);
    res.status(201).json({
        success: true,
        data: chat.rows[0]
    });
}));
// Send message in chat
router.post('/chats/:chatId/messages', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { chatId } = req.params;
    const { content, contextSettings, timelineId } = req.body;
    const userId = req.user.id;
    const startTime = Date.now();
    await (0, ensureChatColumns_1.ensureChatColumns)();
    if (!content) {
        throw new errorHandler_1.AppError('Message content is required', 400);
    }
    // Verify chat belongs to user and get flip_mode_used status
    const chatResult = await database_1.default.query('SELECT id, flip_mode_used FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chatResult.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    const chat = chatResult.rows[0];
    // Deduplicate rapid duplicate submissions (same content within a short window)
    const norm = (s) => (s || '').trim();
    const lastMsgRes = await database_1.default.query('SELECT id, role, content, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at DESC LIMIT 1', [chatId]);
    if (lastMsgRes.rows.length > 0) {
        const last = lastMsgRes.rows[0];
        const secondsSinceLast = (Date.now() - new Date(last.created_at).getTime()) / 1000;
        if (last.role === 'user' && norm(last.content) === norm(content) && secondsSinceLast <= 10) {
            // Try to return the already produced assistant reply (if any) after that user turn
            const prevAssistant = await database_1.default.query(`SELECT id, role, content, metadata, created_at
         FROM messages 
         WHERE chat_id = $1 AND role = 'assistant' AND created_at > $2
         ORDER BY created_at ASC LIMIT 1`, [chatId, last.created_at]);
            if (prevAssistant.rows.length > 0) {
                return res.json({
                    success: true,
                    data: {
                        userMessage: last,
                        assistantMessage: prevAssistant.rows[0],
                        updatedChatTitle: null,
                        type: 'normal',
                        deduplicated: true
                    }
                });
            }
            // If no assistant reply yet, fall through to normal processing (to produce one),
            // but do not insert a second identical user message.
        }
    }
    // Save user message (or reuse previous identical one if just submitted)
    let userMessage;
    let reusedPreviousUser = false;
    if (lastMsgRes.rows.length > 0) {
        const last = lastMsgRes.rows[0];
        const secondsSinceLast = (Date.now() - new Date(last.created_at).getTime()) / 1000;
        if (last.role === 'user' && norm(last.content) === norm(content) && secondsSinceLast <= 10) {
            // Reuse previous identical user message to avoid duplicates
            userMessage = { rows: [last] };
            reusedPreviousUser = true;
        }
        else {
            userMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at', [chatId, 'user', content]);
        }
    }
    else {
        userMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content) VALUES ($1, $2, $3) RETURNING id, role, content, created_at', [chatId, 'user', content]);
    }
    // Check if Flip Mode should be activated
    if (!chat.flip_mode_used) {
        const clarificationResult = await flip_mode_1.default.analyzeClarificationNeed(content, userId);
        if (clarificationResult.needsClarification) {
            const clarificationMessageContent = JSON.stringify({
                type: 'clarification',
                clarificationResult,
            });
            const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', clarificationMessageContent, { type: 'clarification' }]);
            await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
            return res.json({
                success: true,
                data: {
                    userMessage: userMessage.rows[0],
                    assistantMessage: assistantMessage.rows[0],
                    type: 'clarification'
                }
            });
        }
    }
    // Proceed with normal response generation using configured pipeline
    const previousMessages = await database_1.default.query('SELECT id, role, content, created_at FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const historyRows = previousMessages.rows;
    const lastAssistantEntry = [...historyRows].reverse().find((msg) => msg.role === 'assistant');
    const userMessageRow = userMessage.rows[0];
    if (lastAssistantEntry && (userMessageRow === null || userMessageRow === void 0 ? void 0 : userMessageRow.id)) {
        try {
            await chatCorrectionSuggestion_service_1.chatCorrectionSuggestionService.detectAndStore({
                chatId,
                userId,
                userMessage: { id: userMessageRow.id, content: userMessageRow.content },
                assistantMessage: { id: lastAssistantEntry.id, content: lastAssistantEntry.content },
                history: historyRows
            });
        }
        catch (error) {
            console.warn('Chat correction detection failed:', error);
        }
    }
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    const assistantTurnsBefore = historyRows.filter((msg) => msg.role === 'assistant').length;
    const userPreferencesRow = userPreferences.rows[0] || {};
    // Use the advanced reasoning pipeline for better quality responses with timeout protection
    const reasoningPromise = advancedReasoningService_1.default.generateReasonedResponse(content, previousMessages.rows, { ...userPreferencesRow, userId }, contextSettings);
    // Add timeout protection: use a budget slightly lower than server timeout to allow graceful fallback
    const serverTimeoutMs = Number(process.env.CHAT_TIMEOUT_MS || '90000');
    const reasoningBudgetMs = Math.max(15000, serverTimeoutMs - 5000); // keep 5s for fallback/write
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('REASONING_TIMEOUT')), reasoningBudgetMs);
    });
    let reasoningResult;
    try {
        reasoningResult = await Promise.race([reasoningPromise, timeoutPromise]);
    }
    catch (error) {
        if (error.message === 'REASONING_TIMEOUT') {
            console.warn('⚠️ Advanced reasoning timed out, using fallback');
            // Fallback to simple response
            const fallbackContext = await retrieval.getContextualCompressedResults(content, userPreferencesRow, 5);
            const contextText = fallbackContext.map(r => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ''; }).join('\n');
            const fallbackResponse = await llmProvider_1.default.generateResponse(previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })), contextText, { ...userPreferencesRow, userId });
            reasoningResult = {
                response: fallbackResponse,
                reasoningSteps: [{
                        step: 'timeout_fallback',
                        description: 'Used fallback due to timeout',
                        timestamp: Date.now()
                    }],
                finalQuality: 0.7,
                iterationsUsed: 1,
                contextAnalysis: { topicsIdentified: [], informationGaps: [], contextQuality: 0.7 },
                qaAnalysis: { needsMoreContext: false, answerable: true, confidence: 0.7, missingInfo: [] },
                pipelineDecisions: { useIterativeRefinement: false, maxIterations: 1, confidenceThreshold: 0.8, reason: 'Timeout fallback' },
                apiCallsUsed: 2
            };
        }
        else {
            throw error;
        }
    }
    let aiResponse = reasoningResult.response;
    // Check if there's a better response in the reasoning steps (direct_response step)
    // The direct_response step often contains a more detailed answer
    const directResponseStep = (_a = reasoningResult.reasoningSteps) === null || _a === void 0 ? void 0 : _a.find((step) => { var _a; return step.step === 'direct_response' && ((_a = step.result) === null || _a === void 0 ? void 0 : _a.response); });
    if (((_b = directResponseStep === null || directResponseStep === void 0 ? void 0 : directResponseStep.result) === null || _b === void 0 ? void 0 : _b.response) && directResponseStep.result.response.length > aiResponse.length * 1.2) {
        console.log(`📝 Using detailed response from direct_response step (${directResponseStep.result.response.length} chars vs ${aiResponse.length} chars)`);
        aiResponse = directResponseStep.result.response;
    }
    let responseMetadata = {
        contextSources: reasoningResult.reasoningSteps.filter((step) => step.step === 'context_analysis').length,
        userContextUsed: false,
        contextReason: 'Advanced multi-step reasoning pipeline used',
        chatHistoryTurns: (previousMessages.rows || []).length,
        reasoningSteps: reasoningResult.reasoningSteps,
        finalQuality: reasoningResult.finalQuality,
        iterationsUsed: reasoningResult.iterationsUsed,
        qdrantQueries: reasoningResult.reasoningSteps.reduce((sum, step) => { var _a; return sum + (((_a = step.qdrantQueries) === null || _a === void 0 ? void 0 : _a.length) || 0); }, 0),
        qdrantResults: reasoningResult.reasoningSteps.reduce((sum, step) => sum + (step.qdrantResults || 0), 0),
        semanticClusters: ((_c = reasoningResult.contextAnalysis.semanticClusters) === null || _c === void 0 ? void 0 : _c.length) || 0,
        pipelineDecisions: reasoningResult.pipelineDecisions,
        qaAnalysis: reasoningResult.qaAnalysis,
        contextAnalysis: reasoningResult.contextAnalysis,
        hybridSearchUsed: reasoningResult.hybridSearchUsed || false,
        hybridSearchAlpha: reasoningResult.hybridSearchAlpha,
        assistantMetadata: {
            usedDetailedIntentAnalysis: (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.useDetailedIntentAnalysis) === true
        },
        llmInfo: (0, llmProvider_1.getActiveLLMInfo)()
    };
    // Check if we need to enhance with user context (fallback to existing logic if needed)
    let userContext = null;
    // Always check user context unless explicitly disabled
    // Default to includeUserDocuments=true if not specified (user uploaded documents should be used)
    const shouldCheckUserContext = (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserDocuments) !== false ||
        (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.includeUserNotes) !== false ||
        !contextSettings; // If no settings provided, check by default
    if (shouldCheckUserContext) {
        const contextResult = await contextManager_1.default.determineOptimalContext(content, userId, previousMessages.rows.slice(-5), contextSettings);
        userContext = contextResult.userContext;
        const contextDecision = contextResult.contextDecision;
        if (contextDecision.useUserContext && (userContext.userDocuments.length > 0 || userContext.userNotes.length > 0)) {
            // Enhance the response with user context
            let contextMode = 'standard';
            if (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.useWorkspaceOnly) {
                contextMode = 'workspace-only';
            }
            else if (contextSettings && !contextSettings.includeSystemKnowledge) {
                contextMode = 'workspace-only';
            }
            else if (contextSettings && !contextSettings.includeUserDocuments && !contextSettings.includeUserNotes) {
                contextMode = 'system-only';
            }
            aiResponse = await llmProvider_1.default.generateResponseWithUserContext(previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content })), reasoningResult.response, // Use reasoning result as enhanced context
            userContext.userDocuments, userContext.userNotes, userPreferencesRow, contextMode);
            responseMetadata = {
                ...responseMetadata,
                userContextUsed: true,
                contextReason: contextDecision.reason,
                userDocumentsUsed: userContext.userDocuments.length,
                userNotesUsed: userContext.userNotes.length,
                contextSummary: userContext.contextSummary,
                llmInfo: (0, llmProvider_1.getActiveLLMInfo)()
            };
        }
    }
    let firstTurnRewrite = null;
    const shouldApplyFirstTurnCoaching = assistantTurnsBefore === 0 &&
        (contextSettings === null || contextSettings === void 0 ? void 0 : contextSettings.disableFirstTurnCoaching) !== true;
    if (shouldApplyFirstTurnCoaching) {
        const normalizedResponse = normalizeWhitespace(aiResponse || '');
        const responseLooksLong = normalizedResponse.length > MAX_SHORT_ANSWER_CHARS;
        const endsWithQuestion = /\?\s*$/.test(normalizedResponse);
        if (responseLooksLong || !endsWithQuestion) {
            firstTurnRewrite = await buildFirstTurnCoachingResponse(content, aiResponse, { ...userPreferencesRow, userId });
            if (firstTurnRewrite === null || firstTurnRewrite === void 0 ? void 0 : firstTurnRewrite.message) {
                aiResponse = firstTurnRewrite.message;
            }
        }
    }
    const coachingPrompts = [];
    if (firstTurnRewrite === null || firstTurnRewrite === void 0 ? void 0 : firstTurnRewrite.followUpQuestion) {
        coachingPrompts.push({
            id: (0, uuid_1.v4)(),
            question: firstTurnRewrite.followUpQuestion,
            tone: 'clarify',
            reason: 'first_turn',
            priority: 100,
            strategy: firstTurnRewrite.strategy
        });
    }
    const additionalCoachingPrompts = buildAdditionalCoachingPrompts(assistantTurnsBefore, reasoningResult, responseMetadata, aiResponse, Boolean(firstTurnRewrite));
    const allCoachingPrompts = deduplicatePrompts([
        ...coachingPrompts,
        ...additionalCoachingPrompts
    ]);
    responseMetadata.assistantMetadata = {
        ...(responseMetadata.assistantMetadata || {}),
        assistantTurnsBefore,
        firstTurnCoachingApplied: Boolean(firstTurnRewrite),
        coachingPrompts: allCoachingPrompts,
        ...(firstTurnRewrite
            ? {
                firstTurnCoachingStrategy: firstTurnRewrite.strategy,
                firstTurnFollowUp: firstTurnRewrite.followUpQuestion,
                firstTurnShortAnswer: firstTurnRewrite.shortAnswer,
                firstTurnShortAnswerChars: firstTurnRewrite.shortAnswer.length
            }
            : {})
    };
    const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', aiResponse, JSON.stringify(responseMetadata)]);
    await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [chatId]);
    // Award points for document usage if documents were used in the response
    if (responseMetadata.userDocumentsUsed && responseMetadata.userDocumentsUsed > 0 && (userContext === null || userContext === void 0 ? void 0 : userContext.suggestedDocuments)) {
        try {
            for (const document of userContext.suggestedDocuments) {
                // Ensure document has a valid ID before awarding points
                if (document && document.id && typeof document.id === 'string') {
                    await gamificationService.awardDocumentUsagePoints(document.id, chatId);
                }
            }
        }
        catch (error) {
            console.error('Error awarding document usage points:', error);
            // Don't fail the chat response if points awarding fails
        }
    }
    const messageCountResult = await database_1.default.query('SELECT COUNT(*) FROM messages WHERE chat_id = $1 AND role = $2', [chatId, 'assistant']);
    let updatedChatTitle = null;
    if (parseInt(messageCountResult.rows[0].count) === 1) {
        try {
            const generatedTitle = await llmProvider_1.default.generateChatTitle(userMessage.rows[0].content, aiResponse);
            await database_1.default.query('UPDATE chats SET title = $1 WHERE id = $2', [generatedTitle, chatId]);
            updatedChatTitle = generatedTitle;
        }
        catch (error) {
            console.error('Error generating chat title:', error);
        }
    }
    const totalResponseTime = Date.now() - startTime;
    console.log(`📊 Chat response completed in ${totalResponseTime}ms (API calls: ${reasoningResult.apiCallsUsed || 'unknown'})`);
    // CR-CS30: Check if user has cs30 access and generate additional response
    const userQuery = await database_1.default.query('SELECT can_access_cs30 FROM users WHERE id = $1', [userId]);
    const userHasCs30Access = ((_d = userQuery.rows[0]) === null || _d === void 0 ? void 0 : _d.can_access_cs30) || false;
    console.log(`🔍 CS30 Access Check: User ${userId} has cs30 access: ${userHasCs30Access}`);
    // Generate CS30 additional response asynchronously (don't block primary response)
    let cs30ResponsePromise = null;
    if (userHasCs30Access) {
        // Only include CS30 additional response on the first user turn in a chat to avoid duplicate answers on follow-ups
        const userTurnCountRes = await database_1.default.query('SELECT COUNT(*) FROM messages WHERE chat_id = $1 AND role = $2', [chatId, 'user']);
        const userTurnCount = parseInt(((_e = userTurnCountRes.rows[0]) === null || _e === void 0 ? void 0 : _e.count) || '0', 10);
        if (userTurnCount === 1) {
            console.log(`🔍 Starting CS30 search for initial query: "${content}"`);
            cs30ResponsePromise = generateCs30AdditionalResponse(content, userHasCs30Access, userId);
        }
        else {
            console.log('🔍 Skipping CS30 additional response for follow-up turn');
        }
    }
    // Prepare primary response data
    const primaryResponseData = {
        userMessage: userMessage.rows[0],
        assistantMessage: assistantMessage.rows[0],
        updatedChatTitle,
        type: 'normal'
    };
    // If cs30 access is enabled, wait for cs30 response and include if relevant
    if (cs30ResponsePromise) {
        try {
            const cs30Result = await cs30ResponsePromise;
            if (cs30Result.hasCs30Response) {
                // Save CS30 additional response as separate message
                const cs30Message = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', cs30Result.cs30Response, JSON.stringify({
                        type: 'cs30_additional',
                        sources: cs30Result.cs30Sources,
                        sourceCount: ((_f = cs30Result.cs30Sources) === null || _f === void 0 ? void 0 : _f.length) || 0
                    })]);
                console.log(`✅ Added CS30 additional response with ${((_g = cs30Result.cs30Sources) === null || _g === void 0 ? void 0 : _g.length) || 0} sources`);
                // Timeline-Integration (falls timelineId übergeben)
                if (timelineId) {
                    try {
                        const { TimelineActivityService } = await Promise.resolve().then(() => __importStar(require('../services/TimelineActivityService')));
                        const timelineService = new TimelineActivityService(database_1.default);
                        // Timeline-Aktivität erfassen
                        await timelineService.captureActivity({
                            timelineId,
                            feature: 'chat',
                            activityType: 'conversation_completed',
                            rawData: {
                                chat_id: chatId,
                                user_message: content,
                                assistant_response: aiResponse,
                                cs30_additional: cs30Result.hasCs30Response,
                                coaching_prompts: allCoachingPrompts.map(prompt => {
                                    var _a;
                                    return ({
                                        question: prompt.question,
                                        reason: prompt.reason,
                                        tone: prompt.tone,
                                        strategy: (_a = prompt.strategy) !== null && _a !== void 0 ? _a : null
                                    });
                                }),
                                reasoning_quality: reasoningResult.finalQuality,
                                api_calls_used: reasoningResult.apiCallsUsed,
                                processing_time_ms: Date.now() - startTime
                            },
                            priority: 2
                        });
                    }
                    catch (timelineError) {
                        console.warn('Timeline integration failed:', timelineError);
                        // Don't fail the main request if timeline integration fails
                    }
                }
                return res.json({
                    success: true,
                    data: {
                        ...primaryResponseData,
                        cs30AdditionalResponse: cs30Message.rows[0],
                        hasCs30Additional: true
                    }
                });
            }
        }
        catch (error) {
            console.error('❌ Error in CS30 response generation:', error);
            // Continue with primary response only
        }
    }
    // Timeline-Integration für normale Chats (ohne CS30)
    if (timelineId) {
        try {
            const { TimelineActivityService } = await Promise.resolve().then(() => __importStar(require('../services/TimelineActivityService')));
            const timelineService = new TimelineActivityService(database_1.default);
            // Timeline-Aktivität erfassen
            await timelineService.captureActivity({
                timelineId,
                feature: 'chat',
                activityType: 'conversation_completed',
                rawData: {
                    chat_id: chatId,
                    user_message: content,
                    assistant_response: aiResponse,
                    cs30_additional: false,
                    first_turn_coaching_applied: Boolean(firstTurnRewrite),
                    first_turn_follow_up: (_h = firstTurnRewrite === null || firstTurnRewrite === void 0 ? void 0 : firstTurnRewrite.followUpQuestion) !== null && _h !== void 0 ? _h : null,
                    first_turn_short_answer: (_j = firstTurnRewrite === null || firstTurnRewrite === void 0 ? void 0 : firstTurnRewrite.shortAnswer) !== null && _j !== void 0 ? _j : null,
                    coaching_prompts: allCoachingPrompts.map(prompt => {
                        var _a;
                        return ({
                            question: prompt.question,
                            reason: prompt.reason,
                            tone: prompt.tone,
                            strategy: (_a = prompt.strategy) !== null && _a !== void 0 ? _a : null
                        });
                    }),
                    reasoning_quality: reasoningResult.finalQuality,
                    api_calls_used: reasoningResult.apiCallsUsed,
                    processing_time_ms: Date.now() - startTime
                },
                priority: 2
            });
        }
        catch (timelineError) {
            console.warn('Timeline integration failed:', timelineError);
            // Don't fail the main request if timeline integration fails
        }
    }
    return res.json({
        success: true,
        data: primaryResponseData
    });
}));
// Generate response (with or without clarification)
router.post('/chats/:chatId/generate', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { originalQuery, clarificationResponses } = req.body;
    const userId = req.user.id;
    if (!originalQuery) {
        throw new errorHandler_1.AppError('Original query is required', 400);
    }
    // Verify chat belongs to user
    const chat = await database_1.default.query('SELECT id FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (chat.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    // Build enhanced query with clarification context (live or from profile)
    const enhancedQuery = await flip_mode_1.default.buildEnhancedQuery(originalQuery, userId, clarificationResponses);
    // Get user preferences for retrieval
    const userPreferences = await database_1.default.query('SELECT companies_of_interest, preferred_topics FROM user_preferences WHERE user_id = $1', [userId]);
    // Get relevant context using enhanced query
    const contextResults = await retrieval.getContextualCompressedResults(enhancedQuery, userPreferences.rows[0] || {}, 10);
    const context = contextResults.map(result => result.payload.text).join('\n\n');
    // Get previous messages for context
    const previousMessages = await database_1.default.query('SELECT role, content FROM messages WHERE chat_id = $1 ORDER BY created_at ASC', [chatId]);
    const messagesForGeneration = previousMessages.rows.map(msg => ({ role: msg.role, content: msg.content }));
    // Add the enhanced query as the current user turn
    messagesForGeneration.push({ role: 'user', content: enhancedQuery });
    // Generate enhanced AI response
    const aiResponse = await llmProvider_1.default.generateResponse(messagesForGeneration, context, { ...(userPreferences.rows[0] || {}), userId }, true // isEnhancedQuery = true
    );
    // Save AI response
    const assistantMessage = await database_1.default.query('INSERT INTO messages (chat_id, role, content, metadata) VALUES ($1, $2, $3, $4) RETURNING id, role, content, metadata, created_at', [chatId, 'assistant', aiResponse, JSON.stringify({
            contextSources: contextResults.length,
            enhancedQuery: true,
            originalQuery: originalQuery,
            llmInfo: (0, llmProvider_1.getActiveLLMInfo)()
        })]);
    // Mark flip mode as used for this chat and update timestamp
    await database_1.default.query('UPDATE chats SET updated_at = CURRENT_TIMESTAMP, flip_mode_used = TRUE WHERE id = $1', [chatId]);
    res.json({
        success: true,
        data: {
            assistantMessage: assistantMessage.rows[0],
            type: 'enhanced_response'
        }
    });
}));
// Delete chat
router.delete('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const userId = req.user.id;
    // Verify chat belongs to user
    const result = await database_1.default.query('DELETE FROM chats WHERE id = $1 AND user_id = $2', [chatId, userId]);
    if (result.rowCount === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    res.json({
        success: true,
        message: 'Chat deleted successfully'
    });
}));
// Update chat title
router.put('/chats/:chatId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { chatId } = req.params;
    const { title } = req.body;
    const userId = req.user.id;
    if (!title) {
        throw new errorHandler_1.AppError('Title is required', 400);
    }
    const result = await database_1.default.query('UPDATE chats SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id, title, updated_at', [title, chatId, userId]);
    if (result.rows.length === 0) {
        throw new errorHandler_1.AppError('Chat not found', 404);
    }
    res.json({
        success: true,
        data: result.rows[0]
    });
}));
exports.default = router;
//# sourceMappingURL=chat.js.map