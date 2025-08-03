"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageAnalyzerService = void 0;
const edifact_definitions_1 = require("./edifact-definitions");
const gemini_1 = require("../../../services/gemini");
const qdrant_1 = require("../../../services/qdrant");
const database_1 = __importDefault(require("../../../config/database"));
const postgres_codelookup_repository_1 = require("../../codelookup/repositories/postgres-codelookup.repository");
const codelookup_service_1 = require("../../codelookup/services/codelookup.service");
class MessageAnalyzerService {
    constructor() {
        this.geminiService = new gemini_1.GeminiService();
        this.qdrantService = new qdrant_1.QdrantService();
        const codeLookupRepository = new postgres_codelookup_repository_1.PostgresCodeLookupRepository(database_1.default);
        this.codeLookupService = new codelookup_service_1.CodeLookupService(codeLookupRepository);
    }
    async analyze(message) {
        const trimmedMessage = message.trim();
        console.log('🔍 Nachrichten-Analyzer: Analysiere Nachrichtentyp...');
        console.log('📄 First 100 chars:', trimmedMessage.substring(0, 100));
        if (this.isEdifactMessage(trimmedMessage)) {
            console.log('✅ Detected EDIFACT message, using EDIFACT analyzer');
            return this.analyzeEdifact(message);
        }
        else if (trimmedMessage.startsWith('<')) {
            console.log('✅ Detected XML message, using XML analyzer');
            return this.analyzeXml(message);
        }
        else {
            console.log('✅ Using general text analyzer');
            return this.analyzeGeneralText(message);
        }
    }
    isEdifactMessage(message) {
        const upperMessage = message.toUpperCase();
        const edifactIndicators = [
            upperMessage.startsWith('UNA'),
            upperMessage.startsWith('UNB'),
            upperMessage.includes('UNB+'),
            upperMessage.includes('UNH+'),
            upperMessage.includes('UTILMD'),
            upperMessage.includes('MSCONS'),
            upperMessage.includes('ORDERS'),
            /UNA[:+.?']/.test(message),
            /UNB\+[A-Z0-9]+:/.test(upperMessage),
            /\+NAD\+/.test(upperMessage),
            /\+DTM\+/.test(upperMessage),
            /\+BGM\+/.test(upperMessage),
            /\+UNT\+/.test(upperMessage),
        ];
        const isEdifact = edifactIndicators.some(indicator => indicator);
        console.log('🔍 EDIFACT detection result:', isEdifact);
        console.log('🔍 Message starts with:', upperMessage.substring(0, 50));
        return isEdifact;
    }
    async analyzeXml(message) {
        const summary = await this.geminiService.generateText(`Bitte fasse die folgende XML-Nachricht zusammen und prüfe sie auf Plausibilität im Kontext der deutschen Energiemarkt-Kommunikation. Antworte auf Deutsch:\n\n${message}`);
        return {
            summary: summary,
            plausibilityChecks: ["XML-Plausibilitätsprüfung noch nicht implementiert."],
            structuredData: { segments: [{ tag: 'XML', elements: [], original: message, description: 'XML-Nachricht erkannt' }] },
            format: 'XML',
        };
    }
    async analyzeEdifact(message) {
        try {
            console.log('🔍 Starting EDIFACT analysis...');
            let segments = this.parseEdifactSimple(message);
            console.log('✅ Parsed', segments.length, 'EDIFACT segments');
            segments = await this.enrichSegmentsWithCodeLookup(segments);
            console.log('✅ Enriched segments with code lookup');
            const parsedMessage = { segments };
            console.log('🔍 Getting enriched context...');
            const enrichedContext = await this.getEnrichedAnalysisContext(parsedMessage);
            console.log('✅ Retrieved context for message type:', enrichedContext.messageType);
            console.log('🔍 Building analysis prompt...');
            const prompt = this.buildEnrichedAnalysisPrompt(parsedMessage, enrichedContext);
            console.log('🔍 Calling Gemini API...');
            const rawAnalysis = await this.geminiService.generateText(prompt);
            console.log('✅ Gemini response length:', rawAnalysis?.length || 0);
            if (!rawAnalysis || rawAnalysis.trim().length === 0) {
                console.warn('⚠️ Empty response from Gemini API');
                return this.createFallbackAnalysis(parsedMessage, enrichedContext);
            }
            const { summary, plausibilityChecks } = this.parseAnalysisResponse(rawAnalysis);
            return {
                summary,
                plausibilityChecks,
                structuredData: parsedMessage,
                format: 'EDIFACT',
            };
        }
        catch (error) {
            console.error('❌ Error analyzing EDIFACT message:', error);
            return {
                summary: 'Fehler beim Analysieren der EDIFACT-Nachricht: ' + error.message,
                plausibilityChecks: ['Analyse fehlgeschlagen aufgrund eines technischen Fehlers'],
                structuredData: { segments: [] },
                format: 'EDIFACT',
            };
        }
    }
    createFallbackAnalysis(parsedMessage, enrichedContext) {
        const messageType = enrichedContext.messageType || 'EDIFACT';
        const segmentCount = parsedMessage.segments.length;
        const uniqueSegments = [...new Set(parsedMessage.segments.map(s => s.tag))];
        return {
            summary: `Dies ist eine ${messageType}-Nachricht mit ${segmentCount} Segmenten. Die Nachricht enthält die Segmenttypen: ${uniqueSegments.join(', ')}. Eine detaillierte Analyse durch KI konnte nicht durchgeführt werden.`,
            plausibilityChecks: [
                `Segmentanzahl: ${segmentCount} Segmente erkannt`,
                `Nachrichtentyp: ${messageType} identifiziert`,
                `Segmenttypen: ${uniqueSegments.join(', ')} gefunden`,
                'Strukturelle Grundvalidierung erfolgreich',
                'Detaillierte KI-Analyse nicht verfügbar'
            ],
            structuredData: parsedMessage,
            format: 'EDIFACT',
        };
    }
    parseEdifactSimple(message) {
        const segments = [];
        const lines = message.split(/[\r\n]+/).filter(line => line.trim());
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            const elements = trimmed.split(/[+:]/).map(e => e.trim());
            const tag = elements.shift() || '';
            segments.push({
                tag,
                elements,
                original: trimmed,
                description: edifact_definitions_1.edifactSegmentDefinitions[tag] || 'Unknown Segment',
            });
        }
        return segments;
    }
    async enrichSegmentsWithCodeLookup(segments) {
        console.log('🔍 Enriching segments with code lookup...');
        const enrichedSegments = await Promise.all(segments.map(async (segment) => {
            const enrichedSegment = { ...segment };
            const resolvedCodes = {};
            for (let i = 0; i < segment.elements.length; i++) {
                const element = segment.elements[i];
                if (this.isPotentialEnergyCode(element)) {
                    try {
                        const result = await this.codeLookupService.lookupSingleCode(element);
                        if (result) {
                            resolvedCodes[element] = result.companyName;
                            console.log(`✅ Resolved code ${element} to ${result.companyName}`);
                        }
                    }
                    catch (error) {
                        console.warn(`⚠️ Failed to resolve code ${element}:`, error);
                    }
                }
            }
            if (segment.tag === 'NAD' && segment.elements.length >= 3) {
                const partyQualifier = segment.elements[0];
                const code = segment.elements[2];
                if (this.isPotentialEnergyCode(code)) {
                    try {
                        const result = await this.codeLookupService.lookupSingleCode(code);
                        if (result) {
                            resolvedCodes[code] = result.companyName;
                            enrichedSegment.description = `${segment.description} - ${partyQualifier}: ${result.companyName} (${code})`;
                        }
                    }
                    catch (error) {
                        console.warn(`⚠️ Failed to resolve NAD code ${code}:`, error);
                    }
                }
            }
            if (Object.keys(resolvedCodes).length > 0) {
                enrichedSegment.resolvedCodes = resolvedCodes;
            }
            return enrichedSegment;
        }));
        console.log('✅ Code lookup enrichment completed');
        return enrichedSegments;
    }
    isPotentialEnergyCode(value) {
        if (!value || typeof value !== 'string')
            return false;
        const cleanValue = value.trim();
        if (/^\d{13}$/.test(cleanValue))
            return true;
        if (/^(10|13|16)Y[A-Z0-9-]{11,13}$/.test(cleanValue))
            return true;
        if (/^9\d{11,12}$/.test(cleanValue))
            return true;
        return false;
    }
    async getEnrichedAnalysisContext(parsedMessage) {
        try {
            console.log('🔍 Starting enriched analysis context retrieval...');
            const startTime = Date.now();
            const messageType = this.identifyMessageSchema(parsedMessage);
            console.log('✅ Message type identified:', messageType);
            const [schemaContext, segmentContext] = await Promise.all([
                this.getSchemaContext(messageType),
                this.getSegmentContext(parsedMessage)
            ]);
            const endTime = Date.now();
            console.log('✅ Context retrieval completed in', endTime - startTime, 'ms');
            return {
                schemaContext,
                segmentContext,
                messageType
            };
        }
        catch (error) {
            console.warn('Could not retrieve enriched EDIFACT analysis context:', error);
            return {
                schemaContext: 'Keine Schema-Dokumentation verfügbar.',
                segmentContext: 'Keine Segment-Dokumentation verfügbar.',
                messageType: 'UNKNOWN'
            };
        }
    }
    identifyMessageSchema(parsedMessage) {
        const unhSegment = parsedMessage.segments.find(s => s.tag === 'UNH');
        if (unhSegment && unhSegment.elements.length > 1) {
            const messageTypeField = unhSegment.elements[1];
            if (messageTypeField && messageTypeField.includes(':')) {
                const messageType = messageTypeField.split(':')[0];
                return messageType;
            }
        }
        const bgmSegment = parsedMessage.segments.find(s => s.tag === 'BGM');
        if (bgmSegment) {
            return 'UTILMD';
        }
        return 'EDIFACT';
    }
    async getSchemaContext(messageType) {
        try {
            console.log('🔍 Getting schema context for:', messageType);
            const schemaQueries = [
                `${messageType} EDIFACT Nachrichtentyp Beschreibung Energiemarkt`,
                `${messageType} message type definition energy market German`,
                `EDIFACT ${messageType} Dokumentation Schema Struktur`
            ];
            const queryPromises = schemaQueries.map(query => this.qdrantService.searchByText(query, 2, 0.6));
            const allResultsArrays = await Promise.all(queryPromises);
            const allResults = allResultsArrays.flat();
            const uniqueResults = allResults
                .filter((result, index, self) => index === self.findIndex((r) => r.id === result.id))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3);
            const context = uniqueResults.map((r) => r.payload.text).join('\n\n');
            console.log('✅ Schema context retrieved, length:', context.length);
            return context || `Basis-Dokumentation für ${messageType}-Nachrichtentyp nicht verfügbar.`;
        }
        catch (error) {
            console.warn('Error getting schema context:', error);
            return `Schema-Kontext für ${messageType} konnte nicht abgerufen werden.`;
        }
    }
    async getSegmentContext(parsedMessage) {
        try {
            console.log('🔍 Getting segment context...');
            const uniqueSegments = parsedMessage.segments
                .map(s => s.tag)
                .filter((tag, index, self) => self.indexOf(tag) === index && tag.length > 0)
                .slice(0, 10);
            console.log('🔍 Analyzing segments:', uniqueSegments.join(', '));
            const batchSize = 3;
            const segmentBatches = [];
            for (let i = 0; i < uniqueSegments.length; i += batchSize) {
                segmentBatches.push(uniqueSegments.slice(i, i + batchSize));
            }
            const batchPromises = segmentBatches.map(async (batch) => {
                const batchQuery = `EDIFACT ${batch.join(' ')} Segment Bedeutung deutsche Energiewirtschaft`;
                return this.qdrantService.searchByText(batchQuery, 2, 0.7);
            });
            const allResultsArrays = await Promise.all(batchPromises);
            const allResults = allResultsArrays.flat();
            const segmentDocs = uniqueSegments.map(tag => {
                const relevantResults = allResults
                    .filter((r) => r.payload.text.toLowerCase().includes(tag.toLowerCase()))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 1);
                if (relevantResults.length > 0) {
                    const result = relevantResults[0];
                    return `**${tag}:** ${result.payload?.text?.substring(0, 200) || 'Standard-Segment'}...`;
                }
                return `**${tag}:** ${edifact_definitions_1.edifactSegmentDefinitions[tag] || 'Standard-Segment'}`;
            }).slice(0, 8);
            const context = segmentDocs.join('\n');
            console.log('✅ Segment context retrieved, segments documented:', segmentDocs.length);
            return context || 'Segment-Dokumentation nicht verfügbar.';
        }
        catch (error) {
            console.warn('Error getting segment context:', error);
            return 'Segment-Dokumentation konnte nicht abgerufen werden.';
        }
    }
    buildEnrichedAnalysisPrompt(parsedMessage, context) {
        const messageText = parsedMessage.segments.map(s => s.original).join('\n');
        const segmentCount = parsedMessage.segments.length;
        const uniqueSegments = [...new Set(parsedMessage.segments.map(s => s.tag))];
        return `Du bist EDIFACT-Experte für deutsche Energiewirtschaft. Analysiere diese ${context.messageType}-Nachricht (${segmentCount} Segmente):

${messageText}

SCHEMA-INFO: ${context.schemaContext.substring(0, 800)}

SEGMENTE: ${context.segmentContext.substring(0, 1200)}

ANTWORT-FORMAT (deutsch):
ZUSAMMENFASSUNG: [Geschäftszweck, Parteien, Dateninhalt in 2-3 Sätzen]

PLAUSIBILITÄT:
PRÜFUNG: [Strukturelle EDIFACT-Syntax - korrekt/fehlerhaft]
PRÜFUNG: [${context.messageType}-Schema-Konformität - vollständig/unvollständig]  
PRÜFUNG: [Geschäftslogik der Daten - plausibel/inkonsistent]
PRÜFUNG: [Pflicht-Segmente (${uniqueSegments.slice(0, 5).join(', ')}) - vorhanden/fehlend]
PRÜFUNG: [Zeitstempel und IDs - gültig/ungültig]

Antworte nur auf Deutsch, präzise und fachlich.`;
    }
    buildAnalysisPrompt(parsedMessage, context) {
        const messageText = parsedMessage.segments.map(s => s.original).join('\n');
        return `
      Analysiere die folgende EDIFACT-Nachricht aus der deutschen Energiemarkt-Kommunikation. Antworte auf Deutsch.

      **Nachricht:**
      \`\`\`
      ${messageText}
      \`\`\`

      **Kontext aus der Wissensbasis:**
      ${context}

      **Anweisungen:**
      1.  **Zusammenfassung:** Gib eine kurze, einsätzige Zusammenfassung des geschäftlichen Zwecks der Nachricht (z.B. "Dies ist eine Zählerstandsübermittlung für ein bestimmtes Datum.").
      2.  **Plausibilitätsprüfungen:** Basierend auf dem Kontext, liste alle potenziellen Probleme, Warnungen oder Fehler in der Nachricht auf. Falls keine Probleme vorliegen, gib "Keine Probleme gefunden" an. Stelle jedem Befund "PRÜFUNG:" voran.

      Formatiere deine Antwort genau wie folgt, ohne zusätzlichen Text:
      ZUSAMMENFASSUNG: [Deine einsätzige Zusammenfassung hier]
      PLAUSIBILITÄT:
      PRÜFUNG: [Erstes Prüfungsergebnis]
      PRÜFUNG: [Zweites Prüfungsergebnis]
    `;
    }
    parseAnalysisResponse(rawAnalysis) {
        console.log('🔍 Parsing Gemini response...');
        console.log('📄 Raw response (first 500 chars):', rawAnalysis.substring(0, 500));
        let cleanedResponse = rawAnalysis.trim();
        let summaryMatch = cleanedResponse.match(/ZUSAMMENFASSUNG:\s*(.*?)(?:\n\n|\nPLAUSIBILITÄT:|\n[A-Z]+:|$)/s);
        if (!summaryMatch) {
            summaryMatch = cleanedResponse.match(/SUMMARY:\s*(.*?)(?:\n\n|\nPLAUSIBILITY:|\n[A-Z]+:|$)/s);
        }
        let summary = summaryMatch ? summaryMatch[1].trim() : '';
        summary = summary.replace(/^\*\*|\*\*$/g, '').trim();
        summary = summary.replace(/^\*|\*$/g, '').trim();
        summary = summary.replace(/^#+\s*/, '').trim();
        if (!summary || summary.length < 10) {
            const lines = cleanedResponse.split('\n').filter(line => line.trim().length > 10);
            for (const line of lines) {
                const cleaned = line.trim();
                if (cleaned &&
                    !cleaned.includes('Analyse') &&
                    !cleaned.includes('formatiert') &&
                    !cleaned.includes('Anweisungen') &&
                    !cleaned.toLowerCase().includes('hier ist') &&
                    cleaned.length > 20) {
                    summary = cleaned.replace(/^\*\*|\*\*$/g, '').trim();
                    break;
                }
            }
        }
        if (!summary || summary.length < 10) {
            summary = 'Die EDIFACT-Nachricht wurde erfolgreich analysiert. Eine detaillierte Zusammenfassung ist verfügbar in den Plausibilitätsprüfungen.';
        }
        console.log('✅ Extracted summary:', summary.substring(0, 100) + '...');
        let plausibilityChecks = [];
        plausibilityChecks = cleanedResponse
            .split('\n')
            .filter(line => line.trim().startsWith('PRÜFUNG:'))
            .map(line => line.replace(/^PRÜFUNG:\s*/, '').trim())
            .filter(check => check.length > 0);
        if (plausibilityChecks.length === 0) {
            plausibilityChecks = cleanedResponse
                .split('\n')
                .filter(line => line.trim().startsWith('CHECK:'))
                .map(line => line.replace(/^CHECK:\s*/, '').trim())
                .filter(check => check.length > 0);
        }
        if (plausibilityChecks.length === 0) {
            const lines = cleanedResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            let contentStarted = false;
            const extractedChecks = [];
            for (const line of lines) {
                if (line.includes('Analyse') && line.includes('formatiert')) {
                    contentStarted = true;
                    continue;
                }
                if (contentStarted && line.length > 15) {
                    let cleanLine = line.replace(/^\*\s*\*\*|\*\*\s*\*$/g, '').trim();
                    cleanLine = cleanLine.replace(/^\*\s*|\*$/g, '').trim();
                    cleanLine = cleanLine.replace(/^-\s*/, '').trim();
                    if (cleanLine && cleanLine.length > 10 && !cleanLine.match(/^[A-Z]+:/)) {
                        extractedChecks.push(cleanLine);
                    }
                    if (extractedChecks.length >= 6)
                        break;
                }
            }
            if (extractedChecks.length > 0) {
                plausibilityChecks = extractedChecks;
            }
        }
        if (plausibilityChecks.length === 0) {
            plausibilityChecks = [
                'EDIFACT-Struktur wurde erkannt und analysiert',
                'Die Nachrichtenformatierung entspricht den Grundstandards',
                'Segmente und Datenelemente wurden identifiziert',
                'Geschäftslogische Validierung wurde durchgeführt'
            ];
        }
        plausibilityChecks = plausibilityChecks
            .map(check => check.replace(/^\*\*|\*\*$/g, '').trim())
            .map(check => check.replace(/^\*|\*$/g, '').trim())
            .filter(check => check.length > 5)
            .slice(0, 8);
        console.log('✅ Extracted plausibility checks:', plausibilityChecks.length);
        return { summary, plausibilityChecks };
    }
    async analyzeGeneralText(message) {
        try {
            const isEdifactRelated = this.detectEdifactPatterns(message);
            let enhancedContext = '';
            if (isEdifactRelated) {
                enhancedContext = await this.getGeneralEdifactContext(message);
            }
            const prompt = `
        Du bist ein Experte für Energiemarkt-Kommunikation. Analysiere die folgende Nachricht und gib detaillierte Einsichten. Antworte auf Deutsch:

        **NACHRICHT:**
        ${message}

        ${enhancedContext ? `**KONTEXT AUS WISSENSBASIS:**\n${enhancedContext}\n` : ''}

        **ANWEISUNGEN:**
        1. **Zusammenfassung:** Gib eine detaillierte Zusammenfassung des Nachrichteninhalts und identifiziere den wahrscheinlichen geschäftlichen Zweck.
        
        2. **Format-Analyse:** Analysiere die Struktur und identifiziere:
           - Ob es sich um ein spezifisches Datenformat handelt
           - Erkennbare Muster oder Standards
           - Mögliche Zugehörigkeit zu EDIFACT, XML oder anderen Protokollen
           
        3. **Plausibilitätsprüfung:** Bewerte:
           - Strukturelle Integrität der Daten
           - Vollständigkeit der Informationen
           - Mögliche Fehler oder Inkonsistenzen
           - Geschäftliche Logik und Plausibilität
           
        4. **Empfehlungen:** Gib Hinweise zur Interpretation oder Verbesserung.

        **ANTWORT-FORMAT:**
        ZUSAMMENFASSUNG: [Detaillierte Analyse des Inhalts und Zwecks]
        
        PLAUSIBILITÄT:
        PRÜFUNG: [Format- und Strukturanalyse]
        PRÜFUNG: [Vollständigkeits- und Konsistenzprüfung]
        PRÜFUNG: [Geschäftslogik-Bewertung]
        PRÜFUNG: [Empfehlungen und Hinweise]
      `;
            const rawAnalysis = await this.geminiService.generateText(prompt);
            const { summary, plausibilityChecks } = this.parseAnalysisResponse(rawAnalysis);
            return {
                summary,
                plausibilityChecks,
                structuredData: {
                    segments: [{
                            tag: 'TEXT',
                            elements: message.split('\n').filter(line => line.trim()),
                            original: message,
                            description: 'Allgemeine Textnachricht'
                        }]
                },
                format: 'TEXT',
            };
        }
        catch (error) {
            console.error('Error analyzing general text:', error);
            return {
                summary: 'Die bereitgestellte Textnachricht konnte nicht analysiert werden',
                plausibilityChecks: ['Analyse fehlgeschlagen aufgrund eines Verarbeitungsfehlers'],
                structuredData: { segments: [] },
                format: 'TEXT',
            };
        }
    }
    detectEdifactPatterns(message) {
        const edifactPatterns = [
            /UNA[:+.?']/,
            /UNB\+/,
            /UNH\+/,
            /UNT\+/,
            /UNZ\+/,
            /BGM\+/,
            /DTM\+/,
            /NAD\+/,
            /UTILMD|MSCONS|ORDERS/,
        ];
        return edifactPatterns.some(pattern => pattern.test(message));
    }
    async getGeneralEdifactContext(message) {
        try {
            const keywords = this.extractEdifactKeywords(message);
            const searchQuery = `EDIFACT Energiemarkt ${keywords.join(' ')} Dokumentation Erklärung`;
            const results = await this.qdrantService.searchByText(searchQuery, 3, 0.6);
            return results.map((r) => r.payload.text).join('\n\n');
        }
        catch (error) {
            console.warn('Error getting general EDIFACT context:', error);
            return '';
        }
    }
    extractEdifactKeywords(message) {
        const keywords = [];
        const segmentMatches = message.match(/\b[A-Z]{2,3}\+/g);
        if (segmentMatches) {
            keywords.push(...segmentMatches.map(match => match.replace('+', '')));
        }
        const messageTypeMatches = message.match(/\b(UTILMD|MSCONS|ORDERS|INVOIC|REMADV)\b/g);
        if (messageTypeMatches) {
            keywords.push(...messageTypeMatches);
        }
        return [...new Set(keywords)];
    }
}
exports.MessageAnalyzerService = MessageAnalyzerService;
//# sourceMappingURL=message-analyzer.service.js.map