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

// New Presentation Layer Routes
import userRoutesV2 from './presentation/http/routes/user.routes';
import quizRoutesV2 from './presentation/http/routes/quiz.routes';
import adminQuizRoutes from './presentation/http/routes/admin/quiz.routes';

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';

// Import database
import db from './config/database';

// Initialize environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Allow inline scripts for development
}));

// Simplified CORS for single-port setup
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '15') * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX || '100') // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

// Legacy routes (still active)
app.use('/api/chat', authenticateToken, chatRoutes);
app.use('/api', faqRoutes); // Some FAQ routes are public
app.use('/api/workspace', workspaceRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/message-analyzer', authenticateToken, messageAnalyzerRoutes);
app.use('/api/v1/codes', authenticateToken, codesRoutes);

// Serve React app
const clientBuildPath = path.join(__dirname, '../client/build');
app.use(express.static(clientBuildPath));

// Serve React app for all other routes (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV}`);
});

export default app;
