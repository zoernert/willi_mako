import apiClient from './apiClient';

// New contact entry structure from backend
export interface ContactEntry {
  BdewCodeType?: string;
  BdewCodeFunction?: string;
  BdewCodeStatus?: string;
  BdewCodeStatusBegin?: string;
  CompanyUID?: string;
  PostCode?: string;
  City?: string;
  Street?: string;
  Country?: string;
  CodeContact?: string;
  CodeContactPhone?: string;
  CodeContactEmail?: string;
  EditedOn?: string;
}

export interface SoftwareSystem {
  name: string;
  confidence: 'High' | 'Medium' | 'Low';
  evidence_text: string;
}

// Unified result to support legacy and new backend payloads
export interface UnifiedCodeSearchResult {
  // New company-centric payload
  _id?: { $oid: string } | string;
  companyName?: string;
  bdewCodes?: string[];
  contacts?: ContactEntry[];
  findings?: Array<{
    software_systems?: SoftwareSystem[];
    source_url?: string;
    retrieved_at?: string | Date;
  }>;
  processed_at?: { $date: string } | string;
  allSoftwareSystems?: SoftwareSystem[];

  // Legacy fields (still optional for backward compatibility)
  code?: string;
  companyUID?: string;
  codeType?: string;
  validFrom?: string;
  validTo?: string;
  source?: 'bdew' | 'eic';
  postCode?: string;
  city?: string;
  street?: string;
  country?: string;
  contact?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  softwareSystems?: SoftwareSystem[];
  editedOn?: string;
}

export interface DetailedCodeResult extends UnifiedCodeSearchResult {}

export interface CodeSearchResponse {
  results: UnifiedCodeSearchResult[];
  count: number;
  query: string;
  filters?: SearchFilters;
}

export interface CodeLookupResponse {
  result: DetailedCodeResult | null;
  found: boolean;
  code: string;
}

export interface SearchFilters {
  softwareSystems?: string[];
  postCode?: string;
  city?: string;
  codeFunction?: string;
  confidence?: ('High' | 'Medium' | 'Low')[];
}

class CodeLookupApi {
  /**
   * Sucht nach BDEW- und EIC-Codes mit optionalen Filtern
   */
  async searchCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResponse> {
    const params = new URLSearchParams({ q: query });

    if (filters) {
      if (filters.softwareSystems?.length) {
        filters.softwareSystems.forEach((s) => params.append('softwareSystems', s));
      }
      if (filters.postCode) params.append('postCode', filters.postCode);
      if (filters.city) params.append('city', filters.city);
      if (filters.codeFunction) params.append('codeFunction', filters.codeFunction);
      if (filters.confidence?.length) {
        filters.confidence.forEach((c) => params.append('confidence', c));
      }
    }

    const response = await apiClient.get<CodeSearchResponse>(`/v1/codes/search?${params.toString()}`);
    return response;
  }

  /**
   * Sucht nur in BDEW-Codes (behält API-Kompatibilität)
   */
  async searchBDEWCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (filters?.softwareSystems?.length) filters.softwareSystems.forEach((s) => params.append('softwareSystems', s));
    if (filters?.postCode) params.append('postCode', filters.postCode);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.codeFunction) params.append('codeFunction', filters.codeFunction);
    if (filters?.confidence?.length) filters.confidence.forEach((c) => params.append('confidence', c));
    const response = await apiClient.get<CodeSearchResponse>(`/v1/codes/bdew/search?${params.toString()}`);
    return response;
  }

  /**
   * Sucht nur in EIC-Codes
   */
  async searchEICCodes(query: string, filters?: SearchFilters): Promise<CodeSearchResponse> {
    const params = new URLSearchParams({ q: query });
    if (filters?.softwareSystems?.length) filters.softwareSystems.forEach((s) => params.append('softwareSystems', s));
    if (filters?.postCode) params.append('postCode', filters.postCode);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.codeFunction) params.append('codeFunction', filters.codeFunction);
    if (filters?.confidence?.length) filters.confidence.forEach((c) => params.append('confidence', c));
    const response = await apiClient.get<CodeSearchResponse>(`/v1/codes/eic/search?${params.toString()}`);
    return response;
  }

  /**
   * Detaillierte Informationen zu einem Code
   */
  async getCodeDetails(code: string): Promise<CodeLookupResponse> {
    const response = await apiClient.get<CodeLookupResponse>(`/v1/codes/details/${encodeURIComponent(code)}`);
    return response;
  }

  async getAvailableSoftwareSystems(): Promise<{ softwareSystems: string[]; count: number }> {
    const response = await apiClient.get<{ softwareSystems: string[]; count: number }>(`/v1/codes/software-systems`);
    return response;
  }

  async getAvailableCities(): Promise<{ cities: string[]; count: number }> {
    const response = await apiClient.get<{ cities: string[]; count: number }>(`/v1/codes/cities`);
    return response;
  }

  async getAvailableCodeFunctions(): Promise<{ functions: string[]; count: number }> {
    const response = await apiClient.get<{ functions: string[]; count: number }>(`/v1/codes/functions`);
    return response;
  }
}

export const codeLookupApi = new CodeLookupApi();
export default codeLookupApi;
