// AWS SES Regions und SMTP Endpoints
const sesRegions = {
    'eu-central-1': {
        name: 'Europe (Frankfurt)',
        smtp: 'email-smtp.eu-central-1.amazonaws.com',
        recommended: true,
        reason: 'Beste Latenz für Europa, DSGVO-konform'
    },
    'eu-west-1': {
        name: 'Europe (Ireland)',
        smtp: 'email-smtp.eu-west-1.amazonaws.com', 
        recommended: true,
        reason: 'Auch gut für Europa, DSGVO-konform'
    },
    'us-east-1': {
        name: 'US East (N. Virginia)',
        smtp: 'email-smtp.us-east-1.amazonaws.com',
        recommended: false,
        reason: 'Höhere Latenz von Deutschland'
    },
    'us-west-2': {
        name: 'US West (Oregon)',
        smtp: 'email-smtp.us-west-2.amazonaws.com',
        recommended: false,
        reason: 'Höhere Latenz von Deutschland'
    },
    'ap-southeast-2': {
        name: 'Asia Pacific (Sydney)',
        smtp: 'email-smtp.ap-southeast-2.amazonaws.com',
        recommended: false,
        reason: 'Zu weit entfernt'
    }
};

console.log('🌍 AWS SES Regions für Willi Mako\n');

Object.entries(sesRegions).forEach(([region, info]) => {
    const icon = info.recommended ? '✅' : '⚠️';
    console.log(`${icon} ${region} - ${info.name}`);
    console.log(`   SMTP: ${info.smtp}`);
    console.log(`   Grund: ${info.reason}\n`);
});

console.log('💡 Empfehlung: Verwenden Sie eu-central-1 (Frankfurt)');
console.log('   - Niedrige Latenz von Deutschland');
console.log('   - DSGVO-konform');
console.log('   - Zuverlässige Zustellung nach Europa');

console.log('\n📋 DNS Records für SES (Beispiel):');
console.log('Nach der Domain-Verifizierung erhalten Sie:');
console.log('');
console.log('TXT Record:');
console.log('   Name: stromhaltig.de');
console.log('   Value: [AWS-Verification-Token]');
console.log('');
console.log('DKIM CNAME Records (3 Stück):');
console.log('   Name: [token1]._domainkey.stromhaltig.de'); 
console.log('   Value: [token1].dkim.amazonses.com');
console.log('   (+ 2 weitere ähnliche Records)');
console.log('');
console.log('MX Record (optional für Bounce Handling):');
console.log('   Name: bounce.stromhaltig.de');
console.log('   Value: feedback-smtp.eu-central-1.amazonses.com');

console.log('\n🔒 SES Sandbox vs Production:');
console.log('');
console.log('Sandbox Mode (Standard):');
console.log('   ❌ Nur an verifizierte E-Mail-Adressen');
console.log('   ❌ Max 200 E-Mails pro Tag');
console.log('   ❌ Max 1 E-Mail pro Sekunde');
console.log('');
console.log('Production Mode (nach Antrag):');
console.log('   ✅ An beliebige E-Mail-Adressen');
console.log('   ✅ Höhere Sending Limits');
console.log('   ✅ Ideal für Team-Einladungen');

console.log('\n📊 SES Preise:');
console.log('   💰 Erste 62.000 E-Mails/Monat: KOSTENLOS');
console.log('   💰 Danach: $0.10 pro 1.000 E-Mails');
console.log('   💰 Eingehende E-Mails: $0.10 pro 1.000');
console.log('   💰 Attachments: $0.12 pro GB');
console.log('');
console.log('   → Für 10.000 Team-Einladungen/Monat: ~$1.00');
