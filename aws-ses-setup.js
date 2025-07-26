// Amazon SES Setup Guide für Willi Mako
console.log('📧 Amazon SES Setup für Willi Mako');
console.log('====================================');
console.log('');

console.log('🎯 Vorteile von Amazon SES:');
console.log('   ✅ Hervorragende Zustellbarkeit');
console.log('   ✅ Günstige Preise (0.10$ per 1000 E-Mails)');
console.log('   ✅ Automatische DKIM-Signierung');
console.log('   ✅ Bounce/Complaint Handling');
console.log('   ✅ Detaillierte Statistiken');
console.log('   ✅ Hohe Reputation bei Gmail/Outlook');

console.log('\n📋 Schritt 1: AWS SES einrichten');
console.log('1. Login in AWS Console');
console.log('2. Gehe zu Simple Email Service (SES)');
console.log('3. Verifiziere Domain: stromhaltig.de');
console.log('4. Erstelle SMTP-Credentials');
console.log('5. Beantrage Production Access (raus aus Sandbox)');

console.log('\n🔧 Schritt 2: DNS-Records hinzufügen');
console.log('AWS SES gibt Ihnen diese Records:');
console.log('   - DKIM CNAME Records (3 Stück)');
console.log('   - MX Record (optional, für Bounce Handling)');
console.log('   - TXT Record für Domain Verification');

console.log('\n📨 Schritt 3: SMTP-Konfiguration');
console.log('Typische SES SMTP-Einstellungen:');
console.log('   Host: email-smtp.eu-west-1.amazonaws.com (je nach Region)');
console.log('   Port: 587 (STARTTLS) oder 465 (SSL)');
console.log('   User: [AWS Access Key für SMTP]');
console.log('   Pass: [AWS Secret Key für SMTP]');

console.log('\n🌍 Verfügbare SES Regionen:');
console.log('   EU (Frankfurt): email-smtp.eu-central-1.amazonaws.com');
console.log('   EU (Ireland): email-smtp.eu-west-1.amazonaws.com');
console.log('   US East: email-smtp.us-east-1.amazonaws.com');
console.log('   US West: email-smtp.us-west-2.amazonaws.com');

console.log('\n💡 Empfehlung: EU-Central-1 (Frankfurt) für beste Latenz');

// AWS CLI Commands für Domain Verification
console.log('\n🔄 AWS CLI Commands (falls verfügbar):');
console.log('aws ses verify-domain-identity --domain stromhaltig.de --region eu-central-1');
console.log('aws ses get-identity-verification-attributes --identities stromhaltig.de --region eu-central-1');

console.log('\n⚠️  WICHTIG:');
console.log('   - SES startet im "Sandbox Mode" (nur verifizierte E-Mails)');
console.log('   - Beantragen Sie Production Access für beliebige Empfänger');
console.log('   - Erste 62.000 E-Mails pro Monat sind kostenlos');
console.log('   - Danach: $0.10 pro 1.000 E-Mails');

console.log('\n🚀 Nächste Schritte:');
console.log('1. AWS Account erstellen/einloggen');
console.log('2. SES Service konfigurieren');
console.log('3. Domain verifizieren');
console.log('4. SMTP-Credentials erstellen');
console.log('5. Database-Einstellungen aktualisieren');
console.log('6. Test-E-Mail versenden');
