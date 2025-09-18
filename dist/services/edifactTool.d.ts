export declare class EdifactTool {
    private analyzer?;
    private getAnalyzer;
    /** Analyze a (possibly complete) EDIFACT message and return a concise JSON. */
    analyzeMessage(message: string): Promise<{
        format: "EDIFACT" | "XML" | "TEXT" | "UNKNOWN";
        messageType: any;
        summary: string;
        segmentCount: any;
        hints: any;
        issues: any;
    }>;
    /** Explain a single EDIFACT segment or short fragment. */
    explainSegment(fragment: string): Promise<{
        likelyMessageType: any;
        summary: string;
        format: "EDIFACT" | "XML" | "TEXT" | "UNKNOWN";
    }>;
}
export declare const edifactTool: EdifactTool;
//# sourceMappingURL=edifactTool.d.ts.map