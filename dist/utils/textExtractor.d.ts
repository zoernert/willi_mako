interface TextExtractor {
    extract(filePath: string): Promise<string>;
}
export declare function getTextExtractor(mimeType: string): TextExtractor;
export {};
//# sourceMappingURL=textExtractor.d.ts.map