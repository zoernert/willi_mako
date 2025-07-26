console.log('📝 AWS SES Production Access Antrag');
console.log('=====================================');
console.log('');

console.log('🎯 Warum Production Access nötig ist:');
console.log('   - Sandbox: Nur an verifizierte E-Mails (zoerner@gmail.com muss verifiziert sein)');
console.log('   - Production: An beliebige E-Mail-Adressen (für Team-Einladungen)');
console.log('');

console.log('📋 Antrag stellen in AWS Console:');
console.log('1. SES Dashboard → "Account Dashboard"');
console.log('2. "Request Production Access" Button');
console.log('3. Formular ausfüllen:');
console.log('');

console.log('📝 Formular-Antworten (Vorlage):');
console.log('');
console.log('Mail Type: "Transactional"');
console.log('');
console.log('Website URL: "https://willi-mako.com" (oder Ihre Domain)');
console.log('');
console.log('Use Case Description:');
console.log(`"We are developing a team collaboration platform called 'Willi Mako' 
that helps teams organize their work and communicate effectively. 

We need to send transactional emails for:
- Team invitation emails to new members
- Password reset notifications  
- Account verification emails
- Team activity notifications

All emails are opt-in based and sent only to users who explicitly 
request them through our platform. We expect to send approximately 
100-500 emails per month initially, growing to 1000-2000 emails 
per month as our user base grows.

We have implemented proper bounce and complaint handling and will 
monitor our sending reputation closely."`);
console.log('');

console.log('Additional Info:');
console.log(`"Our application is a business productivity tool focused on team 
collaboration. We only send emails that users explicitly request 
or expect as part of the service (team invitations, notifications).

We comply with GDPR and all relevant email marketing regulations.
No marketing or promotional emails will be sent through this service."`);
console.log('');

console.log('⏱️  Bearbeitungszeit: 24-48 Stunden');
console.log('');

console.log('🧪 Während der Wartezeit können Sie testen mit:');
console.log('   1. Verifizieren Sie zoerner@gmail.com in SES');
console.log('   2. Dann funktionieren Test-E-Mails auch im Sandbox-Mode');
console.log('');

console.log('📧 E-Mail-Adresse in SES verifizieren:');
console.log('1. SES Dashboard → "Verified identities"');
console.log('2. "Create identity" → "Email address"');
console.log('3. Eingeben: zoerner@gmail.com');
console.log('4. Verification E-Mail in Gmail bestätigen');
console.log('');

console.log('✅ Nach Production Access:');
console.log('   - Team-Einladungen an beliebige E-Mails möglich');
console.log('   - Höhere Sending-Limits');
console.log('   - Professioneller E-Mail-Service');
