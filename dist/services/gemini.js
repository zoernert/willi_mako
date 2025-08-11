"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
class GeminiService {
    constructor() {
        this.model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    }
    async generateResponse(messages, context = '', userPreferences = {}, isEnhancedQuery = false) {
        try {
            const systemPrompt = this.buildSystemPrompt(context, userPreferences, isEnhancedQuery);
            const conversationHistory = messages
                .map(msg => `${msg.role}: ${msg.content}`)
                .join('\n');
            const fullPrompt = `${systemPrompt}\n\nKonversationsverlauf:\n${conversationHistory}\n\nAssistant:`;
            const result = await this.generateWithRetry(fullPrompt);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            console.error('Error generating response:', error);
            throw new Error('Failed to generate response from Gemini');
        }
    }
    buildSystemPrompt(context, userPreferences, isEnhancedQuery = false) {
        const basePrompt = `Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig. Du hilfst Nutzern bei Fragen rund um:

- Energiemarkt und Marktkommunikation
- Regulatorische Anforderungen
- Geschäftsprozesse in der Energiewirtschaft
- Technische Standards und Normen
- Branchenspezifische Herausforderungen

Deine Antworten sollen:
- Präzise und fachlich korrekt sein
- Praxisnah und umsetzbar sein
- Aktuelle Marktentwicklungen berücksichtigen
- Freundlich und professionell formuliert sein

Du kannst auf Deutsch und Englisch antworten, bevorzuge aber Deutsch.`;
        let enhancedPrompt = basePrompt;
        if (isEnhancedQuery) {
            enhancedPrompt += `\n\nWICHTIG: Die Benutzerfrage wurde bereits durch Präzisierungsfragen erweitert. Gib eine detaillierte, finale Antwort basierend auf den bereitgestellten Kontexten. Stelle KEINE weiteren Rückfragen.`;
        }
        if (context && context.trim()) {
            enhancedPrompt += `\n\nRelevanter Kontext aus der Wissensdatenbank:\n${context}`;
        }
        if (userPreferences.companiesOfInterest && userPreferences.companiesOfInterest.length > 0) {
            enhancedPrompt += `\n\nUnternehmen von Interesse für den Nutzer: ${userPreferences.companiesOfInterest.join(', ')}`;
        }
        if (userPreferences.preferredTopics && userPreferences.preferredTopics.length > 0) {
            enhancedPrompt += `\n\nBevorzugte Themen: ${userPreferences.preferredTopics.join(', ')}`;
        }
        enhancedPrompt += `\n\nAntworte immer hilfreich und fokussiert auf die Energiewirtschaft.`;
        return enhancedPrompt;
    }
    async generateEmbedding(text) {
        try {
            const embedding = await this.textToVector(text);
            return embedding;
        }
        catch (error) {
            console.error('Error generating embedding:', error);
            throw new Error('Failed to generate embedding');
        }
    }
    async textToVector(text) {
        const vector = new Array(1536).fill(0);
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            vector[i % 1536] = (vector[i % 1536] + char) % 1000;
        }
        const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
        return vector.map(val => val / magnitude);
    }
    async summarizeText(text, maxLength = 500) {
        try {
            const prompt = `Fasse folgenden Text in maximal ${maxLength} Zeichen zusammen, fokussiere dich auf die wichtigsten Punkte der Energiewirtschaft:

${text}`;
            const result = await this.model.generateContent(prompt);
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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text()
                .split(',')
                .map(keyword => keyword.trim())
                .filter(keyword => keyword.length > 0);
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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        }
        catch (error) {
            console.error('Error generating chat title:', error);
            return this.generateFallbackTitle(userMessage);
        }
    }
    generateFallbackTitle(userMessage) {
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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            try {
                let responseText = response.text().trim();
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
                    title: (parsedResponse.title && parsedResponse.title.trim()) || 'Energiewirtschafts-FAQ',
                    description: (parsedResponse.description && parsedResponse.description.trim()) || 'Frage zur Energiewirtschaft',
                    context: (parsedResponse.context && parsedResponse.context.trim()) || 'Kontext zur Energiewirtschaft',
                    answer: (parsedResponse.answer && parsedResponse.answer.trim()) || 'Antwort zur Energiewirtschaft',
                    additionalInfo: (parsedResponse.additionalInfo && parsedResponse.additionalInfo.trim()) || 'Weitere Informationen können bei Bedarf ergänzt werden.',
                    tags: Array.isArray(parsedResponse.tags) && parsedResponse.tags.length > 0 ? parsedResponse.tags : ['Energiewirtschaft']
                };
            }
            catch (parseError) {
                console.error('JSON parsing failed, using fallback:', parseError);
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
        }
        catch (error) {
            console.error('Error generating FAQ content:', error);
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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            try {
                let responseText = response.text().trim();
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
                    title: (parsedResponse.title && parsedResponse.title.trim()) || faqData.title,
                    description: (parsedResponse.description && parsedResponse.description.trim()) || faqData.description,
                    context: (parsedResponse.context && parsedResponse.context.trim()) || faqData.context,
                    answer: (parsedResponse.answer && parsedResponse.answer.trim()) || faqData.answer,
                    additionalInfo: (parsedResponse.additionalInfo && parsedResponse.additionalInfo.trim()) || faqData.additionalInfo,
                    tags: Array.isArray(parsedResponse.tags) && parsedResponse.tags.length > 0 ? parsedResponse.tags : faqData.tags
                };
            }
            catch (parseError) {
                console.error('JSON parsing failed in enhanceFAQWithContext, using original data:', parseError);
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
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let responseText = response.text().trim();
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
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await this.model.generateContent(prompt);
            }
            catch (error) {
                if (error.status === 429 && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`Rate limit exceeded. Waiting ${delay}ms before retry ${attempt}/${maxRetries}`);
                    await this.sleep(delay);
                    continue;
                }
                throw error;
            }
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.GeminiService = GeminiService;
exports.default = new GeminiService();
//# sourceMappingURL=gemini.js.map