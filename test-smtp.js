const nodemailer = require('nodemailer');
const { Pool } = require('pg');

// Datenbankverbindung
const pool = new Pool({
    host: '10.0.0.2',
    port: 5117,
    database: 'willi_mako',
    user: 'willi_user',
    password: 'willi_password'
});

async function getSmtpSettings() {
    const client = await pool.connect();
    try {
        const result = await client.query(
            "SELECT key, value FROM system_settings WHERE key LIKE 'smtp.%'"
        );
        
        const settings = {};
        result.rows.forEach(row => {
            const key = row.key.replace('smtp.', '');
            settings[key] = row.value;
        });
        
        return settings;
    } finally {
        client.release();
    }
}

async function testSmtp() {
    try {
        console.log('📧 SMTP Test Script gestartet...\n');
        
        // SMTP-Einstellungen aus der Datenbank laden
        const smtpSettings = await getSmtpSettings();
        console.log('📋 SMTP-Einstellungen aus der Datenbank:');
        console.log(`   Host: ${smtpSettings.host}`);
        console.log(`   Port: ${smtpSettings.port}`);
        console.log(`   Secure: ${smtpSettings.secure}`);
        console.log(`   User: ${smtpSettings.user}`);
        console.log(`   From Email: ${smtpSettings.from_email}`);
        console.log(`   From Name: ${smtpSettings.from_name}\n`);
        
        // Transporter konfigurieren
        const transporter = nodemailer.createTransport({
            host: smtpSettings.host,
            port: parseInt(smtpSettings.port),
            secure: smtpSettings.secure === 'true',
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.password
            },
            debug: true, // Aktiviert detaillierte Debug-Logs
            logger: true // Aktiviert Logging
        });
        
        console.log('🔍 Teste SMTP-Verbindung...');
        await transporter.verify();
        console.log('✅ SMTP-Verbindung erfolgreich!\n');
        
        // Test-E-Mail zusammenstellen
        const mailOptions = {
            from: {
                name: smtpSettings.from_name,
                address: smtpSettings.from_email
            },
            to: 'zoerner@gmail.com',
            subject: '🧪 SMTP Test von Willi Mako',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">SMTP Test erfolgreich!</h2>
                    <p>Diese Test-E-Mail wurde erfolgreich über das Willi Mako System versendet.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3>📊 Versand-Details:</h3>
                        <ul>
                            <li><strong>SMTP Host:</strong> ${smtpSettings.host}</li>
                            <li><strong>Port:</strong> ${smtpSettings.port}</li>
                            <li><strong>Verschlüsselung:</strong> ${smtpSettings.secure === 'true' ? 'SSL' : 'STARTTLS'}</li>
                            <li><strong>Absender:</strong> ${smtpSettings.user}</li>
                            <li><strong>Zeitstempel:</strong> ${new Date().toLocaleString('de-DE')}</li>
                        </ul>
                    </div>
                    
                    <p style="color: #059669;">
                        ✅ Wenn Sie diese E-Mail erhalten, funktioniert der SMTP-Versand korrekt!
                    </p>
                    
                    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #6b7280;">
                        Diese E-Mail wurde automatisch vom Willi Mako SMTP-Test-Script generiert.
                    </p>
                </div>
            `,
            text: `
SMTP Test erfolgreich!

Diese Test-E-Mail wurde erfolgreich über das Willi Mako System versendet.

Versand-Details:
- SMTP Host: ${smtpSettings.host}
- Port: ${smtpSettings.port}
- Verschlüsselung: ${smtpSettings.secure === 'true' ? 'SSL' : 'STARTTLS'}
- Absender: ${smtpSettings.user}
- Zeitstempel: ${new Date().toLocaleString('de-DE')}

✅ Wenn Sie diese E-Mail erhalten, funktioniert der SMTP-Versand korrekt!

Diese E-Mail wurde automatisch vom Willi Mako SMTP-Test-Script generiert.
            `
        };
        
        console.log('📤 Sende Test-E-Mail...');
        console.log(`   An: ${mailOptions.to}`);
        console.log(`   Betreff: ${mailOptions.subject}\n`);
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ E-Mail erfolgreich versendet!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        
        if (info.accepted && info.accepted.length > 0) {
            console.log(`   ✅ Akzeptiert: ${info.accepted.join(', ')}`);
        }
        
        if (info.rejected && info.rejected.length > 0) {
            console.log(`   ❌ Abgelehnt: ${info.rejected.join(', ')}`);
        }
        
        console.log('\n🔍 Debugging-Hinweise:');
        console.log('   - Prüfen Sie den Spam-Ordner');
        console.log('   - Überprüfen Sie die E-Mail-Adresse auf Tippfehler');
        console.log('   - Kontrollieren Sie die Gmail-Filter und -Regeln');
        console.log('   - Warten Sie einige Minuten, da Verzögerungen auftreten können');
        
    } catch (error) {
        console.error('❌ SMTP Test fehlgeschlagen:');
        console.error('   Fehler:', error.message);
        
        if (error.code) {
            console.error('   Code:', error.code);
        }
        
        if (error.response) {
            console.error('   Server-Antwort:', error.response);
        }
        
        if (error.responseCode) {
            console.error('   Response Code:', error.responseCode);
        }
        
        console.log('\n🔧 Mögliche Lösungen:');
        console.log('   - Überprüfen Sie die SMTP-Credentials');
        console.log('   - Kontrollieren Sie Firewall-Einstellungen');
        console.log('   - Testen Sie alternative Ports (25, 465, 587)');
        console.log('   - Überprüfen Sie die Server-Verfügbarkeit');
    } finally {
        await pool.end();
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n👋 Test abgebrochen...');
    await pool.end();
    process.exit(0);
});

// Script ausführen
testSmtp().catch(console.error);
