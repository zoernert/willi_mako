"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const errorHandler_1 = require("../middleware/errorHandler");
const emailService_1 = require("../services/emailService");
const router = (0, express_1.Router)();
// Multer configuration for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(process.cwd(), 'uploads', 'problem-reports');
        // Create directory if it doesn't exist
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueId = (0, uuid_1.v4)();
        const extension = path_1.default.extname(file.originalname);
        cb(null, `problem-${uniqueId}${extension}`);
    }
});
// File filter to only allow images
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};
const upload = (0, multer_1.default)({
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
router.post('/submit', upload.array('screenshots', 5), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    var _a;
    const { problemDescription, category, currentPage, browserInfo, additionalInfo } = req.body;
    if (!problemDescription || problemDescription.trim().length === 0) {
        throw new errorHandler_1.AppError('Problembeschreibung ist erforderlich', 400);
    }
    if (!((_a = req.user) === null || _a === void 0 ? void 0 : _a.email)) {
        throw new errorHandler_1.AppError('Benutzer-E-Mail ist erforderlich', 401);
    }
    try {
        const uploadedFiles = req.files;
        const screenshots = uploadedFiles || [];
        // Validate uploaded files
        for (const file of screenshots) {
            if (!file.mimetype.startsWith('image/')) {
                throw new errorHandler_1.AppError('Nur Bilddateien sind als Screenshots erlaubt', 400);
            }
        }
        // Get user name (fallback to email if name not available)
        const userName = req.user.email;
        // Send problem report email
        await emailService_1.emailService.sendProblemReport({
            reporterEmail: req.user.email,
            reporterName: userName,
            problemDescription: problemDescription.trim(),
            category: category || 'Allgemein',
            currentPage: currentPage || 'Unbekannt',
            browserInfo: browserInfo || 'Nicht verfügbar',
            additionalInfo: (additionalInfo === null || additionalInfo === void 0 ? void 0 : additionalInfo.trim()) || null,
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
    }
    catch (error) {
        console.error('Failed to send problem report:', error);
        // Clean up uploaded files on error
        if (req.files) {
            const uploadedFiles = req.files;
            for (const file of uploadedFiles) {
                try {
                    if (fs_1.default.existsSync(file.path)) {
                        fs_1.default.unlinkSync(file.path);
                    }
                }
                catch (cleanupError) {
                    console.error('Error cleaning up file:', cleanupError);
                }
            }
        }
        throw new errorHandler_1.AppError('Fehler beim Senden des Problemberichts', 500);
    }
}));
/**
 * Get problem categories
 */
router.get('/categories', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
exports.default = router;
//# sourceMappingURL=problemReport.js.map