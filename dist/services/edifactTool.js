"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edifactTool = exports.EdifactTool = void 0;
const message_analyzer_service_1 = require("../modules/message-analyzer/services/message-analyzer.service");
class EdifactTool {
    getAnalyzer() {
        if (!this.analyzer)
            this.analyzer = new message_analyzer_service_1.MessageAnalyzerService();
        return this.analyzer;
    }
    /** Analyze a (possibly complete) EDIFACT message and return a concise JSON. */
    async analyzeMessage(message) {
        var _a, _b, _c;
        const analysis = await this.getAnalyzer().analyze(message);
        return {
            format: analysis.format,
            messageType: (analysis === null || analysis === void 0 ? void 0 : analysis.messageType) || ((_a = analysis === null || analysis === void 0 ? void 0 : analysis.enrichedContext) === null || _a === void 0 ? void 0 : _a.messageType) || 'EDIFACT',
            summary: analysis.summary,
            segmentCount: (_c = (_b = analysis === null || analysis === void 0 ? void 0 : analysis.segments) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : undefined,
            hints: (analysis === null || analysis === void 0 ? void 0 : analysis.hints) || [],
            issues: (analysis === null || analysis === void 0 ? void 0 : analysis.issues) || [],
        };
    }
    /** Explain a single EDIFACT segment or short fragment. */
    async explainSegment(fragment) {
        var _a;
        // Reuse generic analyzer even for fragments – it adds EDIFACT context when patterns are detected
        const analysis = await this.getAnalyzer().analyze(fragment);
        const likelyType = (analysis === null || analysis === void 0 ? void 0 : analysis.messageType) || ((_a = analysis === null || analysis === void 0 ? void 0 : analysis.enrichedContext) === null || _a === void 0 ? void 0 : _a.messageType) || 'EDIFACT';
        return {
            likelyMessageType: likelyType,
            summary: analysis.summary,
            format: analysis.format,
        };
    }
}
exports.EdifactTool = EdifactTool;
exports.edifactTool = new EdifactTool();
//# sourceMappingURL=edifactTool.js.map