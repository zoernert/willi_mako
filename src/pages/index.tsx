import { GetStaticProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  Chip,
  Paper,
  Container,
  Avatar,
  Rating,
  Stack,
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
  Lock as LockIcon,
  Star as StarIcon,
  PlayArrow as PlayIcon,
  Check as CheckIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { getAllPublicFAQs, getAllTags, StaticFAQData, FAQTag } from '../../lib/faq-api';

interface HomeProps {
  featuredFAQs: StaticFAQData[];
  popularTags: FAQTag[];
  totalFAQCount: number;
}

export default function Home({ featuredFAQs, popularTags, totalFAQCount }: HomeProps) {
  return (
    <Layout title="Energiemarkt Wissensplattform">
      <Head>
        <title>Willi-Mako | Marktkommunikation auf neuem Level - Effizienz, Sicherheit, Erfolg</title>
        <meta 
          name="description" 
          content="Steigern Sie Effizienz, minimieren Sie Risiken und sichern Sie Ihren Vorsprung in der Energiewirtschaft. Speziell für Sachbearbeiter und Entscheider. 7 Tage kostenlos testen!"
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
            Marktkommunikation auf neuem Level
          </Typography>
          <Typography variant="h5" paragraph sx={{ 
            maxWidth: 800, 
            mx: 'auto',
            mb: 2,
            fontWeight: 500
          }}>
            Steigern Sie Effizienz, minimieren Sie Risiken und sichern Sie Ihren Vorsprung in der Energiewirtschaft
          </Typography>
          <Typography variant="h6" paragraph sx={{ 
            maxWidth: 700, 
            mx: 'auto',
            color: 'rgba(255,255,255,0.9)',
            mb: 4
          }}>
            Speziell für Sachbearbeiter: Schnelle, fehlerfreie Lösungen für Ihren Alltag.<br />
            Für Vorgesetzte: Transparenz, Kontrolle und messbare Effizienzsteigerungen im Team.
          </Typography>
          
          <Box sx={{ mt: 4, display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
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
            <Button
              variant="outlined"
              size="large"
              sx={{ 
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderColor: 'rgba(255,255,255,0.7)',
                color: 'white',
                '&:hover': { 
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)'
                },
                borderRadius: 3
              }}
              startIcon={<PlayIcon />}
            >
              System-Demo ansehen
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Business Value Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Die entscheidenden Vorteile für Ihr Unternehmen
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Quantifizierbare Vorteile, die Ihren Arbeitsalltag und Ihr Unternehmen voranbringen
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <SecurityIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Risikominimierung
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Immer auf dem neuesten Stand mit den Marktregeln und Gesetzesänderungen. 
                Compliance-Sicherheit durch Expertenwissen.
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <TimerIcon sx={{ fontSize: 60, color: '#ee7f4b', mb: 2 }} />
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Maximale Effizienz
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Reduzieren Sie die Bearbeitungszeiten um bis zu 40%. 
                Schnelle, fehlerfreie Lösungen für komplexe Marktkommunikation.
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%', textAlign: 'center', p: 3 }}>
              <TransparencyIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
              <Typography variant="h5" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
                Transparenz & Kontrolle
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Volle Übersicht über alle Marktkommunikationsprozesse in Echtzeit. 
                Bessere Teamleistung durch strukturiertes Wissen.
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Exclusive Content Section */}
      <Paper sx={{ bgcolor: 'grey.50', py: 8, mb: 6 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
              Exklusive Einblicke & Expertenwissen
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Entdecken Sie die Premium-Artikel, die den Unterschied machen
            </Typography>
          </Box>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 4, height: '100%', position: 'relative' }}>
                <LockIcon sx={{ position: 'absolute', top: 16, right: 16, color: '#ee7f4b' }} />
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, pr: 5 }}>
                  Mit einem Klick: APERAK Z29-Meldungen in Minuten fehlerfrei verarbeiten
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Schritt-für-Schritt Anleitung mit Praxisbeispielen und häufigen Fallstricken.
                </Typography>
                <Chip label="Premium Inhalt" color="primary" variant="outlined" />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 4, height: '100%', position: 'relative' }}>
                <LockIcon sx={{ position: 'absolute', top: 16, right: 16, color: '#ee7f4b' }} />
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, pr: 5 }}>
                  Die 5 häufigsten Fehler bei der Lieferantenwechsel-Kommunikation
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Exklusive Analyse basierend auf 1000+ realen Fällen - und wie Sie sie vermeiden.
                </Typography>
                <Chip label="Premium Inhalt" color="primary" variant="outlined" />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 4, height: '100%', position: 'relative' }}>
                <LockIcon sx={{ position: 'absolute', top: 16, right: 16, color: '#ee7f4b' }} />
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, pr: 5 }}>
                  Zeit sparen, Fehler vermeiden: PRISMAT-Nachrichten als Antwort auf G_0031 und G_0032
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Detaillierte Workflows mit Validierungsregeln und Automatisierungstipps.
                </Typography>
                <Chip label="Premium Inhalt" color="primary" variant="outlined" />
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ p: 4, height: '100%', position: 'relative' }}>
                <LockIcon sx={{ position: 'absolute', top: 16, right: 16, color: '#ee7f4b' }} />
                <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600, pr: 5 }}>
                  BDEW-Code Masterclass: Von Grundlagen bis zu Spezialfällen
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Umfassendes Training mit interaktiven Beispielen und Prüfungsvorbereitung.
                </Typography>
                <Chip label="Premium Inhalt" color="primary" variant="outlined" />
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ textAlign: 'center', mt: 6 }}>
            <Button
              variant="contained"
              size="large"
              sx={{ 
                px: 6,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                bgcolor: '#147a50',
                '&:hover': { bgcolor: '#0d5538' }
              }}
            >
              Zugang zu allen Premium-Inhalten
            </Button>
          </Box>
        </Container>
      </Paper>

      {/* Testimonials Section */}
      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
            Was unsere Kunden sagen
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Echte Erfahrungen von Sachbearbeitern und Führungskräften
          </Typography>
        </Box>

        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 4, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#147a50', mr: 2 }}>SM</Avatar>
                <Box>
                  <Typography variant="h6" component="div">Sarah Müller</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sachbearbeiterin Marktkommunikation, Stadtwerke Hamburg
                  </Typography>
                </Box>
              </Box>
              <Rating value={5} readOnly sx={{ mb: 2 }} />
              <Typography variant="body1" paragraph>
                "Willi-Mako hat meinen Arbeitsalltag revolutioniert. Was früher Stunden gedauert hat, 
                erledige ich jetzt in Minuten. Die Stress-Reduktion ist enorm!"
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ⏱️ Zeitersparnis: 3-4 Stunden pro Tag
              </Typography>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 4, height: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ bgcolor: '#ee7f4b', mr: 2 }}>MK</Avatar>
                <Box>
                  <Typography variant="h6" component="div">Michael König</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Abteilungsleiter Energiehandel, EnBW Energie
                  </Typography>
                </Box>
              </Box>
              <Rating value={5} readOnly sx={{ mb: 2 }} />
              <Typography variant="body1" paragraph>
                "Die Transparenz und Kontrolle, die Willi-Mako bietet, sind unschätzbar. 
                Compliance-Probleme gehören der Vergangenheit an."
              </Typography>
              <Typography variant="body2" color="text.secondary">
                📈 Teameffizienz: +35% | ⚠️ Compliance-Vorfälle: -90%
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Expert Team Section */}
      <Paper sx={{ bgcolor: '#f8fafc', py: 6, mb: 6 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
              Von Experten kuratiert, täglich aktualisiert
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
              Ein Expertenteam, das täglich mit den Herausforderungen der Branche arbeitet, 
              kuratiert und aktualisiert unsere Wissensplattform. Kein Algorithmus - echte Branchenerfahrung.
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={4} justifyContent="center" flexWrap="wrap">
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#147a50' }}>
                15+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Jahre Branchenerfahrung
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#ee7f4b' }}>
                500+
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unternehmen vertrauen uns
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" component="div" sx={{ fontWeight: 700, color: '#147a50' }}>
                täglich
              </Typography>
              <Typography variant="body2" color="text.secondary">
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

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" alignItems="center">
            <Button
              variant="contained"
              size="large"
              sx={{ 
                px: 6,
                py: 2,
                fontSize: '1.2rem',
                fontWeight: 700,
                bgcolor: '#ee7f4b',
                color: 'white',
                '&:hover': { bgcolor: '#d66d3a' },
                borderRadius: 3,
                minWidth: 280
              }}
            >
              7 Tage kostenlos testen
            </Button>
            <Typography variant="body2" sx={{ 
              color: 'rgba(255,255,255,0.7)',
              fontStyle: 'italic'
            }}>
              ✓ Keine Kreditkarte erforderlich<br />
              ✓ Vollzugriff auf alle Features<br />
              ✓ Jederzeit kündbar
            </Typography>
          </Stack>
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
        totalFAQCount: allFAQs.length
      },
      revalidate: 3600 // 1 Stunde ISR
    };
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return {
      props: {
        featuredFAQs: [],
        popularTags: [],
        totalFAQCount: 0
      },
      revalidate: 60 // Kürzere Revalidation bei Fehlern
    };
  }
};
