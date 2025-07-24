import { CodeLookupRepository } from '../interfaces/codelookup.repository.interface';
import { CodeSearchResult } from '../interfaces/codelookup.interface';

export class CodeLookupService {
  constructor(private repository: CodeLookupRepository) {}

  async searchCodes(query: string): Promise<CodeSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();
    
    try {
      const results = await this.repository.searchCodes(trimmedQuery);
      return results;
    } catch (error) {
      console.error('Error searching codes:', error);
      throw new Error('Failed to search codes');
    }
  }

  async searchBDEWCodes(query: string): Promise<CodeSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();
    
    try {
      const results = await this.repository.searchBDEWCodes(trimmedQuery);
      return results;
    } catch (error) {
      console.error('Error searching BDEW codes:', error);
      throw new Error('Failed to search BDEW codes');
    }
  }

  async searchEICCodes(query: string): Promise<CodeSearchResult[]> {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const trimmedQuery = query.trim();
    
    try {
      const results = await this.repository.searchEICCodes(trimmedQuery);
      return results;
    } catch (error) {
      console.error('Error searching EIC codes:', error);
      throw new Error('Failed to search EIC codes');
    }
  }

  /**
   * Sucht nach einem spezifischen Code und gibt das erste Ergebnis zurück
   * Nützlich für die KI-Integration
   */
  async lookupSingleCode(code: string): Promise<CodeSearchResult | null> {
    const results = await this.searchCodes(code);
    return results.length > 0 ? results[0] : null;
  }
}
