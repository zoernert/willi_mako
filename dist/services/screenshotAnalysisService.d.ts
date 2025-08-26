/**
 * Screenshot Analysis Service
 * Analyzes uploaded screenshots to detect UI ele      const prompt = this.createAnalysisPrompt();
      
      // Generate analysis using Gemini Vision with safe content generation
      const result = await this.safeGenerateContent([
        prompt,
        {
          inlineData: {
            data: imageData.toString('base64'),
            mimeType: 'image/png'
          }
        }
      ]);s, and application context
 */
interface ScreenshotAnalysis {
    detectedElements: DetectedElement[];
    errorMessages: string[];
    uiComponents: UIComponent[];
    confidence: number;
    isSchleupnCS30: boolean;
    extractedText: string;
    analysis: string;
}
interface DetectedElement {
    type: 'error' | 'warning' | 'dialog' | 'menu' | 'form' | 'button' | 'table';
    text: string;
    confidence: number;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}
interface UIComponent {
    name: string;
    visible: boolean;
    text?: string;
}
declare class ScreenshotAnalysisService {
    private genAI;
    private model;
    constructor();
    /**
     * Asynchronously initializes the model with the key manager
     */
    private initializeModel;
    /**
     * Main analysis method - processes a screenshot and extracts relevant information
     */
    analyzeScreenshot(imagePath: string): Promise<ScreenshotAnalysis>;
    /**
     * Preprocess image for optimal analysis
     */
    private preprocessImage;
    /**
     * Create detailed analysis prompt for Gemini Vision
     */
    private createAnalysisPrompt;
    /**
     * Parse the JSON response from Gemini Vision
     */
    private parseAnalysisResponse;
    /**
     * Extract error messages from raw text (fallback method)
     */
    private extractErrorMessages;
    /**
     * Generate context-enhanced prompt for LLM based on screenshot analysis
     */
    generateContextPrompt(userMessage: string, analysis: ScreenshotAnalysis): string;
    /**
     * Save uploaded screenshot to the appropriate directory
     */
    saveScreenshot(file: Express.Multer.File, chatId: string, messageId: string): Promise<string>;
    /**
     * Safely generate content with automatic retry in case of API quota issues
     */
    private safeGenerateContent;
}
declare const _default: ScreenshotAnalysisService;
export default _default;
//# sourceMappingURL=screenshotAnalysisService.d.ts.map