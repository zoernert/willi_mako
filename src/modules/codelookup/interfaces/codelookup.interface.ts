import type { ObjectId } from 'mongodb';

export interface CodeSearchResult {
  code: string;
  companyName: string;
  codeType: string;
  validFrom?: string;
  validTo?: string;
  source: 'bdew' | 'eic';
  // Erweiterte Felder aus MongoDB
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
  bdewCodes?: string[]; // neue Sammlung aller zugeordneten BDEW Codes
  contacts?: ContactEntry[]; // komplette Kontaktliste / Marktrollen
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
  // Optionaler Partner-Block (BDEW-Daten)
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
  // Falls nur Discovery-Daten vorhanden sind
  companyName?: string;
  findings: MarketPartnerFinding[];
  processed_at?: Date | string;
  bdewCodes?: string[]; // Array von Codes laut Discovery
  contacts?: ContactEntry[]; // Vollständige Kontakt-/Rolleninformationen
}

export interface SearchFilters {
  softwareSystems?: string[];
  postCode?: string;
  city?: string;
  codeFunction?: string;
  confidence?: ('High' | 'Medium' | 'Low')[];
}

export interface DetailedCodeResult extends CodeSearchResult {
  findings: MarketPartnerFinding[];
  allSoftwareSystems: SoftwareSystem[];
}

// Legacy Interfaces für Backward Compatibility
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
