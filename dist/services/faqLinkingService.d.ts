import { FAQLink, LinkedTerm, CreateFAQLinkRequest } from '../types/faq';
export declare class FAQLinkingService {
    /**
     * Findet automatisch verlinkbare Begriffe in einer FAQ-Antwort mittels semantischer Analyse
     */
    findLinkableTerms(faqId: string, answerText: string): Promise<LinkedTerm[]>;
    /**
     * Erstellt automatische Links für eine FAQ
     */
    createAutomaticLinks(faqId: string, userId?: string): Promise<number>;
    /**
     * Erstellt einen neuen FAQ-Link
     */
    createLink(linkData: CreateFAQLinkRequest, userId?: string): Promise<FAQLink>;
    /**
     * Holt alle Links für eine FAQ
     */
    getLinksForFAQ(faqId: string): Promise<LinkedTerm[]>;
    /**
     * Löscht einen FAQ-Link
     */
    deleteLink(linkId: string): Promise<boolean>;
    /**
     * Wandelt FAQ-Text mit Verlinkungen um
     */
    renderLinkedText(text: string, links: LinkedTerm[]): string;
    /**
     * Prüft ob ein Link bereits existiert
     */
    private getLinkExists;
    /**
     * Escapes special regex characters
     */
    private escapeRegExp;
    /**
     * Holt Statistiken über FAQ-Verlinkungen
     */
    getLinkingStats(): Promise<any>;
    /**
     * Extrahiert semantische Begriffe aus FAQ-Text mittels AI
     */
    private extractSemanticTerms;
    /**
     * Sichere JSON-Parsing mit mehreren Fallback-Strategien
     */
    private parseAIJsonResponse;
    /**
     * Berechnet semantische Ähnlichkeit zwischen zwei FAQs
     */
    private calculateSemanticSimilarity;
    /**
     * Findet den besten Begriff für eine Verlinkung
     */
    private findBestLinkTerm;
    /**
     * Fallback-Methode für Keyword-Extraktion
     */
    private fallbackKeywordExtraction;
    /**
     * Fallback-Ähnlichkeitsberechnung basierend auf gemeinsamen Begriffen
     */
    private fallbackSimilarityCalculation;
    /**
     * Extrahiert bedeutungsvolle Wörter (ohne Stoppwörter)
     */
    private extractMeaningfulWords;
    /**
     * Erweiterte Stoppwort-Erkennung
     */
    private isStopWord;
}
export declare const faqLinkingService: FAQLinkingService;
//# sourceMappingURL=faqLinkingService.d.ts.map