"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
// Note: Use dynamic import for EDIFACT tool to avoid circular init at module load time
dotenv_1.default.config();
// Importing the GoogleAIKeyManager for efficient key management
const googleAIKeyManager = require('./googleAIKeyManager');
const userAIKeyService_1 = __importDefault(require("./userAIKeyService"));
const errors_1 = require("../utils/errors");
class GeminiService {
    constructor() {
        this.currentModelIndex = 0;
        this.modelUsageCount = new Map();
        this.lastUsedModelName = null; // Track last selected model
        // Initialize multiple models for load balancing (no lite models for better quality)
        const modelConfigs = [
            'gemini-2.0-flash', // 15 RPM
            'gemini-2.5-flash' // 10 RPM
        ];
        // Initialize with empty array that will be populated asynchronously
        this.models = [];
        // Initialize usage tracking
        modelConfigs.forEach(model => this.modelUsageCount.set(model, 0));
        // Start usage counter reset timer
        this.resetUsageCounters();
        // Initialize code lookup service
        const codeLookupRepository = new postgres_codelookup_repository_1.PostgresCodeLookupRepository(database_1.default);
        this.codeLookupService = new codelookup_service_1.CodeLookupService(codeLookupRepository);
        // Start async initialization of models
        this.initializeModels(modelConfigs).catch(err => {
            console.error('Failed to initialize models with key manager:', err);
        });
    }
    /**
     * Resolve generation config from environment with safe defaults.
     * Defaults are chosen to encourage fuller answers similar to AnythingLLM (temp ~0.7).
     */
    getGenerationConfig() {
        const toNum = (v, d) => {
            const n = v ? Number(v) : NaN;
            return Number.isFinite(n) ? n : d;
        };
        // Defaults: temperature 0.7, topP 0.95, maxOutputTokens 8192 (can be overridden via env)
        const temperature = toNum(process.env.LLM_TEMPERATURE, 0.7);
        const topP = toNum(process.env.LLM_TOP_P, 0.95);
        const maxOutputTokens = toNum(process.env.LLM_MAX_TOKENS, 8192);
        return { temperature, topP, maxOutputTokens };
    }
    /**
     * Get the last used Gemini model name (for diagnostics/metrics)
     */
    getLastUsedModel() {
        return this.lastUsedModelName;
    }
    /**
     * Asynchronously initializes models using the googleAIKeyManager for efficient key usage
     * @param modelNames Array of model names to initialize
     */
    async initializeModels(modelNames) {
        try {
            // Create empty array to hold model configurations
            const newModels = [];
            for (const modelName of modelNames) {
                // Default: system key via key manager
                const modelInstance = await googleAIKeyManager.getGenerativeModel({
                    model: modelName,
                    generationConfig: this.getGenerationConfig(),
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
                                },
                                {
                                    name: 'edifact_analyze_message',
                                    description: 'Analysiert eine vollständige (oder weitgehend vollständige) EDIFACT-Nachricht aus der deutschen Marktkommunikation und liefert eine knappe Zusammenfassung mit Hinweisen.',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            message: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Die EDIFACT-Nachricht (ggf. mehrzeilig).' }
                                        },
                                        required: ['message']
                                    }
                                },
                                {
                                    name: 'edifact_explain_segment',
                                    description: 'Erklärt ein einzelnes EDIFACT-Segment oder einen kurzen Fragmentausschnitt (z. B. CAV/CCI/DTM etc.).',
                                    parameters: {
                                        type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                        properties: {
                                            fragment: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Das Segment oder Fragment (eine oder wenige Zeilen).' }
                                        },
                                        required: ['fragment']
                                    }
                                }
                            ]
                        }
                    ]
                });
                // Add the configured model to our array
                newModels.push({
                    name: modelName,
                    instance: modelInstance,
                    rpmLimit: this.getRpmLimit(modelName),
                    lastUsed: 0
                });
            }
            // Replace the models array with our newly initialized models
            this.models = newModels;
            console.log('All Gemini models initialized with key management');
        }
        catch (error) {
            console.error('Error initializing Gemini models:', error);
            // Fall back to direct API key usage if there's an issue with the key manager
            this.initializeFallbackModels(modelNames);
        }
    }
    /**
     * Fallback initialization method using direct API key if key manager fails
     */
    initializeFallbackModels(modelNames) {
        console.log('Using fallback model initialization with direct API key');
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY is not configured');
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.models = modelNames.map(modelName => ({
            name: modelName,
            instance: genAI.getGenerativeModel({
                model: modelName,
                generationConfig: this.getGenerationConfig(),
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
                            },
                            {
                                name: 'edifact_analyze_message',
                                description: 'Analysiert eine vollständige (oder weitgehend vollständige) EDIFACT-Nachricht aus der deutschen Marktkommunikation und liefert eine knappe Zusammenfassung mit Hinweisen.',
                                parameters: {
                                    type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                    properties: {
                                        message: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Die EDIFACT-Nachricht (ggf. mehrzeilig).' }
                                    },
                                    required: ['message']
                                }
                            },
                            {
                                name: 'edifact_explain_segment',
                                description: 'Erklärt ein einzelnes EDIFACT-Segment oder einen kurzen Fragmentausschnitt (z. B. CAV/CCI/DTM etc.).',
                                parameters: {
                                    type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                    properties: {
                                        fragment: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Das Segment oder Fragment (eine oder wenige Zeilen).' }
                                    },
                                    required: ['fragment']
                                }
                            }
                        ]
                    }
                ]
            }),
            rpmLimit: this.getRpmLimit(modelName),
            lastUsed: 0
        }));
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
        // Resolve per-user key if available and allowed
        const userId = (userPreferences && userPreferences.userId) || (userPreferences && userPreferences.id);
        let perRequestModels = this.models;
        if (userId) {
            try {
                const resolved = await userAIKeyService_1.default.resolveGeminiApiKey(userId);
                if (resolved.source === 'user' && resolved.key) {
                    // Build dedicated models for this request using user's key
                    const genAI = new generative_ai_1.GoogleGenerativeAI(resolved.key);
                    perRequestModels = this.models.map(m => ({
                        ...m,
                        instance: genAI.getGenerativeModel({ model: m.name, generationConfig: this.getGenerationConfig(), tools: [
                                {
                                    functionDeclarations: [
                                        {
                                            name: 'lookup_energy_code',
                                            description: 'Sucht nach deutschen BDEW- oder EIC-Energiewirtschaftscodes. Nützlich, um herauszufinden, welches Unternehmen zu einem bestimmten Code gehört.',
                                            parameters: {
                                                type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                                properties: { code: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Der BDEW- oder EIC-Code, nach dem gesucht werden soll.' } },
                                                required: ['code']
                                            }
                                        },
                                        {
                                            name: 'edifact_analyze_message',
                                            description: 'Analysiert eine vollständige (oder weitgehend vollständige) EDIFACT-Nachricht aus der deutschen Marktkommunikation und liefert eine knappe Zusammenfassung mit Hinweisen.',
                                            parameters: {
                                                type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                                properties: { message: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Die EDIFACT-Nachricht (ggf. mehrzeilig).' } },
                                                required: ['message']
                                            }
                                        },
                                        {
                                            name: 'edifact_explain_segment',
                                            description: 'Erklärt ein einzelnes EDIFACT-Segment oder einen kurzen Fragmentausschnitt (z. B. CAV/CCI/DTM etc.).',
                                            parameters: {
                                                type: generative_ai_1.FunctionDeclarationSchemaType.OBJECT,
                                                properties: { fragment: { type: generative_ai_1.FunctionDeclarationSchemaType.STRING, description: 'Das Segment oder Fragment (eine oder wenige Zeilen).' } },
                                                required: ['fragment']
                                            }
                                        }
                                    ]
                                }
                            ] })
                    }));
                }
                else if (resolved.source === null) {
                    // Policy forbids using system keys
                    throw new errors_1.AppError('A personal Gemini API key is required. Please add it in your profile settings.', 403, true, { code: 'AI_KEY_REQUIRED' });
                }
            }
            catch (e) {
                if (e instanceof errors_1.AppError) {
                    throw e;
                }
                // Non-fatal: fall back to system models
                console.warn('User key resolution failed, using system key:', e);
            }
        }
        let attemptCount = 0;
        const maxAttempts = 3; // Try up to 3 different models
        let lastError = undefined;
        let lastModel = null;
        while (attemptCount < maxAttempts) {
            attemptCount++;
            try {
                // Select best available model accounting for quota limits
                const selectedModel = await this.getQuotaAwareModel(lastModel, lastError, perRequestModels);
                lastModel = selectedModel;
                // Update the model's usage tracking
                selectedModel.lastUsed = Date.now();
                this.modelUsageCount.set(selectedModel.name, (this.modelUsageCount.get(selectedModel.name) || 0) + 1);
                // Track last used model for external diagnostics
                this.lastUsedModelName = selectedModel.name;
                // Prepare system prompt with context
                const systemPrompt = this.buildSystemPrompt(context, userPreferences, isEnhancedQuery, contextMode);
                // Prepare conversation history: if the last message is a user turn, treat it as the new turn to send,
                // and exclude it from the history to avoid duplicating the same user message twice.
                const hasLastUser = messages.length > 0 && messages[messages.length - 1].role === 'user';
                const lastUserContent = hasLastUser ? messages[messages.length - 1].content : '';
                const historyForChat = (hasLastUser ? messages.slice(0, -1) : messages).map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));
                // Add system prompt as first message in the history
                const messagesWithSystem = [
                    { role: 'user', parts: [{ text: systemPrompt }] },
                    ...historyForChat
                ];
                // Log active generation config for visibility
                try {
                    const cfg = this.getGenerationConfig();
                    console.log(`Gemini generationConfig: temperature=${cfg.temperature}, topP=${cfg.topP}, maxOutputTokens=${cfg.maxOutputTokens}`);
                }
                catch (_a) { }
                const chat = selectedModel.instance.startChat({
                    history: messagesWithSystem
                });
                const result = await chat.sendMessage(lastUserContent);
                const response = result.response; // Handle function calls
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
                    {
                        const txt = (followUpResult.response && followUpResult.response.text && followUpResult.response.text()) || '';
                        const safe = (typeof txt === 'string' ? txt : '').trim();
                        return safe.length > 0 ? safe : 'Hinweis: Die Modellantwort war leer. Bitte wiederhole die Frage oder formuliere sie neu.';
                    }
                }
                {
                    const txt = (response && response.text && response.text()) || '';
                    const safe = (typeof txt === 'string' ? txt : '').trim();
                    return safe.length > 0 ? safe : 'Hinweis: Die Modellantwort war leer. Bitte wiederhole die Frage oder formuliere sie neu.';
                }
            }
            catch (error) {
                console.error(`Error generating response (attempt ${attemptCount}/${maxAttempts}):`, error);
                if (error instanceof Error) {
                    console.error('Error details:', {
                        message: error.message,
                        stack: error.stack
                    });
                    lastError = error;
                    // Check if this is a quota error
                    if (error.message && (error.message.includes('429 Too Many Requests') ||
                        error.message.includes('quota') ||
                        error.message.includes('rate limit'))) {
                        console.warn(`⚠️ Quota error detected, trying next model...`);
                        continue; // Try next model
                    }
                }
                // If we've tried all attempts or it's not a quota error, rethrow
                if (attemptCount >= maxAttempts) {
                    throw new Error('Failed to generate response from Gemini');
                }
            }
        }
        // If we've exhausted all attempts
        throw new Error('Failed to generate response from Gemini after multiple attempts');
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
            case 'edifact_analyze_message': {
                const msg = (args && (args.message || args.msg)) || '';
                const input = typeof msg === 'string' ? msg.slice(0, 20000) : '';
                const { edifactTool } = await Promise.resolve().then(() => __importStar(require('./edifactTool')));
                const analysis = await edifactTool.analyzeMessage(input);
                return analysis;
            }
            case 'edifact_explain_segment': {
                const frag = (args && (args.fragment || args.seg || args.text)) || '';
                const input = typeof frag === 'string' ? frag.slice(0, 2000) : '';
                const { edifactTool } = await Promise.resolve().then(() => __importStar(require('./edifactTool')));
                const explanation = await edifactTool.explainSegment(input);
                return explanation;
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
            // Use Google's embedding model via key manager
            const embeddingModel = await googleAIKeyManager.getGenerativeModel({ model: "text-embedding-004" });
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
        const vector = new Array(768).fill(0);
        for (let i = 0; i < text.length; i++) {
            const char = text.charCodeAt(i);
            vector[i % 768] = (vector[i % 768] + char) % 1000;
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
            // PHASE 1: Deep Thinking - Führe eine tiefere Analyse des Chat-Verlaufs durch
            const deepThinkingPrompt = `Du bist ein Experte für die deutsche Energiewirtschaft und Marktkommunikation. Analysiere sorgfältig den folgenden Chat-Verlauf und identifiziere:

1. Das Kernthema und die wesentlichen Fragen
2. Fachbegriffe und deren korrekte Definition im Kontext der Energiewirtschaft
3. Relevante Prozesse, Standards und rechtliche Grundlagen
4. Zusammenhänge zwischen verschiedenen Aspekten des Themas
5. Wichtige Details und Fakten, die für ein vollständiges Verständnis notwendig sind

Chat-Verlauf:
${conversationText}

Führe einen strukturierten Denkprozess durch und notiere deine Erkenntnisse. Nimm dir Zeit, systematisch alle Aspekte zu analysieren.`;
            console.log('Starting deep thinking phase for FAQ generation');
            const deepThinkingResult = await this.generateWithRetry(deepThinkingPrompt);
            const deepThinkingResponse = await deepThinkingResult.response;
            const deepAnalysis = deepThinkingResponse.text().trim();
            console.log('Deep thinking analysis completed, generating structured FAQ');
            // PHASE 2: Strukturierte FAQ-Generierung mit der erweiterten Analyse
            const prompt = `Basierend auf dem folgenden Chat-Verlauf und der detaillierten Analyse, erstelle einen hochwertigen, strukturierten FAQ-Eintrag für die Energiewirtschaft:

Chat-Verlauf:
${conversationText}

Tiefe Analyse des Themas:
${deepAnalysis}

Erstelle einen präzisen, fachlich korrekten FAQ-Eintrag als JSON mit folgenden Feldern:

1. "title": Ein prägnanter, aussagekräftiger Titel für den FAQ-Eintrag (max. 60 Zeichen)
2. "description": Eine klare Beschreibung der Kernfrage/des Hauptthemas (1-2 Sätze)
3. "context": Erkläre den fachlichen Zusammenhang und Hintergrund der Frage inkl. relevanter Normen/Standards (2-3 Sätze)
4. "answer": Eine detaillierte, fachlich fundierte Antwort mit konkreten Beispielen und technischen Details (2-3 Absätze)
5. "additionalInfo": Weiterführende Informationen, rechtliche Grundlagen und Best Practices (1-2 Absätze)
6. "tags": Array mit 3-5 relevanten Tags/Schlagwörtern (z.B. ["Energiemarkt", "Regulierung", "Marktkommunikation", "Geschäftsprozesse", "Technische Standards"])

WICHTIG:
- Verwende präzise Fachbegriffe der Energiewirtschaft
- Beziehe alle relevanten technischen Details und Prozesse ein
- Nenne konkrete Standards, Formate oder Kennzahlen, wo sinnvoll
- Strukturiere die Antwort logisch und leicht verständlich
- Stelle sicher, dass alle Informationen fachlich korrekt sind

Antwort ausschließlich im JSON-Format:`;
            const result = await this.generateWithRetry(prompt);
            const response = await result.response;
            const responseText = response.text().trim();
            console.log('Raw AI response for structured FAQ:', responseText);
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
            // PHASE 1: Deep Thinking über den zusätzlichen Kontext
            const deepThinkingPrompt = `Du bist ein Experte für die deutsche Energiewirtschaft und Marktkommunikation. 
      
Analysiere sorgfältig den folgenden FAQ-Eintrag und den zusätzlichen Kontext aus der Wissensdatenbank:

FAQ-EINTRAG:
- Titel: ${faqData.title}
- Beschreibung: ${faqData.description}
- Kontext: ${faqData.context}
- Antwort: ${faqData.answer}
- Zusätzliche Informationen: ${faqData.additionalInfo}
- Tags: ${faqData.tags.join(', ')}

ZUSÄTZLICHER KONTEXT AUS DER WISSENSDATENBANK:
${searchContext}

Führe eine tiefgehende Analyse durch und identifiziere:
1. Relevante fachliche Konzepte, die im FAQ-Eintrag fehlen oder unvollständig erklärt sind
2. Technische Details, Standards oder Prozesse, die für ein umfassendes Verständnis wichtig sind
3. Rechtliche Grundlagen oder regulatorische Anforderungen, die berücksichtigt werden sollten
4. Praktische Anwendungsfälle oder Beispiele, die den FAQ-Eintrag bereichern würden
5. Mögliche Verbesserungen in Bezug auf Präzision, Klarheit und fachliche Korrektheit

Nehme dir Zeit für einen gründlichen, strukturierten Denkprozess.`;
            console.log('Starting deep thinking phase for FAQ enhancement');
            const deepThinkingResult = await this.generateWithRetry(deepThinkingPrompt);
            const deepThinkingResponse = await deepThinkingResult.response;
            const deepAnalysis = deepThinkingResponse.text().trim();
            console.log('Deep thinking analysis completed, enhancing FAQ with additional context');
            // PHASE 2: Verbesserte FAQ-Generierung mit Deep-Thinking-Analyse
            const prompt = `Du bist ein Experte für Energiewirtschaft und Marktkommunikation. 

Basierend auf den folgenden Informationen, erstelle einen ausführlichen, fachlich präzisen FAQ-Eintrag:

URSPRÜNGLICHE FAQ-DATEN:
- Titel: ${faqData.title}
- Beschreibung: ${faqData.description}
- Kontext: ${faqData.context}
- Antwort: ${faqData.answer}
- Zusätzliche Informationen: ${faqData.additionalInfo}
- Tags: ${faqData.tags.join(', ')}

TIEFGEHENDE ANALYSE DES THEMAS:
${deepAnalysis}

ZUSÄTZLICHER KONTEXT AUS DER WISSENSDATENBANK:
${searchContext}

AUFGABE:
Erstelle einen hochwertigen, umfassenden FAQ-Eintrag, der:
1. Fachlich präzise und korrekt ist mit exakten Definitionen von Fachbegriffen
2. Für Fachkräfte in der Energiewirtschaft verständlich und relevant ist
3. Konkrete Beispiele, Prozessschritte und Anwendungsfälle enthält
4. Relevante Gesetze, Verordnungen, Standards und technische Spezifikationen nennt
5. Strukturiert, übersichtlich und praxisorientiert gestaltet ist

Nutze alle verfügbaren Informationen, um einen inhaltlich optimalen FAQ-Eintrag zu erstellen.

Gib die Antwort als JSON zurück mit folgenden Feldern:
- "title": Prägnanter, fachlich korrekter Titel
- "description": Präzise Beschreibung (1-2 Sätze)
- "context": Ausführlicher fachlicher Kontext mit relevanten Standards und Grundlagen (2-3 Absätze)
- "answer": Detaillierte, technisch korrekte Antwort mit Beispielen und Prozessschritten (3-4 Absätze)
- "additionalInfo": Weiterführende Informationen, Hinweise zu rechtlichen Grundlagen und Best Practices (2-3 Absätze)
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
    async generateText(prompt, userPreferences = {}) {
        try {
            const result = await this.generateWithRetry(prompt, userPreferences);
            const response = await result.response;
            return response.text();
        }
        catch (error) {
            console.error('Error generating text:', error);
            throw new Error('Failed to generate text from Gemini');
        }
    }
    async generateWithRetry(prompt, userPreferences = {}, maxRetries = 3) {
        var _a, _b;
        let lastError = null;
        const triedModels = new Set();
        // Build per-request models if user key present
        let modelsOverride;
        const userId = (userPreferences && (userPreferences.userId || userPreferences.id)) || undefined;
        if (userId) {
            try {
                const resolved = await userAIKeyService_1.default.resolveGeminiApiKey(userId);
                if (resolved.source === 'user' && resolved.key) {
                    const genAI = new generative_ai_1.GoogleGenerativeAI(resolved.key);
                    modelsOverride = this.models.map(m => ({
                        ...m,
                        instance: genAI.getGenerativeModel({ model: m.name, generationConfig: this.getGenerationConfig() })
                    }));
                }
                else if (resolved.source === null) {
                    throw new errors_1.AppError('A personal Gemini API key is required. Please add it in your profile settings.', 403, true, { code: 'AI_KEY_REQUIRED' });
                }
            }
            catch (e) {
                if (e instanceof errors_1.AppError)
                    throw e;
                console.warn('User key resolution failed for generateWithRetry, using system key:', e);
            }
        }
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            let selectedModel = await this.getQuotaAwareModel(undefined, undefined, modelsOverride);
            // If we've tried all models, start over but wait a bit
            if (triedModels.has(selectedModel.name) && triedModels.size >= this.models.length) {
                console.log(`All models tried, waiting before retry attempt ${attempt}/${maxRetries}`);
                await this.sleep(1000 * attempt); // Progressive delay
                triedModels.clear();
                selectedModel = await this.getQuotaAwareModel(undefined, undefined, modelsOverride);
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
    async generateSearchQueries(query, userPreferences = {}) {
        try {
            const prompt = `Du bist ein Experte für die deutsche Energiewirtschaft. Analysiere die folgende Benutzeranfrage und generiere 3-5 alternative, detaillierte Suchanfragen, die helfen würden, umfassenden Kontext aus einer Wissensdatenbank zu sammeln. Decke dabei verschiedene Aspekte und mögliche Intentionen der ursprünglichen Anfrage ab.

Benutzeranfrage: "${query}"

Gib die Suchanfragen als JSON-Array von Strings zurück. Antworte nur mit dem JSON-Array.
Beispiel: ["Details zur Marktkommunikation 2024", "Anforderungen an Messstellenbetreiber", "Prozesse der Netznutzungsabrechnung"]`;
            const result = await this.generateWithRetry(prompt, userPreferences);
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
    async synthesizeContext(query, searchResults, userPreferences = {}) {
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
            const result = await this.generateWithRetry(prompt, userPreferences);
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
    async synthesizeContextWithChunkTypes(query, searchResults, userPreferences = {}) {
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
            const result = await this.generateWithRetry(prompt, userPreferences);
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
    /**
     * Generiert eine strukturierte Ausgabe (JSON) auf Basis eines Prompts
     * @param prompt Der Prompt für die KI
     * @param userPreferences Nutzerpräferenzen
     * @returns Ein strukturiertes Objekt
     */
    async generateStructuredOutput(prompt, userPreferences = {}) {
        try {
            console.log('🤖 Generating structured output...');
            let attemptCount = 0;
            const maxAttempts = 3; // Gleiche Anzahl von Versuchen wie bei generateResponse
            let lastError = undefined;
            let selectedModel = null;
            // Per-user key override
            let modelsOverride;
            const userId = (userPreferences && (userPreferences.userId || userPreferences.id)) || undefined;
            if (userId) {
                try {
                    const resolved = await userAIKeyService_1.default.resolveGeminiApiKey(userId);
                    if (resolved.source === 'user' && resolved.key) {
                        const genAI = new generative_ai_1.GoogleGenerativeAI(resolved.key);
                        modelsOverride = this.models.map(m => ({
                            ...m,
                            instance: genAI.getGenerativeModel({ model: m.name })
                        }));
                    }
                    else if (resolved.source === null) {
                        throw new errors_1.AppError('A personal Gemini API key is required. Please add it in your profile settings.', 403, true, { code: 'AI_KEY_REQUIRED' });
                    }
                }
                catch (e) {
                    if (e instanceof errors_1.AppError)
                        throw e;
                    console.warn('User key resolution failed for structured output, using system key:', e);
                }
            }
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    // Modell mit dem geringsten Nutzungsgrad wählen und Quota-Checks durchführen
                    selectedModel = await this.getQuotaAwareModel(selectedModel, lastError, modelsOverride);
                    if (!selectedModel) {
                        throw new Error('No available model found for structured output generation');
                    }
                    console.log(`📊 Using model: ${selectedModel.name}`);
                    // Update Nutzungsstatistik
                    selectedModel.lastUsed = Date.now();
                    this.modelUsageCount.set(selectedModel.name, (this.modelUsageCount.get(selectedModel.name) || 0) + 1);
                    const result = await selectedModel.instance.generateContent(prompt);
                    const response = result.response;
                    const text = response.text();
                    // Versuchen, die Antwort als JSON zu parsen
                    const parsed = (0, aiResponseUtils_1.safeParseJsonResponse)(text);
                    if (parsed !== null) {
                        return parsed;
                    }
                    const rawText = text.trim();
                    console.warn('⚠️  Structured output is not valid JSON, returning rawText fallback.');
                    return {
                        needsMoreContext: false,
                        answerable: true,
                        confidence: 0.5,
                        rawText
                    };
                }
                catch (error) {
                    if (error instanceof Error) {
                        lastError = error;
                        console.error(`Error generating structured output (attempt ${attempt}/${maxAttempts}):`, error);
                        // Überprüfe auf Quota-Überschreitung
                        if (error.message && (error.message.includes('429 Too Many Requests') ||
                            error.message.includes('quota') ||
                            error.message.includes('rate limit'))) {
                            console.warn(`⚠️ Quota error detected, trying next model...`);
                            // Fahre mit dem nächsten Versuch fort - getQuotaAwareModel wird dieses Modell überspringen
                            continue;
                        }
                    }
                    else {
                        console.error(`Error generating structured output (attempt ${attempt}/${maxAttempts}):`, error);
                    }
                    // Wenn wir alle Versuche ausgeschöpft haben oder es kein Quota-Fehler ist
                    if (attempt >= maxAttempts) {
                        throw error; // Wirf den Fehler, um zum Fallback überzugehen
                    }
                }
            }
            throw new Error('All model attempts failed for structured output generation');
        }
        catch (error) {
            console.error('Error generating structured output after all attempts:', error);
            // Fallback mit minimalen Informationen
            const rawText = error instanceof Error
                ? error.message
                : typeof error === 'string'
                    ? error
                    : '';
            return {
                needsMoreContext: false,
                answerable: true,
                confidence: 0.5,
                rawText: rawText || undefined
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
    /**
     * Wählt das Modell mit der geringsten Nutzung aus
     */
    getNextModelWithLowestUsage() {
        // Finde das Modell mit der geringsten Nutzung unter den verfügbaren Modellen
        let lowestUsage = Number.MAX_SAFE_INTEGER;
        let modelIndex = -1;
        // Verfügbare Modelle filtern (keine mit überschrittener Tagesquota)
        const availableModels = this.models.filter(model => !model.dailyQuotaExceeded);
        // Wenn keine Modelle verfügbar sind, gib einen Fehler aus
        if (availableModels.length === 0) {
            console.error('❌ All models have exceeded their daily quota!');
            throw new Error('All Gemini models have exceeded their daily quota');
        }
        // Unter den verfügbaren Modellen das mit der geringsten Nutzung finden
        availableModels.forEach((model, indexInFiltered) => {
            const usageCount = this.modelUsageCount.get(model.name) || 0;
            if (usageCount < lowestUsage) {
                lowestUsage = usageCount;
                modelIndex = this.models.findIndex(m => m.name === model.name);
            }
        });
        // Sicherheitsprüfung, falls kein Modell gefunden wurde
        if (modelIndex === -1) {
            console.warn('⚠️ Could not find model with lowest usage, using first available model');
            modelIndex = this.models.findIndex(model => !model.dailyQuotaExceeded);
        }
        // Inkrementiere den Nutzungszähler für dieses Modell
        const selectedModel = this.models[modelIndex];
        this.modelUsageCount.set(selectedModel.name, (this.modelUsageCount.get(selectedModel.name) || 0) + 1);
        return selectedModel;
    }
    async getQuotaAwareModel(previousModel, quotaExceededError, modelsOverride) {
        // Ensure models are initialized before proceeding
        await this.ensureModelsInitialized();
        // If there was a quota exceeded error, mark the model as unavailable
        if (previousModel && quotaExceededError) {
            const isQuotaError = quotaExceededError.message &&
                (quotaExceededError.message.includes('429 Too Many Requests') ||
                    quotaExceededError.message.includes('quota') ||
                    quotaExceededError.message.includes('rate limit'));
            if (isQuotaError) {
                console.warn(`⚠️ Quota exceeded for model ${previousModel.name}. Marking as unavailable for the day.`);
                // Add a special flag to indicate this model has hit its daily quota
                previousModel.dailyQuotaExceeded = true;
                // Log which models are still available
                const availableModels = this.models.filter(m => !m.dailyQuotaExceeded);
                console.log(`Available models: ${availableModels.map(m => m.name).join(', ') || 'NONE'}`);
                if (availableModels.length === 0) {
                    console.error('❌ All models have exceeded their daily quota!');
                    throw new Error('All Gemini models have exceeded their daily quota');
                }
            }
        }
        // Filter out models that have exceeded their daily quota
        const baseModels = modelsOverride || this.models;
        const availableModels = baseModels.filter(m => !m.dailyQuotaExceeded);
        // If we have no available models, throw an error
        if (availableModels.length === 0) {
            throw new Error('All Gemini models have exceeded their daily quota');
        }
        // Copy the original getNextAvailableModel logic but only consider available models
        const now = Date.now();
        let bestModel = availableModels[0];
        let bestScore = -Infinity;
        for (const model of availableModels) {
            const timeSinceLastUse = now - model.lastUsed;
            const usageCount = this.modelUsageCount.get(model.name) || 0;
            const intervalRequired = (60 * 1000) / model.rpmLimit;
            let score = 0;
            // Priority 1: Is the model immediately available?
            const isImmediatelyAvailable = timeSinceLastUse >= intervalRequired;
            if (isImmediatelyAvailable) {
                score += 1000;
            }
            else {
                const waitTime = intervalRequired - timeSinceLastUse;
                score -= waitTime / 100;
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
    /**
     * Ensures models are initialized before use
     * @returns Promise that resolves when models are ready
     */
    async ensureModelsInitialized() {
        // If models array is empty or first model is not initialized, initialize again
        if (!this.models || this.models.length === 0 || !this.models[0].instance) {
            console.log('Models not initialized yet, initializing now...');
            const modelConfigs = [
                'gemini-2.0-flash',
                'gemini-2.5-flash',
                'gemini-2.5-pro'
            ];
            await this.initializeModels(modelConfigs);
        }
    }
}
exports.GeminiService = GeminiService;
exports.default = new GeminiService();
//# sourceMappingURL=gemini.js.map