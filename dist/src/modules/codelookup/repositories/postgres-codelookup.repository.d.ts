import { Pool } from 'pg';
import { CodeLookupRepository } from '../interfaces/codelookup.repository.interface';
import { CodeSearchResult } from '../interfaces/codelookup.interface';
export declare class PostgresCodeLookupRepository implements CodeLookupRepository {
    private pool;
    constructor(pool: Pool);
    searchCodes(query: string): Promise<CodeSearchResult[]>;
    searchBDEWCodes(query: string): Promise<CodeSearchResult[]>;
    searchEICCodes(query: string): Promise<CodeSearchResult[]>;
}
//# sourceMappingURL=postgres-codelookup.repository.d.ts.map