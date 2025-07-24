export interface CodeSearchResult {
  code: string;
  companyName: string;
  codeType: string;
  validFrom?: string;
  validTo?: string;
  source: 'bdew' | 'eic';
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
