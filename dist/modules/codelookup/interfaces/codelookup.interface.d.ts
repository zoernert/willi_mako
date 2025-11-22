import type { ObjectId } from 'mongodb';
export interface CodeSearchResult {
    code: string;
    companyName: string;
    codeType: string;
    validFrom?: string;
    validTo?: string;
    source: 'bdew' | 'eic';
    companyUID?: string;
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
    bdewCodes?: string[];
    contacts?: ContactEntry[];
    contactSheetUrl?: string;
    markdown?: string;
    allSoftwareSystems?: SoftwareSystem[];
}
export interface SoftwareSystem {
    name: string;
    confidence: 'High' | 'Medium' | 'Low';
    evidence_text: string;
}
export interface MarketPartnerFinding {
    software_systems: SoftwareSystem[];
    source_url: string;
    retrieved_at: Date | string;
}
export interface MarketPartnerDocument {
    _id: ObjectId | string;
    companyName?: string;
    contacts?: ContactEntry[];
    findings?: MarketPartnerFinding[];
    processed_at?: Date | string;
    bdewCodes?: string[];
    contactSheetUrl?: string;
    markdown?: string;
    partner?: {
        "﻿BdewCode": string;
        BdewCodeType: string;
        BdewCodeFunction: string;
        BdewCodeStatus: string;
        BdewCodeStatusBegin: string;
        CompanyUID: string;
        CompanyName: string;
        PostCode: string;
        City: string;
        Street: string;
        Country: string;
        CodeContact: string;
        CodeContactPhone: string;
        CodeContactEmail: string;
        EditedOn: string;
    };
}
export interface SearchFilters {
    softwareSystems?: string[];
    postCode?: string;
    city?: string;
    codeFunction?: string;
    confidence?: ('High' | 'Medium' | 'Low')[];
    marketRole?: string;
}
export interface DetailedCodeResult extends CodeSearchResult {
    findings: MarketPartnerFinding[];
}
export interface BDEWCode {
    id: number;
    code_id: number;
    code_type: string;
    code: string;
    company_name: string;
    company_type: string;
    valid_from: string;
    valid_to: string;
}
export interface EICCode {
    id: number;
    eic_code: string;
    eic_long_name: string;
    display_name: string;
    eic_responsible_user: string;
    eic_type: string;
}
export interface ContactEntry {
    BdewCode?: string;
    BdewCodeType?: string;
    BdewCodeFunction?: string;
    BdewCodeStatus?: string;
    BdewCodeStatusBegin?: string;
    CompanyUID?: string;
    CompanyName?: string;
    PostCode?: string;
    City?: string;
    Street?: string;
    Country?: string;
    CodeContact?: string;
    CodeContactPhone?: string;
    CodeContactEmail?: string;
    EditedOn?: string;
    contactSheetUrl?: string;
    markdown?: string;
    EIC_Typ?: string;
    EIC_Code?: string;
    EIC_Display_Name?: string;
    EIC_Long_Name?: string;
    Website?: string;
    UstId?: string;
    EIC_Function?: string;
    Unternehmen?: string;
    Strasse?: string;
    PLZ?: string;
    Stadt?: string;
    Land?: string;
    International?: string;
}
//# sourceMappingURL=codelookup.interface.d.ts.map