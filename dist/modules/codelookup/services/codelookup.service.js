"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeLookupService = void 0;
class CodeLookupService {
    constructor(repository) {
        this.repository = repository;
    }
    async searchCodes(query, filters) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const trimmedQuery = query.trim();
        try {
            const results = await this.repository.searchCodes(trimmedQuery, filters);
            return results;
        }
        catch (error) {
            console.error('Error searching codes:', error);
            throw new Error('Failed to search codes');
        }
    }
    async searchBDEWCodes(query, filters) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const trimmedQuery = query.trim();
        try {
            const results = await this.repository.searchBDEWCodes(trimmedQuery, filters);
            return results;
        }
        catch (error) {
            console.error('Error searching BDEW codes:', error);
            throw new Error('Failed to search BDEW codes');
        }
    }
    async searchEICCodes(query, filters) {
        if (!query || query.trim().length === 0) {
            return [];
        }
        const trimmedQuery = query.trim();
        try {
            const results = await this.repository.searchEICCodes(trimmedQuery, filters);
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
    /**
     * Gibt detaillierte Informationen zu einem Code zurück
     */
    async getCodeDetails(code) {
        try {
            return await this.repository.getCodeDetails(code);
        }
        catch (error) {
            console.error('Error getting code details:', error);
            throw new Error('Failed to get code details');
        }
    }
    /**
     * Gibt alle verfügbaren Software-Systeme zurück
     */
    async getAvailableSoftwareSystems() {
        try {
            return await this.repository.getAvailableSoftwareSystems();
        }
        catch (error) {
            console.error('Error getting software systems:', error);
            return [];
        }
    }
    /**
     * Gibt alle verfügbaren Städte zurück
     */
    async getAvailableCities() {
        try {
            return await this.repository.getAvailableCities();
        }
        catch (error) {
            console.error('Error getting cities:', error);
            return [];
        }
    }
    /**
     * Gibt alle verfügbaren Code-Funktionen zurück
     */
    async getAvailableCodeFunctions() {
        try {
            return await this.repository.getAvailableCodeFunctions();
        }
        catch (error) {
            console.error('Error getting code functions:', error);
            return [];
        }
    }
    /**
     * Erweiterte Suche mit Filtern
     */
    async searchWithFilters(query, filters) {
        return this.searchCodes(query, filters);
    }
}
exports.CodeLookupService = CodeLookupService;
//# sourceMappingURL=codelookup.service.js.map