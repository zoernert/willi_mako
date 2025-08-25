const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Datenbank-Verbindung aus .env oder Standard-Werten
require('dotenv').config();

// Datenbank-Verbindungskonfiguration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'willi_mako',
  user: process.env.DB_USER || 'willi_user',
  password: process.env.DB_PASSWORD || 'willi_password'
});

async function getSmtpSettings() {
  try {
    console.log('🔍 Lade SMTP-Einstellungen aus der Datenbank...');
    const result = await pool.query(
      "SELECT key, value, value_type FROM system_settings WHERE key LIKE 'smtp.%' OR key = 'email.notifications_enabled'"
    );
    
    if (result.rows.length === 0) {
      console.log('⚠️  Keine SMTP-Einstellungen in der Datenbank gefunden.');
      return null;
    }
    
    // Konvertiere Datenbankwerte in passende Typen
    const settings = {};
    result.rows.forEach(row => {
      const key = row.key;
      let value = row.value;
      
      // Werte nach Typ konvertieren
      switch (row.value_type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value.toLowerCase() === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Falls JSON-Parsing fehlschlägt, String-Wert behalten
          }
          break;
      }
      
      settings[key] = value;
    });
    
    return settings;
  } catch (error) {
    console.error('❌ Fehler beim Laden der SMTP-Einstellungen aus der Datenbank:', error);
    return null;
  }
}

function checkEnvFile() {
  console.log('🔍 Prüfe lokale .env-Datei auf SMTP-Einstellungen...');
  
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  Keine .env-Datei gefunden.');
    return null;
  }
  
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envLines = envContent.split('\n');
    
    const envSettings = {};
    const smtpKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
    
    smtpKeys.forEach(key => {
      const line = envLines.find(l => l.startsWith(`${key}=`));
      if (line) {
        const value = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
        envSettings[key] = value;
      }
    });
    
    if (Object.keys(envSettings).length === 0) {
      console.log('⚠️  Keine SMTP-Einstellungen in der .env-Datei gefunden.');
      return null;
    }
    
    return envSettings;
  } catch (error) {
    console.error('❌ Fehler beim Lesen der .env-Datei:', error);
    return null;
  }
}

async function createLocalEnvTemplate(dbSettings) {
  if (!dbSettings) return;
  
  console.log('\n📝 Erstelle .env.local.example Vorlage für lokale Entwicklung...');
  
  const envLocalPath = path.join(__dirname, '.env.local.example');
  
  try {
    let content = `# Lokale SMTP-Einstellungen für Entwicklung\n`;
    content += `# Hinweis: Diese Einstellungen werden nur verwendet, wenn keine Datenbankeinträge vorhanden sind.\n\n`;
    
    content += `# Amazon SES SMTP Einstellungen\n`;
    content += `SMTP_HOST=${dbSettings['smtp.host'] || 'email-smtp.eu-central-1.amazonaws.com'}\n`;
    content += `SMTP_PORT=${dbSettings['smtp.port'] || 587}\n`;
    content += `SMTP_SECURE=${dbSettings['smtp.secure'] || 'false'}\n`;
    content += `SMTP_USER=YOUR_SES_SMTP_USERNAME\n`;
    content += `SMTP_PASS=YOUR_SES_SMTP_PASSWORD\n`;
    content += `FROM_EMAIL=${dbSettings['smtp.from_email'] || 'noreply@stromhaltig.de'}\n`;
    
    fs.writeFileSync(envLocalPath, content);
    console.log(`✅ Vorlage wurde erstellt: ${envLocalPath}`);
  } catch (error) {
    console.error('❌ Fehler beim Erstellen der Vorlagendatei:', error);
  }
}

async function main() {
  console.log('🚀 Willi-Mako SMTP/SES Konfigurationscheck');
  console.log('=========================================\n');
  
  // SMTP-Einstellungen aus Datenbank laden
  const dbSettings = await getSmtpSettings();
  
  console.log('\n📧 SMTP-Konfiguration in der Datenbank:');
  if (dbSettings) {
    console.log(`   Host: ${dbSettings['smtp.host'] || 'Nicht konfiguriert'}`);
    console.log(`   Port: ${dbSettings['smtp.port'] || 'Nicht konfiguriert'}`);
    console.log(`   Sicherheit: ${dbSettings['smtp.secure'] ? 'SSL/TLS' : 'STARTTLS/Keine'}`);
    console.log(`   Benutzer: ${dbSettings['smtp.user'] ? '✓ Konfiguriert' : 'Nicht konfiguriert'}`);
    console.log(`   Passwort: ${dbSettings['smtp.password'] ? '✓ Konfiguriert' : 'Nicht konfiguriert'}`);
    console.log(`   Absender: ${dbSettings['smtp.from_email'] || 'Nicht konfiguriert'}`);
    console.log(`   Absendername: ${dbSettings['smtp.from_name'] || 'Nicht konfiguriert'}`);
    console.log(`   E-Mail-Benachrichtigungen: ${dbSettings['email.notifications_enabled'] ? '✓ Aktiviert' : '❌ Deaktiviert'}`);
    
    // Prüfen auf Amazon SES
    const isSES = dbSettings['smtp.host'] && (
      dbSettings['smtp.host'].includes('email-smtp.') && 
      dbSettings['smtp.host'].includes('amazonaws.com')
    );
    
    console.log(`\n🔍 Amazon SES Status: ${isSES ? '✅ Aktiv' : '❓ Nicht erkannt'}`);
    
    if (isSES) {
      console.log('   ✅ Die SMTP-Konfiguration nutzt Amazon SES');
      console.log(`   ✅ Region: ${dbSettings['smtp.host'].split('.')[1] || 'Unbekannt'}`);
    } else if (dbSettings['smtp.host']) {
      console.log(`   ⚠️  Es wird ein anderer SMTP-Server genutzt: ${dbSettings['smtp.host']}`);
    }
  } else {
    console.log('   ❌ Keine SMTP-Einstellungen in der Datenbank gefunden.');
  }
  
  // .env-Einstellungen überprüfen
  const envSettings = checkEnvFile();
  
  console.log('\n📧 SMTP-Konfiguration in .env:');
  if (envSettings) {
    console.log(`   Host: ${envSettings.SMTP_HOST || 'Nicht konfiguriert'}`);
    console.log(`   Port: ${envSettings.SMTP_PORT || 'Nicht konfiguriert'}`);
    console.log(`   Sicherheit: ${envSettings.SMTP_SECURE === 'true' ? 'SSL/TLS' : 'STARTTLS/Keine'}`);
    console.log(`   Benutzer: ${envSettings.SMTP_USER ? '✓ Konfiguriert' : 'Nicht konfiguriert'}`);
    console.log(`   Passwort: ${envSettings.SMTP_PASS ? '✓ Konfiguriert' : 'Nicht konfiguriert'}`);
    console.log(`   Absender: ${envSettings.FROM_EMAIL || 'Nicht konfiguriert'}`);
    
    // Prüfen auf Amazon SES
    const isSES = envSettings.SMTP_HOST && (
      envSettings.SMTP_HOST.includes('email-smtp.') && 
      envSettings.SMTP_HOST.includes('amazonaws.com')
    );
    
    console.log(`\n🔍 Amazon SES Status in .env: ${isSES ? '✅ Aktiv' : '❓ Nicht erkannt'}`);
  } else {
    console.log('   ⚠️  Keine SMTP-Einstellungen in der .env-Datei gefunden.');
  }
  
  // Template für lokale Entwicklung erstellen
  await createLocalEnvTemplate(dbSettings);
  
  console.log('\n📋 Zusammenfassung:');
  console.log('   1. Primäre Konfigurationsquelle: Datenbank (system_settings Tabelle)');
  console.log('   2. Fallback-Konfigurationsquelle: .env Umgebungsvariablen');
  console.log('   3. Willi-Mako EmailService lädt Einstellungen zunächst aus Datenbank, dann aus Umgebungsvariablen');
  
  if (dbSettings && dbSettings['smtp.host'] && dbSettings['smtp.host'].includes('amazonaws.com')) {
    console.log('   ✅ Amazon SES ist konfiguriert und wird verwendet');
  } else if (envSettings && envSettings.SMTP_HOST && envSettings.SMTP_HOST.includes('amazonaws.com')) {
    console.log('   ⚠️  Amazon SES ist nur in .env konfiguriert, nicht in der Datenbank');
  } else {
    console.log('   ❌ Amazon SES scheint nicht konfiguriert zu sein');
  }
  
  console.log('\n💡 Empfehlung:');
  console.log('   - Für Produktionsumgebung: Einstellungen in der Datenbank pflegen');
  console.log('   - Für lokale Entwicklung: .env.local (basierend auf dem erstellten Template) verwenden');
  console.log('   - Amazon SES ist ideal für Produktionsumgebungen (hohe Zustellbarkeit)');
  
  console.log('\n✨ Fertig!');
  
  // Verbindung schließen
  await pool.end();
}

main().catch(error => {
  console.error('Unbehandelter Fehler:', error);
  process.exit(1);
});
