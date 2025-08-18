export interface TimelineExportData {
    timeline: {
        id: string;
        name: string;
        description?: string;
        created_at: string;
        is_active: boolean;
    };
    activities: Array<{
        id: string;
        feature_name: string;
        activity_type: string;
        title: string;
        content: string;
        processing_status: string;
        created_at: string;
        processed_at?: string;
        metadata?: any;
    }>;
    stats: {
        total_activities: number;
        features_used: number;
        first_activity: string;
        last_activity: string;
    };
    exported_at: string;
    exported_by: string;
}
export declare class TimelinePDFExportService {
    private generateHTML;
    generatePDF(data: TimelineExportData): Promise<Buffer>;
    exportTimelineToPDF(data: TimelineExportData): Promise<Buffer>;
}
//# sourceMappingURL=TimelinePDFExportService.d.ts.map