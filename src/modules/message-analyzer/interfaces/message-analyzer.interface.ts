// src/modules/message-analyzer/interfaces/message-analyzer.interface.ts

export interface EdiSegment {
  tag: string;
  elements: string[];
  original: string;
  description?: string;
  subElements?: { value: string; description?: string; resolvedName?: string }[];
  resolvedCodes?: { [key: string]: string }; // For resolved BDEW/EIC codes
  resolved_meta?: {
    companyName?: string;
    processDescription?: string; // For RFF+Z13 process indicator resolution
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
  debug?: any; // Optional debug information for all 6 phases
}

export interface IMessageAnalyzerService {
  analyze(message: string): Promise<AnalysisResult>;
}
