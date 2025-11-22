import { CodeLookupRepository } from '../interfaces/codelookup.repository.interface';
import { CodeSearchResult, DetailedCodeResult, SearchFilters, SearchOptions } from '../interfaces/codelookup.interface';
export declare class CodeLookupService {
    private repository;
    constructor(repository: CodeLookupRepository);
    searchCodes(query?: string, filters?: SearchFilters, options?: SearchOptions): Promise<CodeSearchResult[]>;
    searchBDEWCodes(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<CodeSearchResult[]>;
    searchEICCodes(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<CodeSearchResult[]>;
    /**
     * Sucht nach einem spezifischen Code und gibt das erste Ergebnis zurück
     * Nützlich für die KI-Integration
     */
    lookupSingleCode(code: string): Promise<CodeSearchResult | null>;
    /**
     * Gibt detaillierte Informationen zu einem Code zurück
     */
    getCodeDetails(code: string): Promise<DetailedCodeResult | null>;
    /**
     * Gibt alle verfügbaren Software-Systeme zurück
     */
    getAvailableSoftwareSystems(): Promise<string[]>;
    /**
     * Gibt alle verfügbaren Städte zurück
     */
    getAvailableCities(): Promise<string[]>;
    /**
     * Gibt alle verfügbaren Code-Funktionen zurück
     */
    getAvailableCodeFunctions(): Promise<string[]>;
    /**
     * Erweiterte Suche mit Filtern
     */
    searchWithFilters(query: string, filters: SearchFilters): Promise<CodeSearchResult[]>;
}
//# sourceMappingURL=codelookup.service.d.ts.map