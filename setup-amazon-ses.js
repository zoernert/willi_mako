const { Pool } = require('pg');
const nodemailer = require('nodemailer');

// Database connection
const pool = new Pool({
    host: '10.0.0.2',
    port: 5117,
    database: 'willi_mako',
    user: 'willi_user',
    password: 'willi_password'
});

async function setupAmazonSES() {
    console.log('🚀 Amazon SES Konfiguration für Willi Mako\n');
    
    // AWS SES Konfiguration (diese Werte müssen Sie nach der AWS Setup ersetzen)
    const sesConfig = {
        region: 'eu-central-1', // Frankfurt
        host: 'email-smtp.eu-central-1.amazonaws.com',
        port: 587,
        secure: false, // STARTTLS
        user: 'IHR_AWS_SMTP_USERNAME', // ⚠️ ERSETZEN: z.B. AKIAIOSFODNN7EXAMPLE
        password: 'IHR_AWS_SMTP_PASSWORD', // ⚠️ ERSETZEN: z.B. wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
        from_email: 'willi@stromhaltig.de',
        from_name: 'Willi Mako'
    };
    
    console.log('📋 SES Konfiguration:');
    console.log(`   Region: ${sesConfig.region}`);
    console.log(`   Host: ${sesConfig.host}`);
    console.log(`   Port: ${sesConfig.port}`);
    console.log(`   Secure: ${sesConfig.secure}`);
    console.log(`   From: ${sesConfig.from_name} <${sesConfig.from_email}>`);
    
    if (sesConfig.user === 'IHR_AWS_SMTP_USERNAME' || sesConfig.password === 'IHR_AWS_SMTP_PASSWORD') {
        console.log('\n❌ FEHLER: Bitte ersetzen Sie die Platzhalter-Credentials!');
        console.log('   1. Loggen Sie sich in AWS SES ein');
        console.log('   2. Erstellen Sie SMTP-Credentials');
        console.log('   3. Ersetzen Sie IHR_AWS_SMTP_USERNAME und IHR_AWS_SMTP_PASSWORD');
        console.log('   4. Führen Sie dieses Script erneut aus');
        return;
    }
    
    try {
        console.log('\n🔄 Aktualisiere Datenbank-Einstellungen...');
        
        // SMTP-Einstellungen in der Datenbank aktualisieren
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'smtp.host';", [sesConfig.host]);
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'smtp.port';", [sesConfig.port.toString()]);
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'smtp.secure';", [sesConfig.secure.toString()]);
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'smtp.user';", [sesConfig.user]);
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'smtp.password';", [sesConfig.password]);
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'smtp.from_email';", [sesConfig.from_email]);
        await pool.query("UPDATE system_settings SET value = $1 WHERE key = 'smtp.from_name';", [sesConfig.from_name]);
        
        console.log('✅ Datenbank erfolgreich aktualisiert!');
        
        // Test der SES-Verbindung
        console.log('\n🧪 Teste Amazon SES Verbindung...');
        
        const transporter = nodemailer.createTransport({
            host: sesConfig.host,
            port: sesConfig.port,
            secure: sesConfig.secure,
            auth: {
                user: sesConfig.user,
                pass: sesConfig.password
            },
            debug: true,
            logger: true
        });
        
        // Verbindung testen
        await transporter.verify();
        console.log('✅ SES-Verbindung erfolgreich!');
        
        // Test-E-Mail senden
        console.log('\n📤 Sende Test-E-Mail über Amazon SES...');
        
        const testEmail = {
            from: `${sesConfig.from_name} <${sesConfig.from_email}>`,
            to: 'zoerner@gmail.com', // ⚠️ Muss in SES Sandbox verifiziert sein
            subject: '🚀 Amazon SES Test - Willi Mako',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 20px; border-radius: 10px; text-align: center;">
                        <h1 style="margin: 0;">🚀 Amazon SES Test</h1>
                        <p style="margin: 10px 0 0 0;">Willi Mako E-Mail System</p>
                    </div>
                    
                    <div style="padding: 30px 0;">
                        <h2 style="color: #333;">E-Mail-Versand über Amazon SES</h2>
                        <p>Diese Test-E-Mail wurde erfolgreich über Amazon SES versendet!</p>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #495057; margin-top: 0;">🔧 SES Konfiguration:</h3>
                            <ul style="color: #6c757d;">
                                <li><strong>Region:</strong> ${sesConfig.region}</li>
                                <li><strong>SMTP Host:</strong> ${sesConfig.host}</li>
                                <li><strong>Port:</strong> ${sesConfig.port}</li>
                                <li><strong>Encryption:</strong> ${sesConfig.secure ? 'SSL' : 'STARTTLS'}</li>
                                <li><strong>From:</strong> ${sesConfig.from_email}</li>
                            </ul>
                        </div>
                        
                        <div style="background-color: #d4edda; color: #155724; padding: 15px; border-radius: 5px; text-align: center;">
                            ✅ <strong>Amazon SES erfolgreich konfiguriert!</strong><br>
                            Team-Einladungen können jetzt zuverlässig versendet werden.
                        </div>
                    </div>
                    
                    <div style="border-top: 1px solid #dee2e6; padding-top: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                        <p>Amazon SES - Powered by AWS<br>
                        Zeitstempel: ${new Date().toLocaleString('de-DE')}</p>
                    </div>
                </div>
            `,
            text: `
Amazon SES Test - Willi Mako E-Mail System

Diese Test-E-Mail wurde erfolgreich über Amazon SES versendet!

SES Konfiguration:
- Region: ${sesConfig.region}
- SMTP Host: ${sesConfig.host}  
- Port: ${sesConfig.port}
- Encryption: ${sesConfig.secure ? 'SSL' : 'STARTTLS'}
- From: ${sesConfig.from_email}

✅ Amazon SES erfolgreich konfiguriert!
Team-Einladungen können jetzt zuverlässig versendet werden.

Zeitstempel: ${new Date().toLocaleString('de-DE')}
            `
        };
        
        const info = await transporter.sendMail(testEmail);
        
        console.log('✅ Test-E-Mail erfolgreich über SES versendet!');
        console.log(`   Message ID: ${info.messageId}`);
        console.log(`   SES Message ID: ${info.response}`);
        
        console.log('\n🎉 Amazon SES Setup abgeschlossen!');
        console.log('   ✅ Datenbank aktualisiert');
        console.log('   ✅ SMTP-Verbindung getestet');  
        console.log('   ✅ Test-E-Mail versendet');
        console.log('');
        console.log('💡 Nächste Schritte:');
        console.log('   1. Prüfen Sie ob die Test-E-Mail angekommen ist');
        console.log('   2. Beantragen Sie SES Production Access (falls noch in Sandbox)');
        console.log('   3. Testen Sie Team-Einladungen im Frontend');
        
    } catch (error) {
        console.error('❌ Fehler beim SES Setup:', error.message);
        
        if (error.code === 'EAUTH') {
            console.log('\n🔧 Authentifizierungsfehler:');
            console.log('   - Überprüfen Sie die AWS SMTP Credentials');
            console.log('   - Stellen Sie sicher, dass die Credentials für SMTP aktiviert sind');
            console.log('   - Region könnte falsch sein');
        }
        
        if (error.code === 'ENOTFOUND') {
            console.log('\n🔧 Verbindungsfehler:');
            console.log('   - Überprüfen Sie die SMTP Host-Adresse');
            console.log('   - Stellen Sie sicher, dass Sie die richtige Region verwenden');
        }
        
    } finally {
        await pool.end();
    }
}

// Setup ausführen
setupAmazonSES();
