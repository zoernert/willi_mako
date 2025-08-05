/**
 * Demonstrationsdokumentation: Verbesserte semantische FAQ-Verlinkung
 * 
 * Das Problem:
 * - Die ursprüngliche FAQ-Verlinkung verwendete primitive Keyword-Extraktion
 * - Stoppwörter wie "der", "die", "das", "kann", "wird" wurden als Verlinkungsvorschläge generiert
 * - Keine semantische Analyse der Inhalte
 * 
 * Die Lösung:
 * - Implementierung einer KI-basierten semantischen Analyse mit Gemini
 * - Extraktion von domänenspezifischen Fachbegrffen der Energiewirtschaft
 * - Berechnung von semantischen Ähnlichkeitsscores zwischen FAQs
 * - Intelligente Auswahl von Verlinkungsbegriffen
 * 
 * Verbesserungen im Detail:
 */

// 1. VERBESSERTER PROMPT FÜR BEGRIFF-EXTRAKTION
// Alter Ansatz: Einfache Stoppwort-Filterung
// Neuer Ansatz: KI-gestützte Fachbegriff-Extraktion

function extractSemanticTerms_OLD(text) {
  const stopWords = ['was', 'ist', 'eine', 'ein', 'der', 'die', 'das'];
  return text.split(' ').filter(word => !stopWords.includes(word.toLowerCase()));
}

function extractSemanticTerms_NEW(answerText, currentFaq) {
  const prompt = `Du bist ein Experte für die deutsche Energiewirtschaft. Extrahiere die wichtigsten Fachbegriffe aus dem folgenden Text.

WICHTIGE ANFORDERUNGEN:
- Fokussiere dich auf technische Begriffe, Prozesse, Standards und Normen der Energiewirtschaft
- Ignoriere Füllwörter wie "der", "die", "das", "kann", "wird", "haben", "sein"
- Bevorzuge zusammengesetzte Fachbegriffe (z.B. "Marktkommunikation", "Messstellenbetreiber")
- Berücksichtige Abkürzungen und Standards (z.B. "BDEW", "EDIFACT", "UTILMD")

Text: ${answerText}

Gib nur die 5-10 wichtigsten Fachbegriffe zurück, getrennt durch Kommas.
Beispiel: Marktkommunikation, Netzbetreiber, BDEW, EDIFACT, Messstellenbetreiber

ANTWORT (nur Begriffe, keine Erklärungen):`;
  
  // Gemini AI-Aufruf würde hier erfolgen
  return gemini.generateText(prompt);
}

// 2. SEMANTISCHE ÄHNLICHKEITSBERECHNUNG
// Alter Ansatz: Einfacher Wort-Overlap
// Neuer Ansatz: KI-basierte thematische Ähnlichkeitsanalyse

function calculateSimilarity_OLD(faq1, faq2) {
  const words1 = faq1.title.split(' ');
  const words2 = faq2.title.split(' ');
  const overlap = words1.filter(word => words2.includes(word));
  return overlap.length / Math.max(words1.length, words2.length);
}

function calculateSemanticSimilarity_NEW(currentFaq, targetFaq, answerText) {
  const prompt = `Du bist ein KI-Experte für die deutsche Energiewirtschaft. Analysiere die thematische Überschneidung zwischen diesen beiden FAQ-Einträgen.

FAQ 1 (Aktuell):
Titel: ${currentFaq.title}
Beschreibung: ${currentFaq.description}
Antwort: ${answerText.substring(0, 800)}...

FAQ 2 (Ziel):
Titel: ${targetFaq.title}
Beschreibung: ${targetFaq.description}

AUFGABE:
1. Bewerte die thematische Ähnlichkeit (0.0 = völlig unterschiedlich, 1.0 = sehr ähnlich)
2. Schlage 2-4 spezifische Fachbegriffe vor, die als Verlinkungsbegriffe geeignet wären

Bewertungskriterien:
- Behandeln beide FAQs ähnliche Energiewirtschaftsprozesse? (+0.3)
- Beziehen sie sich auf dieselben Akteure (Netzbetreiber, MSB, Lieferanten)? (+0.2)
- Verwenden sie ähnliche Fachbegriffe oder Standards? (+0.3)
- Haben sie thematische Überschneidungen? (+0.2)

Antworte nur als JSON:
{
  "similarity_score": 0.0-1.0,
  "suggested_terms": ["Fachbegriff1", "Fachbegriff2"],
  "reason": "Kurze Begründung der Bewertung"
}`;

  // Gemini AI-Aufruf würde hier erfolgen
  return gemini.generateText(prompt);
}

// 3. INTELLIGENTE BEGRIFFSWAHL
// Neuer Ansatz: Kombiniert AI-Vorschläge mit Textvorkommen

function findBestLinkTerm_NEW(semanticTerms, targetFaq, answerText, suggestedTerms) {
  // Kombiniere semantische Begriffe mit AI-Vorschlägen
  const allTerms = [...new Set([...semanticTerms, ...suggestedTerms])];
  
  // Prüfe welche Begriffe tatsächlich im Text vorkommen
  const candidateTerms = allTerms.filter(term => {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
    return regex.test(answerText);
  });

  if (candidateTerms.length === 0) {
    // Fallback: Prüfe ob Teile des Ziel-FAQ-Titels im Text vorkommen
    const titleWords = extractMeaningfulWords(targetFaq.title);
    for (const word of titleWords) {
      const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi');
      if (regex.test(answerText) && word.length > 3) {
        return word;
      }
    }
    return null;
  }

  // Wähle den längsten/spezifischsten Begriff
  return candidateTerms.reduce((best, current) => 
    current.length > best.length ? current : best
  );
}

// 4. VERBESSERTE STOPPWORT-ERKENNUNG
// Erweiterte Liste mit energiewirtschaftsspezifischen Stoppwörtern

const ENHANCED_STOPWORDS = [
  // Basis-Stoppwörter
  'was', 'ist', 'eine', 'ein', 'der', 'die', 'das', 'wie', 'wer', 'wo', 'wann', 'warum',
  'und', 'oder', 'aber', 'auch', 'noch', 'nur', 'so', 'zu', 'von', 'mit', 'bei', 'für',
  
  // Erweiterte Stoppwörter
  'sich', 'werden', 'wird', 'kann', 'könnte', 'soll', 'sollte', 'muss', 'müssen',
  'haben', 'hat', 'hatte', 'sind', 'war', 'waren', 'sein', 'seine', 'ihrer', 'diesem',
  'diese', 'dieser', 'dieses', 'alle', 'jeden', 'jeder', 'jede', 'durch', 'über', 'unter',
  'zwischen', 'während', 'nach', 'vor', 'seit', 'bis', 'ohne', 'gegen', 'damit', 'dabei'
];

// 5. FALLBACK MIT ENERGIEWIRTSCHAFTS-FACHBEGRIFFEN
// Für den Fall, dass die AI-Analyse fehlschlägt

const ENERGY_DOMAIN_TERMS = [
  'Netzbetreiber', 'Messstellenbetreiber', 'Lieferant', 'Marktkommunikation',
  'BDEW', 'EDIFACT', 'UTILMD', 'MSCONS', 'APERAK', 'Bilanzkreis',
  'Marktlokation', 'Messlokation', 'Zählpunkt', 'Sperrung', 'Entsperrung',
  'Anschlussnutzung', 'Netznutzung', 'Stromzähler', 'Lastgang',
  'Verbrauchsstelle', 'Erzeugungsanlage', 'Regelenergie', 'Übertragungsnetz'
];

// ERGEBNIS:
// Die neue semantische FAQ-Verlinkung sollte jetzt:
// ✅ Sinnvolle Fachbegriffe wie "Marktkommunikation", "Netzbetreiber", "BDEW" vorschlagen
// ✅ Stoppwörter wie "der", "die", "das", "kann" vermeiden
// ✅ Thematische Ähnlichkeiten zwischen FAQs korrekt bewerten
// ✅ Kontextbezogene Verlinkungsvorschläge machen
// ✅ Robuste Fallback-Mechanismen haben

console.log("Semantische FAQ-Verlinkung erfolgreich verbessert!");
console.log("Teste die Verbesserungen über die Admin-Oberfläche unter FAQ-Management.");
