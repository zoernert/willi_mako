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

async function testSESToWilli() {
    try {
        console.log('📧 Amazon SES Test an willi@stromhaltig.de\n');
        
        const settings = await getSmtpSettings();
        
        console.log('🔧 SES Konfiguration:');
        console.log(`   Host: ${settings.host}`);
        console.log(`   Port: ${settings.port}`);
        console.log(`   User: ${settings.user}`);
        console.log(`   From: ${settings.from_email}`);
        console.log(`   To: willi@stromhaltig.de (authentifizierte Adresse)`);
        
        // Amazon SES Transporter
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
        
        console.log('\n🔍 Teste Verbindung zu Amazon SES...');
        await transporter.verify();
        console.log('✅ SES-Verbindung erfolgreich!');
        
        console.log('\n📤 Sende Test-E-Mail an willi@stromhaltig.de...');
        
        const testEmail = {
            from: {
                name: settings.from_name,
                address: settings.from_email
            },
            to: 'willi@stromhaltig.de',
            subject: '🎯 SES Sandbox Test - Team-Einladungssystem',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 30px; text-align: center; border-radius: 10px;">
                        <h1 style="margin: 0; font-size: 24px;">🎯 SES Sandbox Test</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">Willi Mako Team-Einladungssystem</p>
                    </div>
                    
                    <div style="background: white; padding: 30px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                        <h2 style="color: #333; margin-top: 0;">✅ Amazon SES funktioniert!</h2>
                        
                        <p style="color: #666; line-height: 1.6;">
                            Diese E-Mail wurde erfolgreich über <strong>Amazon SES</strong> im Sandbox-Modus versendet. 
                            Da sie an die authentifizierte E-Mail-Adresse <code>willi@stromhaltig.de</code> geht, 
                            funktioniert sie auch ohne zusätzliche Verifikation.
                        </p>
                        
                        <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745;">
                            <h3 style="color: #155724; margin: 0 0 10px 0;">📊 Test-Details:</h3>
                            <ul style="color: #155724; margin: 0; padding-left: 20px;">
                                <li><strong>Provider:</strong> Amazon SES (EU-Central-1)</li>
                                <li><strong>SMTP Host:</strong> ${settings.host}</li>
                                <li><strong>Absender:</strong> ${settings.from_email}</li>
                                <li><strong>Empfänger:</strong> willi@stromhaltig.de</li>
                                <li><strong>Status:</strong> Sandbox-Modus</li>
                            </ul>
                        </div>
                        
                        <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                            <h3 style="color: #856404; margin: 0 0 10px 0;">🚀 Nächste Schritte:</h3>
                            <ol style="color: #856404; margin: 0; padding-left: 20px;">
                                <li>Domain <code>stromhaltig.de</code> in AWS SES verifizieren</li>
                                <li>Production Access beantragen</li>
                                <li>Team-Einladungen an beliebige E-Mail-Adressen versenden</li>
                            </ol>
                        </div>
                        
                        <div style="text-align: center; margin: 25px 0;">
                            <div style="background: #007bff; color: white; padding: 12px 20px; border-radius: 20px; display: inline-block; font-weight: bold;">
                                🎉 Team-Einladungssystem ist bereit!
                            </div>
                        </div>
                        
                        <p style="color: #888; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                            Wenn Sie diese E-Mail erhalten, funktioniert das Willi Mako E-Mail-System perfekt.
                        </p>
                    </div>
                    
                    <div style="text-align: center; color: #6c757d; font-size: 12px;">
                        <p>📅 ${new Date().toLocaleString('de-DE')} | 🤖 Automatisch generiert | ☁️ Powered by AWS SES</p>
                    </div>
                </div>
            `,
            text: `
SES Sandbox Test - Willi Mako Team-Einladungssystem

✅ Amazon SES funktioniert!

Diese E-Mail wurde erfolgreich über Amazon SES im Sandbox-Modus versendet. 
Da sie an die authentifizierte E-Mail-Adresse willi@stromhaltig.de geht, 
funktioniert sie auch ohne zusätzliche Verifikation.

Test-Details:
- Provider: Amazon SES (EU-Central-1)
- SMTP Host: ${settings.host}
- Absender: ${settings.from_email}
- Empfänger: willi@stromhaltig.de
- Status: Sandbox-Modus

Nächste Schritte:
1. Domain stromhaltig.de in AWS SES verifizieren
2. Production Access beantragen
3. Team-Einladungen an beliebige E-Mail-Adressen versenden

🎉 Team-Einladungssystem ist bereit!

Wenn Sie diese E-Mail erhalten, funktioniert das Willi Mako E-Mail-System perfekt.

${new Date().toLocaleString('de-DE')} | Automatisch generiert | Powered by AWS SES
            `
        };
        
        const info = await transporter.sendMail(testEmail);
        
        console.log('\n🎉 E-Mail erfolgreich versendet!');
        console.log(`   ✅ Message ID: ${info.messageId}`);
        console.log(`   ✅ SES Response: ${info.response}`);
        console.log(`   ✅ Empfänger akzeptiert: ${info.accepted?.[0] || 'willi@stromhaltig.de'}`);
        
        console.log('\n📊 Test-Ergebnis:');
        console.log('   ✅ Amazon SES Integration: FUNKTIONIERT');
        console.log('   ✅ SMTP-Authentifizierung: ERFOLGREICH');
        console.log('   ✅ E-Mail-Versand: ERFOLGREICH');
        console.log('   ✅ Sandbox-Modus: BESTÄTIGT');
        
        console.log('\n🎯 Bedeutung für Team-Einladungen:');
        console.log('   - Das System ist technisch voll funktionsfähig');
        console.log('   - E-Mails werden zuverlässig über Amazon SES versendet');
        console.log('   - Für Produktion: Domain verifizieren + Production Access');
        console.log('   - Dann: Einladungen an beliebige E-Mail-Adressen möglich');
        
        console.log('\n🔍 Überprüfung:');
        console.log('   → Prüfen Sie das Postfach: willi@stromhaltig.de');
        console.log('   → E-Mail sollte in wenigen Sekunden ankommen');
        console.log('   → Falls im Spam: Auch das ist ein Erfolg!');
        
    } catch (error) {
        console.error('\n❌ SES Test fehlgeschlagen:');
        console.error(`   Fehler: ${error.message}`);
        
        if (error.code) {
            console.error(`   Code: ${error.code}`);
        }
        
        if (error.response) {
            console.error(`   Server Response: ${error.response}`);
        }
        
        console.log('\n🔧 Mögliche Ursachen:');
        console.log('   - AWS SES Credentials incorrect');
        console.log('   - Netzwerk-/Firewall-Problem');
        console.log('   - AWS SES Service-Problem');
        
    } finally {
        await pool.end();
    }
}

testSESToWilli();
