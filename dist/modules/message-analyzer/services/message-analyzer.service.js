"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageAnalyzerService = void 0;
const edifact_definitions_1 = require("./edifact-definitions");
const llmProvider_1 = __importDefault(require("../../../services/llmProvider"));
const qdrant_1 = require("../../../services/qdrant");
const database_1 = __importDefault(require("../../../config/database"));
const postgres_codelookup_repository_1 = require("../../codelookup/repositories/postgres-codelookup.repository");
const mongo_codelookup_repository_1 = require("../../codelookup/repositories/mongo-codelookup.repository");
const codelookup_service_1 = require("../../codelookup/services/codelookup.service");
class MessageAnalyzerService {
    constructor() {
        this.qdrantService = new qdrant_1.QdrantService();
        // Initialize code lookup service (prefer Mongo for richer metadata)
        try {
            const mongoRepo = new mongo_codelookup_repository_1.MongoCodeLookupRepository();
            this.codeLookupService = new codelookup_service_1.CodeLookupService(mongoRepo);
            console.log('MessageAnalyzer: CodeLookup using Mongo repository');
        }
        catch (e) {
            console.warn('MessageAnalyzer: Mongo repository unavailable, falling back to Postgres');
            const postgresRepo = new postgres_codelookup_repository_1.PostgresCodeLookupRepository(database_1.default);
            this.codeLookupService = new codelookup_service_1.CodeLookupService(postgresRepo);
        }
    }
    async analyze(message) {
        const trimmedMessage = message.trim();
        console.log('🔍 Nachrichten-Analyzer: Analysiere Nachrichtentyp...');
        console.log('📄 First 100 chars:', trimmedMessage.substring(0, 100));
        // Enhanced EDIFACT detection
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
        // Check for EDIFACT indicators
        const edifactIndicators = [
            upperMessage.startsWith('UNA'), // Service string advice
            upperMessage.startsWith('UNB'), // Interchange header
            upperMessage.includes('UNB+'), // Interchange header anywhere
            upperMessage.includes('UNH+'), // Message header
            upperMessage.includes('UTILMD'), // UTILMD message type
            upperMessage.includes('MSCONS'), // MSCONS message type
            upperMessage.includes('ORDERS'), // ORDERS message type
            /UNA[:+.?']/.test(message), // UNA with typical separators
            /UNB\+[A-Z0-9]+:/.test(upperMessage), // UNB with syntax identifier
            /\+NAD\+/.test(upperMessage), // NAD segment
            /\+DTM\+/.test(upperMessage), // DTM segment
            /\+BGM\+/.test(upperMessage), // BGM segment
            /\+UNT\+/.test(upperMessage), // UNT trailer
        ];
        const isEdifact = edifactIndicators.some(indicator => indicator);
        console.log('🔍 EDIFACT detection result:', isEdifact);
        console.log('🔍 Message starts with:', upperMessage.substring(0, 50));
        return isEdifact;
    }
    async analyzeXml(message) {
        // This is where XML parsing and analysis would be implemented.
        // For now, we'll return a placeholder response.
        const summary = await llmProvider_1.default.generateText(`Bitte fasse die folgende XML-Nachricht zusammen und prüfe sie auf Plausibilität im Kontext der deutschen Energiemarkt-Kommunikation. Antworte auf Deutsch:\n\n${message}`);
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
            console.log('📋 Phase 1: Syntaktische Validierung und Parsing');
            // Phase 1: Parse and validate EDIFACT structure
            let segments = this.parseEdifactSimple(message);
            console.log('✅ Parsed', segments.length, 'EDIFACT segments');
            if (segments.length === 0) {
                throw new Error('Keine gültigen EDIFACT-Segmente gefunden');
            }
            console.log('📋 Phase 2: Nachrichtentyp-Erkennung');
            // Phase 2: Identify message type from structure
            const messageType = this.identifyMessageType(segments);
            console.log('✅ Message type identified:', messageType);
            console.log('📋 Phase 3: Code-Auflösung und Segment-Anreicherung');
            // Phase 3: Enrich segments with code lookup
            segments = await this.enrichSegmentsWithCodeLookup(segments);
            console.log('✅ Enriched segments with code lookup');
            const parsedMessage = { segments };
            console.log('📋 Phase 4: Wissensbasis-Kontext abrufen');
            // Phase 4: Get knowledge base context based on message type
            const knowledgeContext = await this.getKnowledgeBaseContext(messageType, segments);
            console.log('✅ Retrieved knowledge context for', messageType);
            console.log('📋 Phase 5: Strukturerkennung für intelligente Ausgabe');
            // Phase 5: Extract structured data based on message type
            const structuredInfo = this.extractStructuredInfo(segments, messageType);
            console.log('✅ Extracted structured info:', Object.keys(structuredInfo).join(', '));
            console.log('📋 Phase 6: KI-Analyse mit kontextspezifischem Prompt');
            // Phase 6: Build intelligent prompt and analyze
            const prompt = this.buildIntelligentAnalysisPrompt(parsedMessage, messageType, knowledgeContext, structuredInfo);
            console.log('🔍 Calling Gemini API...');
            const rawAnalysis = await llmProvider_1.default.generateText(prompt);
            console.log('✅ Gemini response length:', (rawAnalysis === null || rawAnalysis === void 0 ? void 0 : rawAnalysis.length) || 0);
            if (!rawAnalysis || rawAnalysis.trim().length === 0) {
                console.warn('⚠️ Empty response from Gemini API');
                return this.createIntelligentFallbackAnalysis(parsedMessage, messageType, structuredInfo);
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
    createIntelligentFallbackAnalysis(parsedMessage, messageType, structuredInfo) {
        var _a;
        const segmentCount = parsedMessage.segments.length;
        const uniqueSegments = [...new Set(parsedMessage.segments.map(s => s.tag))];
        // Build meaningful summary from structured info
        let summary = `Dies ist eine ${messageType}-Nachricht`;
        if (structuredInfo.sender && structuredInfo.receiver) {
            summary += ` von ${structuredInfo.sender} an ${structuredInfo.receiver}`;
        }
        if (structuredInfo.purpose) {
            summary += `. ${structuredInfo.purpose}`;
        }
        summary += ` Die Nachricht enthält ${segmentCount} Segmente.`;
        const checks = [
            `Nachrichtentyp: ${messageType}`,
            `Segmentanzahl: ${segmentCount} Segmente`,
            `Segmenttypen: ${uniqueSegments.join(', ')}`
        ];
        if (structuredInfo.sender)
            checks.push(`Absender: ${structuredInfo.sender}`);
        if (structuredInfo.receiver)
            checks.push(`Empfänger: ${structuredInfo.receiver}`);
        if (structuredInfo.marketLocation)
            checks.push(`Marktlokation: ${structuredInfo.marketLocation}`);
        if (((_a = structuredInfo.measurements) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            checks.push(`Messwerte: ${structuredInfo.measurements.length} Zeitreihen erkannt`);
        }
        return {
            summary,
            plausibilityChecks: checks,
            structuredData: parsedMessage,
            format: 'EDIFACT',
        };
    }
    /**
     * Phase 2: Identify message type from EDIFACT structure
     * Supports all energy market message types: MSCONS, UTILMD, ORDERS, INVOIC, REMADV, APERAK, QUOTES, etc.
     */
    identifyMessageType(segments) {
        // PRIORITY 1: Always check UNH segment first (most reliable)
        const unhSegment = segments.find(s => s.tag === 'UNH');
        if (unhSegment && unhSegment.elements.length > 1) {
            // UNH+1+QUOTES:D:10A:UN:1.3a -> Extract QUOTES
            // UNH+1+MSCONS:D:04B:UN:2.4c -> Extract MSCONS
            const messageTypeField = unhSegment.elements[1];
            if (messageTypeField && typeof messageTypeField === 'string') {
                const messageType = messageTypeField.split(':')[0].toUpperCase().trim();
                if (messageType && messageType.length > 0) {
                    console.log('✅ Message type from UNH segment:', messageType);
                    return messageType;
                }
            }
        }
        // PRIORITY 2: Fallback heuristics (only if UNH fails)
        console.warn('⚠️ UNH segment missing or invalid, using fallback detection');
        const hasLIN = segments.some(s => s.tag === 'LIN');
        const hasQTY = segments.some(s => s.tag === 'QTY');
        const hasIDE = segments.some(s => s.tag === 'IDE');
        const hasCTA = segments.some(s => s.tag === 'CTA');
        const hasMOA = segments.some(s => s.tag === 'MOA');
        const hasPRI = segments.some(s => s.tag === 'PRI');
        const hasIMD = segments.some(s => s.tag === 'IMD');
        // QUOTES: Has PRI (price) + IMD (item description) + LIN
        if (hasPRI && hasLIN && hasIMD) {
            console.log('✅ Message type inferred: QUOTES (PRI+IMD+LIN)');
            return 'QUOTES';
        }
        // MSCONS: Has LIN + QTY (consumption data)
        if (hasLIN && hasQTY && !hasPRI) {
            console.log('✅ Message type inferred: MSCONS (LIN+QTY)');
            return 'MSCONS';
        }
        // UTILMD: Has IDE (identification) but no monetary fields
        if (hasIDE && !hasMOA) {
            console.log('✅ Message type inferred: UTILMD (IDE)');
            return 'UTILMD';
        }
        // INVOIC/REMADV: Has MOA (monetary amount)
        if (hasMOA) {
            console.log('✅ Message type inferred: INVOIC/REMADV (MOA)');
            return 'INVOIC';
        }
        console.log('⚠️ Message type could not be determined, using EDIFACT');
        return 'EDIFACT';
    }
    /**
     * Phase 4: Get knowledge base context based on message type
     */
    async getKnowledgeBaseContext(messageType, segments) {
        try {
            console.log('🔍 Querying knowledge base for:', messageType);
            // Query 1: Message type specific information
            const messageTypeQuery = `${messageType} EDIFACT Nachrichtentyp Energiewirtschaft Bedeutung Verwendung Zweck`;
            // Query 2: Process context
            const processQuery = `${messageType} Marktkommunikation Prozess GPKE WiM GeLi Gas Geschäftsprozess`;
            // Query 3: Segment-specific information
            const uniqueSegments = [...new Set(segments.map(s => s.tag))].slice(0, 8);
            const segmentQuery = `EDIFACT ${uniqueSegments.join(' ')} Segment Bedeutung ${messageType}`;
            // Parallel queries for performance
            const [messageTypeResults, processResults, segmentResults] = await Promise.all([
                this.qdrantService.searchByText(messageTypeQuery, 2, 0.65),
                this.qdrantService.searchByText(processQuery, 2, 0.60),
                this.qdrantService.searchByText(segmentQuery, 3, 0.60)
            ]);
            const messageTypeInfo = messageTypeResults
                .map((r) => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ''; })
                .join('\n\n')
                .substring(0, 1000);
            const processInfo = processResults
                .map((r) => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ''; })
                .join('\n\n')
                .substring(0, 800);
            const segmentInfo = segmentResults
                .map((r) => { var _a; return ((_a = r.payload) === null || _a === void 0 ? void 0 : _a.text) || ''; })
                .join('\n\n')
                .substring(0, 1200);
            console.log('✅ Knowledge base context retrieved');
            console.log('   - Message type info:', messageTypeInfo.length, 'chars');
            console.log('   - Process info:', processInfo.length, 'chars');
            console.log('   - Segment info:', segmentInfo.length, 'chars');
            return {
                messageTypeInfo: messageTypeInfo || `${messageType} ist ein EDIFACT-Nachrichtentyp der Energiewirtschaft.`,
                segmentInfo: segmentInfo || 'Keine spezifische Segment-Dokumentation verfügbar.',
                processInfo: processInfo || 'Keine Prozess-Dokumentation verfügbar.'
            };
        }
        catch (error) {
            console.warn('⚠️ Error getting knowledge base context:', error);
            return {
                messageTypeInfo: `${messageType} Nachrichtentyp`,
                segmentInfo: 'Segment-Dokumentation nicht verfügbar',
                processInfo: 'Prozess-Dokumentation nicht verfügbar'
            };
        }
    }
    /**
     * Phase 5: Extract structured information based on message type
     * Universal structure extraction that works for all energy market EDIFACT types
     */
    extractStructuredInfo(segments, messageType) {
        var _a;
        const info = {
            messageType,
            sender: null,
            receiver: null,
            marketLocation: null,
            meteringLocation: null,
            meterNumber: null,
            purpose: null,
            timestamps: [],
            measurements: [],
            parties: [],
            references: []
        };
        // Extract NAD segments (Name and Address) - Market participants
        const nadSegments = segments.filter(s => s.tag === 'NAD');
        for (const nad of nadSegments) {
            if (nad.elements.length >= 3) {
                const qualifier = nad.elements[0]; // MS, MR, DP, etc.
                const code = nad.elements[2] || nad.elements[1];
                const resolvedName = ((_a = nad.resolved_meta) === null || _a === void 0 ? void 0 : _a.companyName) || code;
                const party = { qualifier, code, name: resolvedName };
                info.parties.push(party);
                // Map common qualifiers
                if (qualifier === 'MS')
                    info.sender = resolvedName; // Messstellenbetreiber
                if (qualifier === 'MR')
                    info.receiver = resolvedName; // Messstellennutzer
                if (qualifier === 'DP')
                    info.deliveryPoint = resolvedName; // Delivery Point
            }
        }
        // Extract LOC segments (Location) - Distinguish MaLo vs MeLo by format
        const locSegment = segments.find(s => s.tag === 'LOC');
        if (locSegment && locSegment.elements.length >= 2) {
            const qualifier = locSegment.elements[0];
            if (qualifier === '172') { // MaLo/MeLo qualifier
                const locationId = locSegment.elements[1];
                // MeLo: starts with DE + 16 digits (total 18 chars or more)
                // MaLo: 33 chars (DE + 31 digits)
                if (locationId && locationId.startsWith('DE') && locationId.length >= 18 && locationId.length < 30) {
                    info.meteringLocation = locationId;
                }
                else if (locationId && locationId.length >= 30) {
                    info.marketLocation = locationId;
                }
                else {
                    // Fallback: store as marketLocation if unclear
                    info.marketLocation = locationId;
                }
            }
        }
        // Extract RFF segments (References)
        const rffSegments = segments.filter(s => s.tag === 'RFF');
        for (const rff of rffSegments) {
            if (rff.elements.length >= 1) {
                const refData = rff.elements[0];
                const [refQualifier, refValue] = refData.split(':');
                info.references.push({ qualifier: refQualifier, value: refValue });
                // MG = Meter number
                if (refQualifier === 'MG') {
                    info.meterNumber = refValue;
                }
            }
        }
        // Extract BGM segment (Beginning of Message) - Purpose
        const bgmSegment = segments.find(s => s.tag === 'BGM');
        if (bgmSegment && bgmSegment.elements.length >= 1) {
            const messageFunction = bgmSegment.elements[0];
            info.messageFunction = messageFunction;
            // Map common message functions
            const functionMap = {
                'E01': 'Messwertübermittlung',
                'E02': 'Stammdatenmitteilung',
                'E03': 'Vertragsdaten',
                '7': 'Stammdatenmitteilung',
                '9': 'Original',
                '220': 'Bestellung',
                '380': 'Rechnung'
            };
            info.purpose = functionMap[messageFunction] || `Nachrichtenfunktion ${messageFunction}`;
        }
        // Extract DTM segments (Date/Time) - Timestamps
        const dtmSegments = segments.filter(s => s.tag === 'DTM');
        for (const dtm of dtmSegments) {
            if (dtm.elements.length >= 1) {
                const [qualifier, value, format] = dtm.elements[0].split(':');
                info.timestamps.push({ qualifier, value, format });
            }
        }
        // Extract LIN + QTY + DTM combinations (Measurement data) - MSCONS specific
        if (messageType === 'MSCONS') {
            const linSegments = segments.filter(s => s.tag === 'LIN');
            for (let i = 0; i < linSegments.length; i++) {
                const linIndex = segments.indexOf(linSegments[i]);
                // Get QTY and DTM after this LIN
                const qtySegment = segments.slice(linIndex).find(s => s.tag === 'QTY');
                const dtmSegment = segments.slice(linIndex).find(s => s.tag === 'DTM');
                if (qtySegment && qtySegment.elements.length >= 1) {
                    const [qualifier, value, unit] = qtySegment.elements[0].split(':');
                    const measurement = { qualifier, value, unit };
                    if (dtmSegment && dtmSegment.elements.length >= 1) {
                        const [dtmQualifier, dtmValue] = dtmSegment.elements[0].split(':');
                        measurement.timestamp = dtmValue;
                        measurement.timestampQualifier = dtmQualifier;
                    }
                    info.measurements.push(measurement);
                }
            }
        }
        // Extract CCI segments (Characteristic) - UTILMD specific
        if (messageType === 'UTILMD') {
            const cciSegments = segments.filter(s => s.tag === 'CCI');
            info.characteristics = cciSegments.map(cci => ({
                value: cci.elements.join(':')
            }));
        }
        // Extract MOA segments (Monetary Amount) - INVOIC/REMADV specific
        if (messageType === 'INVOIC' || messageType === 'REMADV') {
            const moaSegments = segments.filter(s => s.tag === 'MOA');
            info.monetaryAmounts = moaSegments.map(moa => {
                if (moa.elements.length >= 1) {
                    const [qualifier, amount, currency] = moa.elements[0].split(':');
                    return { qualifier, amount, currency };
                }
                return null;
            }).filter(Boolean);
        }
        // Extract PRI segments (Price Details) - QUOTES specific
        if (messageType === 'QUOTES') {
            const priSegments = segments.filter(s => s.tag === 'PRI');
            info.prices = priSegments.map(pri => {
                if (pri.elements.length >= 1) {
                    const priceData = pri.elements[0].split(':');
                    return {
                        qualifier: priceData[0],
                        price: priceData[4] || priceData[1],
                        unit: priceData[5] || priceData[2]
                    };
                }
                return null;
            }).filter(Boolean);
            // Extract IMD segments (Item Description)
            const imdSegments = segments.filter(s => s.tag === 'IMD');
            info.itemDescriptions = imdSegments.map(imd => {
                if (imd.elements.length >= 2) {
                    return {
                        code: imd.elements[2] || imd.elements[1],
                        description: imd.elements[3] || ''
                    };
                }
                return null;
            }).filter(Boolean);
        }
        // NEW: Build segment-level table for comprehensive overview
        info.segmentTable = this.buildSegmentTable(segments, messageType);
        return info;
    }
    /**
     * Build comprehensive segment table with intelligent interpretation
     */
    buildSegmentTable(segments, messageType) {
        var _a, _b, _c;
        const table = [];
        // Segment meaning mappings
        const segmentMeanings = {
            'UNH': 'Nachrichtenkopf',
            'BGM': 'Nachrichtenfunktion',
            'DTM': 'Zeitangabe',
            'NAD': 'Beteiligte Partei',
            'LOC': 'Lokation',
            'RFF': 'Referenz',
            'LIN': 'Position',
            'QTY': 'Menge',
            'PRI': 'Preis',
            'MOA': 'Geldbetrag',
            'IMD': 'Artikelbeschreibung',
            'CTA': 'Kontakt',
            'COM': 'Kommunikation',
            'IDE': 'Identifikation',
            'CCI': 'Merkmal',
            'STS': 'Status'
        };
        // DTM qualifier meanings
        const dtmQualifiers = {
            '137': 'Nachrichtenzeitpunkt',
            '203': 'Gültig ab',
            '204': 'Gültig bis',
            '7': 'Ablesung'
        };
        // NAD qualifier meanings
        const nadQualifiers = {
            'MS': 'Absender (MSB)',
            'MR': 'Empfänger (Messstellennutzer)',
            'DP': 'Lieferadresse'
        };
        // BGM code meanings
        const bgmCodes = {
            '312': 'Status: Positiv',
            '313': 'Status: Negativ',
            'Z29': 'Preisanfrage',
            'E01': 'Messwerte',
            '7': 'Stammdaten',
            '220': 'Bestellung',
            '380': 'Rechnung'
        };
        // RFF qualifier meanings
        const rffQualifiers = {
            'MG': 'Zählernummer',
            'Z13': 'Prozessreferenz'
        };
        for (const segment of segments) {
            // Skip envelope segments
            if (['UNA', 'UNB', 'UNZ', 'UNT', 'UNS'].includes(segment.tag)) {
                continue;
            }
            let meaning = segmentMeanings[segment.tag] || segment.tag;
            let value = '';
            // Interpret specific segments
            switch (segment.tag) {
                case 'BGM':
                    const bgmCode = segment.elements[0];
                    value = bgmCodes[bgmCode] || `Code ${bgmCode}`;
                    break;
                case 'DTM':
                    if (segment.elements.length >= 1) {
                        const [qualifier, dtmValue] = segment.elements[0].split(':');
                        meaning = dtmQualifiers[qualifier] || `Zeitangabe ${qualifier}`;
                        if (dtmValue && dtmValue.length >= 12) {
                            value = `${dtmValue.substring(6, 8)}.${dtmValue.substring(4, 6)}.${dtmValue.substring(0, 4)} ${dtmValue.substring(8, 10)}:${dtmValue.substring(10, 12)}`;
                        }
                        else {
                            value = dtmValue;
                        }
                    }
                    break;
                case 'NAD':
                    const nadQualifier = segment.elements[0];
                    meaning = nadQualifiers[nadQualifier] || `Partei ${nadQualifier}`;
                    const nadCode = segment.elements[2] || segment.elements[1];
                    const resolvedName = (_a = segment.resolved_meta) === null || _a === void 0 ? void 0 : _a.companyName;
                    value = resolvedName ? `${resolvedName} (${nadCode})` : nadCode;
                    break;
                case 'LOC':
                    const locValue = segment.elements[1];
                    if (locValue && locValue.length >= 18 && locValue.length < 30) {
                        meaning = 'Messlokation (MeLo)';
                    }
                    else if (locValue && locValue.length >= 30) {
                        meaning = 'Marktlokation (MaLo)';
                    }
                    value = locValue;
                    break;
                case 'RFF':
                    if (segment.elements.length >= 1) {
                        const [rffQualifier, rffValue] = segment.elements[0].split(':');
                        meaning = rffQualifiers[rffQualifier] || `Referenz ${rffQualifier}`;
                        value = rffValue;
                    }
                    break;
                case 'QTY':
                    meaning = 'Menge';
                    if (segment.elements.length >= 1) {
                        const [, qtyValue, unit] = segment.elements[0].split(':');
                        value = `${qtyValue} ${unit || ''}`.trim();
                    }
                    break;
                case 'PRI':
                    meaning = 'Preis';
                    if (segment.elements.length >= 1) {
                        const priParts = segment.elements[0].split(':');
                        const priceValue = priParts[4] || priParts[1];
                        const priceUnit = priParts[5] || priParts[2];
                        value = `${priceValue} ${priceUnit || ''}`.trim();
                    }
                    break;
                case 'LIN':
                    meaning = 'Position';
                    value = segment.elements[0] || '1';
                    if (segment.elements.length >= 3) {
                        value += ` (${segment.elements[2]})`;
                    }
                    break;
                case 'IMD':
                    meaning = 'Artikelbeschreibung';
                    value = segment.elements[2] || segment.elements[1] || '';
                    break;
                case 'MOA':
                    meaning = 'Geldbetrag';
                    if (segment.elements.length >= 1) {
                        const [, amount, currency] = segment.elements[0].split(':');
                        value = `${amount} ${currency || 'EUR'}`;
                    }
                    break;
                case 'UNH':
                    meaning = 'Nachrichtentyp';
                    value = ((_b = segment.elements[1]) === null || _b === void 0 ? void 0 : _b.split(':')[0]) || 'EDIFACT';
                    break;
                default:
                    value = segment.elements.join(' : ');
            }
            table.push({
                segment: `${segment.tag}${((_c = segment.elements[0]) === null || _c === void 0 ? void 0 : _c.split(':')[0]) ? '+' + segment.elements[0].split(':')[0] : ''}`,
                meaning,
                value
            });
        }
        return table;
    }
    /**
     * Phase 6: Build intelligent analysis prompt based on message type and structure
     */
    buildIntelligentAnalysisPrompt(parsedMessage, messageType, knowledgeContext, structuredInfo) {
        var _a, _b, _c, _d, _e, _f, _g;
        const segmentCount = parsedMessage.segments.length;
        // Build structured data overview
        let dataOverview = '';
        if (structuredInfo.sender) {
            dataOverview += `\n- Absender: ${structuredInfo.sender}`;
        }
        if (structuredInfo.receiver) {
            dataOverview += `\n- Empfänger: ${structuredInfo.receiver}`;
        }
        if (structuredInfo.meteringLocation) {
            dataOverview += `\n- Messlokation (MeLo): ${structuredInfo.meteringLocation}`;
        }
        if (structuredInfo.marketLocation) {
            dataOverview += `\n- Marktlokation (MaLo): ${structuredInfo.marketLocation}`;
        }
        if (structuredInfo.meterNumber) {
            dataOverview += `\n- Zählernummer: ${structuredInfo.meterNumber}`;
        }
        if (structuredInfo.purpose) {
            dataOverview += `\n- Zweck: ${structuredInfo.purpose}`;
        }
        if (structuredInfo.messageFunction) {
            dataOverview += `\n- Nachrichtenfunktion: ${structuredInfo.messageFunction}`;
        }
        if (((_a = structuredInfo.measurements) === null || _a === void 0 ? void 0 : _a.length) > 0) {
            dataOverview += `\n- Messwerte: ${structuredInfo.measurements.length} Zeitreihen`;
            const firstMeasurement = structuredInfo.measurements[0];
            if (firstMeasurement.value) {
                dataOverview += ` (z.B. ${firstMeasurement.value} ${firstMeasurement.unit || ''})`;
            }
        }
        if (((_b = structuredInfo.timestamps) === null || _b === void 0 ? void 0 : _b.length) > 0) {
            const firstTimestamp = structuredInfo.timestamps[0];
            dataOverview += `\n- Zeitstempel: ${structuredInfo.timestamps.length} (z.B. Qualifier ${firstTimestamp.qualifier}: ${firstTimestamp.value})`;
        }
        if (((_c = structuredInfo.references) === null || _c === void 0 ? void 0 : _c.length) > 0) {
            dataOverview += `\n- Referenzen: ${structuredInfo.references.map((r) => `${r.qualifier}:${r.value}`).join(', ')}`;
        }
        if (((_d = structuredInfo.monetaryAmounts) === null || _d === void 0 ? void 0 : _d.length) > 0) {
            dataOverview += `\n- Geldbeträge: ${structuredInfo.monetaryAmounts.length}`;
        }
        if (((_e = structuredInfo.prices) === null || _e === void 0 ? void 0 : _e.length) > 0) {
            const firstPrice = structuredInfo.prices[0];
            dataOverview += `\n- Preise: ${structuredInfo.prices.length} (z.B. ${firstPrice.price} ${firstPrice.unit || ''})`;
        }
        if (((_f = structuredInfo.itemDescriptions) === null || _f === void 0 ? void 0 : _f.length) > 0) {
            dataOverview += `\n- Artikelbeschreibungen: ${structuredInfo.itemDescriptions.map((i) => i.code).join(', ')}`;
        }
        if (((_g = structuredInfo.parties) === null || _g === void 0 ? void 0 : _g.length) > 0) {
            dataOverview += `\n- Beteiligte Parteien (${structuredInfo.parties.length}):`;
            for (const party of structuredInfo.parties) {
                dataOverview += `\n  • ${party.qualifier}: ${party.name} (Code: ${party.code})`;
            }
        }
        // Build segment list
        const uniqueSegments = [...new Set(parsedMessage.segments.map(s => s.tag))];
        // Build segment table for prompt
        let segmentTableText = '';
        if (structuredInfo.segmentTable && structuredInfo.segmentTable.length > 0) {
            segmentTableText = '\n**SEGMENT-ÜBERSICHT (NUTZE DIESE FÜR DIE TABELLE):**\n';
            for (const row of structuredInfo.segmentTable) {
                segmentTableText += `\n${row.segment} | ${row.meaning} | ${row.value}`;
            }
        }
        return `Du bist Experte für EDIFACT-Nachrichten in der deutschen Energiewirtschaft. Analysiere diese ${messageType}-Nachricht.
${segmentTableText}

**WISSENSBASIS:**
${knowledgeContext.messageTypeInfo}
${knowledgeContext.processInfo}

**AUFGABE FÜR SACHBEARBEITER:**
Erstelle eine VOLLSTÄNDIGE Segment-Tabelle. **Jedes Segment = eine Zeile!**

**AUSGABEFORMAT (ZWINGEND):**

## Nachrichtendaten (${messageType})

| Segment | Bedeutung | Wert |
|---------|-----------|------|
[Füge ALLE Segmente aus der SEGMENT-ÜBERSICHT ein - jedes Segment = eine Zeile]
[Nutze die vorbereiteten Werte aus der Segment-Übersicht]
[Beispiel: BGM | Nachrichtenfunktion | Status: Positiv]
[Beispiel: NAD+MS | Absender (MSB) | Bayernwerk Netz GmbH (9906532000008)]
[Beispiel: QTY | Menge | 2729.000 kWh]

## Prüfergebnisse

| Prüfung | Status | Details |
|---------|--------|---------|
| EDIFACT-Struktur | ✅/⚠️/❌ | UNH, BGM, NAD, UNT vorhanden? |
| ${messageType}-Spezifisch | ✅/⚠️/❌ | Typspezifische Segmente komplett? |
| Geschäftslogik | ✅/⚠️/❌ | Prozess erkennbar? |

**KRITISCHE REGELN:**
1. **JEDES Segment aus SEGMENT-ÜBERSICHT = eine Tabellenzeile!**
2. Nutze die vorinterpretierten Werte (Segment | Bedeutung | Wert)
3. Intelligente Übersetzungen:
   - QTY → "Menge" statt "QTY"
   - BGM+312 → "Status: Positiv" statt "312"
   - BGM+313 → "Status: Negativ" statt "313"
   - NAD+MS → "Absender (MSB)" mit Firmennamen
   - DTM → Formatierte Zeitangaben (DD.MM.YYYY HH:MM)
4. Firmennamen IMMER aus resolved_meta verwenden wenn vorhanden
5. Fallback: Wenn keine Interpretation → zeige "Segment: Rohdaten"

**BEISPIEL APERAK-TABELLE:**
| Segment | Bedeutung | Wert |
|---------|-----------|------|
| UNH | Nachrichtentyp | APERAK |
| BGM | Status | Positiv (Code 312) |
| DTM+137 | Nachrichtenzeitpunkt | 15.10.2025 14:30 |
| RFF+ACE | Referenz Bestätigung | 123456789 |
| NAD+MS | Absender | Stromnetz GmbH (9901234000001) |

**BEISPIEL QUOTES-TABELLE:**
| Segment | Bedeutung | Wert |
|---------|-----------|------|
| UNH | Nachrichtentyp | QUOTES |
| BGM | Nachrichtenfunktion | Z29 (Preisanfrage) |
| DTM+137 | Nachrichtenzeitpunkt | 04.09.2025 23:20 |
| DTM+203 | Gültig ab | 21.08.2025 22:00 |
| NAD+MS | Absender (MSB) | Bayernwerk Netz GmbH (9906532000008) |
| NAD+MR | Empfänger | Vattenfall Europe Sales (9903756000004) |
| LOC+172 | Marktlokation (MaLo) | 50332318506 |
| RFF+Z13 | Prozessreferenz | 15002 |
| LIN | Position | 1 (4-02-0-011:Z09) |
| PRI+CAL | Preis | 1 H87 |

**VERMEIDE:**
- Fließtext statt Tabellen
- Codes ohne aufgelöste Namen
- "möglicherweise fehlt" wenn Daten VORHANDEN sind
- Falsche MaLo/MeLo-Zuordnung`;
    }
    parseEdifactSimple(message) {
        const segments = [];
        // EDIFACT kann entweder durch Newlines ODER durch ' (Apostroph) getrennt sein
        // Prüfe welches Format verwendet wird
        let lines;
        if (message.includes("'")) {
            // Format mit ' als Segment-Trennzeichen (z.B. UNH+...+...'UNT+...)
            lines = message.split("'").filter(line => line.trim());
        }
        else {
            // Format mit Newlines als Trennzeichen
            lines = message.split(/[\r\n]+/).filter(line => line.trim());
        }
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            // Entferne Release-Zeichen (?) vor Trennzeichen
            const unescaped = trimmed.replace(/\?([+:'])/g, '$1');
            const elements = unescaped.split(/[+:]/).map(e => e.trim());
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
    /**
     * Löst BDEW/EIC-Codes in den analysierten Segmenten auf
     */
    async enrichSegmentsWithCodeLookup(segments) {
        console.log('🔍 Enriching segments with code lookup...');
        const enrichedSegments = await Promise.all(segments.map(async (segment) => {
            const enrichedSegment = { ...segment };
            // Suche nach Codes in den Elements
            const resolvedCodes = {};
            for (let i = 0; i < segment.elements.length; i++) {
                const element = segment.elements[i];
                // Prüfe ob das Element ein potentieller BDEW/EIC Code ist
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
            // Behandle NAD-Segmente speziell (Name and Address)
            if (segment.tag === 'NAD' && segment.elements.length >= 3) {
                const partyQualifier = segment.elements[0]; // z.B. 'MR' für Marktpartner
                const code = segment.elements[2]; // Der eigentliche Code
                if (this.isPotentialEnergyCode(code)) {
                    try {
                        // Verwende erweiterte Suche um Rollen/Metadaten zu erhalten
                        const results = await this.codeLookupService.searchCodes(code);
                        const primary = results && results[0];
                        if (primary) {
                            // Ermittele Rollen aus contacts passend zum Code
                            const roles = (primary.contacts || [])
                                .filter(c => (c.BdewCode === code) || !c.BdewCode)
                                .map(c => c.BdewCodeFunction)
                                .filter(Boolean);
                            const uniqueRoles = Array.from(new Set(roles));
                            const roleText = uniqueRoles.length ? ` [${uniqueRoles.join(', ')}]` : '';
                            resolvedCodes[code] = `${primary.companyName}${roleText}`;
                            // Erweitere Beschreibung
                            enrichedSegment.description = `${segment.description} - ${partyQualifier}: ${primary.companyName} (${code})${roleText}`;
                            // Hänge aussagekräftige Hinweise an
                            enrichedSegment.resolved_meta = {
                                partyQualifier,
                                code,
                                companyName: primary.companyName,
                                roles: uniqueRoles,
                                contactSheetUrl: primary.contactSheetUrl,
                                allSoftwareSystems: primary.allSoftwareSystems
                            };
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
    buildResolvedPartnersContext(segments) {
        try {
            const lines = [];
            for (const s of segments) {
                if (s.tag !== 'NAD')
                    continue;
                const meta = s.resolved_meta;
                if (meta && meta.companyName) {
                    const roles = Array.isArray(meta.roles) && meta.roles.length ? ` Rollen: ${meta.roles.join(', ')}` : '';
                    lines.push(`- NAD+${meta.partyQualifier}: ${meta.code} → ${meta.companyName}.${roles}`);
                }
            }
            return lines.length ? lines.join('\n') : '';
        }
        catch (_a) {
            return '';
        }
    }
    /**
     * Prüft ob ein String ein potentieller BDEW/EIC Code ist
     */
    isPotentialEnergyCode(value) {
        if (!value || typeof value !== 'string')
            return false;
        const cleanValue = value.trim();
        // BDEW-Codes sind typischerweise 13-stellige Zahlen
        if (/^\d{13}$/.test(cleanValue))
            return true;
        // EIC-Codes haben das Format: 10Y oder 13Y oder 16Y gefolgt von alphanumerischen Zeichen
        if (/^(10|13|16)Y[A-Z0-9-]{11,13}$/.test(cleanValue))
            return true;
        // Weitere Muster für andere Code-Typen
        if (/^9\d{11,12}$/.test(cleanValue))
            return true; // Codes die mit 9 beginnen
        return false;
    }
    async getEnrichedAnalysisContext(parsedMessage) {
        try {
            console.log('🔍 Starting enriched analysis context retrieval...');
            const startTime = Date.now();
            // Step 1: Identify message schema from UNH segment
            const messageType = this.identifyMessageSchema(parsedMessage);
            console.log('✅ Message type identified:', messageType);
            // Step 2 & 3: Parallelize schema and segment context retrieval for better performance
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
        // Look for UNH segment to identify message type
        const unhSegment = parsedMessage.segments.find(s => s.tag === 'UNH');
        if (unhSegment && unhSegment.elements.length > 1) {
            // UNH+1+UTILMD:D:16B:UN:1.1' -> Extract UTILMD
            const messageTypeField = unhSegment.elements[1];
            if (messageTypeField && messageTypeField.includes(':')) {
                const messageType = messageTypeField.split(':')[0];
                return messageType;
            }
        }
        // Fallback: look for message type indicators in other segments
        const bgmSegment = parsedMessage.segments.find(s => s.tag === 'BGM');
        if (bgmSegment) {
            // Try to infer from BGM segment
            return 'UTILMD'; // Common energy market message
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
            // Parallelize queries for better performance
            const queryPromises = schemaQueries.map(query => this.qdrantService.searchByText(query, 2, 0.6));
            const allResultsArrays = await Promise.all(queryPromises);
            const allResults = allResultsArrays.flat();
            // Remove duplicates and get best results
            const uniqueResults = allResults
                .filter((result, index, self) => index === self.findIndex((r) => r.id === result.id))
                .sort((a, b) => b.score - a.score)
                .slice(0, 3); // Reduced from 5 to 3 for faster processing
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
                .slice(0, 10); // Limit to 10 most important segments for performance
            console.log('🔍 Analyzing segments:', uniqueSegments.join(', '));
            // Batch segments for more efficient queries
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
            // Create documentation for each segment
            const segmentDocs = uniqueSegments.map(tag => {
                var _a, _b;
                const relevantResults = allResults
                    .filter((r) => r.payload.text.toLowerCase().includes(tag.toLowerCase()))
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 1); // Just the best result per segment
                if (relevantResults.length > 0) {
                    const result = relevantResults[0];
                    return `**${tag}:** ${((_b = (_a = result.payload) === null || _a === void 0 ? void 0 : _a.text) === null || _b === void 0 ? void 0 : _b.substring(0, 200)) || 'Standard-Segment'}...`;
                }
                return `**${tag}:** ${edifact_definitions_1.edifactSegmentDefinitions[tag] || 'Standard-Segment'}`;
            }).slice(0, 8); // Limit to 8 segments for concise output
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
        const partnerCtx = this.buildResolvedPartnersContext(parsedMessage.segments);
        return `Du bist EDIFACT-Experte für deutsche Energiewirtschaft. Analysiere diese ${context.messageType}-Nachricht (${segmentCount} Segmente):

${messageText}

SCHEMA-INFO: ${context.schemaContext.substring(0, 800)}

SEGMENTE: ${context.segmentContext.substring(0, 1200)}

MARKTPARTNER-AUFLÖSUNG:
${partnerCtx || '(keine zusätzlichen Informationen gefunden)'}

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
        // Clean the response first
        let cleanedResponse = rawAnalysis.trim();
        // Try German keywords first
        let summaryMatch = cleanedResponse.match(/ZUSAMMENFASSUNG:\s*([\s\S]*?)(?:\n\n|\nPLAUSIBILITÄT:|\n[A-Z]+:|$)/);
        if (!summaryMatch) {
            summaryMatch = cleanedResponse.match(/SUMMARY:\s*([\s\S]*?)(?:\n\n|\nPLAUSIBILITY:|\n[A-Z]+:|$)/);
        }
        let summary = summaryMatch ? summaryMatch[1].trim() : '';
        // Clean up summary - remove markdown and extra formatting
        summary = summary.replace(/^\*\*|\*\*$/g, '').trim();
        summary = summary.replace(/^\*|\*$/g, '').trim();
        summary = summary.replace(/^#+\s*/, '').trim();
        // If no structured response found, try to extract from the beginning
        if (!summary || summary.length < 10) {
            // Look for meaningful content at the start
            const lines = cleanedResponse.split('\n').filter(line => line.trim().length > 10);
            // Skip meta-lines and look for actual content
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
        // Extract plausibility checks
        let plausibilityChecks = [];
        // Look for structured PRÜFUNG entries
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
        // If no structured checks found, extract meaningful content
        if (plausibilityChecks.length === 0) {
            const lines = cleanedResponse.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            // Skip the first few meta-lines and extract content
            let contentStarted = false;
            const extractedChecks = [];
            for (const line of lines) {
                // Skip meta content and formatting markers
                if (line.includes('Analyse') && line.includes('formatiert')) {
                    contentStarted = true;
                    continue;
                }
                if (contentStarted && line.length > 15) {
                    // Clean up formatting
                    let cleanLine = line.replace(/^\*\s*\*\*|\*\*\s*\*$/g, '').trim();
                    cleanLine = cleanLine.replace(/^\*\s*|\*$/g, '').trim();
                    cleanLine = cleanLine.replace(/^-\s*/, '').trim();
                    if (cleanLine && cleanLine.length > 10 && !cleanLine.match(/^[A-Z]+:/)) {
                        extractedChecks.push(cleanLine);
                    }
                    if (extractedChecks.length >= 6)
                        break; // Limit to 6 checks
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
        // Clean up plausibility checks
        plausibilityChecks = plausibilityChecks
            .map(check => check.replace(/^\*\*|\*\*$/g, '').trim())
            .map(check => check.replace(/^\*|\*$/g, '').trim())
            .filter(check => check.length > 5)
            .slice(0, 8); // Limit to 8 checks
        console.log('✅ Extracted plausibility checks:', plausibilityChecks.length);
        return { summary, plausibilityChecks };
    }
    async analyzeGeneralText(message) {
        try {
            // Check if this might be EDIFACT-related content
            const isEdifactRelated = this.detectEdifactPatterns(message);
            let enhancedContext = '';
            if (isEdifactRelated) {
                // Get additional context from vector store for EDIFACT-like content
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
            const rawAnalysis = await llmProvider_1.default.generateText(prompt);
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
            /UNA[:+.?']/, // Service string advice
            /UNB\+/, // Interchange header
            /UNH\+/, // Message header  
            /UNT\+/, // Message trailer
            /UNZ\+/, // Interchange trailer
            /BGM\+/, // Beginning of message
            /DTM\+/, // Date/time/period
            /NAD\+/, // Name and address
            /UTILMD|MSCONS|ORDERS/, // Common energy market message types
        ];
        return edifactPatterns.some(pattern => pattern.test(message));
    }
    async getGeneralEdifactContext(message) {
        try {
            // Extract potential keywords for context search
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
        // Extract segment tags
        const segmentMatches = message.match(/\b[A-Z]{2,3}\+/g);
        if (segmentMatches) {
            keywords.push(...segmentMatches.map(match => match.replace('+', '')));
        }
        // Extract message types
        const messageTypeMatches = message.match(/\b(UTILMD|MSCONS|ORDERS|INVOIC|REMADV)\b/g);
        if (messageTypeMatches) {
            keywords.push(...messageTypeMatches);
        }
        return [...new Set(keywords)]; // Remove duplicates
    }
    /**
     * Validates basic EDIFACT structure
     */
    async validateEdifactStructure(message) {
        try {
            const trimmed = message.trim();
            // Basic EDIFACT structure checks
            const hasSegments = /[A-Z]{2,3}\+/.test(trimmed);
            const hasValidCharacters = /^[A-Za-z0-9+:'\-?.()/, \r\n]*$/.test(trimmed);
            // Check for required header segments
            const hasHeader = /UNH\+/.test(trimmed) || /UNB\+/.test(trimmed);
            return hasSegments && hasValidCharacters && hasHeader;
        }
        catch (error) {
            console.error('Error validating EDIFACT structure:', error);
            return false;
        }
    }
    /**
     * Validates EDIFACT message structure and semantics
     */
    async validateEdifactMessage(message) {
        const errors = [];
        const warnings = [];
        try {
            const trimmed = message.trim();
            // Parse segments (unterstützt beide Formate: Newline und ')
            const segments = this.parseEdifactSimple(trimmed);
            const segmentCount = segments.length;
            // Check if we got any segments
            if (segmentCount === 0) {
                errors.push('Keine gültigen EDIFACT-Segmente gefunden');
                return {
                    isValid: false,
                    errors,
                    warnings,
                    segmentCount: 0
                };
            }
            // Detect message type from UNH segment
            let messageType;
            const unhSegment = segments.find(s => s.tag === 'UNH');
            if (unhSegment && unhSegment.elements.length > 1) {
                const messageTypeField = unhSegment.elements[1];
                messageType = messageTypeField.split(':')[0];
            }
            // Check for required segments
            if (!segments.some(s => s.tag === 'UNH')) {
                errors.push('Fehlendes UNH-Segment (Message Header)');
            }
            if (!segments.some(s => s.tag === 'UNT')) {
                errors.push('Fehlendes UNT-Segment (Message Trailer)');
            }
            // Check segment count in UNT matches actual count
            const untSegment = segments.find(s => s.tag === 'UNT');
            if (untSegment && untSegment.elements.length > 0) {
                const declaredCount = parseInt(untSegment.elements[0], 10);
                if (!isNaN(declaredCount) && declaredCount !== segmentCount) {
                    warnings.push(`Segmentanzahl in UNT (${declaredCount}) stimmt nicht mit tatsächlicher Anzahl (${segmentCount}) überein`);
                }
            }
            // Check for empty segments
            if (segments.some(s => s.elements.length === 0)) {
                warnings.push('Einige Segmente haben keine Datenelemente');
            }
            // Message type specific validations
            if (messageType === 'MSCONS') {
                if (!segments.some(s => s.tag === 'LIN')) {
                    warnings.push('MSCONS-Nachricht sollte LIN-Segmente (Zählwerte) enthalten');
                }
            }
            else if (messageType === 'UTILMD') {
                if (!segments.some(s => s.tag === 'NAD')) {
                    warnings.push('UTILMD-Nachricht sollte NAD-Segmente (Marktpartner) enthalten');
                }
            }
            const isValid = errors.length === 0;
            return {
                isValid,
                errors,
                warnings,
                messageType,
                segmentCount
            };
        }
        catch (error) {
            console.error('Error validating EDIFACT message:', error);
            return {
                isValid: false,
                errors: ['Technischer Fehler bei der Validierung: ' + error.message],
                warnings: [],
                segmentCount: 0
            };
        }
    }
}
exports.MessageAnalyzerService = MessageAnalyzerService;
//# sourceMappingURL=message-analyzer.service.js.map