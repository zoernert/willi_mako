/**
 * Utility functions for processing AI responses
 */

/**
 * Clean AI response text to extract JSON from markdown code blocks
 * @param response Raw response from AI service
 * @returns Cleaned JSON string
 */
export function cleanJsonResponse(response: string): string {
  let cleanResponse = response.trim();
  
  // Remove markdown code block markers if present
  if (cleanResponse.startsWith('```json')) {
    cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanResponse.startsWith('```')) {
    // Handle generic code blocks
    const firstNewline = cleanResponse.indexOf('\n');
    const lastNewline = cleanResponse.lastIndexOf('\n');
    if (firstNewline > 0 && lastNewline > firstNewline) {
      cleanResponse = cleanResponse.slice(firstNewline + 1, lastNewline).trim();
    } else {
      // Fallback: just remove the code block markers
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
  }
  
  return cleanResponse;
}

/**
 * Safely parse JSON from AI response with automatic cleaning
 * @param response Raw response from AI service
 * @returns Parsed JSON object or null if parsing fails
 */
export function safeParseJsonResponse(response: string): any | null {
  try {
    const cleanResponse = cleanJsonResponse(response);
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Error parsing AI JSON response:', error);
    console.error('Raw response:', response);
    return null;
  }
}
