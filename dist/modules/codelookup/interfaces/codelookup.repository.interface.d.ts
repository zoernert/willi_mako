import { CodeSearchResult, DetailedCodeResult, SearchFilters } from './codelookup.interface';
export interface CodeLookupRepository {
    searchCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    searchBDEWCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    searchEICCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    getCodeDetails(code: string): Promise<DetailedCodeResult | null>;
    getAvailableSoftwareSystems(): Promise<string[]>;
    getAvailableCities(): Promise<string[]>;
    getAvailableCodeFunctions(): Promise<string[]>;
}
//# sourceMappingURL=codelookup.repository.interface.d.ts.map