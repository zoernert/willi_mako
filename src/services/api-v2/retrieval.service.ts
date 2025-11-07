import { SemanticSearchOptions, SemanticSearchResponse, SemanticSearchResultItem } from '../../domain/api-v2/retrieval.types';
import { QdrantService } from '../qdrant';

const DEFAULT_LIMIT = 20;

export class RetrievalService {
  public async semanticSearch(query: string, options: SemanticSearchOptions = {}): Promise<SemanticSearchResponse> {
    return this.semanticSearchByCollection(query, options, 'willi_mako');
  }

  public async semanticSearchWilliNetz(query: string, options: SemanticSearchOptions = {}): Promise<SemanticSearchResponse> {
    return this.semanticSearchByCollection(query, options, 'willi-netz');
  }

  public async semanticSearchCombined(query: string, options: SemanticSearchOptions = {}): Promise<SemanticSearchResponse> {
    const startedAt = Date.now();
    const limit = options.limit ?? DEFAULT_LIMIT;

    // Suche parallel in beiden Collections
    const [resultsWilliMako, resultsWilliNetz] = await Promise.all([
      QdrantService.semanticSearchGuidedByCollection(query, options, 'willi_mako'),
      QdrantService.semanticSearchGuidedByCollection(query, options, 'willi-netz')
    ]);

    // Kombiniere Ergebnisse und markiere die Quelle
    const combinedResults = [
      ...resultsWilliMako.map((item: any) => ({ ...item, sourceCollection: 'willi_mako' })),
      ...resultsWilliNetz.map((item: any) => ({ ...item, sourceCollection: 'willi-netz' }))
    ];

    // Sortiere nach Score
    combinedResults.sort((a: any, b: any) => {
      const scoreA = a.merged_score ?? a.score ?? 0;
      const scoreB = b.merged_score ?? b.score ?? 0;
      return scoreB - scoreA;
    });

    // Limitiere auf die gewünschte Anzahl
    const limitedResults = combinedResults.slice(0, limit);

    const durationMs = Date.now() - startedAt;
    const mapped: SemanticSearchResultItem[] = this.mapResults(limitedResults);

    return {
      query,
      totalResults: mapped.length,
      durationMs,
      options: {
        limit,
        alpha: options.alpha,
        outlineScoping: options.outlineScoping !== false,
        excludeVisual: options.excludeVisual !== false
      },
      results: mapped
    };
  }

  private async semanticSearchByCollection(
    query: string, 
    options: SemanticSearchOptions = {}, 
    collection: 'willi_mako' | 'willi-netz'
  ): Promise<SemanticSearchResponse> {
    const startedAt = Date.now();

    const results = await QdrantService.semanticSearchGuidedByCollection(query, options, collection);

    const durationMs = Date.now() - startedAt;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const mapped: SemanticSearchResultItem[] = this.mapResults(results);

    return {
      query,
      totalResults: mapped.length,
      durationMs,
      options: {
        limit,
        alpha: options.alpha,
        outlineScoping: options.outlineScoping !== false,
        excludeVisual: options.excludeVisual !== false
      },
      results: mapped
    };
  }

  private mapResults(results: any[]): SemanticSearchResultItem[] {
    return results.map((item: any, index: number) => {
      const idValue = item?.id;
      const id = typeof idValue === 'object' ? idValue?.uuid ?? idValue?.toString?.() ?? String(idValue) : String(idValue);
      const mergedScore = typeof item?.merged_score === 'number' ? item.merged_score : null;
      const originalScore = typeof item?.score === 'number' ? item.score : null;
      const payload = item?.payload ?? {};
      const text = typeof payload?.text === 'string' ? payload.text : typeof payload?.content === 'string' ? payload.content : typeof payload?.contextual_content === 'string' ? payload.contextual_content : null;
      const sourceCollection = item?.sourceCollection;

      return {
        id,
        score: mergedScore ?? originalScore,
        payload: sourceCollection ? { ...payload, sourceCollection } : payload,
        highlight: text ? text.slice(0, 500) : null,
        metadata: {
          rank: index + 1,
          originalScore,
          mergedScore,
          version: item?.version ?? null
        }
      };
    });
  }
}

export const retrievalService = new RetrievalService();
