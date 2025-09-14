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
exports.ConsultationResponseService = void 0;
class ConsultationResponseService {
    static async buildDOCX(slug, input) {
        const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await Promise.resolve().then(() => __importStar(require('docx')));
        const title = `Rückmeldung zur Konsultation – ${slug.toUpperCase()}`;
        const today = new Date().toLocaleDateString('de-DE');
        const header = [
            new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
            new Paragraph({ text: `Datum: ${today}` }),
            ...(input.organization ? [new Paragraph({ text: `Organisation: ${input.organization}` })] : []),
            ...(input.contact ? [new Paragraph({ text: `Kontakt: ${input.contact}` })] : []),
            ...(input.role ? [new Paragraph({ text: `Rolle: ${input.role}` })] : []),
            new Paragraph({ text: '' }),
        ];
        const posLabel = input.positionGeneral === 'zustimmend' ? 'Grundsätzlich zustimmend' :
            input.positionGeneral === 'mit_auflagen' ? 'Zustimmung mit Auflagen' :
                input.positionGeneral === 'ablehnend' ? 'Ablehnend' :
                    'Neutral/ohne Grundsatzaussage';
        const generalBlock = [
            new Paragraph({ text: '10.1 Rückmeldung zu Kapitel 1 bis 8', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `Grundsatzposition: ${posLabel}` }),
            ...(input.remarksGeneral
                ? input.remarksGeneral.split('\n').map((line) => new Paragraph({ text: line }))
                : [new Paragraph({ text: '—' })]),
            new Paragraph({ text: '' }),
        ];
        const chapter9Block = [
            new Paragraph({ text: '10.2 Rückmeldung zu Kapitel 9', heading: HeadingLevel.HEADING_1 }),
            ...(input.remarksChapter9
                ? input.remarksChapter9.split('\n').map((line) => new Paragraph({ text: line }))
                : [new Paragraph({ text: '—' })]),
            new Paragraph({ text: '' }),
        ];
        const references = [];
        if (input.selectedIssues && input.selectedIssues.length) {
            references.push(new Paragraph({ text: 'Anhang: Referenzen (GitHub Issues)', heading: HeadingLevel.HEADING_1 }));
            input.selectedIssues.forEach((it) => {
                references.push(new Paragraph({
                    children: [
                        new TextRun(`#${it.number} · ${it.title} `),
                        new TextRun({ text: `(${it.url})`, underline: {} }),
                    ],
                }));
            });
        }
        const doc = new Document({
            sections: [
                { properties: {}, children: [...header, ...generalBlock, ...chapter9Block, ...references] },
            ],
        });
        const buffer = await Packer.toBuffer(doc);
        return Buffer.from(buffer);
    }
}
exports.ConsultationResponseService = ConsultationResponseService;
//# sourceMappingURL=ConsultationResponseService.js.map