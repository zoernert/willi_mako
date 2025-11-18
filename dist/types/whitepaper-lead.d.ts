/**
 * Types for Whitepaper Lead Qualification
 */
export type DownloadReason = 'Anderes Interesse' | 'Unternehmensentwicklung' | 'Energieforschung' | 'Strategieberatung' | 'Softwareentwicklung' | 'Medienmeldung' | 'Wissensmanagement';
export type UsagePurpose = 'Persönliches Lesen' | 'Aufbereitung in Studie/Forschung' | 'Evaluation' | 'Verteilung an Kollegen/Peers' | 'Forschung und Lehre';
export type ContactPreference = 'Newsletter (ca. 1x/Monat)' | 'Bilaterale Email Beratung/Schulung' | 'Bilaterale Evaluation Whitepaper';
export interface WhitepaperLeadData {
    email: string;
    whitepaperTitle: string;
    whitepaperPdfUrl: string;
    downloadReasons: DownloadReason[];
    usagePurpose: UsagePurpose;
    contactPreferences: ContactPreference[];
}
//# sourceMappingURL=whitepaper-lead.d.ts.map