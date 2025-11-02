import { v4 as uuidv4 } from 'uuid';
import { QdrantClient } from '@qdrant/js-client-rest';
import pool from '../../config/database';
import { ensureCorrectionsTable } from './ensureCorrectionsTable';
import { correctionDetector } from './correctionDetector';
import { CorrectionDetectionResult } from './types';
import { generateEmbedding, getCollectionName } from '../../services/embeddingProvider';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'willi_mako';
const COLLECTION_NAME = getCollectionName(BASE_COLLECTION);

interface MessageSnapshot {
  id: string;
  role: string;
  content: string;
  created_at: string | Date;
}

interface DetectAndStoreParams {
  chatId: string;
  userId: string;
  userMessage: { id: string; content: string };
  assistantMessage?: { id: string; content: string } | null;
  history: MessageSnapshot[];
}

interface ApprovalOptions {
  vectorText?: string;
  vectorTitle?: string;
  tags?: string[];
  notes?: string;
}

export class ChatCorrectionSuggestionService {
  private qdrantClient: QdrantClient | null = null;

  async detectAndStore(params: DetectAndStoreParams): Promise<{ id: string; detection: CorrectionDetectionResult } | null> {
    const { chatId, userId, userMessage, assistantMessage, history } = params;

    if (!assistantMessage || !assistantMessage.id) {
      return null;
    }

    await ensureCorrectionsTable();

    const conversation = history.map((msg) => ({
      role: (msg.role as 'user' | 'assistant' | 'system') || 'user',
      content: msg.content
    }));

    const detection = await correctionDetector.detect({ conversation });
    if (!detection) {
      return null;
    }

    const assistantIndex = history.findIndex((msg) => msg.id === assistantMessage.id);
    const originalQuestion = this.resolveOriginalQuestion(history, assistantIndex);

    const snapshot = history.slice(Math.max(0, history.length - 8));
    const id = uuidv4();

    await pool.query(
      `INSERT INTO chat_correction_suggestions (
        id, chat_id, user_id, assistant_message_id, user_message_id,
        original_question, assistant_response, corrected_information,
        correction_summary, correction_text, vector_title, vector_suggestion,
        confidence, severity, detection_reason, metadata, conversation_snapshot,
        tags
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18
      )`,
      [
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
      ]
    );

    return { id, detection };
  }

  async listSuggestions(status?: string): Promise<any[]> {
    await ensureCorrectionsTable();

    const result = await pool.query(
      `SELECT * FROM chat_correction_suggestions
       WHERE $1::text IS NULL OR status = $1
       ORDER BY created_at DESC
       LIMIT 200`,
      [status || null]
    );

    return result.rows;
  }

  async getSuggestion(id: string): Promise<any | null> {
    await ensureCorrectionsTable();
    const result = await pool.query(
      'SELECT * FROM chat_correction_suggestions WHERE id = $1 LIMIT 1',
      [id]
    );
    return result.rows[0] || null;
  }

  async approveSuggestion(id: string, adminUserId: string, options: ApprovalOptions = {}): Promise<any> {
    await ensureCorrectionsTable();
    const suggestion = await this.getSuggestion(id);
    if (!suggestion) {
      throw new Error('Korrekturvorschlag wurde nicht gefunden');
    }
    if (suggestion.status !== 'pending') {
      throw new Error('Korrekturvorschlag wurde bereits bearbeitet');
    }

    const detection = suggestion.metadata?.detection as CorrectionDetectionResult | undefined;
    const tags = Array.isArray(options.tags)
      ? options.tags
      : Array.isArray(suggestion.tags)
        ? suggestion.tags
        : Array.isArray(detection?.tags)
          ? detection?.tags
          : [];
    const sanitizedTags = (tags || [])
      .map((tag: unknown) => String(tag || '').trim())
      .filter((tag: string) => tag.length > 0);

    const vectorTitle = options.vectorTitle?.trim() || suggestion.vector_title || detection?.vectorTitle || 'Chat-Korrektur';
    const vectorText = options.vectorText?.trim() || suggestion.vector_suggestion || suggestion.correction_text;

    if (!vectorText || vectorText.length < 10) {
      throw new Error('Vector-Text ist zu kurz oder nicht vorhanden');
    }

    const pointId = suggestion.vector_point_id || uuidv4();
    const vectorPayload = {
      content_type: 'correction_feedback',
      title: vectorTitle,
      text: vectorText,
      corrected_information: suggestion.corrected_information || detection?.correctedInformation || null,
      correction_summary: suggestion.correction_summary || detection?.summary || null,
      severity: suggestion.severity || detection?.severity || 'low',
  tags: sanitizedTags,
      chat_id: suggestion.chat_id,
      assistant_message_id: suggestion.assistant_message_id,
      user_message_id: suggestion.user_message_id,
      source: 'chat_correction',
      created_at: new Date().toISOString()
    };

    await this.upsertVector(pointId, vectorText, vectorPayload);

    const update = await pool.query(
      `UPDATE chat_correction_suggestions
       SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(),
           review_notes = $3, vector_point_id = $4, vector_payload = $5::jsonb,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
  [id, adminUserId, options.notes || null, pointId, JSON.stringify({ ...vectorPayload, tags: sanitizedTags })]
    );

    return update.rows[0];
  }

  async rejectSuggestion(id: string, adminUserId: string, notes?: string): Promise<any> {
    await ensureCorrectionsTable();
    const suggestion = await this.getSuggestion(id);
    if (!suggestion) {
      throw new Error('Korrekturvorschlag wurde nicht gefunden');
    }
    if (suggestion.status !== 'pending') {
      throw new Error('Korrekturvorschlag wurde bereits bearbeitet');
    }

    const update = await pool.query(
      `UPDATE chat_correction_suggestions
       SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(),
           review_notes = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, adminUserId, notes || null]
    );

    return update.rows[0];
  }

  private resolveOriginalQuestion(history: MessageSnapshot[], assistantIndex: number): string | null {
    if (assistantIndex <= 0) {
      return null;
    }

    for (let i = assistantIndex - 1; i >= 0; i -= 1) {
      if (history[i]?.role === 'user') {
        return history[i].content;
      }
    }

    return null;
  }

  private async upsertVector(pointId: string, text: string, payload: Record<string, any>): Promise<void> {
    if (!this.qdrantClient) {
      this.qdrantClient = new QdrantClient({
        url: QDRANT_URL,
        apiKey: QDRANT_API_KEY,
        checkCompatibility: false
      });
    }

    const vector = await generateEmbedding(text);

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

export const chatCorrectionSuggestionService = new ChatCorrectionSuggestionService();
