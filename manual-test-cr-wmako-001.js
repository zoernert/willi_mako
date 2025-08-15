/**
 * Manuelle Tests für CR-WMAKO-001 Services
 * Kann direkt mit Node.js ausgeführt werden
 */

const { Pool } = require('pg');

// Test-Datenbank-Verbindung
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function testDatabaseSetup() {
    console.log('🔍 Teste Datenbank-Setup...');
    
    try {
        // Teste ob alle neuen Tabellen existieren
        const tables = [
            'team_email_configs',
            'email_processing_queue', 
            'bulk_clarification_items',
            'llm_extraction_cache',
            'clarification_references'
        ];

        console.log('📋 Prüfe Tabellen:');
        for (const table of tables) {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = $1
                )
            `, [table]);
            
            const exists = result.rows[0].exists;
            console.log(`  ${exists ? '✅' : '❌'} ${table}`);
        }

        // Prüfe neue Spalten
        console.log('\n📋 Prüfe neue Spalten in bilateral_clarifications:');
        const columns = ['clarification_type', 'auto_created', 'source_email_id', 'bulk_items'];
        
        for (const column of columns) {
            const result = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'bilateral_clarifications' AND column_name = $1
                )
            `, [column]);
            
            const exists = result.rows[0].exists;
            console.log(`  ${exists ? '✅' : '❌'} ${column}`);
        }

    } catch (error) {
        console.error('❌ Datenbank-Test fehlgeschlagen:', error.message);
    }
}

async function testLLMService() {
    console.log('\n🤖 Teste LLM Data Extraction Service...');
    
    try {
        const LLMDataExtractionService = require('./src/services/llmDataExtractionService');
        const service = new LLMDataExtractionService();
        
        // Test-E-Mail
        const testEmail = {
            subject: 'Klärfall MaLo-ID 123456789',
            text: 'Hallo, Problem mit MaLo-ID 123456789. Zählerstand: 1234 kWh.',
            from: 'partner@test.de',
            date: new Date()
        };
        
        console.log('📧 Test-E-Mail:', testEmail.subject);
        
        // Health Check
        const health = await service.healthCheck();
        console.log('🏥 Service Health:', health.status);
        
        // Cache-Key Test
        const cacheKey = service.generateCacheKey(testEmail);
        console.log('🔑 Cache-Key generiert:', cacheKey.substring(0, 8) + '...');
        
        console.log('✅ LLM Service Tests erfolgreich');
        
    } catch (error) {
        console.error('❌ LLM Service Test fehlgeschlagen:', error.message);
    }
}

async function testAutoKlärfallService() {
    console.log('\n🚀 Teste Auto-Klärfall Service...');
    
    try {
        const AutoKlärfallService = require('./src/services/autoKlärfallService');
        const service = new AutoKlärfallService();
        
        // Health Check
        const health = await service.healthCheck();
        console.log('🏥 Service Health:', health.status);
        
        // Test Mapping-Funktionen
        const category = service.mapCategory('Abrechnung');
        const priority = service.mapPriority('Hoch');
        const effort = service.mapEffort('Mittel');
        
        console.log('🗂️  Mapping Tests:');
        console.log(`  Kategorie: Abrechnung → ${category}`);
        console.log(`  Priorität: Hoch → ${priority}`);
        console.log(`  Aufwand: Mittel → ${effort}`);
        
        console.log('✅ Auto-Klärfall Service Tests erfolgreich');
        
    } catch (error) {
        console.error('❌ Auto-Klärfall Service Test fehlgeschlagen:', error.message);
    }
}

async function testTeamEmailConfig() {
    console.log('\n📧 Teste Team E-Mail Konfiguration...');
    
    try {
        // Erstelle Test-Team
        const teamResult = await pool.query(`
            INSERT INTO teams (name, description, created_at)
            VALUES ('Test Team CR-WMAKO-001', 'Test für CR-WMAKO-001', NOW())
            RETURNING id
        `);
        
        const teamId = teamResult.rows[0].id;
        console.log('👥 Test-Team erstellt:', teamId);
        
        // Teste Team E-Mail Config
        await pool.query(`
            INSERT INTO team_email_configs (
                team_id, 
                auto_processing_enabled, 
                imap_host, 
                imap_username,
                outbound_email_address,
                created_at
            ) VALUES ($1, true, 'imap.test.com', 'test@test.com', 'team@test.com', NOW())
        `, [teamId]);
        
        console.log('📧 E-Mail-Konfiguration erstellt');
        
        // Lade Konfiguration
        const configResult = await pool.query(`
            SELECT * FROM team_email_configs WHERE team_id = $1
        `, [teamId]);
        
        if (configResult.rows.length > 0) {
            console.log('✅ Konfiguration erfolgreich gespeichert und geladen');
        }
        
        // Cleanup
        await pool.query('DELETE FROM team_email_configs WHERE team_id = $1', [teamId]);
        await pool.query('DELETE FROM teams WHERE id = $1', [teamId]);
        console.log('🧹 Test-Daten bereinigt');
        
    } catch (error) {
        console.error('❌ Team E-Mail Config Test fehlgeschlagen:', error.message);
    }
}

async function testBulkClarifications() {
    console.log('\n📝 Teste Bulk-Klärfälle...');
    
    try {
        // Erstelle Test-Bulk-Klärfall
        const clarificationResult = await pool.query(`
            INSERT INTO bilateral_clarifications (
                title, 
                description, 
                clarification_type, 
                created_at,
                created_by
            ) VALUES (
                'Test Bulk-Klärung', 
                'Test für Bulk-Klärungen', 
                'sammelklärung', 
                NOW(),
                (SELECT id FROM users LIMIT 1)
            ) RETURNING id
        `);
        
        const clarificationId = clarificationResult.rows[0].id;
        console.log('📋 Bulk-Klärfall erstellt:', clarificationId);
        
        // Erstelle Test-Items
        for (let i = 1; i <= 3; i++) {
            await pool.query(`
                INSERT INTO bulk_clarification_items (
                    clarification_id,
                    item_index,
                    title,
                    description,
                    reference_data,
                    status,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, 'offen', NOW())
            `, [
                clarificationId,
                i,
                `Test-Eintrag ${i}`,
                `Beschreibung für Eintrag ${i}`,
                JSON.stringify({ maloId: `12345678${i}` })
            ]);
        }
        
        console.log('📝 3 Test-Einträge erstellt');
        
        // Lade Items
        const itemsResult = await pool.query(`
            SELECT * FROM bulk_clarification_items 
            WHERE clarification_id = $1 
            ORDER BY item_index
        `, [clarificationId]);
        
        console.log(`✅ ${itemsResult.rows.length} Einträge erfolgreich geladen`);
        
        // Cleanup
        await pool.query('DELETE FROM bulk_clarification_items WHERE clarification_id = $1', [clarificationId]);
        await pool.query('DELETE FROM bilateral_clarifications WHERE id = $1', [clarificationId]);
        console.log('🧹 Test-Daten bereinigt');
        
    } catch (error) {
        console.error('❌ Bulk-Klärfall Test fehlgeschlagen:', error.message);
    }
}

async function runAllTests() {
    console.log('🚀 Starting CR-WMAKO-001 Manual Tests');
    console.log('=====================================\n');
    
    await testDatabaseSetup();
    await testLLMService();
    await testAutoKlärfallService();
    await testTeamEmailConfig();
    await testBulkClarifications();
    
    console.log('\n🎉 Alle Tests abgeschlossen!');
    console.log('=====================================');
    
    await pool.end();
}

// Führe Tests aus wenn direkt aufgerufen
if (require.main === module) {
    runAllTests().catch(console.error);
}

module.exports = {
    testDatabaseSetup,
    testLLMService,
    testAutoKlärfallService,
    testTeamEmailConfig,
    testBulkClarifications,
    runAllTests
};
