#!/usr/bin/env tsx
/**
 * Reindex existing Qdrant collection into provider-specific collections
 * - Creates/ensures two new collections: <base>_openai and <base>_mistral
 * - Crawls the existing base collection via scroll, with payload only
 * - Re-embeds using OpenAI and Mistral (if API keys provided)
 * - Upserts into the target provider collections using the SAME point IDs
 * - Can be stopped/resumed: maintains a resume cursor file and a checkpoint of processed IDs
 * - Optional on-the-fly chunk optimization hook
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { QdrantClient } from '@qdrant/js-client-rest';

// Optional: direct SDKs
import OpenAI from 'openai';
import MistralClient from '@mistralai/mistralai';

// ----- Config -----
const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const BASE_COLLECTION = process.env.QDRANT_COLLECTION || 'ewilli';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_APIKEY || '';
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';

// Model and dimensions
const OPENAI_EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'; // 1536
const OPENAI_DIM = Number(process.env.OPENAI_EMBED_DIM || 1536);
const MISTRAL_EMBED_MODEL = process.env.MISTRAL_EMBED_MODEL || 'mistral-embed'; // 1024
const MISTRAL_DIM = Number(process.env.MISTRAL_EMBED_DIM || 1024);

// Batch sizes and runtime controls
const SCROLL_LIMIT = Number(process.env.REINDEX_SCROLL_LIMIT || 256);
const UPSERT_BATCH = Number(process.env.REINDEX_UPSERT_BATCH || 64);
const RETRIES = Number(process.env.REINDEX_RETRIES || 5);
const BACKOFF_BASE_MS = Number(process.env.REINDEX_BACKOFF_BASE_MS || 1000);

// File-based checkpoints
const OUT_DIR = path.resolve(process.cwd(), 'scripts/.reindex-state');
const CURSOR_FILE = path.join(OUT_DIR, `${BASE_COLLECTION}.cursor.json`);
const DONE_FILE = path.join(OUT_DIR, `${BASE_COLLECTION}.done.jsonl`);

// Target collections
const OPENAI_COLLECTION = `${BASE_COLLECTION}_openai`;
const MISTRAL_COLLECTION = `${BASE_COLLECTION}_mistral`;

// ----- Utilities -----
function ensureDir(p: string) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function loadCursor(): any | null {
  try {
    if (fs.existsSync(CURSOR_FILE)) {
      return JSON.parse(fs.readFileSync(CURSOR_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveCursor(cursor: any) {
  ensureDir(OUT_DIR);
  fs.writeFileSync(CURSOR_FILE, JSON.stringify(cursor));
}

function markDone(id: string) {
  ensureDir(OUT_DIR);
  fs.appendFileSync(DONE_FILE, JSON.stringify({ id, t: Date.now() }) + '\n');
}

function alreadyDone(id: string): boolean {
  if (!fs.existsSync(DONE_FILE)) return false;
  // Quick check: read last N lines into memory for speed, or index into a Set in memory on first call
  // For simplicity here: maintain a Set for this run; rely on idempotent upserts for full resume
  return false;
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = RETRIES) {
  let attempt = 0;
  while (true) {
    try {
      const resp = await fetch(url, init);
      if (resp.ok) return resp;

      const status = resp.status;
      if (status === 429 || status >= 500) {
        const ra = resp.headers.get('retry-after');
        const retryAfterMs = ra ? Number(ra) * 1000 : 0;
        if (attempt >= maxRetries) return resp; // give up, caller will handle
        const delay = retryAfterMs || Math.min(30000, BACKOFF_BASE_MS * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
        await sleep(delay);
        attempt++;
        continue;
      }

      return resp; // non-retryable status
    } catch (e) {
      if (attempt >= maxRetries) throw e;
      const delay = Math.min(30000, BACKOFF_BASE_MS * Math.pow(2, attempt)) + Math.floor(Math.random() * 250);
      await sleep(delay);
      attempt++;
    }
  }
}

// Optional optimization hook
function optimizeChunkText(payload: any): string | null {
  // Priority for text sources
  const text = payload?.text
    || payload?.content
    || payload?.full_text
    || (payload?.type === 'faq' ?
          [payload?.title, payload?.description, payload?.context, payload?.answer, payload?.additional_info]
            .filter(Boolean).join('\n\n')
        : null)
    || payload?.text_content_sample
    || null;

  if (!text) return null;

  // Example light cleanup: trim and collapse whitespace; you can add domain-specific rules here
  return text.replace(/\s+/g, ' ').trim();
}

// ----- Embedding providers -----
async function embedOpenAI(texts: string[]): Promise<number[][]> {
  if (!OPENAI_API_KEY) return [];
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  const input = texts.map(t => (t.length > 8000 ? t.slice(0, 8000) : t));
  const res = await openai.embeddings.create({ model: OPENAI_EMBED_MODEL, input });
  return res.data.map(d => d.embedding as unknown as number[]);
}

async function embedMistral(texts: string[]): Promise<number[][]> {
  if (!MISTRAL_API_KEY) return [];

  // Try official SDK first (if method exists), else fallback to REST
  let useSdk = false;
  let mistral: any;
  try {
    mistral = new MistralClient(MISTRAL_API_KEY);
    useSdk = !!(mistral as any).embeddings && typeof (mistral as any).embeddings.create === 'function';
  } catch {
    useSdk = false;
  }

  const input = texts.map(t => (t.length > 8000 ? t.slice(0, 8000) : t));

  // Single batched request via SDK if available
  if (useSdk) {
    try {
      const res = await (mistral as any).embeddings.create({ model: MISTRAL_EMBED_MODEL, input });
      // Expecting an array in res.data analogous to OpenAI shape
      if (Array.isArray(res?.data)) {
        return res.data.map((d: any) => d?.embedding as number[]);
      }
      // fall through to REST if unexpected
    } catch (e) {
      // fall back to REST with retry/backoff
    }
  }

  // REST batched request with retry/backoff
  const resp = await fetchWithRetry('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: MISTRAL_EMBED_MODEL, input })
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Mistral embeddings HTTP ${resp.status}: ${txt}`);
  }

  const json = await resp.json();
  if (!Array.isArray(json?.data)) throw new Error('Mistral embeddings response missing data array');
  const vectors = json.data.map((d: any) => d?.embedding as number[]);
  if (vectors.some(v => !Array.isArray(v))) throw new Error('Mistral embeddings response contains invalid embedding');
  return vectors as number[][];
}

// ----- Qdrant helpers -----
async function ensureCollections(client: QdrantClient) {
  const info = await client.getCollections();
  const names = info.collections.map((c: any) => c.name);

  if (OPENAI_API_KEY) {
    if (!names.includes(OPENAI_COLLECTION)) {
      await client.createCollection(OPENAI_COLLECTION, {
        vectors: { size: OPENAI_DIM, distance: 'Cosine' },
      });
      console.log(`Created collection ${OPENAI_COLLECTION} (size=${OPENAI_DIM})`);
    } else {
      console.log(`Collection ${OPENAI_COLLECTION} exists`);
    }
  } else {
    console.log('Skipping OpenAI collection (no OPENAI_API_KEY set)');
  }

  if (MISTRAL_API_KEY) {
    if (!names.includes(MISTRAL_COLLECTION)) {
      await client.createCollection(MISTRAL_COLLECTION, {
        vectors: { size: MISTRAL_DIM, distance: 'Cosine' },
      });
      console.log(`Created collection ${MISTRAL_COLLECTION} (size=${MISTRAL_DIM})`);
    } else {
      console.log(`Collection ${MISTRAL_COLLECTION} exists`);
    }
  } else {
    console.log('Skipping Mistral collection (no MISTRAL_API_KEY set)');
  }
}

async function main() {
  const client = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY, checkCompatibility: false });
  await ensureCollections(client);

  let nextPage: any = loadCursor();
  let processed = 0;
  let batchIds: string[] = [];
  let batchTexts: string[] = [];
  let batchPayloads: any[] = [];

  while (true) {
    const page = await client.scroll(BASE_COLLECTION, {
      limit: SCROLL_LIMIT,
      with_payload: true,
      with_vector: false,
      ...(nextPage ? { offset: nextPage } : {})
    });

    if (!page.points || page.points.length === 0) {
      console.log('Done. No more points.');
      break;
    }

    for (const p of page.points) {
      const id = p.id?.toString();
      if (!id) continue;

      const text = optimizeChunkText(p.payload);
      if (!text) {
        markDone(id);
        continue;
      }

      batchIds.push(id);
      batchTexts.push(text);
      batchPayloads.push(p.payload || {});

      if (batchIds.length >= UPSERT_BATCH) {
        await flushBatches(client, batchIds, batchTexts, batchPayloads);
        processed += batchIds.length;
        console.log(`Processed: ${processed}`);
        batchIds = [];
        batchTexts = [];
        batchPayloads = [];
      }
    }

    if (batchIds.length > 0) {
      await flushBatches(client, batchIds, batchTexts, batchPayloads);
      processed += batchIds.length;
      console.log(`Processed: ${processed}`);
      batchIds = [];
      batchTexts = [];
      batchPayloads = [];
    }

    if (page.next_page_offset) {
      saveCursor(page.next_page_offset);
      nextPage = page.next_page_offset;
    } else {
      console.log('Reached last page.');
      break;
    }
  }

  console.log('Reindexing completed.');
}

async function flushBatches(client: QdrantClient, ids: string[], texts: string[], payloads: any[]) {
  const [openaiVecs, mistralVecs] = await Promise.all([
    embedOpenAI(texts),
    embedMistral(texts)
  ]);

  if (openaiVecs.length > 0) {
    const points = ids.map((id, i) => ({ id, vector: openaiVecs[i], payload: payloads[i] }));
    await client.upsert(OPENAI_COLLECTION, { wait: true, points });
    ids.forEach(markDone);
  }

  if (mistralVecs.length > 0) {
    const points = ids.map((id, i) => ({ id, vector: mistralVecs[i], payload: payloads[i] }));
    await client.upsert(MISTRAL_COLLECTION, { wait: true, points });
    ids.forEach(markDone);
  }
}

main().catch(err => {
  console.error('Reindexing error:', err);
  process.exit(1);
});
