/**
 * Test für CR-WMAKO-001 Implementation
 * Testet die neuen Services und API-Endpunkte
 */

const test = require('tape');
const request = require('supertest');
const { Pool } = require('pg');

// Test-Konfiguration
const testConfig = {
    dbUrl: process.env.DATABASE_URL,
    apiUrl: 'http://localhost:3009'
};

const pool = new Pool({
    connectionString: testConfig.dbUrl,
});

// Test-Daten
const testTeamConfig = {
    autoProcessingEnabled: true,
    imapHost: 'imap.test.com',
    imapPort: 993,
    imapUseSSL: true,
    imapUsername: 'test@test.com',
    imapPassword: 'testpassword',
    outboundEmailAddress: 'team@test.com',
    processingRules: {
        autoCreateClarifications: true,
        requireManagerApproval: false
    }
};

const testEmailData = {
    subject: 'Klärfall für MaLo-ID 123456789',
    text: 'Hallo, wir haben ein Problem mit der MaLo-ID 123456789. Zählerstand ist 1234 kWh. Bitte um Klärung.',
    from: 'partner@energieversorger.de',
    date: new Date(),
    messageId: 'test-message-123'
};

const testBulkClarification = {
    title: 'Test Bulk-Klärung',
    description: 'Test-Beschreibung für Bulk-Klärung',
    category: 'billing',
    priority: 'normal',
    teamId: '1',
    items: [
        {
            title: 'Eintrag 1',
            description: 'Beschreibung für Eintrag 1',
            referenceData: { maloId: '123456789' }
        },
        {
            title: 'Eintrag 2', 
            description: 'Beschreibung für Eintrag 2',
            referenceData: { maloId: '987654321' }
        }
    ]
};

// Helper-Funktionen
async function createTestTeam() {
    const result = await pool.query(`
        INSERT INTO teams (name, description, created_at)
        VALUES ('Test Team CR-WMAKO-001', 'Test Team für CR-WMAKO-001', NOW())
        RETURNING id
    `);
    return result.rows[0].id;
}

async function cleanupTestData(teamId) {
    try {
        await pool.query('DELETE FROM team_email_configs WHERE team_id = $1', [teamId]);
        await pool.query('DELETE FROM email_processing_queue WHERE team_id = $1', [teamId]);
        await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Tests
test('CR-WMAKO-001: Datenbank-Setup', async (t) => {
    try {
        // Prüfe ob alle neuen Tabellen existieren
        const tables = [
            'team_email_configs',
            'email_processing_queue', 
            'bulk_clarification_items',
            'llm_extraction_cache',
            'clarification_references'
        ];

        for (const table of tables) {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )
            `, [table]);
            
            t.ok(result.rows[0].exists, `Tabelle ${table} existiert`);
        }

        // Prüfe neue Spalten in bestehenden Tabellen
        const columnCheck = await pool.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'bilateral_clarifications' 
            AND column_name IN ('clarification_type', 'auto_created', 'source_email_id')
        `);
        
        t.equal(columnCheck.rows.length, 3, 'Alle neuen Spalten in bilateral_clarifications vorhanden');
        
    } catch (error) {
        t.fail(`Datenbank-Setup Test fehlgeschlagen: ${error.message}`);
    }
    
    t.end();
});

test('CR-WMAKO-001: LLM Data Extraction Service', async (t) => {
    try {
        const LLMDataExtractionService = require('../src/services/llmDataExtractionService');
        const service = new LLMDataExtractionService();
        
        // Test der Datenextraktion (Mock-Daten)
        const extractedData = await service.extractDataFromEmail(testEmailData, '1');
        
        t.ok(extractedData, 'LLM-Service gibt Daten zurück');
        t.ok(extractedData.referenzen, 'Referenzen wurden extrahiert');
        t.ok(extractedData.klassifikation, 'Klassifikation wurde durchgeführt');
        t.ok(typeof extractedData.confidence === 'number', 'Confidence-Wert ist vorhanden');
        
    } catch (error) {
        t.fail(`LLM-Service Test fehlgeschlagen: ${error.message}`);
    }
    
    t.end();
});

test('CR-WMAKO-001: Auto-Klärfall Service', async (t) => {
    try {
        const AutoKlärfallService = require('../src/services/autoKlärfallService');
        const service = new AutoKlärfallService();
        
        // Mock LLM-Daten
        const mockExtractedData = {
            marktpartner: { name: 'Test Partner', domain: 'test.de' },
            referenzen: { vorgangsnummern: ['123456'], zählpunkte: ['DE0001'] },
            klassifikation: { kategorie: 'Abrechnung', priorität: 'Normal' },
            confidence: 0.8
        };
        
        // Health Check
        const health = await service.healthCheck();
        t.equal(health.status, 'healthy', 'Auto-Klärfall Service ist gesund');
        
    } catch (error) {
        t.fail(`Auto-Klärfall Service Test fehlgeschlagen: ${error.message}`);
    }
    
    t.end();
});

test('CR-WMAKO-001: Team E-Mail Konfiguration API', async (t) => {
    let teamId;
    
    try {
        // Test-Team erstellen
        teamId = await createTestTeam();
        
        // TODO: API-Tests hier, wenn Server läuft
        // const response = await request(testConfig.apiUrl)
        //     .get(`/api/teams/${teamId}/email-config`)
        //     .expect(200);
        
        t.pass('Team erstellt für API-Tests');
        
    } catch (error) {
        t.fail(`API Test fehlgeschlagen: ${error.message}`);
    } finally {
        if (teamId) {
            await cleanupTestData(teamId);
        }
    }
    
    t.end();
});

test('CR-WMAKO-001: Performance Test - Cache-Funktionalität', async (t) => {
    try {
        const LLMDataExtractionService = require('../src/services/llmDataExtractionService');
        const service = new LLMDataExtractionService();
        
        // Teste Cache-Schlüssel-Generierung
        const cacheKey1 = service.generateCacheKey(testEmailData);
        const cacheKey2 = service.generateCacheKey(testEmailData);
        
        t.equal(cacheKey1, cacheKey2, 'Cache-Schlüssel sind konsistent');
        t.ok(typeof cacheKey1 === 'string' && cacheKey1.length > 0, 'Cache-Schlüssel ist valide');
        
    } catch (error) {
        t.fail(`Performance Test fehlgeschlagen: ${error.message}`);
    }
    
    t.end();
});

// Cleanup und Ende
test('CR-WMAKO-001: Cleanup', async (t) => {
    try {
        await pool.end();
        t.pass('Test-Cleanup abgeschlossen');
    } catch (error) {
        t.fail(`Cleanup fehlgeschlagen: ${error.message}`);
    }
    
    t.end();
});

// Export für manuelle Ausführung
module.exports = {
    testConfig,
    testTeamConfig,
    testEmailData,
    testBulkClarification,
    createTestTeam,
    cleanupTestData
};
