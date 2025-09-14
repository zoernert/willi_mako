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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationAIService = void 0;
class ConsultationAIService {
    static async summarizeChapters(payload) {
        var _a, _b, _c;
        const summaries = {};
        const apiKey = process.env.OPENAI_API_KEY;
        const briefTarget = 4; // bullet points
        // If no API, return a deterministic fallback (first lines)
        if (!apiKey) {
            for (const s of payload.sections) {
                const plain = s.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                summaries[s.key] = `Kurzfassung: ${plain.substring(0, 180)}…`;
            }
            return summaries;
        }
        // Minimal batched prompt (keep token use low)
        const chunks = payload.sections.map((s) => ({ key: s.key, title: s.title, text: s.html.replace(/<[^>]+>/g, ' ') }));
        const input = chunks.slice(0, 18) // cap chapters for safety
            .map((c) => `Kapitel ${c.title} (${c.key}):\n${c.text.substring(0, 2000)}`).join('\n\n');
        const prompt = `Fasse die folgenden Kapitel jeweils in ${briefTarget} prägnanten Stichpunkten für EVU zusammen. Antworte als JSON: {"summaries": {"<key>": "- Punkt 1\n- Punkt 2 ..."}}.\n\n${input}`;
        const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const client = new OpenAI({ apiKey });
        const resp = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
        });
        const content = ((_c = (_b = (_a = resp.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '';
        try {
            const parsed = JSON.parse(content);
            if (parsed === null || parsed === void 0 ? void 0 : parsed.summaries)
                return parsed.summaries;
        }
        catch (_d) { }
        // Fallback: no parse
        for (const s of payload.sections)
            summaries[s.key] = `Kurzfassung nicht verfügbar.`;
        return summaries;
    }
    static async suggestResponse(payload, issues, params) {
        var _a, _b, _c;
        const apiKey = process.env.OPENAI_API_KEY;
        const role = params.role || 'EVU';
        const pos = params.positionGeneral || 'neutral';
        const tone = params.tone || 'sachlich';
        const refs = (params.selectedIssues || issues.slice(0, 6))
            .map((i) => `#${i.number} ${i.title} [${i.labels.join(', ')}]`).join('\n');
        const base = `Erstelle Vorschläge für eine Rückmeldung zur Mitteilung Nr. 53. Rolle: ${role}. Grundsatzposition (Kap. 1–8): ${pos}. Ton: ${tone}. Nutze nur Inhalte aus den bereitgestellten Kapiteln und den Referenz‑Titeln. Antworte als JSON: {"general":"…","chapter9":"…"}.`;
        const chapters = payload.sections
            .filter((s) => !params.chapterKeys || params.chapterKeys.includes(s.key))
            .map((s) => `Kapitel ${s.title} (${s.key}): ${s.html.replace(/<[^>]+>/g, ' ').substring(0, 1500)}`).join('\n\n');
        const prompt = `${base}\n\nReferenzen (nur Titel/Labels):\n${refs}\n\nKapitel:\n${chapters}`;
        if (!apiKey) {
            return {
                general: `Vorschlag (ohne KI): Beschreiben Sie kurz Ihre Grundsatzposition (${pos}) und nennen Sie 2–3 zentrale Punkte aus Kapiteln 1–8, die für ${role} besonders relevant sind.`,
                chapter9: 'Vorschlag (ohne KI): Konzentrieren Sie sich auf Schnittstellen, Schemas und Interoperabilität (Kapitel 9). Nennen Sie 1–2 konkrete Beispiele/OBIS‑Bezüge.',
            };
        }
        const { OpenAI } = await Promise.resolve().then(() => __importStar(require('openai')));
        const client = new OpenAI({ apiKey });
        const resp = await client.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
        });
        const content = ((_c = (_b = (_a = resp.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || '';
        try {
            const parsed = JSON.parse(content);
            return { general: parsed.general || '', chapter9: parsed.chapter9 || '' };
        }
        catch (_d) {
            return { general: content.slice(0, 1200), chapter9: '' };
        }
    }
}
exports.ConsultationAIService = ConsultationAIService;
//# sourceMappingURL=ConsultationAIService.js.map