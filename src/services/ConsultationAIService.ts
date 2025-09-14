import { IssueRef } from './GithubIssuesService';
import { ConsultationPayload } from '../lib/content/consultations';

type SuggestParams = {
  role?: string;
  positionGeneral?: 'zustimmend' | 'mit_auflagen' | 'ablehnend' | 'neutral';
  tone?: 'sachlich' | 'kurz' | 'detail';
  chapterKeys?: string[];
  selectedIssues?: IssueRef[];
};

export class ConsultationAIService {
  static async summarizeChapters(payload: ConsultationPayload): Promise<Record<string, string>> {
    const summaries: Record<string, string> = {};
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

    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const content = resp.choices?.[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(content);
      if (parsed?.summaries) return parsed.summaries as Record<string, string>;
    } catch {}
    // Fallback: no parse
    for (const s of payload.sections) summaries[s.key] = `Kurzfassung nicht verfügbar.`;
    return summaries;
  }

  static async suggestResponse(payload: ConsultationPayload, issues: IssueRef[], params: SuggestParams) {
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

    const { OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const resp = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });
    const content = resp.choices?.[0]?.message?.content || '';
    try {
      const parsed = JSON.parse(content);
      return { general: parsed.general || '', chapter9: parsed.chapter9 || '' };
    } catch {
      return { general: content.slice(0, 1200), chapter9: '' };
    }
  }
}
