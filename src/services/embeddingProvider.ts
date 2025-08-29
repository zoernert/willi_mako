import geminiService from './gemini';
import MistralClient from '@mistralai/mistralai';

const PROVIDER = (process.env.EMBEDDING_PROVIDER || 'gemini').toLowerCase();
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || '';

const DEFAULT_GEMINI_DIM = Number(process.env.GEMINI_EMBED_DIM || 768);
const DEFAULT_MISTRAL_DIM = Number(process.env.MISTRAL_EMBED_DIM || 1024);

export function getEmbeddingProvider(): 'gemini' | 'mistral' {
  return PROVIDER === 'mistral' ? 'mistral' : 'gemini';
}

export function getEmbeddingDimension(): number {
  return getEmbeddingProvider() === 'mistral' ? DEFAULT_MISTRAL_DIM : DEFAULT_GEMINI_DIM;
}

export function getCollectionName(baseCollection: string): string {
  return getEmbeddingProvider() === 'mistral' ? `${baseCollection}_mistral` : baseCollection;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  if (provider === 'gemini') {
    return await geminiService.generateEmbedding(text);
  }
  // mistral
  if (!MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY missing');

  // Prefer SDK if available
  try {
    const mistral: any = new (MistralClient as any)(MISTRAL_API_KEY);
    if (mistral?.embeddings && typeof mistral.embeddings.create === 'function') {
      const res = await mistral.embeddings.create({ model: process.env.MISTRAL_EMBED_MODEL || 'mistral-embed', input: text.length > 8000 ? text.slice(0, 8000) : text });
      const vec = res?.data?.[0]?.embedding as number[];
      if (Array.isArray(vec)) return vec;
    }
  } catch {}

  // REST fallback
  const resp = await fetch('https://api.mistral.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: process.env.MISTRAL_EMBED_MODEL || 'mistral-embed', input: text.length > 8000 ? text.slice(0, 8000) : text })
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`Mistral embeddings HTTP ${resp.status}: ${txt}`);
  }
  const json: any = await resp.json();
  const vec = json?.data?.[0]?.embedding as number[];
  if (!Array.isArray(vec)) throw new Error('Mistral embeddings response missing embedding');
  return vec;
}

export async function generateHypotheticalAnswer(query: string): Promise<string> {
  const provider = getEmbeddingProvider();
  if (provider === 'gemini') {
    return await geminiService.generateHypotheticalAnswer(query);
  }

  // For mistral, use chat completions to synthesize a HyDE answer
  if (!MISTRAL_API_KEY) return query;

  const prompt = `Du bist Experte für die deutsche Energiewirtschaft. Antworte prägnant und fachlich korrekt auf die folgende Frage ausschließlich basierend auf allgemeinem Wissen. Gib nur die Antwort ohne Einleitung.\n\nFrage: ${query}`;

  // Try SDK first
  try {
    const mistral: any = new (MistralClient as any)(MISTRAL_API_KEY);
    if (typeof mistral.chat?.complete === 'function') {
      const res = await mistral.chat.complete({
        model: process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest',
        messages: [{ role: 'user', content: prompt }]
      });
      const text = res?.output?.[0]?.content || res?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.trim()) return text.trim();
    }
  } catch {}

  // REST fallback
  const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MISTRAL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.MISTRAL_CHAT_MODEL || 'mistral-small-latest',
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.warn(`Mistral chat HTTP ${resp.status}: ${txt}`);
    return query; // fallback: no HyDE
  }
  const data: any = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' && content.trim() ? content.trim() : query;
}
