import { Pool } from 'pg';
import { CodeLookupRepository } from '../interfaces/codelookup.repository.interface';
import { CodeSearchResult, DetailedCodeResult, SearchFilters } from '../interfaces/codelookup.interface';
export declare class PostgresCodeLookupRepository implements CodeLookupRepository {
    private pool;
    constructor(pool: Pool);
    searchCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    searchBDEWCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    searchEICCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResult[]>;
    getCodeDetails(code: string): Promise<DetailedCodeResult | null>;
    getAvailableSoftwareSystems(): Promise<string[]>;
    getAvailableCities(): Promise<string[]>;
    getAvailableCodeFunctions(): Promise<string[]>;
}
//# sourceMappingURL=postgres-codelookup.repository.d.ts.map