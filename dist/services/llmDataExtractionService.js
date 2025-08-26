const { Pool } = require('pg');
const googleAIKeyManager = require('./googleAIKeyManager');
class LLMDataExtractionService {
    constructor() {
        // Use model from environment variable for better configuration management
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
        // Use the key manager to get the model with appropriate API key
        this.initializeModel(modelName);
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    /**
     * Initializes the LLM model using the key manager to handle API key selection
     * @param {string} modelName - Name of the model to use
     */
    async initializeModel(modelName) {
        try {
            this.model = await googleAIKeyManager.getGenerativeModel({ model: modelName });
            console.log(`LLMDataExtractionService initialized with model ${modelName}`);
        }
        catch (error) {
            console.error('Error initializing LLM model:', error);
            throw new Error('Failed to initialize LLM model');
        }
    }
    /**
     * Extrahiert strukturierte Daten aus einer E-Mail
     * @param {Object} email - E-Mail-Objekt mit subject, text, html, from
     * @param {string} teamId - ID des Teams für context-spezifische Extraktion
     * @returns {Promise<Object>} Extrahierte Daten
     */
    async extractDataFromEmail(email, teamId) {
        try {
            // Cache-Lookup
            const cacheKey = this.generateCacheKey(email);
            const cachedResult = await this.getCachedExtraction(cacheKey);
            if (cachedResult) {
                console.log('Returning cached LLM extraction result');
                return cachedResult;
            }
            // Team-Kontext laden für bessere Extraktion
            const teamContext = await this.getTeamContext(teamId);
            // LLM-Prompt für Datenextraktion erstellen
            const prompt = this.buildExtractionPrompt(email, teamContext);
            // LLM-Analyse durchführen mit sicherer Generierung und Keymanagement
            const result = await this.safeGenerateContent(prompt);
            const response = await result.response;
            const extractedData = this.parseExtractionResponse(response.text());
            // Ergebnis cachen
            await this.cacheExtraction(cacheKey, extractedData, teamId);
            return extractedData;
        }
        catch (error) {
            console.error('Error in LLM data extraction:', error);
            throw new Error(`LLM extraction failed: ${error.message}`);
        }
    }
    /**
     * Erstellt einen strukturierten Prompt für die Datenextraktion
     */
    buildExtractionPrompt(email, teamContext) {
        var _a, _b;
        return `
Du bist ein Experte für die Analyse von E-Mails im Energiesektor. Extrahiere folgende Informationen aus der E-Mail:

TEAM-KONTEXT:
- Team: ${teamContext.name}
- Zuständige Bereiche: ${((_a = teamContext.responsibilities) === null || _a === void 0 ? void 0 : _a.join(', ')) || 'Allgemein'}
- Typische Marktpartner: ${((_b = teamContext.commonPartners) === null || _b === void 0 ? void 0 : _b.join(', ')) || 'Nicht spezifiziert'}

E-MAIL-DATEN:
Betreff: ${email.subject}
Von: ${email.from}
Text: ${email.text || email.html}

EXTRAKTIONS-AUFGABEN:
1. **Marktpartner-Identifikation:**
   - Name des Marktpartners
   - E-Mail-Domain
   - Bekannte Codes (BDEW, EIC, etc.)

2. **Referenz-Extraktion:**
   - Vorgangsnummern/IDs
   - Zählpunkte/MSB-IDs
   - Lieferstellennummern
   - Abrechnungsperioden/Zeiträume

3. **Klärfall-Klassifikation:**
   - Kategorie (Abrechnung, Lieferantenwechsel, Messstellenbetrieb, etc.)
   - Priorität (Niedrig, Normal, Hoch, Kritisch)
   - Geschätzter Arbeitsaufwand (Gering, Mittel, Hoch)

4. **Inhaltliche Analyse:**
   - Kurze Zusammenfassung des Problems
   - Erkannte Fragen/Klärungspunkte
   - Vorgeschlagene nächste Schritte

5. **Automatisierungs-Potential:**
   - Kann automatisch bearbeitet werden? (Ja/Nein)
   - Standardantwort möglich? (Ja/Nein)
   - Weiterleitung erforderlich? (Ja/Nein und wohin)

Antworte ausschließlich im folgenden JSON-Format:
{
  "marktpartner": {
    "name": "string",
    "domain": "string",
    "codes": ["string"]
  },
  "referenzen": {
    "vorgangsnummern": ["string"],
    "zählpunkte": ["string"],
    "lieferstellen": ["string"],
    "zeiträume": ["string"]
  },
  "klassifikation": {
    "kategorie": "string",
    "priorität": "string",
    "arbeitsaufwand": "string"
  },
  "inhalt": {
    "zusammenfassung": "string",
    "klärungspunkte": ["string"],
    "nächsteSchritte": ["string"]
  },
  "automatisierung": {
    "autoBearbeitung": boolean,
    "standardAntwort": boolean,
    "weiterleitung": {
      "erforderlich": boolean,
      "ziel": "string"
    }
  },
  "confidence": number
}
`;
    }
    /**
     * Parst die LLM-Antwort in strukturierte Daten
     */
    parseExtractionResponse(response) {
        try {
            // JSON aus der Antwort extrahieren
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in LLM response');
            }
            const extractedData = JSON.parse(jsonMatch[0]);
            // Validierung und Standardwerte
            return {
                marktpartner: extractedData.marktpartner || {},
                referenzen: extractedData.referenzen || {},
                klassifikation: extractedData.klassifikation || {},
                inhalt: extractedData.inhalt || {},
                automatisierung: extractedData.automatisierung || {},
                confidence: extractedData.confidence || 0.5,
                extractedAt: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Error parsing LLM response:', error);
            // Fallback bei Parse-Fehlern
            return {
                marktpartner: {},
                referenzen: {},
                klassifikation: { kategorie: 'Unbekannt', priorität: 'Normal' },
                inhalt: { zusammenfassung: 'Automatische Extraktion fehlgeschlagen' },
                automatisierung: { autoBearbeitung: false, standardAntwort: false },
                confidence: 0.1,
                extractedAt: new Date().toISOString(),
                error: error.message
            };
        }
    }
    /**
     * Lädt Team-Kontext für bessere Extraktion
     */
    async getTeamContext(teamId) {
        var _a, _b;
        try {
            const result = await this.pool.query(`
                SELECT 
                    t.name,
                    t.description,
                    array_agg(DISTINCT tr.responsibility) as responsibilities,
                    array_agg(DISTINCT mp.name) as common_partners
                FROM teams t
                LEFT JOIN team_responsibilities tr ON t.id = tr.team_id
                LEFT JOIN team_market_partners tmp ON t.id = tmp.team_id
                LEFT JOIN market_partners mp ON tmp.partner_id = mp.id
                WHERE t.id = $1
                GROUP BY t.id, t.name, t.description
            `, [teamId]);
            if (result.rows.length === 0) {
                return { name: 'Unbekannt' };
            }
            return {
                name: result.rows[0].name,
                description: result.rows[0].description,
                responsibilities: ((_a = result.rows[0].responsibilities) === null || _a === void 0 ? void 0 : _a.filter(r => r)) || [],
                commonPartners: ((_b = result.rows[0].common_partners) === null || _b === void 0 ? void 0 : _b.filter(p => p)) || []
            };
        }
        catch (error) {
            console.error('Error loading team context:', error);
            return { name: 'Unbekannt' };
        }
    }
    /**
     * Generiert Cache-Schlüssel für E-Mail
     */
    generateCacheKey(email) {
        const crypto = require('crypto');
        const content = `${email.subject}_${email.from}_${email.text || email.html}`;
        return crypto.createHash('md5').update(content).digest('hex');
    }
    /**
     * Lädt gecachte Extraktion
     */
    async getCachedExtraction(cacheKey) {
        try {
            const result = await this.pool.query(`
                SELECT extracted_data, confidence, created_at
                FROM llm_extraction_cache
                WHERE cache_key = $1 
                AND created_at > NOW() - INTERVAL '7 days'
                ORDER BY created_at DESC
                LIMIT 1
            `, [cacheKey]);
            if (result.rows.length > 0) {
                return {
                    ...result.rows[0].extracted_data,
                    cached: true,
                    cacheDate: result.rows[0].created_at
                };
            }
            return null;
        }
        catch (error) {
            console.error('Error loading cached extraction:', error);
            return null;
        }
    }
    /**
     * Speichert Extraktion im Cache
     */
    async cacheExtraction(cacheKey, extractedData, teamId) {
        try {
            await this.pool.query(`
                INSERT INTO llm_extraction_cache (
                    cache_key, 
                    team_id, 
                    extracted_data, 
                    confidence, 
                    created_at
                ) VALUES ($1, $2, $3, $4, NOW())
                ON CONFLICT (cache_key) 
                DO UPDATE SET 
                    extracted_data = EXCLUDED.extracted_data,
                    confidence = EXCLUDED.confidence,
                    created_at = EXCLUDED.created_at
            `, [cacheKey, teamId, JSON.stringify(extractedData), extractedData.confidence]);
        }
        catch (error) {
            console.error('Error caching extraction:', error);
            // Nicht kritisch - weiter ohne Cache
        }
    }
    /**
     * Analysiert E-Mail für automatische Weiterleitung
     */
    async analyzeForRouting(email, extractedData) {
        var _a, _b, _c;
        try {
            const routingPrompt = `
Basierend auf folgenden Informationen, bestimme die optimale Weiterleitung:

E-Mail: ${email.subject}
Kategorie: ${(_a = extractedData.klassifikation) === null || _a === void 0 ? void 0 : _a.kategorie}
Marktpartner: ${(_b = extractedData.marktpartner) === null || _b === void 0 ? void 0 : _b.name}

Verfügbare Teams und ihre Zuständigkeiten:
- Team Netz: Netzentgelte, Messstellenbetrieb, technische Anfragen
- Team Vertrieb: Lieferantenwechsel, Kundenanfragen, Verträge  
- Team Abrechnung: Rechnungsfragen, Abrechnungsperioden, Zahlungen
- Team Regulatorik: Compliance, Meldewesen, regulatorische Anfragen

Antworte nur mit dem Team-Namen oder "MANUAL" für manuelle Zuordnung.
            `;
            const result = await this.safeGenerateContent(routingPrompt);
            const response = await result.response;
            const teamSuggestion = response.text().trim();
            return {
                suggestedTeam: teamSuggestion,
                confidence: extractedData.confidence,
                reasoning: `Basierend auf Kategorie: ${(_c = extractedData.klassifikation) === null || _c === void 0 ? void 0 : _c.kategorie}`
            };
        }
        catch (error) {
            console.error('Error in routing analysis:', error);
            return {
                suggestedTeam: 'MANUAL',
                confidence: 0.1,
                reasoning: 'Automatische Zuordnung fehlgeschlagen'
            };
        }
    }
    /**
     * Schlägt Standardantworten vor
     */
    async suggestStandardResponse(email, extractedData) {
        var _a, _b, _c, _d;
        try {
            if (!((_a = extractedData.automatisierung) === null || _a === void 0 ? void 0 : _a.standardAntwort)) {
                return null;
            }
            const responsePrompt = `
Erstelle eine professionelle Standardantwort für folgende E-Mail:

Original: ${email.subject}
Kategorie: ${(_b = extractedData.klassifikation) === null || _b === void 0 ? void 0 : _b.kategorie}
Klärungspunkte: ${(_d = (_c = extractedData.inhalt) === null || _c === void 0 ? void 0 : _c.klärungspunkte) === null || _d === void 0 ? void 0 : _d.join(', ')}

Die Antwort soll:
- Höflich und professionell sein
- Den Empfang bestätigen
- Nächste Schritte kommunizieren
- Bei Bedarf um zusätzliche Informationen bitten

Schreibe nur die E-Mail-Antwort, ohne zusätzliche Erklärungen.
            `;
            const result = await this.safeGenerateContent(responsePrompt);
            const response = await result.response;
            return {
                subject: `Re: ${email.subject}`,
                body: response.text().trim(),
                confidence: extractedData.confidence * 0.8, // Etwas weniger sicher bei Antworten
                suggestedAt: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Error generating standard response:', error);
            return null;
        }
    }
    /**
     * Generische LLM-Content-Generierung für verschiedene Features
     * @param {string} prompt - Der Prompt für das LLM
     * @param {Object} options - Optionale Konfiguration
     * @returns {Promise<string>} Generierter Content
     */
    async generateContent(prompt, options = {}) {
        try {
            const config = {
                temperature: options.temperature || 0.3,
                maxOutputTokens: options.maxOutputTokens || 500,
                ...options.generationConfig
            };
            const result = await this.safeGenerateContent([{
                    text: prompt
                }], { generationConfig: config });
            const response = await result.response;
            const content = response.text();
            if (!content) {
                throw new Error('Keine Antwort vom LLM erhalten');
            }
            return content;
        }
        catch (error) {
            console.error('Error in generic LLM content generation:', error);
            throw new Error(`LLM content generation failed: ${error.message}`);
        }
    }
    /**
     * Safely generate content with automatic retry and key management
     * @param {string|object} prompt - The prompt to send to the LLM
     * @returns {Promise<Object>} - The LLM response
     */
    async safeGenerateContent(prompt) {
        try {
            // First try with current model (which might be using the free key)
            return await this.model.generateContent(prompt);
        }
        catch (error) {
            // Check for quota/rate limiting specific errors
            const isQuotaError = error.message.includes('quota') ||
                error.message.includes('rate') ||
                error.message.includes('limit') ||
                error.message.includes('429');
            if (isQuotaError) {
                console.log('API quota or rate limit reached, switching to paid key:', error.message);
            }
            else {
                console.log('Error in content generation, retrying with updated model:', error.message);
            }
            // If error occurs, try to re-initialize the model (potentially switching to paid key)
            const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
            await this.initializeModel(modelName);
            // Retry with potentially new API key
            return await this.model.generateContent(prompt);
        }
    }
    /**
     * Timeline-spezifische Aktivitätszusammenfassung
     * @param {string} featureType - Art des Features (chat, code_lookup, etc.)
     * @param {string} actionType - Art der Aktion
     * @param {Object} contextData - Kontextdaten der Aktivität
     * @returns {Promise<{title: string, summary: string}>} Titel und Zusammenfassung
     */
    async generateTimelineActivitySummary(featureType, actionType, contextData) {
        try {
            // Build detailed, context-specific prompt based on activity type
            const detailedPrompt = this.buildDetailedTimelinePrompt(actionType, contextData);
            const fullPrompt = `Du bist ein KI-Assistent für die Marktkommunikation in der Energiewirtschaft. 
Erstelle eine prägnante, professionelle Zusammenfassung (max. 200 Wörter) der folgenden Aktivität für die Timeline-Dokumentation.

Fokussiere dich auf:
- Wichtige Erkenntnisse und Entscheidungen
- Relevante Marktpartner oder Codes
- Nächste Schritte oder offene Punkte
- Geschäftskritische Informationen

WICHTIG: Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt in diesem Format:
{"title": "Kurzer prägnanter Titel", "summary": "Detaillierte Zusammenfassung der Aktivität"}

Verwende KEINE Markdown-Formatierung, KEINE Code-Blöcke, nur reines JSON.

${detailedPrompt}`;
            const content = await this.generateContent(fullPrompt, {
                temperature: 0.3,
                maxOutputTokens: 512
            });
            // Clean content - remove any potential markdown formatting
            let cleanContent = content.trim();
            // Remove common markdown artifacts and code blocks
            cleanContent = cleanContent.replace(/^```json\s*/gim, '');
            cleanContent = cleanContent.replace(/^```\s*/gim, '');
            cleanContent = cleanContent.replace(/\s*```$/gim, '');
            cleanContent = cleanContent.replace(/^\s*json\s*/gim, '');
            cleanContent = cleanContent.replace(/```json/gi, '');
            cleanContent = cleanContent.replace(/```/g, '');
            // Remove any leading/trailing text that's not JSON
            const jsonStart = cleanContent.indexOf('{');
            const jsonEnd = cleanContent.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                cleanContent = cleanContent.substring(jsonStart, jsonEnd + 1);
            }
            // Additional cleanup - remove any remaining non-JSON artifacts
            cleanContent = cleanContent.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
            const parsed = JSON.parse(cleanContent);
            return {
                title: parsed.title || this.generateTitleForActivityType(actionType, contextData),
                summary: parsed.summary || 'Keine Zusammenfassung verfügbar'
            };
        }
        catch (error) {
            console.error('Error generating timeline activity summary:', error);
            return {
                title: this.generateTitleForActivityType(actionType, contextData),
                summary: 'AI-Zusammenfassung nicht verfügbar'
            };
        }
    }
    /**
     * Erstellt detaillierte Timeline-spezifische Prompts basierend auf Aktivitätstyp
     */
    buildDetailedTimelinePrompt(activityType, rawData) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
        let prompt = `Aktivitätstyp: ${activityType}\n\n`;
        switch (activityType) {
            case 'message':
            case 'chat_message':
                prompt += `Chat-Nachricht Kontext:
- Chat-Titel: ${rawData.chatTitle || 'Keine Bezeichnung'}
- Benutzer-Nachricht: ${rawData.userMessage || 'Keine Nachricht'}
- Assistent-Antwort: ${((_a = rawData.assistantMessage) === null || _a === void 0 ? void 0 : _a.substring(0, 500)) + (((_b = rawData.assistantMessage) === null || _b === void 0 ? void 0 : _b.length) > 500 ? '...' : '') || 'Keine Antwort'}
- Nachrichtentyp: ${rawData.messageType || 'normal'}
- Zeitstempel: ${rawData.timestamp || 'unbekannt'}
- Kontext-Einstellungen: ${rawData.contextSettings ? JSON.stringify(rawData.contextSettings, null, 2) : 'Standard'}

Erstelle eine prägnante Zusammenfassung dieser Chat-Interaktion. Fokussiere dich auf:
1. Das Hauptthema der Unterhaltung
2. Die wichtigsten behandelten Punkte oder Nachrichtenformate
3. Relevante Erkenntnisse für die Marktkommunikation
4. Handlungsempfehlungen oder nächste Schritte (falls erkennbar)`;
                break;
            case 'chat_session':
                prompt += `Chat-Session Daten:
- Chat-Titel: ${rawData.chatTitle || 'Keine Bezeichnung'}
- Anzahl Nachrichten: ${rawData.message_count || 'unbekannt'}
- Dauer: ${rawData.duration || 'unbekannt'}
- Hauptthemen: ${((_c = rawData.topics) === null || _c === void 0 ? void 0 : _c.join(', ')) || 'keine spezifiziert'}
- Letzter Kontext: ${rawData.last_context || 'kein Kontext'}

Erstelle eine Zusammenfassung der wichtigsten Gesprächsinhalte und Erkenntnisse.`;
                break;
            case 'create_clarification':
                prompt += `Bilaterale Klärung aus Chat-Kontext:
- Chat-ID: ${rawData.chatId || 'Unbekannt'}
- Chat-Titel: ${rawData.chatTitle || 'Keine Bezeichnung'}
- Zeitpunkt: ${rawData.timestamp || new Date().toISOString()}
- Marktpartner: ${rawData.marketPartner || 'Nicht angegeben'}
- Chat-Inhalt: ${((_d = rawData.content) === null || _d === void 0 ? void 0 : _d.substring(0, 4000)) || 'Kein Inhalt'}

Erstelle eine ausführliche und fachlich korrekte Zusammenfassung dieses Chats für eine bilaterale Klärung. 
Die Zusammenfassung sollte einem anderen Marktkommunikations-Experten das Problem präzise vermitteln.

Fokussiere dich auf:
- Eindeutige Problemstellung und Ausgangssituation
- Relevante Prozessschritte und EDIFACT-Nachrichten
- Erkannte technische Details wie Messlokations-IDs, Marktlokations-IDs oder Transaktionsnummern
- Bisherige Lösungsversuche oder Hindernisse
- Aktueller Stand und nächste Schritte für die Klärung`;
                break;
            case 'code_lookup':
            case 'search':
                prompt += `Marktpartner-Suche:
- Suchterm: ${rawData.searchTerm || rawData.query || 'unbekannt'}
- Gesuchte Codes: ${((_e = rawData.searched_codes) === null || _e === void 0 ? void 0 : _e.join(', ')) || 'keine'}
- Gefundene Marktpartner: ${((_f = rawData.found_partners) === null || _f === void 0 ? void 0 : _f.length) || ((_g = rawData.results) === null || _g === void 0 ? void 0 : _g.length) || 0}
- Anzahl Treffer: ${rawData.count || ((_h = rawData.results) === null || _h === void 0 ? void 0 : _h.length) || 0}
- Suchkriterien: ${JSON.stringify(rawData.search_criteria || {})}

Fasse die wichtigsten gefundenen Informationen und deren Relevanz zusammen.`;
                break;
            case 'bilateral_clarification':
            case 'status':
                prompt += `Bilaterale Klärung:
- Partner: ${rawData.partner_name || rawData.partner || 'unbekannt'}
- Status: ${rawData.status || 'unbekannt'}
- Thema: ${rawData.subject || 'kein Thema'}
- Kommentar: ${rawData.comment || 'kein Kommentar'}
- Beteiligte: ${((_j = rawData.participants) === null || _j === void 0 ? void 0 : _j.join(', ')) || 'keine angegeben'}
- Erkenntnisse: ${rawData.findings || 'keine'}

Fasse den aktuellen Stand und die wichtigsten Erkenntnisse zusammen.`;
                break;
            case 'screenshot_analysis':
            case 'result':
                prompt += `Screenshot-Analyse:
- Dateiname: ${rawData.filename || 'unbekannt'}
- Extrahierte Texte: ${rawData.extractedText || 'keine'}
- KI-Analyse: ${rawData.analysis || rawData.analysis_result || 'kein Ergebnis'}
- Konfidenz: ${rawData.confidence || 'unbekannt'}
- Erkannte Elemente: ${((_k = rawData.detected_elements) === null || _k === void 0 ? void 0 : _k.join(', ')) || 'keine'}
- Kontext: ${rawData.context || 'kein Kontext'}

Fasse die wichtigsten Erkenntnisse aus der Analyse zusammen.`;
                break;
            case 'message_analysis':
            case 'analysis':
                prompt += `Nachrichten-Analyse:
- Nachricht: ${((_l = rawData.message) === null || _l === void 0 ? void 0 : _l.substring(0, 200)) + (((_m = rawData.message) === null || _m === void 0 ? void 0 : _m.length) > 200 ? '...' : '') || 'keine'}
- Nachrichtentyp: ${rawData.message_type || rawData.messageType || 'unbekannt'}
- Kategorien: ${((_o = rawData.categories) === null || _o === void 0 ? void 0 : _o.join(', ')) || 'keine'}
- Sentiment: ${rawData.sentiment || 'unbekannt'}
- Priorität: ${rawData.priority || 'normal'}
- Analyseergebnis: ${rawData.analysis_result || 'kein Ergebnis'}
- Wichtige Punkte: ${((_p = rawData.key_points) === null || _p === void 0 ? void 0 : _p.join(', ')) || 'keine'}

Fasse die wichtigsten Erkenntnisse und Handlungsempfehlungen zusammen.`;
                break;
            case 'notes':
                prompt += `Notizen-Aktivität:
- Anzahl Notizen: ${rawData.note_count || 'unbekannt'}
- Kategorien: ${((_q = rawData.categories) === null || _q === void 0 ? void 0 : _q.join(', ')) || 'keine'}
- Wichtige Stichworte: ${((_r = rawData.keywords) === null || _r === void 0 ? void 0 : _r.join(', ')) || 'keine'}

Fasse die wichtigsten dokumentierten Informationen zusammen.`;
                break;
            default:
                prompt += `Allgemeine Aktivität:
${JSON.stringify(rawData, null, 2)}

Fasse die wichtigsten Aspekte dieser Aktivität zusammen.`;
                break;
        }
        return prompt;
    }
    /**
     * Generiert einen informativen Titel basierend auf dem Aktivitätstyp und Raw-Daten
     */
    generateTitleForActivityType(activityType, rawData) {
        var _a;
        switch (activityType) {
            case 'message':
            case 'chat_message':
                // Für Chat-Nachrichten: Nutze Chat-Titel oder ersten Teil der User-Message
                if (rawData.chatTitle && rawData.chatTitle !== 'Neue Unterhaltung') {
                    return `Chat: ${rawData.chatTitle}`;
                }
                else if (rawData.userMessage) {
                    const userMsg = rawData.userMessage.substring(0, 60);
                    return `Chat: ${userMsg}${userMsg.length >= 60 ? '...' : ''}`;
                }
                else {
                    return 'Chat-Nachricht';
                }
            case 'create_clarification':
                // Für bilaterale Klärungen: Nutze Marktpartner und Chat-Titel
                let title = 'Bilaterale Klärung';
                if (rawData.marketPartner) {
                    title += ` mit ${rawData.marketPartner}`;
                }
                if (rawData.content) {
                    // Versuche das Hauptthema aus dem Inhalt zu extrahieren
                    const contentPreview = rawData.content.substring(0, 80);
                    if (contentPreview.includes('UTILMD')) {
                        title += `: UTILMD-Prozess`;
                    }
                    else if (contentPreview.includes('MSCONS')) {
                        title += `: MSCONS-Prozess`;
                    }
                    else if (contentPreview.includes('APERAK')) {
                        title += `: APERAK-Meldung`;
                    }
                    else {
                        // Nutze die ersten Wörter des Inhalts
                        const firstLine = rawData.content.split('\n')[0] || '';
                        const preview = firstLine.substring(0, 40);
                        title += `: ${preview}${preview.length >= 40 ? '...' : ''}`;
                    }
                }
                return title;
            case 'chat_session':
                if (rawData.chatTitle) {
                    return `Chat-Session: ${rawData.chatTitle}`;
                }
                return `Chat-Session (${rawData.message_count || 0} Nachrichten)`;
            case 'code_lookup':
            case 'search':
                if (rawData.searchTerm || rawData.query) {
                    return `Marktpartner-Suche: ${rawData.searchTerm || rawData.query}`;
                }
                else if ((_a = rawData.searched_codes) === null || _a === void 0 ? void 0 : _a.length) {
                    return `Code-Lookup: ${rawData.searched_codes.join(', ')}`;
                }
                return 'Marktpartner-Suche';
            case 'bilateral_clarification':
            case 'status':
                if (rawData.subject) {
                    return `Bilaterale Klärung: ${rawData.subject}`;
                }
                else if (rawData.partner_name || rawData.partner) {
                    return `Bilaterale Klärung: ${rawData.partner_name || rawData.partner}`;
                }
                return 'Bilaterale Klärung';
            case 'screenshot_analysis':
            case 'result':
                if (rawData.filename) {
                    return `Screenshot-Analyse: ${rawData.filename}`;
                }
                return 'Screenshot-Analyse durchgeführt';
            case 'message_analysis':
            case 'analysis':
                if (rawData.messageType && rawData.messageType !== 'normal') {
                    return `Nachrichten-Analyse: ${rawData.messageType}`;
                }
                else if (rawData.message_type) {
                    return `Nachrichten-Analyse: ${rawData.message_type}`;
                }
                return 'Nachrichten-Analyse';
            case 'notes':
                if (rawData.title) {
                    return `Notiz: ${rawData.title}`;
                }
                return `Notizen erstellt (${rawData.note_count || 0})`;
            default:
                // Fallback: Versuche Feature-Name und Activity-Type zu kombinieren
                const feature = rawData.feature || 'Unbekannt';
                return `${feature}: ${activityType}`;
        }
    }
    /**
     * Health Check für den Service
     */
    async healthCheck() {
        try {
            // Test LLM-Verbindung
            const testResult = await this.safeGenerateContent('Test connection. Respond with: OK');
            const response = await testResult.response;
            // Test DB-Verbindung
            await this.pool.query('SELECT 1');
            return {
                status: 'healthy',
                llm: response.text().includes('OK') ? 'connected' : 'limited',
                database: 'connected',
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
}
// Singleton-Instanz
let instance = null;
module.exports = function getInstance() {
    if (!instance) {
        console.log('Creating singleton instance of LLMDataExtractionService');
        instance = new LLMDataExtractionService();
    }
    return instance;
};
//# sourceMappingURL=llmDataExtractionService.js.map