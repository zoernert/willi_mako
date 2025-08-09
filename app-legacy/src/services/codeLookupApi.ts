import apiClient from './apiClient';

// New contact entry structure from backend
export interface ContactEntry {
  BdewCode?: string;
  BdewCodeType?: string;
  BdewCodeFunction?: string;
  BdewCodeStatus?: string;
  BdewCodeStatusBegin?: string;
  CompanyName?: string;
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

    const raw = await apiClient.get<any>(`/v1/codes/search?${params.toString()}`);
    const payload = raw?.data || raw; // falls bereits entpackt
    return {
      results: payload.results || payload.data?.results || [],
      count: payload.count || payload.data?.count || (payload.results ? payload.results.length : 0),
      query,
      filters
    };
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
    const raw = await apiClient.get<any>(`/v1/codes/bdew/search?${params.toString()}`);
    const payload = raw?.data || raw;
    return {
      results: payload.results || payload.data?.results || [],
      count: payload.count || payload.data?.count || (payload.results ? payload.results.length : 0),
      query,
      filters
    };
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
    const raw = await apiClient.get<any>(`/v1/codes/eic/search?${params.toString()}`);
    const payload = raw?.data || raw;
    return {
      results: payload.results || payload.data?.results || [],
      count: payload.count || payload.data?.count || (payload.results ? payload.results.length : 0),
      query,
      filters
    };
  }

  /**
   * Detaillierte Informationen zu einem Code
   */
  async getCodeDetails(code: string): Promise<CodeLookupResponse> {
    const raw = await apiClient.get<any>(`/v1/codes/details/${encodeURIComponent(code)}`);
    const payload = raw?.data || raw;
    return {
      result: payload.result || payload.data?.result || null,
      found: payload.found ?? payload.data?.found ?? !!(payload.result || payload.data?.result),
      code
    };
  }

  async getAvailableSoftwareSystems(): Promise<{ softwareSystems: string[]; count: number }> {
    const raw = await apiClient.get<any>(`/v1/codes/software-systems`);
    const payload = raw?.data || raw;
    return { softwareSystems: payload.softwareSystems || [], count: payload.count || (payload.softwareSystems ? payload.softwareSystems.length : 0) };
  }

  async getAvailableCities(): Promise<{ cities: string[]; count: number }> {
    const raw = await apiClient.get<any>(`/v1/codes/cities`);
    const payload = raw?.data || raw;
    return { cities: payload.cities || [], count: payload.count || (payload.cities ? payload.cities.length : 0) };
  }

  async getAvailableCodeFunctions(): Promise<{ functions: string[]; count: number }> {
    const raw = await apiClient.get<any>(`/v1/codes/functions`);
    const payload = raw?.data || raw;
    return { functions: payload.functions || [], count: payload.count || (payload.functions ? payload.functions.length : 0) };
  }
}

export const codeLookupApi = new CodeLookupApi();
export default codeLookupApi;
