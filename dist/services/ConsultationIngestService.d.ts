type IngestItem = {
    id?: string | number;
    text: string;
    source: string;
    meta?: Record<string, any>;
};
export declare class ConsultationIngestService {
    private client;
    private collection;
    private dim;
    constructor(collectionBase?: string);
    ensureCollection(): Promise<void>;
    ingestText(items: IngestItem[]): Promise<void>;
    ingestPdf(filePath: string, source: string, opts?: {
        maxChunk?: number;
    }): Promise<void>;
    ingestUrls(urls: string[], fetcher: (url: string) => Promise<string>): Promise<void>;
    private chunk;
}
export {};
//# sourceMappingURL=ConsultationIngestService.d.ts.map