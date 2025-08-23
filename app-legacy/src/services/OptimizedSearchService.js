/**
 * Optimized Search Service for the React Legacy App
 * 
 * This service implements the improved search strategies from the debug tool
 * for better semantic search results in the production environment.
 */

import axios from 'axios';
import EnhancedQueryAnalysisService from './EnhancedQueryAnalysisService';
import PerformanceMonitoringService from './PerformanceMonitoringService';
import { generateEmbedding, generateHypotheticalAnswer, expandQueryForSearch, fetchCollectionDimension } from './embeddingService';

class OptimizedSearchService {
  // Cache für query results
  static queryCache = new Map();
  
  // Cache size limit
  static CACHE_SIZE_LIMIT = 50;
  
  /**
   * Perform a semantic search with optimizations
   * @param {string} query User query
   * @param {Object} options Search options
   * @returns {Promise<Object>} Search results and metrics
   */
  static async search(query, options = {}) {
    const searchOptions = {
      useHyDE: options.useHyDE !== false,
      useFilters: options.useFilters !== false,
      useOptimizations: options.useOptimizations !== false,
      collectionName: options.collectionName || 'cs30',
      limit: options.limit || 5,
      scoreThreshold: options.scoreThreshold || 0.6,
      includeMetadata: options.includeMetadata !== false,
      useCache: options.useCache !== false,
      debug: options.debug || false
    };
    
    console.log(`Performing search on collection: ${searchOptions.collectionName}`);
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(query, searchOptions);
    
    // Check cache first if enabled
    if (searchOptions.useCache && this.queryCache.has(cacheKey)) {
      console.log('Using cached search results');
      return this.queryCache.get(cacheKey);
    }
    
    // Track performance metrics
    const startTime = Date.now();
    const metrics = {
      totalTime: 0,
      queryOptimizationTime: 0,
      searchTime: 0,
      resultCount: 0,
      collectionUsed: searchOptions.collectionName,
      method: searchOptions.useHyDE ? 'HyDE' : 
              searchOptions.useFilters ? 'Filters' : 
              'Standard'
    };
    
    try {
      // Schritt 0: Überprüfe die Vektordimension für die Collection
      try {
        await fetchCollectionDimension(searchOptions.collectionName);
      } catch (dimError) {
        console.warn(`Couldn't fetch dimension for ${searchOptions.collectionName}, using default.`);
      }
      
      // Schritt 1: Erweitere die Anfrage zunächst mit domänenspezifischer Terminologie
      let expandedQuery = query;
      try {
        if (searchOptions.useOptimizations) {
          expandedQuery = await expandQueryForSearch(query, searchOptions.collectionName);
          console.log(`Expanded query: ${expandedQuery}`);
        }
      } catch (expandError) {
        console.warn('Query expansion failed, using original query:', expandError);
        // Bei Fehler original weiternutzen
      }
      
      // Schritt 2: Anfrage optimieren mit Analyse und HyDE
      const optimizationStartTime = Date.now();
      const optimizedQuery = await EnhancedQueryAnalysisService.optimizeQuery(
        expandedQuery, 
        {
          useHyDE: searchOptions.useHyDE,
          useFilters: searchOptions.useFilters,
          collectionName: searchOptions.collectionName
        }
      );
      metrics.queryOptimizationTime = Date.now() - optimizationStartTime;
      
      // Schritt 3: Vektorsuche durchführen
      const searchStartTime = Date.now();
      const searchResults = await this.performVectorSearch(
        optimizedQuery.embedding,
        {
          filter: optimizedQuery.filter,
          limit: searchOptions.limit,
          collectionName: searchOptions.collectionName,
          scoreThreshold: searchOptions.scoreThreshold
        }
      );
      metrics.searchTime = Date.now() - searchStartTime;
      
      // Schritt 4: Ergebnisse mit Metadaten anreichern
      const enhancedResults = searchOptions.includeMetadata ? 
        this.enhanceSearchResults(searchResults, optimizedQuery) : 
        searchResults;
      
      // Schritt 5: Nachbearbeitung der Ergebnisse für bessere Relevanz
      let finalResults = enhancedResults;
      if (searchOptions.useOptimizations) {
        finalResults = this.reRankResults(enhancedResults, query, optimizedQuery);
      }
      
      // Wenn keine Ergebnisse gefunden wurden, versuche einen Fallback
      if (finalResults.length === 0 && (searchOptions.useHyDE || searchOptions.useFilters)) {
        console.log('No results found with optimizations, trying basic search');
        
        // Versuche eine Suche ohne Filter und HyDE
        const basicResults = await this.performVectorSearch(
          await generateEmbedding(query, searchOptions.collectionName),
          {
            collectionName: searchOptions.collectionName,
            limit: searchOptions.limit,
            scoreThreshold: Math.max(0.4, searchOptions.scoreThreshold - 0.2) // Leicht niedrigerer Schwellenwert
          }
        );
        
        if (basicResults.length > 0) {
          console.log(`Found ${basicResults.length} results with basic search`);
          finalResults = this.enhanceSearchResults(basicResults, { 
            originalQuery: query,
            expandedQuery: query,
            isFallback: true
          });
        }
      }
      
      metrics.resultCount = finalResults.length;
      metrics.totalTime = Date.now() - startTime;
      
      // Prepare final response
      const response = {
        results: finalResults,
        metrics,
        query: {
          original: query,
          expanded: optimizedQuery.expandedQuery || expandedQuery,
          hypothetical: optimizedQuery.hypotheticalAnswer,
          usedHyDE: searchOptions.useHyDE && !!optimizedQuery.hypotheticalAnswer,
          usedFilters: searchOptions.useFilters && !!optimizedQuery.filter && Object.keys(optimizedQuery.filter).length > 0,
          type: optimizedQuery.queryType,
          collection: searchOptions.collectionName
        }
      };
      
      // Store in cache if enabled
      if (searchOptions.useCache) {
        this.cacheResults(cacheKey, response);
      }
      
      // Record metrics for performance monitoring
      PerformanceMonitoringService.recordMetrics({
        queryAnalysisTime: metrics.queryOptimizationTime,
        searchTime: metrics.searchTime,
        totalResponseTime: metrics.totalTime,
        resultCount: metrics.resultCount,
        searchMethod: metrics.method,
        collection: searchOptions.collectionName
      });
      
      return response;
    } catch (error) {
      console.error('Error performing semantic search:', error);
      
      // Fall back to basic search if optimization fails
      return this.fallbackSearch(query, searchOptions);
    }
  }
  
  /**
   * Perform a vector search using the embedding
   * @param {Array} embedding Query embedding
   * @param {Object} options Search options
   * @returns {Promise<Array>} Search results
   */
  static async performVectorSearch(embedding, options = {}) {
    try {
      const response = await axios.post(`/api/vector-search/${options.collectionName || 'cs30'}`, {
        vector: embedding,
        filter: options.filter || {},
        limit: options.limit || 5,
        score_threshold: options.scoreThreshold || 0.6,
        with_payload: true
      });
      
      if (!response.data || !response.data.results) {
        console.error('Invalid response from vector search:', response.data);
        return [];
      }
      
      return response.data.results || [];
    } catch (error) {
      console.error('Error in vector search:', error.response?.data || error.message);
      throw error;
    }
  }
  
  /**
   * Re-rank search results using hybrid scoring
   * @param {Array} results Original search results
   * @param {string} originalQuery User's original query
   * @param {Object} optimizedQuery Query optimization data
   * @returns {Array} Re-ranked results
   */
  static reRankResults(results, originalQuery, optimizedQuery) {
    if (!results || results.length === 0) {
      return [];
    }
    
    // Normalize original query for keyword matching
    const normalizedQuery = originalQuery.toLowerCase();
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 3);
    
    // Apply hybrid scoring
    return results.map(result => {
      // Extrahiere Inhalt aus dem Payload, abhängig von der Struktur
      const content = (result.payload?.content || result.payload?.text || '').toLowerCase();
      const title = (result.payload?.title || result.payload?.name || '').toLowerCase();
      
      // Keyword matching bonus
      let keywordScore = 0;
      queryWords.forEach(word => {
        if (content.includes(word)) {
          keywordScore += 0.02;
        }
        if (title.includes(word)) {
          keywordScore += 0.05;
        }
      });
      
      // Relevance bonus based on document type
      let typeBonus = 0;
      if (optimizedQuery.queryType === 'definition' && 
          (result.payload?.chunk_type === 'definition' || result.payload?.type === 'definition')) {
        typeBonus += 0.1;
      } else if (optimizedQuery.queryType === 'table' && 
                (result.payload?.contains_table || result.payload?.chunk_type === 'table')) {
        typeBonus += 0.1;
      } else if (optimizedQuery.queryType === 'error' && 
                (result.payload?.error_codes || content.includes('fehler'))) {
        typeBonus += 0.1;
      } else if (optimizedQuery.queryType === 'process' &&
                (result.payload?.chunk_type === 'process' || result.payload?.type === 'process')) {
        typeBonus += 0.1;
      }
      
      // Apply bonuses to original score
      const originalScore = result.score || 0;
      const newScore = Math.min(originalScore + keywordScore + typeBonus, 1.0);
      
      return {
        ...result,
        score: newScore,
        originalScore,
        scoreAdjustments: {
          keywordBonus: keywordScore,
          typeBonus: typeBonus
        }
      };
    })
    .sort((a, b) => b.score - a.score);
  }
  
  /**
   * Enhance search results with additional metadata
   * @param {Array} results Search results
   * @param {Object} queryInfo Information about the query
   * @returns {Array} Enhanced results
   */
  static enhanceSearchResults(results, queryInfo) {
    return results.map(result => {
      return {
        ...result,
        search_metadata: {
          original_query: queryInfo.originalQuery,
          enhanced_query: queryInfo.expandedQuery,
          intent_type: queryInfo.queryType,
          used_hyde: !!queryInfo.hypotheticalAnswer,
          filter_applied: queryInfo.filter ? Object.keys(queryInfo.filter) : [],
          is_fallback: queryInfo.isFallback || false
        }
      };
    });
  }
  
  /**
   * Generate a cache key for a query and options
   * @param {string} query User query
   * @param {Object} options Search options
   * @returns {string} Cache key
   */
  static generateCacheKey(query, options) {
    const normalizedQuery = query.trim().toLowerCase();
    const optionsKey = `${options.useHyDE}-${options.useFilters}-${options.useOptimizations}-${options.collectionName}-${options.limit}-${options.scoreThreshold}`;
    return `${normalizedQuery}:${optionsKey}`;
  }
  
  /**
   * Cache search results
   * @param {string} key Cache key
   * @param {Object} value Result to cache
   */
  static cacheResults(key, value) {
    // Implement LRU cache behavior
    if (this.queryCache.size >= this.CACHE_SIZE_LIMIT) {
      // Remove oldest entry
      const oldestKey = this.queryCache.keys().next().value;
      this.queryCache.delete(oldestKey);
    }
    
    // Add new entry
    this.queryCache.set(key, value);
  }
  
  /**
   * Clear the search cache
   */
  static clearCache() {
    this.queryCache.clear();
    console.log('Search cache cleared');
  }
  
  /**
   * Fallback search when optimized search fails
   * @param {string} query Original query
   * @param {Object} options Search options
   * @returns {Promise<Object>} Basic search results
   */
  static async fallbackSearch(query, options) {
    try {
      const startTime = Date.now();
      
      // Use the embeddings API directly
      const embedding = await generateEmbedding(query, options.collectionName);
      
      // Basic vector search without filters
      const searchResults = await this.performVectorSearch(
        embedding,
        {
          limit: options.limit,
          scoreThreshold: Math.max(0.4, options.scoreThreshold - 0.1), // Leicht reduzierter Schwellenwert
          collectionName: options.collectionName
        }
      );
      
      return {
        results: searchResults,
        queryInfo: {
          originalQuery: query,
          expandedQuery: query,
          hypothetical: null,
          usedHyDE: false,
          usedFilters: false,
          type: 'general',
          collection: options.collectionName
        },
        metrics: {
          totalTime: Date.now() - startTime,
          resultCount: searchResults.length,
          isFallback: true,
          collectionUsed: options.collectionName
        }
      };
    } catch (error) {
      console.error('Fallback search failed:', error);
      return {
        results: [],
        query: {
          original: query,
          error: error.message
        },
        metrics: {
          isFallback: true,
          failed: true,
          collectionUsed: options.collectionName
        }
      };
    }
  }
}

export default OptimizedSearchService;
