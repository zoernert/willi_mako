import fs from 'node:fs';
import path from 'node:path';

import type {
  AtlasDataPayload,
  AtlasDiagram,
  AtlasElement,
  AtlasProcess,
  AtlasSearchItem,
} from './types';

const atlasDataFile = path.join(process.cwd(), 'public', 'atlas', 'atlas-data.json');
const atlasSearchFile = path.join(process.cwd(), 'public', 'atlas', 'search-index.json');

let atlasCache: AtlasDataPayload | null = null;
let atlasSearchCache: AtlasSearchItem[] | null = null;

const readJson = <T>(filePath: string): T => {
  const data = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(data) as T;
};

export const loadAtlasData = (): AtlasDataPayload => {
  if (atlasCache) {
    return atlasCache;
  }

  if (!fs.existsSync(atlasDataFile)) {
    throw new Error(`Atlas dataset not found. Expected: ${atlasDataFile}. Run \"npm run atlas:build\" first.`);
  }

  atlasCache = readJson<AtlasDataPayload>(atlasDataFile);
  return atlasCache;
};

export const loadAtlasSearchIndex = (): AtlasSearchItem[] => {
  if (atlasSearchCache) {
    return atlasSearchCache;
  }

  if (!fs.existsSync(atlasSearchFile)) {
    throw new Error(`Atlas search index missing. Expected: ${atlasSearchFile}. Run \"npm run atlas:build\" first.`);
  }

  atlasSearchCache = readJson<AtlasSearchItem[]>(atlasSearchFile);
  return atlasSearchCache;
};

export const getAtlasElements = (): AtlasElement[] => loadAtlasData().elements;

export const getAtlasProcesses = (): AtlasProcess[] => loadAtlasData().processes;

export const getAtlasDiagrams = (): AtlasDiagram[] => loadAtlasData().diagrams;

export const getAtlasElementBySlug = (slug: string): AtlasElement | undefined =>
  getAtlasElements().find((element) => element.slug === slug);

export const getAtlasProcessBySlug = (slug: string): AtlasProcess | undefined =>
  getAtlasProcesses().find((process) => process.slug === slug);

export const getAtlasDiagramBySlug = (slug: string): AtlasDiagram | undefined =>
  getAtlasDiagrams().find((diagram) => diagram.slug === slug);

export const getAtlasDiagramById = (id: string): AtlasDiagram | undefined =>
  getAtlasDiagrams().find((diagram) => diagram.id === id);

export const resetAtlasCache = () => {
  atlasCache = null;
  atlasSearchCache = null;
};
