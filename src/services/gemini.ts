import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import dotenv from 'dotenv';
import pool from '../config/database';
import { PostgresCodeLookupRepository } from '../modules/codelookup/repositories/postgres-codelookup.repository';
import { CodeLookupService } from '../modules/codelookup/services/codelookup.service';
import { safeParseJsonResponse } from '../utils/aiResponseUtils';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
}

export class GeminiService {
  private model;
  private codeLookupService: CodeLookupService;

  constructor() {
    this.model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash-exp',
      tools: [
        {
          functionDeclarations: [
            {
              name: 'lookup_energy_code',
              description: 'Sucht nach deutschen BDEW- oder EIC-Energiewirtschaftscodes. Nützlich, um herauszufinden, welches Unternehmen zu einem bestimmten Code gehört.',
              parameters: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                  code: {
                    type: FunctionDeclarationSchemaType.STRING,
                    description: 'Der BDEW- oder EIC-Code, nach dem gesucht werden soll.'
                  }
                },
                required: ['code']
              }
            }
          ]
        }
      ]
    });
    
    // Initialize code lookup service
    const codeLookupRepository = new PostgresCodeLookupRepository(pool);
    this.codeLookupService = new CodeLookupService(codeLookupRepository);
  }

  async generateResponse(
    messages: ChatMessage[],
    context: string = '',
    userPreferences: any = {},
    isEnhancedQuery: boolean = false,
    contextMode?: 'workspace-only' | 'standard' | 'system-only'
  ): Promise<string> {
    try {
      // Prepare system prompt with context
      const systemPrompt = this.buildSystemPrompt(context, userPreferences, isEnhancedQuery, contextMode);
      
      // Format conversation history for function calling
      const conversationHistory = messages.map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.content }]
      }));

      // Add system prompt as first message
      const messagesWithSystem = [
        { role: 'user' as const, parts: [{ text: systemPrompt }] },
        ...conversationHistory
      ];

      const chat = this.model.startChat({
        history: messagesWithSystem
      });

      const result = await chat.sendMessage(messages[messages.length - 1].content);
      const response = result.response;

      // Handle function calls
      const functionCalls = response.functionCalls();
      if (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0]; // Get the first function call
        const functionResponse = await this.handleFunctionCall(functionCall);
        
        // Send function response back to the model
        const followUpResult = await chat.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: functionResponse
            }
          }
        ]);
        
        return followUpResult.response.text();
      }
      
      return response.text();
    } catch (error) {
      console.error('Error generating response:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
      }
      throw new Error('Failed to generate response from Gemini');
    }
  }

  private async handleFunctionCall(functionCall: any): Promise<any> {
    const { name, args } = functionCall;
    
    switch (name) {
      case 'lookup_energy_code':
        const code = args.code;
        const result = await this.codeLookupService.lookupSingleCode(code);
        
        if (result) {
          return {
            found: true,
            code: result.code,
            companyName: result.companyName,
            codeType: result.codeType,
            source: result.source,
            validFrom: result.validFrom,
            validTo: result.validTo
          };
        } else {
          return {
            found: false,
            code: code,
            message: 'Kein Unternehmen für diesen Code gefunden.'
          };
        }
      
      default:
        return { error: `Unbekannte Funktion: ${name}` };
    }
  }

  private buildSystemPrompt(
    context: string, 
    userPreferences: any, 
    isEnhancedQuery: boolean = false,
    contextMode?: 'workspace-only' | 'standard' | 'system-only'
  ): string {
    let basePrompt = '';

    // Different prompts based on context mode
    if (contextMode === 'workspace-only') {
      basePrompt = `Du bist Mako Willi, ein AI-Assistent für die Analyse persönlicher Dokumente. Du hilfst dabei, spezifische Informationen aus den bereitgestellten Dokumenten zu extrahieren und zu analysieren.

WICHTIG: Du arbeitest ausschließlich mit den bereitgestellten Dokumenteninhalten. Wenn die Information nicht in den Dokumenten zu finden ist, sage dies explizit.

Deine Aufgaben:
- Extrahiere präzise Informationen aus den bereitgestellten Dokumenten
- Beantworte Fragen basierend ausschließlich auf dem verfügbaren Dokumenteninhalt
- Zitiere relevante Stellen aus den Dokumenten
- Wenn Informationen fehlen, erkläre was in den Dokumenten nicht verfügbar ist

Antworte direkt und konkret basierend auf den verfügbaren Dokumenteninhalten.`;
    } else if (contextMode === 'system-only') {
      basePrompt = `Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig. Du nutzt ausschließlich dein allgemeines Wissen über:

- Energiemarkt und Marktkommunikation
- Regulatorische Anforderungen
- Geschäftsprozesse in der Energiewirtschaft
- Technische Standards und Normen
- Branchenspezifische Herausforderungen

Deine Antworten basieren auf allgemeinem Fachwissen und aktuellen Standards der Energiewirtschaft.`;
    } else {
      // Standard mode
      basePrompt = `Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig. Du hilfst Nutzern bei Fragen rund um:

- Energiemarkt und Marktkommunikation
- Regulatorische Anforderungen
- Geschäftsprozesse in der Energiewirtschaft
- Technische Standards und Normen
- Branchenspezifische Herausforderungen

Deine Antworten sollen:
- Präzise und fachlich korrekt sein
- Praxisnah und umsetzbar sein
- Aktuelle Marktentwicklungen berücksichtigen
- Freundlich und professionell formuliert sein`;
    }

    let enhancedPrompt = basePrompt;

    // Add special instruction for enhanced queries
    if (isEnhancedQuery) {
      enhancedPrompt += `\n\nWICHTIG: Die Benutzerfrage wurde bereits durch Präzisierungsfragen erweitert. Gib eine detaillierte, finale Antwort basierend auf den bereitgestellten Kontexten. Stelle KEINE weiteren Rückfragen.`;
    }

    // Add context if available
    if (context && context.trim()) {
      if (contextMode === 'workspace-only') {
        enhancedPrompt += `\n\nVERFÜGBARE DOKUMENTE UND INHALTE:\n${context}`;
        enhancedPrompt += `\n\nBeantworte die Frage ausschließlich basierend auf den oben bereitgestellten Dokumenteninhalten. Wenn die gesuchte Information nicht verfügbar ist, sage dies explizit.`;
      } else {
        enhancedPrompt += `\n\nRelevanter Kontext aus der Wissensdatenbank:\n${context}`;
      }
    } else if (contextMode === 'workspace-only') {
      enhancedPrompt += `\n\nKEINE DOKUMENTE VERFÜGBAR: Es sind keine relevanten Dokumente in Ihrem Workspace verfügbar, die diese Frage beantworten könnten.`;
    }

    // Add user preferences if available
    if (userPreferences.companiesOfInterest && userPreferences.companiesOfInterest.length > 0) {
      enhancedPrompt += `\n\nUnternehmen von Interesse für den Nutzer: ${userPreferences.companiesOfInterest.join(', ')}`;
    }

    if (userPreferences.preferredTopics && userPreferences.preferredTopics.length > 0) {
      enhancedPrompt += `\n\nBevorzugte Themen: ${userPreferences.preferredTopics.join(', ')}`;
    }

    if (contextMode === 'workspace-only') {
      enhancedPrompt += `\n\nAntworte präzise und direkt basierend auf den verfügbaren Dokumenteninhalten.`;
    } else {
      enhancedPrompt += `\n\nAntworte immer hilfreich und fokussiert auf die Energiewirtschaft.`;
    }

    return enhancedPrompt;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use Google's embedding model
      const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
      
      const result = await embeddingModel.embedContent(text);
      
      if (result.embedding && result.embedding.values) {
        return result.embedding.values;
      } else {
        throw new Error('No embedding returned from API');
      }
    } catch (error) {
      console.error('Error generating embedding:', error);
      // Fallback to hash-based embedding if API fails
      return this.textToVector(text);
    }
  }

  private async textToVector(text: string): Promise<number[]> {
    // Simple hash-based embedding (replace with proper embedding service)
    const vector = new Array(1536).fill(0);
    
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      vector[i % 1536] = (vector[i % 1536] + char) % 1000;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  async summarizeText(text: string, maxLength: number = 500): Promise<string> {
    try {
      const prompt = `Fasse folgenden Text in maximal ${maxLength} Zeichen zusammen, fokussiere dich auf die wichtigsten Punkte der Energiewirtschaft:

${text}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return response.text();
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw new Error('Failed to summarize text');
    }
  }

  async extractKeywords(text: string): Promise<string[]> {
    try {
      const prompt = `Extrahiere die wichtigsten Schlagwörter aus folgendem Text, fokussiert auf Energiewirtschaft und Marktkommunikation. Gib die Schlagwörter als kommagetrennte Liste zurück:

${text}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return response.text()
        .split(',')
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0);
    } catch (error) {
      console.error('Error extracting keywords:', error);
      throw new Error('Failed to extract keywords');
    }
  }

  async generateChatTitle(userMessage: string, assistantResponse: string): Promise<string> {
    try {
      const prompt = `Basierend auf dieser Konversation, erstelle einen kurzen, prägnanten Titel (maximal 6 Wörter) auf Deutsch, der das Hauptthema oder die Kernfrage beschreibt:

Nutzer: ${userMessage}
Mako Willi: ${assistantResponse}

Antworte nur mit dem Titel, ohne weitere Erklärungen oder Anführungszeichen.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      return response.text().trim();
    } catch (error) {
      console.error('Error generating chat title:', error);
      // Fallback to a generic title based on the user message
      return this.generateFallbackTitle(userMessage);
    }
  }

  private generateFallbackTitle(userMessage: string): string {
    // Extract first few words from user message as fallback
    const words = userMessage.split(' ').slice(0, 4);
    return words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
  }

  async generateFAQContent(messages: any[]): Promise<{
    title: string;
    description: string;
    context: string;
    answer: string;
    additionalInfo: string;
    tags: string[];
  }> {
    try {
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      const prompt = `Basierend auf dem folgenden Chat-Verlauf, erstelle einen strukturierten FAQ-Eintrag für die Energiewirtschaft:

Chat-Verlauf:
${conversationText}

Erstelle eine strukturierte Antwort als JSON mit folgenden Feldern:

1. "title": Ein prägnanter Titel für den FAQ-Eintrag (max. 60 Zeichen)
2. "description": Eine kurze Beschreibung der Frage/des Themas (1-2 Sätze)
3. "context": Erkläre den Zusammenhang und Hintergrund der Frage (2-3 Sätze)
4. "answer": Eine präzise, fachliche Antwort auf die Frage (1-2 Absätze)
5. "additionalInfo": Ergänzende Details oder weiterführende Hinweise (1-2 Absätze)
6. "tags": Array mit 3-5 relevanten Tags/Schlagwörtern (z.B. ["Energiemarkt", "Regulierung", "Marktkommunikation", "Geschäftsprozesse", "Technische Standards"])

Die Tags sollen die Hauptthemen der Frage widerspiegeln und für die Kategorisierung verwendet werden.

Antwort ausschließlich im JSON-Format:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      try {
        let responseText = response.text().trim();
        
        // Remove markdown code blocks if present
        if (responseText.startsWith('```json') && responseText.endsWith('```')) {
          responseText = responseText.slice(7, -3).trim();
        } else if (responseText.startsWith('```') && responseText.endsWith('```')) {
          const firstNewline = responseText.indexOf('\n');
          const lastNewline = responseText.lastIndexOf('\n');
          if (firstNewline > 0 && lastNewline > firstNewline) {
            responseText = responseText.slice(firstNewline + 1, lastNewline).trim();
          }
        }
        
        const parsedResponse = JSON.parse(responseText);
        return {
          title: (parsedResponse.title && parsedResponse.title.trim()) || 'Energiewirtschafts-FAQ',
          description: (parsedResponse.description && parsedResponse.description.trim()) || 'Frage zur Energiewirtschaft',
          context: (parsedResponse.context && parsedResponse.context.trim()) || 'Kontext zur Energiewirtschaft',
          answer: (parsedResponse.answer && parsedResponse.answer.trim()) || 'Antwort zur Energiewirtschaft',
          additionalInfo: (parsedResponse.additionalInfo && parsedResponse.additionalInfo.trim()) || 'Weitere Informationen können bei Bedarf ergänzt werden.',
          tags: Array.isArray(parsedResponse.tags) && parsedResponse.tags.length > 0 ? parsedResponse.tags : ['Energiewirtschaft']
        };
      } catch (parseError) {
        console.error('JSON parsing failed, using fallback:', parseError);
        // Fallback if JSON parsing fails
        const fallbackAnswer = response.text().trim() || 'Antwort zur Energiewirtschaft';
        return {
          title: 'Energiewirtschafts-FAQ',
          description: 'Frage zur Energiewirtschaft',
          context: 'Kontext zur Energiewirtschaft',
          answer: fallbackAnswer,
          additionalInfo: 'Weitere Informationen können bei Bedarf ergänzt werden.',
          tags: ['Energiewirtschaft']
        };
      }
    } catch (error) {
      console.error('Error generating FAQ content:', error);
      throw new Error('Failed to generate FAQ content');
    }
  }

  async enhanceFAQWithContext(faqData: {
    title: string;
    description: string;
    context: string;
    answer: string;
    additionalInfo: string;
    tags: string[];
  }, searchContext: string): Promise<{
    title: string;
    description: string;
    context: string;
    answer: string;
    additionalInfo: string;
    tags: string[];
  }> {
    try {
      const prompt = `Du bist ein Experte für Energiewirtschaft und Marktkommunikation. 

Basierend auf den folgenden Informationen, erstelle einen ausführlichen, gut verständlichen FAQ-Eintrag:

URSPRÜNGLICHE FAQ-DATEN:
- Titel: ${faqData.title}
- Beschreibung: ${faqData.description}
- Kontext: ${faqData.context}
- Antwort: ${faqData.answer}
- Zusätzliche Informationen: ${faqData.additionalInfo}
- Tags: ${faqData.tags.join(', ')}

ZUSÄTZLICHER KONTEXT AUS DER WISSENSDATENBANK:
${searchContext}

AUFGABE:
Erstelle einen umfassenden, professionellen FAQ-Eintrag, der:
1. Fachlich korrekt und präzise ist
2. Für Fachkräfte in der Energiewirtschaft verständlich ist
3. Praktische Beispiele und Anwendungsfälle enthält
4. Relevante Gesetze, Verordnungen oder Standards erwähnt
5. Gut strukturiert und lesbar ist

Verwende die ursprünglichen Daten als Grundlage, aber erweitere und verbessere sie mit dem zusätzlichen Kontext aus der Wissensdatenbank.

Gib die Antwort als JSON zurück mit folgenden Feldern:
- "title": Verbesserter, prägnanter Titel
- "description": Kurze, klare Beschreibung (1-2 Sätze)
- "context": Ausführlicher Kontext und Hintergrundinformationen (2-3 Absätze)
- "answer": Detaillierte, fachliche Antwort mit Beispielen (3-4 Absätze)
- "additionalInfo": Weiterführende Informationen, Gesetze, Standards, Best Practices (2-3 Absätze)
- "tags": Relevante Tags für die Kategorisierung (3-6 Tags)

Antwort nur als JSON ohne Markdown-Formatierung:`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      try {
        let responseText = response.text().trim();
        
        // Remove markdown code blocks if present
        if (responseText.startsWith('```json') && responseText.endsWith('```')) {
          responseText = responseText.slice(7, -3).trim();
        } else if (responseText.startsWith('```') && responseText.endsWith('```')) {
          const firstNewline = responseText.indexOf('\n');
          const lastNewline = responseText.lastIndexOf('\n');
          if (firstNewline > 0 && lastNewline > firstNewline) {
            responseText = responseText.slice(firstNewline + 1, lastNewline).trim();
          }
        }
        
        const parsedResponse = JSON.parse(responseText);
        return {
          title: (parsedResponse.title && parsedResponse.title.trim()) || faqData.title,
          description: (parsedResponse.description && parsedResponse.description.trim()) || faqData.description,
          context: (parsedResponse.context && parsedResponse.context.trim()) || faqData.context,
          answer: (parsedResponse.answer && parsedResponse.answer.trim()) || faqData.answer,
          additionalInfo: (parsedResponse.additionalInfo && parsedResponse.additionalInfo.trim()) || faqData.additionalInfo,
          tags: Array.isArray(parsedResponse.tags) && parsedResponse.tags.length > 0 ? parsedResponse.tags : faqData.tags
        };
      } catch (parseError) {
        console.error('JSON parsing failed in enhanceFAQWithContext, using original data:', parseError);
        return faqData;
      }
    } catch (error) {
      console.error('Error enhancing FAQ with context:', error);
      return faqData;
    }
  }

  async generateMultipleChoiceQuestion(
    content: string,
    difficulty: 'easy' | 'medium' | 'hard',
    topicArea: string
  ): Promise<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }> {
    const difficultyInstructions = {
      easy: 'Erstelle eine einfache Frage mit offensichtlichen Antworten',
      medium: 'Erstelle eine mittelschwere Frage mit plausiblen Distraktoren',
      hard: 'Erstelle eine schwere Frage mit sehr ähnlichen Antworten'
    };

    const prompt = `Basierend auf folgendem Inhalt, erstelle eine Multiple-Choice-Frage zum Thema "${topicArea}":

${content}

Schwierigkeit: ${difficulty}
${difficultyInstructions[difficulty]}

Erstelle eine Frage mit 4 Antwortoptionen. Eine davon muss korrekt sein, die anderen 3 sollen plausible aber falsche Antworten sein.

Antworte nur als JSON ohne Markdown-Formatierung:
{
  "question": "Die Frage",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Erklärung warum die Antwort korrekt ist"
}`;

    try {
      const result = await this.generateWithRetry(prompt);
      const response = await result.response;
      
      let responseText = response.text().trim();
      
      // Remove markdown code blocks if present
      if (responseText.startsWith('```json') && responseText.endsWith('```')) {
        responseText = responseText.slice(7, -3).trim();
      } else if (responseText.startsWith('```') && responseText.endsWith('```')) {
        const firstNewline = responseText.indexOf('\n');
        const lastNewline = responseText.lastIndexOf('\n');
        if (firstNewline > 0 && lastNewline > firstNewline) {
          responseText = responseText.slice(firstNewline + 1, lastNewline).trim();
        }
      }
      
      const parsedResponse = JSON.parse(responseText);
      
      return {
        question: parsedResponse.question,
        options: parsedResponse.options,
        correctIndex: parsedResponse.correctIndex,
        explanation: parsedResponse.explanation
      };
    } catch (error) {
      console.error('Error generating multiple choice question:', error);
      throw new Error('Failed to generate quiz question');
    }
  }

  async generateQuizQuestions(
    sourceContent: string[],
    questionCount: number,
    difficulty: 'easy' | 'medium' | 'hard',
    topicArea: string
  ): Promise<{
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[]> {
    const questions = [];
    
    for (let i = 0; i < Math.min(questionCount, sourceContent.length); i++) {
      try {
        const question = await this.generateMultipleChoiceQuestion(
          sourceContent[i],
          difficulty,
          topicArea
        );
        questions.push(question);
      } catch (error) {
        console.error(`Error generating question ${i + 1}:`, error);
      }
    }
    
    return questions;
  }

  async evaluateAnswerWithExplanation(
    question: string,
    userAnswer: string,
    correctAnswer: string
  ): Promise<{
    isCorrect: boolean;
    explanation: string;
    improvementTips: string[];
  }> {
    const prompt = `Bewerte folgende Antwort auf eine Quiz-Frage:

Frage: ${question}
Benutzerantwort: ${userAnswer}
Korrekte Antwort: ${correctAnswer}

Erkläre warum die Antwort richtig oder falsch ist und gib Verbesserungstipps.

Antworte nur als JSON ohne Markdown-Formatierung:
{
  "isCorrect": true/false,
  "explanation": "Detaillierte Erklärung",
  "improvementTips": ["Tipp 1", "Tipp 2", "Tipp 3"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      
      let responseText = response.text().trim();
      
      // Remove markdown code blocks if present
      if (responseText.startsWith('```json') && responseText.endsWith('```')) {
        responseText = responseText.slice(7, -3).trim();
      } else if (responseText.startsWith('```') && responseText.endsWith('```')) {
        const firstNewline = responseText.indexOf('\n');
        const lastNewline = responseText.lastIndexOf('\n');
        if (firstNewline > 0 && lastNewline > firstNewline) {
          responseText = responseText.slice(firstNewline + 1, lastNewline).trim();
        }
      }
      
      const parsedResponse = JSON.parse(responseText);
      
      return {
        isCorrect: parsedResponse.isCorrect,
        explanation: parsedResponse.explanation,
        improvementTips: parsedResponse.improvementTips || []
      };
    } catch (error) {
      console.error('Error evaluating answer:', error);
      return {
        isCorrect: false,
        explanation: 'Fehler bei der Bewertung',
        improvementTips: []
      };
    }
  }

  async generateText(prompt: string): Promise<string> {
    try {
      const result = await this.generateWithRetry(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating text:', error);
      throw new Error('Failed to generate text from Gemini');
    }
  }

  private async generateWithRetry(prompt: string, maxRetries: number = 3): Promise<any> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.model.generateContent(prompt);
      } catch (error: any) {
        if (error.status === 429 && attempt < maxRetries) {
          // Rate limit exceeded, wait and retry
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`Rate limit exceeded. Waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
          await this.sleep(delay);
          continue;
        }
        throw error;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate tags for note content using AI
   */
  async generateTagsForNote(content: string): Promise<string[]> {
    try {
      const prompt = `Analysiere den folgenden Text und erstelle 3-5 relevante Tags (Schlagwörter) auf Deutsch. 
      Die Tags sollen kurz und prägnant sein und den Inhalt gut beschreiben.
      
      Text: ${content}
      
      Antworte nur mit den Tags, getrennt durch Kommas. Beispiel: Energie, Marktkommunikation, Stromhandel`;
      
      const result = await this.generateWithRetry(prompt);
      const response = await result.response;
      const tagsText = response.text().trim();
      
      // Parse and clean tags
      const tags = tagsText
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0 && tag.length <= 30)
        .slice(0, 5); // Limit to 5 tags
      
      return tags;
      
    } catch (error) {
      console.error('Error generating tags for note:', error);
      return [];
    }
  }

  /**
   * Generate tags for document content using AI
   */
  async generateTagsForDocument(content: string, title: string): Promise<string[]> {
    try {
      const prompt = `Analysiere das folgende Dokument und erstelle 3-5 relevante Tags (Schlagwörter) auf Deutsch.
      Die Tags sollen den Inhalt und das Thema des Dokuments gut beschreiben.
      
      Titel: ${title}
      Inhalt: ${content.substring(0, 2000)}...
      
      Antworte nur mit den Tags, getrennt durch Kommas. Beispiel: Energie, Marktkommunikation, Stromhandel`;
      
      const result = await this.generateWithRetry(prompt);
      const response = await result.response;
      const tagsText = response.text().trim();
      
      // Parse and clean tags
      const tags = tagsText
        .split(',')
        .map((tag: string) => tag.trim())
        .filter((tag: string) => tag.length > 0 && tag.length <= 30)
        .slice(0, 5); // Limit to 5 tags
      
      return tags;
      
    } catch (error) {
      console.error('Error generating tags for document:', error);
      return [];
    }
  }

  /**
   * Generate response with user context (documents and notes)
   */
  async generateResponseWithUserContext(
    messages: ChatMessage[],
    publicContext: string,
    userDocuments: string[],
    userNotes: string[],
    userPreferences: any = {},
    contextMode?: 'workspace-only' | 'standard' | 'system-only'
  ): Promise<string> {
    try {
      // Build enhanced context differently based on context mode
      let enhancedContext = '';
      
      if (contextMode === 'workspace-only') {
        // In workspace-only mode, ignore public context and focus on user documents
        if (userDocuments.length > 0) {
          enhancedContext += '=== PERSÖNLICHE DOKUMENTE ===\n';
          enhancedContext += userDocuments.join('\n\n');
        }
        
        if (userNotes.length > 0) {
          enhancedContext += '\n\n=== PERSÖNLICHE NOTIZEN ===\n';
          enhancedContext += userNotes.join('\n\n');
        }
      } else {
        // Standard mode: include public context and user content
        enhancedContext = publicContext;
        
        if (userDocuments.length > 0) {
          enhancedContext += '\n\n=== PERSÖNLICHE DOKUMENTE ===\n';
          enhancedContext += userDocuments.join('\n\n');
        }
        
        if (userNotes.length > 0) {
          enhancedContext += '\n\n=== PERSÖNLICHE NOTIZEN ===\n';
          enhancedContext += userNotes.join('\n\n');
        }
      }
      
      return await this.generateResponse(messages, enhancedContext, userPreferences, true, contextMode);
      
    } catch (error) {
      console.error('Error generating response with user context:', error);
      throw new Error('Failed to generate response with user context');
    }
  }

  /**
   * Suggest related content based on query
   */
  async suggestRelatedContent(userId: string, query: string): Promise<any[]> {
    try {
      const prompt = `Basierend auf der folgenden Anfrage, schlage verwandte Themen und Suchbegriffe vor:
      
      Anfrage: ${query}
      
      WICHTIG: Antworte nur mit einem gültigen JSON-Array, keine Markdown-Formatierung oder Code-Blöcke.
      
      ["Begriff1", "Begriff2", "Begriff3"]
      
      Beispiel: ["Energiehandel", "Marktkommunikation", "Strompreise"]`;
      
      const result = await this.generateWithRetry(prompt);
      const response = await result.response;
      const suggestionsText = response.text().trim();
      
      // Try to parse JSON
      const suggestions = safeParseJsonResponse(suggestionsText);
      if (suggestions && Array.isArray(suggestions)) {
        return suggestions;
      } else {
        // If JSON parsing fails, try to extract suggestions from text
        const lines = suggestionsText.split('\n');
        return lines
          .filter((line: string) => line.trim().length > 0)
          .map((line: string) => line.replace(/^[-*]\s*/, '').trim())
          .slice(0, 10);
      }
      
    } catch (error) {
      console.error('Error suggesting related content:', error);
      return [];
    }
  }

  /**
   * Generate embedding for text (for vector search)
   */

  async generateSearchQueries(query: string): Promise<string[]> {
    try {
      const prompt = `Du bist ein Experte für die deutsche Energiewirtschaft. Analysiere die folgende Benutzeranfrage und generiere 3-5 alternative, detaillierte Suchanfragen, die helfen würden, umfassenden Kontext aus einer Wissensdatenbank zu sammeln. Decke dabei verschiedene Aspekte und mögliche Intentionen der ursprünglichen Anfrage ab.

Benutzeranfrage: "${query}"

Gib die Suchanfragen als JSON-Array von Strings zurück. Antworte nur mit dem JSON-Array.
Beispiel: ["Details zur Marktkommunikation 2024", "Anforderungen an Messstellenbetreiber", "Prozesse der Netznutzungsabrechnung"]`;

      const result = await this.generateWithRetry(prompt);
      const response = await result.response;
      let text = response.text().trim();

      // Clean the response to ensure it's valid JSON
      if (text.startsWith('```json')) {
        text = text.substring(7, text.length - 3).trim();
      }

      let queries: string[];
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
          queries = parsed;
        } else {
          console.error('AI response for search queries was not a string array:', parsed);
          queries = [];
        }
      } catch (e) {
        console.error('Failed to parse search queries from AI response:', text, e);
        queries = [];
      }

      // Add the original query to the list to ensure it's also searched
      queries.unshift(query);
      return [...new Set(queries)]; // Return unique queries
    } catch (error) {
      console.error('Error generating search queries:', error);
      // Fallback to the original query
      return [query];
    }
  }

  async synthesizeContext(query: string, searchResults: any[]): Promise<string> {
    try {
      const documents = searchResults.map((r, i) => `Dokument ${i + 1}:\n${r.payload.text}`).join('\n\n---\n\n');

      const prompt = `Du bist ein KI-Assistent, der Informationen zusammenfasst. Extrahiere aus den folgenden Dokumenten nur die Absätze und Sätze, die zur Beantwortung der Nutzeranfrage direkt relevant sind. Fasse die extrahierten Informationen zu einem dichten, prägnanten und kohärenten Text zusammen, der als finaler Kontext dient.

Ursprüngliche Nutzeranfrage: "${query}"

Dokumente:
${documents}

Zusammengefasster, relevanter Kontext:`;

      const result = await this.generateWithRetry(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error synthesizing context:', error);
      // Fallback to a simple concatenation if synthesis fails
      return searchResults.map(r => r.payload.text).join('\n\n');
    }
  }
}

export default new GeminiService();
