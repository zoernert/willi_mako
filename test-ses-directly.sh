#!/bin/bash

# Farben für die Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📧 Amazon SES Test für Willi-Mako${NC}"
echo -e "${BLUE}==============================${NC}"
echo ""

# Prüfen, ob Nodemailer installiert ist
if ! npm list nodemailer >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Nodemailer nicht gefunden, wird installiert...${NC}"
  npm install --no-save nodemailer
fi

# Erstelle temporäre JS-Datei
TMP_FILE=$(mktemp)
cat > $TMP_FILE << 'EOF'
const nodemailer = require('nodemailer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prüfe ob .env existiert und lade die Variablen
try {
  require('dotenv').config();
} catch (error) {
  console.log('dotenv nicht gefunden, Umgebungsvariablen werden nicht geladen');
}

async function testSES() {
  // Frage nach E-Mail-Adresse
  const testEmail = await new Promise(resolve => {
    rl.question('\n📧 An welche E-Mail-Adresse soll die Test-E-Mail gesendet werden? ', (answer) => {
      resolve(answer.trim());
    });
  });
  
  if (!testEmail || !testEmail.includes('@')) {
    console.error('❌ Ungültige E-Mail-Adresse.');
    rl.close();
    return;
  }
  
  // Frage nach SES-Credentials falls nicht in .env vorhanden
  let smtpHost = process.env.SMTP_HOST;
  let smtpPort = process.env.SMTP_PORT;
  let smtpUser = process.env.SMTP_USER;
  let smtpPass = process.env.SMTP_PASS;
  let fromEmail = process.env.FROM_EMAIL;
  
  if (!smtpHost) {
    smtpHost = await new Promise(resolve => {
      rl.question('SES SMTP Host (Standard: email-smtp.eu-central-1.amazonaws.com): ', (answer) => {
        resolve(answer.trim() || 'email-smtp.eu-central-1.amazonaws.com');
      });
    });
  }
  
  if (!smtpPort) {
    smtpPort = await new Promise(resolve => {
      rl.question('SES SMTP Port (Standard: 587): ', (answer) => {
        resolve(answer.trim() || '587');
      });
    });
  }
  
  if (!smtpUser) {
    smtpUser = await new Promise(resolve => {
      rl.question('SES SMTP Benutzername: ', (answer) => {
        resolve(answer.trim());
      });
    });
  }
  
  if (!smtpPass) {
    smtpPass = await new Promise(resolve => {
      rl.question('SES SMTP Passwort: ', (answer) => {
        resolve(answer.trim());
      });
    });
  }
  
  if (!fromEmail) {
    fromEmail = await new Promise(resolve => {
      rl.question('Absender-E-Mail (verified in SES): ', (answer) => {
        resolve(answer.trim() || 'noreply@stromhaltig.de');
      });
    });
  }
  
  if (!smtpUser || !smtpPass) {
    console.error('❌ SMTP-Zugangsdaten fehlen.');
    rl.close();
    return;
  }
  
  console.log('\n📧 SES SMTP Konfiguration:');
  console.log(`  Host: ${smtpHost}`);
  console.log(`  Port: ${smtpPort}`);
  console.log(`  Benutzer: ${smtpUser}`);
  console.log(`  Von: ${fromEmail}`);
  
  // Erstelle Transporter
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort),
    secure: parseInt(smtpPort) === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    debug: true
  });
  
  console.log('\n🔄 Teste SMTP-Verbindung...');
  
  try {
    // Verbindung testen
    await transporter.verify();
    console.log('✅ SMTP-Verbindung erfolgreich!');
    
    // Test-E-Mail senden
    console.log('\n📤 Sende Test-E-Mail...');
    const info = await transporter.sendMail({
      from: `Willi-Mako <${fromEmail}>`,
      to: testEmail,
      subject: 'Amazon SES Test für Willi-Mako',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
          <h2 style="color: #0066cc; text-align: center;">✅ Amazon SES Test erfolgreich!</h2>
          <p>Diese E-Mail wurde erfolgreich über <strong>Amazon SES</strong> versendet.</p>
          <p>Details:</p>
          <ul>
            <li><strong>SMTP Host:</strong> ${smtpHost}</li>
            <li><strong>SMTP Port:</strong> ${smtpPort}</li>
            <li><strong>Absender:</strong> ${fromEmail}</li>
            <li><strong>Empfänger:</strong> ${testEmail}</li>
            <li><strong>Zeitpunkt:</strong> ${new Date().toLocaleString()}</li>
          </ul>
          <p style="margin-top: 30px; font-size: 0.9em; color: #666; text-align: center;">
            Diese E-Mail wurde aus Testzwecken im Rahmen der Willi-Mako Implementierung versendet.
          </p>
        </div>
      `,
      text: `
        ✅ Amazon SES Test erfolgreich!
        
        Diese E-Mail wurde erfolgreich über Amazon SES versendet.
        
        Details:
        - SMTP Host: ${smtpHost}
        - SMTP Port: ${smtpPort}
        - Absender: ${fromEmail}
        - Empfänger: ${testEmail}
        - Zeitpunkt: ${new Date().toLocaleString()}
        
        Diese E-Mail wurde aus Testzwecken im Rahmen der Willi-Mako Implementierung versendet.
      `
    });
    
    console.log('✅ E-Mail erfolgreich gesendet!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`   Vorschau URL: ${nodemailer.getTestMessageUrl(info)}`);
    
    // Hinweise ausgeben
    console.log('\n💡 Tipps für Amazon SES:');
    console.log('1. Überprüfen Sie Ihren E-Mail-Eingang (auch Spam-Ordner)');
    console.log('2. Bei "Sandbox"-Modus müssen Empfänger verifiziert sein');
    console.log('3. Für Produktion beantragen Sie "Production Access"');
    
    // Speichern in .env.local Vorschlag
    console.log('\n💾 Möchten Sie diese Konfiguration in .env.local speichern? (j/n)');
    const saveConfig = await new Promise(resolve => {
      rl.question('> ', (answer) => {
        resolve(answer.trim().toLowerCase() === 'j');
      });
    });
    
    if (saveConfig) {
      const fs = require('fs');
      const envContent = `# Amazon SES Konfiguration
SMTP_HOST=${smtpHost}
SMTP_PORT=${smtpPort}
SMTP_SECURE=${parseInt(smtpPort) === 465 ? 'true' : 'false'}
SMTP_USER=${smtpUser}
SMTP_PASS=${smtpPass}
FROM_EMAIL=${fromEmail}
`;
      
      fs.writeFileSync('.env.local', envContent);
      console.log('✅ Konfiguration in .env.local gespeichert!');
    }
    
  } catch (error) {
    console.error('❌ SMTP-Test fehlgeschlagen:', error);
    
    if (error.response) {
      console.error(`   Server-Antwort: ${error.response}`);
    }
    
    // Hilfreiche Fehleranalyse
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Mögliche Lösung: Überprüfen Sie Host und Port');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Mögliche Lösung: Firewall oder Netzwerkprobleme');
    } else if (error.code === 'EAUTH') {
      console.log('\n💡 Mögliche Lösung: Überprüfen Sie Benutzername und Passwort');
    } else if (error.message.includes('Greeting')) {
      console.log('\n💡 Mögliche Lösung: Versuchen Sie Port 465 statt 587');
    }
  }
  
  rl.close();
}

testSES();
EOF

# Führe das Skript aus
echo -e "${GREEN}Starte Amazon SES Test...${NC}"
node $TMP_FILE

# Lösche temporäre Datei
rm $TMP_FILE

echo ""
echo -e "${BLUE}Test abgeschlossen!${NC}"
