import { CodeLookupRepository } from '../interfaces/codelookup.repository.interface';
import { CodeSearchResult } from '../interfaces/codelookup.interface';
export declare class CodeLookupService {
    private repository;
    constructor(repository: CodeLookupRepository);
    searchCodes(query: string): Promise<CodeSearchResult[]>;
    searchBDEWCodes(query: string): Promise<CodeSearchResult[]>;
    searchEICCodes(query: string): Promise<CodeSearchResult[]>;
    /**
     * Sucht nach einem spezifischen Code und gibt das erste Ergebnis zurück
     * Nützlich für die KI-Integration
     */
    lookupSingleCode(code: string): Promise<CodeSearchResult | null>;
}
//# sourceMappingURL=codelookup.service.d.ts.map