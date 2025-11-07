/**
 * ArticleCTA - Wiederverwendbare Conversion-Komponenten für Artikel
 * Content-Strategie Phase 1.2
 * 
 * Verwendung:
 * ```tsx
 * import { CTATop, CTAMiddle, CTABottom } from '@/components/ArticleCTA';
 * 
 * <CTATop articleSlug="remadv-artikel" processName="REMADV-Prozess" />
 * <CTAMiddle articleSlug="gpke-artikel" processName="GPKE-Nachrichtenaustausch" />
 * <CTABottom articleSlug="utilmd-artikel" />
 * ```
 */

import React from 'react';
import { Box, Typography, Button, Paper, Grid, Card, CardContent } from '@mui/material';
import { useRouter } from 'next/router';
import { trackEvent, AnalyticsEvents, addUTMParams } from '../lib/analytics';

interface CTABaseProps {
  articleSlug: string;
  processName?: string;
}

/**
 * CTA am Anfang des Artikels (nach Intro)
 * Fokus: Zeit sparen mit KI
 */
export const CTATop: React.FC<CTABaseProps> = ({ articleSlug, processName = 'dieser Prozess' }) => {
  const router = useRouter();

  const handleClick = () => {
    trackEvent(AnalyticsEvents.CTA_ARTICLE_TOP, {
      article: articleSlug,
      position: 'top',
    });
    
    const url = addUTMParams('/app/register', {
      source: 'artikel',
      medium: 'cta',
      campaign: articleSlug,
      content: 'top',
    });
    
    router.push(url);
  };

  return (
    <Box
      sx={{
        bgcolor: 'primary.light',
        p: 3,
        borderRadius: 2,
        my: 3,
        borderLeft: '4px solid',
        borderColor: 'primary.main',
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        💡 Zeit sparen mit KI
      </Typography>
      <Typography variant="body1" paragraph>
        {processName} dauert manuell 20-30 Minuten. Mit Willi-Mako erledigst du ihn in 2 Minuten –
        inklusive automatischer Validierung.
      </Typography>
      <Button variant="contained" color="primary" onClick={handleClick} size="large">
        Jetzt 14 Tage kostenlos testen
      </Button>
    </Box>
  );
};

/**
 * CTA in der Mitte des Artikels (nach Hauptabschnitt)
 * Fokus: Praxis-Beispiel und Features
 */
export const CTAMiddle: React.FC<CTABaseProps & { 
  screenshotUrl?: string;
  screenshotAlt?: string;
}> = ({ articleSlug, processName = 'diese Nachricht/dieser Prozess', screenshotUrl, screenshotAlt }) => {
  const router = useRouter();

  const handleAppClick = () => {
    trackEvent(AnalyticsEvents.CTA_ARTICLE_MIDDLE, {
      article: articleSlug,
      position: 'middle',
      action: 'register',
    });
    
    const url = addUTMParams('/app/register', {
      source: 'artikel',
      campaign: articleSlug,
      content: 'middle',
    });
    
    router.push(url);
  };

  const handleTrainingClick = () => {
    trackEvent(AnalyticsEvents.TRAINING_CLICKED, {
      article: articleSlug,
      position: 'middle',
    });
    
    window.open('https://training.stromhaltig.de/', '_blank');
  };

  return (
    <Paper sx={{ p: 3, my: 4, bgcolor: 'grey.50' }}>
      <Typography variant="h6" gutterBottom>
        📊 Praxis-Beispiel: Willi-Mako in Action
      </Typography>
      <Typography variant="body1" paragraph>
        Siehe, wie Willi-Mako {processName} automatisch validiert und häufige Fehler erkennt –
        bevor sie zum Problem werden.
      </Typography>

      {screenshotUrl && (
        <Box sx={{ my: 2, textAlign: 'center' }}>
          <img
            src={screenshotUrl}
            alt={screenshotAlt || 'Willi-Mako Demo'}
            style={{
              maxWidth: '100%',
              height: 'auto',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
        </Box>
      )}

      <Typography variant="subtitle2" component="div" gutterBottom sx={{ mt: 2 }}>
        Was Willi-Mako für dich macht:
      </Typography>
      <Box component="ul" sx={{ mt: 1, mb: 2 }}>
        <li>✅ Automatische Plausibilitätsprüfung</li>
        <li>✅ Fristen-Überwachung</li>
        <li>✅ GPKE/UTILMD-Compliance-Check</li>
        <li>✅ Fehler-Früherkennung</li>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
        <Button variant="contained" color="primary" onClick={handleAppClick} size="large">
          Kostenlos testen
        </Button>
        <Button variant="outlined" color="primary" onClick={handleTrainingClick} size="large">
          Training buchen
        </Button>
      </Box>
    </Paper>
  );
};

/**
 * CTA am Ende des Artikels (nach Fazit)
 * Fokus: Finale Conversion mit mehreren Optionen
 */
export const CTABottom: React.FC<CTABaseProps & {
  relatedArticles?: Array<{
    slug: string;
    title: string;
    excerpt: string;
  }>;
}> = ({ articleSlug, relatedArticles }) => {
  const router = useRouter();

  const handleAction = (action: 'register' | 'whitepaper' | 'training') => {
    trackEvent(AnalyticsEvents.CTA_ARTICLE_BOTTOM, {
      article: articleSlug,
      position: 'bottom',
      action,
    });

    switch (action) {
      case 'register':
        router.push(
          addUTMParams('/app/register', {
            source: 'artikel',
            campaign: articleSlug,
            content: 'bottom',
          })
        );
        break;
      case 'whitepaper':
        router.push('/whitepaper');
        break;
      case 'training':
        window.open('https://training.stromhaltig.de/', '_blank');
        break;
    }
  };

  const handleInternalLink = (targetSlug: string) => {
    trackEvent(AnalyticsEvents.INTERNAL_LINK_CLICKED, {
      from: articleSlug,
      to: targetSlug,
    });
  };

  return (
    <>
      <Box sx={{ bgcolor: 'success.light', p: 4, borderRadius: 2, my: 4 }}>
        <Typography variant="h5" gutterBottom>
          ✅ Das war komplex? Lass Willi-Mako das für dich erledigen.
        </Typography>
        <Typography variant="body1" paragraph>
          Willi-Mako ist dein KI-Coach für Marktkommunikation. Er erklärt Prozesse, validiert
          Nachrichten und automatisiert Routineaufgaben – damit du dich auf das Wesentliche
          konzentrieren kannst.
        </Typography>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          14 Tage kostenlos testen. Keine Kreditkarte nötig.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => handleAction('register')}
            sx={{ bgcolor: 'success.main', '&:hover': { bgcolor: 'success.dark' } }}
          >
            Jetzt kostenlos testen
          </Button>
          <Button variant="outlined" size="large" onClick={() => handleAction('whitepaper')}>
            Whitepaper herunterladen
          </Button>
          <Button variant="outlined" size="large" onClick={() => handleAction('training')}>
            Training buchen
          </Button>
        </Box>
      </Box>

      {relatedArticles && relatedArticles.length > 0 && (
        <Box sx={{ my: 4 }}>
          <Typography variant="h6" gutterBottom>
            📚 Weiterlesen
          </Typography>
          <Grid container spacing={2}>
            {relatedArticles.map((article) => (
              <Grid item xs={12} md={4} key={article.slug}>
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                  onClick={() => {
                    handleInternalLink(article.slug);
                    router.push(`/wissen/artikel/${article.slug}`);
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {article.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {article.excerpt}
                    </Typography>
                    <Button sx={{ mt: 2 }} size="small">
                      Weiterlesen →
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </>
  );
};

/**
 * Kompakte CTA für Sidebar oder ähnliche Platzierungen
 */
export const CTASidebar: React.FC<CTABaseProps> = ({ articleSlug }) => {
  const router = useRouter();

  const handleClick = () => {
    trackEvent(AnalyticsEvents.CTA_ARTICLE_MIDDLE, {
      article: articleSlug,
      position: 'sidebar',
    });
    
    router.push(
      addUTMParams('/app/register', {
        source: 'artikel',
        campaign: articleSlug,
        content: 'sidebar',
      })
    );
  };

  return (
    <Paper sx={{ p: 3, bgcolor: 'primary.light', position: 'sticky', top: 20 }}>
      <Typography variant="h6" gutterBottom>
        🚀 Bereit loszulegen?
      </Typography>
      <Typography variant="body2" paragraph>
        Automatisiere deine Marktkommunikation mit Willi-Mako.
      </Typography>
      <Button variant="contained" fullWidth onClick={handleClick}>
        14 Tage kostenlos
      </Button>
      <Typography variant="caption" display="block" sx={{ mt: 1, textAlign: 'center' }}>
        Keine Kreditkarte nötig
      </Typography>
    </Paper>
  );
};

/**
 * Export als Default für einfachen Import
 */
export default {
  Top: CTATop,
  Middle: CTAMiddle,
  Bottom: CTABottom,
  Sidebar: CTASidebar,
};
