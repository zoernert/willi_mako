import fs from 'fs';
import path from 'path';

export interface DatasetDistribution {
  contentUrl?: string;
  encodingFormat?: string;
  name?: string;
}

export interface DatasetEntry {
  ['@type']?: string | string[];
  ['@id']?: string;
  name?: string;
  description?: string;
  url?: string; // expected to be https://stromhaltig.de/data/<slug>/
  distribution?: DatasetDistribution[];
  datePublished?: string;
  dateModified?: string;
  license?: string | Record<string, unknown>;
  keywords?: string[] | string;
  isPartOf?: unknown;
  publisher?: unknown;
  [key: string]: any;
}

export interface DatasetsGraph {
  ['@context']?: any;
  ['@graph']: DatasetEntry[];
}

export interface TablesManifestEntry {
  id: string; // e.g., table-001
  page?: number;
  confidence?: number;
  indicators?: string[];
  headersCount?: number;
  rowsCount?: number;
  files?: { json?: string; csv?: string };
}

export interface TablesManifest {
  tablesCount: number;
  tables: TablesManifestEntry[];
}

const datasetsRoot = path.join(process.cwd(), 'public', 'datasets');
const datasetsJsonPath = path.join(datasetsRoot, 'datasets.jsonld');
const datasetsDataDir = path.join(datasetsRoot, 'data');

function readJSON<T = any>(file: string): T | null {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function loadDatasets(): DatasetEntry[] {
  const graph = readJSON<DatasetsGraph>(datasetsJsonPath);
  if (graph && Array.isArray(graph['@graph'])) {
    return graph['@graph'];
  }
  return [];
}

export function getAllDatasetSlugs(): string[] {
  // Prefer slugs from URLs in JSON-LD
  const ds = loadDatasets();
  const fromUrls = ds
    .map((d) => d.url || '')
    .filter(Boolean)
    .map((u) => {
      try {
        const urlObj = new URL(u);
        const parts = urlObj.pathname.replace(/\/$/, '').split('/');
        return parts[parts.length - 1];
      } catch {
        return '';
      }
    })
    .filter(Boolean);

  // Fallback: directory listing under public/datasets/data
  let fromDirs: string[] = [];
  try {
    fromDirs = fs
      .readdirSync(datasetsDataDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    // ignore
  }
  return Array.from(new Set([...fromUrls, ...fromDirs]));
}

export function findDatasetBySlug(slug: string): DatasetEntry | null {
  const ds = loadDatasets();
  // Match by URL ending in /data/<slug>
  const match = ds.find((d) => {
    if (!d.url) return false;
    try {
      const u = new URL(d.url);
      const pathname = u.pathname.replace(/\/$/, '');
      return pathname.endsWith(`/data/${slug}`);
    } catch {
      return false;
    }
  });
  return match || null;
}

export function loadTablesManifest(slug: string): TablesManifest | null {
  const file = path.join(datasetsDataDir, slug, 'tables.json');
  return readJSON<TablesManifest>(file);
}

export function getSampleTableJsonPath(slug: string, manifest: TablesManifest): string | null {
  if (!manifest || !Array.isArray(manifest.tables) || manifest.tables.length === 0) return null;
  const first = manifest.tables[0];
  const rel = first.files?.json || `${first.id}.json`;
  // Serve path under public via our /data rewrite: /data/<slug>/<file>
  return `/data/${slug}/${rel}`;
}

export interface TableData {
  headers: string[];
  rows: string[][];
}

export function loadFirstTableData(slug: string): TableData | null {
  const manifest = loadTablesManifest(slug);
  if (!manifest || !manifest.tables?.length) return null;
  const first = manifest.tables[0];
  const jsonRel = first.files?.json || `${first.id}.json`;
  const file = path.join(datasetsDataDir, slug, jsonRel);
  const data = readJSON<TableData>(file);
  if (!data || !Array.isArray(data.headers) || !Array.isArray(data.rows)) return null;
  return data;
}

function tokenize(input: string): string[] {
  return (input || '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüß\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

export function suggestDatasetsByKeywords(keywords: string[], limit = 5): DatasetEntry[] {
  const ds = loadDatasets();
  if (!ds.length || !keywords.length) return [];
  const keys = Array.from(new Set(keywords.map((k) => k.toLowerCase())));
  const scored = ds.map((d) => {
    const hay = `${d.name || ''} ${d.description || ''} ${d.url || ''}`.toLowerCase();
    let score = 0;
    keys.forEach((k) => {
      if (hay.includes(k)) score += 2;
    });
    // small bonus for exact hyphenated slug hits
    const slug = (() => {
      try {
        const u = new URL(d.url || '');
        const parts = u.pathname.replace(/\/$/, '').split('/');
        return parts[parts.length - 1];
      } catch { return ''; }
    })();
    keys.forEach((k) => { if (slug.includes(k)) score += 1; });
    return { d, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.d);
}

export function suggestDatasetsFromText(text: string, extraKeywords: string[] = [], limit = 5): DatasetEntry[] {
  const tokens = tokenize(text);
  const top = Array.from(new Set([...extraKeywords, ...tokens])).slice(0, 20);
  return suggestDatasetsByKeywords(top, limit);
}
