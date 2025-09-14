import { QdrantClient } from '@qdrant/js-client-rest';
import { generateEmbedding, getCollectionName } from './embeddingProvider';

export type ContextHit = {
  text: string;
  source: string;
  score: number;
};

function collectionBaseFromSlug(slug: string) {
  // Align with ingestion: e.g., consultations-m53 for slug mitteilung-53
  const norm = slug.replace(/[^a-z0-9_-]/gi, '-').toLowerCase();
  return `consultations-${norm.replace(/^mitteilung-/, 'm')}`; // map 'mitteilung-53' => 'm53' variant optional
}

export class ConsultationSearchService {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      checkCompatibility: false,
    });
  }

  async search(slug: string, query: string, topK = 5): Promise<ContextHit[]> {
    const base = collectionBaseFromSlug(slug);
    const collection = getCollectionName(base);

    // Verify collection exists
    try {
      const cols = await this.client.getCollections();
      if (!cols.collections.some((c: any) => c.name === collection)) return [];
    } catch {
      return [];
    }

    const vec = await generateEmbedding(query.slice(0, 8000));
    const res: any = await this.client.search(collection, {
      vector: vec,
      limit: topK,
      with_payload: true,
      with_vector: false,
      score_threshold: 0.0,
    });

    const hits: ContextHit[] = (res || []).map((r: any) => {
      const p = r.payload || {};
      const text: string = p.text || '';
      const source: string = p.source || '';
      return { text, source, score: r.score || 0 };
    });

    return hits;
  }
}
