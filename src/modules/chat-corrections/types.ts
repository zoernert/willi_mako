export type CorrectionSeverity = 'low' | 'medium' | 'high';

export interface CorrectionDetectionResult {
  isCorrection: boolean;
  confidence: number;
  summary: string;
  correctedInformation: string;
  vectorTitle: string;
  vectorSuggestion: string;
  tags: string[];
  severity: CorrectionSeverity;
  reason: string;
  followUpAction?: string;
}
