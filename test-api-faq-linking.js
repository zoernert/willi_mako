/**
 * Einfacher Test für die FAQ-Verlinkung über die API
 */

async function testFAQLinkingViaAPI() {
  try {
    console.log('🔗 Teste FAQ-Verlinkung über API...\n');

    // Hole FAQs über die API
    const response = await fetch('http://localhost:3001/api/faqs');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const faqs = await response.json();
    console.log(`✅ ${faqs.length} FAQs gefunden`);

    if (faqs.length === 0) {
      console.log('❌ Keine FAQs vorhanden zum Testen');
      return;
    }

    // Teste mit der ersten FAQ
    const testFaq = faqs[0];
    console.log(`\n📋 Teste mit FAQ: "${testFaq.title}"`);
    
    // Teste die Verlinkung (API-Endpunkt muss existieren)
    const linkingResponse = await fetch(`http://localhost:3001/api/faqs/${testFaq.id}/links`, {
      method: 'GET'
    });

    if (linkingResponse.ok) {
      const links = await linkingResponse.json();
      console.log(`🔗 ${links.length} Links gefunden für diese FAQ`);
      
      links.forEach((link, index) => {
        console.log(`   ${index + 1}. "${link.term}" → ${link.target_faq_id}`);
      });
    } else {
      console.log('⚠️  Keine Links API gefunden oder Fehler beim Laden');
    }

    // Teste automatische Link-Generierung
    const autoLinkResponse = await fetch(`http://localhost:3001/api/faqs/${testFaq.id}/auto-link`, {
      method: 'POST'
    });

    if (autoLinkResponse.ok) {
      const result = await autoLinkResponse.json();
      console.log(`🤖 ${result.created_links || 0} automatische Links erstellt`);
    } else {
      console.log('⚠️  Auto-Link API nicht verfügbar');
    }

  } catch (error) {
    console.error('❌ Fehler beim API-Test:', error.message);
  }
}

// Warte auf Server-Start und teste dann
setTimeout(() => {
  testFAQLinkingViaAPI();
}, 10000); // 10 Sekunden warten
