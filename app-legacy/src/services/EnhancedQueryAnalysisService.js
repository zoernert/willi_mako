/**
 * Enhanced Query Analysis Service for the React Legacy App
 * 
 * This service implements the improved query analysis techniques from the
 * debug tool to better understand user queries and optimize search results.
 */

import { generateEmbedding, generateHypotheticalAnswer, expandQueryForSearch } from './embeddingService';

class EnhancedQueryAnalysisService {
  // Document type mappings for better filtering
  static DOCUMENT_MAPPINGS = {
    // CS/30-spezifisch
    'CS/30': 'cs30_software',
    'CS30': 'cs30_software',
    'Schleupen': 'cs30_software',
    'S/CS': 'cs30_software',
    
    // Marktkommunikation-spezifisch
    'GPKE': 'GPKE_Geschäftsprozesse',
    'MaBiS': 'MaBiS_Marktregeln',
    'WiM': 'WiM_Wechselprozesse',
    'BDEW': 'BDEW_Marktregeln',
    'MaKo': 'MaKo_Marktkommunikation',
    'EDIFACT': 'EDIFACT_Standards',
    'UTILMD': 'UTILMD_Stammdaten',
    'MSCONS': 'MSCONS_Verbrauchsdaten',
    'GeLi': 'GeLi_Gas',
    'MPES': 'MPES_Prozesse',

    // Gemeinsame Begriffe
    'Zählerwechsel': 'Zaehleranlagen',
    'Tarifwechsel': 'Tarife',
    'Vertragsanlage': 'Vertraege',
    'Vertrag': 'Vertraege',
    'Anwendungsfehler': 'Fehlerbehebung',
    'Fehler': 'Fehlerbehebung',
    'E225': 'Fehlercodes',
    'Fristen': 'Fristen_Marktkommunikation',
    'Kundenverwaltung': 'Kundenverwaltung',
    'Lieferantenwechsel': 'Lieferantenwechsel'
  };

  // Definition patterns for identifying definition requests
  static DEFINITION_PATTERNS = [
    /was ist\s+/i,
    /definiere\s+/i,
    /was bedeutet\s+/i,
    /definition\s+(von|für)\s+/i,
    /erklär(e|ung)\s+(mir\s+)?/i,
    /was versteht man unter\s+/i,
    /abkürzung\s+/i,
    /steht.*für/i,
    /bedeutung von/i
  ];

  // Table patterns for identifying table/list requests
  static TABLE_PATTERNS = [
    /liste\s+(der|von|alle)/i,
    /tabelle\s+(mit|der|von)/i,
    /fristen\s+(für|von|in)/i,
    /werte\s+(in|der|aus)\s+(der\s+)?tabelle/i,
    /übersicht\s+(über|der|von)/i,
    /aufstellung\s+(der|von)/i,
    /codes?\s+(für|von|in)/i,
    /kennzahlen\s+(für|von)/i,
    /auflistung/i
  ];

  // Process-related patterns
  static PROCESS_PATTERNS = [
    /wie\s+(kann|funktioniert|läuft|geht)/i,
    /schritte\s+(für|bei)/i,
    /prozess\s+(für|bei)/i,
    /ablauf\s+(für|bei|von)/i,
    /durchführ(en|ung)/i,
    /vorgehen\s+(bei|für)/i,
    /wie\s+muss\s+ich/i,
    /wie\s+kann\s+ich/i
  ];

  // Energy market domain-specific terms for query expansion
  static DOMAIN_TERMS = {
    // CS/30-spezifische Begriffe
    'cs30': ['schleupen', 'cs/30', 'software', 'modul', 'menü', 'maske', 'formular'],
    'maske': ['formular', 'eingabemaske', 'bildschirmmaske', 'dialog', 'anzeige'],
    'schleupen': ['cs/30', 'cs30', 'software', 'anwendung', 'system'],
    
    // Gemeinsame Fachbegriffe
    'vertrag': ['vertragsanlage', 'vertragsmanagement', 'laufzeit', 'kündigung', 'vertragsdaten'],
    'zähler': ['zählerwechsel', 'zählerstand', 'messung', 'messeinrichtung', 'zählpunkt'],
    'kunde': ['kundendaten', 'kundenverwaltung', 'kundennummer', 'kundenportal', 'kundenkontakt'],
    'lieferant': ['lieferantenwechsel', 'belieferung', 'versorgerwechsel', 'grundversorgung'],
    'rechnung': ['rechnungsstellung', 'abrechnung', 'zahlungsweise', 'fälligkeit'],
    'netz': ['netznutzung', 'netzentgelte', 'netzbetreiber', 'anschluss', 'netzanschluss'],
    'markt': ['marktkommunikation', 'marktrolle', 'marktpartner', 'bilanzkreis', 'marktteilnehmer'],
    'edifact': ['mscons', 'utilmd', 'aperak', 'invoic', 'remadv', 'nachrichten'],
    'prozess': ['gpke', 'mabis', 'wim', 'geschäftsprozess', 'abläufe'],
    'fehler': ['fehlermeldung', 'fehlerbehebung', 'troubleshooting', 'fehlercode', 'fehlerbericht']
  };

  // CS30-specific error codes with descriptions
  static ERROR_CODES = {
    'E225': 'Fehler bei der Validierung von Zählerdaten',
    'E301': 'Fehler bei der Vertragsanlage',
    'E410': 'Fehler bei der Datenübermittlung (EDIFACT)',
    'E502': 'Fehler beim Lieferantenwechsel',
    'E610': 'Fehlende Zugriffsrechte',
    'E701': 'Inkonsistente Kundendaten',
    'E803': 'Fehler in der Marktkommunikation',
    'E904': 'Fehler bei der Netznutzungsabrechnung'
  };

  /**
   * Optimizes a query for better search results
   * @param {string} query Original user query
   * @param {Object} options Options for optimization
   * @returns {Promise<Object>} Optimized query data
   */
  static async optimizeQuery(query, options = {}) {
    const result = {
      originalQuery: query,
      expandedQuery: query,
      queryType: 'general',
      filter: {},
      embedding: null,
      hydeEnabled: options.useHyDE !== false,
      filterEnabled: options.useFilters !== false,
      collectionName: options.collectionName || 'cs30',
      processingTime: 0
    };

    const startTime = Date.now();

    try {
      // Step 1: Analyze query intent
      result.queryType = this.analyzeQueryIntent(query);
      console.log(`Query type detected: ${result.queryType} for collection ${result.collectionName}`);

      // Step 2: Expand query with domain-specific terms
      if (result.queryType !== 'error') {
        result.expandedQuery = this.expandQuery(query, result.collectionName);
        console.log(`Expanded query: ${result.expandedQuery}`);
      }

      // Step 3: Generate HyDE if enabled
      if (result.hydeEnabled) {
        try {
          const hypotheticalAnswer = await generateHypotheticalAnswer(query, result.collectionName);
          result.hypotheticalAnswer = hypotheticalAnswer;
          result.expandedQuery = hypotheticalAnswer;
          console.log('Generated hypothetical answer for HyDE');
        } catch (error) {
          console.error('Error generating HyDE:', error);
          // Fall back to expanded query
          result.hydeEnabled = false;
        }
      }

      // Step 4: Create intelligent filter based on query intent and collection
      if (result.filterEnabled) {
        result.filter = this.createIntelligentFilter(query, result.queryType, result.collectionName);
        console.log('Created intelligent filter:', result.filter);
      }

      // Step 5: Generate embedding from the expanded query or HyDE
      result.embedding = await generateEmbedding(result.expandedQuery, result.collectionName);
      console.log('Generated embedding for search');

      // Calculate processing time
      result.processingTime = Date.now() - startTime;

      return result;
    } catch (error) {
      console.error('Error in query optimization:', error);
      // Fallback to basic embedding of original query
      result.embedding = await generateEmbedding(query, result.collectionName);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Analyzes the intent of a query
   * @param {string} query User query
   * @returns {string} Query intent type
   */
  static analyzeQueryIntent(query) {
    const normalizedQuery = query.toLowerCase();

    // Check for definition queries
    for (const pattern of this.DEFINITION_PATTERNS) {
      if (pattern.test(normalizedQuery)) {
        return 'definition';
      }
    }

    // Check for table/list queries
    for (const pattern of this.TABLE_PATTERNS) {
      if (pattern.test(normalizedQuery)) {
        return 'table';
      }
    }

    // Check for process queries
    for (const pattern of this.PROCESS_PATTERNS) {
      if (pattern.test(normalizedQuery)) {
        return 'process';
      }
    }

    // Check for error code queries
    if (/fehler(meldung|code)?\s+[eE]\d{3}/i.test(normalizedQuery)) {
      return 'error';
    }

    // Check for specific document types
    for (const [keyword, docType] of Object.entries(this.DOCUMENT_MAPPINGS)) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        return docType.toLowerCase();
      }
    }

    return 'general';
  }

  /**
   * Expands a query with domain-specific terms
   * @param {string} query Original query
   * @param {string} collection Collection context
   * @returns {string} Expanded query
   */
  static expandQuery(query, collection = 'cs30') {
    const normalizedQuery = query.toLowerCase();
    let expansionTerms = new Set();

    // Collection-specific Begriffe einbeziehen
    if (collection === 'cs30') {
      expansionTerms.add('cs30');
      expansionTerms.add('schleupen');
    } else if (collection === 'willi_mako') {
      expansionTerms.add('marktkommunikation');
      expansionTerms.add('energiewirtschaft');
    }

    // Add domain-specific terms
    for (const [keyword, relatedTerms] of Object.entries(this.DOMAIN_TERMS)) {
      if (normalizedQuery.includes(keyword)) {
        relatedTerms.forEach(term => expansionTerms.add(term));
      }
    }

    // Don't expand the query too much
    const expansionArray = Array.from(expansionTerms).slice(0, 3);
    
    if (expansionArray.length === 0) {
      return query;
    }

    return `${query} ${expansionArray.join(' ')}`;
  }

  /**
   * Creates an intelligent filter based on query intent
   * @param {string} query User query
   * @param {string} queryType Detected query type
   * @param {string} collection Collection context
   * @returns {Object} Filter for vector search
   */
  static createIntelligentFilter(query, queryType, collection = 'cs30') {
    const filter = {};
    const normalizedQuery = query.toLowerCase();

    // Collection-spezifische Filter hinzufügen
    if (collection === 'cs30') {
      // CS/30-spezifische Filter
      if (normalizedQuery.includes('cs30') || 
          normalizedQuery.includes('schleupen') || 
          normalizedQuery.includes('cs/30')) {
        if (!filter.must) filter.must = [];
        filter.must.push({
          key: 'metadata.software',
          match: {
            value: 'cs30'
          }
        });
      }
    } else if (collection === 'willi_mako') {
      // Willi_mako-spezifische Filter
      if (normalizedQuery.includes('marktkommunikation') || 
          normalizedQuery.includes('mako') || 
          normalizedQuery.includes('edifact')) {
        if (!filter.must) filter.must = [];
        filter.must.push({
          key: 'metadata.domain',
          match: {
            value: 'marktkommunikation'
          }
        });
      }
    }

    // Basic filter structure based on query type
    if (queryType === 'definition') {
      if (!filter.must) filter.must = [];
      filter.must.push({
        key: 'metadata.document_type',
        match: {
          value: 'definition'
        }
      });
    } else if (queryType === 'table') {
      if (!filter.must) filter.must = [];
      filter.must.push({
        key: 'metadata.contains_table',
        match: {
          value: true
        }
      });
    } else if (queryType === 'error') {
      // Extract error code
      const errorMatch = normalizedQuery.match(/[eE](\d{3})/);
      if (errorMatch) {
        const errorCode = `E${errorMatch[1]}`;
        if (!filter.must) filter.must = [];
        filter.must.push({
          key: 'metadata.error_codes',
          match: {
            value: errorCode
          }
        });
      }
    } else if (queryType.includes('_')) {
      // It's a specific document type from DOCUMENT_MAPPINGS
      if (!filter.must) filter.must = [];
      filter.must.push({
        key: 'metadata.document_type',
        match: {
          value: queryType
        }
      });
    }

    // Add additional context from domain-specific keywords
    for (const [keyword, docType] of Object.entries(this.DOCUMENT_MAPPINGS)) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        if (!filter.should) {
          filter.should = [];
        }
        filter.should.push({
          key: 'metadata.keywords',
          match: {
            value: keyword.toLowerCase()
          }
        });
      }
    }

    return filter;
  }

  /**
   * Extract key entities from a query for better search
   * @param {string} query The query to extract from
   * @returns {Array} Array of key entities
   */
  static extractKeyEntities(query) {
    const entities = [];
    const normalizedQuery = query.toLowerCase();
    
    // Process types
    const processTypes = ['gpke', 'mabis', 'wim', 'geli', 'mpe', 'mpes'];
    processTypes.forEach(proc => {
      if (normalizedQuery.includes(proc)) {
        entities.push(proc.toUpperCase());
      }
    });
    
    // Message types
    const messageTypes = ['utilmd', 'mscons', 'aperak', 'invoic', 'remadv', 'reqote', 'quotes', 'orders', 'pricat'];
    messageTypes.forEach(msg => {
      if (normalizedQuery.includes(msg)) {
        entities.push(msg.toUpperCase());
      }
    });
    
    // Extract numeric codes (e.g., E225)
    const codeMatches = query.match(/\b[A-Z]\d{2,3}\b/g);
    if (codeMatches) {
      entities.push(...codeMatches);
    }
    
    return entities;
  }
}

export default EnhancedQueryAnalysisService;
