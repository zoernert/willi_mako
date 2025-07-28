import pool from '../config/database';
import { FAQ, FAQLink, LinkedTerm, CreateFAQLinkRequest } from '../types/faq';

export class FAQLinkingService {
  /**
   * Findet automatisch verlinkbare Begriffe in einer FAQ-Antwort
   */
  async findLinkableTerms(faqId: string, answerText: string): Promise<LinkedTerm[]> {
    // Hole alle anderen öffentlichen FAQs
    const result = await pool.query(`
      SELECT id, title, description
      FROM faqs
      WHERE id != $1 AND is_active = true AND is_public = true
    `, [faqId]);

    const otherFAQs = result.rows;
    const links: LinkedTerm[] = [];

    for (const faq of otherFAQs) {
      const keywords = this.extractKeywords(faq.title);
      
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (regex.test(answerText)) {
          // Prüfe ob bereits ein Link existiert
          const existingLink = await this.getLinkExists(faqId, faq.id, keyword);
          if (!existingLink) {
            links.push({
              term: keyword,
              target_faq_id: faq.id,
              display_text: keyword
            });
          }
        }
      }
    }

    return links;
  }

  /**
   * Erstellt automatische Links für eine FAQ
   */
  async createAutomaticLinks(faqId: string, userId?: string): Promise<number> {
    const faqResult = await pool.query('SELECT answer FROM faqs WHERE id = $1', [faqId]);
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
      } catch (error) {
        // Link existiert bereits oder anderer Fehler - ignorieren
        console.log(`Could not create link: ${error}`);
      }
    }

    return createdLinksCount;
  }

  /**
   * Erstellt einen neuen FAQ-Link
   */
  async createLink(linkData: CreateFAQLinkRequest, userId?: string): Promise<FAQLink> {
    const result = await pool.query(`
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
  async getLinksForFAQ(faqId: string): Promise<LinkedTerm[]> {
    const result = await pool.query(`
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
  async deleteLink(linkId: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM faq_links WHERE id = $1', [linkId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Wandelt FAQ-Text mit Verlinkungen um
   */
  renderLinkedText(text: string, links: LinkedTerm[]): string {
    let processedText = text;
    
    // Sortiere Links nach Länge (längste zuerst) um Überschneidungen zu vermeiden
    const sortedLinks = links.sort((a, b) => b.term.length - a.term.length);
    
    for (const link of sortedLinks) {
      const regex = new RegExp(`\\b${this.escapeRegExp(link.term)}\\b`, 'gi');
      processedText = processedText.replace(
        regex, 
        `<a href="#faq-${link.target_faq_id}" class="faq-link" data-faq-id="${link.target_faq_id}" data-link-id="${link.link_id}">${link.display_text || link.term}</a>`
      );
    }
    
    return processedText;
  }

  /**
   * Extrahiert Schlüsselwörter aus einem FAQ-Titel
   */
  private extractKeywords(title: string): string[] {
    const stopWords = [
      'was', 'ist', 'eine', 'ein', 'der', 'die', 'das', 'wie', 'wer', 'wo', 'wann', 'warum',
      'und', 'oder', 'aber', 'auch', 'noch', 'nur', 'so', 'zu', 'von', 'mit', 'bei', 'für'
    ];
    
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)); // Capitalize
  }

  /**
   * Prüft ob ein Link bereits existiert
   */
  private async getLinkExists(sourceFaqId: string, targetFaqId: string, term: string): Promise<boolean> {
    const result = await pool.query(`
      SELECT id FROM faq_links
      WHERE source_faq_id = $1 AND target_faq_id = $2 AND term = $3
    `, [sourceFaqId, targetFaqId, term]);

    return result.rows.length > 0;
  }

  /**
   * Escapes special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Holt Statistiken über FAQ-Verlinkungen
   */
  async getLinkingStats(): Promise<any> {
    const totalLinksResult = await pool.query('SELECT COUNT(*) as count FROM faq_links');
    const automaticLinksResult = await pool.query('SELECT COUNT(*) as count FROM faq_links WHERE is_automatic = true');
    const manualLinksResult = await pool.query('SELECT COUNT(*) as count FROM faq_links WHERE is_automatic = false');
    
    const mostLinkedResult = await pool.query(`
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
}

export const faqLinkingService = new FAQLinkingService();
