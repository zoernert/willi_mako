import React, { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DownloadIcon from '@mui/icons-material/Download';
import TimerIcon from '@mui/icons-material/Timer';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Layout from '../../components/Layout';
import { trackEvent, AnalyticsEvents } from '../../../lib/analytics';
import Head from 'next/head';

export default function GPKEFristenChecklistePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/send-lead-magnet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          magnetType: 'gpke-fristen-checkliste',
          magnetTitle: 'GPKE-Fristen-Checkliste 2025',
          pdfPath: '/downloads/gpke-fristen-checkliste-2025.pdf'
        })
      });

      if (response.ok) {
        trackEvent(AnalyticsEvents.WHITEPAPER_DOWNLOAD, { magnet: 'gpke-fristen' });
        trackEvent(AnalyticsEvents.FUNNEL_DECISION, { action: 'lead_magnet_download', magnet: 'gpke-fristen' });
        setMessage({ 
          type: 'success', 
          text: '✅ Check deine E-Mails! Die Checkliste kommt sofort.' 
        });
        setEmail('');
      } else {
        throw new Error('Download fehlgeschlagen');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '❌ Fehler beim Versand. Bitte versuche es erneut.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="GPKE-Fristen-Checkliste 2025 | Kostenloser Download">
      <Head>
        <meta name="description" content="Umfassende GPKE-Fristen-Checkliste für Lieferantenwechsel, Sperrprozess, EoG und mehr. Mit Tabellen, Best Practices und Automatisierungs-Tipps. Jetzt kostenlos herunterladen." />
      </Head>

      {/* Hero Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 8, mb: 6 }}>
        <Container maxWidth="md">
          <Typography variant="h1" component="h1" gutterBottom sx={{ fontSize: { xs: '2rem', md: '3rem' }, fontWeight: 'bold' }}>
            GPKE-Fristen-Checkliste 2025
          </Typography>
          <Typography variant="h5" paragraph>
            Alle Fristen für Lieferantenwechsel, Sperrung, EoG und Stammdaten – übersichtlich, tabellenbasiert, praxisnah.
          </Typography>
          <Typography variant="body1">
            <strong>8-12 Seiten · PDF · Kostenlos · Sofort per E-Mail</strong>
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 6 }}>
          {/* Left Column: Download Form */}
          <Box sx={{ flex: { xs: '1', md: '0 0 48%' } }}>
            <Paper elevation={3} sx={{ p: 4, borderTop: '4px solid', borderColor: 'primary.main' }}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                📥 Jetzt kostenlos herunterladen
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Gib deine E-Mail-Adresse ein und erhalte die Checkliste sofort als PDF.
              </Typography>

              {message && (
                <Alert severity={message.type} sx={{ mb: 3 }}>
                  {message.text}
                </Alert>
              )}

              <form onSubmit={handleDownload}>
                <TextField
                  fullWidth
                  type="email"
                  label="E-Mail-Adresse"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  sx={{ mb: 3 }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  fullWidth
                  disabled={loading}
                  startIcon={<DownloadIcon />}
                  sx={{ py: 1.5 }}
                >
                  {loading ? 'Wird gesendet...' : 'Kostenlos herunterladen'}
                </Button>
              </form>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2, textAlign: 'center' }}>
                ✓ Keine Anmeldung nötig · Keine Kreditkarte · Kein Spam
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Bonus:</strong> Nach dem Download erhältst du in 3 Tagen eine E-Mail mit den 5 häufigsten GPKE-Fehlern und wie du sie vermeidest.
              </Typography>
            </Paper>

            {/* CTA: Willi-Mako Trial */}
            <Paper sx={{ p: 3, mt: 3, bgcolor: 'success.light' }}>
              <Typography variant="h6" gutterBottom>
                🤖 Automatisiere deine GPKE-Fristen
              </Typography>
              <Typography variant="body2" paragraph>
                Willi-Mako überwacht automatisch alle laufenden Prozesse und warnt dich rechtzeitig vor Fristablauf.
              </Typography>
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={() => {
                  trackEvent(AnalyticsEvents.CTA_APP_REGISTER, { source: 'gpke-checklist-page' });
                  router.push('/app/register?utm_source=checkliste&utm_campaign=gpke-fristen');
                }}
              >
                14 Tage kostenlos testen
              </Button>
            </Paper>
          </Box>

          {/* Right Column: Content Preview */}
          <Box sx={{ flex: { xs: '1', md: '0 0 48%' } }}>
            <Typography variant="h5" gutterBottom fontWeight="bold">
              📋 Das erwartet dich in der Checkliste:
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="1. Lieferantenwechsel"
                  secondary="Alle Fristen von Anmeldung bis Abschlussrechnung"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="2. End-of-Gas/Strom (EoG)"
                  secondary="Abmeldung, Zählerstand, Abrechnung"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="3. Sperrprozess"
                  secondary="Von Ankündigung bis Durchführung"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="4. Entsperrprozess"
                  secondary="Schnelle Reaktivierung nach Zahlung"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="5. Abmeldung"
                  secondary="Vertragsende korrekt abwickeln"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckCircleIcon color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="6. Stammdaten-Synchronisation"
                  secondary="UTILMD-Fristen und Fehlerbehandlung"
                />
              </ListItem>
            </List>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>
              ✨ Plus: Praxis-Tipps & Automatisierung
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <TimerIcon fontSize="small" color="secondary" />
                </ListItemIcon>
                <ListItemText primary="5 Best Practices zur Fristeneinhaltung" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <VerifiedUserIcon fontSize="small" color="secondary" />
                </ListItemIcon>
                <ListItemText primary="Häufige Fallstricke und wie du sie vermeidest" />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <TrendingUpIcon fontSize="small" color="secondary" />
                </ListItemIcon>
                <ListItemText primary="Automatisierungs-Möglichkeiten mit Willi-Mako" />
              </ListItem>
            </List>

            <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.100', borderRadius: 2 }}>
              <Typography variant="body2" fontStyle="italic">
                "Diese Checkliste hat uns geholfen, unsere Fristversäumnisse von 12% auf unter 2% zu senken. 
                Die tabellarische Übersicht ist perfekt für unser Team."
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                – Sachbearbeiter Marktkommunikation, Stadtwerke (anonymisiert)
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Why this checklist? Section */}
        <Box sx={{ my: 8 }}>
          <Typography variant="h4" gutterBottom textAlign="center" fontWeight="bold">
            Warum brauchst du diese Checkliste?
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, mt: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3, height: '100%' }}>
                <Typography variant="h6" gutterBottom color="error">
                  ❌ Ohne Checkliste:
                </Typography>
                <Typography variant="body2" component="ul">
                  <li>Fristversäumnisse → Bußgelder</li>
                  <li>Chaotische Prozesse</li>
                  <li>Unzufriedene Kunden</li>
                  <li>Fehlerhafte Abrechnungen</li>
                  <li>Manuelle Suche in BNetzA-Dokumenten</li>
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3, height: '100%', bgcolor: 'success.light' }}>
                <Typography variant="h6" gutterBottom>
                  ✅ Mit Checkliste:
                </Typography>
                <Typography variant="body2" component="ul">
                  <li>Alle Fristen auf einen Blick</li>
                  <li>Strukturierte Prozesse</li>
                  <li>Rechtssicherheit</li>
                  <li>Schnellere Onboarding neuer Mitarbeiter</li>
                  <li>Praxisorientierte Best Practices</li>
                </Typography>
              </Paper>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3, height: '100%', bgcolor: 'primary.light', color: 'white' }}>
                <Typography variant="h6" gutterBottom>
                  🚀 Mit Automatisierung:
                </Typography>
                <Typography variant="body2" component="ul">
                  <li>Automatische Fristen-Überwachung</li>
                  <li>Alerts vor Fristablauf</li>
                  <li>EDIFACT-Validierung</li>
                  <li>70% Zeitersparnis</li>
                  <li>→ <strong>Jetzt Willi-Mako testen</strong></li>
                </Typography>
              </Paper>
            </Box>
          </Box>
        </Box>

        {/* Final CTA */}
        <Paper sx={{ p: 6, textAlign: 'center', bgcolor: 'primary.main', color: 'white', my: 8 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Bereit, deine GPKE-Prozesse zu optimieren?
          </Typography>
          <Typography variant="body1" paragraph>
            Hol dir jetzt die kostenlose Checkliste und spare Zeit bei jedem Prozess.
          </Typography>
          <Button
            variant="contained"
            size="large"
            sx={{ bgcolor: 'white', color: 'primary.main', px: 6, py: 2, '&:hover': { bgcolor: 'grey.100' } }}
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            Jetzt kostenlos herunterladen
          </Button>
        </Paper>
      </Container>
    </Layout>
  );
}
