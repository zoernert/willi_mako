import apiClient from './apiClient';
import { MarketRole, MarketPartnerContact } from '../types/bilateral';

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
  
  // Zusätzliche EIC-Informationen
  EIC_Typ?: string;
  EIC_Code?: string;
  EIC_Display_Name?: string;
  EIC_Long_Name?: string;
  Website?: string;
  UstId?: string;
  EIC_Function?: string;
  
  // Deutsche Bezeichnungen
  Unternehmen?: string;
  Strasse?: string;
  PLZ?: string;
  Stadt?: string;
  Land?: string;
  International?: string;
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
   * Sucht nach BDEW- und EIC-Codes with optional filters
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

  /**
   * Findet einen Marktpartner anhand des Codes und bereitet ihn für die UI-Komponenten vor
   */
  async findByCode(code: string): Promise<{
    code: string;
    name: string;
    roles: MarketRole[];
    address: {
      street?: string;
      postCode?: string;
      city?: string;
      country?: string;
    };
    contacts: MarketPartnerContact[];
  } | null> {
    try {
      const response = await this.getCodeDetails(code);
      
      if (!response.found || !response.result) {
        return null;
      }
      
      const result = response.result;
      
      // Kontakte vorbereiten
      const contacts: MarketPartnerContact[] = [];
      
      // Legacy-Format unterstützen
      if (result.contact?.email || result.contact?.name) {
        contacts.push({
          role: 'OTHER' as MarketRole,
          roleName: 'Allgemein',
          contactName: result.contact?.name,
          contactEmail: result.contact?.email,
          contactPhone: result.contact?.phone,
          isDefault: true
        });
      }
      
      // Neues Format mit mehreren Kontakten
      if (result.contacts?.length) {
        result.contacts.forEach((contact: any) => {
          if (contact.CodeContactEmail || contact.CodeContact) {
            // Versuche Rolle aus BdewCodeFunction zu extrahieren
            let role: MarketRole = 'OTHER';
            const roleMapping: Record<string, MarketRole> = {
              'LF': 'LF',
              'VNB': 'VNB', 
              'MSB': 'MSB',
              'UNB': 'UNB',
              'LIEFERANT': 'LF',
              'VERTEILNETZBETREIBER': 'VNB',
              'MESSSTELLENBETREIBER': 'MSB'
            };
            
            if (contact.BdewCodeFunction) {
              const func = contact.BdewCodeFunction.toUpperCase();
              role = (roleMapping[func] || 'OTHER') as MarketRole;
            }
            
            contacts.push({
              role,
              roleName: role === 'LF' ? 'Lieferant' : 
                        role === 'VNB' ? 'Verteilnetzbetreiber' : 
                        role === 'MSB' ? 'Messstellenbetreiber' : 
                        role === 'UNB' ? 'Übertragungsnetzbetreiber' : 'Allgemein',
              contactName: contact.CodeContact,
              contactEmail: contact.CodeContactEmail,
              contactPhone: contact.CodeContactPhone,
              isDefault: contacts.length === 0,
              
              // BDEW-Codedetails
              BdewCode: contact.BdewCode,
              BdewCodeType: contact.BdewCodeType,
              BdewCodeFunction: contact.BdewCodeFunction,
              BdewCodeStatus: contact.BdewCodeStatus,
              BdewCodeStatusBegin: contact.BdewCodeStatusBegin,
              CompanyUID: contact.CompanyUID,
              CompanyName: contact.CompanyName,
              EditedOn: contact.EditedOn,
              
              // Zusätzliche EIC-Informationen
              EIC_Typ: contact.EIC_Typ,
              EIC_Code: contact.EIC_Code,
              EIC_Display_Name: contact.EIC_Display_Name,
              EIC_Long_Name: contact.EIC_Long_Name,
              Website: contact.Website,
              UstId: contact.UstId,
              EIC_Function: contact.EIC_Function,
              
              // Deutsche Bezeichnungen
              Unternehmen: contact.Unternehmen,
              Strasse: contact.Strasse,
              PLZ: contact.PLZ,
              Stadt: contact.Stadt,
              Land: contact.Land,
              International: contact.International
            });
          }
        });
      }
      
      // Mindestens einen Standard-Kontakt sicherstellen
      if (contacts.length === 0) {
        contacts.push({
          role: 'OTHER' as MarketRole,
          roleName: 'Allgemein',
          isDefault: true
        });
      }
      
      // MarketPartnerInfo für UI vorbereiten
      return {
        code: result.code || result.bdewCodes?.[0] || code,
        name: result.companyName || '',
        roles: contacts.map(c => c.role),
        address: {
          street: result.street,
          postCode: result.postCode,
          city: result.city,
          country: result.country
        },
        contacts: contacts
      };
    } catch (error) {
      console.error('Fehler beim Laden des Marktpartners:', error);
      return null;
    }
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

  async reportError(marketPartner: any, errorDescription: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post<{ success: boolean; message: string }>(`/v1/codes/report-error`, {
      marketPartner,
      errorDescription
    });
    return response;
  }
}

export const codeLookupApi = new CodeLookupApi();
export default codeLookupApi;
