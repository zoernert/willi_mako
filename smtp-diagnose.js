const nodemailer = require('nodemailer');
const { Pool } = require('pg');
const dns = require('dns').promises;

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

async function testDNS(hostname) {
    try {
        console.log(`🔍 DNS-Auflösung für ${hostname}:`);
        const addresses = await dns.resolve4(hostname);
        console.log(`   ✅ IP-Adressen: ${addresses.join(', ')}`);
        
        // MX-Records prüfen
        try {
            const mxRecords = await dns.resolveMx(hostname);
            console.log(`   📧 MX-Records gefunden: ${mxRecords.length}`);
            mxRecords.forEach(mx => {
                console.log(`      - ${mx.exchange} (Priorität: ${mx.priority})`);
            });
        } catch (mxError) {
            console.log(`   ⚠️  Keine MX-Records für ${hostname}`);
        }
        
        return true;
    } catch (error) {
        console.log(`   ❌ DNS-Auflösung fehlgeschlagen: ${error.message}`);
        return false;
    }
}

async function testSmtpConnection(config, label) {
    console.log(`\n🧪 Teste ${label}...`);
    console.log(`   Host: ${config.host}:${config.port}`);
    console.log(`   Secure: ${config.secure}`);
    console.log(`   Auth: ${config.auth.user}`);
    
    try {
        const transporter = nodemailer.createTransport({
            ...config,
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
        
        await transporter.verify();
        console.log(`   ✅ ${label} - Verbindung erfolgreich!`);
        return { success: true, transporter };
    } catch (error) {
        console.log(`   ❌ ${label} - Fehler: ${error.message}`);
        return { success: false, error };
    }
}

async function sendTestEmail(transporter, smtpSettings, configName) {
    const mailOptions = {
        from: {
            name: smtpSettings.from_name,
            address: smtpSettings.from_email
        },
        to: 'zoerner@gmail.com',
        subject: `🧪 SMTP Diagnose Test - ${configName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">SMTP Diagnose Test</h2>
                <p>Diese E-Mail wurde mit der Konfiguration "<strong>${configName}</strong>" versendet.</p>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>📊 Test-Details:</h3>
                    <ul>
                        <li><strong>Konfiguration:</strong> ${configName}</li>
                        <li><strong>SMTP Host:</strong> ${smtpSettings.host}</li>
                        <li><strong>Port:</strong> ${smtpSettings.port}</li>
                        <li><strong>Zeitstempel:</strong> ${new Date().toISOString()}</li>
                    </ul>
                </div>
                
                <p style="color: #059669;">
                    ✅ Test erfolgreich - diese Konfiguration funktioniert!
                </p>
            </div>
        `,
        text: `
SMTP Diagnose Test

Diese E-Mail wurde mit der Konfiguration "${configName}" versendet.

Test-Details:
- Konfiguration: ${configName}
- SMTP Host: ${smtpSettings.host}
- Port: ${smtpSettings.port}
- Zeitstempel: ${new Date().toISOString()}

✅ Test erfolgreich - diese Konfiguration funktioniert!
        `
    };
    
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`   ✅ E-Mail versendet! Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.log(`   ❌ E-Mail-Versand fehlgeschlagen: ${error.message}`);
        return false;
    }
}

async function comprehensiveSmtpTest() {
    try {
        console.log('🚀 Umfassender SMTP-Diagnose-Test gestartet\n');
        
        // SMTP-Einstellungen aus der Datenbank laden
        const smtpSettings = await getSmtpSettings();
        console.log('📋 Aktuelle SMTP-Einstellungen:');
        Object.entries(smtpSettings).forEach(([key, value]) => {
            if (key === 'password') {
                console.log(`   ${key}: ${'*'.repeat(value?.length || 0)}`);
            } else {
                console.log(`   ${key}: ${value}`);
            }
        });
        
        // DNS-Test
        console.log('\n🌐 DNS-Tests:');
        const dnsOk = await testDNS(smtpSettings.host);
        await testDNS('gmail.com'); // Ziel-Domain testen
        
        if (!dnsOk) {
            console.log('❌ DNS-Probleme erkannt. Netzwerk-Konnektivität prüfen!');
            return;
        }
        
        // Verschiedene SMTP-Konfigurationen testen
        const configs = [
            {
                name: 'Aktuelle Konfiguration (SSL)',
                config: {
                    host: smtpSettings.host,
                    port: parseInt(smtpSettings.port),
                    secure: smtpSettings.secure === 'true',
                    auth: {
                        user: smtpSettings.user,
                        pass: smtpSettings.password
                    }
                }
            },
            {
                name: 'Alternative: STARTTLS (Port 587)',
                config: {
                    host: smtpSettings.host,
                    port: 587,
                    secure: false,
                    requireTLS: true,
                    auth: {
                        user: smtpSettings.user,
                        pass: smtpSettings.password
                    }
                }
            },
            {
                name: 'Alternative: SSL ohne Zertifikatsprüfung',
                config: {
                    host: smtpSettings.host,
                    port: parseInt(smtpSettings.port),
                    secure: smtpSettings.secure === 'true',
                    auth: {
                        user: smtpSettings.user,
                        pass: smtpSettings.password
                    },
                    tls: {
                        rejectUnauthorized: false
                    }
                }
            }
        ];
        
        console.log('\n🔧 Teste verschiedene SMTP-Konfigurationen:');
        
        let successfulConfig = null;
        
        for (const { name, config } of configs) {
            const result = await testSmtpConnection(config, name);
            
            if (result.success) {
                console.log(`\n📤 Teste E-Mail-Versand mit ${name}...`);
                const emailSent = await sendTestEmail(result.transporter, smtpSettings, name);
                
                if (emailSent && !successfulConfig) {
                    successfulConfig = { name, config };
                }
                
                result.transporter.close();
            }
            
            // Kurze Pause zwischen Tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n📊 Zusammenfassung:');
        if (successfulConfig) {
            console.log(`✅ Erfolgreiche Konfiguration gefunden: ${successfulConfig.name}`);
            console.log('🔍 Wenn E-Mails nicht ankommen, prüfen Sie:');
            console.log('   - Spam-Ordner des Empfängers');
            console.log('   - Gmail-Filter und -Regeln');
            console.log('   - E-Mail-Reputation des Absende-Servers');
            console.log('   - SPF/DKIM/DMARC-Einstellungen der Domain');
        } else {
            console.log('❌ Keine funktionsfähige Konfiguration gefunden!');
            console.log('🔧 Mögliche Probleme:');
            console.log('   - Falsche SMTP-Credentials');
            console.log('   - Firewall blockiert SMTP-Ports');
            console.log('   - Server-seitige Authentifizierungsprobleme');
        }
        
    } catch (error) {
        console.error('❌ Diagnose-Test fehlgeschlagen:', error.message);
    } finally {
        await pool.end();
    }
}

// Script ausführen
comprehensiveSmtpTest().catch(console.error);
