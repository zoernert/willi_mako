"use strict";
// Express Router für Bilaterale Klärfälle API
// Erstellt: 12. August 2025
// Beschreibung: REST API Endpoints für das Bilateral Clarification System
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
// Import existing middleware (assuming they exist)
const auth_1 = require("../middleware/auth");
// import { validateClarification, validateNote, validateComment } from '../middleware/validation';
const logger_1 = require("../utils/logger");
const database_1 = __importDefault(require("../config/database")); // Use the central database connection
const router = express_1.default.Router();
// Multer Setup für File Uploads
const storage = multer_1.default.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../uploads/clarifications');
        await fs_1.promises.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path_1.default.extname(file.originalname);
        cb(null, `clarification-${uniqueSuffix}${extension}`);
    }
});
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 5 // Max 5 files per request
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|xml|eml/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Nur Bild-, PDF-, Office- und Email-Dateien sind erlaubt!'));
        }
    }
});
// Utility Functions
const formatClarification = (row) => {
    var _a, _b, _c, _d, _e;
    return ({
        id: row.id,
        title: row.title,
        description: row.description,
        marketPartnerCode: row.market_partner_code,
        marketPartnerName: row.market_partner_name,
        caseType: row.case_type,
        status: row.status,
        priority: row.priority,
        createdBy: row.created_by,
        assignedTo: row.assigned_to,
        createdAt: (_a = row.created_at) === null || _a === void 0 ? void 0 : _a.toISOString(),
        updatedAt: (_b = row.updated_at) === null || _b === void 0 ? void 0 : _b.toISOString(),
        dueDate: (_c = row.due_date) === null || _c === void 0 ? void 0 : _c.toISOString(),
        resolutionDate: (_d = row.resolution_date) === null || _d === void 0 ? void 0 : _d.toISOString(),
        resolutionNotes: row.resolution_notes,
        tags: row.tags || [],
        sharedWithTeam: row.shared_with_team,
        teamId: row.team_id,
        externalCaseId: row.external_case_id,
        sourceSystem: row.source_system,
        version: row.version,
        lastModifiedBy: row.last_modified_by,
        archived: row.archived,
        archivedAt: (_e = row.archived_at) === null || _e === void 0 ? void 0 : _e.toISOString(),
        // Computed fields
        isOverdue: row.due_date && new Date(row.due_date) < new Date() && row.status !== 'CLOSED' && row.status !== 'RESOLVED',
        daysSinceCreated: Math.floor((new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))
    });
};
// GET /api/bilateral-clarifications
// Retrieve clarifications with filtering, sorting, and pagination
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { status, caseType, priority, assignedTo, createdBy, marketPartner, tags, sharedWithTeam, search, isOverdue, hasAttachments, dateRangeStart, dateRangeEnd, sortField = 'createdAt', sortDirection = 'desc', page = 1, limit = 20 } = req.query;
        let query = `
      SELECT bc.*, 
             u1.name as created_by_name, 
             u2.name as assigned_to_name,
             t.name as team_name,
             COUNT(ca.id) as attachment_count,
             COUNT(cn.id) as note_count,
             COUNT(ctc.id) as comment_count
      FROM bilateral_clarifications bc
      LEFT JOIN users u1 ON bc.created_by = u1.id
      LEFT JOIN users u2 ON bc.assigned_to = u2.id
      LEFT JOIN teams t ON bc.team_id = t.id
      LEFT JOIN clarification_attachments ca ON bc.id = ca.clarification_id AND ca.archived = false
      LEFT JOIN clarification_notes cn ON bc.id = cn.clarification_id AND cn.archived = false
      LEFT JOIN clarification_team_comments ctc ON bc.id = ctc.clarification_id AND ctc.archived = false
      WHERE bc.archived = false 
        AND (bc.created_by = $1 OR bc.assigned_to = $1 OR 
             (bc.shared_with_team = true AND bc.team_id = $2))
    `;
        const queryParams = [req.user.id, req.user.teamId];
        let paramCounter = 3;
        // Add filters
        if (status && Array.isArray(status)) {
            query += ` AND bc.status = ANY($${paramCounter})`;
            queryParams.push(status);
            paramCounter++;
        }
        if (caseType && Array.isArray(caseType)) {
            query += ` AND bc.case_type = ANY($${paramCounter})`;
            queryParams.push(caseType);
            paramCounter++;
        }
        if (priority && Array.isArray(priority)) {
            query += ` AND bc.priority = ANY($${paramCounter})`;
            queryParams.push(priority);
            paramCounter++;
        }
        if (assignedTo) {
            query += ` AND bc.assigned_to = $${paramCounter}`;
            queryParams.push(assignedTo);
            paramCounter++;
        }
        if (createdBy) {
            query += ` AND bc.created_by = $${paramCounter}`;
            queryParams.push(createdBy);
            paramCounter++;
        }
        if (marketPartner) {
            query += ` AND (bc.market_partner_code ILIKE $${paramCounter} OR bc.market_partner_name ILIKE $${paramCounter})`;
            queryParams.push(`%${marketPartner}%`);
            paramCounter++;
        }
        if (tags && Array.isArray(tags)) {
            query += ` AND bc.tags && $${paramCounter}`;
            queryParams.push(tags);
            paramCounter++;
        }
        if (sharedWithTeam !== undefined) {
            query += ` AND bc.shared_with_team = $${paramCounter}`;
            queryParams.push(sharedWithTeam === 'true');
            paramCounter++;
        }
        if (search) {
            query += ` AND (bc.title ILIKE $${paramCounter} OR bc.description ILIKE $${paramCounter})`;
            queryParams.push(`%${search}%`);
            paramCounter++;
        }
        if (dateRangeStart) {
            query += ` AND bc.created_at >= $${paramCounter}`;
            queryParams.push(dateRangeStart);
            paramCounter++;
        }
        if (dateRangeEnd) {
            query += ` AND bc.created_at <= $${paramCounter}`;
            queryParams.push(dateRangeEnd);
            paramCounter++;
        }
        if (isOverdue === 'true') {
            query += ` AND bc.due_date < NOW() AND bc.status NOT IN ('CLOSED', 'RESOLVED')`;
        }
        // GROUP BY for aggregated counts
        query += ` GROUP BY bc.id, u1.name, u2.name, t.name`;
        if (hasAttachments === 'true') {
            query += ` HAVING COUNT(ca.id) > 0`;
        }
        else if (hasAttachments === 'false') {
            query += ` HAVING COUNT(ca.id) = 0`;
        }
        // Add sorting
        const allowedSortFields = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'status', 'title'];
        const sortColumn = allowedSortFields.includes(sortField) ?
            (sortField === 'createdAt' ? 'bc.created_at' :
                sortField === 'updatedAt' ? 'bc.updated_at' :
                    sortField === 'dueDate' ? 'bc.due_date' :
                        sortField === 'priority' ? 'bc.priority' :
                            sortField === 'status' ? 'bc.status' : 'bc.title') : 'bc.created_at';
        const direction = sortDirection === 'asc' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortColumn} ${direction}`;
        // Add pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
        queryParams.push(limit, offset);
        const result = await database_1.default.query(query, queryParams);
        // Get total count for pagination
        let countQuery = `
      SELECT COUNT(DISTINCT bc.id) as total
      FROM bilateral_clarifications bc
      LEFT JOIN clarification_attachments ca ON bc.id = ca.clarification_id AND ca.archived = false
      WHERE bc.archived = false 
        AND (bc.created_by = $1 OR bc.assigned_to = $1 OR 
             (bc.shared_with_team = true AND bc.team_id = $2))
    `;
        // Apply same filters for count (simplified version)
        const countResult = await database_1.default.query(countQuery, [req.user.id, req.user.teamId]);
        const total = parseInt(countResult.rows[0].total);
        // Get summary stats
        const summaryQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'OPEN') as total_open,
        COUNT(*) FILTER (WHERE status = 'IN_PROGRESS') as total_in_progress,
        COUNT(*) FILTER (WHERE status = 'RESOLVED') as total_resolved,
        COUNT(*) FILTER (WHERE status = 'CLOSED') as total_closed,
        COUNT(*) FILTER (WHERE due_date < NOW() AND status NOT IN ('CLOSED', 'RESOLVED')) as overdue_cases,
        COUNT(*) FILTER (WHERE priority IN ('HIGH', 'CRITICAL')) as high_priority_cases
      FROM bilateral_clarifications 
      WHERE archived = false 
        AND (created_by = $1 OR assigned_to = $1 OR 
             (shared_with_team = true AND team_id = $2))
    `;
        const summaryResult = await database_1.default.query(summaryQuery, [req.user.id, req.user.teamId]);
        const clarifications = result.rows.map(row => ({
            ...formatClarification(row),
            attachmentCount: parseInt(row.attachment_count) || 0,
            noteCount: parseInt(row.note_count) || 0,
            commentCount: parseInt(row.comment_count) || 0,
            createdByName: row.created_by_name,
            assignedToName: row.assigned_to_name,
            teamName: row.team_name
        }));
        res.json({
            clarifications,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / limit)
            },
            summary: {
                totalOpen: parseInt(summaryResult.rows[0].total_open) || 0,
                totalInProgress: parseInt(summaryResult.rows[0].total_in_progress) || 0,
                totalResolved: parseInt(summaryResult.rows[0].total_resolved) || 0,
                totalClosed: parseInt(summaryResult.rows[0].total_closed) || 0,
                overdueCases: parseInt(summaryResult.rows[0].overdue_cases) || 0,
                highPriorityCases: parseInt(summaryResult.rows[0].high_priority_cases) || 0
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching clarifications:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Klärfälle',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// GET /api/bilateral-clarifications/:id
// Get single clarification with all related data
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check access permissions
        const accessQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND archived = false
        AND (created_by = $2 OR assigned_to = $2 OR 
             (shared_with_team = true AND team_id = $3))
    `;
        const accessResult = await database_1.default.query(accessQuery, [id, req.user.id, req.user.teamId]);
        if (accessResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }
        const clarification = formatClarification(accessResult.rows[0]);
        // Get attachments
        const attachmentsQuery = `
      SELECT ca.*, u.name as uploader_name
      FROM clarification_attachments ca
      LEFT JOIN users u ON ca.uploaded_by = u.id
      WHERE ca.clarification_id = $1 AND ca.archived = false
      ORDER BY ca.uploaded_at DESC
    `;
        const attachmentsResult = await database_1.default.query(attachmentsQuery, [id]);
        // Get notes
        const notesQuery = `
      SELECT cn.*, u.name as author_name
      FROM clarification_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      WHERE cn.clarification_id = $1 AND cn.archived = false
      ORDER BY cn.created_at DESC
    `;
        const notesResult = await database_1.default.query(notesQuery, [id]);
        // Get team comments (if shared with team)
        let teamComments = [];
        if (clarification.sharedWithTeam) {
            const commentsQuery = `
        SELECT ctc.*, u.name as author_name
        FROM clarification_team_comments ctc
        LEFT JOIN users u ON ctc.created_by = u.id
        WHERE ctc.clarification_id = $1 AND ctc.archived = false
        ORDER BY ctc.created_at ASC
      `;
            const commentsResult = await database_1.default.query(commentsQuery, [id]);
            teamComments = commentsResult.rows;
        }
        // Get emails
        const emailsQuery = `
      SELECT ce.*, u.name as adder_name
      FROM clarification_emails ce
      LEFT JOIN users u ON ce.added_by = u.id
      WHERE ce.clarification_id = $1 AND ce.archived = false
      ORDER BY ce.added_at DESC
    `;
        const emailsResult = await database_1.default.query(emailsQuery, [id]);
        res.json({
            ...clarification,
            attachments: attachmentsResult.rows,
            notes: notesResult.rows,
            teamComments,
            emails: emailsResult.rows
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching clarification details:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Klärfall-Details',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// POST /api/bilateral-clarifications
// Create new clarification
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const { title, description, marketPartnerCode, caseType, priority = 'MEDIUM', assignedTo, dueDate, tags = [], externalCaseId, sourceSystem = 'MANUAL' } = req.body;
        // Validate required fields
        if (!title || !marketPartnerCode || !caseType) {
            return res.status(400).json({
                error: 'Titel, Marktpartner-Code und Fall-Typ sind erforderlich'
            });
        }
        // TODO: Get market partner name from CodeLookup service
        // For now, we'll use a placeholder
        const marketPartnerName = `Partner ${marketPartnerCode}`;
        const insertQuery = `
      INSERT INTO bilateral_clarifications 
      (title, description, market_partner_code, market_partner_name, case_type, 
       priority, created_by, assigned_to, due_date, tags, external_case_id, 
       source_system, team_id, last_modified_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
        const values = [
            title,
            description,
            marketPartnerCode,
            marketPartnerName,
            caseType,
            priority,
            req.user.id,
            assignedTo || null,
            dueDate || null,
            tags,
            externalCaseId || null,
            sourceSystem,
            req.user.teamId,
            req.user.id
        ];
        const result = await database_1.default.query(insertQuery, values);
        const newClarification = formatClarification(result.rows[0]);
        // Log the creation
        logger_1.logger.info(`Clarification created: ${newClarification.id} by user ${req.user.id}`);
        res.status(201).json({
            message: 'Klärfall erfolgreich erstellt',
            clarification: newClarification
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating clarification:', error);
        res.status(500).json({
            error: 'Fehler beim Erstellen des Klärfalls',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// PUT /api/bilateral-clarifications/:id
// Update clarification
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        // Check permissions
        const permissionQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND (created_by = $2 OR assigned_to = $2)
    `;
        const permissionResult = await database_1.default.query(permissionQuery, [id, req.user.id]);
        if (permissionResult.rows.length === 0) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Bearbeiten dieses Klärfalls' });
        }
        // Build dynamic update query
        const allowedFields = [
            'title', 'description', 'status', 'priority', 'assigned_to',
            'due_date', 'resolution_notes', 'tags', 'shared_with_team'
        ];
        const updateFields = [];
        const updateValues = [];
        let paramCounter = 1;
        Object.keys(updates).forEach(key => {
            const dbField = key === 'assignedTo' ? 'assigned_to' :
                key === 'dueDate' ? 'due_date' :
                    key === 'resolutionNotes' ? 'resolution_notes' :
                        key === 'sharedWithTeam' ? 'shared_with_team' : key;
            if (allowedFields.includes(dbField)) {
                updateFields.push(`${dbField} = $${paramCounter}`);
                updateValues.push(updates[key]);
                paramCounter++;
            }
        });
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Keine gültigen Felder zum Aktualisieren' });
        }
        // Add metadata
        updateFields.push(`last_modified_by = $${paramCounter}`);
        updateValues.push(req.user.id);
        paramCounter++;
        updateFields.push(`version = version + 1`);
        // Add ID for WHERE clause
        updateValues.push(id);
        const updateQuery = `
      UPDATE bilateral_clarifications 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCounter}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, updateValues);
        const updatedClarification = formatClarification(result.rows[0]);
        // Log the update
        logger_1.logger.info(`Clarification updated: ${id} by user ${req.user.id}`);
        res.json({
            message: 'Klärfall erfolgreich aktualisiert',
            clarification: updatedClarification
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating clarification:', error);
        res.status(500).json({
            error: 'Fehler beim Aktualisieren des Klärfalls',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// DELETE /api/bilateral-clarifications/:id
// Archive (soft delete) clarification
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check permissions (only creator or admin can delete)
        const permissionQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND created_by = $2
    `;
        const permissionResult = await database_1.default.query(permissionQuery, [id, req.user.id]);
        if (permissionResult.rows.length === 0) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Klärfalls' });
        }
        // Soft delete (archive)
        const archiveQuery = `
      UPDATE bilateral_clarifications 
      SET archived = true, archived_at = NOW(), last_modified_by = $2
      WHERE id = $1
    `;
        await database_1.default.query(archiveQuery, [id, req.user.id]);
        logger_1.logger.info(`Clarification archived: ${id} by user ${req.user.id}`);
        res.json({ message: 'Klärfall erfolgreich archiviert' });
    }
    catch (error) {
        logger_1.logger.error('Error archiving clarification:', error);
        res.status(500).json({
            error: 'Fehler beim Archivieren des Klärfalls',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// POST /api/bilateral-clarifications/:id/attachments
// Upload attachment to clarification
router.post('/:id/attachments', auth_1.authenticateToken, upload.array('attachments', 5), async (req, res) => {
    try {
        const { id } = req.params;
        const { attachmentType = 'DOCUMENT', attachmentCategory = 'GENERAL', description, isSensitive = false } = req.body;
        // Check access
        const accessQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND (created_by = $2 OR assigned_to = $2 OR 
                         (shared_with_team = true AND team_id = $3))
    `;
        const accessResult = await database_1.default.query(accessQuery, [id, req.user.id, req.user.teamId]);
        if (accessResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'Keine Dateien hochgeladen' });
        }
        const uploadedAttachments = [];
        for (const file of req.files) {
            const insertQuery = `
        INSERT INTO clarification_attachments 
        (clarification_id, filename, original_filename, file_path, file_size, 
         mime_type, uploaded_by, attachment_type, attachment_category, description, is_sensitive)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
            const values = [
                id,
                file.filename,
                file.originalname,
                file.path,
                file.size,
                file.mimetype,
                req.user.id,
                attachmentType,
                attachmentCategory,
                description || null,
                isSensitive
            ];
            const result = await database_1.default.query(insertQuery, values);
            uploadedAttachments.push(result.rows[0]);
        }
        logger_1.logger.info(`${uploadedAttachments.length} attachments uploaded to clarification ${id} by user ${req.user.id}`);
        res.status(201).json({
            message: 'Anhänge erfolgreich hochgeladen',
            attachments: uploadedAttachments
        });
    }
    catch (error) {
        logger_1.logger.error('Error uploading attachments:', error);
        res.status(500).json({
            error: 'Fehler beim Hochladen der Anhänge',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// DELETE /api/bilateral-clarifications/:id/attachments/:attachmentId
// Delete attachment
router.delete('/:id/attachments/:attachmentId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id, attachmentId } = req.params;
        // Check permissions
        const permissionQuery = `
      SELECT ca.*, bc.created_by, bc.assigned_to, bc.team_id, bc.shared_with_team
      FROM clarification_attachments ca
      JOIN bilateral_clarifications bc ON ca.clarification_id = bc.id
      WHERE ca.id = $1 AND ca.clarification_id = $2
    `;
        const permissionResult = await database_1.default.query(permissionQuery, [attachmentId, id]);
        if (permissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Anhang nicht gefunden' });
        }
        const attachment = permissionResult.rows[0];
        // Only uploader, case creator, or assigned user can delete
        if (attachment.uploaded_by !== req.user.id &&
            attachment.created_by !== req.user.id &&
            attachment.assigned_to !== req.user.id) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Löschen dieses Anhangs' });
        }
        // Soft delete
        const deleteQuery = `
      UPDATE clarification_attachments 
      SET archived = true, archived_at = NOW()
      WHERE id = $1
    `;
        await database_1.default.query(deleteQuery, [attachmentId]);
        logger_1.logger.info(`Attachment ${attachmentId} deleted from clarification ${id} by user ${req.user.id}`);
        res.json({ message: 'Anhang erfolgreich gelöscht' });
    }
    catch (error) {
        logger_1.logger.error('Error deleting attachment:', error);
        res.status(500).json({
            error: 'Fehler beim Löschen des Anhangs',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// POST /api/bilateral-clarifications/:id/notes
// Add note to clarification
router.post('/:id/notes', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, noteType = 'USER', isInternal = false, linkedAttachmentId, linkedEmailId, tags = [], isPinned = false } = req.body;
        // Check access
        const accessQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND (created_by = $2 OR assigned_to = $2 OR 
                         (shared_with_team = true AND team_id = $3))
    `;
        const accessResult = await database_1.default.query(accessQuery, [id, req.user.id, req.user.teamId]);
        if (accessResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }
        const insertQuery = `
      INSERT INTO clarification_notes 
      (clarification_id, content, note_type, created_by, is_internal, 
       linked_attachment_id, linked_email_id, tags, is_pinned)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
        const values = [
            id,
            content,
            noteType,
            req.user.id,
            isInternal,
            linkedAttachmentId || null,
            linkedEmailId || null,
            tags,
            isPinned
        ];
        const result = await database_1.default.query(insertQuery, values);
        logger_1.logger.info(`Note added to clarification ${id} by user ${req.user.id}`);
        res.status(201).json({
            message: 'Notiz erfolgreich hinzugefügt',
            note: result.rows[0]
        });
    }
    catch (error) {
        logger_1.logger.error('Error adding note:', error);
        res.status(500).json({
            error: 'Fehler beim Hinzufügen der Notiz',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// POST /api/bilateral-clarifications/:id/share-team
// Share clarification with team
router.post('/:id/share-team', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check permissions (only creator can share)
        const permissionQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND created_by = $2
    `;
        const permissionResult = await database_1.default.query(permissionQuery, [id, req.user.id]);
        if (permissionResult.rows.length === 0) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Freigeben dieses Klärfalls' });
        }
        // Update to share with team
        const updateQuery = `
      UPDATE bilateral_clarifications 
      SET shared_with_team = true, last_modified_by = $2
      WHERE id = $1
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, [id, req.user.id]);
        // Log team activity
        const activityQuery = `
      INSERT INTO clarification_team_activities 
      (clarification_id, team_id, user_id, activity_type, description, metadata)
      VALUES ($1, $2, $3, 'SHARED', 'Klärfall für Team freigegeben', $4)
    `;
        await database_1.default.query(activityQuery, [
            id,
            req.user.teamId,
            req.user.id,
            JSON.stringify({ shared_at: new Date().toISOString() })
        ]);
        logger_1.logger.info(`Clarification ${id} shared with team by user ${req.user.id}`);
        res.json({
            message: 'Klärfall erfolgreich für Team freigegeben',
            clarification: formatClarification(result.rows[0])
        });
    }
    catch (error) {
        logger_1.logger.error('Error sharing clarification with team:', error);
        res.status(500).json({
            error: 'Fehler beim Freigeben für das Team',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// POST /api/bilateral-clarifications/:id/unshare-team
// Unshare clarification from team
router.post('/:id/unshare-team', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        // Check permissions (only creator can unshare)
        const permissionQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND created_by = $2
    `;
        const permissionResult = await database_1.default.query(permissionQuery, [id, req.user.id]);
        if (permissionResult.rows.length === 0) {
            return res.status(403).json({ error: 'Keine Berechtigung zum Entfernen der Freigabe' });
        }
        // Update to unshare from team
        const updateQuery = `
      UPDATE bilateral_clarifications 
      SET shared_with_team = false, last_modified_by = $2
      WHERE id = $1
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, [id, req.user.id]);
        // Log team activity
        const activityQuery = `
      INSERT INTO clarification_team_activities 
      (clarification_id, team_id, user_id, activity_type, description, metadata)
      VALUES ($1, $2, $3, 'UNSHARED', 'Team-Freigabe entfernt', $4)
    `;
        await database_1.default.query(activityQuery, [
            id,
            req.user.teamId,
            req.user.id,
            JSON.stringify({ unshared_at: new Date().toISOString() })
        ]);
        logger_1.logger.info(`Clarification ${id} unshared from team by user ${req.user.id}`);
        res.json({
            message: 'Team-Freigabe erfolgreich entfernt',
            clarification: formatClarification(result.rows[0])
        });
    }
    catch (error) {
        logger_1.logger.error('Error unsharing clarification from team:', error);
        res.status(500).json({
            error: 'Fehler beim Entfernen der Team-Freigabe',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// POST /api/bilateral-clarifications/:id/team-comments
// Add team comment to shared clarification
router.post('/:id/team-comments', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { content, parentCommentId, mentionedUsers = [] } = req.body;
        // Check if clarification is shared with team and user has access
        const accessQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND shared_with_team = true AND team_id = $2
    `;
        const accessResult = await database_1.default.query(accessQuery, [id, req.user.teamId]);
        if (accessResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht für Team freigegeben oder nicht gefunden' });
        }
        const insertQuery = `
      INSERT INTO clarification_team_comments 
      (clarification_id, content, created_by, parent_comment_id, mentioned_users)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
        const values = [
            id,
            content,
            req.user.id,
            parentCommentId || null,
            mentionedUsers
        ];
        const result = await database_1.default.query(insertQuery, values);
        // Log team activity
        const activityQuery = `
      INSERT INTO clarification_team_activities 
      (clarification_id, team_id, user_id, activity_type, description, metadata)
      VALUES ($1, $2, $3, 'COMMENTED', 'Team-Kommentar hinzugefügt', $4)
    `;
        await database_1.default.query(activityQuery, [
            id,
            req.user.teamId,
            req.user.id,
            JSON.stringify({ comment_id: result.rows[0].id })
        ]);
        logger_1.logger.info(`Team comment added to clarification ${id} by user ${req.user.id}`);
        res.status(201).json({
            message: 'Team-Kommentar erfolgreich hinzugefügt',
            comment: result.rows[0]
        });
    }
    catch (error) {
        logger_1.logger.error('Error adding team comment:', error);
        res.status(500).json({
            error: 'Fehler beim Hinzufügen des Team-Kommentars',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// GET /api/bilateral-clarifications/team-cases
// Get all team-shared clarifications
router.get('/team-cases', auth_1.authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, priority } = req.query;
        let query = `
      SELECT bc.*, u.name as created_by_name, u2.name as assigned_to_name,
             COUNT(ctc.id) as comment_count
      FROM bilateral_clarifications bc
      LEFT JOIN users u ON bc.created_by = u.id
      LEFT JOIN users u2 ON bc.assigned_to = u2.id
      LEFT JOIN clarification_team_comments ctc ON bc.id = ctc.clarification_id AND ctc.archived = false
      WHERE bc.shared_with_team = true AND bc.team_id = $1 AND bc.archived = false
    `;
        const queryParams = [req.user.teamId];
        let paramCounter = 2;
        if (status) {
            query += ` AND bc.status = $${paramCounter}`;
            queryParams.push(status);
            paramCounter++;
        }
        if (priority) {
            query += ` AND bc.priority = $${paramCounter}`;
            queryParams.push(priority);
            paramCounter++;
        }
        query += ` GROUP BY bc.id, u.name, u2.name ORDER BY bc.updated_at DESC`;
        // Add pagination
        const offset = (page - 1) * limit;
        query += ` LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
        queryParams.push(limit, offset);
        const result = await database_1.default.query(query, queryParams);
        const teamCases = result.rows.map(row => ({
            ...formatClarification(row),
            commentCount: parseInt(row.comment_count) || 0,
            createdByName: row.created_by_name,
            assignedToName: row.assigned_to_name
        }));
        res.json({
            teamCases,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                // TODO: Add total count
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching team cases:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Team-Klärfälle',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// POST /api/bilateral-clarifications/:id/emails
// Add email record to clarification
router.post('/:id/emails', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { direction, subject, fromAddress, toAddresses = [], ccAddresses = [], content, contentType = 'text', emailType = 'OTHER', isImportant = false, source = 'MANUAL_PASTE' } = req.body;
        // Check access
        const accessQuery = `
      SELECT * FROM bilateral_clarifications 
      WHERE id = $1 AND (created_by = $2 OR assigned_to = $2 OR 
                         (shared_with_team = true AND team_id = $3))
    `;
        const accessResult = await database_1.default.query(accessQuery, [id, req.user.id, req.user.teamId]);
        if (accessResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden oder keine Berechtigung' });
        }
        const insertQuery = `
      INSERT INTO clarification_emails 
      (clarification_id, direction, subject, from_address, to_addresses, cc_addresses,
       content, content_type, added_by, source, email_type, is_important)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const values = [
            id,
            direction,
            subject,
            fromAddress,
            toAddresses,
            ccAddresses,
            content,
            contentType,
            req.user.id,
            source,
            emailType,
            isImportant
        ];
        const result = await database_1.default.query(insertQuery, values);
        logger_1.logger.info(`Email record added to clarification ${id} by user ${req.user.id}`);
        res.status(201).json({
            message: 'Email-Eintrag erfolgreich hinzugefügt',
            email: result.rows[0]
        });
    }
    catch (error) {
        logger_1.logger.error('Error adding email record:', error);
        res.status(500).json({
            error: 'Fehler beim Hinzufügen des Email-Eintrags',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});
// Error handling middleware
router.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Datei zu groß. Maximum 10MB erlaubt.' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Zu viele Dateien. Maximum 5 Dateien erlaubt.' });
        }
    }
    logger_1.logger.error('Bilateral clarifications route error:', error);
    res.status(500).json({ error: 'Unerwarteter Server-Fehler' });
});
exports.default = router;
//# sourceMappingURL=bilateral-clarifications.js.map