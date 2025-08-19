// Simplified Express Router für Bilaterale Klärfälle API
// Temporary implementation to get the bilateral clarifications working

import express from 'express';
import pool from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

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
          
      -- Create references table for storing links to external data sources
      CREATE TABLE IF NOT EXISTS clarification_references (
          id SERIAL PRIMARY KEY,
          clarification_id INTEGER NOT NULL REFERENCES bilateral_clarifications(id) ON DELETE CASCADE,
          reference_type VARCHAR(50) NOT NULL, -- 'CHAT', 'MESSAGE_ANALYZER', 'EMAIL', etc.
          reference_id VARCHAR(255) NOT NULL,  -- External identifier (chatId, messageId, etc.)
          reference_data JSONB,                -- Additional context data
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ bilateral_clarifications table initialized');
  } catch (error) {
    console.error('Error initializing bilateral_clarifications table:', error);
  }
};

// Initialize table on startup
initializeTable();

// Format clarification for API response
const formatClarification = (row: any) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  caseType: row.case_type,
  status: row.status,
  priority: row.priority,
  createdBy: row.created_by,
  assignedTo: row.assigned_to,
  createdAt: row.created_at?.toISOString(),
  updatedAt: row.updated_at?.toISOString(),
  dueDate: row.due_date?.toISOString(),
  resolutionDate: row.resolution_date?.toISOString(),
  resolutionNotes: row.resolution_notes,
  tags: row.tags || [],
  sharedWithTeam: row.shared_with_team,
  teamId: row.team_id,
  externalCaseId: row.external_case_id,
  sourceSystem: row.source_system,
  version: row.version,
  lastModifiedBy: row.last_modified_by,
  archived: row.archived,
  archivedAt: row.archived_at?.toISOString(),
  
  // New bilateral clarification fields
  marketPartner: row.market_partner_data,
  selectedRole: row.selected_role,
  selectedContact: row.selected_contact,
  dataExchangeReference: row.data_exchange_reference,
  internalStatus: row.internal_status,
  
  // Computed fields
  isOverdue: row.due_date && new Date(row.due_date) < new Date() && row.status !== 'CLOSED' && row.status !== 'RESOLVED',
  daysSinceCreated: Math.floor((new Date().getTime() - new Date(row.created_at).getTime()) / (1000 * 60 * 60 * 24))
});

// GET /api/bilateral-clarifications
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const offset = (page - 1) * pageSize;

    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) as total FROM bilateral_clarifications WHERE archived = FALSE');
    const total = parseInt(countResult.rows[0].total);

    // Get clarifications
    const query = `
      SELECT * FROM bilateral_clarifications 
      WHERE archived = FALSE 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await pool.query(query, [pageSize, offset]);
    
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
    const summaryResult = await pool.query(summaryQuery);
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
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({
      error: 'Fehler beim Laden der Klärfälle',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /api/bilateral-clarifications
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      description,
      marketPartner,
      selectedRole,
      selectedContact,
      dataExchangeReference,
      priority = 'MEDIUM',
      assignedTo,
      tags = []
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ error: 'Titel ist erforderlich' });
    }
    
    if (!marketPartner) {
      return res.status(400).json({ error: 'Marktpartner ist erforderlich' });
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
      req.user?.id || 'system',
      assignedTo || null,
      tags,
      'MANUAL',
      (req.user as any)?.teamId || null,
      req.user?.id || 'system',
      JSON.stringify(marketPartner),
      JSON.stringify(selectedRole),
      JSON.stringify(selectedContact),
      JSON.stringify(dataExchangeReference),
      'DRAFT'
    ];

    const result = await pool.query(insertQuery, values);
    const newClarification = formatClarification(result.rows[0]);

    console.log(`✅ Bilateral clarification created: ${newClarification.id} by user ${req.user?.id}`);

    res.status(201).json({
      message: 'Klärfall erfolgreich erstellt',
      clarification: newClarification
    });

  } catch (error) {
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
    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Klärfall nicht gefunden' });
    }

    const clarification = formatClarification(result.rows[0]);
    
    // Add timeline data for the frontend
    const responseData = {
      ...clarification,
      notes: [] as any[], // Mock notes data - replace with real database queries
      emails: [] as any[], // Mock emails data - replace with real database queries
      attachments: [] as any[] // Mock attachments data - replace with real database queries
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error fetching clarification:', error);
    res.status(500).json({
      error: 'Fehler beim Laden des Klärfalls',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Context Transfer Endpoints
router.post('/from-chat-context', authenticateToken, async (req, res) => {
  try {
    const { context, clarification } = req.body;
    
    console.log('Creating clarification from chat context:', {
      source: context.source,
      chatId: context.chatContext?.chatId,
      messageId: context.chatContext?.messageId,
      contentLength: context.chatContext?.content?.length,
      suggested: {
        title: context.suggestedTitle,
        marketPartner: context.suggestedMarketPartner,
        caseType: context.suggestedCaseType,
        priority: context.suggestedPriority
      }
    });

    // Create actual clarification in the database (no longer a mock)
    const now = new Date();
    const title = context.suggestedTitle || clarification.title || 'Chat-basierte Klärung';
    const description = context.suggestedDescription || clarification.description || '';
    const marketPartnerCode = context.suggestedMarketPartner?.code || clarification.marketPartnerCode || '';
    const marketPartnerName = context.suggestedMarketPartner?.name || clarification.marketPartnerName || '';
    const caseType = context.suggestedCaseType || clarification.caseType || 'GENERAL';
    const priority = context.suggestedPriority || clarification.priority || 'MEDIUM';
    const userId = req.user?.id || 'system';
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
    } catch (err) {
      console.warn('Failed to parse tags, using empty array:', err);
    }

    // Doppelter JSON.stringify-Schutz: Stellen Sie sicher, dass wir ein gültiges JSON-Array haben
    const tagsJson = JSON.stringify(tagsArray);
    console.log('Tags for insertion:', tagsJson);

    // Insert into database
    const insertResult = await pool.query(
      `INSERT INTO bilateral_clarifications (
        title, description, market_partner_code, market_partner_name, case_type, status,
        priority, created_by, created_at, updated_at, tags, shared_with_team, source_system,
        version, archived, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16) RETURNING id`,
      [
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
        'CHAT', // Mark source as CHAT
        1,
        false,
        assignedTo
      ]
    );

    const clarificationId = insertResult.rows[0].id;
    
    // Create reference to chat context
    if (context.chatContext?.chatId) {
      await pool.query(
        `INSERT INTO clarification_references (
          clarification_id, reference_type, reference_id, reference_data
        ) VALUES ($1, $2, $3, $4)`,
        [
          clarificationId,
          'CHAT',
          context.chatContext.chatId,
          JSON.stringify({
            chatId: context.chatContext.chatId,
            messageId: context.chatContext.messageId,
            timestamp: now.toISOString()
          })
        ]
      );
    }

    // Bei bilateralen Klärungen müssen wir zusätzliche Objekte verarbeiten
    try {
      // Marktpartner und DataExchangeReference in die Datenbank speichern
      if (clarification.marketPartner) {
        const marketPartnerData = JSON.stringify(clarification.marketPartner);
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'MARKET_PARTNER',
            marketPartnerData
          ]
        );
      }

      if (clarification.dataExchangeReference) {
        const darData = JSON.stringify(clarification.dataExchangeReference);
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'DATA_EXCHANGE_REFERENCE',
            darData
          ]
        );
      }

      if (clarification.selectedRole) {
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'SELECTED_ROLE',
            JSON.stringify({role: clarification.selectedRole})
          ]
        );
      }

      if (clarification.selectedContact) {
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'SELECTED_CONTACT',
            JSON.stringify(clarification.selectedContact)
          ]
        );
      }
    } catch (additionalDataError) {
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
  } catch (error) {
    console.error('Error creating clarification from chat context:', error);
    res.status(500).json({
      error: 'Fehler beim Erstellen der Klärung aus Chat-Kontext',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/from-analyzer-context', authenticateToken, async (req, res) => {
  try {
    const { context, clarification } = req.body;
    
    console.log('Creating clarification from analyzer context:', {
      source: context.source,
      messageLength: context.messageAnalyzerContext?.originalMessage?.length,
      analysisFormat: context.messageAnalyzerContext?.analysisResult?.format,
      segmentsCount: context.messageAnalyzerContext?.analysisResult?.segments?.length,
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
    const marketPartnerCode = context.suggestedMarketPartner?.code || clarification.marketPartnerCode || '';
    const marketPartnerName = context.suggestedMarketPartner?.name || clarification.marketPartnerName || '';
    const caseType = context.suggestedCaseType || clarification.caseType || 'TECHNICAL';
    const priority = context.suggestedPriority || clarification.priority || 'MEDIUM';
    const userId = req.user?.id || 'system';
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
    const insertResult = await pool.query(
      `INSERT INTO bilateral_clarifications (
        title, description, market_partner_code, market_partner_name, case_type, status,
        priority, created_by, created_at, updated_at, tags, shared_with_team, source_system,
        version, archived, assigned_to
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, $16) RETURNING id`,
      [
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
      ]
    );

    const clarificationId = insertResult.rows[0].id;
    
    // Create reference to analyzer context
    if (context.messageAnalyzerContext?.originalMessage) {
      await pool.query(
        `INSERT INTO clarification_references (
          clarification_id, reference_type, reference_id, reference_data
        ) VALUES ($1, $2, $3, $4)`,
        [
          clarificationId,
          'MESSAGE_ANALYZER',
          `message_${Date.now()}`, // Generate a unique ID
          JSON.stringify({
            originalMessage: context.messageAnalyzerContext.originalMessage.substring(0, 1000), // Truncate long messages
            analysisResult: context.messageAnalyzerContext.analysisResult,
            timestamp: now.toISOString()
          })
        ]
      );
    }

    // Bei bilateralen Klärungen müssen wir zusätzliche Objekte verarbeiten
    try {
      // Marktpartner und DataExchangeReference in die Datenbank speichern
      if (clarification.marketPartner) {
        const marketPartnerData = JSON.stringify(clarification.marketPartner);
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'MARKET_PARTNER',
            marketPartnerData
          ]
        );
      }

      if (clarification.dataExchangeReference) {
        const darData = JSON.stringify(clarification.dataExchangeReference);
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'DATA_EXCHANGE_REFERENCE',
            darData
          ]
        );
      }

      if (clarification.selectedRole) {
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'SELECTED_ROLE',
            JSON.stringify({role: clarification.selectedRole})
          ]
        );
      }

      if (clarification.selectedContact) {
        await pool.query(
          `INSERT INTO clarification_additional_data (
            clarification_id, data_type, data
          ) VALUES ($1, $2, $3)`,
          [
            clarificationId,
            'SELECTED_CONTACT',
            JSON.stringify(clarification.selectedContact)
          ]
        );
      }
    } catch (additionalDataError) {
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
  } catch (error) {
    console.error('Error creating clarification from analyzer context:', error);
    res.status(500).json({
      error: 'Fehler beim Erstellen der Klärung aus Analyzer-Kontext',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PATCH /api/bilateral-clarifications/:id/status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, internalStatus, reason } = req.body;

    // Validate required fields
    if (!status) {
      return res.status(400).json({ error: 'Status ist erforderlich' });
    }

    // Check if clarification exists
    const checkQuery = 'SELECT * FROM bilateral_clarifications WHERE id = $1 AND archived = FALSE';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Klärfall nicht gefunden' });
    }

    const updateQuery = `
      UPDATE bilateral_clarifications 
      SET status = $1, internal_status = $2, last_modified_by = $3, version = version + 1
      WHERE id = $4 AND archived = FALSE
      RETURNING *
    `;

    const values = [
      status,
      internalStatus || status,
      req.user?.id || 'system',
      id
    ];

    const result = await pool.query(updateQuery, values);
    const updatedClarification = formatClarification(result.rows[0]);

    console.log(`✅ Bilateral clarification status updated: ${id} to ${status} by user ${req.user?.id}`);

    res.json({
      message: 'Status erfolgreich aktualisiert',
      clarification: updatedClarification
    });

  } catch (error) {
    console.error('Error updating clarification status:', error);
    res.status(500).json({
      error: 'Fehler beim Aktualisieren des Status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// PUT /api/bilateral-clarifications/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Check if clarification exists
    const checkQuery = 'SELECT * FROM bilateral_clarifications WHERE id = $1 AND archived = FALSE';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Klärfall nicht gefunden' });
    }

    // Build dynamic update query
    const allowedFields = [
      'title', 'description', 'priority', 'assigned_to', 
      'tags', 'shared_with_team'
    ];
    
    const updateFields = [];
    const updateValues = [];
    let paramCounter = 1;

    Object.keys(updates).forEach(key => {
      const dbField = key === 'assignedTo' ? 'assigned_to' : 
                     key === 'sharedWithTeam' ? 'shared_with_team' : key;
      
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
    updateValues.push(req.user?.id || 'system');
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

    const result = await pool.query(updateQuery, updateValues);
    const updatedClarification = formatClarification(result.rows[0]);

    console.log(`✅ Bilateral clarification updated: ${id} by user ${req.user?.id}`);

    res.json({
      message: 'Klärfall erfolgreich aktualisiert',
      clarification: updatedClarification
    });

  } catch (error) {
    console.error('Error updating clarification:', error);
    res.status(500).json({
      error: 'Fehler beim Aktualisieren des Klärfalls',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
