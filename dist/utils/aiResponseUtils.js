"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanJsonResponse = cleanJsonResponse;
exports.safeParseJsonResponse = safeParseJsonResponse;
function cleanJsonResponse(response) {
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    }
    else if (cleanResponse.startsWith('```')) {
        const firstNewline = cleanResponse.indexOf('\n');
        const lastNewline = cleanResponse.lastIndexOf('\n');
        if (firstNewline > 0 && lastNewline > firstNewline) {
            cleanResponse = cleanResponse.slice(firstNewline + 1, lastNewline).trim();
        }
        else {
            cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
    }
    return cleanResponse;
}
function safeParseJsonResponse(response) {
    try {
        const cleanResponse = cleanJsonResponse(response);
        return JSON.parse(cleanResponse);
    }
    catch (error) {
        console.error('Error parsing AI JSON response:', error);
        console.error('Raw response:', response);
        return null;
    }
}
//# sourceMappingURL=aiResponseUtils.js.map