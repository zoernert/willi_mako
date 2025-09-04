"use strict";
// Simplified Express Router für Bilaterale Klärfälle API
// Temporary implementation to get the bilateral clarifications working
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../config/database"));
const auth_1 = require("../middleware/auth");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
// Configure uploads for emails (.eml) and attachments
const ensureDir = (dirPath) => {
    if (!fs_1.default.existsSync(dirPath))
        fs_1.default.mkdirSync(dirPath, { recursive: true });
};
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const clarificationId = req.params.id || 'misc';
        const base = file.fieldname === 'attachment'
            ? path_1.default.join(process.cwd(), 'uploads', 'clarifications', clarificationId, 'attachments')
            : path_1.default.join(process.cwd(), 'uploads', 'clarifications', clarificationId, 'emails');
        ensureDir(base);
        cb(null, base);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
        cb(null, `${timestamp}__${safeOriginal}`);
    }
});
const upload = (0, multer_1.default)({ storage });
// First, let's create the table if it doesn't exist
const initializeTable = async () => {
    try {
        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS bilateral_clarifications (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          market_partner_code VARCHAR(20) NOT NULL,
          market_partner_name VARCHAR(255),
          case_type VARCHAR(50) NOT NULL DEFAULT 'B2B',
          status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'INTERNAL', 'READY_TO_SEND', 'SENT', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED')),
          priority VARCHAR(20) CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
          created_by UUID NOT NULL,
          assigned_to UUID,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          due_date TIMESTAMP,
          resolution_date TIMESTAMP,
          resolution_notes TEXT,
          tags TEXT[] DEFAULT '{}',
          shared_with_team BOOLEAN DEFAULT FALSE,
          team_id UUID,
          external_case_id VARCHAR(100),
          source_system VARCHAR(50) DEFAULT 'MANUAL',
          
          -- New fields for bilateral clarifications
          market_partner_data JSONB,
          selected_role JSONB,
          selected_contact JSONB,
          data_exchange_reference JSONB,
          internal_status VARCHAR(50) DEFAULT 'DRAFT',
          
          -- Audit fields
          version INTEGER DEFAULT 1,
          last_modified_by UUID,
          archived BOOLEAN DEFAULT FALSE,
          archived_at TIMESTAMP
      );

      -- Update trigger for updated_at
      CREATE OR REPLACE FUNCTION update_bilateral_clarifications_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';

      DROP TRIGGER IF EXISTS update_bilateral_clarifications_updated_at ON bilateral_clarifications;
      
      CREATE TRIGGER update_bilateral_clarifications_updated_at
          BEFORE UPDATE ON bilateral_clarifications
          FOR EACH ROW
          EXECUTE FUNCTION update_bilateral_clarifications_updated_at();
      
  -- W2 server fields (added conditionally if not present)
  ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS waiting_on VARCHAR(5) CHECK (waiting_on IN ('US','MP'));
  ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMP;
  ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP;
  ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS last_inbound_at TIMESTAMP;
  ALTER TABLE bilateral_clarifications ADD COLUMN IF NOT EXISTS last_outbound_at TIMESTAMP;
          
      -- Create references table for storing links to external data sources
      CREATE TABLE IF NOT EXISTS clarification_references (
          id SERIAL PRIMARY KEY,
          clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
          reference_type VARCHAR(50) NOT NULL, -- 'CHAT', 'MESSAGE_ANALYZER', 'EMAIL', etc.
          reference_id VARCHAR(255) NOT NULL,  -- External identifier (chatId, messageId, etc.)
          reference_data JSONB,                -- Additional context data
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Create additional data table for storing additional details
      CREATE TABLE IF NOT EXISTS clarification_additional_data (
          id SERIAL PRIMARY KEY,
          clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
          data_type VARCHAR(50) NOT NULL,       -- 'MARKET_PARTNER', 'DATA_EXCHANGE_REFERENCE', 'SELECTED_ROLE', 'SELECTED_CONTACT'
          data JSONB NOT NULL,                  -- Die eigentlichen Daten
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

    -- Email history for clarifications
    CREATE TABLE IF NOT EXISTS clarification_emails (
      id SERIAL PRIMARY KEY,
      clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
      direction VARCHAR(10) NOT NULL CHECK (direction IN ('INCOMING','OUTGOING')),
      subject VARCHAR(512),
      from_address VARCHAR(320),
      to_addresses TEXT[],
      cc_addresses TEXT[],
      bcc_addresses TEXT[],
      content TEXT,
      content_type VARCHAR(20) DEFAULT 'text',
      email_type VARCHAR(40),
      is_important BOOLEAN DEFAULT FALSE,
      source VARCHAR(20) DEFAULT 'API',
      file_path TEXT, -- for uploaded .eml
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Attachments for clarifications
    CREATE TABLE IF NOT EXISTS clarification_attachments (
      id SERIAL PRIMARY KEY,
      clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
      filename VARCHAR(512) NOT NULL,
      file_path TEXT NOT NULL,
      mime_type VARCHAR(127),
      file_size INTEGER,
      uploaded_by UUID,
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `;
        await database_1.default.query(createTableQuery);
        console.log('✅ bilateral_clarifications table initialized');
    }
    catch (error) {
        console.error('Error initializing bilateral_clarifications table:', error);
    }
};
// Initialize table on startup
initializeTable();
// Format clarification for API response
const formatClarification = (row) => {
    var _a, _b, _c, _d, _e;
    return ({
        id: row.id,
        title: row.title,
        description: row.description,
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
        lastEditedBy: row.last_modified_by,
        archived: row.archived,
        archivedAt: (_e = row.archived_at) === null || _e === void 0 ? void 0 : _e.toISOString(),
        // New bilateral clarification fields
        marketPartner: row.market_partner_data,
        selectedRole: row.selected_role,
        selectedContact: row.selected_contact,
        dataExchangeReference: row.data_exchange_reference,
        internalStatus: row.internal_status,
        waitingOn: row.waiting_on || (['SENT', 'PENDING', 'IN_PROGRESS'].includes(row.status) ? 'MP' : 'US'),
        nextActionAt: row.next_action_at ? new Date(row.next_action_at).toISOString() : (row.updated_at ? new Date(new Date(row.updated_at).getTime() + 3 * 24 * 60 * 60 * 1000).toISOString() : undefined),
        slaDueAt: row.sla_due_at ? new Date(row.sla_due_at).toISOString() : (row.due_date ? new Date(row.due_date).toISOString() : undefined),
        lastInboundAt: row.last_inbound_at ? new Date(row.last_inbound_at).toISOString() : undefined,
        lastOutboundAt: row.last_outbound_at ? new Date(row.last_outbound_at).toISOString() : undefined,
        // Computed fields
        isOverdue: row.due_date && new Date(row.due_date) < new Date() && row.status !== 'CLOSED' && row.status !== 'RESOLVED',
        daysSinceCreated: Math.floor((new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))
    });
};
// GET /api/bilateral-clarifications
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 20;
        const offset = (page - 1) * pageSize;
        // Get total count
        const countResult = await database_1.default.query('SELECT COUNT(*) as total FROM bilateral_clarifications WHERE archived = FALSE');
        const total = parseInt(countResult.rows[0].total);
        // Get clarifications
        const query = `
      SELECT * FROM bilateral_clarifications 
      WHERE archived = FALSE 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
        const result = await database_1.default.query(query, [pageSize, offset]);
        const clarifications = result.rows.map(formatClarification);
        // Get summary stats
        const summaryQuery = `
      SELECT 
        COUNT(CASE WHEN status IN ('DRAFT', 'INTERNAL', 'READY_TO_SEND') THEN 1 END) as total_open,
        COUNT(CASE WHEN status IN ('SENT', 'PENDING', 'IN_PROGRESS') THEN 1 END) as total_in_progress,
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as total_resolved,
        COUNT(CASE WHEN status = 'CLOSED' THEN 1 END) as total_closed,
        COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('RESOLVED', 'CLOSED') THEN 1 END) as overdue_cases,
        COUNT(CASE WHEN priority = 'HIGH' OR priority = 'CRITICAL' THEN 1 END) as high_priority_cases
      FROM bilateral_clarifications 
      WHERE archived = FALSE
    `;
        const summaryResult = await database_1.default.query(summaryQuery);
        const summary = summaryResult.rows[0];
        res.json({
            clarifications,
            pagination: {
                page,
                limit: pageSize,
                total,
                totalPages: Math.ceil(total / pageSize)
            },
            summary: {
                totalOpen: parseInt(summary.total_open) || 0,
                totalInProgress: parseInt(summary.total_in_progress) || 0,
                totalResolved: parseInt(summary.total_resolved) || 0,
                totalClosed: parseInt(summary.total_closed) || 0,
                overdueCases: parseInt(summary.overdue_cases) || 0,
                highPriorityCases: parseInt(summary.high_priority_cases) || 0
            }
        });
    }
    catch (error) {
        console.error('Database connection error:', error);
        res.status(500).json({
            error: 'Fehler beim Laden der Klärfälle',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Place statistics and export routes BEFORE parametric routes to avoid /:id capture
// GET /api/bilateral-clarifications/statistics
router.get('/statistics', auth_1.authenticateToken, async (req, res) => {
    try {
        const statsQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('RESOLVED','CLOSED')) as total_active,
        COUNT(*) FILTER (WHERE waiting_on = 'US') as waiting_us,
        COUNT(*) FILTER (WHERE waiting_on = 'MP') as waiting_mp,
        COUNT(*) FILTER (WHERE sla_due_at IS NOT NULL AND sla_due_at::date = CURRENT_DATE AND status NOT IN ('RESOLVED','CLOSED')) as due_today,
        COUNT(*) FILTER (WHERE sla_due_at IS NOT NULL AND sla_due_at < NOW() AND status NOT IN ('RESOLVED','CLOSED')) as overdue,
        COUNT(*) FILTER (WHERE priority IN ('HIGH','CRITICAL')) as high_priority
      FROM bilateral_clarifications WHERE archived = FALSE;
    `;
        const r = await database_1.default.query(statsQuery);
        const row = r.rows[0] || {};
        res.json({
            totalActive: parseInt(row.total_active || 0),
            waitingUS: parseInt(row.waiting_us || 0),
            waitingMP: parseInt(row.waiting_mp || 0),
            dueToday: parseInt(row.due_today || 0),
            overdue: parseInt(row.overdue || 0),
            highPriority: parseInt(row.high_priority || 0)
        });
    }
    catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Statistiken' });
    }
});
// GET /api/bilateral-clarifications/export
router.get('/export', auth_1.authenticateToken, async (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="bilateral-clarifications-export.csv"');
        const header = 'id;title;status;priority;waitingOn;slaDueAt\n';
        res.write(header);
        const q = await database_1.default.query(`SELECT id, title, status, priority, waiting_on, sla_due_at FROM bilateral_clarifications WHERE archived = FALSE ORDER BY id DESC LIMIT 1000`);
        q.rows.forEach(r => {
            const line = `${r.id};${(r.title || '').replace(/;/g, ',')};${r.status};${r.priority};${r.waiting_on || ''};${r.sla_due_at ? new Date(r.sla_due_at).toISOString() : ''}\n`;
            res.write(line);
        });
        res.end();
    }
    catch (error) {
        console.error('Error exporting clarifications:', error);
        res.status(500).json({ error: 'Fehler beim Export' });
    }
});
// GET /api/bilateral-clarifications/validate-email
router.get('/validate-email', auth_1.authenticateToken, async (req, res) => {
    try {
        const { marketPartnerCode, role } = req.query;
        if (!marketPartnerCode)
            return res.json({ isValid: false });
        const email = role ? `${String(role).toLowerCase()}_${marketPartnerCode}@example.com` : `${marketPartnerCode}@example.com`;
        res.json({ isValid: true, email, contactName: 'Kontakt (automatisch)' });
    }
    catch (error) {
        console.error('Error validating email:', error);
        res.status(500).json({ isValid: false });
    }
});
// POST /api/bilateral-clarifications
router.post('/', auth_1.authenticateToken, async (req, res) => {
    var _a, _b, _c, _d;
    try {
        const { title, description, marketPartner, selectedRole, selectedContact, dataExchangeReference, priority = 'MEDIUM', assignedTo, tags = [] } = req.body;
        // Validate required fields
        if (!title) {
            return res.status(400).json({ error: 'Titel ist erforderlich' });
        }
        if (!marketPartner) {
            return res.status(400).json({ error: 'Marktpartner ist erforderlich' });
        }
        // Sicherstellen, dass marketPartner.code und marketPartner.companyName existieren
        if (!marketPartner.code) {
            return res.status(400).json({ error: 'Marktpartner-Code ist erforderlich' });
        }
        if (!marketPartner.companyName) {
            return res.status(400).json({ error: 'Marktpartner-Name ist erforderlich' });
        }
        if (!selectedRole) {
            return res.status(400).json({ error: 'Marktrolle ist erforderlich' });
        }
        if (!dataExchangeReference || !dataExchangeReference.dar) {
            return res.status(400).json({ error: 'Datenaustauschreferenz (DAR) ist erforderlich' });
        }
        const insertQuery = `
      INSERT INTO bilateral_clarifications 
      (title, description, market_partner_code, market_partner_name, case_type, 
       priority, created_by, assigned_to, tags, source_system, team_id, 
       last_modified_by, market_partner_data, selected_role, selected_contact, 
       data_exchange_reference, internal_status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
        const values = [
            title,
            description,
            marketPartner.code,
            marketPartner.companyName,
            'B2B', // Default for bilateral clarifications
            priority,
            ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system',
            assignedTo || null,
            tags,
            'MANUAL',
            ((_b = req.user) === null || _b === void 0 ? void 0 : _b.teamId) || null,
            ((_c = req.user) === null || _c === void 0 ? void 0 : _c.id) || 'system',
            JSON.stringify(marketPartner),
            JSON.stringify(selectedRole),
            JSON.stringify(selectedContact),
            JSON.stringify(dataExchangeReference),
            'DRAFT'
        ];
        const result = await database_1.default.query(insertQuery, values);
        const newClarification = formatClarification(result.rows[0]);
        console.log(`✅ Bilateral clarification created: ${newClarification.id} by user ${(_d = req.user) === null || _d === void 0 ? void 0 : _d.id}`);
        res.status(201).json({
            message: 'Klärfall erfolgreich erstellt',
            clarification: newClarification
        });
    }
    catch (error) {
        console.error('Error creating clarification:', error);
        res.status(500).json({
            error: 'Fehler beim Erstellen der Klärfälle',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// GET /api/bilateral-clarifications/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = 'SELECT * FROM bilateral_clarifications WHERE id = $1 AND archived = FALSE';
        const result = await database_1.default.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden' });
        }
        const clarification = formatClarification(result.rows[0]);
        // Add timeline data for the frontend
        const responseData = {
            ...clarification,
            notes: [], // Mock notes data - replace with real database queries
            emails: [], // Mock emails data - replace with real database queries
            attachments: [] // Mock attachments data - replace with real database queries
        };
        res.json(responseData);
    }
    catch (error) {
        console.error('Error fetching clarification:', error);
        res.status(500).json({
            error: 'Fehler beim Laden des Klärfalls',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Context Transfer Endpoints
router.post('/from-chat-context', auth_1.authenticateToken, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    try {
        const { context, clarification } = req.body;
        const llmDataExtractionService = require('../services/llmDataExtractionService.js');
        const llmService = llmDataExtractionService(); // Verwenden des Singleton
        console.log('Creating clarification from chat context:', {
            source: context.source,
            chatId: (_a = context.chatContext) === null || _a === void 0 ? void 0 : _a.chatId,
            messageId: (_b = context.chatContext) === null || _b === void 0 ? void 0 : _b.messageId,
            contentLength: (_d = (_c = context.chatContext) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.length,
            suggested: {
                title: context.suggestedTitle,
                marketPartner: context.suggestedMarketPartner,
                caseType: context.suggestedCaseType,
                priority: context.suggestedPriority
            }
        });
        // Verwende LLM-Service, um eine intelligente Zusammenfassung zu erstellen
        let title = context.suggestedTitle || clarification.title || 'Chat-basierte Klärung';
        let description = '';
        try {
            // Chat-Inhalt für LLM-Analyse vorbereiten
            const chatContent = ((_e = context.chatContext) === null || _e === void 0 ? void 0 : _e.content) || '';
            const chatTitle = ((_f = context.chatContext) === null || _f === void 0 ? void 0 : _f.title) || 'Chat-Konversation';
            console.log(`Generating LLM summary for chat (id: ${(_g = context.chatContext) === null || _g === void 0 ? void 0 : _g.chatId})`);
            // LLM-Service aufrufen, um Zusammenfassung zu erstellen
            const llmResult = await llmService.generateTimelineActivitySummary('chat_session', 'create_clarification', {
                chatId: (_h = context.chatContext) === null || _h === void 0 ? void 0 : _h.chatId,
                chatTitle: chatTitle,
                content: chatContent,
                marketPartner: ((_j = context.suggestedMarketPartner) === null || _j === void 0 ? void 0 : _j.code) || clarification.marketPartnerCode || ''
            });
            // LLM-generierte Titel und Beschreibung verwenden, falls verfügbar
            if (llmResult === null || llmResult === void 0 ? void 0 : llmResult.title) {
                title = llmResult.title;
            }
            if (llmResult === null || llmResult === void 0 ? void 0 : llmResult.summary) {
                description = llmResult.summary;
            }
            else {
                // Fallback, wenn LLM keine Zusammenfassung erstellen konnte
                description = context.suggestedDescription || clarification.description || 'Automatisch erstellt aus Chat-Konversation';
            }
            console.log('LLM summary generated successfully:', {
                titleLength: title.length,
                descriptionLength: description.length
            });
        }
        catch (llmError) {
            console.error('Error generating LLM summary:', llmError);
            // Fallback zu einfacher Beschreibung, wenn LLM fehlschlägt
            description = context.suggestedDescription || clarification.description || '';
        }
        // Create actual clarification in the database
        const now = new Date();
        const marketPartnerCode = ((_k = context.suggestedMarketPartner) === null || _k === void 0 ? void 0 : _k.code) || clarification.marketPartnerCode || '';
        const marketPartnerName = ((_l = context.suggestedMarketPartner) === null || _l === void 0 ? void 0 : _l.name) || clarification.marketPartnerName || '';
        const caseType = context.suggestedCaseType || clarification.caseType || 'GENERAL';
        const priority = context.suggestedPriority || clarification.priority || 'MEDIUM';
        const userId = ((_m = req.user) === null || _m === void 0 ? void 0 : _m.id) || 'system';
        const assignedTo = clarification.assignedTo || userId; // Assign to creating user by default
        // Sicherstellen, dass tags ein valides Array ist
        let tagsArray = [];
        try {
            // Wenn tags bereits ein Array ist, verwenden wir es
            if (Array.isArray(clarification.tags)) {
                tagsArray = clarification.tags;
            }
            // Wenn tags ein String ist, versuchen wir es zu parsen
            else if (typeof clarification.tags === 'string') {
                tagsArray = JSON.parse(clarification.tags);
            }
        }
        catch (err) {
            console.warn('Failed to parse tags, using empty array:', err);
        }
        // Doppelter JSON.stringify-Schutz: Stellen Sie sicher, dass wir ein gültiges JSON-Array haben
        const tagsJson = JSON.stringify(tagsArray);
        console.log('Tags for insertion:', tagsJson);
        // Insert into database
        const insertResult = await database_1.default.query(`INSERT INTO bilateral_clarifications (
        title, description, market_partner_code, market_partner_name, case_type, status,
        priority, created_by, created_at, updated_at, tags, shared_with_team, source_system,
        version, archived, assigned_to, market_partner_data, selected_role, selected_contact, data_exchange_reference, internal_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21) RETURNING id`, [
            title,
            description,
            marketPartnerCode,
            marketPartnerName,
            caseType,
            'DRAFT', // Start as DRAFT anstatt OPEN (um die CHECK-Constraint zu erfüllen)
            priority,
            userId,
            now,
            now,
            tagsJson, // Stellen sicher, dass es ein gültiges JSON-Array ist
            clarification.sharedWithTeam || false,
            'CHAT', // Mark source as CHAT
            1,
            false,
            assignedTo,
            clarification.marketPartner ? JSON.stringify(clarification.marketPartner) : null,
            clarification.selectedRole ? JSON.stringify(clarification.selectedRole) : null,
            clarification.selectedContact ? JSON.stringify(clarification.selectedContact) : null,
            clarification.dataExchangeReference ? JSON.stringify(clarification.dataExchangeReference) : null,
            'DRAFT' // Internal status muss auch gesetzt werden
        ]);
        const clarificationId = insertResult.rows[0].id;
        // Create reference to chat context
        if ((_o = context.chatContext) === null || _o === void 0 ? void 0 : _o.chatId) {
            await database_1.default.query(`INSERT INTO clarification_references (
          clarification_id, reference_type, reference_id, reference_value, auto_extracted, reference_data
        ) VALUES ($1, $2, $3, $4, $5, $6)`, [
                clarificationId,
                'CHAT',
                context.chatContext.chatId,
                context.chatContext.chatId, // Use chatId as reference_value too for compatibility
                true,
                JSON.stringify({
                    chatId: context.chatContext.chatId,
                    messageId: context.chatContext.messageId,
                    timestamp: now.toISOString()
                })
            ]);
        }
        // Bei bilateralen Klärungen müssen wir zusätzliche Objekte verarbeiten
        try {
            // Marktpartner und DataExchangeReference in die Datenbank speichern
            if (clarification.marketPartner) {
                const marketPartnerData = JSON.stringify(clarification.marketPartner);
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'MARKET_PARTNER',
                    marketPartnerData
                ]);
            }
            if (clarification.dataExchangeReference) {
                const darData = JSON.stringify(clarification.dataExchangeReference);
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'DATA_EXCHANGE_REFERENCE',
                    darData
                ]);
            }
            if (clarification.selectedRole) {
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'SELECTED_ROLE',
                    JSON.stringify({ role: clarification.selectedRole })
                ]);
            }
            if (clarification.selectedContact) {
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'SELECTED_CONTACT',
                    JSON.stringify(clarification.selectedContact)
                ]);
            }
        }
        catch (additionalDataError) {
            console.error('Error storing additional clarification data:', additionalDataError);
            // Wir lassen den Hauptprozess weiterlaufen, auch wenn zusätzliche Daten nicht gespeichert werden konnten
        }
        const newClarification = {
            id: clarificationId,
            title,
            description,
            marketPartnerCode,
            marketPartnerName,
            caseType,
            status: 'OPEN',
            priority,
            createdBy: userId,
            assignedTo,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            tags: clarification.tags || [],
            sharedWithTeam: clarification.sharedWithTeam || false,
            sourceSystem: 'CHAT',
            version: 1,
            archived: false
        };
        console.log(`✅ Bilateral clarification created from chat: ${clarificationId} by user ${userId}`);
        res.json(newClarification);
    }
    catch (error) {
        console.error('Error creating clarification from chat context:', error);
        res.status(500).json({
            error: 'Fehler beim Erstellen der Klärung aus Chat-Kontext',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/from-analyzer-context', auth_1.authenticateToken, async (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
    try {
        const { context, clarification } = req.body;
        console.log('Creating clarification from analyzer context:', {
            source: context.source,
            messageLength: (_b = (_a = context.messageAnalyzerContext) === null || _a === void 0 ? void 0 : _a.originalMessage) === null || _b === void 0 ? void 0 : _b.length,
            analysisFormat: (_d = (_c = context.messageAnalyzerContext) === null || _c === void 0 ? void 0 : _c.analysisResult) === null || _d === void 0 ? void 0 : _d.format,
            segmentsCount: (_g = (_f = (_e = context.messageAnalyzerContext) === null || _e === void 0 ? void 0 : _e.analysisResult) === null || _f === void 0 ? void 0 : _f.segments) === null || _g === void 0 ? void 0 : _g.length,
            suggested: {
                title: context.suggestedTitle,
                marketPartner: context.suggestedMarketPartner,
                caseType: context.suggestedCaseType,
                priority: context.suggestedPriority,
                edifactType: context.edifactMessageType
            }
        });
        // Create actual clarification in the database (no longer a mock)
        const now = new Date();
        const title = context.suggestedTitle || clarification.title || 'Analyzer-basierte Klärung';
        const description = context.suggestedDescription || clarification.description || '';
        const marketPartnerCode = ((_h = context.suggestedMarketPartner) === null || _h === void 0 ? void 0 : _h.code) || clarification.marketPartnerCode || '';
        const marketPartnerName = ((_j = context.suggestedMarketPartner) === null || _j === void 0 ? void 0 : _j.name) || clarification.marketPartnerName || '';
        const caseType = context.suggestedCaseType || clarification.caseType || 'TECHNICAL';
        const priority = context.suggestedPriority || clarification.priority || 'MEDIUM';
        const userId = ((_k = req.user) === null || _k === void 0 ? void 0 : _k.id) || 'system';
        const assignedTo = clarification.assignedTo || userId; // Assign to creating user by default
        // Include special tags for message analyzer
        const tagsArray = [
            ...(Array.isArray(clarification.tags) ? clarification.tags : []),
            'nachrichtenanalyse',
            ...(context.edifactMessageType ? [context.edifactMessageType.toLowerCase()] : []),
            ...(context.problemType ? [context.problemType] : [])
        ];
        // Stellen Sie sicher, dass wir ein gültiges JSON-Array haben
        const tagsJson = JSON.stringify(tagsArray);
        console.log('Analyzer tags for insertion:', tagsJson);
        // Insert into database
        const insertResult = await database_1.default.query(`INSERT INTO bilateral_clarifications (
        title, description, market_partner_code, market_partner_name, case_type, status,
        priority, created_by, created_at, updated_at, tags, shared_with_team, source_system,
        version, archived, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16) RETURNING id`, [
            title,
            description,
            marketPartnerCode,
            marketPartnerName,
            caseType,
            'OPEN', // Start as OPEN 
            priority,
            userId,
            now,
            now,
            tagsJson, // Stellen sicher, dass es ein gültiges JSON-Array ist
            clarification.sharedWithTeam || false,
            'MESSAGE_ANALYZER', // Mark source as MESSAGE_ANALYZER
            1,
            false,
            assignedTo
        ]);
        const clarificationId = insertResult.rows[0].id;
        // Create reference to analyzer context
        if ((_l = context.messageAnalyzerContext) === null || _l === void 0 ? void 0 : _l.originalMessage) {
            await database_1.default.query(`INSERT INTO clarification_references (
          clarification_id, reference_type, reference_id, reference_data
        ) VALUES ($1, $2, $3, $4)`, [
                clarificationId,
                'MESSAGE_ANALYZER',
                `message_${Date.now()}`, // Generate a unique ID
                JSON.stringify({
                    originalMessage: context.messageAnalyzerContext.originalMessage.substring(0, 1000), // Truncate long messages
                    analysisResult: context.messageAnalyzerContext.analysisResult,
                    timestamp: now.toISOString()
                })
            ]);
        }
        // Bei bilateralen Klärungen müssen wir zusätzliche Objekte verarbeiten
        try {
            // Marktpartner und DataExchangeReference in die Datenbank speichern
            if (clarification.marketPartner) {
                const marketPartnerData = JSON.stringify(clarification.marketPartner);
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'MARKET_PARTNER',
                    marketPartnerData
                ]);
            }
            if (clarification.dataExchangeReference) {
                const darData = JSON.stringify(clarification.dataExchangeReference);
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'DATA_EXCHANGE_REFERENCE',
                    darData
                ]);
            }
            if (clarification.selectedRole) {
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'SELECTED_ROLE',
                    JSON.stringify({ role: clarification.selectedRole })
                ]);
            }
            if (clarification.selectedContact) {
                await database_1.default.query(`INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`, [
                    clarificationId,
                    'SELECTED_CONTACT',
                    JSON.stringify(clarification.selectedContact)
                ]);
            }
        }
        catch (additionalDataError) {
            console.error('Error storing additional clarification data:', additionalDataError);
            // Wir lassen den Hauptprozess weiterlaufen, auch wenn zusätzliche Daten nicht gespeichert werden konnten
        }
        const newClarification = {
            id: clarificationId,
            title,
            description,
            marketPartnerCode,
            marketPartnerName,
            caseType,
            status: 'OPEN',
            priority,
            createdBy: userId,
            assignedTo,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
            tags: tagsArray,
            sharedWithTeam: clarification.sharedWithTeam || false,
            sourceSystem: 'MESSAGE_ANALYZER',
            version: 1,
            archived: false
        };
        console.log(`✅ Bilateral clarification created from analyzer: ${clarificationId} by user ${userId}`);
        res.json(newClarification);
    }
    catch (error) {
        console.error('Error creating clarification from analyzer context:', error);
        res.status(500).json({
            error: 'Fehler beim Erstellen der Klärung aus Analyzer-Kontext',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// PATCH /api/bilateral-clarifications/:id/status
router.patch('/:id/status', auth_1.authenticateToken, async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const { status, internalStatus, reason } = req.body;
        // Validate required fields
        if (!status) {
            return res.status(400).json({ error: 'Status ist erforderlich' });
        }
        // Check if clarification exists
        const checkQuery = 'SELECT * FROM bilateral_clarifications WHERE id = $1 AND archived = FALSE';
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden' });
        }
        const updateQuery = `
      UPDATE bilateral_clarifications 
      SET status = $1, internal_status = $2, last_modified_by = $3, version = version + 1,
          waiting_on = CASE WHEN $1 IN ('SENT','PENDING','IN_PROGRESS') THEN 'MP' ELSE 'US' END
      WHERE id = $4 AND archived = FALSE
      RETURNING *
    `;
        const values = [
            status,
            internalStatus || status,
            ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system',
            id
        ];
        const result = await database_1.default.query(updateQuery, values);
        const updatedClarification = formatClarification(result.rows[0]);
        console.log(`✅ Bilateral clarification status updated: ${id} to ${status} by user ${(_b = req.user) === null || _b === void 0 ? void 0 : _b.id}`);
        res.json({
            message: 'Status erfolgreich aktualisiert',
            clarification: updatedClarification
        });
    }
    catch (error) {
        console.error('Error updating clarification status:', error);
        res.status(500).json({
            error: 'Fehler beim Aktualisieren des Status',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// PUT /api/bilateral-clarifications/:id
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const updates = req.body;
        // Check if clarification exists
        const checkQuery = 'SELECT * FROM bilateral_clarifications WHERE id = $1 AND archived = FALSE';
        const checkResult = await database_1.default.query(checkQuery, [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Klärfall nicht gefunden' });
        }
        // Build dynamic update query
        const allowedFields = [
            'title', 'description', 'priority', 'assigned_to',
            'tags', 'shared_with_team',
            // W2 server fields
            'waiting_on', 'next_action_at', 'sla_due_at'
        ];
        const updateFields = [];
        const updateValues = [];
        let paramCounter = 1;
        Object.keys(updates).forEach(key => {
            const dbField = key === 'assignedTo' ? 'assigned_to' :
                key === 'sharedWithTeam' ? 'shared_with_team' :
                    key === 'waitingOn' ? 'waiting_on' :
                        key === 'nextActionAt' ? 'next_action_at' :
                            key === 'slaDueAt' ? 'sla_due_at' : key;
            if (allowedFields.includes(dbField)) {
                updateFields.push(`${dbField} = $${paramCounter}`);
                updateValues.push(updates[key]);
                paramCounter++;
            }
        });
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'Keine gültigen Felder zum Aktualisieren gefunden' });
        }
        // Add audit fields
        updateFields.push(`last_modified_by = $${paramCounter}`);
        updateValues.push(((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'system');
        paramCounter++;
        updateFields.push(`version = version + 1`);
        // Add WHERE clause
        updateValues.push(id);
        const whereClause = `WHERE id = $${paramCounter} AND archived = FALSE`;
        const updateQuery = `
      UPDATE bilateral_clarifications 
      SET ${updateFields.join(', ')}
      ${whereClause}
      RETURNING *
    `;
        const result = await database_1.default.query(updateQuery, updateValues);
        const updatedClarification = formatClarification(result.rows[0]);
        console.log(`✅ Bilateral clarification updated: ${id} by user ${(_b = req.user) === null || _b === void 0 ? void 0 : _b.id}`);
        res.json({
            message: 'Klärfall erfolgreich aktualisiert',
            clarification: updatedClarification
        });
    }
    catch (error) {
        console.error('Error updating clarification:', error);
        res.status(500).json({
            error: 'Fehler beim Aktualisieren des Klärfalls',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// EMAILS: history, add, upload .eml, send-email, validate-email
// GET /:id/emails
router.get('/:id/emails', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const r = await database_1.default.query('SELECT * FROM clarification_emails WHERE clarification_id = $1 ORDER BY created_at ASC', [id]);
        res.json(r.rows.map(row => {
            var _a;
            return ({
                id: row.id,
                direction: row.direction,
                subject: row.subject,
                fromAddress: row.from_address,
                toAddresses: row.to_addresses || [],
                ccAddresses: row.cc_addresses || [],
                bccAddresses: row.bcc_addresses || [],
                content: row.content,
                contentType: row.content_type,
                emailType: row.email_type,
                isImportant: row.is_important,
                source: row.source,
                filePath: row.file_path,
                createdAt: (_a = row.created_at) === null || _a === void 0 ? void 0 : _a.toISOString()
            });
        }));
    }
    catch (error) {
        console.error('Error fetching email history:', error);
        res.status(500).json({ error: 'Fehler beim Laden der E-Mail-Historie' });
    }
});
// POST /:id/emails
router.post('/:id/emails', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { direction, subject, fromAddress, toAddresses, ccAddresses, bccAddresses, content, contentType, emailType, isImportant, source } = req.body;
        if (!direction || !content) {
            return res.status(400).json({ error: 'direction und content sind erforderlich' });
        }
        const insert = `INSERT INTO clarification_emails
      (clarification_id, direction, subject, from_address, to_addresses, cc_addresses, bcc_addresses, content, content_type, email_type, is_important, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, created_at`;
        const vals = [id, direction, subject || null, fromAddress || null, toAddresses || null, ccAddresses || null, bccAddresses || null, content, contentType || 'text', emailType || null, !!isImportant, source || 'API'];
        const r = await database_1.default.query(insert, vals);
        // Update last inbound/outbound timestamps and potentially waiting_on
        if (direction === 'INCOMING') {
            await database_1.default.query('UPDATE bilateral_clarifications SET last_inbound_at = NOW(), waiting_on = $1 WHERE id = $2', ['US', id]);
        }
        else if (direction === 'OUTGOING') {
            await database_1.default.query('UPDATE bilateral_clarifications SET last_outbound_at = NOW(), waiting_on = $1 WHERE id = $2', ['MP', id]);
        }
        res.json({ success: true, emailId: r.rows[0].id });
    }
    catch (error) {
        console.error('Error adding email:', error);
        res.status(500).json({ error: 'Fehler beim Hinzufügen der E-Mail' });
    }
});
// POST /:id/emails/upload (.eml)
router.post('/:id/emails/upload', auth_1.authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'Datei fehlt' });
        const insert = `INSERT INTO clarification_emails
      (clarification_id, direction, subject, from_address, content, content_type, email_type, is_important, source, file_path)
      VALUES ($1,'INCOMING',NULL,NULL,NULL,'mixed',NULL,FALSE,'IMPORT',$2) RETURNING id`;
        const r = await database_1.default.query(insert, [id, file.path]);
        await database_1.default.query('UPDATE bilateral_clarifications SET last_inbound_at = NOW(), waiting_on = $1 WHERE id = $2', ['US', id]);
        res.json({ success: true, emailId: r.rows[0].id });
    }
    catch (error) {
        console.error('Error uploading .eml:', error);
        res.status(500).json({ error: 'Fehler beim Hochladen der E-Mail' });
    }
});
// POST /:id/send-email
router.post('/:id/send-email', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, fromAddress, toAddresses, ccAddresses, bccAddresses, content } = req.body || {};
        // In this simplified implementation, we record the outgoing email and mark SENT
        const insert = `INSERT INTO clarification_emails
      (clarification_id, direction, subject, from_address, to_addresses, cc_addresses, bcc_addresses, content, content_type, email_type, is_important, source)
      VALUES ($1,'OUTGOING',$2,$3,$4,$5,$6,$7,'html','CLARIFICATION_REQUEST',FALSE,'API') RETURNING id`;
        await database_1.default.query(insert, [id, subject || '', fromAddress || null, toAddresses || null, ccAddresses || null, bccAddresses || null, content || '']);
        const update = `UPDATE bilateral_clarifications SET status = CASE WHEN status = 'READY_TO_SEND' THEN 'SENT' ELSE status END, last_outbound_at = NOW(), waiting_on = 'MP' WHERE id = $1`;
        await database_1.default.query(update, [id]);
        res.json({ success: true, sentAt: new Date().toISOString() });
    }
    catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Fehler beim Senden der E-Mail' });
    }
});
// (moved earlier) validate-email route
// ATTACHMENTS: list, upload, download
// GET /:id/attachments
router.get('/:id/attachments', auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const r = await database_1.default.query('SELECT id, filename, file_path, mime_type, file_size, uploaded_by, uploaded_at FROM clarification_attachments WHERE clarification_id = $1 ORDER BY uploaded_at DESC', [id]);
        res.json(r.rows.map(row => {
            var _a;
            return ({
                id: row.id,
                name: row.filename,
                path: row.file_path,
                mimeType: row.mime_type,
                size: row.file_size,
                uploadedBy: row.uploaded_by,
                uploadedAt: (_a = row.uploaded_at) === null || _a === void 0 ? void 0 : _a.toISOString()
            });
        }));
    }
    catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ error: 'Fehler beim Laden der Anhänge' });
    }
});
// POST /:id/attachments
router.post('/:id/attachments', auth_1.authenticateToken, upload.single('attachment'), async (req, res) => {
    var _a, _b;
    try {
        const { id } = req.params;
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: 'Datei fehlt' });
        const insert = `INSERT INTO clarification_attachments (clarification_id, filename, file_path, mime_type, file_size, uploaded_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, uploaded_at`;
        const r = await database_1.default.query(insert, [id, file.originalname, file.path, file.mimetype || null, file.size || null, ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || null]);
        res.json({ id: r.rows[0].id, name: file.originalname, uploadedAt: (_b = r.rows[0].uploaded_at) === null || _b === void 0 ? void 0 : _b.toISOString() });
    }
    catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ error: 'Fehler beim Hochladen des Anhangs' });
    }
});
// GET /attachments/:attachmentId/download
router.get('/attachments/:attachmentId/download', auth_1.authenticateToken, async (req, res) => {
    try {
        const { attachmentId } = req.params;
        const r = await database_1.default.query('SELECT filename, file_path, mime_type FROM clarification_attachments WHERE id = $1', [attachmentId]);
        if (r.rows.length === 0)
            return res.status(404).json({ error: 'Anhang nicht gefunden' });
        const row = r.rows[0];
        res.setHeader('Content-Type', row.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${row.filename}"`);
        const stream = fs_1.default.createReadStream(row.file_path);
        stream.on('error', () => res.status(500).end());
        stream.pipe(res);
    }
    catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ error: 'Fehler beim Download des Anhangs' });
    }
});
// Endpunkte für die Verwaltung von Referenzen (Chats, Notizen, etc.)
// Hinzufügen einer Chat-Referenz zu einem Klärfall
router.post('/:id/references/chat', auth_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { chatId, chatTitle } = req.body;
    const userId = req.user.id;
    try {
        if (!chatId) {
            return res.status(400).json({ message: 'Chat-ID ist erforderlich' });
        }
        // Prüfen, ob der Klärfall existiert und im Status "INTERNAL" ist
        const clarificationCheck = await database_1.default.query('SELECT id, status FROM bilateral_clarifications WHERE id = $1', [id]);
        if (clarificationCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Klärfall nicht gefunden' });
        }
        // Optional: Status prüfen - nur im Status "INTERNAL" erlauben
        if (clarificationCheck.rows[0].status !== 'INTERNAL') {
            return res.status(403).json({
                message: 'Referenzen können nur im Status INTERNAL hinzugefügt werden'
            });
        }
        // Prüfen, ob die Referenz bereits existiert
        const existingRef = await database_1.default.query('SELECT id FROM clarification_references WHERE clarification_id = $1 AND reference_type = $2 AND reference_id = $3', [id, 'CHAT', chatId]);
        if (existingRef.rows.length > 0) {
            return res.status(409).json({ message: 'Diese Chat-Referenz ist bereits verknüpft' });
        }
        // Neue Referenz einfügen
        const reference = await database_1.default.query(`INSERT INTO clarification_references (
        clarification_id, reference_type, reference_id, reference_value, reference_data
      ) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [id, 'CHAT', chatId, chatId, JSON.stringify({
                title: chatTitle,
                addedBy: userId,
                addedAt: new Date().toISOString()
            })]);
        // Aktivität protokollieren
        await database_1.default.query(`INSERT INTO clarification_activities (
        clarification_id, activity_type, activity_data, created_by
      ) VALUES ($1, $2, $3, $4)`, [id, 'REFERENCE_ADDED', JSON.stringify({
                referenceType: 'CHAT',
                referenceId: chatId,
                title: chatTitle
            }), userId]);
        res.status(201).json({
            success: true,
            message: 'Chat-Referenz hinzugefügt',
            referenceId: reference.rows[0].id
        });
    }
    catch (error) {
        console.error('Error adding chat reference:', error);
        res.status(500).json({ message: 'Fehler beim Hinzufügen der Chat-Referenz' });
    }
});
// Hinzufügen einer Notiz-Referenz zu einem Klärfall
router.post('/:id/references/note', auth_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { noteId, noteTitle } = req.body;
    const userId = req.user.id;
    try {
        if (!noteId) {
            return res.status(400).json({ message: 'Notiz-ID ist erforderlich' });
        }
        // Prüfen, ob der Klärfall existiert und im Status "INTERNAL" ist
        const clarificationCheck = await database_1.default.query('SELECT id, status FROM bilateral_clarifications WHERE id = $1', [id]);
        if (clarificationCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Klärfall nicht gefunden' });
        }
        // Optional: Status prüfen - nur im Status "INTERNAL" erlauben
        if (clarificationCheck.rows[0].status !== 'INTERNAL') {
            return res.status(403).json({
                message: 'Referenzen können nur im Status INTERNAL hinzugefügt werden'
            });
        }
        // Prüfen, ob die Referenz bereits existiert
        const existingRef = await database_1.default.query('SELECT id FROM clarification_references WHERE clarification_id = $1 AND reference_type = $2 AND reference_id = $3', [id, 'NOTE', noteId]);
        if (existingRef.rows.length > 0) {
            return res.status(409).json({ message: 'Diese Notiz-Referenz ist bereits verknüpft' });
        }
        // Neue Referenz einfügen
        const reference = await database_1.default.query(`INSERT INTO clarification_references (
        clarification_id, reference_type, reference_id, reference_value, reference_data
      ) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [id, 'NOTE', noteId, noteId, JSON.stringify({
                title: noteTitle,
                addedBy: userId,
                addedAt: new Date().toISOString()
            })]);
        // Aktivität protokollieren
        await database_1.default.query(`INSERT INTO clarification_activities (
        clarification_id, activity_type, activity_data, created_by
      ) VALUES ($1, $2, $3, $4)`, [id, 'REFERENCE_ADDED', JSON.stringify({
                referenceType: 'NOTE',
                referenceId: noteId,
                title: noteTitle
            }), userId]);
        res.status(201).json({
            success: true,
            message: 'Notiz-Referenz hinzugefügt',
            referenceId: reference.rows[0].id
        });
    }
    catch (error) {
        console.error('Error adding note reference:', error);
        res.status(500).json({ message: 'Fehler beim Hinzufügen der Notiz-Referenz' });
    }
});
// Löschen einer Referenz (Chat oder Notiz)
router.delete('/:id/references/:referenceId', auth_1.authenticateToken, async (req, res) => {
    var _a;
    const { id, referenceId } = req.params;
    const userId = req.user.id;
    try {
        // Prüfen, ob der Klärfall existiert und im Status "INTERNAL" ist
        const clarificationCheck = await database_1.default.query('SELECT id, status FROM bilateral_clarifications WHERE id = $1', [id]);
        if (clarificationCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Klärfall nicht gefunden' });
        }
        // Optional: Status prüfen - nur im Status "INTERNAL" erlauben
        if (clarificationCheck.rows[0].status !== 'INTERNAL') {
            return res.status(403).json({
                message: 'Referenzen können nur im Status INTERNAL entfernt werden'
            });
        }
        // Referenz auslesen für Protokollierung
        const referenceCheck = await database_1.default.query('SELECT reference_type, reference_id, reference_data FROM clarification_references WHERE id = $1 AND clarification_id = $2', [referenceId, id]);
        if (referenceCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Referenz nicht gefunden' });
        }
        const refData = referenceCheck.rows[0];
        // Referenz löschen
        await database_1.default.query('DELETE FROM clarification_references WHERE id = $1 AND clarification_id = $2', [referenceId, id]);
        // Aktivität protokollieren
        await database_1.default.query(`INSERT INTO clarification_activities (
        clarification_id, activity_type, activity_data, created_by
      ) VALUES ($1, $2, $3, $4)`, [id, 'REFERENCE_REMOVED', JSON.stringify({
                referenceType: refData.reference_type,
                referenceId: refData.reference_id,
                title: ((_a = refData.reference_data) === null || _a === void 0 ? void 0 : _a.title) || 'Unbekannt'
            }), userId]);
        res.status(200).json({ success: true, message: 'Referenz entfernt' });
    }
    catch (error) {
        console.error('Error removing reference:', error);
        res.status(500).json({ message: 'Fehler beim Entfernen der Referenz' });
    }
});
// Abrufen aller Referenzen für einen Klärfall
router.get('/:id/references', auth_1.authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { type } = req.query;
    try {
        let query = `
      SELECT id, reference_type, reference_id, reference_data, created_at
      FROM clarification_references
      WHERE clarification_id = $1
    `;
        const params = [id];
        if (type) {
            query += ' AND reference_type = $2';
            params.push(type);
        }
        query += ' ORDER BY created_at DESC';
        const result = await database_1.default.query(query, params);
        res.json({
            success: true,
            references: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching references:', error);
        res.status(500).json({ message: 'Fehler beim Abrufen der Referenzen' });
    }
});
// API-Endpunkte für den umgekehrten Blick: Klärfälle zu einer Referenz (Chat oder Notiz) finden
// Abrufen aller Klärfälle, die mit einem bestimmten Chat verknüpft sind
router.get('/linked-to-chat/:chatId', auth_1.authenticateToken, async (req, res) => {
    const { chatId } = req.params;
    try {
        const query = `
      SELECT bc.id, bc.title, bc.status, bc.priority, bc.created_at, bc.market_partner_name,
             cr.id as reference_id
      FROM bilateral_clarifications bc
      JOIN clarification_references cr ON bc.id = cr.clarification_id
      WHERE cr.reference_type = 'CHAT' AND cr.reference_id = $1
      ORDER BY bc.updated_at DESC
    `;
        const result = await database_1.default.query(query, [chatId]);
        res.json({
            success: true,
            linkedClarifications: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                status: row.status,
                priority: row.priority,
                createdAt: row.created_at,
                marketPartnerName: row.market_partner_name,
                referenceId: row.reference_id
            }))
        });
    }
    catch (error) {
        console.error('Error fetching clarifications linked to chat:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Abrufen der verknüpften Klärfälle'
        });
    }
});
// Abrufen aller Klärfälle, die mit einer bestimmten Notiz verknüpft sind
router.get('/linked-to-note/:noteId', auth_1.authenticateToken, async (req, res) => {
    const { noteId } = req.params;
    try {
        const query = `
      SELECT bc.id, bc.title, bc.status, bc.priority, bc.created_at, bc.market_partner_name,
             cr.id as reference_id
      FROM bilateral_clarifications bc
      JOIN clarification_references cr ON bc.id = cr.clarification_id
      WHERE cr.reference_type = 'NOTE' AND cr.reference_id = $1
      ORDER BY bc.updated_at DESC
    `;
        const result = await database_1.default.query(query, [noteId]);
        res.json({
            success: true,
            linkedClarifications: result.rows.map(row => ({
                id: row.id,
                title: row.title,
                status: row.status,
                priority: row.priority,
                createdAt: row.created_at,
                marketPartnerName: row.market_partner_name,
                referenceId: row.reference_id
            }))
        });
    }
    catch (error) {
        console.error('Error fetching clarifications linked to note:', error);
        res.status(500).json({
            success: false,
            message: 'Fehler beim Abrufen der verknüpften Klärfälle'
        });
    }
});
exports.default = router;
//# sourceMappingURL=bilateral-clarifications-simple.js.map