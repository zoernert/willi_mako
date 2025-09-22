"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const chat_1 = __importDefault(require("./routes/chat"));
const faq_1 = __importDefault(require("./routes/faq"));
const workspace_1 = __importDefault(require("./routes/workspace"));
const notes_1 = __importDefault(require("./routes/notes"));
const documents_1 = __importDefault(require("./routes/documents"));
const admin_1 = __importDefault(require("./routes/admin"));
const message_analyzer_1 = require("./routes/message-analyzer");
const codes_1 = __importDefault(require("./routes/codes"));
const teams_1 = require("./routes/teams");
const processes_1 = __importDefault(require("./routes/processes"));
const community_1 = require("./routes/community");
const community_2 = require("./routes/admin/community");
const public_community_1 = __importDefault(require("./routes/public-community"));
const public_edifact_1 = __importDefault(require("./routes/public-edifact"));
const m2cRoles_1 = __importDefault(require("./routes/m2cRoles"));
const bilateral_clarifications_simple_1 = __importDefault(require("./routes/bilateral-clarifications-simple"));
const llm_1 = __importDefault(require("./routes/llm"));
const team_email_config_js_1 = __importDefault(require("./routes/team-email-config.js"));
const bulk_clarifications_js_1 = __importDefault(require("./routes/bulk-clarifications.js"));
const cr_wmako_001_test_js_1 = __importDefault(require("./routes/cr-wmako-001-test.js"));
const imap_scheduler_js_1 = __importDefault(require("./routes/imap-scheduler.js"));
const screenshot_analysis_1 = __importDefault(require("./routes/screenshot-analysis"));
const problemReport_1 = __importDefault(require("./routes/problemReport"));
const timeline_1 = __importDefault(require("./routes/timeline")); // Timeline-Routes
const timeline_stats_1 = __importDefault(require("./routes/timeline-stats")); // Timeline-Stats-Routes
const timeline_activity_1 = __importDefault(require("./routes/timeline-activity")); // Timeline-Activity-Capture-Routes
const consultation_submissions_1 = __importDefault(require("./routes/admin/consultation-submissions"));
const public_market_partners_1 = __importDefault(require("./routes/public-market-partners"));
// New Presentation Layer Routes
const user_routes_1 = __importDefault(require("./presentation/http/routes/user.routes"));
const quiz_routes_1 = __importDefault(require("./presentation/http/routes/quiz.routes"));
const quiz_routes_2 = __importDefault(require("./presentation/http/routes/admin/quiz.routes"));
// Import middleware
const errorHandler_1 = require("./middleware/errorHandler");
const auth_2 = require("./middleware/auth");
// Import database
const database_1 = __importDefault(require("./config/database"));
// Import services
const qdrant_1 = require("./services/qdrant");
const CommunityQdrantService_1 = require("./services/CommunityQdrantService");
// Initialize environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = parseInt(process.env.PORT || '3009', 10);
// Security middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false // Allow inline scripts for development
}));
// CORS configuration for development with Next.js
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:3003', // Next.js Frontend
        'http://localhost:3000', // Fallback
        'http://localhost:3002', // Legacy App (falls separat)
        'https://stromhaltig.de' // Production
    ],
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '100') // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);
// Body parsing middleware with error handling
app.use((0, compression_1.default)());
// Debug middleware to log all requests
app.use('/api/', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body (pre-parse):', req.body);
    next();
});
// Custom JSON parsing with error handling (robust for chunked/proxied requests)
app.use('/api/', express_1.default.raw({ type: 'application/json', limit: '50mb' }), (req, res, next) => {
    const contentType = req.get('content-type') || '';
    if (!contentType.includes('application/json'))
        return next();
    try {
        const buf = req.body;
        if (!Buffer.isBuffer(buf) || buf.length === 0) {
            req.body = {};
            return next();
        }
        const bodyStr = buf.toString('utf8').trim();
        if (!bodyStr || bodyStr === '""') {
            req.body = {};
            return next();
        }
        try {
            req.body = JSON.parse(bodyStr);
        }
        catch (e) {
            return res.status(400).json({ success: false, error: { message: 'Invalid JSON in request body' } });
        }
    }
    catch (e) {
        req.body = {};
    }
    return next();
});
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Increase timeout for chat routes (default 90 seconds, configurable via CHAT_TIMEOUT_MS)
app.use('/api/chat', (req, res, next) => {
    const chatTimeoutMs = Number(process.env.CHAT_TIMEOUT_MS || '90000');
    try {
        req.setTimeout(chatTimeoutMs);
    }
    catch (_a) { }
    try {
        res.setTimeout(chatTimeoutMs);
    }
    catch (_b) { }
    next();
});
// Static files
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Health check (before protected routes)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Routes
// Increase timeout for admin routes (default 90 seconds, configurable)
app.use('/api/admin', (req, res, next) => {
    const adminTimeoutMs = Number(process.env.ADMIN_FAQ_TIMEOUT_MS || process.env.CHAT_TIMEOUT_MS || '90000');
    try {
        req.setTimeout(adminTimeoutMs);
    }
    catch (_a) { }
    try {
        res.setTimeout(adminTimeoutMs);
    }
    catch (_b) { }
    next();
});
// Use new authentication routes instead of legacy auth routes
app.use('/api/auth', auth_1.default); // Updated auth routes
app.use('/api/v2/user', user_routes_1.default); // v2 user endpoints
// New v2 routes  
app.use('/api/v2/quiz', quiz_routes_1.default);
app.use('/api/admin/quizzes', quiz_routes_2.default);
// Admin routes
// Admin routes (primary path)
app.use('/api/admin', admin_1.default);
// Admin moderation for consultation submissions
app.use('/api/admin/public-community', consultation_submissions_1.default);
// Legacy compatibility: some legacy React admin components still call /admin/* without /api prefix
// Provide alias so older deployed frontend bundles keep working after backend refactors.
app.use('/admin', admin_1.default);
// Team routes  
app.use('/api/teams', teams_1.teamRoutes);
// Process routes
app.use('/api/processes', processes_1.default);
// Community routes (with feature flag protection)
app.use('/api/community', (0, community_1.initializeCommunityRoutes)(database_1.default));
app.use('/api/admin/community', (0, community_2.initializeCommunityAdminRoutes)(database_1.default));
app.use('/api/public/community', public_community_1.default);
app.use('/api/public/edifact', public_edifact_1.default);
app.use('/api/public/market-partners', public_market_partners_1.default);
// Legacy compatibility alias for community admin endpoints
app.use('/admin/community', (0, community_2.initializeCommunityAdminRoutes)(database_1.default));
// Legacy routes (still active)
app.use('/api/chat', auth_2.authenticateToken, chat_1.default);
app.use('/api', faq_1.default); // Some FAQ routes are public
app.use('/api/workspace', workspace_1.default);
app.use('/api/notes', notes_1.default);
app.use('/api/documents', documents_1.default);
app.use('/api/message-analyzer', auth_2.authenticateToken, message_analyzer_1.messageAnalyzerRoutes);
app.use('/api/v1/codes', auth_2.authenticateToken, codes_1.default);
app.use('/api', m2cRoles_1.default);
app.use('/api/bilateral-clarifications', bilateral_clarifications_simple_1.default);
app.use('/api/llm', llm_1.default);
app.use('/api/timelines', timeline_1.default); // Timeline API (mit 's' für REST-Konvention)
app.use('/api/timeline-stats', timeline_stats_1.default); // Timeline-Stats API
app.use('/api/timeline-activity', timeline_activity_1.default); // Timeline-Activity-Capture API
// Screenshot Analysis (public endpoint - no authentication required)
app.use('/api/analyze-screenshot', screenshot_analysis_1.default);
// CR-WMAKO-001: New routes for email configuration and bulk clarifications
app.use('/api/team-email-config', auth_2.authenticateToken, team_email_config_js_1.default);
app.use('/api/bulk-clarifications', auth_2.authenticateToken, bulk_clarifications_js_1.default);
app.use('/api/imap', imap_scheduler_js_1.default);
app.use('/api/cr-wmako-001', cr_wmako_001_test_js_1.default);
// Problem Report routes
app.use('/api/problem-report', auth_2.authenticateToken, problemReport_1.default);
// Engagement routes
const engagement_1 = __importDefault(require("./routes/engagement"));
app.use('/api/engagement', engagement_1.default);
// Error handling middleware
app.use(errorHandler_1.errorHandler);
// Initialize Qdrant collections
const initializeQdrantCollections = async () => {
    try {
        // Initialize the main Qdrant collection for FAQ/Chat
        await qdrant_1.QdrantService.createCollection();
        console.log('✅ Main Qdrant collection initialized');
        // Initialize Community collection
        const communityQdrant = new CommunityQdrantService_1.CommunityQdrantService();
        console.log('✅ Community Qdrant collection initialized');
    }
    catch (error) {
        console.error('❌ Error initializing Qdrant collections:', error);
    }
};
// Start server - auf allen Interfaces für internen Gebrauch
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔗 Environment: ${process.env.NODE_ENV}`);
    console.log(`⚠️  Server is bound to all interfaces for internal access`);
    // Initialize Qdrant collections after server starts
    await initializeQdrantCollections();
    // Starte Timeline Background Processor
    if (process.env.NODE_ENV !== 'test') {
        timelineProcessor_1.timelineProcessor.start();
        console.log('📈 Timeline background processor started');
    }
});
// Initialisiere API-Schlüssel-Manager (beim Server-Start)
require("./services/googleAIKeyManager");
// Importiere den Timeline-Processor
const timelineProcessor_1 = require("./workers/timelineProcessor");
exports.default = app;
//# sourceMappingURL=server.js.map