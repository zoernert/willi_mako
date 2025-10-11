import { SemanticSearchOptions, SemanticSearchResponse, SemanticSearchResultItem } from '../../domain/api-v2/retrieval.types';
import { QdrantService } from '../qdrant';

const DEFAULT_LIMIT = 20;

export class RetrievalService {
  public async semanticSearch(query: string, options: SemanticSearchOptions = {}): Promise<SemanticSearchResponse> {
    const startedAt = Date.now();

    const results = await QdrantService.semanticSearchGuided(query, options);

    const durationMs = Date.now() - startedAt;
    const limit = options.limit ?? DEFAULT_LIMIT;
    const mapped: SemanticSearchResultItem[] = results.map((item: any, index: number) => {
      const idValue = item?.id;
      const id = typeof idValue === 'object' ? idValue?.uuid ?? idValue?.toString?.() ?? String(idValue) : String(idValue);
      const mergedScore = typeof item?.merged_score === 'number' ? item.merged_score : null;
      const originalScore = typeof item?.score === 'number' ? item.score : null;
      const payload = item?.payload ?? {};
      const text = typeof payload?.text === 'string' ? payload.text : typeof payload?.content === 'string' ? payload.content : typeof payload?.contextual_content === 'string' ? payload.contextual_content : null;

      return {
        id,
        score: mergedScore ?? originalScore,
        payload,
        highlight: text ? text.slice(0, 500) : null,
        metadata: {
          rank: index + 1,
          originalScore,
          mergedScore,
          version: item?.version ?? null
        }
      };
    });

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
}

export const retrievalService = new RetrievalService();
