"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("../config/database"));
const postgres_codelookup_repository_1 = require("../modules/codelookup/repositories/postgres-codelookup.repository");
const codelookup_service_1 = require("../modules/codelookup/services/codelookup.service");
const aiResponseUtils_1 = require("../utils/aiResponseUtils");
dotenv_1.default.config();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
class GeminiService {
    constructor() {
        this.currentModelIndex = 0;
        this.modelUsageCount = new Map();
        // Initialize multiple models for load balancing (no lite models for better quality)
        const modelConfigs = [
            'gemini-2.0-flash', // 15 RPM
            'gemini-2.5-flash', // 10 RPM  
            'gemini-2.5-pro' // 5 RPM
        ];
        this.models = modelConfigs.map(modelName => ({
            name: modelName,
            instance: genAI.getGenerativeModel({
                model: modelName,
                tools: [
                    {
                        functionDeclarations: [
                            {
                                name: 'lookup_energy_code',
                                description: 'Sucht nach deutschen BDEW- oder EIC-Energiewirtschaftscodes. Nützlich, um herauszufinden, welches Unternehmen zu einem bestimmten Code gehört.',
                                parameters: {
                                    type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                    properties: {
                                        code: {
                                            type: generative_ai_1.FunctionDeclarationSchemaType.STRING,
                                            description: 'Der BDEW- oder EIC-Code, nach dem gesucht werden soll.'
                                        }
                                    },
                                    required: ['code']
                                }
                            }
                        ]
                    }
                ]
            }),
            rpmLimit: this.getRpmLimit(modelName),
            lastUsed: 0
        }));
        // Initialize usage tracking
        modelConfigs.forEach(model => this.modelUsageCount.set(model, 0));
        // Start usage counter reset timer
        this.resetUsageCounters();
        // Initialize code lookup service
        const codeLookupRepository = new postgres_codelookup_repository_1.PostgresCodeLookupRepository(database_1.default);
        this.codeLookupService = new codelookup_service_1.CodeLookupService(codeLookupRepository);
    }
    getRpmLimit(modelName) {
        const limits = {
            'gemini-2.0-flash': 15,
            'gemini-2.5-flash': 10,
            'gemini-2.5-pro': 5
        };
        return limits[modelName] || 10;
    }
    getNextAvailableModel() {
        const now = Date.now();
        // Find the best available model based on multiple factors
        let bestModel = this.models[0];
        let bestScore = -Infinity;
        for (const model of this.models) {
            const timeSinceLastUse = now - model.lastUsed;
            const usageCount = this.modelUsageCount.get(model.name) || 0;
            const intervalRequired = (60 * 1000) / model.rpmLimit; // ms between requests for this model
            // Calculate availability score
            let score = 0;
            // Priority 1: Is the model immediately available?
            const isImmediatelyAvailable = timeSinceLastUse >= intervalRequired;
            if (isImmediatelyAvailable) {
                score += 1000; // High bonus for immediate availability
            }
            else {
                // Penalize based on how long we need to wait
                const waitTime = intervalRequired - timeSinceLastUse;
                score -= waitTime / 100; // Convert to smaller penalty
            }
            // Priority 2: Favor models with higher RPM limits
            score += model.rpmLimit * 10;
            // Priority 3: Favor models with lower current usage
            const usageRatio = usageCount / model.rpmLimit;
            score -= usageRatio * 100;
            // Priority 4: Add some randomness to distribute load
            score += Math.random() * 10;
            if (score > bestScore) {
                bestScore = score;
                bestModel = model;
            }
        }
        console.log(`Selected model: ${bestModel.name} (RPM: ${bestModel.rpmLimit}, Score: ${bestScore.toFixed(2)}, Usage: ${this.modelUsageCount.get(bestModel.name) || 0})`);
        return bestModel;
    }
    // Reset usage counters every minute
    resetUsageCounters() {
        setInterval(() => {
            this.modelUsageCount.clear();
            this.models.forEach(model => this.modelUsageCount.set(model.name, 0));
        }, 60000); // Reset every minute
    }
    async generateResponse(messages, context = '', userPreferences = {}, isEnhancedQuery = false, contextMode) {
        try {
            // Select best available model
            const selectedModel = this.getNextAvailableModel();
            // Prepare system prompt with context
            const systemPrompt = this.buildSystemPrompt(context, userPreferences, isEnhancedQuery, contextMode);
            // Format conversation history for function calling
            const conversationHistory = messages.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            }));
            // Add system prompt as first message
            const messagesWithSystem = [
                { role: 'user', parts: [{ text: systemPrompt }] },
                ...conversationHistory
            ];
            const chat = selectedModel.instance.startChat({
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
        }
        catch (error) {
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
    async handleFunctionCall(functionCall) {
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
                }
                else {
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
    buildSystemPrompt(context, userPreferences, isEnhancedQuery = false, contextMode) {
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
        }
        else if (contextMode === 'system-only') {
            basePrompt = `Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig. Du nutzt ausschließlich dein allgemeines Wissen über:

- Energiemarkt und Marktkommunikation
- Regulatorische Anforderungen
- Geschäftsprozesse in der Energiewirtschaft
- Technische Standards und Normen
- Branchenspezifische Herausforderungen

Deine Antworten basieren auf allgemeinem Fachwissen und aktuellen Standards der Energiewirtschaft.`;
        }
        else {
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
            }
            else {
                enhancedPrompt += `\n\nRelevanter Kontext aus der Wissensdatenbank:\n${context}`;
            }
        }
        else if (contextMode === 'workspace-only') {
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
        }
        else {
            enhancedPrompt += `\n\nAntworte immer hilfreich und fokussiert auf die Energiewirtschaft.`;
        }
        return enhancedPrompt;
    }
    async generateEmbedding(text) {
        try {
            // Use Google's embedding model
            const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
            const result = await embeddingModel.embedContent(text);
            if (result.embedding && result.embedding.values) {
                return result.embedding.values;
            }
            else {
                throw new Error('No embedding returned from API');
            }
        }
        catch (error) {
            console.error('Error generating embedding:', error);
            // Fallback to hash-based embedding if API fails
            return this.textToVector(text);
        }
    }
    async textToVector(text) {
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
    async summarizeText(text, maxLength = 500) {
        try {
            const prompt = `Fasse folgenden Text in maximal ${maxLength} Zeichen zusammen, fokussiere dich auf die wichtigsten Punkte der Energiewirtschaft:

${text}`;
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            console.error('Error summarizing text:', error);
            throw new Error('Failed to summarize text');
        }
    }
    async extractKeywords(text) {
        try {
            const prompt = `Extrahiere die wichtigsten Schlagwörter aus folgendem Text, fokussiert auf Energiewirtschaft und Marktkommunikation. Gib die Schlagwörter als kommagetrennte Liste zurück:

${text}`;
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            return response.text()
                .split(',')
                .map((keyword) => keyword.trim())
                .filter((keyword) => keyword.length > 0);
        }
        catch (error) {
            console.error('Error extracting keywords:', error);
            throw new Error('Failed to extract keywords');
        }
    }
    async generateChatTitle(userMessage, assistantResponse) {
        try {
            const prompt = `Basierend auf dieser Konversation, erstelle einen kurzen, prägnanten Titel (maximal 6 Wörter) auf Deutsch, der das Hauptthema oder die Kernfrage beschreibt:

Nutzer: ${userMessage}
Mako Willi: ${assistantResponse}

Antworte nur mit dem Titel, ohne weitere Erklärungen oder Anführungszeichen.`;
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            return response.text().trim();
        }
        catch (error) {
            console.error('Error generating chat title:', error);
            // Fallback to a generic title based on the user message
            return this.generateFallbackTitle(userMessage);
        }
    }
    generateFallbackTitle(userMessage) {
        // Extract first few words from user message as fallback
        const words = userMessage.split(' ').slice(0, 4);
        return words.join(' ') + (userMessage.split(' ').length > 4 ? '...' : '');
    }
    async generateFAQContent(messages) {
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
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            const responseText = response.text().trim();
            console.log('Raw AI response:', responseText);
            // Use the safe JSON parser utility
            const parsedResponse = (0, aiResponseUtils_1.safeParseJsonResponse)(responseText);
            if (!parsedResponse) {
                console.error('Failed to parse AI response as JSON, using fallback');
                console.error('Raw response that failed to parse:', responseText);
                // Fallback if JSON parsing fails - do NOT use the raw response as answer
                return {
                    title: 'Energiewirtschafts-FAQ',
                    description: 'Frage zur Energiewirtschaft',
                    context: 'Kontext zur Energiewirtschaft',
                    answer: 'Antwort zur Energiewirtschaft konnte nicht automatisch generiert werden. Bitte bearbeiten Sie diesen FAQ-Eintrag manuell.',
                    additionalInfo: 'Weitere Informationen können bei Bedarf ergänzt werden.',
                    tags: ['Energiewirtschaft']
                };
            }
            return {
                title: (parsedResponse.title && parsedResponse.title.trim()) || 'Energiewirtschafts-FAQ',
                description: (parsedResponse.description && parsedResponse.description.trim()) || 'Frage zur Energiewirtschaft',
                context: (parsedResponse.context && parsedResponse.context.trim()) || 'Kontext zur Energiewirtschaft',
                answer: (parsedResponse.answer && parsedResponse.answer.trim()) || 'Antwort zur Energiewirtschaft',
                additionalInfo: (parsedResponse.additionalInfo && parsedResponse.additionalInfo.trim()) || 'Weitere Informationen können bei Bedarf ergänzt werden.',
                tags: Array.isArray(parsedResponse.tags) && parsedResponse.tags.length > 0 ? parsedResponse.tags : ['Energiewirtschaft']
            };
        }
        catch (error) {
            console.error('Error generating FAQ content:', error);
            console.error('Error type:', typeof error);
            if (error instanceof Error) {
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
            }
            throw new Error('Failed to generate FAQ content');
        }
    }
    async enhanceFAQWithContext(faqData, searchContext) {
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
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            try {
                let responseText = response.text().trim();
                // Remove markdown code blocks if present
                if (responseText.startsWith('```json') && responseText.endsWith('```')) {
                    responseText = responseText.slice(7, -3).trim();
                }
                else if (responseText.startsWith('```') && responseText.endsWith('```')) {
                    const firstNewline = responseText.indexOf('\n');
                    const lastNewline = responseText.lastIndexOf('\n');
                    if (firstNewline > 0 && lastNewline > firstNewline) {
                        responseText = responseText.slice(firstNewline + 1, lastNewline).trim();
                    }
                }
                const parsedResponse = (0, aiResponseUtils_1.safeParseJsonResponse)(responseText);
                if (!parsedResponse) {
                    console.error('Failed to parse enhanced FAQ response as JSON, using original data');
                    console.error('Raw response that failed to parse:', responseText);
                    return faqData;
                }
                return {
                    title: (parsedResponse.title && parsedResponse.title.trim()) || faqData.title,
                    description: (parsedResponse.description && parsedResponse.description.trim()) || faqData.description,
                    context: (parsedResponse.context && parsedResponse.context.trim()) || faqData.context,
                    answer: (parsedResponse.answer && parsedResponse.answer.trim()) || faqData.answer,
                    additionalInfo: (parsedResponse.additionalInfo && parsedResponse.additionalInfo.trim()) || faqData.additionalInfo,
                    tags: Array.isArray(parsedResponse.tags) && parsedResponse.tags.length > 0 ? parsedResponse.tags : faqData.tags
                };
            }
            catch (parseError) {
                console.error('Error parsing enhanced FAQ response:', parseError);
                return faqData;
            }
        }
        catch (error) {
            console.error('Error enhancing FAQ with context:', error);
            return faqData;
        }
    }
    async generateMultipleChoiceQuestion(content, difficulty, topicArea) {
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
            }
            else if (responseText.startsWith('```') && responseText.endsWith('```')) {
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
        }
        catch (error) {
            console.error('Error generating multiple choice question:', error);
            throw new Error('Failed to generate quiz question');
        }
    }
    async generateQuizQuestions(sourceContent, questionCount, difficulty, topicArea) {
        const questions = [];
        for (let i = 0; i < Math.min(questionCount, sourceContent.length); i++) {
            try {
                const question = await this.generateMultipleChoiceQuestion(sourceContent[i], difficulty, topicArea);
                questions.push(question);
            }
            catch (error) {
                console.error(`Error generating question ${i + 1}:`, error);
            }
        }
        return questions;
    }
    async evaluateAnswerWithExplanation(question, userAnswer, correctAnswer) {
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
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            let responseText = response.text().trim();
            // Remove markdown code blocks if present
            if (responseText.startsWith('```json') && responseText.endsWith('```')) {
                responseText = responseText.slice(7, -3).trim();
            }
            else if (responseText.startsWith('```') && responseText.endsWith('```')) {
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
        }
        catch (error) {
            console.error('Error evaluating answer:', error);
            return {
                isCorrect: false,
                explanation: 'Fehler bei der Bewertung',
                improvementTips: []
            };
        }
    }
    async generateText(prompt) {
        try {
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            console.error('Error generating text:', error);
            throw new Error('Failed to generate text from Gemini');
        }
    }
    async generateWithRetry(prompt, maxRetries = 3) {
        var _a, _b;
        let lastError = null;
        const triedModels = new Set();
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            let selectedModel = this.getNextAvailableModel();
            // If we've tried all models, start over but wait a bit
            if (triedModels.has(selectedModel.name) && triedModels.size >= this.models.length) {
                console.log(`All models tried, waiting before retry attempt ${attempt}/${maxRetries}`);
                await this.sleep(1000 * attempt); // Progressive delay
                triedModels.clear();
                selectedModel = this.getNextAvailableModel();
            }
            try {
                // Check if this specific model needs to wait
                const now = Date.now();
                const timeSinceModelLastUsed = now - selectedModel.lastUsed;
                const modelInterval = (60 * 1000) / selectedModel.rpmLimit; // Time per request for this model
                if (timeSinceModelLastUsed < modelInterval) {
                    const waitTime = Math.ceil(modelInterval - timeSinceModelLastUsed);
                    console.log(`Model ${selectedModel.name} rate limiting: waiting ${waitTime}ms (RPM: ${selectedModel.rpmLimit})`);
                    await this.sleep(waitTime);
                }
                selectedModel.lastUsed = Date.now();
                console.log(`Using model: ${selectedModel.name} for attempt ${attempt}/${maxRetries}`);
                const result = await selectedModel.instance.generateContent(prompt);
                // Success - update usage count
                const currentCount = this.modelUsageCount.get(selectedModel.name) || 0;
                this.modelUsageCount.set(selectedModel.name, currentCount + 1);
                return result;
            }
            catch (error) {
                lastError = error;
                triedModels.add(selectedModel.name);
                console.error(`Gemini API attempt ${attempt}/${maxRetries} failed with model ${selectedModel.name}:`, error.message);
                if (((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('429')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('Too Many Requests'))) {
                    console.log(`Rate limit hit on ${selectedModel.name}, trying different model...`);
                    // Mark this model as temporarily unavailable
                    selectedModel.lastUsed = Date.now() + (60 * 1000); // Block for 1 minute
                    // If we have other models to try, continue immediately
                    if (triedModels.size < this.models.length) {
                        continue;
                    }
                }
                // For other errors or if we've tried all models, wait before retry
                if (attempt < maxRetries) {
                    const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5 second delay
                    console.log(`Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
                    await this.sleep(delay);
                }
            }
        }
        // All retries failed
        throw lastError || new Error('All retry attempts failed across all models');
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Generate tags for note content using AI
     */
    async generateTagsForNote(content) {
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
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0 && tag.length <= 30)
                .slice(0, 5); // Limit to 5 tags
            return tags;
        }
        catch (error) {
            console.error('Error generating tags for note:', error);
            return [];
        }
    }
    /**
     * Generate tags for document content using AI
     */
    async generateTagsForDocument(content, title) {
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
                .map((tag) => tag.trim())
                .filter((tag) => tag.length > 0 && tag.length <= 30)
                .slice(0, 5); // Limit to 5 tags
            return tags;
        }
        catch (error) {
            console.error('Error generating tags for document:', error);
            return [];
        }
    }
    /**
     * Generate response with user context (documents and notes)
     */
    async generateResponseWithUserContext(messages, publicContext, userDocuments, userNotes, userPreferences = {}, contextMode) {
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
            }
            else {
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
        }
        catch (error) {
            console.error('Error generating response with user context:', error);
            throw new Error('Failed to generate response with user context');
        }
    }
    /**
     * Suggest related content based on query
     */
    async suggestRelatedContent(userId, query) {
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
            const suggestions = (0, aiResponseUtils_1.safeParseJsonResponse)(suggestionsText);
            if (suggestions && Array.isArray(suggestions)) {
                return suggestions;
            }
            else {
                // If JSON parsing fails, try to extract suggestions from text
                const lines = suggestionsText.split('\n');
                return lines
                    .filter((line) => line.trim().length > 0)
                    .map((line) => line.replace(/^[-*]\s*/, '').trim())
                    .slice(0, 10);
            }
        }
        catch (error) {
            console.error('Error suggesting related content:', error);
            return [];
        }
    }
    /**
     * Generate embedding for text (for vector search)
     */
    /**
     * Generiert eine hypothetische Antwort für HyDE (Hypothetical Document Embeddings)
     */
    async generateHypotheticalAnswer(query) {
        try {
            const prompt = `Du bist ein Experte für die deutsche Energiewirtschaft. Beantworte die folgende Frage prägnant und ausschließlich basierend auf deinem allgemeinen Wissen über die Marktprozesse. Gib nur die Antwort aus, ohne einleitende Sätze.

Frage: ${query}

Antwort:`;
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            return response.text().trim();
        }
        catch (error) {
            console.error('Error generating hypothetical answer:', error);
            // Fallback zur ursprünglichen Query
            return query;
        }
    }
    async generateSearchQueries(query) {
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
            let queries;
            try {
                const parsed = JSON.parse(text);
                if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) {
                    queries = parsed;
                }
                else {
                    console.error('AI response for search queries was not a string array:', parsed);
                    queries = [];
                }
            }
            catch (e) {
                console.error('Failed to parse search queries from AI response:', text, e);
                queries = [];
            }
            // Add the original query to the list to ensure it's also searched
            queries.unshift(query);
            return [...new Set(queries)]; // Return unique queries
        }
        catch (error) {
            console.error('Error generating search queries:', error);
            // Fallback to the original query
            return [query];
        }
    }
    async synthesizeContext(query, searchResults) {
        try {
            // Use content field instead of payload.text for better data extraction
            const documents = searchResults.map((r, i) => {
                var _a, _b;
                const content = ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.content) || r.content || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.text) || '';
                return `Dokument ${i + 1}:\n${content}`;
            }).join('\n\n---\n\n');
            const prompt = `Du bist ein KI-Assistent für die Energiewirtschaft. Extrahiere aus den folgenden Dokumenten ALLE relevanten Informationen zur Beantwortung der Nutzeranfrage und strukturiere sie übersichtlich.

WICHTIGE ANFORDERUNGEN:
- Behalte ALLE technischen Details, Fehlercodes, OBIS-Kennzahlen und Prozessschritte
- Erkläre spezifische Begriffe und Zusammenhänge (z.B. APERAK, UTILMD, MSCONS)
- Strukturiere Informationen nach: Definition → Ursachen → Lösungsschritte
- Erwähne relevante Normen, Standards und rechtliche Grundlagen
- Bei Fehlercodes: Erkläre die genaue Bedeutung und den Kontext

Nutzeranfrage: "${query}"

Dokumente:
${documents}

Strukturierter Kontext mit allen relevanten technischen Details:`;
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            const synthesizedText = response.text();
            // Ensure we have meaningful content
            if (synthesizedText.length < 100) {
                // If synthesis produced too little content, fallback to raw documents
                return searchResults.map(r => { var _a, _b; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.content) || r.content || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.text) || ''; }).join('\n\n');
            }
            return synthesizedText;
        }
        catch (error) {
            console.error('Error synthesizing context:', error);
            // Enhanced fallback: try to extract content properly
            const fallbackContent = searchResults.map(r => {
                var _a, _b;
                return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.content) || r.content || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.text) || '';
            }).filter(text => text.trim().length > 0).join('\n\n');
            return fallbackContent || 'Keine relevanten Dokumente gefunden.';
        }
    }
    /**
     * Erweiterte Kontext-Synthese mit chunk_type-bewusster Verarbeitung
     */
    async synthesizeContextWithChunkTypes(query, searchResults) {
        try {
            const contextParts = [];
            // Gruppiere Ergebnisse nach chunk_type für bessere Strukturierung
            const groupedResults = new Map();
            searchResults.forEach(result => {
                var _a;
                const chunkType = ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.chunk_type) || 'paragraph';
                if (!groupedResults.has(chunkType)) {
                    groupedResults.set(chunkType, []);
                }
                groupedResults.get(chunkType).push(result);
            });
            // Erstelle kontextspezifische Abschnitte
            for (const [chunkType, results] of groupedResults.entries()) {
                const sectionContent = results.map((r, i) => {
                    var _a, _b, _c, _d, _e, _f;
                    const content = ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.contextual_content) || ((_b = r.payload) === null || _b === void 0 ? void 0 : _b.content) || ((_c = r.payload) === null || _c === void 0 ? void 0 : _c.text) || '';
                    const source = ((_e = (_d = r.payload) === null || _d === void 0 ? void 0 : _d.document_metadata) === null || _e === void 0 ? void 0 : _e.document_base_name) || 'Unbekannte Quelle';
                    const page = ((_f = r.payload) === null || _f === void 0 ? void 0 : _f.page_number) || 'N/A';
                    return `${content}\n[Quelle: ${source}, Seite ${page}]`;
                }).join('\n\n');
                if (sectionContent.trim()) {
                    let sectionHeader = '';
                    switch (chunkType) {
                        case 'definition':
                            sectionHeader = '## Definitionen und Begriffserklärungen\n';
                            break;
                        case 'abbreviation':
                            sectionHeader = '## Abkürzungen\n';
                            break;
                        case 'structured_table':
                            sectionHeader = '## Tabellarische Daten\n';
                            break;
                        case 'visual_summary':
                            sectionHeader = '## Diagramme und visuelle Darstellungen\n';
                            break;
                        default:
                            sectionHeader = '## Relevante Textauszüge\n';
                    }
                    contextParts.push(sectionHeader + sectionContent);
                }
            }
            if (contextParts.length === 0) {
                return 'Keine relevanten Informationen gefunden.';
            }
            const structuredContext = contextParts.join('\n\n');
            // Verwende die strukturierten Informationen für die finale Synthese
            const prompt = `Du bist ein KI-Assistent für die deutsche Energiewirtschaft. Beantworte die Nutzerfrage basierend auf den folgenden, nach Inhaltstypen strukturierten Auszügen aus den offiziellen Dokumenten.

Nutzerfrage: ${query}

--- STRUKTURIERTE KONTEXT-AUSZÜGE ---
${structuredContext}

Erstelle eine präzise, strukturierte Antwort die:
1. Die wichtigsten Informationen zu Beginn zusammenfasst
2. Technische Details und Definitionen klar erklärt
3. Bei Tabellen die wichtigsten Werte hervorhebt
4. Quellenangaben integriert
5. Alle relevanten Aspekte der Anfrage abdeckt

Antwort:`;
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            console.error('Error in chunk-type aware synthesis:', error);
            // Fallback zur normalen Synthese
            return this.synthesizeContext(query, searchResults);
        }
    }
    /**
     * Re-Ranking von Suchergebnissen basierend auf semantischer Ähnlichkeit
     * (Vereinfachte Implementierung ohne externes Cross-Encoder Modell)
     */
    async reRankResults(originalQuery, searchResults, topK = 5) {
        if (searchResults.length <= topK) {
            return searchResults;
        }
        try {
            // Verwende eine vereinfachte Re-Ranking Strategie basierend auf Textähnlichkeit
            const rankedResults = await Promise.all(searchResults.map(async (result) => {
                var _a, _b;
                const content = ((_a = result.payload) === null || _a === void 0 ? void 0 : _a.text) || ((_b = result.payload) === null || _b === void 0 ? void 0 : _b.content) || '';
                // Berechne eine einfache Ähnlichkeit basierend auf gemeinsamen Begriffen
                const queryTerms = originalQuery.toLowerCase().split(/\s+/);
                const contentTerms = content.toLowerCase().split(/\s+/);
                const commonTerms = queryTerms.filter(term => contentTerms.some((cTerm) => cTerm.includes(term) || term.includes(cTerm)));
                const textSimilarity = commonTerms.length / queryTerms.length;
                // Kombiniere ursprünglichen Vektor-Score mit Text-Ähnlichkeit
                const combinedScore = (result.score * 0.7) + (textSimilarity * 0.3);
                return {
                    ...result,
                    rerank_score: combinedScore,
                    text_similarity: textSimilarity,
                    original_score: result.score
                };
            }));
            // Sortiere nach kombiniertem Score und nimm Top-K
            return rankedResults
                .sort((a, b) => b.rerank_score - a.rerank_score)
                .slice(0, topK);
        }
        catch (error) {
            console.error('Error in re-ranking, returning original results:', error);
            return searchResults.slice(0, topK);
        }
    }
    /**
     * Generiert finale Antwort mit transparenten Quellenangaben
     */
    async generateResponseWithSources(query, context, contextSources = [], previousMessages = [], userPreferences = {}) {
        try {
            // Erstelle erweiterten System-Prompt mit Quellenanweisungen
            const systemPrompt = `Du bist ein KI-Assistent für die deutsche Energiewirtschaft. Beantworte die Nutzerfrage basierend auf den bereitgestellten Kontext-Auszügen aus offiziellen Dokumenten.

WICHTIGE ANFORDERUNGEN:
1. Beziehe dich ausschließlich auf die bereitgestellten Kontexte
2. Gib am Ende deiner Antwort eine Liste der verwendeten Quellen im Format '[Dokumentname, Seite X]' an
3. Sei präzise und technisch korrekt
4. Erkläre Fachbegriffe und Abkürzungen
5. Strukturiere deine Antwort logisch und übersichtlich

Nutzeranfrage: ${query}

Kontext:
${context}

Antworte nun auf die Nutzerfrage und liste die verwendeten Quellen am Ende auf.`;
            const result = await this.generateWithRetry(systemPrompt);
            const response = await result.response;
            const responseText = response.text();
            // Extrahiere Quellenangaben aus dem Context
            const sources = contextSources.map(source => {
                var _a;
                return ({
                    document: source.source_document || ((_a = source.document_metadata) === null || _a === void 0 ? void 0 : _a.document_base_name) || 'Unbekannt',
                    page: source.page_number || 'N/A',
                    chunk_type: source.chunk_type || 'paragraph',
                    score: source.score || 0
                });
            });
            return {
                response: responseText,
                sources: sources
            };
        }
        catch (error) {
            console.error('Error generating response with sources:', error);
            return {
                response: 'Entschuldigung, bei der Generierung der Antwort ist ein Fehler aufgetreten.',
                sources: []
            };
        }
    }
    // Log current model usage statistics
    logModelUsage() {
        console.log('\n=== Gemini Model Usage Statistics ===');
        const now = Date.now();
        for (const model of this.models) {
            const usageCount = this.modelUsageCount.get(model.name) || 0;
            const timeSinceLastUse = now - model.lastUsed;
            const intervalRequired = (60 * 1000) / model.rpmLimit;
            const isAvailable = timeSinceLastUse >= intervalRequired;
            console.log(`${model.name}:`);
            console.log(`  - RPM Limit: ${model.rpmLimit}`);
            console.log(`  - Usage Count: ${usageCount}/${model.rpmLimit}`);
            console.log(`  - Available: ${isAvailable ? 'Yes' : `Wait ${Math.ceil(intervalRequired - timeSinceLastUse)}ms`}`);
            console.log(`  - Last Used: ${timeSinceLastUse}ms ago`);
        }
        console.log('=====================================\n');
    }
}
exports.GeminiService = GeminiService;
exports.default = new GeminiService();
//# sourceMappingURL=gemini.js.map