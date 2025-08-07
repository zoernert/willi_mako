import { IMessageAnalyzerService, AnalysisResult } from '../interfaces/message-analyzer.interface';
export declare class MessageAnalyzerService implements IMessageAnalyzerService {
    private geminiService;
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
}
//# sourceMappingURL=message-analyzer.service.d.ts.map