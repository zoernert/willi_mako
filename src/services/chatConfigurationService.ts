import { DatabaseHelper } from '../utils/database';
import geminiService from './gemini';
import { QdrantService } from './qdrant';
import m2cRoleService from './m2cRoleService';

export enum SearchType {
  SEMANTIC = 'semantic',
  HYBRID = 'hybrid',
  KEYWORD = 'keyword',
  FUZZY = 'fuzzy'
}

export interface ChatConfiguration {
  id: string;
  name: string;
  config: {
    maxIterations: number;
    systemPrompt: string;
    vectorSearch: {
      maxQueries: number;
      limit: number;
      scoreThreshold: number;
      useQueryExpansion: boolean;
      searchType: SearchType;
      hybridAlpha?: number; // Gewichtung zwischen Semantic (0.0) und Keyword (1.0)
      diversityThreshold?: number; // Vermeidung zu ähnlicher Ergebnisse
    };
    processingSteps: ProcessingStep[];
    contextSynthesis: {
      enabled: boolean;
      maxLength: number;
    };
    qualityChecks: {
      enabled: boolean;
      minResponseLength: number;
      checkForHallucination: boolean;
    };
  };
}

export interface ProcessingStep {
  name: string;
  enabled: boolean;
  prompt: string;
}

export class ChatConfigurationService {
  private activeConfig: ChatConfiguration | null = null;
  private lastConfigLoad: number = 0;
  private configCacheTimeout = 5 * 60 * 1000; // 5 minutes
  private qdrantService: QdrantService;

  constructor() {
    this.qdrantService = new QdrantService();
  }

  /**
   * Get the active chat configuration
   */
  async getActiveConfiguration(): Promise<ChatConfiguration> {
    const now = Date.now();
    
    // Cache configuration for 5 minutes
    if (this.activeConfig && (now - this.lastConfigLoad) < this.configCacheTimeout) {
      return this.activeConfig;
    }

    try {
      const config = await DatabaseHelper.executeQuerySingle<ChatConfiguration>(`
        SELECT id, name, config
        FROM chat_configurations 
        WHERE is_active = true
        LIMIT 1
      `);

      if (!config) {
        // Return default configuration if no active config found
        return this.getDefaultConfiguration();
      }

      this.activeConfig = config;
      this.lastConfigLoad = now;
      return config;
    } catch (error) {
      console.error('Error loading active chat configuration:', error);
      return this.getDefaultConfiguration();
    }
  }

  /**
   * Generate response using the active configuration
   */
  async generateConfiguredResponse(
    query: string,
    userId: string,
    previousMessages: any[] = [],
    userPreferences: any = {},
    contextSettings?: any
  ): Promise<{
    response: string;
    contextUsed: string;
    searchQueries: string[];
    processingSteps: any[];
    configurationUsed: string;
  }> {
    const config = await this.getActiveConfiguration();
    const processingSteps: any[] = [];
    let searchQueries: string[] = [query];
    let contextUsed = '';

    try {
      // Step 1: Query Understanding (if enabled)
      if (this.isStepEnabled(config, 'query_understanding')) {
        const step = this.getStep(config, 'query_understanding');
        processingSteps.push({
          name: 'Query Understanding',
          startTime: Date.now(),
          enabled: true,
          prompt: step?.prompt
        });

        if (config.config.vectorSearch.useQueryExpansion) {
          searchQueries = await geminiService.generateSearchQueries(query);
          searchQueries = searchQueries.slice(0, config.config.vectorSearch.maxQueries);
        }

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { searchQueries };
      }

      // Step 2: Context Search (if enabled)
      if (this.isStepEnabled(config, 'context_search')) {
        processingSteps.push({
          name: 'Context Search',
          startTime: Date.now(),
          enabled: true
        });

        let allResults: any[] = [];
        let searchDetails: any[] = [];

        // Verwende optimierte Suche wenn verfügbar
        let useOptimizedSearch = true; // Standard aktiviert
        
        if (useOptimizedSearch) {
          try {
            // Optimierte Suche mit Pre-Filtering
            const optimizedResults = await this.qdrantService.searchWithOptimizations(
              query,
              config.config.vectorSearch.limit * 2, // Mehr Ergebnisse für bessere Auswahl
              config.config.vectorSearch.scoreThreshold,
              true // HyDE aktiviert
            );
            
            allResults = optimizedResults;
            
            // Dokumentiere die optimierte Suche
            searchDetails.push({
              query: query,
              searchType: 'optimized',
              resultsCount: optimizedResults.length,
              results: optimizedResults.slice(0, 5).map((r: any) => ({
                id: r.id,
                score: r.score,
                title: r.payload?.title || r.payload?.source_document || 'Unknown',
                source: r.payload?.document_metadata?.document_base_name || 'Unknown',
                chunk_type: r.payload?.chunk_type || 'paragraph',
                chunk_index: r.payload?.chunk_index || 0,
                content: (r.payload?.text || r.payload?.content || '').substring(0, 300)
              }))
            });

          } catch (error) {
            console.error('Optimized search failed, falling back to standard search:', error);
            // Fallback zur Standard-Suche
            useOptimizedSearch = false;
          }
        }

        if (!useOptimizedSearch) {
          // Standard Multi-Query Suche
          for (const q of searchQueries) {
            const results = await this.qdrantService.searchByText(
              q, 
              config.config.vectorSearch.limit, 
              config.config.vectorSearch.scoreThreshold
            );
            allResults.push(...results);

            // Dokumentiere jede Suchanfrage
            searchDetails.push({
              query: q,
              searchType: 'standard',
              resultsCount: results.length,
              results: results.slice(0, 5).map((r: any) => ({
                id: r.id,
                score: r.score,
                title: r.payload?.title || r.payload?.source_document || 'Unknown',
                source: r.payload?.document_metadata?.document_base_name || r.payload?.source || 'Unknown',
                chunk_type: r.payload?.chunk_type || 'paragraph',
                chunk_index: r.payload?.chunk_index || 0,
                content: (r.payload?.text || r.payload?.content || '').substring(0, 300)
              }))
            });
          }
        }

        // Remove duplicates
        const uniqueResults = this.removeDuplicates(allResults);

        // Berechne erweiterte Metriken
        const scores = uniqueResults.map((r: any) => r.score).filter(s => s !== undefined);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { 
          searchDetails,
          totalResultsFound: allResults.length,
          uniqueResultsUsed: uniqueResults.length,
          scoreThreshold: config.config.vectorSearch.scoreThreshold,
          avgScore: avgScore,
          searchType: useOptimizedSearch ? 'optimized' : 'standard'
        };

        // Step 3: Context Optimization (if enabled)
        if (this.isStepEnabled(config, 'context_optimization')) {
          processingSteps.push({
            name: 'Context Optimization',
            startTime: Date.now(),
            enabled: true
          });

          if (uniqueResults.length > 0) {
            // Verwende chunk-type-bewusste Synthese wenn optimierte Suche verwendet wurde
            if (useOptimizedSearch && uniqueResults.some((r: any) => r.payload?.chunk_type)) {
              // Erweitere Ergebnisse mit Kontext-Information
              const contextualizedResults = uniqueResults.map(result => {
                const chunkType = result.payload?.chunk_type || 'paragraph';
                let contextualPrefix = '';

                switch (chunkType) {
                  case 'structured_table':
                    contextualPrefix = '[TABELLE] ';
                    break;
                  case 'definition':
                    contextualPrefix = '[DEFINITION] ';
                    break;
                  case 'abbreviation':
                    contextualPrefix = '[ABKÜRZUNG] ';
                    break;
                  case 'visual_summary':
                    contextualPrefix = '[DIAGRAMM-BESCHREIBUNG] ';
                    break;
                  case 'full_page':
                    contextualPrefix = '[VOLLTEXT] ';
                    break;
                  default:
                    contextualPrefix = '[ABSATZ] ';
                }

                return {
                  ...result,
                  payload: {
                    ...result.payload,
                    contextual_content: contextualPrefix + (result.payload?.text || result.payload?.content || '')
                  }
                };
              });

              contextUsed = await geminiService.synthesizeContextWithChunkTypes(query, contextualizedResults);
            } else {
              // Standard-Kontext-Synthese
              if (config.config.contextSynthesis.enabled) {
                contextUsed = await geminiService.synthesizeContext(query, uniqueResults);
              } else {
                // Extract content from results, prioritizing relevant information
                const relevantContent = uniqueResults.map((r: any) => {
                  return r.payload?.content || r.content || r.payload?.text || '';
                }).filter(text => text.trim().length > 0);

                contextUsed = relevantContent.join('\n\n');
              }
            }

            // Ensure synthesis produced meaningful content
            if (contextUsed.length < 200 && uniqueResults.length > 0) {
              // If synthesis failed, use raw content (truncated if necessary)
              const relevantContent = uniqueResults.map((r: any) => {
                return r.payload?.content || r.content || r.payload?.text || '';
              }).filter(text => text.trim().length > 0);
              
              const rawContext = relevantContent.join('\n\n');
              contextUsed = rawContext.length > config.config.contextSynthesis.maxLength 
                ? rawContext.substring(0, config.config.contextSynthesis.maxLength) + '...'
                : rawContext;
            }

            // Truncate if necessary
            if (contextUsed.length > config.config.contextSynthesis.maxLength) {
              contextUsed = contextUsed.substring(0, config.config.contextSynthesis.maxLength) + '...';
            }
          } else {
            contextUsed = '';
          }

          processingSteps[processingSteps.length - 1].endTime = Date.now();
          processingSteps[processingSteps.length - 1].output = { 
            contextLength: contextUsed.length,
            synthesized: config.config.contextSynthesis.enabled && contextUsed.length > 200,
            maxLength: config.config.contextSynthesis.maxLength,
            wasTruncated: contextUsed.endsWith('...'),
            uniqueResultsUsed: uniqueResults.length,
            chunkTypesFound: [...new Set(uniqueResults.map((r: any) => r.payload?.chunk_type || 'paragraph'))],
            optimizedSearchUsed: useOptimizedSearch
          };
        } else {
          // Even without optimization, extract proper content
          const relevantContent = uniqueResults.map((r: any) => {
            return r.payload?.content || r.content || r.payload?.text || '';
          }).filter(text => text.trim().length > 0);
          contextUsed = relevantContent.join('\n\n');
        }
      }

      // Step 3.5: M2C Role Context (if enabled)
      let roleContext = '';
      let roleDetails: any = null;
      if (this.isStepEnabled(config, 'response_generation')) {
        processingSteps.push({
          name: 'M2C Role Context',
          startTime: Date.now(),
          enabled: true
        });

        try {
          // Get comprehensive role details for analytics
          roleDetails = await m2cRoleService.getUserRoleContextDetails(userId);
          
          // Only apply role context if enabled in settings (default: true if not specified)
          const shouldIncludeM2CRoles = contextSettings?.includeM2CRoles !== false;
          
          if (shouldIncludeM2CRoles) {
            roleContext = roleDetails.contextGenerated;
          }
          
          if (roleContext) {
            console.log(`M2C Role context added for user ${userId}: ${roleContext.length} characters from ${roleDetails.selectedRoles.length} roles`);
          }
        } catch (error) {
          console.warn('Failed to load M2C role context:', error);
          roleContext = '';
          roleDetails = {
            featureEnabled: process.env.ENABLE_M2C_ROLES === 'true',
            userHasRoles: false,
            selectedRoleIds: [],
            selectedRoles: [],
            contextGenerated: '',
            contextLength: 0,
            contextTruncated: false,
            cacheHit: false,
            processingTime: 0
          };
        }

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { 
          featureEnabled: roleDetails.featureEnabled,
          userHasRoles: roleDetails.userHasRoles,
          settingEnabled: contextSettings?.includeM2CRoles !== false,
          contextApplied: roleContext.length > 0,
          selectedRoleCount: roleDetails.selectedRoles.length,
          selectedRoles: roleDetails.selectedRoles.map((role: any) => ({
            id: role.id,
            name: role.role_name,
            shortDescription: role.short_description
          })),
          contextLength: roleDetails.contextLength,
          contextGenerated: roleDetails.contextLength > 0,
          contextTruncated: roleDetails.contextTruncated,
          contextPreview: roleDetails.contextLength > 0 ? 
            roleDetails.contextGenerated.substring(0, 200) + (roleDetails.contextLength > 200 ? '...' : '') : null,
          cacheHit: roleDetails.cacheHit,
          processingTimeMs: roleDetails.processingTime,
          appliedToPrompt: false, // Will be updated later if actually applied
          appliedToContext: false, // Will be updated later if actually applied
          errorOccurred: !roleDetails.featureEnabled && process.env.ENABLE_M2C_ROLES === 'true'
        };
      }

      // Step 4: Response Generation (if enabled)
      let response = '';
      if (this.isStepEnabled(config, 'response_generation')) {
        processingSteps.push({
          name: 'Response Generation',
          startTime: Date.now(),
          enabled: true
        });

        // Prepare messages with custom system prompt
        const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
        messages.push({ role: 'user', content: query });

        // Use the configured system prompt and context mode
        let contextMode: 'workspace-only' | 'standard' | 'system-only' = 'standard';
        if (contextSettings?.useWorkspaceOnly) {
          contextMode = 'workspace-only';
        } else if (contextSettings && !contextSettings.includeSystemKnowledge) {
          contextMode = 'workspace-only';
        } else if (contextSettings && !contextSettings.includeUserDocuments && !contextSettings.includeUserNotes) {
          contextMode = 'system-only';
        }

        // Enhanced system prompt with role context
        let enhancedSystemPrompt = config.config.systemPrompt;
        let roleContextAppliedToPrompt = false;
        if (roleContext) {
          enhancedSystemPrompt += '\n\n[Benutzer-Rollenkontext]\n' + roleContext;
          roleContextAppliedToPrompt = true;
        }

        // Create enhanced context with role information
        let enhancedContext = contextUsed;
        let roleContextAppliedToContext = false;
        if (roleContext && !contextUsed.includes('[Benutzer-Rollenkontext]')) {
          enhancedContext = roleContext + '\n\n' + contextUsed;
          roleContextAppliedToContext = true;
        }

        response = await geminiService.generateResponse(
          messages,
          enhancedContext,
          userPreferences,
          false,
          contextMode
        );

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { 
          responseLength: response.length,
          systemPromptLength: enhancedSystemPrompt.length,
          systemPromptEnhanced: roleContextAppliedToPrompt,
          contextLength: enhancedContext.length,
          contextEnhanced: roleContextAppliedToContext,
          roleContextUsed: roleContext.length > 0,
          roleContextLength: roleContext.length,
          contextMode
        };

        // Update the M2C Role Context step to reflect actual application
        const m2cRoleStep = processingSteps.find(step => step.name === 'M2C Role Context');
        if (m2cRoleStep && m2cRoleStep.output) {
          m2cRoleStep.output.appliedToPrompt = roleContextAppliedToPrompt;
          m2cRoleStep.output.appliedToContext = roleContextAppliedToContext;
        }
      } else {
        // Fallback to standard generation
        const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
        messages.push({ role: 'user', content: query });
        response = await geminiService.generateResponse(messages, contextUsed, userPreferences);
      }

      // Step 5: Response Validation (if enabled)
      if (this.isStepEnabled(config, 'response_validation')) {
        processingSteps.push({
          name: 'Response Validation',
          startTime: Date.now(),
          enabled: true
        });

        let validationIssues: string[] = [];
        if (config.config.qualityChecks.enabled) {
          if (response.length < config.config.qualityChecks.minResponseLength) {
            validationIssues.push('Response too short');
          }

          if (config.config.qualityChecks.checkForHallucination) {
            // Simple hallucination check
            if (response.includes('Ich bin mir nicht sicher') || 
                response.includes('Das kann ich nicht beantworten')) {
              validationIssues.push('Potential uncertainty detected');
            }
          }
        }

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { 
          validationIssues,
          passed: validationIssues.length === 0
        };

        // If validation fails and we have iterations left, we could retry
        // For now, we just log the issues
        if (validationIssues.length > 0) {
          console.warn('Response validation issues:', validationIssues);
        }
      }

      return {
        response,
        contextUsed,
        searchQueries,
        processingSteps,
        configurationUsed: config.name
      };

    } catch (error) {
      console.error('Error in configured response generation:', error);
      
      // Fallback to standard generation
      const messages = previousMessages.map(msg => ({ role: msg.role, content: msg.content }));
      messages.push({ role: 'user', content: query });
      const fallbackResponse = await geminiService.generateResponse(messages, '', userPreferences);
      
      return {
        response: fallbackResponse,
        contextUsed: '',
        searchQueries: [query],
        processingSteps: [{
          name: 'Fallback Generation',
          error: error instanceof Error ? error.message : 'Unknown error',
          enabled: true
        }],
        configurationUsed: 'Fallback'
      };
    }
  }

  /**
   * Get the default configuration
   */
  private getDefaultConfiguration(): ChatConfiguration {
    return {
      id: 'default',
      name: 'Default Configuration',
      config: {
        maxIterations: 3,
        systemPrompt: 'Du bist Mako Willi, ein AI-Coach für die Energiewirtschaft und Marktkommunikation von Stromhaltig. Du hilfst bei technischen Fragen zu APERAK, UTILMD, MSCONS und anderen EDI-Nachrichten. Erkläre komplexe Sachverhalte verständlich und gehe auf spezifische Fehlercodes und deren Ursachen ein. Nutze die bereitgestellten Dokumenteninformationen, um präzise und praxisnahe Antworten zu geben.',
        vectorSearch: {
          maxQueries: 3,
          limit: 10,
          scoreThreshold: 0.5,
          useQueryExpansion: true,
          searchType: SearchType.HYBRID,
          hybridAlpha: 0.3,
          diversityThreshold: 0.7
        },
        processingSteps: [
          {
            name: 'query_understanding',
            enabled: true,
            prompt: 'Analysiere die Benutzeranfrage und extrahiere die Kernfrage.'
          },
          {
            name: 'context_search',
            enabled: true,
            prompt: 'Suche relevanten Kontext basierend auf der analysierten Anfrage.'
          },
          {
            name: 'context_optimization',
            enabled: true,
            prompt: 'Optimiere und priorisiere den gefundenen Kontext.'
          },
          {
            name: 'response_generation',
            enabled: true,
            prompt: 'Erstelle eine hilfreiche Antwort basierend auf dem Kontext.'
          },
          {
            name: 'response_validation',
            enabled: false,
            prompt: 'Validiere die Antwort auf Korrektheit und Vollständigkeit.'
          }
        ],
        contextSynthesis: {
          enabled: true,
          maxLength: 4000
        },
        qualityChecks: {
          enabled: true,
          minResponseLength: 50,
          checkForHallucination: true
        }
      }
    };
  }

  /**
   * Check if a processing step is enabled
   */
  private isStepEnabled(config: ChatConfiguration, stepName: string): boolean {
    const step = config.config.processingSteps.find(s => s.name === stepName);
    return step ? step.enabled : false;
  }

  /**
   * Get a processing step
   */
  private getStep(config: ChatConfiguration, stepName: string): ProcessingStep | undefined {
    return config.config.processingSteps.find(s => s.name === stepName);
  }

  /**
   * Set a configuration as the default (active) configuration
   * Only one configuration can be active at a time
   */
  async setAsDefault(configId: string): Promise<void> {
    try {
      // First, deactivate all configurations
      await DatabaseHelper.executeQuery(`
        UPDATE chat_configurations 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
      `);

      // Then activate the selected configuration
      await DatabaseHelper.executeQuery(`
        UPDATE chat_configurations 
        SET is_active = true, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [configId]);

      // Verify the configuration exists
      const verifyResult = await DatabaseHelper.executeQuerySingle<{ id: string }>(`
        SELECT id FROM chat_configurations WHERE id = $1
      `, [configId]);

      if (!verifyResult) {
        throw new Error(`Configuration with ID ${configId} not found`);
      }

      // Clear cache to force reload
      this.clearCache();
      
      console.log(`Configuration ${configId} set as default`);
    } catch (error) {
      console.error('Error setting default configuration:', error);
      throw error;
    }
  }

  /**
   * Get the currently active configuration ID
   */
  async getActiveConfigurationId(): Promise<string | null> {
    try {
      const result = await DatabaseHelper.executeQuerySingle<{ id: string }>(`
        SELECT id FROM chat_configurations WHERE is_active = true LIMIT 1
      `);
      return result?.id || null;
    } catch (error) {
      console.error('Error getting active configuration ID:', error);
      return null;
    }
  }

  /**
   * Remove duplicate results based on ID
   */
  private removeDuplicates(results: any[]): any[] {
    const seen = new Set();
    return results.filter(result => {
      if (seen.has(result.id)) {
        return false;
      }
      seen.add(result.id);
      return true;
    });
  }

  /**
   * Clear cache (useful for testing)
   */
  clearCache(): void {
    this.activeConfig = null;
    this.lastConfigLoad = 0;
  }
}

export default new ChatConfigurationService();
