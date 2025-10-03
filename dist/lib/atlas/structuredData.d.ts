import type { AtlasDiagram, AtlasElement, AtlasProcess } from './types';
export declare const createBreadcrumbStructuredData: (items: Array<{
    name: string;
    url: string;
}>) => {
    '@context': string;
    '@type': string;
    itemListElement: {
        '@type': string;
        position: number;
        name: string;
        item: string;
    }[];
};
export declare const createAtlasElementStructuredData: (element: AtlasElement) => {
    '@context': string;
    '@type': string;
    name: string;
    description: string;
    url: string;
    inLanguage: string;
    keywords: string[];
    dateModified: string;
    about: {
        '@type': string;
        name: string;
        url: string;
    }[];
};
export declare const createAtlasProcessStructuredData: (process: AtlasProcess) => {
    '@context': string;
    '@type': string;
    name: string;
    description: string;
    url: string;
    inLanguage: string;
    keywords: string[];
    dateModified: string;
    mentions: {
        '@type': string;
        name: string;
        url: string;
    }[];
};
export declare const createAtlasDiagramStructuredData: (diagram: AtlasDiagram) => {
    '@context': string;
    '@type': string;
    name: string;
    url: string;
    inLanguage: string;
    encodingFormat: string;
    fileFormat: string;
    dateModified: string;
    keywords: string[];
};
export declare const createAtlasLandingStructuredData: () => {
    '@context': string;
    '@type': string;
    name: string;
    description: string;
    url: string;
    inLanguage: string;
};
//# sourceMappingURL=structuredData.d.ts.map