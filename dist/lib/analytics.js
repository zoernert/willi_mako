"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.addUTMParams = exports.useCTATracking = exports.trackOutboundLink = exports.setupScrollTracking = exports.trackPageview = exports.trackGoal = exports.trackEvent = exports.AnalyticsEvents = void 0;
/**
 * Standard Event Names (für Type-Safety)
 */
exports.AnalyticsEvents = {
    // CTA Clicks
    CTA_ARTICLE_TOP: 'cta_article_top',
    CTA_ARTICLE_MIDDLE: 'cta_article_middle',
    CTA_ARTICLE_BOTTOM: 'cta_article_bottom',
    CTA_APP_REGISTER: 'cta_app_register',
    CTA_TRAINING_LINK: 'cta_training_link',
    // Conversions
    WHITEPAPER_DOWNLOAD: 'whitepaper_download',
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
};
/**
 * Track ein Custom Event in Plausible
 *
 * @param eventName - Name des Events (am besten aus AnalyticsEvents)
 * @param properties - Optionale Event-Properties
 * @param callback - Optional callback after event is sent
 */
const trackEvent = (eventName, properties, callback) => {
    if (typeof window === 'undefined') {
        // Server-side rendering - skip tracking
        return;
    }
    if (!window.plausible) {
        // Plausible not loaded - log in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics] Plausible not loaded. Would track:', eventName, properties);
        }
        if (callback)
            callback();
        return;
    }
    try {
        window.plausible(eventName, {
            props: properties,
            callback,
        });
    }
    catch (error) {
        console.error('[Analytics] Error tracking event:', error);
        if (callback)
            callback();
    }
};
exports.trackEvent = trackEvent;
/**
 * Track ein Goal (vereinfachte Event-Version ohne Properties)
 *
 * @param goalName - Name des Goals
 */
const trackGoal = (goalName, callback) => {
    (0, exports.trackEvent)(goalName, undefined, callback);
};
exports.trackGoal = trackGoal;
/**
 * Track einen Pageview (normalerweise automatisch, aber für SPA-Navigation nützlich)
 *
 * @param url - Optional: Custom URL (default: window.location.pathname)
 */
const trackPageview = (url) => {
    if (typeof window === 'undefined')
        return;
    const pageUrl = url || window.location.pathname;
    if (window.plausible) {
        window.plausible('pageview', { props: { path: pageUrl } });
    }
};
exports.trackPageview = trackPageview;
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
const setupScrollTracking = (articleSlug, threshold = 80) => {
    if (typeof window === 'undefined')
        return () => { };
    let tracked = false;
    const handleScroll = () => {
        if (tracked)
            return;
        const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercentage >= threshold) {
            (0, exports.trackEvent)(exports.AnalyticsEvents.ARTICLE_READ_COMPLETE, {
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
exports.setupScrollTracking = setupScrollTracking;
/**
 * Track Outbound Link Clicks
 *
 * Verwendung:
 * ```tsx
 * <a href="https://external.com" onClick={trackOutboundLink('external.com')}>Link</a>
 * ```
 */
const trackOutboundLink = (destination, label) => (e) => {
    (0, exports.trackEvent)('outbound_link', {
        destination,
        label: label || destination,
    });
};
exports.trackOutboundLink = trackOutboundLink;
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
const useCTATracking = (eventName, destination, properties) => {
    return (e) => {
        e === null || e === void 0 ? void 0 : e.preventDefault();
        (0, exports.trackEvent)(eventName, {
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
exports.useCTATracking = useCTATracking;
/**
 * Helper: Generiere UTM-Parameter für Campaign-Tracking
 *
 * @param params - UTM-Parameter
 * @returns URL mit UTM-Parametern
 */
const addUTMParams = (baseUrl, params) => {
    const url = new URL(baseUrl, window.location.origin);
    if (params.source)
        url.searchParams.set('utm_source', params.source);
    if (params.medium)
        url.searchParams.set('utm_medium', params.medium);
    if (params.campaign)
        url.searchParams.set('utm_campaign', params.campaign);
    if (params.content)
        url.searchParams.set('utm_content', params.content);
    if (params.term)
        url.searchParams.set('utm_term', params.term);
    return url.toString();
};
exports.addUTMParams = addUTMParams;
/**
 * Debug-Mode: Zeige alle Events in Console (nur Development)
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    const originalPlausible = window.plausible;
    window.plausible = (eventName, options) => {
        console.log('[Plausible Debug]', eventName, options === null || options === void 0 ? void 0 : options.props);
        if (originalPlausible) {
            originalPlausible(eventName, options);
        }
    };
}
/**
 * Export für einfache Verwendung
 */
exports.default = {
    trackEvent: exports.trackEvent,
    trackGoal: exports.trackGoal,
    trackPageview: exports.trackPageview,
    setupScrollTracking: exports.setupScrollTracking,
    trackOutboundLink: exports.trackOutboundLink,
    useCTATracking: exports.useCTATracking,
    addUTMParams: exports.addUTMParams,
    Events: exports.AnalyticsEvents,
};
//# sourceMappingURL=analytics.js.map