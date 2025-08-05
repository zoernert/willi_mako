/**
 * Test-Script für die semantische FAQ-Verlinkung
 * Überprüft, ob die verbesserte Verlinkung tatsächlich sinnvolle Begriffe findet
 * anstatt nur Stoppwörter zu verwenden.
 */

// Importiere mit require und .ts Extension
const { faqLinkingService } = require('./src/services/faqLinkingService.ts');
const pool = require('./src/config/database.ts').default;

async function testSemanticFAQLinking() {
  console.log('🔗 Teste semantische FAQ-Verlinkung...\n');

  try {
    // Hole eine FAQ aus der Datenbank
    const faqResult = await pool.query(`
      SELECT id, title, description, context, answer, tags
      FROM faqs 
      WHERE is_active = true AND is_public = true 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (faqResult.rows.length === 0) {
      console.log('❌ Keine FAQs in der Datenbank gefunden');
      return;
    }

    const testFaq = faqResult.rows[0];
    console.log('📋 Test-FAQ:');
    console.log(`   ID: ${testFaq.id}`);
    console.log(`   Titel: ${testFaq.title}`);
    console.log(`   Antwort (erste 200 Zeichen): ${testFaq.answer.substring(0, 200)}...`);
    console.log('');

    // Teste die semantische Verlinkung
    console.log('🔍 Analysiere verlinkbare Begriffe...');
    const linkableTerms = await faqLinkingService.findLinkableTerms(testFaq.id, testFaq.answer);

    console.log(`\n✅ Gefundene verlinkbare Begriffe: ${linkableTerms.length}`);
    
    if (linkableTerms.length === 0) {
      console.log('   Keine verlinkbaren Begriffe gefunden.');
    } else {
      console.log('\n📊 Vorgeschlagene Links (sortiert nach Ähnlichkeits-Score):');
      console.log('   Rang | Begriff              | Ziel-FAQ-ID          | Score | Anzeige-Text');
      console.log('   -----|---------------------|----------------------|-------|-------------------');
      
      linkableTerms.forEach((term, index) => {
        const rank = (index + 1).toString().padStart(4);
        const termText = term.term.substring(0, 18).padEnd(18);
        const targetId = term.target_faq_id.substring(0, 20).padEnd(20);
        const score = (term.similarity_score || 0).toFixed(3);
        const displayText = (term.display_text || term.term).substring(0, 17);
        
        console.log(`   ${rank} | ${termText} | ${targetId} | ${score} | ${displayText}`);
      });

      // Zeige Details zu den Top 3 Begriffen
      console.log('\n🔍 Details zu den Top 3 Begriffen:');
      for (let i = 0; i < Math.min(3, linkableTerms.length); i++) {
        const term = linkableTerms[i];
        
        // Hole Details der Ziel-FAQ
        const targetFaqResult = await pool.query(`
          SELECT title, description 
          FROM faqs 
          WHERE id = $1
        `, [term.target_faq_id]);
        
        if (targetFaqResult.rows.length > 0) {
          const targetFaq = targetFaqResult.rows[0];
          console.log(`\n   ${i + 1}. Begriff: "${term.term}"`);
          console.log(`      Ähnlichkeits-Score: ${(term.similarity_score || 0).toFixed(3)}`);
          console.log(`      Ziel-FAQ Titel: ${targetFaq.title}`);
          console.log(`      Ziel-FAQ Beschreibung: ${targetFaq.description.substring(0, 100)}...`);
        }
      }
    }

    // Teste auch die automatische Link-Erstellung
    console.log('\n🤖 Teste automatische Link-Erstellung...');
    const createdLinksCount = await faqLinkingService.createAutomaticLinks(testFaq.id);
    console.log(`✅ ${createdLinksCount} automatische Links erstellt`);

    // Hole die erstellten Links
    const existingLinks = await faqLinkingService.getLinksForFAQ(testFaq.id);
    console.log(`📋 Insgesamt ${existingLinks.length} Links für diese FAQ vorhanden`);

    if (existingLinks.length > 0) {
      console.log('\n📎 Vorhandene Links:');
      existingLinks.forEach((link, index) => {
        console.log(`   ${index + 1}. "${link.term}" → FAQ ${link.target_faq_id}`);
      });
    }

    // Teste das Rendering von verlinktem Text
    console.log('\n📝 Teste Text-Rendering mit Links...');
    const renderedText = faqLinkingService.renderLinkedText(testFaq.answer, existingLinks);
    
    // Zähle die eingefügten Links
    const linkCount = (renderedText.match(/<a href="#faq-/g) || []).length;
    console.log(`✅ ${linkCount} Links im gerenderten Text eingefügt`);

    if (linkCount > 0) {
      // Zeige eine Vorschau des gerenderten Texts
      const preview = renderedText.substring(0, 300).replace(/<a[^>]*>/g, '[LINK]').replace(/<\/a>/g, '[/LINK]');
      console.log(`📄 Vorschau des verlinkten Texts: ${preview}...`);
    }

  } catch (error) {
    console.error('❌ Fehler beim Testen der semantischen FAQ-Verlinkung:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Analysiere Qualität der vorgeschlagenen Begriffe
async function analyzeTermQuality(terms) {
  const stopWords = [
    'der', 'die', 'das', 'und', 'oder', 'aber', 'auch', 'nur', 'so', 'zu', 'von', 'mit', 'bei', 'für',
    'was', 'ist', 'eine', 'ein', 'wie', 'wer', 'wo', 'wann', 'warum', 'kann', 'könnte', 'soll', 'wird'
  ];

  const qualityAnalysis = {
    totalTerms: terms.length,
    meaningfulTerms: 0,
    stopWordTerms: 0,
    technicalTerms: 0,
    averageLength: 0
  };

  const technicalPatterns = [
    /netzbetreiber/i, /messstellenbetreiber/i, /marktkommunikation/i, /bdew/i, /edifact/i,
    /utilmd/i, /mscons/i, /aperak/i, /bilanzkreis/i, /marktlokation/i, /messlokation/i,
    /regelenergie/i, /übertragungsnetz/i, /verteilnetz/i, /stromzähler/i, /lastgang/i
  ];

  let totalLength = 0;

  terms.forEach(term => {
    const termLower = term.term.toLowerCase();
    totalLength += term.term.length;

    if (stopWords.some(stopWord => termLower === stopWord)) {
      qualityAnalysis.stopWordTerms++;
    } else {
      qualityAnalysis.meaningfulTerms++;
    }

    if (technicalPatterns.some(pattern => pattern.test(termLower))) {
      qualityAnalysis.technicalTerms++;
    }
  });

  qualityAnalysis.averageLength = terms.length > 0 ? totalLength / terms.length : 0;
  qualityAnalysis.meaningfulPercentage = terms.length > 0 ? (qualityAnalysis.meaningfulTerms / terms.length) * 100 : 0;
  qualityAnalysis.technicalPercentage = terms.length > 0 ? (qualityAnalysis.technicalTerms / terms.length) * 100 : 0;

  console.log('\n📊 Qualitätsanalyse der vorgeschlagenen Begriffe:');
  console.log(`   Gesamtzahl: ${qualityAnalysis.totalTerms}`);
  console.log(`   Bedeutungsvolle Begriffe: ${qualityAnalysis.meaningfulTerms} (${qualityAnalysis.meaningfulPercentage.toFixed(1)}%)`);
  console.log(`   Stoppwörter: ${qualityAnalysis.stopWordTerms}`);
  console.log(`   Fachbegriffe: ${qualityAnalysis.technicalTerms} (${qualityAnalysis.technicalPercentage.toFixed(1)}%)`);
  console.log(`   Durchschnittliche Länge: ${qualityAnalysis.averageLength.toFixed(1)} Zeichen`);

  if (qualityAnalysis.meaningfulPercentage > 80) {
    console.log('   ✅ Sehr gute Qualität - wenige Stoppwörter');
  } else if (qualityAnalysis.meaningfulPercentage > 60) {
    console.log('   ⚠️  Mittlere Qualität - einige Stoppwörter');
  } else {
    console.log('   ❌ Niedrige Qualität - viele Stoppwörter');
  }

  return qualityAnalysis;
}

// Starte den Test
testSemanticFAQLinking();
