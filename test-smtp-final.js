const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
    host: '10.0.0.2',
    port: 5117,
    database: 'willi_mako',
    user: 'willi_user',
    password: 'willi_password'
});

async function getSmtpSettings() {
    try {
        const result = await pool.query(
            "SELECT key, value FROM system_settings WHERE key LIKE 'smtp.%'"
        );
        
        const settings = {};
        result.rows.forEach(row => {
            const key = row.key.replace('smtp.', '');
            settings[key] = row.value;
        });
        
        return settings;
    } catch (error) {
        console.error('❌ Fehler beim Laden der SMTP-Einstellungen:', error);
        throw error;
    }
}

async function testSmtp() {
    try {
        console.log('🔄 Lade SMTP-Einstellungen aus der Datenbank...');
        const settings = await getSmtpSettings();
        
        console.log('📧 SMTP-Konfiguration:');
        console.log(`   Host: ${settings.host}`);
        console.log(`   Port: ${settings.port}`);
        console.log(`   User: ${settings.user}`);
        console.log(`   Secure: ${settings.secure}`);
        console.log(`   From Email: ${settings.from_email}`);
        console.log(`   From Name: ${settings.from_name}`);
        
        // Create transporter
        const transporter = nodemailer.createTransport({
            host: settings.host,
            port: parseInt(settings.port),
            secure: settings.secure === 'true',
            auth: {
                user: settings.user,
                pass: settings.password
            },
            debug: true,
            logger: true
        });
        
        console.log('\n🔄 Teste SMTP-Verbindung...');
        await transporter.verify();
        console.log('✅ SMTP-Verbindung erfolgreich!');
        
        // Send test email
        console.log('\n📤 Sende Test-E-Mail...');
        const info = await transporter.sendMail({
            from: `${settings.from_name} <${settings.from_email}>`,
            to: 'zoerner@gmail.com',
            subject: 'SMTP Test - Finale Konfiguration',
            html: `
                <h2>🎉 SMTP Test erfolgreich!</h2>
                <p>Diese E-Mail wurde erfolgreich von <strong>${settings.from_email}</strong> versendet.</p>
                <p><strong>Konfiguration:</strong></p>
                <ul>
                    <li>SMTP Host: ${settings.host}</li>
                    <li>Port: ${settings.port}</li>
                    <li>Secure: ${settings.secure}</li>
                    <li>Absender: ${settings.from_email}</li>
                </ul>
                <p>Datum: ${new Date().toLocaleString('de-DE')}</p>
                <hr>
                <p><em>Willi Mako Team-Einladungssystem</em></p>
            `,
            text: `SMTP Test erfolgreich! Diese E-Mail wurde von ${settings.from_email} versendet am ${new Date().toLocaleString('de-DE')}.`
        });
        
        console.log('✅ E-Mail erfolgreich gesendet!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        
    } catch (error) {
        console.error('❌ SMTP Test fehlgeschlagen:', error);
        if (error.code) {
            console.error(`   Error Code: ${error.code}`);
        }
        if (error.response) {
            console.error(`   Server Response: ${error.response}`);
        }
    } finally {
        await pool.end();
    }
}

// Run the test
testSmtp();
