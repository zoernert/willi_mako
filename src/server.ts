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
import m2cRolesRoutes from './routes/m2cRoles';
import bilateralClarificationsRoutes from './routes/bilateral-clarifications-simple';

// New Presentation Layer Routes
import userRoutesV2 from './presentation/http/routes/user.routes';
import quizRoutesV2 from './presentation/http/routes/quiz.routes';
import adminQuizRoutes from './presentation/http/routes/admin/quiz.routes';

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

// Custom JSON parsing with error handling
app.use('/api/', express.raw({ type: 'application/json', limit: '50mb' }), (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const contentType = req.get('content-type');
  
  // Handle empty or minimal JSON bodies
  if (contentType && contentType.includes('application/json')) {
    if (contentLength <= 2) {
      console.log('Detected empty/minimal JSON body, content-length:', contentLength, 'body:', req.body?.toString());
      req.body = {};
      return next();
    }
    
    try {
      const bodyStr = req.body.toString();
      console.log('Parsing JSON body:', bodyStr);
      
      // Handle empty quotes or just whitespace
      if (bodyStr === '""' || bodyStr.trim() === '') {
        console.log('Empty quotes or whitespace detected, setting body to {}');
        req.body = {};
      } else {
        req.body = JSON.parse(bodyStr);
      }
    } catch (err) {
      console.error('JSON parsing error:', err.message);
      console.error('Raw body:', req.body?.toString());
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid JSON in request body: ' + err.message }
      });
    }
  }
  
  next();
});

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Increase timeout for chat routes (45 seconds)
app.use('/api/chat', (req, res, next) => {
  req.setTimeout(45000);
  res.setTimeout(45000);
  next();
});

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check (before protected routes)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
// Use new authentication routes instead of legacy auth routes
app.use('/api/auth', authRoutes); // Updated auth routes
app.use('/api/v2/user', userRoutesV2); // v2 user endpoints

// New v2 routes  
app.use('/api/v2/quiz', quizRoutesV2);
app.use('/api/admin/quizzes', adminQuizRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Team routes  
app.use('/api/teams', teamRoutes);

// Process routes
app.use('/api/processes', processRoutes);

// Community routes (with feature flag protection)
app.use('/api/community', initializeCommunityRoutes(db));
app.use('/api/admin/community', initializeCommunityAdminRoutes(db));

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
});

export default app;
