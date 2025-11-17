/**
 * Analytics Utility für Plausible Event Tracking
 * Content-Strategie Implementierung - Phase 0
 * 
 * Verwendung:
 * ```tsx
 * import { trackEvent, trackPageview, trackGoal } from '@/lib/analytics';
 * 
 * // Event mit Properties
 * trackEvent('cta_article_top', { article: 'remadv-artikel', position: 'top' });
 * 
 * // Simple Goal
 * trackGoal('app_trial_started');
 * ```
 */

declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: Record<string, string | number | boolean>;
        callback?: () => void;
      }
    ) => void;
  }
}

/**
 * Standard Event Names (für Type-Safety)
 */
export const AnalyticsEvents = {
  // CTA Clicks
  CTA_ARTICLE_TOP: 'cta_article_top',
  CTA_ARTICLE_MIDDLE: 'cta_article_middle',
  CTA_ARTICLE_BOTTOM: 'cta_article_bottom',
  CTA_APP_REGISTER: 'cta_app_register',
  CTA_TRAINING_LINK: 'cta_training_link',
  
  // Conversions
  WHITEPAPER_DOWNLOAD: 'whitepaper_download',
  WHITEPAPER_LEAD_QUALIFIED: 'whitepaper_lead_qualified',
  LEAD_MAGNET_DOWNLOAD: 'lead_magnet_download',
  APP_TRIAL_STARTED: 'app_trial_started',
  CONTACT_FORM_SUBMITTED: 'contact_form_submitted',
  TRAINING_CLICKED: 'training_clicked',
  
  // Content Engagement
  ARTICLE_READ_COMPLETE: 'article_read_complete',
  INTERNAL_LINK_CLICKED: 'internal_link_clicked',
  TOOL_USED: 'tool_used',
  
  // Funnel Steps
  FUNNEL_AWARENESS: 'funnel_awareness',
  FUNNEL_CONSIDERATION: 'funnel_consideration',
  FUNNEL_DECISION: 'funnel_decision',
  
  // Email Campaign
  EMAIL_NURTURING_SENT: 'email_nurturing_sent',
  EMAIL_OPENED: 'email_opened',
  EMAIL_CLICKED: 'email_clicked',
  
  // A/B Testing
  AB_TEST_ASSIGNED: 'ab_test_assigned',
  AB_TEST_CONVERTED: 'ab_test_converted',
  
  // Exit Intent
  EXIT_INTENT_SHOWN: 'exit_intent_shown',
  EXIT_INTENT_CONVERTED: 'exit_intent_converted',
  EXIT_INTENT_DISMISSED: 'exit_intent_dismissed',
} as const;

export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];

/**
 * Event Properties für verschiedene Tracking-Szenarien
 */
export interface EventProperties {
  // Artikel-bezogen
  article?: string;
  position?: 'top' | 'middle' | 'bottom' | 'sidebar';
  
  // CTA-bezogen
  action?: string;
  destination?: string;
  
  // Tool-bezogen
  tool?: string;
  processType?: string;
  
  // Lead-bezogen
  magnet?: string;
  magnetType?: string;
  whitepaperSlug?: string;
  
  // A/B-Testing
  test?: string;
  variant?: 'A' | 'B';
  
  // Navigation
  from?: string;
  to?: string;
  
  // Email
  sequence?: number;
  emailType?: string;
  
  // Generic
  [key: string]: string | number | boolean | undefined;
}

/**
 * Track ein Custom Event in Plausible
 * 
 * @param eventName - Name des Events (am besten aus AnalyticsEvents)
 * @param properties - Optionale Event-Properties
 * @param callback - Optional callback after event is sent
 */
export const trackEvent = (
  eventName: string,
  properties?: EventProperties,
  callback?: () => void
): void => {
  if (typeof window === 'undefined') {
    // Server-side rendering - skip tracking
    return;
  }

  if (!window.plausible) {
    // Plausible not loaded - log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Plausible not loaded. Would track:', eventName, properties);
    }
    if (callback) callback();
    return;
  }

  try {
    window.plausible(eventName, {
      props: properties as Record<string, string | number | boolean>,
      callback,
    });
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
    if (callback) callback();
  }
};

/**
 * Track ein Goal (vereinfachte Event-Version ohne Properties)
 * 
 * @param goalName - Name des Goals
 */
export const trackGoal = (goalName: string, callback?: () => void): void => {
  trackEvent(goalName, undefined, callback);
};

/**
 * Track einen Pageview (normalerweise automatisch, aber für SPA-Navigation nützlich)
 * 
 * @param url - Optional: Custom URL (default: window.location.pathname)
 */
export const trackPageview = (url?: string): void => {
  if (typeof window === 'undefined') return;
  
  const pageUrl = url || window.location.pathname;
  
  if (window.plausible) {
    window.plausible('pageview', { props: { path: pageUrl } });
  }
};

/**
 * Track Scroll-Tiefe (für "Article Read Complete")
 * 
 * Nutze diese Funktion in Artikel-Komponenten (useEffect):
 * ```tsx
 * useEffect(() => {
 *   const cleanup = setupScrollTracking('article-slug', 80);
 *   return cleanup;
 * }, []);
 * ```
 */
export const setupScrollTracking = (
  articleSlug: string,
  threshold: number = 80
): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  let tracked = false;

  const handleScroll = () => {
    if (tracked) return;

    const scrollPercentage =
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;

    if (scrollPercentage >= threshold) {
      trackEvent(AnalyticsEvents.ARTICLE_READ_COMPLETE, {
        article: articleSlug,
        threshold: threshold.toString(),
      });
      tracked = true;
      window.removeEventListener('scroll', handleScroll);
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
};

/**
 * Track Outbound Link Clicks
 * 
 * Verwendung:
 * ```tsx
 * <a href="https://external.com" onClick={trackOutboundLink('external.com')}>Link</a>
 * ```
 */
export const trackOutboundLink = (
  destination: string,
  label?: string
) => (e: React.MouseEvent) => {
  trackEvent('outbound_link', {
    destination,
    label: label || destination,
  });
};

/**
 * Track CTA Clicks mit automatischem Routing
 * 
 * Verwendung in Button:
 * ```tsx
 * import { useRouter } from 'next/router';
 * 
 * const handleCTAClick = useCTATracking('cta_article_top', '/app/register', {
 *   article: 'remadv-artikel'
 * });
 * 
 * <Button onClick={handleCTAClick}>Jetzt testen</Button>
 * ```
 */
export const useCTATracking = (
  eventName: string,
  destination: string,
  properties?: EventProperties
) => {
  return (e?: React.MouseEvent) => {
    e?.preventDefault();
    
    trackEvent(eventName, {
      ...properties,
      destination,
    }, () => {
      // Navigate after tracking
      if (typeof window !== 'undefined') {
        window.location.href = destination;
      }
    });
  };
};

/**
 * Helper: Generiere UTM-Parameter für Campaign-Tracking
 * 
 * @param params - UTM-Parameter
 * @returns URL mit UTM-Parametern
 */
export const addUTMParams = (
  baseUrl: string,
  params: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
  }
): string => {
  const url = new URL(baseUrl, window.location.origin);
  
  if (params.source) url.searchParams.set('utm_source', params.source);
  if (params.medium) url.searchParams.set('utm_medium', params.medium);
  if (params.campaign) url.searchParams.set('utm_campaign', params.campaign);
  if (params.content) url.searchParams.set('utm_content', params.content);
  if (params.term) url.searchParams.set('utm_term', params.term);
  
  return url.toString();
};

/**
 * Debug-Mode: Zeige alle Events in Console (nur Development)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalPlausible = window.plausible;
  
  window.plausible = (eventName, options) => {
    console.log('[Plausible Debug]', eventName, options?.props);
    if (originalPlausible) {
      originalPlausible(eventName, options);
    }
  };
}

/**
 * Export für einfache Verwendung
 */
export default {
  trackEvent,
  trackGoal,
  trackPageview,
  setupScrollTracking,
  trackOutboundLink,
  useCTATracking,
  addUTMParams,
  Events: AnalyticsEvents,
};
