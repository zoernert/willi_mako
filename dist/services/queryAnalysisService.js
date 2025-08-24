"use strict";
/**
 * Service für intelligente Query-Analyse und Dokumentenfilterung
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryAnalysisService = void 0;
class QueryAnalysisService {
    /**
     * Analysiert eine Nutzeranfrage und extrahiert Filterkriterien
     */
    static analyzeQuery(query, abbreviationIndex) {
        const normalizedQuery = query.toLowerCase().trim();
        let intentType = 'general';
        let confidence = 0.7;
        const filterCriteria = {
            temporal: { requireLatest: true }
        };
        // 1. Erkenne Intent-Typ
        if (this.DEFINITION_PATTERNS.some(pattern => pattern.test(normalizedQuery))) {
            intentType = 'definition';
            filterCriteria.chunkTypes = ['definition', 'abbreviation'];
            confidence = 0.9;
        }
        else if (this.TABLE_PATTERNS.some(pattern => pattern.test(normalizedQuery))) {
            intentType = 'table_data';
            filterCriteria.chunkTypes = ['structured_table'];
            confidence = 0.85;
        }
        // 2. Erkenne Dokumentenbezug
        let documentReference;
        for (const [keyword, documentBaseName] of Object.entries(this.DOCUMENT_MAPPINGS)) {
            const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
            if (keywordRegex.test(query)) {
                documentReference = keyword;
                filterCriteria.documentBaseName = documentBaseName;
                if (intentType === 'general') {
                    intentType = 'document_specific';
                }
                confidence = Math.min(confidence + 0.1, 1.0);
                break;
            }
        }
        // 3. Query-Expansion mit Abkürzungen
        let expandedQuery = query;
        if (abbreviationIndex) {
            for (const [abbreviation, fullTerm] of abbreviationIndex.entries()) {
                const regex = new RegExp(`\\b${abbreviation}\\b`, 'gi');
                if (regex.test(query)) {
                    expandedQuery = expandedQuery.replace(regex, `${abbreviation} (${fullTerm})`);
                }
            }
        }
        // 4. Erweitere Query basierend auf Intent
        if (intentType === 'definition') {
            expandedQuery = `Definition und Bedeutung: ${expandedQuery}`;
        }
        else if (intentType === 'table_data') {
            expandedQuery = `Tabellarische Daten und Listen: ${expandedQuery}`;
        }
        return {
            intentType,
            documentReference,
            filterCriteria,
            expandedQuery,
            confidence
        };
    }
    /**
     * Erstellt Qdrant-Filter basierend auf Analyse-Ergebnissen
     */
    static createQdrantFilter(analysisResult, latestDocumentVersions) {
        var _a;
        const filter = {};
        const mustFilters = [];
        // Chunk-Type Filter
        if (analysisResult.filterCriteria.chunkTypes) {
            mustFilters.push({
                key: 'chunk_type',
                match: {
                    value: analysisResult.filterCriteria.chunkTypes.length === 1
                        ? analysisResult.filterCriteria.chunkTypes[0]
                        : undefined,
                    any: analysisResult.filterCriteria.chunkTypes.length > 1
                        ? analysisResult.filterCriteria.chunkTypes
                        : undefined
                }
            });
        }
        // Dokument-spezifischer Filter
        if (analysisResult.filterCriteria.documentBaseName) {
            mustFilters.push({
                key: 'document_metadata.document_base_name',
                match: { value: analysisResult.filterCriteria.documentBaseName }
            });
        }
        else if (((_a = analysisResult.filterCriteria.temporal) === null || _a === void 0 ? void 0 : _a.requireLatest) && (latestDocumentVersions === null || latestDocumentVersions === void 0 ? void 0 : latestDocumentVersions.length)) {
            // Filter für aktuellste Versionen
            mustFilters.push({
                key: 'document_metadata.document_base_name',
                match: { any: latestDocumentVersions }
            });
        }
        if (mustFilters.length > 0) {
            filter.must = mustFilters;
        }
        return Object.keys(filter).length > 0 ? filter : null;
    }
    /**
     * Erstellt eine Zusammenfassung der angewendeten Filter für Logging
     */
    static createFilterSummary(analysisResult) {
        const parts = [];
        parts.push(`Intent: ${analysisResult.intentType}`);
        if (analysisResult.documentReference) {
            parts.push(`Dokument: ${analysisResult.documentReference}`);
        }
        if (analysisResult.filterCriteria.chunkTypes) {
            parts.push(`Chunk-Types: ${analysisResult.filterCriteria.chunkTypes.join(', ')}`);
        }
        parts.push(`Confidence: ${(analysisResult.confidence * 100).toFixed(1)}%`);
        return parts.join(' | ');
    }
}
exports.QueryAnalysisService = QueryAnalysisService;
QueryAnalysisService.DOCUMENT_MAPPINGS = {
    'GPKE': 'BK6-24-174_GPKE_Teil1_Lesefassung',
    'MaBiS': 'MaBiS_Marktregeln_Bilanzkreisabrechnung_Strom',
    'WiM': 'WiM_Wechselprozesse_im_Messwesen',
    'BDEW': 'BDEW_Marktregeln',
    'StromNEV': 'StromNEV_Netzentgeltverordnung',
    'EnWG': 'EnWG_Energiewirtschaftsgesetz',
    'MaKo': 'MaKo_Marktkommunikation',
    'EDIFACT': 'EDIFACT_Standards',
    'OBIS': 'OBIS_Kennzahlen',
    'UTILMD': 'UTILMD_Stammdaten',
    'MSCONS': 'MSCONS_Verbrauchsdaten'
};
QueryAnalysisService.DEFINITION_PATTERNS = [
    /was ist\s+/i,
    /definiere\s+/i,
    /was bedeutet\s+/i,
    /definition\s+(von|für)\s+/i,
    /erklär(e|ung)\s+(mir\s+)?/i,
    /was versteht man unter\s+/i,
    /abkürzung\s+/i,
    /steht.*für/i
];
QueryAnalysisService.TABLE_PATTERNS = [
    /liste\s+(der|von|alle)/i,
    /tabelle\s+(mit|der|von)/i,
    /fristen\s+(für|von|in)/i,
    /werte\s+(in|der|aus)\s+(der\s+)?tabelle/i,
    /übersicht\s+(über|der|von)/i,
    /aufstellung\s+(der|von)/i,
    /codes?\s+(für|von|in)/i,
    /kennzahlen\s+(für|von)/i
];
//# sourceMappingURL=queryAnalysisService.js.map