#!/usr/bin/env tsx

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AtlasDataPayload, AtlasDiagram } from '../src/lib/atlas/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const atlasDir = path.join(rootDir, 'public', 'atlas');
const atlasDataFile = path.join(atlasDir, 'atlas-data.json');
const searchIndexFile = path.join(atlasDir, 'search-index.json');
const diagramsMetaFile = path.join(atlasDir, 'diagrams.json');

const assertFile = async (filePath: string) => {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing required atlas artifact: ${filePath}`);
  }
};

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

async function main() {
  await Promise.all([
    assertFile(atlasDataFile),
    assertFile(searchIndexFile),
    assertFile(diagramsMetaFile),
  ]);

  const atlasData = JSON.parse(await fs.readFile(atlasDataFile, 'utf8')) as AtlasDataPayload;
  const diagrams = JSON.parse(await fs.readFile(diagramsMetaFile, 'utf8')) as AtlasDiagram[];

  if (!atlasData.elements.length) {
    throw new Error('Atlas data contains no elements. Did you run the build script?');
  }

  const missingDiagrams = diagrams.filter((diagram) => !diagram.svgPath && !diagram.pngPath);
  if (missingDiagrams.length) {
    console.warn(`⚠️  ${missingDiagrams.length} diagrams do not have SVG or PNG assets.`);
  }

  const missingPdfs: AtlasDiagram[] = [];
  for (const diagram of diagrams) {
    if (!diagram.pdfPath) continue;
    const pdfFile = path.join(rootDir, 'public', diagram.pdfPath);
    if (!(await fileExists(pdfFile))) {
      missingPdfs.push(diagram);
    }
  }

  if (missingPdfs.length) {
    throw new Error(`Missing PDF exports for ${missingPdfs.length} diagrams. Re-run \"npm run atlas:build\".`);
  }

  console.log(`✅ Atlas dataset valid (${atlasData.elements.length} elements, ${atlasData.processes.length} processes, ${diagrams.length} diagrams).`);
}

main().catch((error) => {
  console.error('❌ Atlas validation failed:', error);
  process.exit(1);
});
