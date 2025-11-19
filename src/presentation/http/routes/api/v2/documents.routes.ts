import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { authenticateToken, AuthenticatedRequest } from '../../../../../middleware/auth';
import { asyncHandler, AppError } from '../../../../../middleware/errorHandler';
import { DocumentService } from '../../../../../services/documentService';
import { WorkspaceService } from '../../../../../services/workspaceService';
import { singleDocumentUploadLimiter, batchDocumentUploadLimiter } from '../../../../../middleware/documentUploadLimiter';

const router = Router();
const documentService = new DocumentService();
const workspaceService = new WorkspaceService();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/user-documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ];
  const allowedExtensions = ['.pdf', '.docx', '.txt', '.md'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new AppError('Unsupported file type. Allowed: PDF, DOCX, TXT, MD', 400));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '50', 10) * 1024 * 1024 // Default 50MB
  }
});

/**
 * POST /api/v2/documents/upload
 * Upload a single document
 */
router.post(
  '/upload',
  authenticateToken,
  singleDocumentUploadLimiter,
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { title, description, tags, is_ai_context_enabled } = req.body;

    // Parse tags if provided as string
    let parsedTags: string[] = [];
    if (tags) {
      try {
        parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      } catch {
        parsedTags = typeof tags === 'string' ? [tags] : [];
      }
    }

    const document = await documentService.createDocument(userId, {
      file: req.file,
      title: title || req.file.originalname,
      description,
      tags: parsedTags,
      is_ai_context_enabled: is_ai_context_enabled === 'true' || is_ai_context_enabled === true,
    });

    // Asynchronously process and index the document
    documentService.processAndIndexDocument(document.id, userId).catch(err => {
      console.error('Background document processing failed:', err);
    });

    res.status(201).json({
      success: true,
      data: {
        document,
        message: 'Document uploaded successfully. Processing has started.'
      }
    });
  })
);

/**
 * POST /api/v2/documents/upload-multiple
 * Upload multiple documents
 */
router.post(
  '/upload-multiple',
  authenticateToken,
  batchDocumentUploadLimiter,
  upload.array('files', 10),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      throw new AppError('No files uploaded', 400);
    }

    const { is_ai_context_enabled } = req.body;

    const documents = await Promise.all(
      files.map(file =>
        documentService.createDocument(userId, {
          file,
          title: file.originalname,
          is_ai_context_enabled: is_ai_context_enabled === 'true' || is_ai_context_enabled === true,
        })
      )
    );

    // Asynchronously process and index each document
    documents.forEach((doc: any) => {
      documentService.processAndIndexDocument(doc.id, userId).catch(err => {
        console.error(`Background processing failed for document ${doc.id}:`, err);
      });
    });

    res.status(201).json({
      success: true,
      data: {
        documents,
        message: `${documents.length} document${documents.length > 1 ? 's' : ''} uploaded successfully. Processing has started.`
      }
    });
  })
);

/**
 * GET /api/v2/documents
 * Get all documents for the user
 */
router.get(
  '/',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { page = '1', limit = '12', search, processed } = req.query;

    const documents = await documentService.getUserDocuments(userId, {
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
      search: search as string,
      processed: processed ? (processed as string) === 'true' : undefined,
    });

    res.json({
      success: true,
      data: documents
    });
  })
);

/**
 * GET /api/v2/documents/:id
 * Get a single document by ID
 */
router.get(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const document = await documentService.getDocumentById(req.params.id, userId);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    res.json({
      success: true,
      data: document
    });
  })
);

/**
 * PUT /api/v2/documents/:id
 * Update document metadata
 */
router.put(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const document = await documentService.updateDocument(req.params.id, userId, req.body);
    
    res.json({
      success: true,
      data: document
    });
  })
);

/**
 * DELETE /api/v2/documents/:id
 * Delete a document
 */
router.delete(
  '/:id',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    await documentService.deleteDocument(req.params.id, userId);
    
    res.status(204).send();
  })
);

/**
 * GET /api/v2/documents/:id/download
 * Download a document
 */
router.get(
  '/:id/download',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const document = await documentService.getDocumentById(req.params.id, userId);
    if (!document || !document.file_path) {
      throw new AppError('Document not found', 404);
    }

    res.download(path.resolve(document.file_path), document.original_name);
  })
);

/**
 * POST /api/v2/documents/:id/reprocess
 * Reprocess a document
 */
router.post(
  '/:id/reprocess',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    await documentService.processAndIndexDocument(req.params.id, userId);
    
    res.json({
      success: true,
      data: {
        message: 'Document reprocessing started.'
      }
    });
  })
);

/**
 * POST /api/v2/documents/:id/ai-context
 * Toggle AI context for a document
 */
router.post(
  '/:id/ai-context',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new AppError('User not authenticated', 401);
    }

    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      throw new AppError('enabled must be a boolean', 400);
    }

    const document = await documentService.updateDocument(req.params.id, userId, { 
      is_ai_context_enabled: enabled 
    });
    
    res.json({
      success: true,
      data: document
    });
  })
);

export default router;
