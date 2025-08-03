import { FAQLink, LinkedTerm, CreateFAQLinkRequest } from '../types/faq';
export declare class FAQLinkingService {
    findLinkableTerms(faqId: string, answerText: string): Promise<LinkedTerm[]>;
    createAutomaticLinks(faqId: string, userId?: string): Promise<number>;
    createLink(linkData: CreateFAQLinkRequest, userId?: string): Promise<FAQLink>;
    getLinksForFAQ(faqId: string): Promise<LinkedTerm[]>;
    deleteLink(linkId: string): Promise<boolean>;
    renderLinkedText(text: string, links: LinkedTerm[]): string;
    private extractKeywords;
    private getLinkExists;
    private escapeRegExp;
    getLinkingStats(): Promise<any>;
}
export declare const faqLinkingService: FAQLinkingService;
//# sourceMappingURL=faqLinkingService.d.ts.map