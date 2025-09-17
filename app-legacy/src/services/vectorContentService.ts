import apiClient from './apiClient';

export type MarkdownIngestType = 'glossary' | 'abbreviation' | 'guide' | 'note';

export interface MarkdownIngestRequest {
  title: string;
  slug?: string;
  content: string;
  type?: MarkdownIngestType;
  tags?: string[];
}

export interface MarkdownIngestResult {
  chunks: number;
  ids: Array<string | number>;
  slug: string;
}

export interface MarkdownSearchResultItem {
  id: string | number;
  score: number;
  payload: any;
}

const base = '/admin/vector-content/markdown';

export const vectorContentService = {
  ingestMarkdown: async (req: MarkdownIngestRequest): Promise<MarkdownIngestResult> => {
    return await apiClient.post(`${base}`, req);
  },

  searchMarkdown: async (query: string, limit = 10): Promise<MarkdownSearchResultItem[]> => {
    const res = await apiClient.post<{ results: MarkdownSearchResultItem[] }>(`${base}/search`, { query, limit });
    return res?.results || [];
  },

  deleteBySlug: async (slug: string): Promise<{ deleted: boolean; slug?: string }> => {
    return await apiClient.delete(`${base}/${encodeURIComponent(slug)}`);
  }
};

export default vectorContentService;
