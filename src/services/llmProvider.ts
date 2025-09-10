import geminiService from './gemini';
import { MistralService } from './mistral';

export type ContextMode = 'workspace-only' | 'standard' | 'system-only';

const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

function getLLMProvider(): 'gemini' | 'mistral' {
  return PROVIDER === 'mistral' ? 'mistral' : 'gemini';
}

const mistralService = new MistralService();

// Keep track of actual provider/model used on the last successful call (for accurate metadata)
let lastProviderUsed: 'gemini' | 'mistral' | null = null;
let lastModelUsed: string | null = null;

function shouldFallbackToGeminiOnMistralError(error: any): boolean {
  // Be safe: fall back on most common transient/quotas/network issues
  const msg = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  const is429 = msg.includes('429') || msg.includes('too many requests') || msg.includes('rate limit');
  const isCapacity = msg.includes('capacity') || msg.includes('service_tier_capacity_exceeded');
  const is5xx = /\b5\d{2}\b/.test(msg) || msg.includes('internal server error');
  const isNetwork = msg.includes('fetch') || msg.includes('network');
  // Default to true for mistral-specific errors we can't classify
  return is429 || isCapacity || is5xx || isNetwork || true;
}

async function callWithFallback<T>(methodName: keyof LLMInterface | string, args: any[]): Promise<T> {
  const active = getLLMProvider();
  // If Mistral is configured, try it first and fall back to Gemini when needed
  if (active === 'mistral') {
    try {
      const result = await (mistralService as any)[methodName](...args);
      lastProviderUsed = 'mistral';
      lastModelUsed = mistralService.getLastUsedModel();
      return result as T;
    } catch (err: any) {
      // Only log and fall back – never break the chat flow due to Mistral
      if (shouldFallbackToGeminiOnMistralError(err)) {
        console.warn(`Mistral error – falling back to Gemini for ${String(methodName)}:`, err?.message || err);
        const result = await (geminiService as any)[methodName](...args);
        lastProviderUsed = 'gemini';
        lastModelUsed = (geminiService as any).getLastUsedModel?.() ?? null;
        return result as T;
      }
      throw err;
    }
  }
  // Default provider is Gemini
  const result = await (geminiService as any)[methodName](...args);
  lastProviderUsed = 'gemini';
  lastModelUsed = (geminiService as any).getLastUsedModel?.() ?? null;
  return result as T;
}

// Define the interface of methods we support across providers
export interface LLMInterface {
  generateResponse(
    messages: { role: 'user' | 'assistant'; content: string; timestamp?: Date }[],
    context?: string,
    userPreferences?: any,
    isEnhancedQuery?: boolean,
    contextMode?: ContextMode
  ): Promise<string>;

  generateText(prompt: string, userPreferences?: any): Promise<string>;
  generateSearchQueries(query: string, userPreferences?: any): Promise<string[]>;
  synthesizeContext(query: string, searchResults: any[], userPreferences?: any): Promise<string>;
  synthesizeContextWithChunkTypes(query: string, searchResults: any[], userPreferences?: any): Promise<string>;
  generateResponseWithUserContext(
    messages: { role: 'user' | 'assistant'; content: string; timestamp?: Date }[],
    publicContext: string,
    userDocuments: string[],
    userNotes: string[],
    userPreferences?: any,
    contextMode?: ContextMode
  ): Promise<string>;
  generateChatTitle(userMessage: string, assistantResponse: string): Promise<string>;
  generateStructuredOutput(prompt: string, userPreferences?: any): Promise<any>;
  generateTagsForNote(content: string): Promise<string[]>;
  generateTagsForDocument(content: string, title: string): Promise<string[]>;
  generateMultipleChoiceQuestion(
    content: string,
    difficulty: 'easy' | 'medium' | 'hard',
    topicArea: string
  ): Promise<{ question: string; options: string[]; correctIndex: number; explanation: string }>;
  generateQuizQuestions(
    sourceContent: string[],
    questionCount: number,
    difficulty: 'easy' | 'medium' | 'hard',
    topicArea: string
  ): Promise<{ question: string; options: string[]; correctIndex: number; explanation: string }[]>;
  evaluateAnswerWithExplanation(
    question: string,
    userAnswer: string,
    correctAnswer: string
  ): Promise<{ isCorrect: boolean; explanation: string; improvementTips: string[] }>;
  generateHypotheticalAnswer(query: string): Promise<string>;

  // FAQ specific helpers
  generateFAQContent(messages: any[]): Promise<{
    title: string;
    description: string;
    context: string;
    answer: string;
    additionalInfo: string;
    tags: string[];
  }>;
  enhanceFAQWithContext(
    faqData: {
      title: string;
      description: string;
      context: string;
      answer: string;
      additionalInfo: string;
      tags: string[];
    },
    searchContext: string
  ): Promise<{
    title: string;
    description: string;
    context: string;
    answer: string;
    additionalInfo: string;
    tags: string[];
  }>;

  // Diagnostics
  getLastUsedModel(): string | null;
}

const llm: LLMInterface = {
  generateResponse: (...args) => callWithFallback('generateResponse', args as any[]),
  generateText: (...args) => callWithFallback('generateText', args as any[]),
  generateSearchQueries: (...args) => callWithFallback('generateSearchQueries', args as any[]),
  synthesizeContext: (...args) => callWithFallback('synthesizeContext', args as any[]),
  synthesizeContextWithChunkTypes: (...args) => callWithFallback('synthesizeContextWithChunkTypes', args as any[]),
  generateResponseWithUserContext: (...args) => callWithFallback('generateResponseWithUserContext', args as any[]),
  generateChatTitle: (...args) => callWithFallback('generateChatTitle', args as any[]),
  generateStructuredOutput: (...args) => callWithFallback('generateStructuredOutput', args as any[]),
  generateTagsForNote: (...args) => callWithFallback('generateTagsForNote', args as any[]),
  generateTagsForDocument: (...args) => callWithFallback('generateTagsForDocument', args as any[]),
  generateMultipleChoiceQuestion: (...args) => callWithFallback('generateMultipleChoiceQuestion', args as any[]),
  generateQuizQuestions: (...args) => callWithFallback('generateQuizQuestions', args as any[]),
  evaluateAnswerWithExplanation: (...args) => callWithFallback('evaluateAnswerWithExplanation', args as any[]),
  generateHypotheticalAnswer: (...args) => callWithFallback('generateHypotheticalAnswer', args as any[]),
  generateFAQContent: (...args) => callWithFallback('generateFAQContent', args as any[]),
  enhanceFAQWithContext: (...args) => callWithFallback('enhanceFAQWithContext', args as any[]),
  getLastUsedModel: () => lastModelUsed ?? (getLLMProvider() === 'mistral'
    ? mistralService.getLastUsedModel()
    : (geminiService as any).getLastUsedModel?.() ?? null),
};

export function getActiveLLMProvider(): 'gemini' | 'mistral' { return (lastProviderUsed || getLLMProvider()); }
export function getActiveLLMModel(): string | null { return lastModelUsed ?? llm.getLastUsedModel(); }
export function getActiveLLMInfo(): { provider: 'gemini' | 'mistral'; model: string | null } {
  return { provider: getActiveLLMProvider(), model: getActiveLLMModel() };
}

export default llm;
