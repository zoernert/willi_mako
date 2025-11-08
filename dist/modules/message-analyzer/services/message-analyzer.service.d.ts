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