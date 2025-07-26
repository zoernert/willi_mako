const dns = require('dns').promises;
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

async function checkDNSRecords() {
    console.log('🔍 DNS-Analyse für stromhaltig.de\n');
    
    try {
        // 1. Aktuelle externe IP des Entwicklerrechners ermitteln
        console.log('🌐 Ermittle aktuelle externe IP...');
        try {
            const { stdout } = await execAsync('curl -s ifconfig.me');
            const externalIP = stdout.trim();
            console.log(`   Ihre externe IP: ${externalIP}\n`);
        } catch (error) {
            console.log('   ⚠️  Konnte externe IP nicht ermitteln\n');
        }
        
        // 2. SPF-Records prüfen
        console.log('📧 SPF-Records für stromhaltig.de:');
        try {
            const txtRecords = await dns.resolveTxt('stromhaltig.de');
            const spfRecords = txtRecords.filter(record => 
                record.join('').toLowerCase().includes('spf') || 
                record.join('').toLowerCase().includes('v=spf1')
            );
            
            if (spfRecords.length > 0) {
                spfRecords.forEach(record => {
                    console.log(`   ✅ SPF: ${record.join('')}`);
                });
                
                // SPF-Record analysieren
                const spfString = spfRecords[0].join('');
                console.log('\n📋 SPF-Record Analyse:');
                
                if (spfString.includes('include:') || spfString.includes('a:') || spfString.includes('mx')) {
                    console.log('   ✅ SPF enthält authorisierte Sender');
                } else {
                    console.log('   ⚠️  SPF könnte zu restriktiv sein');
                }
                
                if (spfString.includes('~all') || spfString.includes('-all')) {
                    console.log('   ⚠️  SPF ist restriktiv - externe IPs werden abgelehnt');
                    console.log('   💡 Problem: Ihr Entwicklerrechner ist nicht im SPF autorisiert!');
                } else if (spfString.includes('+all')) {
                    console.log('   ⚠️  SPF erlaubt alle Sender (unsicher)');
                }
                
            } else {
                console.log('   ❌ Kein SPF-Record gefunden');
            }
        } catch (error) {
            console.log(`   ❌ Fehler beim SPF-Check: ${error.message}`);
        }
        
        // 3. MX-Records prüfen
        console.log('\n📬 MX-Records für stromhaltig.de:');
        try {
            const mxRecords = await dns.resolveMx('stromhaltig.de');
            if (mxRecords.length > 0) {
                mxRecords.forEach(mx => {
                    console.log(`   ✅ MX: ${mx.exchange} (Priorität: ${mx.priority})`);
                });
            } else {
                console.log('   ❌ Keine MX-Records gefunden');
            }
        } catch (error) {
            console.log(`   ❌ Fehler beim MX-Check: ${error.message}`);
        }
        
        // 4. A-Record prüfen
        console.log('\n🌐 A-Records für stromhaltig.de:');
        try {
            const aRecords = await dns.resolve4('stromhaltig.de');
            aRecords.forEach(ip => {
                console.log(`   ✅ A: ${ip}`);
            });
        } catch (error) {
            console.log(`   ❌ Fehler beim A-Record-Check: ${error.message}`);
        }
        
        // 5. DKIM-Records prüfen (häufige Selektoren)
        console.log('\n🔐 DKIM-Records prüfen:');
        const dkimSelectors = ['default', 'mail', 'dkim', 'selector1', 'selector2', 'k1', 's1'];
        
        for (const selector of dkimSelectors) {
            try {
                const dkimDomain = `${selector}._domainkey.stromhaltig.de`;
                const txtRecords = await dns.resolveTxt(dkimDomain);
                const dkimRecords = txtRecords.filter(record => 
                    record.join('').toLowerCase().includes('dkim') || 
                    record.join('').toLowerCase().includes('v=dkim1')
                );
                
                if (dkimRecords.length > 0) {
                    console.log(`   ✅ DKIM (${selector}): ${dkimRecords[0].join('').substring(0, 100)}...`);
                }
            } catch (error) {
                // Normal - die meisten Selektoren existieren nicht
            }
        }
        
        // 6. DMARC-Record prüfen
        console.log('\n🛡️  DMARC-Records für stromhaltig.de:');
        try {
            const dmarcRecords = await dns.resolveTxt('_dmarc.stromhaltig.de');
            const dmarc = dmarcRecords.filter(record => 
                record.join('').toLowerCase().includes('dmarc') || 
                record.join('').toLowerCase().includes('v=dmarc1')
            );
            
            if (dmarc.length > 0) {
                console.log(`   ✅ DMARC: ${dmarc[0].join('')}`);
            } else {
                console.log('   ❌ Kein DMARC-Record gefunden');
            }
        } catch (error) {
            console.log('   ❌ Kein DMARC-Record gefunden');
        }
        
        // 7. Fazit und Empfehlungen
        console.log('\n🎯 FAZIT UND LÖSUNGSVORSCHLÄGE:');
        console.log('=====================================');
        console.log('');
        console.log('Das Problem ist sehr wahrscheinlich:');
        console.log('❌ Ihr Entwicklerrechner ist NICHT im SPF-Record autorisiert');
        console.log('❌ E-Mails von nicht-autorisierten IPs werden von Gmail abgelehnt/gefiltert');
        console.log('');
        console.log('🔧 LÖSUNGEN:');
        console.log('');
        console.log('1. 🏗️  PRODUKTIONSSERVER verwenden:');
        console.log('   - Testen Sie vom gleichen Server, der auch den SPF-Record hat');
        console.log('   - Oder vom Server, der in den MX/A-Records steht');
        console.log('');
        console.log('2. 📧 SMTP-RELAY verwenden:');
        console.log('   - Verwenden Sie einen autorisierten SMTP-Server');
        console.log('   - Der sslout.de Server sollte bereits autorisiert sein');
        console.log('');
        console.log('3. 🔧 SPF-Record erweitern (nur für Tests):');
        console.log('   - Fügen Sie Ihre externe IP temporär zum SPF hinzu');
        console.log('   - WARNUNG: Macht die Domain unsicherer!');
        console.log('');
        console.log('4. ✅ EMPFOHLEN - Server-IP prüfen:');
        console.log('   - Finden Sie heraus, von welcher IP sslout.de versendet');
        console.log('   - Diese IP muss im SPF-Record stehen');
        
    } catch (error) {
        console.error('❌ Fehler bei der DNS-Analyse:', error);
    }
}

// Script ausführen
checkDNSRecords();
