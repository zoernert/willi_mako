const dns = require('dns').promises;

async function checkDomainSettings() {
    const domain = 'stromhaltig.de';
    const smtpHost = 'sslout.de';
    
    console.log(`🔍 DNS-Analyse für ${domain}\n`);
    
    try {
        // 1. MX Records prüfen
        console.log('📧 MX Records:');
        try {
            const mxRecords = await dns.resolveMx(domain);
            if (mxRecords.length > 0) {
                console.log('   ✅ MX Records gefunden:');
                mxRecords.sort((a, b) => a.priority - b.priority);
                mxRecords.forEach(mx => {
                    console.log(`      - ${mx.exchange} (Priorität: ${mx.priority})`);
                });
            } else {
                console.log('   ❌ Keine MX Records gefunden');
            }
        } catch (error) {
            console.log(`   ❌ MX Record Fehler: ${error.message}`);
        }
        
        // 2. TXT Records prüfen (SPF, DKIM, DMARC)
        console.log('\n📋 TXT Records:');
        try {
            const txtRecords = await dns.resolveTxt(domain);
            console.log(`   📝 ${txtRecords.length} TXT Records gefunden:`);
            
            let spfFound = false;
            let dmarcFound = false;
            
            txtRecords.forEach((record, index) => {
                const recordText = record.join('');
                console.log(`      ${index + 1}. ${recordText}`);
                
                if (recordText.includes('v=spf1')) {
                    spfFound = true;
                    console.log('         ✅ SPF Record gefunden');
                    
                    // Prüfen ob sslout.de erlaubt ist
                    if (recordText.includes('sslout.de') || 
                        recordText.includes('ispgateway.de') || 
                        recordText.includes('include:') ||
                        recordText.includes('a:') ||
                        recordText.includes('mx') ||
                        recordText.includes('~all') ||
                        recordText.includes('+all')) {
                        console.log('         ✅ SMTP-Server könnte erlaubt sein');
                    } else {
                        console.log('         ⚠️  SMTP-Server möglicherweise nicht explizit erlaubt');
                    }
                }
                
                if (recordText.includes('v=DMARC1')) {
                    dmarcFound = true;
                    console.log('         ✅ DMARC Record gefunden');
                }
            });
            
            if (!spfFound) {
                console.log('   ❌ Kein SPF Record gefunden!');
            }
            if (!dmarcFound) {
                console.log('   ⚠️  Kein DMARC Record gefunden');
            }
            
        } catch (error) {
            console.log(`   ❌ TXT Record Fehler: ${error.message}`);
        }
        
        // 3. DKIM Records prüfen (häufige Selektoren)
        console.log('\n🔐 DKIM Records:');
        const dkimSelectors = ['default', 'mail', 'google', 'selector1', 'selector2', 'dkim', 's1', 's2'];
        
        for (const selector of dkimSelectors) {
            try {
                const dkimDomain = `${selector}._domainkey.${domain}`;
                const dkimRecords = await dns.resolveTxt(dkimDomain);
                if (dkimRecords.length > 0) {
                    console.log(`   ✅ DKIM gefunden: ${selector}._domainkey.${domain}`);
                    dkimRecords.forEach(record => {
                        const recordText = record.join('');
                        if (recordText.includes('v=DKIM1')) {
                            console.log(`      📝 ${recordText.substring(0, 100)}...`);
                        }
                    });
                }
            } catch (error) {
                // DKIM nicht gefunden ist normal, keine Fehlermeldung
            }
        }
        
        // 4. SMTP Host prüfen
        console.log(`\n🖥️  SMTP Host (${smtpHost}):`);
        try {
            const smtpIps = await dns.resolve4(smtpHost);
            console.log(`   ✅ IP-Adressen: ${smtpIps.join(', ')}`);
            
            // Reverse DNS prüfen
            for (const ip of smtpIps.slice(0, 2)) { // Nur ersten 2 IPs prüfen
                try {
                    const hostnames = await dns.reverse(ip);
                    console.log(`   🔄 Reverse DNS für ${ip}: ${hostnames.join(', ')}`);
                } catch (error) {
                    console.log(`   ⚠️  Kein Reverse DNS für ${ip}`);
                }
            }
        } catch (error) {
            console.log(`   ❌ SMTP Host Fehler: ${error.message}`);
        }
        
        // 5. Gmail MX Records zum Vergleich
        console.log('\n📨 Gmail MX Records (Ziel):');
        try {
            const gmailMx = await dns.resolveMx('gmail.com');
            console.log('   ✅ Gmail MX Records:');
            gmailMx.sort((a, b) => a.priority - b.priority);
            gmailMx.forEach(mx => {
                console.log(`      - ${mx.exchange} (Priorität: ${mx.priority})`);
            });
        } catch (error) {
            console.log(`   ❌ Gmail MX Fehler: ${error.message}`);
        }
        
        // 6. Zusammenfassung und Empfehlungen
        console.log('\n📊 ZUSAMMENFASSUNG:');
        console.log('=====================================');
        
        console.log('\n🔧 MÖGLICHE PROBLEME UND LÖSUNGEN:');
        console.log('1. 📧 E-Mail-Reputation:');
        console.log('   - Neue Absender-Domain benötigen Zeit für Reputation');
        console.log('   - Gmail ist besonders streng bei unbekannten Absendern');
        
        console.log('\n2. 🛡️  SPF/DKIM/DMARC:');
        console.log('   - Überprüfen Sie ob sslout.de in SPF Record erlaubt ist');
        console.log('   - DKIM-Signierung vom SMTP-Provider aktivieren');
        console.log('   - DMARC-Policy eventuell zu streng');
        
        console.log('\n3. 📮 Gmail-spezifische Probleme:');
        console.log('   - Prüfen Sie Gmail Spam-Ordner');
        console.log('   - Gmail filtert manchmal automatische E-Mails');
        console.log('   - Bulk-E-Mails werden oft blockiert');
        
        console.log('\n4. 🔍 Debugging-Schritte:');
        console.log('   - E-Mail an anderen Provider testen (nicht Gmail)');
        console.log('   - Mail-Tester verwenden (mail-tester.com)');
        console.log('   - SMTP-Provider kontaktieren für Whitelisting');
        
    } catch (error) {
        console.error('❌ DNS-Analyse fehlgeschlagen:', error);
    }
}

checkDomainSettings();
