import { QdrantClient } from '@qdrant/js-client-rest';
import { getCollectionName, getEmbeddingDimension } from './embeddingProvider';
import { generateEmbedding } from './embeddingProvider';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

type IngestItem = { id?: string|number; text: string; source: string; meta?: Record<string, any> };

export class ConsultationIngestService {
  private client: QdrantClient;
  private collection: string;
  private dim: number;

  constructor(collectionBase = 'consultations') {
    this.client = new QdrantClient({ url: process.env.QDRANT_URL || 'http://localhost:6333', apiKey: process.env.QDRANT_API_KEY, checkCompatibility: false });
    this.collection = getCollectionName(collectionBase);
    this.dim = getEmbeddingDimension();
  }

  async ensureCollection() {
    const cols = await this.client.getCollections();
    const exists = cols.collections.some((c: any) => c.name === this.collection);
    if (!exists) {
      await this.client.createCollection(this.collection, { vectors: { size: this.dim, distance: 'Cosine' } });
    }
  }

  async ingestText(items: IngestItem[]) {
    await this.ensureCollection();
    const points = [] as any[];
    for (const [idx, it] of items.entries()) {
      const vec = await generateEmbedding(it.text);
      // Qdrant requires ID to be unsigned integer or UUID. Use UUID always; keep original in payload.
      const originalId = it.id;
      const id = uuidv4();
      points.push({ id, vector: vec, payload: { text: it.text, source: it.source, original_id: originalId, ...it.meta } });
    }
    if (points.length) await this.client.upsert(this.collection, { points });
  }

  async ingestPdf(filePath: string, source: string, opts?: { maxChunk?: number }) {
    const buf = fs.readFileSync(filePath);
    const parsed = await pdfParse(buf);
    const text = parsed.text || '';
    const chunks = this.chunk(text, opts?.maxChunk ?? 1200);
  const items = chunks.map((t, i) => ({ id: `${pathBasename(filePath)}_${i}`, text: t, source, meta: { file: filePath, type: 'pdf' } }));
    await this.ingestText(items);
  }

  async ingestUrls(urls: string[], fetcher: (url: string) => Promise<string>) {
    const items: IngestItem[] = [];
    for (const u of urls) {
      const txt = await fetcher(u);
      if (!txt) continue;
  const chunks = this.chunk(txt, 1200);
  chunks.forEach((t, i) => items.push({ id: `${hash(u)}_${i}`, text: t, source: u, meta: { type: 'html' } }));
    }
    await this.ingestText(items);
  }

  private chunk(s: string, size: number): string[] {
    const out: string[] = [];
    let cur = s.trim();
    while (cur.length > size) {
      let cut = cur.lastIndexOf('\n', size);
      if (cut < size * 0.5) cut = size;
      out.push(cur.slice(0, cut).trim());
      cur = cur.slice(cut).trim();
    }
    if (cur) out.push(cur);
    return out;
  }
}

function pathBasename(p: string) {
  return p.replace(/\\/g, '/').split('/').pop() || 'file';
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}
