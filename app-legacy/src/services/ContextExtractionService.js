/**
 * Context Extraction Service for the React Legacy App
 * 
 * This service implements improved context extraction and formatting
 * for better integration of search results into the chat response.
 */

class ContextExtractionService {
  /**
   * Extract formatted context from search results
   * @param {Array} results Search results from OptimizedSearchService
   * @param {string} collectionName Optional collection name for context
   * @returns {Object} Formatted context with different sections
   */
  static extractContext(results, collectionName = 'cs30') {
    if (!results || results.length === 0) {
      return {
        rawText: '',
        sections: {},
        sources: []
      };
    }
    
    // Limit the number of results to avoid token limits
    // Priorisiere höher bewertete Ergebnisse
    const limitedResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Maximal 8 Dokumente verwenden
    
    // Group results by type
    const groupedResults = this.groupResultsByType(limitedResults);
    
    // Format the complete raw text for the LLM
    const rawText = this.formatRawText(limitedResults, groupedResults, collectionName);
    
    // Extract sources for attribution
    const sources = this.extractSources(limitedResults);
    
    return {
      rawText,
      sections: groupedResults,
      sources
    };
  }
  
  /**
   * Group search results by document type
   * @param {Array} results Search results
   * @returns {Object} Results grouped by type
   */
  static groupResultsByType(results) {
    const grouped = {};
    
    results.forEach(result => {
      // Determine the type
      let type = 'general';
      
      if (result.payload?.chunk_type) {
        type = result.payload.chunk_type;
      } else if (result.payload?.type) {
        type = result.payload.type;
      } else {
        // Infer type from content if needed
        type = this.inferDocumentType(result);
      }
      
      // Initialize group if not exists
      if (!grouped[type]) {
        grouped[type] = [];
      }
      
      // Add to group
      grouped[type].push({
        id: result.id,
        score: result.score,
        title: result.payload?.title || result.payload?.name || 'Unbenanntes Dokument',
        content: result.payload?.content || result.payload?.text || '',
        source: result.payload?.source || 'Unbekannte Quelle',
        date: result.payload?.date || result.payload?.updated_at || '',
        metadata: result.search_metadata || {}
      });
    });
    
    return grouped;
  }
  
  /**
   * Format raw text context for the LLM
   * @param {Array} results All search results
   * @param {Object} groupedResults Results grouped by type
   * @param {string} collectionName Collection name for context
   * @returns {string} Formatted context text
   */
  static formatRawText(results, groupedResults, collectionName = 'cs30') {
    let contextText = '';
    
    // Kontext-Header basierend auf der Collection
    if (collectionName === 'cs30') {
      contextText += '# Kontext für CS/30 Software-Anfrage\n\n';
    } else if (collectionName === 'willi_mako') {
      contextText += '# Kontext für Marktkommunikation-Anfrage\n\n';
    } else {
      contextText += '# Kontext für Anfrage\n\n';
    }
    
    // Add definitions first if they exist
    if (groupedResults.definition) {
      contextText += '## Definitionen\n\n';
      groupedResults.definition.forEach((result, index) => {
        contextText += `[Definition ${index + 1}] (Relevanz: ${result.score.toFixed(2)})\n`;
        if (result.title) {
          contextText += `### ${result.title}\n\n`;
        }
        contextText += `${result.content}\n\n`;
        if (result.source) {
          contextText += `Quelle: ${result.source}`;
          if (result.date) {
            contextText += ` (Stand: ${result.date})`;
          }
          contextText += '\n\n';
        }
      });
    }
    
    // Add structured tables
    if (groupedResults.structured_table || groupedResults.table) {
      const tableResults = groupedResults.structured_table || groupedResults.table;
      contextText += '## Tabellarische Informationen\n\n';
      tableResults.forEach((result, index) => {
        contextText += `[Tabelle ${index + 1}] (Relevanz: ${result.score.toFixed(2)})\n`;
        if (result.title) {
          contextText += `### ${result.title}\n\n`;
        }
        contextText += `${result.content}\n\n`;
        if (result.source) {
          contextText += `Quelle: ${result.source}`;
          if (result.date) {
            contextText += ` (Stand: ${result.date})`;
          }
          contextText += '\n\n';
        }
      });
    }
    
    // Add process information
    if (groupedResults.process || groupedResults.procedure) {
      const processResults = groupedResults.process || groupedResults.procedure;
      contextText += '## Prozessinformationen\n\n';
      processResults.forEach((result, index) => {
        contextText += `[Prozess ${index + 1}] (Relevanz: ${result.score.toFixed(2)})\n`;
        if (result.title) {
          contextText += `### ${result.title}\n\n`;
        }
        contextText += `${result.content}\n\n`;
        if (result.source) {
          contextText += `Quelle: ${result.source}`;
          if (result.date) {
            contextText += ` (Stand: ${result.date})`;
          }
          contextText += '\n\n';
        }
      });
    }
    
    // Add error information if exists
    if (groupedResults.error || groupedResults.error_code) {
      const errorResults = groupedResults.error || groupedResults.error_code;
      contextText += '## Fehlerbeschreibungen\n\n';
      errorResults.forEach((result, index) => {
        contextText += `[Fehler ${index + 1}] (Relevanz: ${result.score.toFixed(2)})\n`;
        if (result.title) {
          contextText += `### ${result.title}\n\n`;
        }
        contextText += `${result.content}\n\n`;
        if (result.source) {
          contextText += `Quelle: ${result.source}`;
          if (result.date) {
            contextText += ` (Stand: ${result.date})`;
          }
          contextText += '\n\n';
        }
      });
    }
    
    // Add remaining document types
    Object.keys(groupedResults).forEach(type => {
      if (!['definition', 'structured_table', 'table', 'process', 'procedure', 'error', 'error_code'].includes(type)) {
        contextText += `## ${this.formatTypeName(type)}\n\n`;
        groupedResults[type].forEach((result, index) => {
          contextText += `[${this.formatTypeName(type)} ${index + 1}] (Relevanz: ${result.score.toFixed(2)})\n`;
          if (result.title) {
            contextText += `### ${result.title}\n\n`;
          }
          contextText += `${result.content}\n\n`;
          if (result.source) {
            contextText += `Quelle: ${result.source}`;
            if (result.date) {
              contextText += ` (Stand: ${result.date})`;
            }
            contextText += '\n\n';
          }
        });
      }
    });
    
    // Anweisungen an das LLM für bessere Antworten
    contextText += '\n## Anweisungen zur Antwortgenerierung\n\n';
    
    if (collectionName === 'cs30') {
      contextText += 'Bitte beantworte die Anfrage basierend auf den obigen Kontextinformationen. ' +
                     'Verwende die CS/30-spezifischen Informationen, um präzise Anleitungen mit exakten Menüpfaden, ' +
                     'Formularfeldern und Arbeitsschritten zu geben. Wenn keine spezifischen CS/30-Informationen ' +
                     'vorliegen, gib an, dass die Anfrage nicht direkt aus den Dokumenten beantwortet werden kann.\n\n';
    } else {
      contextText += 'Bitte beantworte die Anfrage basierend auf den obigen Kontextinformationen. ' +
                     'Verwende die Informationen zur Marktkommunikation, um präzise Erklärungen zu Prozessen, ' +
                     'Begriffen und Regularien zu geben. Wenn keine spezifischen Informationen vorliegen, ' +
                     'gib an, dass die Anfrage nicht direkt aus den Dokumenten beantwortet werden kann.\n\n';
    }
    
    contextText += 'Wichtig: Gib immer Quellenangaben in deiner Antwort an, wenn du Informationen aus ' +
                   'den bereitgestellten Dokumenten verwendest. Bewerte die Aktualität der Quellen und ' +
                   'weise gegebenenfalls auf veraltete Informationen hin.\n';
    
    return contextText.trim();
  }
  
  /**
   * Extract sources for attribution
   * @param {Array} results Search results
   * @returns {Array} List of sources
   */
  static extractSources(results) {
    const sources = [];
    const sourceMap = new Map();
    
    results.forEach(result => {
      const source = result.payload?.source;
      const date = result.payload?.date || result.payload?.updated_at;
      
      if (source && !sourceMap.has(source)) {
        sourceMap.set(source, true);
        sources.push({
          title: result.payload?.title || 'Unbekannter Titel',
          source: source,
          date: date || '',
          score: result.score
        });
      }
    });
    
    // Sortiere Quellen nach Relevanz
    return sources.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Infer document type from content if not explicitly specified
   * @param {Object} result Search result
   * @returns {string} Inferred document type
   */
  static inferDocumentType(result) {
    const content = result.payload?.content || result.payload?.text || '';
    const title = result.payload?.title || result.payload?.name || '';
    
    // Check for definition patterns
    if (title.match(/^(Definition|Bedeutung|Was ist)/i) || 
        content.match(/^(Definition|Bedeutung):/i) ||
        content.match(/bezeichnet|bedeutet|steht für/i)) {
      return 'definition';
    }
    
    // Check for table patterns
    if (content.includes('|----') || 
        content.match(/\|\s*[^\|]+\s*\|/) ||
        title.match(/Tabelle|Liste|Übersicht|Aufstellung/i)) {
      return 'table';
    }
    
    // Check for process patterns
    if (title.match(/Prozess|Vorgehen|Ablauf|Schritte/i) ||
        content.match(/Schritt \d|Prozessablauf|Im ersten Schritt/i)) {
      return 'process';
    }
    
    // Check for error patterns
    if (title.match(/Fehler|Error|Problem|Troubleshooting/i) ||
        content.match(/Fehlermeldung|Fehlercode|E\d{3}/i)) {
      return 'error';
    }
    
    return 'general';
  }
  
  /**
   * Format a type name for display
   * @param {string} type Document type
   * @returns {string} Formatted type name
   */
  static formatTypeName(type) {
    const typeMapping = {
      'definition': 'Definitionen',
      'structured_table': 'Tabellarische Informationen',
      'table': 'Tabellarische Informationen',
      'process': 'Prozessinformationen',
      'procedure': 'Prozessinformationen',
      'general': 'Allgemeine Informationen',
      'instruction': 'Anweisungen',
      'faq': 'Häufige Fragen',
      'error': 'Fehlermeldungen',
      'error_code': 'Fehlercodes',
      'code': 'Code-Beispiele',
      'cs30_software': 'CS/30 Informationen',
      'marktkommunikation': 'Marktkommunikation'
    };
    
    return typeMapping[type] || this.capitalizeFirstLetter(type.replace(/_/g, ' '));
  }
  
  /**
   * Capitalize the first letter of a string
   * @param {string} str Input string
   * @returns {string} String with first letter capitalized
   */
  static capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default ContextExtractionService;
