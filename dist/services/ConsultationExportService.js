"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsultationExportService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const docx_1 = require("docx");
class ConsultationExportService {
    static async exportPDF(payload, issues) {
        const html = ConsultationExportService.renderHtml(payload, issues);
        const browser = await puppeteer_1.default.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        try {
            const page = await browser.newPage();
            await page.setContent(html, { waitUntil: 'networkidle0' });
            const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
            return Buffer.from(pdf);
        }
        finally {
            await browser.close();
        }
    }
    static async exportDOCX(payload, issues) {
        const doc = new docx_1.Document({
            sections: [
                {
                    properties: {},
                    children: [
                        new docx_1.Paragraph({ text: payload.title, heading: docx_1.HeadingLevel.TITLE }),
                        new docx_1.Paragraph({ text: `Stand: ${new Date(payload.updated_at).toLocaleDateString('de-DE')}` }),
                        ...payload.sections.flatMap((s) => [
                            new docx_1.Paragraph({ text: s.title, heading: docx_1.HeadingLevel.HEADING_1 }),
                            new docx_1.Paragraph({
                                children: [new docx_1.TextRun({ text: stripMarkdown(s.markdown), font: 'Arial' })],
                            }),
                        ]),
                        ...(issues && issues.length
                            ? [
                                new docx_1.Paragraph({ text: 'Referenzen (GitHub Issues)', heading: docx_1.HeadingLevel.HEADING_1 }),
                                ...issues.map((i) => {
                                    var _a;
                                    return new docx_1.Paragraph({
                                        children: [
                                            new docx_1.TextRun({ text: `#${i.number} – ${i.title} ` }),
                                            new docx_1.TextRun({ text: `(${i.url})`, color: '0000EE' }),
                                            new docx_1.TextRun({ text: ((_a = i.labels) === null || _a === void 0 ? void 0 : _a.length) ? ` [${i.labels.join(', ')}]` : '' }),
                                        ],
                                    });
                                }),
                            ]
                            : []),
                    ],
                },
            ],
        });
        const buffer = await docx_1.Packer.toBuffer(doc);
        return buffer;
    }
    static async exportResponseDOCX(slug, input) {
        const title = `Rückmeldung zur Konsultation – ${slug.toUpperCase()}`;
        const today = new Date().toLocaleDateString('de-DE');
        const posLabel = input.positionGeneral === 'zustimmend' ? 'Grundsätzlich zustimmend' :
            input.positionGeneral === 'mit_auflagen' ? 'Zustimmung mit Auflagen' :
                input.positionGeneral === 'ablehnend' ? 'Ablehnend' :
                    'Neutral/ohne Grundsatzaussage';
        const doc = new docx_1.Document({
            sections: [
                {
                    properties: {},
                    children: [
                        new docx_1.Paragraph({ text: title, heading: docx_1.HeadingLevel.TITLE }),
                        new docx_1.Paragraph({ text: `Datum: ${today}` }),
                        ...(input.organization ? [new docx_1.Paragraph({ text: `Organisation: ${input.organization}` })] : []),
                        ...(input.contact ? [new docx_1.Paragraph({ text: `Kontakt: ${input.contact}` })] : []),
                        ...(input.role ? [new docx_1.Paragraph({ text: `Rolle: ${input.role}` })] : []),
                        new docx_1.Paragraph({ text: '' }),
                        new docx_1.Paragraph({ text: '10.1 Rückmeldung zu Kapitel 1 bis 8', heading: docx_1.HeadingLevel.HEADING_1 }),
                        new docx_1.Paragraph({ text: `Grundsatzposition: ${posLabel}` }),
                        ...(input.remarksGeneral
                            ? input.remarksGeneral.split('\n').map((line) => new docx_1.Paragraph({ text: line }))
                            : [new docx_1.Paragraph({ text: '—' })]),
                        new docx_1.Paragraph({ text: '' }),
                        new docx_1.Paragraph({ text: '10.2 Rückmeldung zu Kapitel 9', heading: docx_1.HeadingLevel.HEADING_1 }),
                        ...(input.remarksChapter9
                            ? input.remarksChapter9.split('\n').map((line) => new docx_1.Paragraph({ text: line }))
                            : [new docx_1.Paragraph({ text: '—' })]),
                        ...(input.selectedIssues && input.selectedIssues.length
                            ? [
                                new docx_1.Paragraph({ text: '' }),
                                new docx_1.Paragraph({ text: 'Anhang: Referenzen (GitHub Issues)', heading: docx_1.HeadingLevel.HEADING_1 }),
                                ...input.selectedIssues.map((it) => new docx_1.Paragraph({
                                    children: [
                                        new docx_1.TextRun(`#${it.number} · ${it.title} `),
                                        new docx_1.TextRun({ text: `(${it.url})`, underline: {} }),
                                    ],
                                })),
                            ]
                            : []),
                    ],
                },
            ],
        });
        const buffer = await docx_1.Packer.toBuffer(doc);
        return buffer;
    }
    static renderHtml(payload, issues) {
        const styles = `
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; }
      h1,h2,h3 { color: #0f172a; }
      .title { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
      .meta { color: #475569; margin-bottom: 24px; }
      .section { margin-bottom: 20px; }
      .section h2 { font-size: 18px; margin: 12px 0; }
      .refs { margin-top: 28px; }
      .refs h2 { font-size: 18px; margin: 12px 0; }
      .refs ul { margin: 0 0 8px 18px; }
    `;
        const sections = payload.sections
            .map((s) => `<div class="section"><h2>${escapeHtml(s.title)}</h2>${s.html}</div>`)
            .join('\n');
        const refs = issues && issues.length
            ? `<div class=\"refs\"><h2>Referenzen (GitHub Issues)</h2><ul>${issues
                .map((i) => {
                var _a;
                return `<li><a href=\"${escapeHtml(i.url)}\">#${i.number} – ${escapeHtml(i.title)}</a>${((_a = i.labels) === null || _a === void 0 ? void 0 : _a.length) ? ` [${i.labels.map(escapeHtml).join(', ')}]` : ''}</li>`;
            })
                .join('')}</ul></div>`
            : '';
        return `<!doctype html>
      <html lang="de"><head><meta charset="utf-8"/>
      <title>${escapeHtml(payload.title)}</title>
      <style>${styles}</style>
      </head><body>
      <div class="title">${escapeHtml(payload.title)}</div>
      <div class="meta">Stand: ${new Date(payload.updated_at).toLocaleDateString('de-DE')}</div>
      ${sections}${refs}
      </body></html>`;
    }
}
exports.ConsultationExportService = ConsultationExportService;
function stripMarkdown(md) {
    return md
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
        .replace(/\s+$/gm, '')
        .trim();
}
function escapeHtml(s) {
    return s.replace(/[&<>"]+/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
//# sourceMappingURL=ConsultationExportService.js.map