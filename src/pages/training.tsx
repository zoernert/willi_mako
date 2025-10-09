import Head from 'next/head';
import Link from 'next/link';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Paper,
  Container,
  Chip,
  Stack,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  School as SchoolIcon,
  Timeline as TimelineIcon,
  Groups as GroupsIcon,
  WorkspacePremium as CertificateIcon,
  OpenInNew as ExternalIcon,
  ArrowForward as ArrowIcon,
  PlayCircle as PlayCircleIcon,
  TipsAndUpdates as TipsIcon,
} from '@mui/icons-material';
import Layout from '../components/Layout';

const featuredCourses = [
  {
    title: 'Marktkommunikation Kompakt – GPKE, GeLi Gas & WiM',
    description:
      'Das Grundlagentraining für Einsteiger: Prozesse verstehen, Nachrichten lesen und typische Fehler vermeiden.',
    duration: '2 Tage, live-online',
    targetGroup: 'Quereinsteiger:innen und neue Sachbearbeiter:innen',
    link: 'https://training.stromhaltig.de/kurse/marktkommunikation-kompakt',
  },
  {
    title: 'Bilanzkreismanagement & MaBiS Intensiv',
    description:
      'Vom Fahrplan bis zum Ausgleichsenergiepreis: Dieses Training macht Sie fit für das tägliche Bilanzkreisgeschäft.',
    duration: '3 halbe Tage, remote',
    targetGroup: 'Bilanzkreisverantwortliche, Fachabteilungen Energiehandel',
    link: 'https://training.stromhaltig.de/kurse/bilanzkreismanagement-mabis',
  },
  {
    title: 'EDIFACT Deep Dive – Nachrichten sicher interpretieren',
    description:
      'Praktische Übungen an echten UTILMD-, MSCONS- und ORDERS-Nachrichten mit sofortiger Fehleranalyse.',
    duration: '1 Tag, Workshop-Format',
    targetGroup: 'Sachbearbeitung Marktprozesse, IT-Support',
    link: 'https://training.stromhaltig.de/kurse/edifact-deep-dive',
  },
];

const benefits = [
  {
    icon: <TimelineIcon sx={{ fontSize: 36, color: '#ee7f4b' }} />,
    title: 'Aktuelle Praxisfälle',
    description:
      'Alle Trainings basieren auf realen Vorgängen aus GPKE, MaBiS, WiM und Redispatch 2.0 – inklusive aktueller Marktmitteilungen.',
  },
  {
    icon: <GroupsIcon sx={{ fontSize: 36, color: '#ee7f4b' }} />,
    title: 'Kleine Lerngruppen',
    description:
      'Maximal 12 Teilnehmende sorgen für persönlichen Austausch, Fragen und Praxisfeedback direkt aus der Community.',
  },
  {
    icon: <CertificateIcon sx={{ fontSize: 36, color: '#ee7f4b' }} />,
    title: 'Zertifizierter Abschluss',
    description:
      'Jedes Training endet mit einer Wissenstransfer-Session und einem anerkannten Teilnahmezertifikat für Ihre Personalakte.',
  },
  {
    icon: <PlayCircleIcon sx={{ fontSize: 36, color: '#ee7f4b' }} />,
    title: 'Blended Learning',
    description:
      'Live-Sessions kombiniert mit On-Demand-Lektionen, Checklisten und Übungsfällen in der Willi-Mako App.',
  },
];

export default function TrainingPage() {
  return (
    <Layout title="Training für Marktkommunikation">
      <Head>
        <title>Training & Kurse Marktkommunikation | Willi-Mako</title>
        <meta
          name="description"
          content="Doorway-Page für Schulungen der Marktkommunikation: Live-Trainings, Blended Learning und Zertifizierungen für GPKE, MaBiS und MaKo 2026."
        />
        <meta
          name="keywords"
          content="Training Marktkommunikation, Kurse Energiewirtschaft, GPKE Schulung, MaBiS Seminar, EDIFACT Training, Weiterbildung Energiewirtschaft"
        />
        <link rel="canonical" href="https://stromhaltig.de/training" />

        <meta property="og:title" content="Training & Kurse Marktkommunikation | Willi-Mako" />
        <meta
          property="og:description"
          content="Weiterbildungen für Fach- und Führungskräfte in der Energiewirtschaft: GPKE, Bilanzkreismanagement, EDIFACT und mehr."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://stromhaltig.de/training" />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: 'Weiterbildungen für Marktkommunikation',
              description:
                'Ausgewählte Kurse und Trainingsangebote von training.stromhaltig.de für die Energiewirtschaft.',
              url: 'https://stromhaltig.de/training',
              itemListElement: featuredCourses.map((course, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                item: {
                  '@type': 'Course',
                  name: course.title,
                  description: course.description,
                  provider: {
                    '@type': 'Organization',
                    name: 'training.stromhaltig.de',
                    sameAs: 'https://training.stromhaltig.de/',
                  },
                  url: course.link,
                },
              })),
            }),
          }}
        />
      </Head>

      <Paper
        elevation={0}
        sx={{
          background: 'linear-gradient(135deg, #004c4c 0%, #0a7a7a 100%)',
          color: 'white',
          p: { xs: 4, md: 8 },
          mb: 6,
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <SchoolIcon sx={{ fontSize: 80, mb: 3, color: '#ee7f4b' }} />
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              mb: 2,
            }}
          >
            Training & Weiterbildung Marktkommunikation
          </Typography>
          <Typography
            variant="h5"
            paragraph
            sx={{
              maxWidth: 820,
              mx: 'auto',
              mb: 4,
              fontWeight: 500,
            }}
          >
            Von Grundlagen bis Spezialwissen: Entdecken Sie das Kursprogramm auf training.stromhaltig.de und kombinieren Sie Live-Sessions mit der Willi-Mako Plattform.
          </Typography>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Button
              component="a"
              href="https://training.stromhaltig.de/kurse"
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="large"
              endIcon={<ExternalIcon />}
              sx={{
                bgcolor: '#ee7f4b',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#d86f3f',
                },
              }}
            >
              Kursübersicht öffnen
            </Button>
            <Button
              component={Link}
              href="/karriere"
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
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Karriere mit Willi-Mako planen
            </Button>
          </Stack>
        </Container>
      </Paper>

      <Container maxWidth="lg" sx={{ mb: 8 }}>
        <Box sx={{ mb: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            gutterBottom
            align="center"
            sx={{ fontWeight: 700, mb: 2 }}
          >
            Warum training.stromhaltig.de?
          </Typography>
          <Typography
            variant="h6"
            align="center"
            color="text.secondary"
            sx={{ mb: 5, maxWidth: 820, mx: 'auto' }}
          >
            Die Trainingsplattform ergänzt Willi-Mako perfekt: strukturierte Lernpfade, Live-Fachwissen und eine Community, die Fragen beantwortet, bevor sie zum Problem werden.
          </Typography>

          <Grid container spacing={4}>
            {benefits.map((benefit) => (
              <Grid item xs={12} md={6} key={benefit.title}>
                <Card sx={{ height: '100%', boxShadow: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Stack direction="row" spacing={3} alignItems="flex-start">
                      {benefit.icon}
                      <Box>
                        <Typography variant="h6" gutterBottom fontWeight={600}>
                          {benefit.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {benefit.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 8 }} />

        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ fontWeight: 700, mb: 4 }}>
            Highlights aus dem Kursprogramm
          </Typography>
          <Grid container spacing={4}>
            {featuredCourses.map((course) => (
              <Grid item xs={12} md={4} key={course.title}>
                <Card sx={{ height: '100%', boxShadow: 4, display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ p: 4, flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      {course.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {course.description}
                    </Typography>
                    <Stack direction="column" spacing={1} sx={{ mb: 3 }}>
                      <Chip label={course.duration} sx={{ alignSelf: 'flex-start' }} />
                      <Chip label={course.targetGroup} sx={{ alignSelf: 'flex-start' }} />
                    </Stack>
                  </CardContent>
                  <Box sx={{ p: 3, pt: 0 }}>
                    <Button
                      component="a"
                      href={course.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      fullWidth
                      variant="outlined"
                      endIcon={<ExternalIcon />}
                    >
                      Details ansehen
                    </Button>
                  </Box>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 8 }} />

        <Box sx={{ mb: 8 }}>
          <Typography variant="h3" component="h2" gutterBottom align="center" sx={{ fontWeight: 700, mb: 2 }}>
            Lernpfad: Vom Einstieg zur Spezialistin
          </Typography>
          <Typography
            variant="body1"
            align="center"
            color="text.secondary"
            sx={{ mb: 5, maxWidth: 850, mx: 'auto' }}
          >
            Kombinieren Sie die Trainings mit den Funktionen der Willi-Mako Plattform. Der empfohlene Lernpfad sorgt dafür, dass Wissen sofort angewendet wird und Teams nachhaltig profitieren.
          </Typography>

          <Grid container spacing={4}>
            {[
              {
                title: '1. Grundlagen schaffen',
                description:
                  'Starten Sie mit dem Kurs "Marktkommunikation Kompakt" und nutzen Sie parallel die FAQ-Bibliothek in Willi-Mako, um Begriffe nachzuschlagen.',
              },
              {
                title: '2. Prozesse vertiefen',
                description:
                  'Mit "Bilanzkreismanagement & MaBiS" lernen Sie komplexe Fälle kennen. Simulieren Sie diese in der Timeline-Funktion der App.',
              },
              {
                title: '3. Spezialwissen aufbauen',
                description:
                  'Der EDIFACT Deep Dive und zusätzliche Workshops zu Redispatch 2.0 erweitern Ihre Expertise – unterstützt durch den Nachrichten-Analysator.',
              },
              {
                title: '4. Wissen teilen',
                description:
                  'Nutzen Sie den Community Hub für Fragen und dokumentieren Sie Best Practices als interne FAQ. So profitieren ganze Teams vom Training.',
              },
            ].map((step) => (
              <Grid item xs={12} md={6} key={step.title}>
                <Card sx={{ height: '100%', boxShadow: 2, borderLeft: '4px solid #0a7a7a' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="subtitle1" color="primary" gutterBottom>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        <Divider sx={{ my: 8 }} />

        <Box sx={{ textAlign: 'center', mb: 10 }}>
          <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
            Nächste Schritte
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 720, mx: 'auto' }}>
            Sichern Sie sich Ihren Platz im nächsten Training und kombinieren Sie Live-Weiterbildungen mit der täglichen Arbeit in Willi-Mako. Gemeinsam bringen wir Marktkommunikationsteams auf das nächste Level.
          </Typography>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="center">
            <Button
              component="a"
              href="https://training.stromhaltig.de/kalender"
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
              size="large"
              endIcon={<ExternalIcon />}
              sx={{
                bgcolor: '#0a7a7a',
                color: 'white',
                px: 4,
                py: 1.5,
                fontSize: '1.05rem',
                fontWeight: 600,
                '&:hover': {
                  bgcolor: '#075f5f',
                },
              }}
            >
              Termine & Verfügbarkeit prüfen
            </Button>
            <Button
              component={Link}
              href="/kontakt"
              variant="outlined"
              size="large"
              endIcon={<TipsIcon />}
              sx={{
                px: 4,
                py: 1.5,
                fontSize: '1.05rem',
              }}
            >
              Individuelle Beratung anfragen
            </Button>
          </Stack>
        </Box>
      </Container>
    </Layout>
  );
}
