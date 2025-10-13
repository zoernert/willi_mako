import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Import routes
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import faqRoutes from './routes/faq';
import workspaceRoutes from './routes/workspace';
import notesRoutes from './routes/notes';
import documentsRoutes from './routes/documents';
import adminRoutes from './routes/admin';
import { messageAnalyzerRoutes } from './routes/message-analyzer';
import codesRoutes from './routes/codes';
import { teamRoutes } from './routes/teams';
import processRoutes from './routes/processes';
import { initializeCommunityRoutes } from './routes/community';
import { initializeCommunityAdminRoutes } from './routes/admin/community';
import publicCommunityRoutes from './routes/public-community';
import publicEdifactRoutes from './routes/public-edifact';
import m2cRolesRoutes from './routes/m2cRoles';
import bilateralClarificationsRoutes from './routes/bilateral-clarifications-simple';
import llmRoutes from './routes/llm';
import teamEmailConfigRoutes from './routes/team-email-config.js';
import bulkClarificationsRoutes from './routes/bulk-clarifications.js';
import crWmako001TestRoutes from './routes/cr-wmako-001-test.js';
import imapSchedulerRoutes from './routes/imap-scheduler.js';
import screenshotAnalysisRoutes from './routes/screenshot-analysis';
import problemReportRoutes from './routes/problemReport';
import { default as timelineRoutes } from './routes/timeline'; // Timeline-Routes
import timelineStatsRoutes from './routes/timeline-stats'; // Timeline-Stats-Routes
import timelineActivityRoutes from './routes/timeline-activity'; // Timeline-Activity-Capture-Routes
import adminConsultationSubmissionsRoutes from './routes/admin/consultation-submissions';
import publicMarketPartnersRoutes from './routes/public-market-partners';
import publicChatRoutes from './routes/public-chat';

// New Presentation Layer Routes
import userRoutesV2 from './presentation/http/routes/user.routes';
import quizRoutesV2 from './presentation/http/routes/quiz.routes';
import adminQuizRoutes from './presentation/http/routes/admin/quiz.routes';
import apiV2Router from './presentation/http/routes/api/v2';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Import database
import db from './config/database';

// Import services
import { QdrantService } from './services/qdrant';
import { CommunityQdrantService } from './services/CommunityQdrantService';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3009', 10);
const apiV2Env = process.env.API_V2_ENABLED;
const apiV2Enabled = apiV2Env === undefined ? true : apiV2Env === 'true';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for development
}));

// CORS configuration for development with Next.js
app.use(cors({
  origin: [
    'http://localhost:3003',  // Next.js Frontend
    'http://localhost:3000',  // Fallback
    'http://localhost:3002',  // Legacy App (falls separat)
    'https://stromhaltig.de'  // Production
  ],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100') // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware with error handling
app.use(compression());

// Debug middleware to log all requests
app.use('/api/', (req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body (pre-parse):', req.body);
  next();
});

// Custom JSON parsing with error handling (robust for chunked/proxied requests)
app.use('/api/', express.raw({ type: 'application/json', limit: '50mb' }), (req, res, next) => {
  const contentType = req.get('content-type') || '';
  if (!contentType.includes('application/json')) return next();

  try {
    const buf: any = req.body;
    if (!Buffer.isBuffer(buf) || (buf as Buffer).length === 0) {
      req.body = {};
      return next();
    }

    const bodyStr = (buf as Buffer).toString('utf8').trim();
    if (!bodyStr || bodyStr === '""') {
      req.body = {};
      return next();
    }

    try {
      req.body = JSON.parse(bodyStr);
    } catch (e: any) {
      return res.status(400).json({ success: false, error: { message: 'Invalid JSON in request body' } });
    }
  } catch (e) {
    req.body = {};
  }
  return next();
});

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Increase timeout for chat routes (default 90 seconds, configurable via CHAT_TIMEOUT_MS)
app.use('/api/chat', (req, res, next) => {
  const chatTimeoutMs = Number(process.env.CHAT_TIMEOUT_MS || '90000');
  try { req.setTimeout(chatTimeoutMs); } catch {}
  try { res.setTimeout(chatTimeoutMs); } catch {}
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check (before protected routes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
// Increase timeout for admin routes (default 90 seconds, configurable)
app.use('/api/admin', (req, res, next) => {
  const adminTimeoutMs = Number(process.env.ADMIN_FAQ_TIMEOUT_MS || process.env.CHAT_TIMEOUT_MS || '90000');
  try { req.setTimeout(adminTimeoutMs); } catch {}
  try { res.setTimeout(adminTimeoutMs); } catch {}
  next();
});
// Use new authentication routes instead of legacy auth routes
app.use('/api/auth', authRoutes); // Updated auth routes
app.use('/api/v2/user', userRoutesV2); // v2 user endpoints

// New v2 routes  
app.use('/api/v2/quiz', quizRoutesV2);
app.use('/api/admin/quizzes', adminQuizRoutes);

if (apiV2Enabled) {
  app.use('/api/v2', apiV2Router);
}

// Admin routes
// Admin routes (primary path)
app.use('/api/admin', adminRoutes);
// Admin moderation for consultation submissions
app.use('/api/admin/public-community', adminConsultationSubmissionsRoutes);
// Legacy compatibility: some legacy React admin components still call /admin/* without /api prefix
// Provide alias so older deployed frontend bundles keep working after backend refactors.
app.use('/admin', adminRoutes);

// Team routes  
app.use('/api/teams', teamRoutes);

// Process routes
app.use('/api/processes', processRoutes);

// Community routes (with feature flag protection)
app.use('/api/community', initializeCommunityRoutes(db));
app.use('/api/admin/community', initializeCommunityAdminRoutes(db));
app.use('/api/public/community', publicCommunityRoutes);
app.use('/api/public/edifact', publicEdifactRoutes);
app.use('/api/public/market-partners', publicMarketPartnersRoutes);
app.use('/api/public/chat', publicChatRoutes);
// Legacy compatibility alias for community admin endpoints
app.use('/admin/community', initializeCommunityAdminRoutes(db));

// Legacy routes (still active)
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api', faqRoutes); // Some FAQ routes are public
app.use('/api/workspace', workspaceRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/message-analyzer', authenticateToken, messageAnalyzerRoutes);
app.use('/api/v1/codes', authenticateToken, codesRoutes);
app.use('/api', m2cRolesRoutes);
app.use('/api/bilateral-clarifications', bilateralClarificationsRoutes);
app.use('/api/llm', llmRoutes);
app.use('/api/timelines', timelineRoutes); // Timeline API (mit 's' für REST-Konvention)
app.use('/api/timeline-stats', timelineStatsRoutes); // Timeline-Stats API
app.use('/api/timeline-activity', timelineActivityRoutes); // Timeline-Activity-Capture API

// Screenshot Analysis (public endpoint - no authentication required)
app.use('/api/analyze-screenshot', screenshotAnalysisRoutes);

// CR-WMAKO-001: New routes for email configuration and bulk clarifications
app.use('/api/team-email-config', authenticateToken, teamEmailConfigRoutes);
app.use('/api/bulk-clarifications', authenticateToken, bulkClarificationsRoutes);
app.use('/api/imap', imapSchedulerRoutes);
app.use('/api/cr-wmako-001', crWmako001TestRoutes);

// Problem Report routes
app.use('/api/problem-report', authenticateToken, problemReportRoutes);

// Engagement routes
import engagementRoutes from './routes/engagement';
app.use('/api/engagement', engagementRoutes);

// Error handling middleware
app.use(errorHandler);

// Initialize Qdrant collections
const initializeQdrantCollections = async () => {
  try {
    // Initialize the main Qdrant collection for FAQ/Chat
    await QdrantService.createCollection();
    console.log('✅ Main Qdrant collection initialized');

    // Initialize Community collection
    const communityQdrant = new CommunityQdrantService();
    console.log('✅ Community Qdrant collection initialized');
  } catch (error) {
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
    timelineProcessor.start();
    console.log('📈 Timeline background processor started');
  }
});

// Initialisiere API-Schlüssel-Manager (beim Server-Start)
import './services/googleAIKeyManager';

// Importiere den Timeline-Processor
import { timelineProcessor } from './workers/timelineProcessor';

export default app;
