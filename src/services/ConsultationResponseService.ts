import { IssueRef } from './GithubIssuesService';

export type ResponseInput = {
  organization?: string;
  contact?: string;
  role?: string; // e.g., EVU type
  positionGeneral?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral';
  remarksGeneral?: string; // for Kapitel 1-8
  remarksChapter9?: string; // for Kapitel 9
  selectedIssues?: IssueRef[];
};

export class ConsultationResponseService {
  static async buildDOCX(slug: string, input: ResponseInput): Promise<Buffer> {
  const { Document, HeadingLevel, Packer, Paragraph, TextRun } = await import('docx');
    const title = `Rückmeldung zur Konsultation – ${slug.toUpperCase()}`;
    const today = new Date().toLocaleDateString('de-DE');

  const header: any[] = [
      new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
      new Paragraph({ text: `Datum: ${today}` }),
      ...(input.organization ? [new Paragraph({ text: `Organisation: ${input.organization}` })] : []),
      ...(input.contact ? [new Paragraph({ text: `Kontakt: ${input.contact}` })] : []),
      ...(input.role ? [new Paragraph({ text: `Rolle: ${input.role}` })] : []),
      new Paragraph({ text: '' }),
    ];

    const posLabel =
      input.positionGeneral === 'zustimmend' ? 'Grundsätzlich zustimmend' :
      input.positionGeneral === 'mit_auflagen' ? 'Zustimmung mit Auflagen' :
      input.positionGeneral === 'ablehnend' ? 'Ablehnend' :
      'Neutral/ohne Grundsatzaussage';

  const generalBlock: any[] = [
      new Paragraph({ text: '10.1 Rückmeldung zu Kapitel 1 bis 8', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Grundsatzposition: ${posLabel}` }),
      ...(input.remarksGeneral
        ? input.remarksGeneral.split('\n').map((line) => new Paragraph({ text: line }))
        : [new Paragraph({ text: '—' })]),
      new Paragraph({ text: '' }),
    ];

  const chapter9Block: any[] = [
      new Paragraph({ text: '10.2 Rückmeldung zu Kapitel 9', heading: HeadingLevel.HEADING_1 }),
      ...(input.remarksChapter9
        ? input.remarksChapter9.split('\n').map((line) => new Paragraph({ text: line }))
        : [new Paragraph({ text: '—' })]),
      new Paragraph({ text: '' }),
    ];

  const references: any[] = [];
    if (input.selectedIssues && input.selectedIssues.length) {
      references.push(new Paragraph({ text: 'Anhang: Referenzen (GitHub Issues)', heading: HeadingLevel.HEADING_1 }));
      input.selectedIssues.forEach((it) => {
        references.push(
          new Paragraph({
            children: [
              new TextRun(`#${it.number} · ${it.title} `),
              new TextRun({ text: `(${it.url})`, underline: {} }),
            ],
          })
        );
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
