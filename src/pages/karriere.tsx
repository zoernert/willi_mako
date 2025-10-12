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
  Divider,
  Alert
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  TrendingUp as TrendingIcon,
  Work as WorkIcon,
  LocationOn as LocationIcon,
  School as SchoolIcon,
  EmojiObjects as IdeaIcon,
  Speed as SpeedIcon,
  Groups as CommunityIcon,
  Star as StarIcon,
  ArrowForward as ArrowIcon,
  OpenInNew as ExternalIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';

interface JobData {
  _id: string;
  titel: string;
  arbeitgeber: string;
  arbeitsort: {
    ort: string;
    plz: string;
    region: string;
  };
  veroeffentlicht: string;
  foundKeywords: string[];
  relevanceScore: number;
}

interface KarriereProps {
  jobs: JobData[];
  totalJobs: number;
  lastUpdated: string;
}

export default function KarrierePage({ jobs, totalJobs, lastUpdated }: KarriereProps) {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('de-DE', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <Layout title="Karriere in der Marktkommunikation">
      <Head>
        <title>Karriere in der Marktkommunikation | Willi-Mako</title>
        <meta 
          name="description" 
          content="Entdecken Sie Karrierechancen in der Energiewirtschaft. Aktuelle Jobs, Trend-Analysen und Ihr persönlicher Karriere-Coach Willi-Mako für Marktkommunikation, GPKE und Bilanzkreismanagement."
        />
        <meta 
          name="keywords" 
          content="Karriere Marktkommunikation, Jobs Energiewirtschaft, GPKE Jobs, Bilanzkreismanagement Stellenangebote, Energiewirtschaft Karriere, Lieferantenwechsel Jobs" 
        />
        <link rel="canonical" href="https://stromhaltig.de/karriere" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Karriere in der Marktkommunikation | Willi-Mako" />
        <meta property="og:description" content="Ihr Karriere-Coach für die Energiewirtschaft. Aktuelle Jobs, Skills-Entwicklung und Expertenwissen." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/karriere" />
        
        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebPage",
              "name": "Karriere in der Marktkommunikation",
              "description": "Karrierechancen und Jobs in der Energiewirtschaft mit Willi-Mako als persönlichem Coach",
              "url": "https://stromhaltig.de/karriere",
              "breadcrumb": {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://stromhaltig.de"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "Karriere",
                    "item": "https://stromhaltig.de/karriere"
                  }
                ]
              },
              "about": {
                "@type": "EducationalOrganization",
                "name": "Willi-Mako",
                "description": "Ihr Coach für Marktkommunikation in der Energiewirtschaft"
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
          p: { xs: 4, md: 8 },
          mb: 6,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="lg">
          <WorkIcon sx={{ fontSize: 80, mb: 3, color: '#ee7f4b' }} />
          <Typography variant="h1" component="h1" gutterBottom sx={{ 
            fontWeight: 800, 
            fontSize: { xs: '2rem', md: '3rem' },
            mb: 2
          }}>
            Karriere in der Marktkommunikation
          </Typography>
          <Typography variant="h5" paragraph sx={{ 
            maxWidth: 800, 
            mx: 'auto',
            mb: 4,
            fontWeight: 500
          }}>
            Willi-Mako ist Ihr persönlicher Coach für eine erfolgreiche Karriere in der Energiewirtschaft
          </Typography>

          {/* Key Metrics */}
          <Grid container spacing={3} sx={{ mt: 2, mb: 4 }} justifyContent="center">
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#ee7f4b' }}>
                  {totalJobs}+
                </Typography>
                <Typography variant="body1">Aktuelle Stellenangebote</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#ee7f4b' }}>
                  7+
                </Typography>
                <Typography variant="body1">Fachbereiche überwacht</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 3, bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)' }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: '#ee7f4b' }}>
                  Täglich
                </Typography>
                <Typography variant="body1">Aktualisierte Jobs</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Button
              component={Link}
              href="/app/login"
              variant="contained"
              size="large"
              sx={{
                bgcolor: '#ee7f4b',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#d86f3f'
                }
              }}
            >
              7 Tage kostenlos testen
            </Button>
            <Button
              component={Link}
              href="/training"
              variant="outlined"
              size="large"
              endIcon={<ArrowIcon />}
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: '#ee7f4b',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Weiterbildung entdecken
            </Button>
            <Button
              component="a"
              href="https://jobs.stromhaltig.de/search"
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="large"
              endIcon={<ExternalIcon />}
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: '#ee7f4b',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Alle Jobs durchsuchen
            </Button>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mb: 8 }}>
        {/* Warum Marktkommunikation */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ fontWeight: 700, mb: 4 }}>
            Warum Marktkommunikation eine Zukunftsbranche ist
          </Typography>
          
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', boxShadow: 3 }}>
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <TrendingIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Energiewende & Digitalisierung
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Die Transformation der Energiewirtschaft schafft kontinuierlich neue Rollen. 
                    Experten für Marktkommunikation, GPKE-Prozesse und Bilanzkreismanagement sind gefragter denn je.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', boxShadow: 3 }}>
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <SchoolIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Fachkräftemangel = Ihre Chance
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Die Branche sucht händeringend nach qualifizierten Fachkräften. 
                    Mit dem richtigen Wissen und Tools wie Willi-Mako verschaffen Sie sich einen entscheidenden Vorsprung.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card sx={{ height: '100%', boxShadow: 3 }}>
                <CardContent sx={{ textAlign: 'center', p: 4 }}>
                  <StarIcon sx={{ fontSize: 60, color: '#147a50', mb: 2 }} />
                  <Typography variant="h6" gutterBottom fontWeight={600}>
                    Vielfältige Karrierewege
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Von Sachbearbeiter bis Bilanzkreismanager, von Lieferantenwechsel bis Netznutzungsabrechnung – 
                    die Karrieremöglichkeiten sind vielfältig und zukunftssicher.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Willi-Mako als Karriere-Coach */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ fontWeight: 700, mb: 2 }}>
            Willi-Mako: Ihr persönlicher Karriere-Coach
          </Typography>
          <Typography variant="h6" align="center" color="text.secondary" sx={{ mb: 4, maxWidth: 800, mx: 'auto' }}>
            Mehr als nur ein Tool – Ihr strategischer Partner für Karriere-Erfolg in der Energiewirtschaft
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 2, borderLeft: '4px solid #147a50' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <IdeaIcon sx={{ fontSize: 40, color: '#ee7f4b', flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Expertenwissen aufbauen
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        40+ FAQ-Artikel zu GPKE, GeLi Gas, Bilanzkreisen, Lieferantenwechsel und mehr. 
                        Lernen Sie die Themen, die Arbeitgeber erwarten – strukturiert und praxisnah.
                      </Typography>
                      <Button 
                        component={Link} 
                        href="/wissen" 
                        size="small" 
                        endIcon={<ArrowIcon />}
                        sx={{ color: '#147a50' }}
                      >
                        Zur Wissensdatenbank
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 2, borderLeft: '4px solid #147a50' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <SpeedIcon sx={{ fontSize: 40, color: '#ee7f4b', flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Praxisnahe Tools nutzen
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Screenshot-Analyse für Code-Erkennung, Message-Analyzer für EDIFACT, 
                        Daten-Atlas für Prozesse – üben Sie mit professionellen Werkzeugen.
                      </Typography>
                      <Button 
                        component={Link} 
                        href="/screenshot-analysis" 
                        size="small" 
                        endIcon={<ArrowIcon />}
                        sx={{ color: '#147a50' }}
                      >
                        Tools erkunden
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 2, borderLeft: '4px solid #147a50' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <CommunityIcon sx={{ fontSize: 40, color: '#ee7f4b', flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Netzwerk aufbauen
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Tauschen Sie sich mit anderen Fachleuten aus, stellen Sie Fragen und 
                        profitieren Sie von kollektivem Wissen im Community Hub.
                      </Typography>
                      <Button 
                        component={Link} 
                        href="/community" 
                        size="small" 
                        endIcon={<ArrowIcon />}
                        sx={{ color: '#147a50' }}
                      >
                        Community beitreten
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ height: '100%', boxShadow: 2, borderLeft: '4px solid #147a50' }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <TrendingIcon sx={{ fontSize: 40, color: '#ee7f4b', flexShrink: 0 }} />
                    <Box>
                      <Typography variant="h6" gutterBottom fontWeight={600}>
                        Trends verstehen
                      </Typography>
                      <Typography variant="body2" color="text.secondary" paragraph>
                        Bleiben Sie am Puls der Zeit: KI-gestützte Job-Analysen zeigen Ihnen, 
                        welche Skills gerade gefragt sind und wo die meisten Chancen liegen.
                      </Typography>
                      <Button 
                        component="a" 
                        href="https://jobs.stromhaltig.de/trends" 
                        target="_blank"
                        rel="noopener noreferrer"
                        size="small" 
                        endIcon={<ExternalIcon />}
                        sx={{ color: '#147a50' }}
                      >
                        Job-Trends ansehen
                      </Button>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* Aktuelle Jobs */}
        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ fontWeight: 700, mb: 2 }}>
            Aktuelle Stellenangebote
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            {jobs.length > 0 ? (
              <>Live-Jobs aus unserer KI-gestützten Job-Plattform (zuletzt aktualisiert: {formatDate(lastUpdated)})</>
            ) : (
              <>Stellenangebote werden täglich aktualisiert</>
            )}
          </Typography>

          {jobs.length > 0 ? (
            <Grid container spacing={3}>
              {jobs.map((job) => (
                <Grid item xs={12} md={6} key={job._id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 3 }}>
                      <Typography variant="h6" gutterBottom fontWeight={600} sx={{ 
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {job.titel}
                      </Typography>
                      
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                        <Chip 
                          label={job.arbeitgeber} 
                          size="small" 
                          sx={{ bgcolor: '#f0f9ff', color: '#147a50' }}
                        />
                        {job.relevanceScore > 5 && (
                          <Chip 
                            label="Sehr relevant" 
                            size="small" 
                            color="primary"
                            sx={{ bgcolor: '#ee7f4b', color: 'white' }}
                          />
                        )}
                      </Stack>

                      <Stack spacing={1} sx={{ mb: 2 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <LocationIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {job.arbeitsort.ort}, {job.arbeitsort.region}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                          Veröffentlicht: {formatDate(job.veroeffentlicht)}
                        </Typography>
                      </Stack>

                      {job.foundKeywords && job.foundKeywords.length > 0 && (
                        <Box sx={{ mb: 2 }}>
                          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                            {job.foundKeywords.slice(0, 3).map((keyword) => (
                              <Chip 
                                key={keyword}
                                label={keyword.toUpperCase()} 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: '0.7rem' }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      )}

                      <Button
                        component="a"
                        href={`https://jobs.stromhaltig.de/jobs/${job._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="outlined"
                        size="small"
                        endIcon={<ExternalIcon />}
                        fullWidth
                        sx={{ 
                          mt: 'auto',
                          borderColor: '#147a50',
                          color: '#147a50',
                          '&:hover': {
                            borderColor: '#0d5538',
                            bgcolor: '#f0f9ff'
                          }
                        }}
                      >
                        Job ansehen
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Alert severity="info" sx={{ mb: 4 }}>
              Stellenangebote werden derzeit geladen. Besuchen Sie unsere Job-Plattform für die aktuellsten Angebote.
            </Alert>
          )}

          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Button
              component="a"
              href="https://jobs.stromhaltig.de/search"
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="large"
              endIcon={<ExternalIcon />}
              sx={{
                bgcolor: '#147a50',
                color: 'white',
                px: 4,
                py: 1.5,
                '&:hover': {
                  bgcolor: '#0d5538'
                }
              }}
            >
              Alle {totalJobs}+ Stellenangebote durchsuchen
            </Button>
          </Box>
        </Box>

        <Divider sx={{ my: 6 }} />

        {/* CTA Section */}
        <Paper 
          elevation={3} 
          sx={{ 
            background: 'linear-gradient(135deg, #f0f9ff 0%, #ecfdf5 100%)',
            p: { xs: 4, md: 6 },
            textAlign: 'center',
            borderRadius: 2
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom fontWeight={700}>
            Bereit für den nächsten Karriere-Schritt?
          </Typography>
          <Typography variant="body1" paragraph sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}>
            Nutzen Sie Willi-Mako als Ihren persönlichen Coach und bereiten Sie sich optimal 
            auf Ihre Traumstelle in der Energiewirtschaft vor. Kostenlos, unverbindlich, 7 Tage lang.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              component={Link}
              href="/app/login"
              variant="contained"
              size="large"
              sx={{
                bgcolor: '#ee7f4b',
                color: 'white',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#d86f3f'
                }
              }}
            >
              7 Tage kostenlos testen
            </Button>
            <Button
              component="a"
              href="https://jobs.stromhaltig.de/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              variant="outlined"
              size="large"
              endIcon={<ExternalIcon />}
              sx={{
                borderColor: '#147a50',
                color: '#147a50',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                '&:hover': {
                  borderColor: '#0d5538',
                  bgcolor: 'rgba(20, 122, 80, 0.1)'
                }
              }}
            >
              Job-Dashboard erkunden
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
            ✓ Keine Kreditkarte erforderlich • ✓ Jederzeit kündbar • ✓ Vollzugriff auf alle Features
          </Typography>
        </Paper>
      </Container>
    </Layout>
  );
}

export const getStaticProps: GetStaticProps<KarriereProps> = async () => {
  let jobs: JobData[] = [];
  let totalJobs = 215; // Fallback
  const lastUpdated = new Date().toISOString();

  try {
    // Fetch jobs from API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(
      'https://jobs.stromhaltig.de/api/jobs?q=GPKE&active=true&relevant=true&limit=10',
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      
      if (data.jobs && Array.isArray(data.jobs)) {
        jobs = data.jobs.map((job: any) => ({
          _id: job._id,
          titel: job.titel || job.details?.stellenangebotsTitel || 'Stellenangebot',
          arbeitgeber: job.arbeitgeber || 'Unbekannt',
          arbeitsort: {
            ort: job.arbeitsort?.ort || 'Deutschland',
            plz: job.arbeitsort?.plz || '',
            region: job.arbeitsort?.region || ''
          },
          veroeffentlicht: job.veroeffentlicht || new Date().toISOString(),
          foundKeywords: job.foundKeywords || [],
          relevanceScore: job.relevanceScore || 0
        }));
      }

      // Update total count if available
      if (data.count && typeof data.count === 'number') {
        totalJobs = data.count;
      }
    }
  } catch (error) {
    console.error('Failed to fetch jobs from API:', error);
    // Fallback to empty array - page will show info message
  }

  return {
    props: {
      jobs,
      totalJobs,
      lastUpdated
    },
    revalidate: 86400 // 24 hours (täglich neu generieren)
  };
};
