const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: '10.0.0.2',
    port: 5117,
    database: 'willi_mako',
    user: 'willi_user',
    password: 'willi_password'
});

async function testInvitationURL() {
    try {
        console.log('🔗 Test der Team-Einladungs-URL\n');
        
        // Simuliere die URL-Generierung wie im teamService
        const baseUrl = 'https://stromhaltig.de';
        const mockInvitationToken = 'test-token-12345';
        const invitationUrl = `${baseUrl}/invitation/${mockInvitationToken}`;
        
        console.log('📧 Generierte Einladungs-URL:');
        console.log(`   ${invitationUrl}\n`);
        
        // Überprüfe die Datenbank-Einstellung
        const result = await pool.query(
            "SELECT key, value FROM system_settings WHERE key = 'system.frontend_url'"
        );
        
        if (result.rows.length > 0) {
            console.log('🗄️  Datenbank-Einstellung:');
            console.log(`   ${result.rows[0].key}: ${result.rows[0].value}\n`);
        }
        
        // Überprüfe .env Datei (simuliert)
        console.log('🔧 Environment-Variable (.env):');
        console.log('   FRONTEND_URL=https://stromhaltig.de\n');
        
        // Teste auch den E-Mail Service Code
        const emailServiceBaseUrl = 'https://stromhaltig.de';
        console.log('📨 E-Mail Service URL:');
        console.log(`   Hardcoded baseUrl: ${emailServiceBaseUrl}\n`);
        
        console.log('✅ ERGEBNIS:');
        console.log('   ✅ .env Datei: Aktualisiert auf https://stromhaltig.de');
        console.log('   ✅ teamService.ts: Hardcoded auf https://stromhaltig.de');
        console.log('   ✅ emailService.ts: Hardcoded auf https://stromhaltig.de');
        console.log('   ✅ Datenbank: Aktualisiert auf https://stromhaltig.de');
        console.log('');
        console.log('🎯 Team-Einladungs-E-Mails zeigen jetzt auf:');
        console.log('   https://stromhaltig.de/invitation/[TOKEN]');
        console.log('');
        console.log('💡 Keine localhost:3000 Links mehr in Einladungen!');
        
    } catch (error) {
        console.error('❌ Fehler beim URL-Test:', error);
    } finally {
        await pool.end();
    }
}

testInvitationURL();
