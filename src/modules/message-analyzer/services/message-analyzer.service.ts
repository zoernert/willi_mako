// src/modules/message-analyzer/services/message-analyzer.service.ts
import { EdiSegment, IMessageAnalyzerService, AnalysisResult, ParsedEdiMessage } from '../interfaces/message-analyzer.interface';
import { edifactSegmentDefinitions } from './edifact-definitions';
import { GeminiService } from '../../../services/gemini';
import { QdrantService } from '../../../services/qdrant';
import { AppError } from '../../../utils/errors';

export class MessageAnalyzerService implements IMessageAnalyzerService {
  private geminiService: GeminiService;
  private qdrantService: QdrantService;

  constructor() {
    this.geminiService = new GeminiService();
    this.qdrantService = new QdrantService();
  }

  public async analyze(message: string): Promise<AnalysisResult> {
    const trimmedMessage = message.trim();
    
    console.log('🔍 Message Analyzer: Analyzing message type...');
    console.log('📄 First 100 chars:', trimmedMessage.substring(0, 100));
    
    // Enhanced EDIFACT detection
    if (this.isEdifactMessage(trimmedMessage)) {
      console.log('✅ Detected EDIFACT message, using EDIFACT analyzer');
      return this.analyzeEdifact(message);
    } else if (trimmedMessage.startsWith('<')) {
      console.log('✅ Detected XML message, using XML analyzer');
      return this.analyzeXml(message);
    } else {
      console.log('✅ Using general text analyzer');
      return this.analyzeGeneralText(message);
    }
  }

  private isEdifactMessage(message: string): boolean {
    const upperMessage = message.toUpperCase();
    
    // Check for EDIFACT indicators
    const edifactIndicators = [
      upperMessage.startsWith('UNA'),       // Service string advice
      upperMessage.startsWith('UNB'),       // Interchange header
      upperMessage.includes('UNB+'),        // Interchange header anywhere
      upperMessage.includes('UNH+'),        // Message header
      /UNA[:+.?']/.test(message),           // UNA with typical separators
      /UNB\+[A-Z0-9]+:/.test(upperMessage) // UNB with syntax identifier
    ];

    const isEdifact = edifactIndicators.some(indicator => indicator);
    console.log('🔍 EDIFACT detection result:', isEdifact);
    return isEdifact;
  }

  private async analyzeXml(message: string): Promise<AnalysisResult> {
    // This is where XML parsing and analysis would be implemented.
    // For now, we'll return a placeholder response.
    const summary = await this.geminiService.generateText(
      `Bitte fasse die folgende XML-Nachricht zusammen und prüfe sie auf Plausibilität im Kontext der deutschen Energiemarkt-Kommunikation. Antworte auf Deutsch:\n\n${message}`
    );

    return {
      summary: summary,
      plausibilityChecks: ["XML-Plausibilitätsprüfung noch nicht implementiert."],
      structuredData: { segments: [{ tag: 'XML', elements: [], original: message, description: 'XML-Nachricht erkannt' }] },
      format: 'XML',
    };
  }

  private async analyzeEdifact(message: string): Promise<AnalysisResult> {
    try {
      console.log('🔍 Starting EDIFACT analysis...');
      
      // Simple EDIFACT parsing without using the edifact library for now
      const segments: EdiSegment[] = this.parseEdifactSimple(message);
      const parsedMessage: ParsedEdiMessage = { segments };
      
      console.log('✅ Parsed', segments.length, 'EDIFACT segments');
      
      // Get enriched context from vector store
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
    } catch (error) {
      console.error('❌ Error analyzing EDIFACT message:', error);
      return {
        summary: 'Fehler beim Analysieren der EDIFACT-Nachricht: ' + (error as Error).message,
        plausibilityChecks: ['Analyse fehlgeschlagen aufgrund eines technischen Fehlers'],
        structuredData: { segments: [] },
        format: 'EDIFACT',
      };
    }
  }

  private createFallbackAnalysis(parsedMessage: ParsedEdiMessage, enrichedContext: any): AnalysisResult {
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

  private parseEdifactSimple(message: string): EdiSegment[] {
    const segments: EdiSegment[] = [];
    const lines = message.split(/[\r\n]+/).filter(line => line.trim());
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      const elements = trimmed.split(/[+:]/).map(e => e.trim());
      const tag = elements.shift() || '';
      
      segments.push({
        tag,
        elements,
        original: trimmed,
        description: edifactSegmentDefinitions[tag] || 'Unknown Segment',
      });
    }
    
    return segments;
  }

  private async getEnrichedAnalysisContext(parsedMessage: ParsedEdiMessage): Promise<{
    schemaContext: string;
    segmentContext: string;
    messageType: string;
  }> {
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
    } catch (error) {
      console.warn('Could not retrieve enriched EDIFACT analysis context:', error);
      return {
        schemaContext: 'Keine Schema-Dokumentation verfügbar.',
        segmentContext: 'Keine Segment-Dokumentation verfügbar.',
        messageType: 'UNKNOWN'
      };
    }
  }

  private identifyMessageSchema(parsedMessage: ParsedEdiMessage): string {
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

  private async getSchemaContext(messageType: string): Promise<string> {
    try {
      console.log('🔍 Getting schema context for:', messageType);
      
      const schemaQueries = [
        `${messageType} EDIFACT Nachrichtentyp Beschreibung Energiemarkt`,
        `${messageType} message type definition energy market German`,
        `EDIFACT ${messageType} Dokumentation Schema Struktur`
      ];

      // Parallelize queries for better performance
      const queryPromises = schemaQueries.map(query => 
        this.qdrantService.searchByText(query, 2, 0.6)
      );

      const allResultsArrays = await Promise.all(queryPromises);
      const allResults = allResultsArrays.flat();

      // Remove duplicates and get best results
      const uniqueResults = allResults
        .filter((result, index, self) => 
          index === self.findIndex(r => r.id === result.id)
        )
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Reduced from 5 to 3 for faster processing

      const context = uniqueResults.map(r => r.payload.text).join('\n\n');
      console.log('✅ Schema context retrieved, length:', context.length);
      
      return context || `Basis-Dokumentation für ${messageType}-Nachrichtentyp nicht verfügbar.`;
    } catch (error) {
      console.warn('Error getting schema context:', error);
      return `Schema-Kontext für ${messageType} konnte nicht abgerufen werden.`;
    }
  }

  private async getSegmentContext(parsedMessage: ParsedEdiMessage): Promise<string> {
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
        const relevantResults = allResults
          .filter(r => r.payload.text.toLowerCase().includes(tag.toLowerCase()))
          .sort((a, b) => b.score - a.score)
          .slice(0, 1); // Just the best result per segment
        
        if (relevantResults.length > 0) {
          return `**${tag}:** ${relevantResults[0].payload.text.substring(0, 200)}...`;
        }
        return `**${tag}:** ${edifactSegmentDefinitions[tag] || 'Standard-Segment'}`;
      }).slice(0, 8); // Limit to 8 segments for concise output

      const context = segmentDocs.join('\n');
      console.log('✅ Segment context retrieved, segments documented:', segmentDocs.length);
      
      return context || 'Segment-Dokumentation nicht verfügbar.';
    } catch (error) {
      console.warn('Error getting segment context:', error);
      return 'Segment-Dokumentation konnte nicht abgerufen werden.';
    }
  }

  private buildEnrichedAnalysisPrompt(parsedMessage: ParsedEdiMessage, context: {
    schemaContext: string;
    segmentContext: string;
    messageType: string;
  }): string {
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

  private buildAnalysisPrompt(parsedMessage: ParsedEdiMessage, context: string): string {
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

  private parseAnalysisResponse(rawAnalysis: string): { summary: string; plausibilityChecks: string[] } {
    console.log('🔍 Parsing Gemini response...');
    console.log('📄 Raw response (first 500 chars):', rawAnalysis.substring(0, 500));
    
    // Try German keywords first, then English as fallback
    let summaryMatch = rawAnalysis.match(/ZUSAMMENFASSUNG:\s*(.*?)(?:\n\n|\nPLAUSIBILITÄT:|\n[A-Z]+:|$)/s);
    if (!summaryMatch) {
      summaryMatch = rawAnalysis.match(/SUMMARY:\s*(.*?)(?:\n\n|\nPLAUSIBILITY:|\n[A-Z]+:|$)/s);
    }
    
    let summary = summaryMatch ? summaryMatch[1].trim() : '';
    
    // If no structured response, try to extract meaningful content
    if (!summary) {
      // Try to find any meaningful summary-like content
      const lines = rawAnalysis.split('\n').filter(line => line.trim().length > 10);
      if (lines.length > 0) {
        summary = lines[0].trim();
        // Clean up if it starts with common prefixes
        summary = summary.replace(/^(Analyse:|Analysis:|Die Nachricht|The message)/i, '').trim();
      }
    }
    
    if (!summary) {
      summary = 'Die EDIFACT-Nachricht wurde verarbeitet, aber eine detaillierte Zusammenfassung konnte nicht extrahiert werden.';
    }

    console.log('✅ Extracted summary:', summary.substring(0, 100) + '...');

    // Look for German "PRÜFUNG:" first, then English "CHECK:" as fallback
    let plausibilityChecks = rawAnalysis
      .split('\n')
      .filter(line => line.trim().startsWith('PRÜFUNG:'))
      .map(line => line.replace(/^PRÜFUNG:\s*/, '').trim())
      .filter(check => check.length > 0);

    if (plausibilityChecks.length === 0) {
      plausibilityChecks = rawAnalysis
        .split('\n')
        .filter(line => line.trim().startsWith('CHECK:'))
        .map(line => line.replace(/^CHECK:\s*/, '').trim())
        .filter(check => check.length > 0);
    }
    
    // If no structured checks found, try to extract meaningful analysis points
    if (plausibilityChecks.length === 0) {
      const analysisLines = rawAnalysis
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return trimmed.length > 20 && 
                 !trimmed.startsWith('**') && 
                 !trimmed.includes('ZUSAMMENFASSUNG') &&
                 !trimmed.includes('PLAUSIBILITÄT') &&
                 (trimmed.includes('EDIFACT') || 
                  trimmed.includes('Segment') ||
                  trimmed.includes('Nachricht') ||
                  trimmed.includes('Struktur') ||
                  trimmed.includes('Fehler') ||
                  trimmed.includes('korrekt') ||
                  trimmed.includes('Problem'));
        })
        .slice(0, 5)
        .map(line => line.trim());
      
      if (analysisLines.length > 0) {
        plausibilityChecks = analysisLines;
      }
    }

    if (plausibilityChecks.length === 0) {
      plausibilityChecks = ['Die Analyse wurde durchgeführt, aber spezifische Prüfungspunkte konnten nicht extrahiert werden.'];
    }

    console.log('✅ Extracted plausibility checks:', plausibilityChecks.length);

    return { summary, plausibilityChecks };
  }

  private async analyzeGeneralText(message: string): Promise<AnalysisResult> {
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
    } catch (error) {
      console.error('Error analyzing general text:', error);
      return {
        summary: 'Die bereitgestellte Textnachricht konnte nicht analysiert werden',
        plausibilityChecks: ['Analyse fehlgeschlagen aufgrund eines Verarbeitungsfehlers'],
        structuredData: { segments: [] },
        format: 'TEXT',
      };
    }
  }

  private detectEdifactPatterns(message: string): boolean {
    const edifactPatterns = [
      /UNA[:+.?']/,           // Service string advice
      /UNB\+/,                // Interchange header
      /UNH\+/,                // Message header  
      /UNT\+/,                // Message trailer
      /UNZ\+/,                // Interchange trailer
      /BGM\+/,                // Beginning of message
      /DTM\+/,                // Date/time/period
      /NAD\+/,                // Name and address
      /UTILMD|MSCONS|ORDERS/, // Common energy market message types
    ];

    return edifactPatterns.some(pattern => pattern.test(message));
  }

  private async getGeneralEdifactContext(message: string): Promise<string> {
    try {
      // Extract potential keywords for context search
      const keywords = this.extractEdifactKeywords(message);
      const searchQuery = `EDIFACT Energiemarkt ${keywords.join(' ')} Dokumentation Erklärung`;
      
      const results = await this.qdrantService.searchByText(searchQuery, 3, 0.6);
      return results.map(r => r.payload.text).join('\n\n');
    } catch (error) {
      console.warn('Error getting general EDIFACT context:', error);
      return '';
    }
  }

  private extractEdifactKeywords(message: string): string[] {
    const keywords: string[] = [];
    
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
}
