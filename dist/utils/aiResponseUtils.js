"use strict";
/**
 * Utility functions for processing AI responses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanJsonResponse = cleanJsonResponse;
exports.safeParseJsonResponse = safeParseJsonResponse;
/**
 * Clean AI response text to extract JSON from markdown code blocks
 * @param response Raw response from AI service
 * @returns Cleaned JSON string
 */
function cleanJsonResponse(response) {
    let cleanResponse = response.trim();
    // Remove markdown code block markers if present
    if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    else if (cleanResponse.startsWith('```')) {
        // Handle generic code blocks
        const firstNewline = cleanResponse.indexOf('\n');
        const lastNewline = cleanResponse.lastIndexOf('\n');
        if (firstNewline > 0 && lastNewline > firstNewline) {
            cleanResponse = cleanResponse.slice(firstNewline + 1, lastNewline).trim();
        }
        else {
            // Fallback: just remove the code block markers
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
    }
    // Fix common AI response issues with quotes
    // Remove triple quotes that might appear at beginning/end
    cleanResponse = cleanResponse.replace(/^"""/, '').replace(/"""$/, '');
    cleanResponse = cleanResponse.replace(/^"/, '').replace(/"$/, '');
    return cleanResponse;
}
/**
 * Safely parse JSON from AI response with automatic cleaning and fixing
 * @param response Raw response from AI service
 * @returns Parsed JSON object or null if parsing fails
 */
function safeParseJsonResponse(response) {
    try {
        let cleanResponse = cleanJsonResponse(response);
        // First attempt: try direct parsing
        try {
            return JSON.parse(cleanResponse);
        }
        catch (firstError) {
            console.log('First JSON parse failed, attempting to fix quote escaping...');
            // Second attempt: fix common quote escaping patterns found in AI responses
            let fixedResponse = cleanResponse
                // Fix the specific pattern: Use-Case "text" within string values
                .replace(/(:\s*"[^"]*?)Use-Case "([^"]+)"([^"]*?")/g, '$1Use-Case \\"$2\\"$3')
                // Fix quotes around any text within string values (general pattern)
                .replace(/(:\s*"[^"]*?)"([^"]+)"([^"]*?")/g, '$1\\"$2\\"$3')
                // Fix multiple quotes within the same string value
                .replace(/(:\s*"[^"]*?)"([^"]+)"([^"]*?)"([^"]+)"([^"]*?")/g, '$1\\"$2\\"$3\\"$4\\"$5');
            try {
                return JSON.parse(fixedResponse);
            }
            catch (secondError) {
                console.log('Second JSON parse failed, trying more aggressive fixing...');
                // Third attempt: more aggressive quote fixing
                // Split the JSON into lines and fix each line individually
                const lines = cleanResponse.split('\n');
                const fixedLines = lines.map(line => {
                    // If this line contains a JSON value (has : and ends with " or ",)
                    if (line.includes(':') && (line.trim().endsWith('",') || line.trim().endsWith('"'))) {
                        // Find the start and end of the string value
                        const colonIndex = line.indexOf(':');
                        const startQuoteIndex = line.indexOf('"', colonIndex);
                        if (startQuoteIndex !== -1) {
                            const beforeValue = line.substring(0, startQuoteIndex + 1);
                            const afterValueStart = line.lastIndexOf('"');
                            if (afterValueStart > startQuoteIndex) {
                                const stringValue = line.substring(startQuoteIndex + 1, afterValueStart);
                                const afterValue = line.substring(afterValueStart);
                                // Escape quotes within the string value
                                const escapedValue = stringValue.replace(/"/g, '\\"');
                                return beforeValue + escapedValue + afterValue;
                            }
                        }
                    }
                    return line;
                });
                const reconstructedJson = fixedLines.join('\n');
                try {
                    return JSON.parse(reconstructedJson);
                }
                catch (thirdError) {
                    console.error('All JSON parsing attempts failed');
                    console.error('Original error:', firstError instanceof Error ? firstError.message : String(firstError));
                    console.error('Second error:', secondError instanceof Error ? secondError.message : String(secondError));
                    console.error('Third error:', thirdError instanceof Error ? thirdError.message : String(thirdError));
                    // Show a sample of the problematic content for debugging
                    const problemLines = lines.filter(line => line.includes(':') && line.includes('"') && line.split('"').length > 3);
                    if (problemLines.length > 0) {
                        console.error('Problematic lines:', problemLines.slice(0, 3));
                    }
                    return null;
                }
            }
        }
    }
    catch (error) {
        console.error('Error in safeParseJsonResponse:', error);
        console.error('Raw response:', response);
        return null;
    }
}
//# sourceMappingURL=aiResponseUtils.js.map