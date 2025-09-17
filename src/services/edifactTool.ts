import { MessageAnalyzerService } from '../modules/message-analyzer/services/message-analyzer.service';

export class EdifactTool {
  private analyzer?: MessageAnalyzerService;

  private getAnalyzer(): MessageAnalyzerService {
    if (!this.analyzer) this.analyzer = new MessageAnalyzerService();
    return this.analyzer;
  }

  /** Analyze a (possibly complete) EDIFACT message and return a concise JSON. */
  async analyzeMessage(message: string) {
    const analysis = await this.getAnalyzer().analyze(message);
    return {
      format: analysis.format,
      messageType: (analysis as any)?.messageType || (analysis as any)?.enrichedContext?.messageType || 'EDIFACT',
      summary: analysis.summary,
      segmentCount: (analysis as any)?.segments?.length ?? undefined,
      hints: (analysis as any)?.hints || [],
      issues: (analysis as any)?.issues || [],
    };
  }

  /** Explain a single EDIFACT segment or short fragment. */
  async explainSegment(fragment: string) {
    // Reuse generic analyzer even for fragments – it adds EDIFACT context when patterns are detected
    const analysis = await this.getAnalyzer().analyze(fragment);
    const likelyType = (analysis as any)?.messageType || (analysis as any)?.enrichedContext?.messageType || 'EDIFACT';
    return {
      likelyMessageType: likelyType,
      summary: analysis.summary,
      format: analysis.format,
    };
  }
}
export const edifactTool = new EdifactTool();
