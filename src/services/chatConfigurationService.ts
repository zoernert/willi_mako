import { DatabaseHelper } from '../utils/database';
import geminiService from './gemini';
import { QdrantService } from './qdrant';

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

        const allResults = [];
        for (const q of searchQueries) {
          const results = await this.qdrantService.searchByText(
            q, 
            config.config.vectorSearch.limit, 
            config.config.vectorSearch.scoreThreshold
          );
          allResults.push(...results);
        }

        // Remove duplicates
        const uniqueResults = this.removeDuplicates(allResults);

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { 
          resultsCount: uniqueResults.length
        };

        // Step 3: Context Optimization (if enabled)
        if (this.isStepEnabled(config, 'context_optimization')) {
          processingSteps.push({
            name: 'Context Optimization',
            startTime: Date.now(),
            enabled: true
          });

          if (uniqueResults.length > 0) {
            // Extract content from results, prioritizing relevant information
            const relevantContent = uniqueResults.map((r: any) => {
              return r.payload?.content || r.content || r.payload?.text || '';
            }).filter(text => text.trim().length > 0);

            const rawContext = relevantContent.join('\n\n');

            if (config.config.contextSynthesis.enabled && rawContext.length > config.config.contextSynthesis.maxLength) {
              // Synthesize context for complex queries
              contextUsed = await geminiService.synthesizeContext(query, uniqueResults);
              
              // Ensure synthesis produced meaningful content
              if (contextUsed.length < 200) {
                // If synthesis failed, use raw content (truncated if necessary)
                contextUsed = rawContext.length > config.config.contextSynthesis.maxLength 
                  ? rawContext.substring(0, config.config.contextSynthesis.maxLength) + '...'
                  : rawContext;
              }
            } else {
              // Use raw context, truncate if necessary
              contextUsed = rawContext.length > config.config.contextSynthesis.maxLength 
                ? rawContext.substring(0, config.config.contextSynthesis.maxLength) + '...'
                : rawContext;
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
            uniqueResultsUsed: uniqueResults.length
          };
        } else {
          // Even without optimization, extract proper content
          const relevantContent = uniqueResults.map((r: any) => {
            return r.payload?.content || r.content || r.payload?.text || '';
          }).filter(text => text.trim().length > 0);
          contextUsed = relevantContent.join('\n\n');
        }
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

        response = await geminiService.generateResponse(
          messages,
          contextUsed,
          userPreferences,
          false,
          contextMode
        );

        processingSteps[processingSteps.length - 1].endTime = Date.now();
        processingSteps[processingSteps.length - 1].output = { 
          responseLength: response.length
        };
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

        let validationIssues = [];
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
