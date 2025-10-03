import type { ReactNode } from 'react';

export interface AtlasQdrantReference {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  score?: number;
  tags?: string[];
}

export interface AtlasProcessSummary {
  name: string;
  slug: string;
  summary?: string;
  relevantLaws: string[];
  keywords: string[];
}

export interface AtlasMessageUsage {
  messageType: string;
  messageVersion?: string;
  roleContext?: string;
  codesUsed: string[];
  isMandatory: boolean;
  citationSource?: string;
  description?: string;
  processes: AtlasProcessSummary[];
}

export interface AtlasElement {
  slug: string;
  edifactId: string;
  elementName: string;
  elementCode: string;
  segmentName: string;
  segmentGroup?: string | null;
  description: string;
  keywords: string[];
  processes: AtlasProcessSummary[];
  messages: AtlasMessageUsage[];
  qdrantReferences: AtlasQdrantReference[];
  diagramIds: string[];
  updatedAt: string;
}

export interface AtlasProcess {
  slug: string;
  name: string;
  triggerQuestion?: string;
  relevantLaws: string[];
  keywords: string[];
  summary?: string;
  description?: string;
  elements: string[];
  diagramIds: string[];
  qdrantReferences: AtlasQdrantReference[];
  messageTypes: string[];
  updatedAt: string;
}

export interface AtlasDiagram {
  id: string;
  slug: string;
  title: string;
  description?: string;
  elementSlug?: string;
  svgPath?: string;
  pngPath?: string;
  pdfPath?: string;
  pumlPath?: string;
  keywords: string[];
  relatedProcessSlugs: string[];
  source: string;
  updatedAt: string;
}

export interface AtlasDataPayload {
  generatedAt: string;
  elements: AtlasElement[];
  processes: AtlasProcess[];
  diagrams: AtlasDiagram[];
}

export interface AtlasSearchItem {
  id: string;
  type: 'element' | 'process' | 'diagram';
  title: string;
  subtitle?: string;
  description?: string;
  slug: string;
  url: string;
  keywords: string[];
  relatedIds?: string[];
}

export interface AtlasHeroCTA {
  href: string;
  label: string;
  description?: string;
  icon?: ReactNode;
}
