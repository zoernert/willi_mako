"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimelinePDFExportService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
class TimelinePDFExportService {
    generateHTML(data) {
        const formatDate = (dateString) => {
            return new Date(dateString).toLocaleString('de-DE', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        };
        const getStatusColor = (status) => {
            switch (status) {
                case 'completed': return '#4caf50';
                case 'pending': return '#ff9800';
                case 'processing': return '#2196f3';
                case 'failed': return '#f44336';
                default: return '#757575';
            }
        };
        const getStatusText = (status) => {
            switch (status) {
                case 'completed': return 'Abgeschlossen';
                case 'pending': return 'Ausstehend';
                case 'processing': return 'In Bearbeitung';
                case 'failed': return 'Fehlgeschlagen';
                default: return status;
            }
        };
        const getFeatureName = (feature) => {
            const featureNames = {
                'chat': 'Chat',
                'code-lookup': 'Code-Lookup',
                'bilateral-clarifications': 'Bilaterale Klärung',
                'screenshot-analysis': 'Screenshot-Analyse',
                'message-analyzer': 'Nachrichten-Analyse',
                'notes': 'Notizen',
                'marktpartner-search': 'Marktpartner-Suche'
            };
            return featureNames[feature] || feature;
        };
        return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Timeline Export - ${data.timeline.name}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            border-bottom: 3px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        
        .logo {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .logo h1 {
            color: #1976d2;
            font-size: 2.5em;
            margin-left: 10px;
        }
        
        .timeline-info {
            background: #f5f5f5;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        
        .timeline-title {
            font-size: 1.8em;
            color: #1976d2;
            margin-bottom: 10px;
        }
        
        .timeline-meta {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 15px;
        }
        
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        
        .meta-label {
            font-weight: bold;
            color: #666;
            font-size: 0.9em;
        }
        
        .meta-value {
            color: #333;
            margin-top: 2px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        
        .stat-card {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #1976d2;
        }
        
        .stat-label {
            color: #666;
            margin-top: 5px;
        }
        
        .activities-section {
            margin-top: 40px;
        }
        
        .section-title {
            font-size: 1.5em;
            color: #333;
            margin-bottom: 20px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 10px;
        }
        
        .activity {
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            page-break-inside: avoid;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        
        .activity-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        
        .activity-title {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
            flex: 1;
            margin-right: 20px;
        }
        
        .activity-meta {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 5px;
        }
        
        .feature-badge {
            background: #1976d2;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            white-space: nowrap;
        }
        
        .status-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: bold;
            color: white;
        }
        
        .activity-date {
            color: #666;
            font-size: 0.9em;
        }
        
        .activity-content {
            color: #555;
            line-height: 1.6;
            margin-top: 15px;
            white-space: pre-wrap;
        }
        
        .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            .activity {
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">
            <h1>Willi-Mako Timeline Export</h1>
        </div>
    </div>
    
    <div class="timeline-info">
        <h2 class="timeline-title">${data.timeline.name}</h2>
        ${data.timeline.description ? `<p style="color: #666; margin-top: 10px;">${data.timeline.description}</p>` : ''}
        
        <div class="timeline-meta">
            <div class="meta-item">
                <span class="meta-label">Timeline ID</span>
                <span class="meta-value">${data.timeline.id}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Erstellt am</span>
                <span class="meta-value">${formatDate(data.timeline.created_at)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Status</span>
                <span class="meta-value">${data.timeline.is_active ? 'Aktiv' : 'Inaktiv'}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Exportiert am</span>
                <span class="meta-value">${formatDate(data.exported_at)}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Exportiert von</span>
                <span class="meta-value">${data.exported_by}</span>
            </div>
        </div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-number">${data.stats.total_activities}</div>
            <div class="stat-label">Aktivitäten</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.stats.features_used}</div>
            <div class="stat-label">Features verwendet</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.activities.filter(a => a.processing_status === 'completed').length}</div>
            <div class="stat-label">Abgeschlossen</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${data.activities.filter(a => a.processing_status === 'pending').length}</div>
            <div class="stat-label">Ausstehend</div>
        </div>
    </div>
    
    <div class="activities-section">
        <h2 class="section-title">Aktivitäten (${data.activities.length})</h2>
        
        ${data.activities.map(activity => `
            <div class="activity">
                <div class="activity-header">
                    <h3 class="activity-title">${activity.title}</h3>
                    <div class="activity-meta">
                        <span class="feature-badge">${getFeatureName(activity.feature_name)}</span>
                        <span class="status-badge" style="background-color: ${getStatusColor(activity.processing_status)}">
                            ${getStatusText(activity.processing_status)}
                        </span>
                        <span class="activity-date">${formatDate(activity.created_at)}</span>
                        ${activity.processed_at ? `<span class="activity-date">Verarbeitet: ${formatDate(activity.processed_at)}</span>` : ''}
                    </div>
                </div>
                <div class="activity-content">${activity.content}</div>
            </div>
        `).join('')}
    </div>
    
    <div class="footer">
        <p>Erstellt mit Willi-Mako Timeline System • ${formatDate(data.exported_at)}</p>
        <p>Vertraulich - Nur für internen Gebrauch bestimmt</p>
    </div>
</body>
</html>
    `;
    }
    async generatePDF(data) {
        let browser;
        try {
            browser = await puppeteer_1.default.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            const page = await browser.newPage();
            // Set content and wait for it to load
            const html = this.generateHTML(data);
            await page.setContent(html, { waitUntil: 'networkidle0' });
            // Generate PDF
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20mm',
                    right: '15mm',
                    bottom: '20mm',
                    left: '15mm'
                }
            });
            return pdfBuffer;
        }
        catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        }
        finally {
            if (browser) {
                await browser.close();
            }
        }
    }
    async exportTimelineToPDF(data) {
        return this.generatePDF(data);
    }
}
exports.TimelinePDFExportService = TimelinePDFExportService;
//# sourceMappingURL=TimelinePDFExportService.js.map