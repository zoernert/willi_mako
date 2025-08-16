import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { AuthenticatedRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';

const router = Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'problem-reports');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `problem-${uniqueId}${extension}`);
  }
});

// File filter to only allow images
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 5 // Max 5 files
  }
});

/**
 * Submit a general problem report with optional screenshots
 */
router.post('/submit', upload.array('screenshots', 5), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  console.log('Problem report request received');
  console.log('Content-Type:', req.get('Content-Type'));
  console.log('Files:', req.files);
  console.log('Body keys:', Object.keys(req.body || {}));
  console.log('Body:', req.body);
  
  const { problemDescription, category, currentPage, browserInfo, additionalInfo } = req.body;
  
  if (!problemDescription || problemDescription.trim().length === 0) {
    throw new AppError('Problembeschreibung ist erforderlich', 400);
  }

  if (!req.user?.email) {
    throw new AppError('Benutzer-E-Mail ist erforderlich', 401);
  }

  try {
    const uploadedFiles = req.files as Express.Multer.File[];
    const screenshots = uploadedFiles || [];
    
    // Validate uploaded files
    for (const file of screenshots) {
      if (!file.mimetype.startsWith('image/')) {
        throw new AppError('Nur Bilddateien sind als Screenshots erlaubt', 400);
      }
    }

    // Get user name (fallback to email if name not available)
    const userName = req.user.email;
    
    // Send problem report email
    await emailService.sendProblemReport({
      reporterEmail: req.user.email,
      reporterName: userName,
      problemDescription: problemDescription.trim(),
      category: category || 'Allgemein',
      currentPage: currentPage || 'Unbekannt',
      browserInfo: browserInfo || 'Nicht verfügbar',
      additionalInfo: additionalInfo?.trim() || null,
      screenshots: screenshots.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }))
    });

    res.json({
      success: true,
      message: 'Problembericht erfolgreich gesendet',
      screenshotsUploaded: screenshots.length
    });
  } catch (error) {
    console.error('Failed to send problem report:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      const uploadedFiles = req.files as Express.Multer.File[];
      for (const file of uploadedFiles) {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (cleanupError) {
          console.error('Error cleaning up file:', cleanupError);
        }
      }
    }
    
    throw new AppError('Fehler beim Senden des Problemberichts', 500);
  }
}));

/**
 * Get problem categories
 */
router.get('/categories', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const categories = [
    'Allgemein',
    'Chat-Funktionalität', 
    'Marktpartner-Suche',
    'FAQ-System',
    'Quiz-System',
    'Dokument-Upload',
    'Teams & Zusammenarbeit',
    'Benutzeroberfläche',
    'Performance',
    'Datenfehler',
    'Sonstiges'
  ];

  res.json({
    success: true,
    data: categories
  });
}));

export default router;
