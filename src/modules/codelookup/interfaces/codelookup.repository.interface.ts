import { CodeSearchResult } from './codelookup.interface';

export interface CodeLookupRepository {
  searchCodes(query: string): Promise<CodeSearchResult[]>;
  searchBDEWCodes(query: string): Promise<CodeSearchResult[]>;
  searchEICCodes(query: string): Promise<CodeSearchResult[]>;
}
