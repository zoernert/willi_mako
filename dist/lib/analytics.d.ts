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
        plausible?: (eventName: string, options?: {
            props?: Record<string, string | number | boolean>;
            callback?: () => void;
        }) => void;
    }
}
/**
 * Standard Event Names (für Type-Safety)
 */
export declare const AnalyticsEvents: {
    readonly CTA_ARTICLE_TOP: "cta_article_top";
    readonly CTA_ARTICLE_MIDDLE: "cta_article_middle";
    readonly CTA_ARTICLE_BOTTOM: "cta_article_bottom";
    readonly CTA_APP_REGISTER: "cta_app_register";
    readonly CTA_TRAINING_LINK: "cta_training_link";
    readonly WHITEPAPER_DOWNLOAD: "whitepaper_download";
    readonly LEAD_MAGNET_DOWNLOAD: "lead_magnet_download";
    readonly APP_TRIAL_STARTED: "app_trial_started";
    readonly CONTACT_FORM_SUBMITTED: "contact_form_submitted";
    readonly TRAINING_CLICKED: "training_clicked";
    readonly ARTICLE_READ_COMPLETE: "article_read_complete";
    readonly INTERNAL_LINK_CLICKED: "internal_link_clicked";
    readonly TOOL_USED: "tool_used";
    readonly FUNNEL_AWARENESS: "funnel_awareness";
    readonly FUNNEL_CONSIDERATION: "funnel_consideration";
    readonly FUNNEL_DECISION: "funnel_decision";
    readonly EMAIL_NURTURING_SENT: "email_nurturing_sent";
    readonly EMAIL_OPENED: "email_opened";
    readonly EMAIL_CLICKED: "email_clicked";
    readonly AB_TEST_ASSIGNED: "ab_test_assigned";
    readonly AB_TEST_CONVERTED: "ab_test_converted";
    readonly EXIT_INTENT_SHOWN: "exit_intent_shown";
    readonly EXIT_INTENT_CONVERTED: "exit_intent_converted";
    readonly EXIT_INTENT_DISMISSED: "exit_intent_dismissed";
};
export type AnalyticsEventName = typeof AnalyticsEvents[keyof typeof AnalyticsEvents];
/**
 * Event Properties für verschiedene Tracking-Szenarien
 */
export interface EventProperties {
    article?: string;
    position?: 'top' | 'middle' | 'bottom' | 'sidebar';
    action?: string;
    destination?: string;
    tool?: string;
    processType?: string;
    magnet?: string;
    magnetType?: string;
    whitepaperSlug?: string;
    test?: string;
    variant?: 'A' | 'B';
    from?: string;
    to?: string;
    sequence?: number;
    emailType?: string;
    [key: string]: string | number | boolean | undefined;
}
/**
 * Track ein Custom Event in Plausible
 *
 * @param eventName - Name des Events (am besten aus AnalyticsEvents)
 * @param properties - Optionale Event-Properties
 * @param callback - Optional callback after event is sent
 */
export declare const trackEvent: (eventName: string, properties?: EventProperties, callback?: () => void) => void;
/**
 * Track ein Goal (vereinfachte Event-Version ohne Properties)
 *
 * @param goalName - Name des Goals
 */
export declare const trackGoal: (goalName: string, callback?: () => void) => void;
/**
 * Track einen Pageview (normalerweise automatisch, aber für SPA-Navigation nützlich)
 *
 * @param url - Optional: Custom URL (default: window.location.pathname)
 */
export declare const trackPageview: (url?: string) => void;
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
export declare const setupScrollTracking: (articleSlug: string, threshold?: number) => (() => void);
/**
 * Track Outbound Link Clicks
 *
 * Verwendung:
 * ```tsx
 * <a href="https://external.com" onClick={trackOutboundLink('external.com')}>Link</a>
 * ```
 */
export declare const trackOutboundLink: (destination: string, label?: string) => (e: React.MouseEvent) => void;
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
export declare const useCTATracking: (eventName: string, destination: string, properties?: EventProperties) => (e?: React.MouseEvent) => void;
/**
 * Helper: Generiere UTM-Parameter für Campaign-Tracking
 *
 * @param params - UTM-Parameter
 * @returns URL mit UTM-Parametern
 */
export declare const addUTMParams: (baseUrl: string, params: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
    term?: string;
}) => string;
/**
 * Export für einfache Verwendung
 */
declare const _default: {
    trackEvent: (eventName: string, properties?: EventProperties, callback?: () => void) => void;
    trackGoal: (goalName: string, callback?: () => void) => void;
    trackPageview: (url?: string) => void;
    setupScrollTracking: (articleSlug: string, threshold?: number) => (() => void);
    trackOutboundLink: (destination: string, label?: string) => (e: React.MouseEvent) => void;
    useCTATracking: (eventName: string, destination: string, properties?: EventProperties) => (e?: React.MouseEvent) => void;
    addUTMParams: (baseUrl: string, params: {
        source?: string;
        medium?: string;
        campaign?: string;
        content?: string;
        term?: string;
    }) => string;
    Events: {
        readonly CTA_ARTICLE_TOP: "cta_article_top";
        readonly CTA_ARTICLE_MIDDLE: "cta_article_middle";
        readonly CTA_ARTICLE_BOTTOM: "cta_article_bottom";
        readonly CTA_APP_REGISTER: "cta_app_register";
        readonly CTA_TRAINING_LINK: "cta_training_link";
        readonly WHITEPAPER_DOWNLOAD: "whitepaper_download";
        readonly LEAD_MAGNET_DOWNLOAD: "lead_magnet_download";
        readonly APP_TRIAL_STARTED: "app_trial_started";
        readonly CONTACT_FORM_SUBMITTED: "contact_form_submitted";
        readonly TRAINING_CLICKED: "training_clicked";
        readonly ARTICLE_READ_COMPLETE: "article_read_complete";
        readonly INTERNAL_LINK_CLICKED: "internal_link_clicked";
        readonly TOOL_USED: "tool_used";
        readonly FUNNEL_AWARENESS: "funnel_awareness";
        readonly FUNNEL_CONSIDERATION: "funnel_consideration";
        readonly FUNNEL_DECISION: "funnel_decision";
        readonly EMAIL_NURTURING_SENT: "email_nurturing_sent";
        readonly EMAIL_OPENED: "email_opened";
        readonly EMAIL_CLICKED: "email_clicked";
        readonly AB_TEST_ASSIGNED: "ab_test_assigned";
        readonly AB_TEST_CONVERTED: "ab_test_converted";
        readonly EXIT_INTENT_SHOWN: "exit_intent_shown";
        readonly EXIT_INTENT_CONVERTED: "exit_intent_converted";
        readonly EXIT_INTENT_DISMISSED: "exit_intent_dismissed";
    };
};
export default _default;
//# sourceMappingURL=analytics.d.ts.map