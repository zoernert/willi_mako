// Zoho SMTP Alternative - Falls sslout.de weiterhin Probleme macht

console.log('📧 Zoho SMTP Alternative für stromhaltig.de');
console.log('============================================');
console.log('');
console.log('Da Ihre MX-Records auf Zoho zeigen, ist Zoho SMTP optimal:');
console.log('');
console.log('🔧 SMTP-Einstellungen für Zoho:');
console.log('   Host: smtp.zoho.com');
console.log('   Port: 587 (STARTTLS) oder 465 (SSL)');
console.log('   User: willi@stromhaltig.de');
console.log('   Pass: [Ihr Zoho App-Passwort]');
console.log('');
console.log('📋 Vorteile von Zoho SMTP:');
console.log('   ✅ Perfekte DMARC-Alignment (MX = SMTP)');
console.log('   ✅ Optimale Reputation für stromhaltig.de');
console.log('   ✅ Bessere Zustellbarkeit zu Gmail/Outlook');
console.log('   ✅ Integrierte DKIM-Signierung');
console.log('');
console.log('🔒 Zoho App-Passwort erstellen:');
console.log('   1. Login bei Zoho Mail Admin');
console.log('   2. Gehe zu: Einstellungen > Sicherheit');
console.log('   3. Erstelle App-spezifisches Passwort');
console.log('   4. Verwende dieses für SMTP-Auth');
console.log('');

// SQL-Update für Zoho SMTP
console.log('🔄 Datenbank-Update für Zoho SMTP:');
console.log('');
console.log('PGPASSWORD=willi_password psql -h 10.0.0.2 -p 5117 -U willi_user -d willi_mako -c "');
console.log("UPDATE system_settings SET value = 'smtp.zoho.com' WHERE key = 'smtp.host';");
console.log("UPDATE system_settings SET value = '587' WHERE key = 'smtp.port';");
console.log("UPDATE system_settings SET value = 'false' WHERE key = 'smtp.secure';");
console.log("UPDATE system_settings SET value = 'willi@stromhaltig.de' WHERE key = 'smtp.user';");
console.log("UPDATE system_settings SET value = '[IHR_ZOHO_APP_PASSWORT]' WHERE key = 'smtp.password';");
console.log('"');
console.log('');
console.log('⚠️  WICHTIG: Ersetzen Sie [IHR_ZOHO_APP_PASSWORT] mit dem echten App-Passwort!');
