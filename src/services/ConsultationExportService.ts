import path from 'path';
import fs from 'fs';
import puppeteer from 'puppeteer';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { ConsultationPayload } from '../lib/content/consultations';
import type { IssueRef } from './GithubIssuesService';

export type ResponseInput = {
  organization?: string;
  contact?: string;
  role?: string;
  positionGeneral?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral';
  remarksGeneral?: string;
  remarksChapter9?: string;
  selectedIssues?: IssueRef[];
};

export class ConsultationExportService {
  static async exportPDF(payload: ConsultationPayload, issues?: IssueRef[]): Promise<Buffer> {
    const html = ConsultationExportService.renderHtml(payload, issues);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' } });
  return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  static async exportDOCX(payload: ConsultationPayload, issues?: IssueRef[]): Promise<Buffer> {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: payload.title, heading: HeadingLevel.TITLE }),
            new Paragraph({ text: `Stand: ${new Date(payload.updated_at).toLocaleDateString('de-DE')}` }),
            ...payload.sections.flatMap((s) => [
              new Paragraph({ text: s.title, heading: HeadingLevel.HEADING_1 }),
              new Paragraph({
                children: [new TextRun({ text: stripMarkdown(s.markdown), font: 'Arial' })],
              }),
            ]),
            ...(issues && issues.length
              ? [
                  new Paragraph({ text: 'Referenzen (GitHub Issues)', heading: HeadingLevel.HEADING_1 }),
                  ...issues.map((i) =>
                    new Paragraph({
                      children: [
                        new TextRun({ text: `#${i.number} – ${i.title} ` }),
                        new TextRun({ text: `(${i.url})`, color: '0000EE' }),
                        new TextRun({ text: i.labels?.length ? ` [${i.labels.join(', ')}]` : '' }),
                      ],
                    })
                  ),
                ]
              : []),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }

  static async exportResponseDOCX(slug: string, input: ResponseInput): Promise<Buffer> {
    const title = `Rückmeldung zur Konsultation – ${slug.toUpperCase()}`;
    const today = new Date().toLocaleDateString('de-DE');
    const posLabel =
      input.positionGeneral === 'zustimmend' ? 'Grundsätzlich zustimmend' :
      input.positionGeneral === 'mit_auflagen' ? 'Zustimmung mit Auflagen' :
      input.positionGeneral === 'ablehnend' ? 'Ablehnend' :
      'Neutral/ohne Grundsatzaussage';

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
            new Paragraph({ text: `Datum: ${today}` }),
            ...(input.organization ? [new Paragraph({ text: `Organisation: ${input.organization}` })] : []),
            ...(input.contact ? [new Paragraph({ text: `Kontakt: ${input.contact}` })] : []),
            ...(input.role ? [new Paragraph({ text: `Rolle: ${input.role}` })] : []),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '10.1 Rückmeldung zu Kapitel 1 bis 8', heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ text: `Grundsatzposition: ${posLabel}` }),
            ...(input.remarksGeneral
              ? input.remarksGeneral.split('\n').map((line) => new Paragraph({ text: line }))
              : [new Paragraph({ text: '—' })]),
            new Paragraph({ text: '' }),
            new Paragraph({ text: '10.2 Rückmeldung zu Kapitel 9', heading: HeadingLevel.HEADING_1 }),
            ...(input.remarksChapter9
              ? input.remarksChapter9.split('\n').map((line) => new Paragraph({ text: line }))
              : [new Paragraph({ text: '—' })]),
            ...(input.selectedIssues && input.selectedIssues.length
              ? [
                  new Paragraph({ text: '' }),
                  new Paragraph({ text: 'Anhang: Referenzen (GitHub Issues)', heading: HeadingLevel.HEADING_1 }),
                  ...input.selectedIssues.map((it) =>
                    new Paragraph({
                      children: [
                        new TextRun(`#${it.number} · ${it.title} `),
                        new TextRun({ text: `(${it.url})`, underline: {} }),
                      ],
                    })
                  ),
                ]
              : []),
          ],
        },
      ],
    });
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }

  static renderHtml(payload: ConsultationPayload, issues?: IssueRef[]): string {
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
          .map((i) => `<li><a href=\"${escapeHtml(i.url)}\">#${i.number} – ${escapeHtml(i.title)}</a>${
            i.labels?.length ? ` [${i.labels.map(escapeHtml).join(', ')}]` : ''
          }</li>`)
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

function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/\s+$/gm, '')
    .trim();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]+/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
}
