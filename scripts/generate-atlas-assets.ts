#!/usr/bin/env tsx

import 'dotenv/config';

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QdrantClient } from '@qdrant/js-client-rest';
import puppeteer, { Browser } from 'puppeteer';

import { createDiagramSlug, createElementSlug, createProcessSlug, slugify, unique } from '../src/lib/atlas/utils';
import type { AtlasDataPayload, AtlasDiagram, AtlasElement, AtlasProcess, AtlasQdrantReference, AtlasSearchItem } from '../src/lib/atlas/types';

interface RawProcessContext {
  processName: string;
  summary?: string;
  relevantLaws?: string[];
  keywords?: string[];
  source?: string;
}

interface RawMessageUsage {
  messageType: string;
  messageVersion?: string;
  roleContext?: string;
  codesUsed?: string[];
  isMandatory: boolean;
  citationSource?: string;
  description?: string;
  processContext?: RawProcessContext[];
}

interface RawAtlasElement {
  EDIFACT_Element_ID: string;
  segmentName: string;
  elementCode: string;
  elementName: string;
  segmentGroup?: string | null;
  description: string;
  messages: RawMessageUsage[];
  processContext?: RawProcessContext[];
}

interface RawAtlasData {
  generatedAt: string;
  collection?: string;
  elements: RawAtlasElement[];
}

interface ProcessDefinition {
  process_name: string;
  trigger_question?: string;
  search_keywords?: string[];
  relevant_laws?: string[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const dataDir = path.join(rootDir, 'data', 'atlas');
const outputDir = path.join(rootDir, 'public', 'atlas');
const diagramSourceDir = path.join(dataDir, 'uml_diagrams');
const diagramSvgDir = path.join(diagramSourceDir, 'svg');
const diagramPngDir = path.join(diagramSourceDir, 'png');
const diagramPdfDir = path.join(outputDir, 'pdf');
const diagramSvgOutDir = path.join(outputDir, 'svg');
const diagramPngOutDir = path.join(outputDir, 'png');
const diagramPumlOutDir = path.join(outputDir, 'puml');

const atlasDataPath = path.join(dataDir, 'data_atlas.json');
const processDefinitionPath = path.join(dataDir, 'process_definitions.json');
const atlasOutputPath = path.join(outputDir, 'atlas-data.json');
const atlasSearchOutputPath = path.join(outputDir, 'search-index.json');
const atlasDiagramsOutputPath = path.join(outputDir, 'diagrams.json');

const logoPath = path.join(rootDir, 'public', 'media', 'logo.png');

const QDRANT_URL = process.env.QDRANT_URL;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'willi_mako';

let browserInstance: Browser | null = null;
let qdrantPayloadCache: any[] | null = null;

const getBrowser = async () => {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  return browserInstance;
};

const shortDescription = (value: string, maxLength = 220) => {
  if (!value) return '';
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}…`;
};

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true });
};

const copyIfNewer = async (source: string, target: string) => {
  try {
    const [srcStat, destStat] = await Promise.all([
      fs.stat(source),
      fs.stat(target).catch(() => null),
    ]);

    if (destStat && destStat.mtimeMs >= srcStat.mtimeMs) {
      return;
    }
  } catch {
    // ignore
  }

  await fs.copyFile(source, target);
};

const shouldRenderPdf = async (source: string, target: string) => {
  try {
    const [srcStat, destStat] = await Promise.all([
      fs.stat(source),
      fs.stat(target),
    ]);
    return srcStat.mtimeMs > destStat.mtimeMs;
  } catch {
    return true;
  }
};

const createDiagramTitle = (id: string) => id.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();

const loadLogo = () => {
  const buffer = fssync.readFileSync(logoPath);
  return `data:image/png;base64,${buffer.toString('base64')}`;
};

const renderPdf = async (
  browser: Browser,
  svgContent: string,
  outputPath: string,
  title: string,
  logoDataUri: string,
) => {
  const html = `<!DOCTYPE html>
  <html lang="de">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif; margin: 0; color: #1f2933; }
        header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        header img { height: 28px; }
        header h1 { font-size: 16px; margin: 0; font-weight: 600; }
        header span { font-size: 12px; color: #6b7280; }
        .diagram-wrapper { border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; }
        svg { width: 100%; height: auto; }
      </style>
    </head>
    <body>
      <header>
        <img src="${logoDataUri}" alt="Willi Mako Logo" />
        <div>
          <h1>Daten Atlas – ${title}</h1>
          <span>Willi Mako • https://stromhaltig.de</span>
        </div>
      </header>
      <div class="diagram-wrapper">${svgContent}</div>
    </body>
  </html>`;

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  await page.close();
};

const createQdrantClient = () => {
  if (!QDRANT_URL) {
    console.warn('⚠️  Qdrant URL not configured. Skipping reference enrichment.');
    return null;
  }

  try {
    return new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY,
      timeout: 10_000,
    });
  } catch (error) {
    console.warn('⚠️  Unable to initialize Qdrant client:', error);
    return null;
  }
};

const loadQdrantPayloads = async (client: QdrantClient | null) => {
  if (!client) return [];
  if (qdrantPayloadCache) return qdrantPayloadCache;

  const points: any[] = [];
  let nextPage: string | number | null | undefined;

  try {
    do {
      const result: any = await client.scroll(QDRANT_COLLECTION, {
        limit: 256,
        with_payload: true as any,
        offset: nextPage,
      } as any);

      if (Array.isArray(result?.points)) {
        points.push(...result.points);
      }

      nextPage = result?.next_page_offset;
      if (points.length >= 1024) {
        break;
      }
    } while (nextPage);
  } catch (error) {
    console.warn('⚠️  Failed to preload Qdrant payloads:', (error as Error).message);
  }

  qdrantPayloadCache = points;
  return points;
};

const fetchQdrantReferences = async (
  client: QdrantClient | null,
  term: string,
  limit = 3,
): Promise<AtlasQdrantReference[]> => {
  if (!client) return [];

  try {
    const payloads = await loadQdrantPayloads(client);

    const candidates = payloads
      .map((point: any) => {
        const payload = point.payload || {};
        const text: string = payload.contextual_content || payload.text || payload.content || '';
        const title: string = payload.title || payload.heading || payload.section_title || payload.slug || 'Fachlicher Kontext';
        const url: string | undefined = payload.url || payload.href || payload.source_url;
        const matchesTerm = [title, text, ...(payload.keywords || [])]
          .filter(Boolean)
          .some((value: string) => value.toLowerCase().includes(term.toLowerCase()));

        if (!matchesTerm) {
          return null;
        }

        return {
          id: String(point.id ?? title),
          title,
          url,
          snippet: shortDescription(text),
          score: point.score,
          tags: payload.keywords,
        } satisfies AtlasQdrantReference;
      })
      .filter(Boolean) as AtlasQdrantReference[];

    const candidatesLimited = candidates.slice(0, limit);

    return candidatesLimited;
  } catch (error) {
    console.warn(`⚠️  Qdrant lookup failed for term \"${term}\":`, (error as Error).message);
    return [];
  }
};

const enrichProcessContext = (contexts: RawProcessContext[] | undefined, slugMap: Map<string, string>) => {
  if (!contexts?.length) return [];

  return contexts.map((context) => ({
    name: context.processName,
    slug: slugMap.get(context.processName) || createProcessSlug(context.processName),
    summary: context.summary,
    relevantLaws: context.relevantLaws || [],
    keywords: context.keywords || [],
  }));
};

const isLikelyPrompt = (value: string | undefined) => {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith('?')) return true;
  const prefix = /^(Beschreibe|Beschreibt|Erläutere|Erläutert|Erkläre|Erklärt|Skizziere|Skizziert|Fasse|Fasst|Gib|Gebe|Gibt|Nenne|Nennt|Zeige|Zeigt|Stelle|Stellt|Leite|Leitet|Analysiere|Analysiert|Was|Wie|Welche|Warum|Erstelle|Erstellt)\b/i;
  return prefix.test(trimmed);
};

const pickProcessSummary = (current: string | undefined, candidate?: string) => {
  if (!candidate || isLikelyPrompt(candidate)) {
    return current;
  }

  if (!current) {
    return candidate;
  }

  return candidate.length > current.length ? candidate : current;
};

async function main() {
  console.time('Atlas build');
  await Promise.all([
    ensureDir(outputDir),
    ensureDir(diagramSvgOutDir),
    ensureDir(diagramPngOutDir),
    ensureDir(diagramPdfDir),
    ensureDir(diagramPumlOutDir),
  ]);

  const [atlasRaw, processDefs] = await Promise.all([
    fs.readFile(atlasDataPath, 'utf8').then((content) => JSON.parse(content) as RawAtlasData),
    fs.readFile(processDefinitionPath, 'utf8').then((content) => JSON.parse(content) as ProcessDefinition[]),
  ]);

  const processSlugMap = new Map<string, string>();
  processDefs.forEach((definition) => {
    processSlugMap.set(definition.process_name, createProcessSlug(definition.process_name));
  });

  const diagramBaseNames = (await fs.readdir(diagramSourceDir))
    .filter((file) => file.endsWith('.puml'))
    .map((file) => file.replace(/\.puml$/i, ''));

  const diagramMetadataMap = new Map<string, AtlasDiagram>();

  const logoDataUri = loadLogo();

  const qdrantClient = createQdrantClient();

  const elements: AtlasElement[] = [];
  const processAggregator = new Map<string, {
    def?: ProcessDefinition;
    slug: string;
    elements: Set<string>;
    keywords: Set<string>;
    relevantLaws: Set<string>;
    messageTypes: Set<string>;
    diagramIds: Set<string>;
    summary?: string;
  }>();

  for (const definition of processDefs) {
    const slug = createProcessSlug(definition.process_name);
    processAggregator.set(definition.process_name, {
      def: definition,
      slug,
      elements: new Set(),
      keywords: new Set(definition.search_keywords || []),
      relevantLaws: new Set(definition.relevant_laws || []),
      messageTypes: new Set(),
      diagramIds: new Set(),
    });
  }

  for (const element of atlasRaw.elements) {
    const slug = createElementSlug(element.EDIFACT_Element_ID, element.elementName);
    const processSummaries = enrichProcessContext(element.processContext, processSlugMap);

    processSummaries.forEach((processSummary) => {
      const entry = processAggregator.get(processSummary.name) || processAggregator.get(processSummary.slug);
      if (entry) {
        entry.elements.add(slug);
        processSummary.keywords.forEach((keyword) => entry.keywords.add(keyword));
        processSummary.relevantLaws.forEach((law) => entry.relevantLaws.add(law));
        entry.summary = pickProcessSummary(entry.summary, processSummary.summary);
      }
    });

    const messages = element.messages.map((message) => {
      const processes = enrichProcessContext(message.processContext, processSlugMap);
      processes.forEach((processSummary) => {
        const entry = processAggregator.get(processSummary.name) || processAggregator.get(processSummary.slug);
        if (entry) {
          entry.elements.add(slug);
          entry.messageTypes.add(message.messageType);
          processSummary.keywords.forEach((keyword) => entry.keywords.add(keyword));
          processSummary.relevantLaws.forEach((law) => entry.relevantLaws.add(law));
          entry.summary = pickProcessSummary(entry.summary, processSummary.summary);
        }
      });

      return {
        messageType: message.messageType,
        messageVersion: message.messageVersion,
        roleContext: message.roleContext,
        codesUsed: message.codesUsed || [],
        isMandatory: message.isMandatory,
        citationSource: message.citationSource,
        description: message.description,
        processes,
      };
    });

    const normalizedId = element.EDIFACT_Element_ID.replace(/[:]/g, '_');
    const diagramIds = diagramBaseNames.filter((base) => base.toLowerCase() === normalizedId.toLowerCase());

    const keywords = unique([
      element.segmentName,
      element.elementName,
      element.elementCode,
      ...processSummaries.flatMap((process) => [process.name, ...process.keywords, ...process.relevantLaws]),
      ...messages.flatMap((message) => [message.messageType, ...message.codesUsed]),
    ].filter(Boolean));

    const qdrantReferences = await fetchQdrantReferences(qdrantClient, element.EDIFACT_Element_ID);

    elements.push({
      slug,
      edifactId: element.EDIFACT_Element_ID,
      elementName: element.elementName,
      elementCode: element.elementCode,
      segmentName: element.segmentName,
      segmentGroup: element.segmentGroup ?? null,
      description: element.description,
      keywords,
      processes: processSummaries,
      messages,
      qdrantReferences,
      diagramIds,
      updatedAt: new Date().toISOString(),
    });

    for (const diagramId of diagramIds) {
      const diagramSlug = createDiagramSlug(diagramId);
      const svgExists = fssync.existsSync(path.join(diagramSvgDir, `${diagramId}.svg`));
      const pngExists = fssync.existsSync(path.join(diagramPngDir, `${diagramId}.png`));
      processSummaries.forEach((processSummary) => {
        const aggregate = processAggregator.get(processSummary.name);
        if (aggregate) {
          aggregate.diagramIds.add(diagramId);
        }
      });
      diagramMetadataMap.set(diagramId, {
        id: diagramId,
        slug: diagramSlug,
        title: `${element.elementName} (${element.EDIFACT_Element_ID})`,
        description: `${element.elementName} (${element.EDIFACT_Element_ID}) – Segment ${element.segmentName}`,
        elementSlug: slug,
        svgPath: svgExists ? `/atlas/svg/${diagramId}.svg` : undefined,
        pngPath: pngExists ? `/atlas/png/${diagramId}.png` : undefined,
        pdfPath: svgExists ? `/atlas/pdf/${diagramId}.pdf` : undefined,
        pumlPath: `/atlas/puml/${diagramId}.puml`,
        keywords: keywords.slice(0, 12),
        relatedProcessSlugs: processSummaries.map((process) => process.slug),
        source: 'data_atlas.json',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  for (const [processName, aggregate] of processAggregator.entries()) {
    if (!aggregate.def) {
      aggregate.def = {
        process_name: processName,
      };
    }
  }

  const processes: AtlasProcess[] = [];

  for (const [processName, aggregate] of processAggregator.entries()) {
    const qdrantReferences = await fetchQdrantReferences(qdrantClient, processName);
    const aggregatedSummary = pickProcessSummary(undefined, aggregate.summary);
    const fallbackDescription = aggregate.def?.trigger_question;
    processes.push({
      slug: aggregate.slug,
      name: processName,
      triggerQuestion: aggregate.def?.trigger_question,
      relevantLaws: Array.from(aggregate.relevantLaws),
      keywords: Array.from(aggregate.keywords),
      summary: aggregatedSummary ?? fallbackDescription,
      description: aggregatedSummary ?? fallbackDescription,
      elements: Array.from(aggregate.elements),
      diagramIds: Array.from(aggregate.diagramIds),
      messageTypes: Array.from(aggregate.messageTypes),
      qdrantReferences,
      updatedAt: new Date().toISOString(),
    });
  }

  for (const [diagramId, metadata] of diagramMetadataMap.entries()) {
    metadata.relatedProcessSlugs = metadata.relatedProcessSlugs.filter((slug) => processes.some((process) => process.slug === slug));
  }

  for (const diagramId of diagramBaseNames) {
    if (!diagramMetadataMap.has(diagramId)) {
      const svgExists = fssync.existsSync(path.join(diagramSvgDir, `${diagramId}.svg`));
      const pngExists = fssync.existsSync(path.join(diagramPngDir, `${diagramId}.png`));
      diagramMetadataMap.set(diagramId, {
        id: diagramId,
        slug: createDiagramSlug(diagramId),
        title: createDiagramTitle(diagramId),
        description: 'Visualisierung aus dem Daten Atlas',
        svgPath: svgExists ? `/atlas/svg/${diagramId}.svg` : undefined,
        pngPath: pngExists ? `/atlas/png/${diagramId}.png` : undefined,
        pdfPath: svgExists ? `/atlas/pdf/${diagramId}.pdf` : undefined,
        pumlPath: `/atlas/puml/${diagramId}.puml`,
        keywords: [diagramId],
        relatedProcessSlugs: [],
        source: 'uml_diagrams',
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const diagrams: AtlasDiagram[] = Array.from(diagramMetadataMap.values());

  const atlasData: AtlasDataPayload = {
    generatedAt: new Date().toISOString(),
    elements,
    processes,
    diagrams,
  };

  const searchIndex: AtlasSearchItem[] = [
    ...elements.map<AtlasSearchItem>((element) => ({
      id: `element:${element.slug}`,
      type: 'element',
      title: `${element.elementName} (${element.edifactId})`,
      subtitle: element.segmentName,
      description: shortDescription(element.description),
      slug: element.slug,
      url: `/daten-atlas/datenelemente/${element.slug}`,
      keywords: element.keywords,
      relatedIds: element.diagramIds,
    })),
    ...processes.map<AtlasSearchItem>((process) => ({
      id: `process:${process.slug}`,
      type: 'process',
      title: process.name,
      subtitle: process.relevantLaws.join(', '),
      description: shortDescription(process.summary || process.description || ''),
      slug: process.slug,
      url: `/daten-atlas/prozesse/${process.slug}`,
      keywords: [...process.keywords, ...process.relevantLaws],
      relatedIds: process.elements,
    })),
    ...diagrams.map<AtlasSearchItem>((diagram) => ({
      id: `diagram:${diagram.slug}`,
      type: 'diagram',
      title: diagram.title,
      subtitle: 'Visualisierung',
      description: diagram.description,
      slug: diagram.slug,
      url: `/daten-atlas/visualisierungen/${diagram.slug}`,
      keywords: diagram.keywords,
      relatedIds: diagram.relatedProcessSlugs,
    })),
  ];

  await Promise.all([
    fs.writeFile(atlasOutputPath, JSON.stringify(atlasData, null, 2), 'utf8'),
    fs.writeFile(atlasSearchOutputPath, JSON.stringify(searchIndex, null, 2), 'utf8'),
    fs.writeFile(atlasDiagramsOutputPath, JSON.stringify(diagrams, null, 2), 'utf8'),
  ]);

  // Copy diagrams
  for (const diagramId of diagramBaseNames) {
    const pumlSource = path.join(diagramSourceDir, `${diagramId}.puml`);
    const svgSource = path.join(diagramSvgDir, `${diagramId}.svg`);
    const pngSource = path.join(diagramPngDir, `${diagramId}.png`);

    const pumlTarget = path.join(diagramPumlOutDir, `${diagramId}.puml`);
    const svgTarget = path.join(diagramSvgOutDir, `${diagramId}.svg`);
    const pngTarget = path.join(diagramPngOutDir, `${diagramId}.png`);
    const pdfTarget = path.join(diagramPdfDir, `${diagramId}.pdf`);

    if (fssync.existsSync(pumlSource)) {
      await copyIfNewer(pumlSource, pumlTarget);
    }

    if (fssync.existsSync(svgSource)) {
      await copyIfNewer(svgSource, svgTarget);

      if (await shouldRenderPdf(svgSource, pdfTarget)) {
        const svgContent = await fs.readFile(svgSource, 'utf8');
        const browser = await getBrowser();
        await renderPdf(browser, svgContent, pdfTarget, createDiagramTitle(diagramId), logoDataUri);
      }
    }

    if (fssync.existsSync(pngSource)) {
      await copyIfNewer(pngSource, pngTarget);
    }
  }

  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }

  console.timeEnd('Atlas build');
  console.log(`✅ Atlas data written to ${atlasOutputPath}`);
  console.log(`✅ Atlas search index written to ${atlasSearchOutputPath}`);
  console.log(`✅ Atlas diagrams metadata written to ${atlasDiagramsOutputPath}`);
}

main().catch((error) => {
  console.error('❌ Failed to generate atlas assets:', error);
  process.exit(1);
});
