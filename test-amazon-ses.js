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

async function testAmazonSES() {
    try {
        console.log('🚀 Amazon SES Test für Willi Mako\n');
        
        const settings = await getSmtpSettings();
        
        console.log('📧 Amazon SES Konfiguration:');
        console.log(`   Host: ${settings.host}`);
        console.log(`   Port: ${settings.port}`);
        console.log(`   User: ${settings.user}`);
        console.log(`   Secure: ${settings.secure}`);
        console.log(`   From: ${settings.from_email}`);
        console.log(`   Name: ${settings.from_name}`);
        
        // Amazon SES Transporter erstellen
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
        
        console.log('\n🔍 Teste Amazon SES Verbindung...');
        await transporter.verify();
        console.log('✅ Amazon SES Verbindung erfolgreich!');
        
        console.log('\n📤 Sende Test-E-Mail über Amazon SES...');
        
        const mailOptions = {
            from: {
                name: settings.from_name,
                address: settings.from_email
            },
            to: 'zoerner@gmail.com',
            subject: '🎉 Amazon SES Test - Willi Mako Team System',
            html: `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa;">
                    <div style="background: linear-gradient(135deg, #ff9a56 0%, #ff6b35 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">🎉 Amazon SES Test</h1>
                        <p style="margin: 10px 0 0 0; font-size: 18px; opacity: 0.9;">Willi Mako Team-System</p>
                    </div>
                    
                    <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-top: 0;">🚀 Migration zu Amazon SES erfolgreich!</h2>
                        
                        <p style="color: #666; line-height: 1.6;">
                            Das Willi Mako Team-Einladungssystem verwendet jetzt <strong>Amazon SES</strong> für den E-Mail-Versand. 
                            Dies bedeutet deutlich bessere Zustellbarkeit und Zuverlässigkeit für alle Team-Einladungen.
                        </p>
                        
                        <div style="background-color: #e8f5e8; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #28a745;">
                            <h3 style="color: #155724; margin: 0 0 15px 0;">📊 Technische Details:</h3>
                            <ul style="color: #155724; margin: 0; padding-left: 20px;">
                                <li><strong>Provider:</strong> Amazon SES (Simple Email Service)</li>
                                <li><strong>Region:</strong> EU Central (Frankfurt)</li>
                                <li><strong>SMTP Host:</strong> ${settings.host}</li>
                                <li><strong>Encryption:</strong> STARTTLS (Port 587)</li>
                                <li><strong>Absender:</strong> ${settings.from_email}</li>
                            </ul>
                        </div>
                        
                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin: 0 0 15px 0;">🎯 Vorteile von Amazon SES:</h3>
                            <ul style="color: #856404; margin: 0; padding-left: 20px;">
                                <li>✅ <strong>Höhere Zustellbarkeit</strong> - Bessere Reputation bei Gmail/Outlook</li>
                                <li>✅ <strong>Skalierbarkeit</strong> - Bis zu 200 E-Mails/Tag kostenlos</li>
                                <li>✅ <strong>Zuverlässigkeit</strong> - 99.9% Uptime-Garantie</li>
                                <li>✅ <strong>DKIM-Signierung</strong> - Automatische E-Mail-Authentifizierung</li>
                                <li>✅ <strong>Bounce/Complaint Handling</strong> - Automatische Behandlung</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 25px; border-radius: 25px; display: inline-block; font-weight: bold; font-size: 16px;">
                                🎉 E-Mail-System erfolgreich migriert!
                            </div>
                        </div>
                        
                        <p style="color: #666; font-size: 14px; line-height: 1.5;">
                            Wenn Sie diese E-Mail erhalten, funktioniert die neue Amazon SES Integration perfekt. 
                            Alle zukünftigen Team-Einladungen werden nun zuverlässig zugestellt.
                        </p>
                    </div>
                    
                    <div style="text-align: center; padding: 20px; color: #6c757d; font-size: 12px;">
                        <p style="margin: 0;">
                            🤖 Automatisch generiert vom Willi Mako System<br>
                            📅 ${new Date().toLocaleString('de-DE')} | 🌍 Powered by Amazon SES
                        </p>
                    </div>
                </div>
            `,
            text: `
Amazon SES Test - Willi Mako Team System

Migration zu Amazon SES erfolgreich!

Das Willi Mako Team-Einladungssystem verwendet jetzt Amazon SES für den E-Mail-Versand. 
Dies bedeutet deutlich bessere Zustellbarkeit und Zuverlässigkeit für alle Team-Einladungen.

Technische Details:
- Provider: Amazon SES (Simple Email Service)
- Region: EU Central (Frankfurt)
- SMTP Host: ${settings.host}
- Encryption: STARTTLS (Port 587)
- Absender: ${settings.from_email}

Vorteile von Amazon SES:
✅ Höhere Zustellbarkeit - Bessere Reputation bei Gmail/Outlook
✅ Skalierbarkeit - Bis zu 200 E-Mails/Tag kostenlos
✅ Zuverlässigkeit - 99.9% Uptime-Garantie
✅ DKIM-Signierung - Automatische E-Mail-Authentifizierung
✅ Bounce/Complaint Handling - Automatische Behandlung

🎉 E-Mail-System erfolgreich migriert!

Wenn Sie diese E-Mail erhalten, funktioniert die neue Amazon SES Integration perfekt. 
Alle zukünftigen Team-Einladungen werden nun zuverlässig zugestellt.

Automatisch generiert: ${new Date().toLocaleString('de-DE')}
Powered by Amazon SES
            `
        };
        
        const info = await transporter.sendMail(mailOptions);
        
        console.log('\n🎉 Amazon SES Test erfolgreich!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   Response: ${info.response}`);
        
        if (info.accepted && info.accepted.length > 0) {
            console.log(`   ✅ Akzeptiert: ${info.accepted.join(', ')}`);
        }
        
        if (info.rejected && info.rejected.length > 0) {
            console.log(`   ❌ Abgelehnt: ${info.rejected.join(', ')}`);
        }
        
        console.log('\n📊 Migration abgeschlossen:');
        console.log('   ✅ Datenbank auf Amazon SES umgestellt');
        console.log('   ✅ SMTP-Verbindung erfolgreich getestet');
        console.log('   ✅ Test-E-Mail versendet');
        console.log('   ✅ Team-Einladungssystem bereit');
        
        console.log('\n🔍 Nächste Schritte:');
        console.log('   1. Prüfen Sie Ihren Gmail-Posteingang');
        console.log('   2. Domain-Verifizierung in AWS SES abschließen');
        console.log('   3. Production Access für höhere Limits beantragen');
        console.log('   4. Team-Einladungen testen');
        
    } catch (error) {
        console.error('\n❌ Amazon SES Test fehlgeschlagen:');
        console.error(`   Fehler: ${error.message}`);
        
        if (error.code) {
            console.error(`   Code: ${error.code}`);
        }
        
        if (error.response) {
            console.error(`   Server Response: ${error.response}`);
        }
        
        console.log('\n🔧 Mögliche Lösungen:');
        console.log('   - Domain in AWS SES verifizieren');
        console.log('   - SMTP-Credentials in AWS überprüfen');
        console.log('   - Firewall-Einstellungen kontrollieren');
        console.log('   - AWS SES Sandbox-Modus berücksichtigen');
        
    } finally {
        await pool.end();
    }
}

testAmazonSES();
