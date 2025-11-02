import llm from '../../services/llmProvider';
import { CorrectionDetectionResult } from './types';

type ConversationTurn = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

export interface CorrectionDetectorInput {
  conversation: ConversationTurn[];
}

export class CorrectionDetector {
  private readonly minConfidence: number;

  constructor(minConfidence: number = Number(process.env.CHAT_CORRECTION_MIN_CONFIDENCE || '0.55')) {
    this.minConfidence = minConfidence;
  }

  /**
   * Uses the LLM to decide whether the latest user turn corrects the assistant.
   */
  async detect(input: CorrectionDetectorInput): Promise<CorrectionDetectionResult | null> {
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

    let raw: any;
    try {
      raw = await llm.generateStructuredOutput(prompt);
    } catch (error) {
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

  private normalize(raw: any): CorrectionDetectionResult | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const isCorrection = Boolean(raw.is_correction ?? raw.isCorrection);
    const confidence = Number(raw.confidence ?? 0);
    const summary = String(raw.summary ?? raw.correction_summary ?? '').trim();
    const info = String(raw.corrected_information ?? raw.correctInformation ?? '').trim();
    const vectorTitle = String(raw.vector_title ?? raw.vectorTitle ?? summary).trim().slice(0, 120);
    const vectorSuggestion = String(raw.vector_suggestion ?? raw.vectorSnippet ?? info).trim();
    const tagsRaw = Array.isArray(raw.tags) ? raw.tags : [];
    const tags = tagsRaw
      .map((tag: any) => String(tag || '').trim())
      .filter((tag: string) => tag.length > 1)
      .slice(0, 5);
    const severity = this.normalizeSeverity(raw.severity);
    const reason = String(raw.reason ?? '').trim();
    const followUpAction = raw.follow_up_action ?? raw.followUpAction;

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

  private normalizeSeverity(value: any): 'low' | 'medium' | 'high' {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'high') return 'high';
    if (normalized === 'medium' || normalized === 'mittel') return 'medium';
    return 'low';
  }
}

export const correctionDetector = new CorrectionDetector();
