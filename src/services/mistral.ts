import dotenv from 'dotenv';
import MistralClient from '@mistralai/mistralai';
import fetch from 'node-fetch';
import { safeParseJsonResponse } from '../utils/aiResponseUtils';

dotenv.config();

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';
const CHAT_MODEL = process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest';

function ensureApiKey() {
  if (!MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY is missing');
}

export class MistralService {
  private client: any | null = null;

  constructor() {
    if (MISTRAL_API_KEY) {
      try {
        this.client = new (MistralClient as any)(MISTRAL_API_KEY);
      } catch {
        this.client = null;
      }
    }
  }

  /**
   * Return the model name used for the last/next request.
   */
  public getLastUsedModel(): string {
    return CHAT_MODEL;
  }

  private async chat(messages: { role: 'user' | 'assistant' | 'system'; content: string }[]): Promise<string> {
    ensureApiKey();

    // Try SDK
    try {
      if (this.client && typeof this.client.chat?.complete === 'function') {
        const res = await this.client.chat.complete({ model: CHAT_MODEL, messages });
        const text = res?.output?.[0]?.content || res?.choices?.[0]?.message?.content;
        if (typeof text === 'string') return text;
      }
    } catch (e) {
      // fall back to REST
    }

    // REST fallback
    const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model: CHAT_MODEL, messages })
    });
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Mistral chat HTTP ${resp.status}: ${txt}`);
    }
    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content;
    return typeof content === 'string' ? content : '';
  }

  async generateResponse(
    messages: { role: 'user' | 'assistant'; content: string }[],
    context: string = '',
    userPreferences: any = {},
    isEnhancedQuery: boolean = false,
    contextMode?: 'workspace-only' | 'standard' | 'system-only'
  ): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context, userPreferences, isEnhancedQuery, contextMode);
    const msgs = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    return (await this.chat(msgs)).trim();
  }

  async generateText(prompt: string): Promise<string> {
    const msgs = [{ role: 'user' as const, content: prompt }];
    return (await this.chat(msgs)).trim();
  }

  async generateSearchQueries(query: string): Promise<string[]> {
    const prompt = `Analysiere die folgende Benutzeranfrage und generiere 3-5 alternative, detaillierte Suchanfragen als JSON-Array von Strings. Antworte NUR mit dem JSON-Array.\n\nAnfrage: "${query}"`;
    const text = await this.generateText(prompt);
    try {
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
      const arr = JSON.parse(cleaned);
      if (Array.isArray(arr)) return arr.map((s: any) => String(s));
    } catch {}
    return [query];
  }

  async synthesizeContext(query: string, searchResults: any[]): Promise<string> {
    const documents = searchResults.map((r: any, i: number) => `Dokument ${i + 1}:\n${r.payload?.content || r.content || r.payload?.text || ''}`).join('\n\n---\n\n');
    const prompt = `Beantworte die Nutzeranfrage basierend auf den folgenden Dokumenten. Extrahiere alle relevanten technischen Details.\n\nFrage: ${query}\n\nDokumente:\n${documents}\n\nAntwort:`;
    return this.generateText(prompt);
  }

  async synthesizeContextWithChunkTypes(query: string, searchResults: any[]): Promise<string> {
    // Simplified version: reuse synthesizeContext
    return this.synthesizeContext(query, searchResults);
  }

  async generateResponseWithUserContext(
    messages: { role: 'user' | 'assistant'; content: string }[],
    publicContext: string,
    userDocuments: string[],
    userNotes: string[],
    userPreferences: any = {},
    contextMode?: 'workspace-only' | 'standard' | 'system-only'
  ): Promise<string> {
    let enhancedContext = publicContext || '';
    if (userDocuments?.length) enhancedContext += `\n\n=== PERSÖNLICHE DOKUMENTE ===\n${userDocuments.join('\n\n')}`;
    if (userNotes?.length) enhancedContext += `\n\n=== PERSÖNLICHE NOTIZEN ===\n${userNotes.join('\n\n')}`;
    return this.generateResponse(messages, enhancedContext, userPreferences, true, contextMode);
  }

  async generateChatTitle(userMessage: string, assistantResponse: string): Promise<string> {
    const prompt = `Erstelle einen kurzen Titel (max 6 Wörter) basierend auf:\nNutzer: ${userMessage}\nAssistent: ${assistantResponse}\nNur den Titel ausgeben.`;
    return (await this.generateText(prompt)).trim();
  }

  async generateStructuredOutput(prompt: string, _userPreferences: any = {}): Promise<any> {
    const text = await this.generateText(prompt);
    return safeParseJsonResponse(text) || { needsMoreContext: false, answerable: true, confidence: 0.5 };
  }

  async generateTagsForNote(content: string): Promise<string[]> {
    const prompt = `Analysiere den Text und gib 3-5 Tags, durch Komma getrennt.\n\n${content}`;
    const text = await this.generateText(prompt);
    return text.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
  }

  async generateTagsForDocument(content: string, title: string): Promise<string[]> {
    const prompt = `Analysiere Titel und Inhalt und gib 3-5 Tags, durch Komma getrennt.\n\nTitel: ${title}\nInhalt: ${content.substring(0, 2000)}...`;
    const text = await this.generateText(prompt);
    return text.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5);
  }

  async generateMultipleChoiceQuestion(
    content: string,
    difficulty: 'easy' | 'medium' | 'hard',
    topicArea: string
  ): Promise<{ question: string; options: string[]; correctIndex: number; explanation: string }> {
    const difficultyInstructions = {
      easy: 'Erstelle eine einfache Frage mit offensichtlichen Antworten',
      medium: 'Erstelle eine mittelschwere Frage mit plausiblen Distraktoren',
      hard: 'Erstelle eine schwere Frage mit sehr ähnlichen Antworten'
    } as const;

    const prompt = `Basierend auf folgendem Inhalt, erstelle eine Multiple-Choice-Frage zum Thema "${topicArea}". Schwierigkeit: ${difficulty}. ${difficultyInstructions[difficulty]}\n\n${content}\n\nAntworte nur als JSON ohne Markdown mit Feldern question, options, correctIndex, explanation.`;
    const text = await this.generateText(prompt);
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = safeParseJsonResponse(cleaned) || {};
    return {
      question: parsed.question || 'Frage',
      options: Array.isArray(parsed.options) ? parsed.options : ['A', 'B', 'C', 'D'],
      correctIndex: Number.isInteger(parsed.correctIndex) ? parsed.correctIndex : 0,
      explanation: parsed.explanation || ''
    };
  }

  async generateQuizQuestions(sourceContent: string[], questionCount: number, difficulty: 'easy' | 'medium' | 'hard', topicArea: string) {
    const out: any[] = [];
    for (let i = 0; i < Math.min(questionCount, sourceContent.length); i++) {
      try {
        out.push(await this.generateMultipleChoiceQuestion(sourceContent[i], difficulty, topicArea));
      } catch (e) {
        // skip
      }
    }
    return out;
  }

  async evaluateAnswerWithExplanation(question: string, userAnswer: string, correctAnswer: string) {
    const prompt = `Bewerte folgende Antwort:\n\nFrage: ${question}\nAntwort: ${userAnswer}\nKorrekte Antwort: ${correctAnswer}\n\nGib JSON mit isCorrect, explanation, improvementTips[].`;
    const text = await this.generateText(prompt);
    const parsed = safeParseJsonResponse(text) || {};
    return {
      isCorrect: !!parsed.isCorrect,
      explanation: parsed.explanation || '',
      improvementTips: Array.isArray(parsed.improvementTips) ? parsed.improvementTips : []
    };
  }

  async generateHypotheticalAnswer(query: string): Promise<string> {
    const prompt = `Beantworte kurz und prägnant basierend auf allgemeinem Wissen. Nur die Antwort.\n\nFrage: ${query}`;
    const text = await this.generateText(prompt);
    return text.trim() || query;
  }

  // FAQ helpers for parity with GeminiService usage
  async generateFAQContent(messages: any[]): Promise<{
    title: string;
    description: string;
    context: string;
    answer: string;
    additionalInfo: string;
    tags: string[];
  }> {
    const conversationText = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
    const prompt = `Erzeuge einen strukturierten FAQ-Eintrag (JSON) basierend auf folgendem Chat:\n\n${conversationText}\n\nFelder: title, description, context, answer, additionalInfo, tags[].`;
    const text = await this.generateText(prompt);
    const parsed = safeParseJsonResponse(text) || {};
    return {
      title: parsed.title || 'FAQ',
      description: parsed.description || 'Beschreibung',
      context: parsed.context || 'Kontext',
      answer: parsed.answer || 'Antwort',
      additionalInfo: parsed.additionalInfo || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : ['Energiewirtschaft']
    };
  }

  async enhanceFAQWithContext(
    faqData: { title: string; description: string; context: string; answer: string; additionalInfo: string; tags: string[] },
    searchContext: string
  ): Promise<{ title: string; description: string; context: string; answer: string; additionalInfo: string; tags: string[] }> {
    const prompt = `Verbessere diesen FAQ-Inhalt mithilfe des zusätzlichen Kontextes. Antworte als JSON mit denselben Feldern.\n\nFAQ: ${JSON.stringify(faqData)}\n\nKontext:\n${searchContext}`;
    const text = await this.generateText(prompt);
    const parsed = safeParseJsonResponse(text) || {};
    return {
      title: parsed.title || faqData.title,
      description: parsed.description || faqData.description,
      context: parsed.context || faqData.context,
      answer: parsed.answer || faqData.answer,
      additionalInfo: parsed.additionalInfo || faqData.additionalInfo,
      tags: Array.isArray(parsed.tags) && parsed.tags.length ? parsed.tags : faqData.tags
    };
  }

  private buildSystemPrompt(context: string, userPreferences: any, isEnhancedQuery: boolean, contextMode?: 'workspace-only' | 'standard' | 'system-only') {
    const mode = contextMode || 'standard';
    const prefs = userPreferences || {};
    const systemParts = [
      'Du bist ein hilfreicher Assistent für Marktkommunikation in der Energiewirtschaft. Antworte auf Deutsch.',
      `Kontextmodus: ${mode}`,
    ];
    if (context) systemParts.push('Kontext:\n' + context);
    if (prefs.preferred_topics) systemParts.push('Bevorzugte Themen: ' + JSON.stringify(prefs.preferred_topics));
    return systemParts.join('\n\n');
  }
}

export default new MistralService();
