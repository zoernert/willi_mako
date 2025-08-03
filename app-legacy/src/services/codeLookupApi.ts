import apiClient from './apiClient';

export interface CodeSearchResult {
  code: string;
  companyName: string;
  codeType: string;
  validFrom?: string;
  validTo?: string;
  source: 'bdew' | 'eic';
}

export interface CodeSearchResponse {
  results: CodeSearchResult[];
  count: number;
  query: string;
}

export interface CodeLookupResponse {
  result: CodeSearchResult | null;
  found: boolean;
  code: string;
}

class CodeLookupApi {
  /**
   * Sucht nach BDEW- und EIC-Codes
   */
  async searchCodes(query: string): Promise<CodeSearchResponse> {
    const response = await apiClient.get<CodeSearchResponse>(`/v1/codes/search`, {
      params: { q: query }
    });
    return response;
  }

  /**
   * Sucht nur in BDEW-Codes
   */
  async searchBDEWCodes(query: string): Promise<CodeSearchResponse> {
    const response = await apiClient.get<CodeSearchResponse>(`/v1/codes/bdew/search`, {
      params: { q: query }
    });
    return response;
  }

  /**
   * Sucht nur in EIC-Codes
   */
  async searchEICCodes(query: string): Promise<CodeSearchResponse> {
    const response = await apiClient.get<CodeSearchResponse>(`/v1/codes/eic/search`, {
      params: { q: query }
    });
    return response;
  }

  /**
   * Schaut einen spezifischen Code nach
   */
  async lookupCode(code: string): Promise<CodeLookupResponse> {
    const response = await apiClient.get<CodeLookupResponse>(`/v1/codes/lookup/${encodeURIComponent(code)}`);
    return response;
  }
}

export const codeLookupApi = new CodeLookupApi();
export default codeLookupApi;
