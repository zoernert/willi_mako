import React from 'react';
import { FAQWithLinks } from '../../types/faq';
import './FAQItem.css';

interface FAQItemProps {
  faq: FAQWithLinks;
  onFAQClick: (faqId: string) => void;
  showFullContent?: boolean;
}

export const FAQItem: React.FC<FAQItemProps> = ({ 
  faq, 
  onFAQClick, 
  showFullContent = false 
}) => {
  // Render answer with links if they exist
  const renderAnswer = () => {
    if (!faq.linked_terms || faq.linked_terms.length === 0) {
      return <div className="faq-answer">{faq.answer}</div>;
    }

    // Use the linking service to render linked text
    const linkedAnswer = renderLinkedText(faq.answer, faq.linked_terms);
    
    return (
      <div 
        className="faq-answer"
        dangerouslySetInnerHTML={{ __html: linkedAnswer }}
        onClick={handleLinkClick}
      />
    );
  };

  const renderLinkedText = (text: string, links: any[]): string => {
    let processedText = text;
    
    // Sort links by length (longest first) to avoid overlaps
    const sortedLinks = links.sort((a, b) => b.term.length - a.term.length);
    
    for (const link of sortedLinks) {
      const regex = new RegExp(`\\b${escapeRegExp(link.term)}\\b`, 'gi');
      processedText = processedText.replace(
        regex, 
        `<a href="#faq-${link.target_faq_id}" class="faq-link" data-faq-id="${link.target_faq_id}" data-link-id="${link.link_id}">${link.display_text || link.term}</a>`
      );
    }
    
    return processedText;
  };

  const escapeRegExp = (string: string): string => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  const handleLinkClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('faq-link')) {
      e.preventDefault();
      const faqId = target.getAttribute('data-faq-id');
      if (faqId) {
        onFAQClick(faqId);
      }
    }
  };

  const renderTags = () => {
    if (!faq.tags || faq.tags.length === 0) return null;
    
    return (
      <div className="faq-tags">
        {faq.tags.map((tag: string, index: number) => (
          <span key={index} className="faq-tag">
            {tag}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="faq-item" id={`faq-${faq.id}`}>
      <div className="faq-header">
        <h3 className="faq-title">{faq.title}</h3>
        <div className="faq-meta">
          <span className="faq-views">{faq.view_count} Aufrufe</span>
          <span className="faq-date">
            {new Date(faq.created_at).toLocaleDateString('de-DE')}
          </span>
        </div>
      </div>
      
      {faq.description && (
        <div className="faq-description">{faq.description}</div>
      )}
      
      {showFullContent && renderAnswer()}
      
      {renderTags()}
      
      {faq.additional_info && showFullContent && (
        <div className="faq-additional-info">
          <strong>Zusätzliche Informationen:</strong>
          <p>{faq.additional_info}</p>
        </div>
      )}
    </div>
  );
};

export default FAQItem;
