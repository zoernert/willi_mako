export interface EdiSegment {
    tag: string;
    elements: string[];
    original: string;
    description?: string;
    subElements?: {
        value: string;
        description?: string;
        resolvedName?: string;
    }[];
    resolvedCodes?: {
        [key: string]: string;
    };
}
export interface ParsedEdiMessage {
    segments: EdiSegment[];
}
export interface AnalysisResult {
    summary: string;
    plausibilityChecks: string[];
    structuredData: ParsedEdiMessage;
    format: 'EDIFACT' | 'XML' | 'TEXT' | 'UNKNOWN';
}
export interface IMessageAnalyzerService {
    analyze(message: string): Promise<AnalysisResult>;
}
//# sourceMappingURL=message-analyzer.interface.d.ts.map