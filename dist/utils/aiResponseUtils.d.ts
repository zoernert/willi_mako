/**
 * Utility functions for processing AI responses
 */
/**
 * Clean AI response text to extract JSON from markdown code blocks
 * @param response Raw response from AI service
 * @returns Cleaned JSON string
 */
export declare function cleanJsonResponse(response: string): string;
/**
 * Safely parse JSON from AI response with automatic cleaning and fixing
 * @param response Raw response from AI service
 * @returns Parsed JSON object or null if parsing fails
 */
export declare function safeParseJsonResponse(response: string): any | null;
//# sourceMappingURL=aiResponseUtils.d.ts.map