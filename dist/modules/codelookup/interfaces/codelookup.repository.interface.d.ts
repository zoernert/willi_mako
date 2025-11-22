import { CodeSearchResult, DetailedCodeResult, SearchFilters, SearchOptions } from './codelookup.interface';
export interface CodeLookupRepository {
    searchCodes(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<CodeSearchResult[]>;
    searchBDEWCodes(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<CodeSearchResult[]>;
    searchEICCodes(query: string, filters?: SearchFilters, options?: SearchOptions): Promise<CodeSearchResult[]>;
    getCodeDetails(code: string): Promise<DetailedCodeResult | null>;
    getAvailableSoftwareSystems(): Promise<string[]>;
    getAvailableCities(): Promise<string[]>;
    getAvailableCodeFunctions(): Promise<string[]>;
}
//# sourceMappingURL=codelookup.repository.interface.d.ts.map