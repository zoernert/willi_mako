"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.faqLinkingService = exports.FAQLinkingService = void 0;
const database_1 = __importDefault(require("../config/database"));
const gemini_1 = __importDefault(require("./gemini"));
const aiResponseUtils_1 = require("../utils/aiResponseUtils");
class FAQLinkingService {
    /**
     * Findet automatisch verlinkbare Begriffe in einer FAQ-Antwort mittels semantischer Analyse
     */
    async findLinkableTerms(faqId, answerText) {
        // Hole alle anderen öffentlichen FAQs mit ihren Inhalten
        const result = await database_1.default.query(`
      SELECT id, title, description, context, answer, tags
      FROM faqs
      WHERE id != $1 AND is_active = true AND is_public = true
    `, [faqId]);
        const otherFAQs = result.rows;
        const links = [];
        // Hole die aktuelle FAQ für besseren Kontext
        const currentFaqResult = await database_1.default.query(`
      SELECT title, description, context, tags FROM faqs WHERE id = $1
    `, [faqId]);
        if (currentFaqResult.rows.length === 0) {
            return links;
        }
        const currentFaq = currentFaqResult.rows[0];
        // Extrahiere semantische Begriffe aus der aktuellen FAQ
        const semanticTerms = await this.extractSemanticTerms(answerText, currentFaq);
        for (const faq of otherFAQs) {
            // Analysiere semantische Ähnlichkeit zwischen FAQs
            const similarity = await this.calculateSemanticSimilarity(currentFaq, faq, answerText);
            if (similarity.score > 0.3) { // Minimum Ähnlichkeits-Schwellenwert
                // Finde den besten Begriff für die Verlinkung
                const linkTerm = await this.findBestLinkTerm(semanticTerms, faq, answerText, similarity.suggestedTerms);
                if (linkTerm && linkTerm.length > 2) {
                    // Prüfe ob bereits ein Link existiert
                    const existingLink = await this.getLinkExists(faqId, faq.id, linkTerm);
                    if (!existingLink) {
                        links.push({
                            term: linkTerm,
                            target_faq_id: faq.id,
                            display_text: linkTerm,
                            similarity_score: similarity.score
                        });
                    }
                }
            }
        }
        // Sortiere nach Ähnlichkeits-Score (höchste zuerst)
        return links.sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
    }
    /**
     * Erstellt automatische Links für eine FAQ
     */
    async createAutomaticLinks(faqId, userId) {
        const faqResult = await database_1.default.query('SELECT answer FROM faqs WHERE id = $1', [faqId]);
        if (faqResult.rows.length === 0) {
            throw new Error('FAQ not found');
        }
        const answerText = faqResult.rows[0].answer;
        const linkableTerms = await this.findLinkableTerms(faqId, answerText);
        let createdLinksCount = 0;
        for (const term of linkableTerms) {
            try {
                await this.createLink({
                    source_faq_id: faqId,
                    target_faq_id: term.target_faq_id,
                    term: term.term,
                    display_text: term.display_text,
                    is_automatic: true
                }, userId);
                createdLinksCount++;
            }
            catch (error) {
                // Link existiert bereits oder anderer Fehler - ignorieren
                console.log(`Could not create link: ${error}`);
            }
        }
        return createdLinksCount;
    }
    /**
     * Erstellt einen neuen FAQ-Link
     */
    async createLink(linkData, userId) {
        const result = await database_1.default.query(`
      INSERT INTO faq_links (source_faq_id, target_faq_id, term, display_text, is_automatic, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
            linkData.source_faq_id,
            linkData.target_faq_id,
            linkData.term,
            linkData.display_text,
            linkData.is_automatic || false,
            userId
        ]);
        return result.rows[0];
    }
    /**
     * Holt alle Links für eine FAQ
     */
    async getLinksForFAQ(faqId) {
        const result = await database_1.default.query(`
      SELECT fl.id as link_id, fl.term, fl.target_faq_id, fl.display_text,
             f.title as target_title
      FROM faq_links fl
      JOIN faqs f ON fl.target_faq_id = f.id
      WHERE fl.source_faq_id = $1 AND f.is_active = true
    `, [faqId]);
        return result.rows.map(row => ({
            term: row.term,
            target_faq_id: row.target_faq_id,
            display_text: row.display_text || row.term,
            link_id: row.link_id
        }));
    }
    /**
     * Löscht einen FAQ-Link
     */
    async deleteLink(linkId) {
        const result = await database_1.default.query('DELETE FROM faq_links WHERE id = $1', [linkId]);
        return (result.rowCount || 0) > 0;
    }
    /**
     * Wandelt FAQ-Text mit Verlinkungen um
     */
    renderLinkedText(text, links) {
        let processedText = text;
        // Sortiere Links nach Länge (längste zuerst) um Überschneidungen zu vermeiden
        const sortedLinks = links.sort((a, b) => b.term.length - a.term.length);
        for (const link of sortedLinks) {
            const regex = new RegExp(`\\b${this.escapeRegExp(link.term)}\\b`, 'gi');
            processedText = processedText.replace(regex, `<a href="#faq-${link.target_faq_id}" class="faq-link" data-faq-id="${link.target_faq_id}" data-link-id="${link.link_id}">${link.display_text || link.term}</a>`);
        }
        return processedText;
    }
    /**
     * Prüft ob ein Link bereits existiert
     */
    async getLinkExists(sourceFaqId, targetFaqId, term) {
        const result = await database_1.default.query(`
      SELECT id FROM faq_links
      WHERE source_faq_id = $1 AND target_faq_id = $2 AND term = $3
    `, [sourceFaqId, targetFaqId, term]);
        return result.rows.length > 0;
    }
    /**
     * Escapes special regex characters
     */
    escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Holt Statistiken über FAQ-Verlinkungen
     */
    async getLinkingStats() {
        const totalLinksResult = await database_1.default.query('SELECT COUNT(*) as count FROM faq_links');
        const automaticLinksResult = await database_1.default.query('SELECT COUNT(*) as count FROM faq_links WHERE is_automatic = true');
        const manualLinksResult = await database_1.default.query('SELECT COUNT(*) as count FROM faq_links WHERE is_automatic = false');
        const mostLinkedResult = await database_1.default.query(`
      SELECT f.id, f.title, COUNT(fl.id) as link_count
      FROM faqs f
      LEFT JOIN faq_links fl ON f.id = fl.target_faq_id
      WHERE f.is_active = true
      GROUP BY f.id, f.title
      ORDER BY link_count DESC
      LIMIT 1
    `);
        return {
            total_links: parseInt(totalLinksResult.rows[0].count),
            automatic_links: parseInt(automaticLinksResult.rows[0].count),
            manual_links: parseInt(manualLinksResult.rows[0].count),
            most_linked_faq: mostLinkedResult.rows[0] || null
        };
    }
    /**
     * Extrahiert semantische Begriffe aus FAQ-Text mittels AI
     */
    async extractSemanticTerms(answerText, currentFaq) {
        try {
            const prompt = `Du bist ein Experte für die deutsche Energiewirtschaft. Extrahiere die wichtigsten Fachbegriffe und Schlüsselwörter aus dem folgenden Text.

WICHTIGE ANFORDERUNGEN:
- Fokussiere dich auf technische Begriffe, Prozesse, Standards und Normen der Energiewirtschaft
- Ignoriere Füllwörter wie "der", "die", "das", "kann", "wird", "haben", "sein"
- Bevorzuge zusammengesetzte Fachbegriffe (z.B. "Marktkommunikation", "Messstellenbetreiber")
- Berücksichtige Abkürzungen und Standards (z.B. "BDEW", "EDIFACT", "UTILMD")

FAQ-Titel: ${currentFaq.title}
FAQ-Beschreibung: ${currentFaq.description}
FAQ-Kontext: ${currentFaq.context}

Haupttext zur Analyse:
${answerText}

Gib nur die 5-10 wichtigsten Fachbegriffe zurück, getrennt durch Kommas.
Beispiel: Marktkommunikation, Netzbetreiber, BDEW, EDIFACT, Messstellenbetreiber, Bilanzkreis, Marktlokation

ANTWORT (nur Begriffe, keine Erklärungen):`;
            const result = await gemini_1.default.generateText(prompt);
            console.log('Raw semantic terms AI response:', result.substring(0, 100) + '...');
            // Parse die Antwort und extrahiere die Begriffe
            return result
                .split(',')
                .map(term => term.trim())
                .filter(term => term.length > 2 && !this.isStopWord(term))
                .slice(0, 10); // Limitiere auf 10 Begriffe
        }
        catch (error) {
            console.error('Error extracting semantic terms:', error);
            return this.fallbackKeywordExtraction(answerText + ' ' + currentFaq.title);
        }
    }
    /**
     * Sichere JSON-Parsing mit mehreren Fallback-Strategien
     */
    parseAIJsonResponse(response) {
        try {
            // Zuerst mit der utility aus aiResponseUtils versuchen
            const parsed = (0, aiResponseUtils_1.safeParseJsonResponse)(response);
            if (parsed) {
                return parsed;
            }
        }
        catch (error) {
            console.log('safeParseJsonResponse failed, trying manual parsing');
        }
        // Manuelle Bereinigung und Parsing
        // Use the robust safeParseJsonResponse function
        return (0, aiResponseUtils_1.safeParseJsonResponse)(response);
    }
    /**
     * Berechnet semantische Ähnlichkeit zwischen zwei FAQs
     */
    async calculateSemanticSimilarity(currentFaq, targetFaq, answerText) {
        try {
            const prompt = `Du bist ein KI-Experte für die deutsche Energiewirtschaft. Analysiere die thematische Überschneidung zwischen diesen beiden FAQ-Einträgen.

FAQ 1 (Aktuell):
Titel: ${currentFaq.title}
Beschreibung: ${currentFaq.description}
Antwort: ${answerText.substring(0, 800)}${answerText.length > 800 ? '...' : ''}

FAQ 2 (Ziel):
Titel: ${targetFaq.title}
Beschreibung: ${targetFaq.description}
Kontext: ${targetFaq.context || ''}

AUFGABE:
1. Bewerte die thematische Ähnlichkeit (0.0 = völlig unterschiedlich, 1.0 = sehr ähnlich)
2. Schlage 2-4 spezifische Fachbegriffe vor, die als Verlinkungsbegriffe geeignet wären
3. Berücksichtige dabei: Energiewirtschaftliche Prozesse, Normen, Standards, Akteure, Technologien

Bewertungskriterien:
- Behandeln beide FAQs ähnliche Energiewirtschaftsprozesse? (+0.3)
- Beziehen sie sich auf dieselben Akteure (Netzbetreiber, MSB, Lieferanten)? (+0.2)
- Verwenden sie ähnliche Fachbegriffe oder Standards? (+0.3)
- Haben sie thematische Überschneidungen? (+0.2)

Antworte ausschließlich mit sauberem JSON ohne Markdown-Formatierung oder Code-Blöcke:
{
  "similarity_score": 0.0-1.0,
  "suggested_terms": ["Fachbegriff1", "Fachbegriff2", "Fachbegriff3"],
  "reason": "Kurze Begründung der Bewertung"
}

WICHTIG: Keine \`\`\`json oder \`\`\` Blöcke verwenden, nur das reine JSON-Objekt!`;
            const result = await gemini_1.default.generateText(prompt);
            console.log('Raw semantic similarity AI response:', result.substring(0, 200) + '...');
            const parsed = this.parseAIJsonResponse(result);
            if (!parsed) {
                console.error('Failed to parse semantic similarity response as JSON, using fallback');
                console.error('Raw response that failed to parse:', result);
                return this.fallbackSimilarityCalculation(currentFaq, targetFaq, answerText);
            }
            return {
                score: Math.min(Math.max(parsed.similarity_score || 0, 0), 1), // Clamp zwischen 0-1
                suggestedTerms: Array.isArray(parsed.suggested_terms) ? parsed.suggested_terms : []
            };
        }
        catch (error) {
            console.error('Error calculating semantic similarity:', error);
            // Fallback: Einfache Wort-basierte Ähnlichkeit
            return this.fallbackSimilarityCalculation(currentFaq, targetFaq, answerText);
        }
    }
    /**
     * Findet den besten Begriff für eine Verlinkung
     */
    async findBestLinkTerm(semanticTerms, targetFaq, answerText, suggestedTerms) {
        // Kombiniere semantische Begriffe mit AI-Vorschlägen
        const allTerms = [...new Set([...semanticTerms, ...suggestedTerms])];
        // Prüfe welche Begriffe tatsächlich im Text vorkommen
        const candidateTerms = allTerms.filter(term => {
            const regex = new RegExp(`\\b${this.escapeRegExp(term)}\\b`, 'gi');
            return regex.test(answerText);
        });
        if (candidateTerms.length === 0) {
            // Fallback: Prüfe ob Teile des Ziel-FAQ-Titels im Text vorkommen
            const titleWords = this.extractMeaningfulWords(targetFaq.title);
            for (const word of titleWords) {
                const regex = new RegExp(`\\b${this.escapeRegExp(word)}\\b`, 'gi');
                if (regex.test(answerText) && word.length > 3) {
                    return word;
                }
            }
            return null;
        }
        // Wähle den längsten/spezifischsten Begriff
        return candidateTerms.reduce((best, current) => current.length > best.length ? current : best);
    }
    /**
     * Fallback-Methode für Keyword-Extraktion
     */
    fallbackKeywordExtraction(text) {
        const energyTerms = [
            'Netzbetreiber', 'Messstellenbetreiber', 'Lieferant', 'Marktkommunikation',
            'BDEW', 'EDIFACT', 'UTILMD', 'MSCONS', 'APERAK', 'Bilanzkreis',
            'Marktlokation', 'Messlokation', 'Zählpunkt', 'Sperrung', 'Entsperrung',
            'Anschlussnutzung', 'Netznutzung', 'Stromzähler', 'Lastgang',
            'Verbrauchsstelle', 'Erzeugungsanlage', 'Regelenergie', 'Übertragungsnetz'
        ];
        return energyTerms.filter(term => {
            const regex = new RegExp(`\\b${term}\\b`, 'gi');
            return regex.test(text);
        });
    }
    /**
     * Fallback-Ähnlichkeitsberechnung basierend auf gemeinsamen Begriffen
     */
    fallbackSimilarityCalculation(currentFaq, targetFaq, answerText) {
        const currentWords = this.extractMeaningfulWords(`${currentFaq.title} ${currentFaq.description} ${answerText}`);
        const targetWords = this.extractMeaningfulWords(`${targetFaq.title} ${targetFaq.description} ${targetFaq.context || ''}`);
        const commonWords = currentWords.filter(word => targetWords.includes(word));
        const score = commonWords.length / Math.max(currentWords.length, targetWords.length, 1);
        return {
            score: Math.min(score, 1),
            suggestedTerms: commonWords.slice(0, 3)
        };
    }
    /**
     * Extrahiert bedeutungsvolle Wörter (ohne Stoppwörter)
     */
    extractMeaningfulWords(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(word => word.length > 3 && !this.isStopWord(word))
            .map(word => word.charAt(0).toUpperCase() + word.slice(1));
    }
    /**
     * Erweiterte Stoppwort-Erkennung
     */
    isStopWord(word) {
        const stopWords = [
            'was', 'ist', 'eine', 'ein', 'der', 'die', 'das', 'wie', 'wer', 'wo', 'wann', 'warum',
            'und', 'oder', 'aber', 'auch', 'noch', 'nur', 'so', 'zu', 'von', 'mit', 'bei', 'für',
            'sich', 'werden', 'wird', 'kann', 'könnte', 'soll', 'sollte', 'muss', 'müssen',
            'haben', 'hat', 'hatte', 'sind', 'war', 'waren', 'sein', 'seine', 'ihrer', 'diesem',
            'diese', 'dieser', 'dieses', 'alle', 'jeden', 'jeder', 'jede', 'durch', 'über', 'unter',
            'zwischen', 'während', 'nach', 'vor', 'seit', 'bis', 'ohne', 'gegen', 'damit', 'dabei'
        ];
        return stopWords.includes(word.toLowerCase());
    }
}
exports.FAQLinkingService = FAQLinkingService;
exports.faqLinkingService = new FAQLinkingService();
//# sourceMappingURL=faqLinkingService.js.map