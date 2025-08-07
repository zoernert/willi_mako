"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeLookupService = void 0;
class CodeLookupService {
    constructor(repository) {
        this.repository = repository;
    }
    async searchCodes(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const trimmedQuery = query.trim();
        try {
            const results = await this.repository.searchCodes(trimmedQuery);
            return results;
        }
        catch (error) {
            console.error('Error searching codes:', error);
            throw new Error('Failed to search codes');
        }
    }
    async searchBDEWCodes(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const trimmedQuery = query.trim();
        try {
            const results = await this.repository.searchBDEWCodes(trimmedQuery);
            return results;
        }
        catch (error) {
            console.error('Error searching BDEW codes:', error);
            throw new Error('Failed to search BDEW codes');
        }
    }
    async searchEICCodes(query) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const trimmedQuery = query.trim();
        try {
            const results = await this.repository.searchEICCodes(trimmedQuery);
            return results;
        }
        catch (error) {
            console.error('Error searching EIC codes:', error);
            throw new Error('Failed to search EIC codes');
        }
    }
    /**
     * Sucht nach einem spezifischen Code und gibt das erste Ergebnis zurück
     * Nützlich für die KI-Integration
     */
    async lookupSingleCode(code) {
        const results = await this.searchCodes(code);
        return results.length > 0 ? results[0] : null;
    }
}
exports.CodeLookupService = CodeLookupService;
//# sourceMappingURL=codelookup.service.js.map