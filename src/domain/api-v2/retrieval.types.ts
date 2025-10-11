export interface SemanticSearchOptions {
  limit?: number;
  alpha?: number;
  outlineScoping?: boolean;
  excludeVisual?: boolean;
}

export interface SemanticSearchResultItem {
  id: string;
  score: number | null;
  payload: Record<string, any>;
  highlight?: string | null;
  metadata: {
    rank: number;
    originalScore: number | null;
    mergedScore: number | null;
    version?: string | number | null;
  };
}

export interface SemanticSearchResponse {
  query: string;
  totalResults: number;
  durationMs: number;
  options: {
    limit: number;
    alpha?: number;
    outlineScoping: boolean;
    excludeVisual: boolean;
  };
  results: SemanticSearchResultItem[];
}
