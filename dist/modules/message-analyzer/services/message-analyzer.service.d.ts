import { IMessageAnalyzerService, AnalysisResult } from '../interfaces/message-analyzer.interface';
export declare class MessageAnalyzerService implements IMessageAnalyzerService {
    private qdrantService;
    private codeLookupService;
    constructor();
    analyze(message: string): Promise<AnalysisResult>;
    private isEdifactMessage;
    private analyzeXml;
    private analyzeEdifact;
    private createFallbackAnalysis;
    private createIntelligentFallbackAnalysis;
    /**
     * Phase 2: Identify message type from EDIFACT structure
     * Supports all energy market message types: MSCONS, UTILMD, ORDERS, INVOIC, REMADV, APERAK, QUOTES, etc.
     */
    private identifyMessageType;
    /**
     * Phase 4: Get knowledge base context based on message type
     */
    private getKnowledgeBaseContext;
    /**
     * Phase 5: Extract structured information based on message type
     * Universal structure extraction that works for all energy market EDIFACT types
     */
    private extractStructuredInfo;
    /**
     * Build comprehensive segment table with intelligent interpretation
     */
    private buildSegmentTable;
    /**
     * Phase 6: Build intelligent analysis prompt based on message type and structure
     */
    private buildIntelligentAnalysisPrompt;
    private parseEdifactSimple;
    /**
     * Löst BDEW/EIC-Codes in den analysierten Segmenten auf
     */
    private enrichSegmentsWithCodeLookup;
    private buildResolvedPartnersContext;
    /**
     * Prüft ob ein String ein potentieller BDEW/EIC Code ist
     */
    private isPotentialEnergyCode;
    private getEnrichedAnalysisContext;
    private identifyMessageSchema;
    private getSchemaContext;
    private getSegmentContext;
    private buildEnrichedAnalysisPrompt;
    private buildAnalysisPrompt;
    private parseAnalysisResponse;
    private analyzeGeneralText;
    private detectEdifactPatterns;
    private getGeneralEdifactContext;
    private extractEdifactKeywords;
    /**
     * Validates basic EDIFACT structure
     */
    validateEdifactStructure(message: string): Promise<boolean>;
    /**
     * Validates EDIFACT message structure and semantics
     */
    validateEdifactMessage(message: string): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
        messageType?: string;
        segmentCount: number;
    }>;
}
//# sourceMappingURL=message-analyzer.service.d.ts.map