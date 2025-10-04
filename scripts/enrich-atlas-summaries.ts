#!/usr/bin/env tsx

import 'dotenv/config';

import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

import { QdrantClient } from '@qdrant/js-client-rest';
import { GoogleGenerativeAI } from '@google/generative-ai';

type RawAtlasData = {
  generatedAt: string;
  collection?: string;
  elements: RawAtlasElement[];
};

type RawAtlasElement = {
  EDIFACT_Element_ID: string;
  segmentName: string;
  elementCode: string;
  elementName: string;
  segmentGroup?: string | null;
  description?: string;
  processContext?: RawProcessContext[];
  messages?: RawAtlasMessage[];
};

type RawAtlasMessage = {
  messageType: string;
  messageVersion?: string;
  description?: string;
  processContext?: RawProcessContext[];
};

type RawProcessContext = {
  processName: string;
  summary: string;
  relevantLaws?: string[];
  keywords?: string[];
  source?: string;
  summaryPrompt?: string;
  summarySource?: string;
  summaryUpdatedAt?: string;
};

type SummaryProgressEntry = {
  id: string;
  promptHash: string;
  lastPrompt: string;
  summaryHash: string;
  summary: string;
  updatedAt: string;
  model: string;
};

type SummaryProgressStore = {
  version: number;
  entries: Record<string, SummaryProgressEntry>;
};

interface SummaryTask {
  id: string;
  prompt: string;
  getCurrentSummary: () => string;
  setSummary: (value: string) => void;
  getContextBlock: () => string;
  searchTerms: string[];
  processName: string;
}

const DATA_FILE = path.resolve(process.cwd(), 'data', 'atlas', 'data_atlas.json');
const PROGRESS_FILE = path.resolve(process.cwd(), 'data', 'atlas', 'summary_progress.json');
const BACKUP_FILE = path.resolve(process.cwd(), 'data', 'atlas', `data_atlas.backup.${new Date().toISOString().replace(/[:.]/g, '-')}.json`);

const GEMINI_MODEL = process.env.ATLAS_SUMMARY_MODEL || 'gemini-2.0-flash';
const GEMINI_API_KEY =
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY_PAID ||
  process.env.GOOGLE_AI_API_KEY_FREE ||
  process.env.GEMINI_API_KEY;

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;

const PROMPT_PREFIX = /^(Beschreibe|Beschreibt|Erläutere|Erläutert|Erkläre|Erklärt|Skizziere|Skizziert|Fasse|Fasst|Gib|Gebe|Gibt|Nenne|Nennt|Zeige|Zeigt|Stelle|Stellt|Leite|Leitet|Analysiere|Analysiert|Was|Wie|Welche|Warum|Erstelle|Erstellt)/i;
const SUMMARY_SOURCE_FLAG = 'llm:generation:willi-mako:v1';

let cachedQdrantPayloads: any[] | null = null;
let qdrantClient: QdrantClient | null = null;

const qdrantCollection = (data: RawAtlasData) => data.collection || process.env.QDRANT_COLLECTION || 'willi_mako';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const hashText = (value: string) =>
  crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');

const ensureProgressStore = async (): Promise<SummaryProgressStore> => {
  try {
    const raw = await fs.readFile(PROGRESS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as SummaryProgressStore;
    return {
      version: parsed.version ?? 1,
      entries: parsed.entries ?? {},
    };
  } catch {
    return { version: 1, entries: {} };
  }
};

const saveProgressStore = async (store: SummaryProgressStore) => {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(store, null, 2) + '\n', 'utf8');
};

const backupDataFile = async () => {
  try {
    const exists = await fs.stat(BACKUP_FILE).then(() => true).catch(() => false);
    if (!exists) {
      await fs.copyFile(DATA_FILE, BACKUP_FILE);
      console.log(`📦 Backup geschrieben: ${path.relative(process.cwd(), BACKUP_FILE)}`);
    }
  } catch (error) {
    console.warn('⚠️  Konnte Backup nicht anlegen:', (error as Error).message);
  }
};

const loadAtlasData = async (): Promise<RawAtlasData> => {
  const file = await fs.readFile(DATA_FILE, 'utf8');
  return JSON.parse(file) as RawAtlasData;
};

const saveAtlasData = async (data: RawAtlasData) => {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + '\n', 'utf8');
};

const getQdrantClient = (): QdrantClient | null => {
  if (!QDRANT_URL) {
    return null;
  }

  if (!qdrantClient) {
    qdrantClient = new QdrantClient({ url: QDRANT_URL, apiKey: QDRANT_API_KEY, timeout: 10_000 });
  }

  return qdrantClient;
};

const loadQdrantPayloads = async (collection: string) => {
  const client = getQdrantClient();
  if (!client) {
    return [];
  }

  if (cachedQdrantPayloads) {
    return cachedQdrantPayloads;
  }

  const payloads: any[] = [];
  let next: string | number | null | undefined;

  try {
    do {
      const response: any = await client.scroll(collection, {
        limit: 256,
        with_payload: true as any,
        offset: next,
      } as any);

      if (Array.isArray(response?.points)) {
        payloads.push(...response.points);
      }

      next = response?.next_page_offset;
      if (payloads.length >= 4096) {
        break;
      }
    } while (next);
  } catch (error) {
    console.warn('⚠️  Fehler beim Laden der Qdrant-Daten:', (error as Error).message);
  }

  cachedQdrantPayloads = payloads;
  return payloads;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildSearchTerms = (task: SummaryTask) => {
  const promptTerms = normalize(task.prompt).split(' ').filter(Boolean);
  const extraTerms = task.searchTerms.map(normalize).filter(Boolean);
  const terms = new Set([...promptTerms, ...extraTerms]);
  return Array.from(terms).filter((term) => term.length > 2);
};

const fetchQdrantSnippets = async (task: SummaryTask, collection: string) => {
  const payloads = await loadQdrantPayloads(collection);
  if (!payloads.length) {
    return [] as { title: string; text: string; url?: string }[];
  }

  const terms = buildSearchTerms(task);
  if (terms.length === 0) {
    return [];
  }

  const scored = payloads
    .map((point) => {
      const payload = point.payload || {};
      const title: string = payload.title || payload.heading || payload.section_title || payload.slug || '';
      const text: string = payload.contextual_content || payload.text || payload.content || '';
      if (!text) {
        return null;
      }

      const normalizedText = normalize(`${title} ${text}`);
      let score = 0;
      terms.forEach((term) => {
        if (normalizedText.includes(term)) {
          score += 1;
        }
      });

      if (score === 0) {
        return null;
      }

      return {
        score,
        title: title || 'Qdrant Eintrag',
        text,
        url: payload.url || payload.href || payload.source_url,
      };
    })
    .filter(Boolean) as { score: number; title: string; text: string; url?: string }[];

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map(({ title, text, url }) => ({
    title,
    text: text.length > 1200 ? `${text.slice(0, 1200)}…` : text,
    url,
  }));
};

const model = (() => {
  if (!GEMINI_API_KEY) {
    throw new Error('Kein Google/Gemini API Key gefunden. Bitte GOOGLE_AI_API_KEY oder GEMINI_API_KEY setzen.');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: GEMINI_MODEL });
})();

const isLikelyPrompt = (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) {
    return false;
  }

  const wordCount = trimmed.split(/\s+/).length;
  if (PROMPT_PREFIX.test(trimmed)) {
    return true;
  }

  if (trimmed.endsWith('?')) {
    return true;
  }

  if (wordCount <= 35 && trimmed.match(/\b(Beschreibe|Erläutere|Erkläre|Skizziere|Wie|Was|Welche|Warum|Nenne)\b/i)) {
    return true;
  }

  return false;
};

const collectSummaryTasks = (data: RawAtlasData): SummaryTask[] => {
  const tasks: SummaryTask[] = [];

  for (const element of data.elements) {
    const elementContextBase = `EDIFACT-ID: ${element.EDIFACT_Element_ID}\nSegment: ${element.segmentName}${
      element.segmentGroup ? ` (Gruppe ${element.segmentGroup})` : ''
    }\nElementname: ${element.elementName} (${element.elementCode})\nBeschreibung: ${element.description || '—'}`;

    element.processContext?.forEach((ctx, index) => {
      tasks.push({
        id: `element:${element.EDIFACT_Element_ID}:process:${ctx.processName}`,
        prompt: ctx.summary,
        processName: ctx.processName,
        getCurrentSummary: () => element.processContext![index].summary,
        setSummary: (value: string) => {
          const target = element.processContext![index];
          target.summaryPrompt = ctx.summary;
          target.summary = value;
          target.summarySource = SUMMARY_SOURCE_FLAG;
          target.summaryUpdatedAt = new Date().toISOString();
        },
        getContextBlock: () => {
          const laws = ctx.relevantLaws?.length ? ctx.relevantLaws.join(', ') : 'keine Angabe';
          const keywords = ctx.keywords?.length ? ctx.keywords.join(', ') : 'keine Angabe';
          return [
            elementContextBase,
            `Prozess: ${ctx.processName}`,
            `Relevante Gesetze: ${laws}`,
            `Schlagworte: ${keywords}`,
          ].join('\n');
        },
        searchTerms: [ctx.processName, ...(ctx.keywords ?? []), element.elementName, element.segmentName].filter(Boolean),
      });
    });

    element.messages?.forEach((message, messageIndex) => {
      message.processContext?.forEach((ctx, ctxIndex) => {
        tasks.push({
          id: `element:${element.EDIFACT_Element_ID}:message:${message.messageType}:${message.messageVersion ?? 'default'}:process:${ctx.processName}`,
          prompt: ctx.summary,
          processName: ctx.processName,
          getCurrentSummary: () => element.messages![messageIndex].processContext![ctxIndex].summary,
          setSummary: (value: string) => {
            const target = element.messages![messageIndex].processContext![ctxIndex];
            target.summaryPrompt = ctx.summary;
            target.summary = value;
            target.summarySource = SUMMARY_SOURCE_FLAG;
            target.summaryUpdatedAt = new Date().toISOString();
          },
          getContextBlock: () => {
            const laws = ctx.relevantLaws?.length ? ctx.relevantLaws.join(', ') : 'keine Angabe';
            const keywords = ctx.keywords?.length ? ctx.keywords.join(', ') : 'keine Angabe';
            return [
              elementContextBase,
              `Nachricht: ${message.messageType} v${message.messageVersion ?? '—'}`,
              message.description ? `Nachrichtenbeschreibung: ${message.description}` : undefined,
              `Prozess: ${ctx.processName}`,
              `Relevante Gesetze: ${laws}`,
              `Schlagworte: ${keywords}`,
            ]
              .filter(Boolean)
              .join('\n');
          },
          searchTerms: [
            ctx.processName,
            ...(ctx.keywords ?? []),
            element.elementName,
            element.segmentName,
            message.messageType,
          ].filter(Boolean),
        });
      });
    });
  }

  return tasks;
};

const formatReferences = (refs: { title: string; text: string; url?: string }[]) => {
  if (!refs.length) {
    return 'Keine zusätzlichen Dokumente gefunden.';
  }

  return refs
    .map((ref, index) => [
      `Quelle ${index + 1}: ${ref.title}`,
      ref.url ? `URL: ${ref.url}` : undefined,
      `Auszug: ${ref.text}`,
    ].filter(Boolean).join('\n'))
    .join('\n\n');
};

const generateSummary = async (task: SummaryTask, collection: string) => {
  const references = await fetchQdrantSnippets(task, collection);

  const systemPrompt = `Du bist ein Fachexperte für Marktkommunikation in der Energiewirtschaft. Antworte prägnant, sachlich und auf Deutsch.`;

  const userPrompt = [
    `Aufgabe: ${task.prompt}`,
    '',
    'Kontext aus dem Daten Atlas:',
    task.getContextBlock(),
    '',
    'Zusätzliche Wissensbasis (Qdrant):',
    formatReferences(references),
    '',
    'Anforderungen:',
    '- Erstelle eine verständliche, aber fachlich präzise Zusammenfassung des genannten Prozesses.',
    '- Betone Abläufe, beteiligte Rollen, Nachrichten und rechtliche Grundlagen.',
    '- Falls Informationen fehlen, liefere eine plausible Ergänzung und kennzeichne Unsicherheiten.',
    '- Verwende 2–3 Absätze Fließtext ohne Aufzählungszeichen.',
  ].join('\n');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await model.generateContent({
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      });

      const text = result.response?.text()?.trim();
      if (text) {
        return text;
      }
    } catch (error) {
      const message = (error as Error).message || String(error);
      console.warn(`⚠️  LLM-Fehler bei ${task.id} (Versuch ${attempt + 1}/3): ${message}`);
      await sleep(1000 * (attempt + 1));
    }
  }

  throw new Error('LLM lieferte keine Antwort');
};

const main = async () => {
  await backupDataFile();

  const [data, progressStore] = await Promise.all([loadAtlasData(), ensureProgressStore()]);
  const collection = qdrantCollection(data);
  const allTasks = collectSummaryTasks(data);

  const pendingTasks = allTasks.filter((task) => {
    const current = task.getCurrentSummary();
    const progress = progressStore.entries[task.id];

    if (progress && progress.summary === current) {
      return false;
    }

    if (!isLikelyPrompt(current)) {
      return false;
    }

    return true;
  });

  if (pendingTasks.length === 0) {
    console.log('✅ Alle Summary-Felder sind bereits beantwortet.');
    return;
  }

  console.log(`✳️  ${pendingTasks.length} offene Summary-Prompts werden beantwortet (gesamt ${allTasks.length}).`);

  for (let index = 0; index < pendingTasks.length; index += 1) {
    const task = pendingTasks[index];
    const position = index + 1;
    const total = pendingTasks.length;

    console.log(`\n[${position}/${total}] ${task.id}`);

    try {
      const answer = await generateSummary(task, collection);
      task.setSummary(answer);

      const entry: SummaryProgressEntry = {
        id: task.id,
        promptHash: hashText(task.prompt),
        lastPrompt: task.prompt,
        summaryHash: hashText(answer),
        summary: answer,
        updatedAt: new Date().toISOString(),
        model: GEMINI_MODEL,
      };

      progressStore.entries[task.id] = entry;

      await saveAtlasData(data);
      await saveProgressStore(progressStore);

      console.log(`✅ Zusammenfassung gespeichert (${answer.split(/\s+/).length} Wörter).`);
    } catch (error) {
      console.error(`❌ Fehler bei ${task.id}:`, (error as Error).message);
    }
  }

  console.log('\n🏁 Verarbeitung abgeschlossen.');
};

main().catch((error) => {
  console.error('❌ Skript abgebrochen:', error);
  process.exitCode = 1;
});
