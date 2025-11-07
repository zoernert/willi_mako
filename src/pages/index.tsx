import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Card, 
  CardContent, 
  Button, 
  Chip,
  Paper,
  Container,
  Stack,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider
} from '@mui/material';
import {
  QuestionAnswer as FAQIcon,
  TrendingUp as TrendingIcon,
  ElectricBolt as EnergyIcon,
  Search as SearchIcon,
  Timer as TimerIcon,
  Security as SecurityIcon,
  Visibility as TransparencyIcon,
  RssFeed as RssIcon,
  Headphones as HeadphonesIcon
} from '@mui/icons-material';
import { useState } from 'react';
import Layout from '../components/Layout';
import { getAllPublicFAQs, getAllTags, StaticFAQData, FAQTag } from '../../lib/faq-api';
import { getPodcastEpisodes, PodcastEpisode } from '../../lib/content/podcast';

interface HomeProps {
  featuredFAQs: StaticFAQData[];
  popularTags: FAQTag[];
  totalFAQCount: number;
  podcastEpisodes: PodcastEpisode[];
}

export default function Home({ featuredFAQs, popularTags, totalFAQCount, podcastEpisodes }: HomeProps) {
  const [selectedEpisode, setSelectedEpisode] = useState(() => podcastEpisodes[0] ?? null);

  const formatDate = (value: string) => {
    const parsed = value ? new Date(value) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return '';
    }
    return parsed.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const shorten = (text: string, limit = 200) => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit).trimEnd()}…`;
  };

  return (
    <Layout title="Willi-Mako | Professionelle Marktkommunikation">
      <Head>
        <title>Willi-Mako | Marktkommunikation auf neuem Level - Effizienz, Sicherheit, Erfolg</title>
        <meta 
          name="description" 
          content="Marktkommunikation (MaKo) erklärt: Prozesse, EDIFACT & Best Practices 2025. ✅ Mit KI-Tool kostenlos testen! Jetzt starten."
        />
        <meta name="keywords" content="Energiewirtschaft, Marktkommunikation, BDEW, EIC, Bilanzkreise, Effizienz, Compliance, Zeitersparnis" />
        <link rel="canonical" href="https://stromhaltig.de" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Willi-Mako | Marktkommunikation auf neuem Level" />
        <meta property="og:description" content="Steigern Sie Effizienz, minimieren Sie Risiken und sichern Sie Ihren Vorsprung in der Energiewirtschaft." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de" />
        <meta property="og:site_name" content="Willi-Mako" />
        
        {/* RSS/Atom Feeds */}
        <link rel="alternate" type="application/rss+xml" title="Willi-Mako FAQ RSS Feed" href="/feed.xml" />
        <link rel="alternate" type="application/atom+xml" title="Willi-Mako FAQ Atom Feed" href="/atom.xml" />
        <link rel="alternate" type="application/rss+xml" title="Radio Willi - Podcast Feed" href="https://stromhaltig.de/podcast.rss" />

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "Willi-Mako",
              "description": "Expertensystem für Marktkommunikation in der Energiewirtschaft",
              "url": "https://stromhaltig.de",
              "publisher": {
                "@type": "Organization",
                "name": "STROMDAO GmbH",
                "url": "https://stromdao.de"
              },
              "creator": {
                "@type": "Person",
                "name": "Willi Mako (STROMDAO GmbH)",
                "email": "dev@stromdao.com"
              },
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://stromhaltig.de/wissen?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
      </Head>

      {/* Hero Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          background: 'linear-gradient(135deg, #147a50 0%, #0d5538 100%)',
          color: 'white',
          p: 8,
          mb: 6,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Animation */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat',
            opacity: 0.1
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <EnergyIcon sx={{ fontSize: 80, mb: 3, color: '#ee7f4b' }} />
          <Typography variant="h1" component="h1" gutterBottom sx={{ 
            fontWeight: 800, 
            fontSize: { xs: '2.5rem', md: '3.5rem' },
            mb: 2
          }}>
            Willi-Mako
          </Typography>
          <Typography variant="h4" component="h2" gutterBottom sx={{ 
            fontWeight: 600,
            color: '#ee7f4b',
            mb: 3
          }}>
            Marktkommunikation auf neuem Niveau
          </Typography>
          <Typography variant="h5" paragraph sx={{ 
            maxWidth: 800, 
            mx: 'auto',
            mb: 2,
            fontWeight: 500
          }}>
            Moderne Energiewirtschaft erfordert neue Lösungen: Bewältigen Sie komplexe Massenprozesse mit höchster Präzision und Effizienz
          </Typography>
          <Typography variant="h6" paragraph sx={{ 
            maxWidth: 700, 
            mx: 'auto',
            color: 'rgba(255,255,255,0.9)',
            mb: 4
          }}>
            Expertise-Mangel, hoher Standardisierungsgrad und strenge Prozessdisziplin fordern professionelle Tools.<br />
            Für Sachbearbeiter: Fehlerfreie Lösungen. Für Führungskräfte: Kontrollierte Effizienz.
          </Typography>
          
          <Box sx={{ mt: 4, display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              href="/app/login"
              sx={{ 
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                bgcolor: '#ee7f4b',
                '&:hover': { bgcolor: '#d66d3a' },
                borderRadius: 3
              }}
            >
              7 Tage kostenlos testen
            </Button>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              mt: 2
            }}>
              <strong>Endet automatisch.</strong> Keine Kreditkarte, kein Abo, keine Verpflichtung.
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Podcast Feature */}
      {podcastEpisodes.length > 0 && (
        <Container maxWidth="lg" sx={{ mb: 8 }}>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 3,
              backgroundColor: 'rgba(20, 122, 80, 0.04)',
              border: '1px solid',
              borderColor: 'divider'
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: { xs: 3, md: 4 },
                alignItems: 'start'
              }}
            >
              <Box>
                <Typography variant="overline" sx={{ color: '#147a50', letterSpacing: 1.2 }}>
                  Radio Willi Podcast
                </Typography>
                <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
                  Insights zum Nachhören
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  Abonnieren Sie den Podcast direkt im Player Ihrer Wahl oder hören Sie die neuesten Folgen bequem im Browser.
                </Typography>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
                  <Button
                    component="a"
                    href="https://stromhaltig.de/podcast.rss"
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="contained"
                    color="primary"
                    startIcon={<RssIcon />}
                  >
                    Podcast abonnieren
                  </Button>
                  {selectedEpisode?.audioUrl && (
                    <Button
                      component="a"
                      href={selectedEpisode.audioUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                      color="primary"
                      startIcon={<HeadphonesIcon />}
                    >
                      Aktuelle Folge öffnen
                    </Button>
                  )}
                </Stack>

                {selectedEpisode && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1, textTransform: 'uppercase' }}>
                      Jetzt anhören
                    </Typography>
                    <Typography variant="h5" component="h3" sx={{ fontWeight: 600 }} gutterBottom>
                      {selectedEpisode.title}
                    </Typography>
                    {formatDate(selectedEpisode.pubDate) && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {formatDate(selectedEpisode.pubDate)}
                      </Typography>
                    )}
                    <Box sx={{ mb: 2 }}>
                      <audio
                        key={selectedEpisode.guid}
                        controls
                        style={{ width: '100%' }}
                      >
                        <source src={selectedEpisode.audioUrl} type={selectedEpisode.mimeType || 'audio/mp4'} />
                        Ihr Browser unterstützt das Audioelement nicht.
                      </audio>
                    </Box>
                    {shorten(selectedEpisode.description, 360) && (
                      <Typography variant="body2" color="text.secondary">
                        {shorten(selectedEpisode.description, 360)}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Neueste Folgen
                </Typography>
                <List
                  dense
                  sx={{
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    bgcolor: 'background.paper'
                  }}
                >
                  {podcastEpisodes.map((episode, index) => {
                    const isActive = selectedEpisode?.guid === episode.guid;
                    const dateLabel = formatDate(episode.pubDate);
                    return (
                      <Box component="li" key={episode.guid || `${episode.title}-${index}` } sx={{ listStyle: 'none' }}>
                        <ListItem disablePadding>
                          <ListItemButton
                            selected={isActive}
                            onClick={() => setSelectedEpisode(episode)}
                            sx={{ alignItems: 'flex-start', py: 2 }}
                          >
                            <ListItemText
                              primary={episode.title}
                              primaryTypographyProps={{
                                variant: 'subtitle1',
                                fontWeight: isActive ? 700 : 600,
                                color: isActive ? 'primary.main' : 'text.primary'
                              }}
                              secondary={
                                <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                  {dateLabel && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                      {dateLabel}
                                    </Typography>
                                  )}
                                  {shorten(episode.description, 140) && (
                                    <Typography variant="body2" color="text.secondary">
                                      {shorten(episode.description, 140)}
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          </ListItemButton>
                        </ListItem>
                        {index < podcastEpisodes.length - 1 && <Divider component="div" />}
                      </Box>
                    );
                  })}
                </List>
              </Box>
            </Box>
          </Paper>
        </Container>
      )}

      {/* Business Value Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Warum die Energiewirtschaft neue Tools braucht
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Komplexe Massenprozesse fordern innovative Lösungen für höchste Effizienz und Präzision
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, 
          gap: 4 
        }}>
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <SecurityIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Hohe Prozessdisziplin
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Hoher Standardisierungsgrad erfordert absolute Präzision. 
              Kleine Fehler können enorme Ressourcen verschlingen - Compliance ist entscheidend.
            </Typography>
          </Card>
          
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <TimerIcon sx={{ fontSize: 60, color: '#ee7f4b', mb: 2 }} />
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Massenprozess-Effizienz
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Tausende Transaktionen täglich verlangen automatisierte, fehlerfreie Abläufe. 
              Manuelle Prozesse sind nicht mehr zeitgemäß.
            </Typography>
          </Card>
          
          <Card sx={{ height: '100%', textAlign: 'center', p: 3, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <Box>
              <TransparencyIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Expertenwissen rund um die Uhr
              </Typography>
            </Box>
            <Typography variant="body1" color="text.secondary">
              Breites, spezialisiertes Wissen muss strukturiert verfügbar sein. 
              Expertise-Mangel darf keine Operationen gefährden.
            </Typography>
          </Card>
        </Box>
      </Container>

      {/* Consultation Teaser */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3, alignItems: 'stretch' }}>
          <Card sx={{ p: 3 }}>
            <CardContent>
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 700 }}>
                Mitteilung Nr. 53: API‑Webdienste im MaBiS‑Hub
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Öffentliche Lesefassung inkl. GitHub‑Referenzen. Warum das für EVU wichtig ist und was jetzt zu tun ist.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button component={Link} href="/konsultation/mitteilung-53" variant="contained" color="primary">
                  Zur Konsultationsseite
                </Button>
                <Button component={Link} href="/konsultation/mitteilung-53#warum-wichtig" variant="outlined" color="primary">
                  Warum wichtig für EVU
                </Button>
                <Button component={Link} href="/konsultation/mitteilung-53#handlungs-empfehlungen" variant="outlined" color="primary">
                  Handlungsempfehlungen
                </Button>
              </Stack>
            </CardContent>
          </Card>
          <Paper elevation={0} sx={{ p: 3, bgcolor: '#f7f9ff', border: '1px solid #e8ecff', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Nächste Frist
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Einreichung an die BNetzA bis <strong>15.10.2025</strong>. Bereiten Sie Ihre Rückmeldung rechtzeitig vor.
            </Typography>
            <Button component={Link} href="/konsultation/mitteilung-53#ch10_1" size="small">Rückmeldung Kap. 1–8</Button>
            <Button component={Link} href="/konsultation/mitteilung-53#ch10_2" size="small" sx={{ ml: 1 }}>Rückmeldung Kap. 9</Button>
          </Paper>
        </Box>
      </Container>

      {/* Expert Team Section */}
      <Paper sx={{ bgcolor: '#ee7f4b', py: 6, mb: 6 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600, color: 'white' }}>
              Von Experten kuratiert, täglich aktualisiert
            </Typography>
            <Typography variant="body1" paragraph sx={{ maxWidth: 600, mx: 'auto', color: 'rgba(255,255,255,0.9)' }}>
              Ein Expertenteam, das täglich mit den Herausforderungen der Branche arbeitet, 
              kuratiert und aktualisiert unsere Wissensplattform. Kein Algorithmus - echte Branchenerfahrung.
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={4} justifyContent="center" flexWrap="wrap">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: 'white' }}>
                15+
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Jahre Branchenerfahrung
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: 'white' }}>
                500+
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Unternehmen vertrauen uns
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: 'white' }}>
                täglich
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>
                Content-Updates
              </Typography>
            </Box>
          </Stack>
        </Container>
      </Paper>
      <Box sx={{ mb: 6 }}>
        <Typography variant="h3" component="h2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FAQIcon color="primary" />
          Häufig gestellte Fragen
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Die wichtigsten Antworten zu Themen der Energiewirtschaft
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3, mt: 2 }}>
          {featuredFAQs.slice(0, 6).map((faq) => (
            <Card key={faq.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h3" gutterBottom>
                    <Link
                      href={`/wissen/${faq.slug}`}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                    >
                      {faq.title}
                    </Link>
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {faq.description || faq.content.substring(0, 120) + '...'}
                  </Typography>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                    <span>{faq.view_count} Aufrufe</span>
                    <span>{new Date(faq.updated_at).toLocaleDateString('de-DE')}</span>
                  </Box>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {faq.tags.slice(0, 3).map((tag: string) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </CardContent>
              </Card>
            ))}
        </Box>

        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button
            variant="text"
            size="large"
            component={Link}
            href="/wissen"
            endIcon={<TrendingIcon />}
          >
            Alle {totalFAQCount} FAQ-Artikel anzeigen
          </Button>
        </Box>
      </Box>

      {/* Final CTA Section */}
      <Paper 
        sx={{ 
          p: 8, 
          mt: 6,
          background: 'linear-gradient(135deg, #147a50 0%, #0d5538 100%)',
          color: 'white',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Background Pattern */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.03"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") repeat',
            opacity: 0.1
          }}
        />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ 
            color: 'white', 
            fontWeight: 700,
            mb: 3
          }}>
            Bereit für den entscheidenden Vorteil?
          </Typography>
          <Typography variant="h5" paragraph sx={{ 
            color: '#ee7f4b', 
            fontWeight: 600,
            mb: 2
          }}>
            Willi-Mako Professional
          </Typography>
          <Typography variant="h6" paragraph sx={{ 
            color: 'rgba(255,255,255,0.9)', 
            maxWidth: 700, 
            mx: 'auto',
            mb: 3
          }}>
            Das monatliche Abonnement für Ihre Expertise. Vollzugriff auf alle Premium-Inhalte, 
            KI-Chat, Dokumentenmanagement und Team-Collaboration.
          </Typography>
          
          <Box sx={{ 
            bgcolor: 'rgba(255,255,255,0.1)', 
            borderRadius: 2, 
            p: 3, 
            mb: 4,
            maxWidth: 500,
            mx: 'auto'
          }}>
            <Typography variant="h4" component="div" sx={{ 
              color: '#ee7f4b', 
              fontWeight: 700,
              mb: 1
            }}>
              Ab 199 €/Monat
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              Pro Arbeitsplatz • Jederzeit kündbar
            </Typography>
          </Box>

          <Box sx={{ mt: 4, display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              href="/app/login"
              sx={{ 
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                bgcolor: '#ee7f4b',
                '&:hover': { bgcolor: '#d66d3a' },
                borderRadius: 3
              }}
            >
              7 Tage kostenlos und sorgenfrei testen
            </Button>
            
            <Typography variant="body2" sx={{ 
              color: 'rgba(255,255,255,0.8)',
              textAlign: 'center',
              mt: 2
            }}>
              <strong>Endet automatisch.</strong> Keine Kreditkarte, kein Abo, keine Verpflichtung.
            </Typography>

          </Box>
          
          <Typography variant="body2" sx={{ 
            color: 'rgba(255,255,255,0.7)',
            fontStyle: 'italic',
            textAlign: 'center',
            mt: 3
          }}>
            ✓ Keine Kreditkarte erforderlich<br />
            ✓ Vollzugriff auf alle Features<br />
            ✓ Jederzeit kündbar
          </Typography>
        </Box>
      </Paper>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  try {
    const [allFAQs, allTags] = await Promise.all([
      getAllPublicFAQs(), // Alle FAQs holen
      getAllTags()
    ]);

    const podcastEpisodes = getPodcastEpisodes(6);

    // Nehme die ersten 6 FAQs als featured
    const featuredFAQs = allFAQs.slice(0, 6);

    // Sortiere Tags nach Häufigkeit
    const popularTags = allTags
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      props: {
        featuredFAQs,
        popularTags,
        totalFAQCount: allFAQs.length,
        podcastEpisodes
      },
      revalidate: 3600 // 1 Stunde ISR
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      props: {
        featuredFAQs: [],
        popularTags: [],
        totalFAQCount: 0,
        podcastEpisodes: []
      },
      revalidate: 60 // Kürzere Revalidation bei Fehlern
    };
  }
};
