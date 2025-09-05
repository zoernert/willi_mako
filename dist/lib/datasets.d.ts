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
    url?: string;
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
    id: string;
    page?: number;
    confidence?: number;
    indicators?: string[];
    headersCount?: number;
    rowsCount?: number;
    files?: {
        json?: string;
        csv?: string;
    };
}
export interface TablesManifest {
    tablesCount: number;
    tables: TablesManifestEntry[];
}
export declare function loadDatasets(): DatasetEntry[];
export declare function getAllDatasetSlugs(): string[];
export declare function findDatasetBySlug(slug: string): DatasetEntry | null;
export declare function loadTablesManifest(slug: string): TablesManifest | null;
export declare function getSampleTableJsonPath(slug: string, manifest: TablesManifest): string | null;
export interface TableData {
    headers: string[];
    rows: string[][];
}
export declare function loadFirstTableData(slug: string): TableData | null;
export declare function suggestDatasetsByKeywords(keywords: string[], limit?: number): DatasetEntry[];
export declare function suggestDatasetsFromText(text: string, extraKeywords?: string[], limit?: number): DatasetEntry[];
//# sourceMappingURL=datasets.d.ts.map