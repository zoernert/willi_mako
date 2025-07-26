const nodemailer = require('nodemailer');
const { Pool } = require('pg');

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

async function testDkimAlignment() {
    try {
        console.log('🔍 DKIM-Alignment Test für stromhaltig.de\n');
        
        const settings = await getSmtpSettings();
        
        console.log('📧 Aktuelle Konfiguration:');
        console.log(`   SMTP Host: ${settings.host}`);
        console.log(`   From Email: ${settings.from_email}`);
        console.log(`   SMTP User: ${settings.user}`);
        
        // Test mit korrekter DKIM-Ausrichtung
        const transporter = nodemailer.createTransport({
            host: settings.host,
            port: parseInt(settings.port),
            secure: settings.secure === 'true',
            auth: {
                user: settings.user,
                pass: settings.password
            },
            // DKIM-spezifische Optionen
            dkim: {
                domainName: 'stromhaltig.de',
                keySelector: 'default',
                privateKey: null // Wird vom SMTP-Server gehandhabt
            },
            debug: true,
            logger: true
        });
        
        console.log('\n🧪 Teste DKIM-konforme E-Mail...');
        
        const mailOptions = {
            from: {
                name: settings.from_name,
                address: settings.from_email
            },
            to: 'zoerner@gmail.com',
            subject: '🔒 DKIM-Alignment Test - Willi Mako',
            headers: {
                // Explizite Header für bessere Zustellbarkeit
                'Reply-To': settings.from_email,
                'Return-Path': settings.from_email,
                'X-Mailer': 'Willi Mako Team System',
                'X-Priority': '3',
                'List-Unsubscribe': '<mailto:unsubscribe@stromhaltig.de>'
            },
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <h1 style="margin: 0;">🔒 DKIM-Alignment Test</h1>
                        <p style="margin: 10px 0 0 0;">Willi Mako Team-System</p>
                    </div>
                    
                    <div style="padding: 30px 0;">
                        <h2 style="color: #333;">E-Mail-Zustellbarkeits-Test</h2>
                        <p>Diese E-Mail testet die korrekte DKIM-Signierung und SPF-Alignment für das Willi Mako Team-Einladungssystem.</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #495057; margin-top: 0;">🔧 Technische Details:</h3>
                            <ul style="color: #6c757d;">
                                <li><strong>Absender-Domain:</strong> stromhaltig.de</li>
                                <li><strong>SMTP-Server:</strong> ${settings.host}</li>
                                <li><strong>DKIM-Signierung:</strong> Aktiv</li>
                                <li><strong>SPF-Alignment:</strong> Korrekt</li>
                                <li><strong>DMARC-Policy:</strong> Strict</li>
                            </ul>
                        </div>
                        
                        <p>Wenn Sie diese E-Mail erhalten, funktioniert die E-Mail-Zustellung korrekt und Team-Einladungen sollten erfolgreich ankommen.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; display: inline-block;">
                                ✅ <strong>Test erfolgreich!</strong><br>
                                E-Mail-System ist korrekt konfiguriert.
                            </div>
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #dee2e6; padding-top: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                        <p>Diese E-Mail wurde automatisch vom Willi Mako System generiert.<br>
                        Zeitstempel: ${new Date().toLocaleString('de-DE')}</p>
                    </div>
                </div>
            `,
            text: `
DKIM-Alignment Test - Willi Mako Team-System

Diese E-Mail testet die korrekte DKIM-Signierung und SPF-Alignment für das Willi Mako Team-Einladungssystem.

Technische Details:
- Absender-Domain: stromhaltig.de
- SMTP-Server: ${settings.host}
- DKIM-Signierung: Aktiv
- SPF-Alignment: Korrekt
- DMARC-Policy: Strict

Wenn Sie diese E-Mail erhalten, funktioniert die E-Mail-Zustellung korrekt und Team-Einladungen sollten erfolgreich ankommen.

✅ Test erfolgreich! E-Mail-System ist korrekt konfiguriert.

Zeitstempel: ${new Date().toLocaleString('de-DE')}
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('✅ DKIM-Test E-Mail gesendet!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        
        console.log('\n🔍 Überprüfung:');
        console.log('   1. Warten Sie 2-3 Minuten');
        console.log('   2. Prüfen Sie Posteingang UND Spam-Ordner');
        console.log('   3. Wenn angekommen: ✅ DKIM-Alignment funktioniert');
        console.log('   4. Wenn nicht angekommen: ❌ DKIM-Problem beim Provider');
        
        console.log('\n💡 Wenn diese E-Mail NICHT ankommt:');
        console.log('   - Das Problem liegt am DKIM-Signing von sslout.de');
        console.log('   - Kontaktieren Sie Ihren SMTP-Provider');
        console.log('   - Alternative: Verwenden Sie Zoho SMTP (da MX auf Zoho zeigt)');
        
    } catch (error) {
        console.error('❌ DKIM-Test fehlgeschlagen:', error);
    } finally {
        await pool.end();
    }
}

testDkimAlignment();
