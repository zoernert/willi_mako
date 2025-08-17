const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Pool } = require('pg');
class LLMDataExtractionService {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        // Use model from environment variable for better configuration management
        const modelName = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
        this.model = this.genAI.getGenerativeModel({ model: modelName });
        this.pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
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
            // LLM-Analyse durchführen
            const result = await this.model.generateContent(prompt);
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
            const result = await this.model.generateContent(routingPrompt);
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
            const result = await this.model.generateContent(responsePrompt);
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
            const result = await this.model.generateContent([{
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
     * Timeline-spezifische Aktivitätszusammenfassung
     * @param {string} featureType - Art des Features (chat, code_lookup, etc.)
     * @param {string} actionType - Art der Aktion
     * @param {Object} contextData - Kontextdaten der Aktivität
     * @returns {Promise<{title: string, summary: string}>} Titel und Zusammenfassung
     */
    async generateTimelineActivitySummary(featureType, actionType, contextData) {
        try {
            const prompt = this.buildTimelinePrompt(featureType, actionType, contextData);
            const fullPrompt = `Du bist ein Assistent für die Marktkommunikation bei Energieversorgern. 
Erstelle prägnante deutsche Titel und Zusammenfassungen für Benutzeraktivitäten.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem gültigen JSON-Objekt in diesem Format:
{"title": "Kurzer prägnanter Titel", "summary": "Detaillierte Zusammenfassung der Aktivität"}

Verwende KEINE Markdown-Formatierung, KEINE Code-Blöcke, nur reines JSON.

${prompt}`;
            const content = await this.generateContent(fullPrompt, {
                temperature: 0.3,
                maxOutputTokens: 300
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
                title: parsed.title || `${featureType} - ${actionType}`,
                summary: parsed.summary || 'Keine Zusammenfassung verfügbar'
            };
        }
        catch (error) {
            console.error('Error generating timeline activity summary:', error);
            return {
                title: `${featureType} - ${actionType}`,
                summary: 'AI-Zusammenfassung nicht verfügbar'
            };
        }
    }
    /**
     * Erstellt Timeline-spezifische Prompts
     */
    buildTimelinePrompt(featureType, actionType, contextData) {
        let prompt = `Feature: ${featureType}\nAktion: ${actionType}\n\n`;
        switch (featureType) {
            case 'chat':
                prompt += `Chat-Kontext:\n`;
                if (contextData.message)
                    prompt += `Nachricht: ${contextData.message}\n`;
                if (contextData.response)
                    prompt += `Antwort: ${contextData.response}\n`;
                break;
            case 'code_lookup':
                prompt += `Code-Suche:\n`;
                if (contextData.query)
                    prompt += `Suchanfrage: ${contextData.query}\n`;
                if (contextData.results)
                    prompt += `Anzahl Ergebnisse: ${contextData.results.length}\n`;
                break;
            case 'bilateral_clarifications':
                prompt += `Bilaterale Klärung:\n`;
                if (contextData.partner)
                    prompt += `Partner: ${contextData.partner}\n`;
                if (contextData.subject)
                    prompt += `Betreff: ${contextData.subject}\n`;
                break;
            case 'screenshot_analyzer':
                prompt += `Screenshot-Analyse:\n`;
                if (contextData.filename)
                    prompt += `Datei: ${contextData.filename}\n`;
                if (contextData.analysis)
                    prompt += `Analyse: ${contextData.analysis}\n`;
                break;
            case 'message_analyzer':
                prompt += `Nachrichtenanalyse:\n`;
                if (contextData.messageType)
                    prompt += `Nachrichtentyp: ${contextData.messageType}\n`;
                if (contextData.content)
                    prompt += `Inhalt: ${contextData.content.substring(0, 200)}...\n`;
                break;
            case 'notes':
                prompt += `Notizen:\n`;
                if (contextData.title)
                    prompt += `Titel: ${contextData.title}\n`;
                if (contextData.content)
                    prompt += `Inhalt: ${contextData.content.substring(0, 200)}...\n`;
                break;
            default:
                prompt += `Allgemeine Aktivität:\n`;
                if (contextData) {
                    const keys = Object.keys(contextData).slice(0, 3);
                    keys.forEach(key => {
                        if (contextData[key]) {
                            prompt += `${key}: ${String(contextData[key]).substring(0, 100)}\n`;
                        }
                    });
                }
        }
        return prompt;
    }
    /**
     * Health Check für den Service
     */
    async healthCheck() {
        try {
            // Test LLM-Verbindung
            const testResult = await this.model.generateContent('Test connection. Respond with: OK');
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
module.exports = LLMDataExtractionService;
//# sourceMappingURL=llmDataExtractionService.js.map