import { CodeLookupRepository } from '../interfaces/codelookup.repository.interface';
import { CodeSearchResult, DetailedCodeResult, SearchFilters } from '../interfaces/codelookup.interface';
export declare class MongoCodeLookupRepository implements CodeLookupRepository {
    private db;
    private collection;
    private client;
    constructor();
    private initializeConnection;
    private ensureConnection;
    private transformDocumentToResult;
    private buildSearchQuery;
    searchCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    searchBDEWCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    searchEICCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    getCodeDetails(code: string): Promise<DetailedCodeResult | null>;
    getAvailableSoftwareSystems(): Promise<string[]>;
    getAvailableCities(): Promise<string[]>;
    getAvailableCodeFunctions(): Promise<string[]>;
    private sortByRelevance;
}
//# sourceMappingURL=mongo-codelookup.repository.d.ts.map