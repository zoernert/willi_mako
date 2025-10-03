import type { AtlasDataPayload, AtlasDiagram, AtlasElement, AtlasProcess, AtlasSearchItem } from './types';
export declare const loadAtlasData: () => AtlasDataPayload;
export declare const loadAtlasSearchIndex: () => AtlasSearchItem[];
export declare const getAtlasElements: () => AtlasElement[];
export declare const getAtlasProcesses: () => AtlasProcess[];
export declare const getAtlasDiagrams: () => AtlasDiagram[];
export declare const getAtlasElementBySlug: (slug: string) => AtlasElement | undefined;
export declare const getAtlasProcessBySlug: (slug: string) => AtlasProcess | undefined;
export declare const getAtlasDiagramBySlug: (slug: string) => AtlasDiagram | undefined;
export declare const getAtlasDiagramById: (id: string) => AtlasDiagram | undefined;
export declare const resetAtlasCache: () => void;
//# sourceMappingURL=data.d.ts.map