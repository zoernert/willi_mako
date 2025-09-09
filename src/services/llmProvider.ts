import geminiService from './gemini';
import { MistralService } from './mistral';

export type ContextMode = 'workspace-only' | 'standard' | 'system-only';

const PROVIDER = (process.env.LLM_PROVIDER || 'gemini').toLowerCase();

function getLLMProvider(): 'gemini' | 'mistral' {
  return PROVIDER === 'mistral' ? 'mistral' : 'gemini';
}

const mistralService = new MistralService();

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

function selected(): LLMInterface {
  return getLLMProvider() === 'mistral' ? (mistralService as unknown as LLMInterface) : (geminiService as unknown as LLMInterface);
}

const llm: LLMInterface = {
  generateResponse: (...args) => selected().generateResponse(...args as Parameters<LLMInterface['generateResponse']>),
  generateText: (...args) => selected().generateText(...args as Parameters<LLMInterface['generateText']>),
  generateSearchQueries: (...args) => selected().generateSearchQueries(...args as Parameters<LLMInterface['generateSearchQueries']>),
  synthesizeContext: (...args) => selected().synthesizeContext(...args as Parameters<LLMInterface['synthesizeContext']>),
  synthesizeContextWithChunkTypes: (...args) => selected().synthesizeContextWithChunkTypes(...args as Parameters<LLMInterface['synthesizeContextWithChunkTypes']>),
  generateResponseWithUserContext: (...args) => selected().generateResponseWithUserContext(...args as Parameters<LLMInterface['generateResponseWithUserContext']>),
  generateChatTitle: (...args) => selected().generateChatTitle(...args as Parameters<LLMInterface['generateChatTitle']>),
  generateStructuredOutput: (...args) => selected().generateStructuredOutput(...args as Parameters<LLMInterface['generateStructuredOutput']>),
  generateTagsForNote: (...args) => selected().generateTagsForNote(...args as Parameters<LLMInterface['generateTagsForNote']>),
  generateTagsForDocument: (...args) => selected().generateTagsForDocument(...args as Parameters<LLMInterface['generateTagsForDocument']>),
  generateMultipleChoiceQuestion: (...args) => selected().generateMultipleChoiceQuestion(...args as Parameters<LLMInterface['generateMultipleChoiceQuestion']>),
  generateQuizQuestions: (...args) => selected().generateQuizQuestions(...args as Parameters<LLMInterface['generateQuizQuestions']>),
  evaluateAnswerWithExplanation: (...args) => selected().evaluateAnswerWithExplanation(...args as Parameters<LLMInterface['evaluateAnswerWithExplanation']>),
  generateHypotheticalAnswer: (...args) => selected().generateHypotheticalAnswer(...args as Parameters<LLMInterface['generateHypotheticalAnswer']>),
  generateFAQContent: (...args) => selected().generateFAQContent(...args as Parameters<LLMInterface['generateFAQContent']>),
  enhanceFAQWithContext: (...args) => selected().enhanceFAQWithContext(...args as Parameters<LLMInterface['enhanceFAQWithContext']>),
  getLastUsedModel: () => selected().getLastUsedModel(),
};

export function getActiveLLMProvider(): 'gemini' | 'mistral' { return getLLMProvider(); }
export function getActiveLLMModel(): string | null {
  return getLLMProvider() === 'mistral'
    ? mistralService.getLastUsedModel()
    : (geminiService as any).getLastUsedModel?.() ?? null;
}
export function getActiveLLMInfo(): { provider: 'gemini' | 'mistral'; model: string | null } {
  return { provider: getActiveLLMProvider(), model: getActiveLLMModel() };
}

export default llm;
