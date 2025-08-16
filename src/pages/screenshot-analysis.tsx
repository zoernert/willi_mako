import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import Layout from '../components/Layout';
import ScreenshotAnalyzer from '../components/ScreenshotAnalyzer';
import SEOHead from '../components/SEO/SEOHead';

const ScreenshotAnalysisPage: React.FC = () => {
  return (
    <Layout title="Screenshot-Analyse - Energiewirtschafts-Codes extrahieren">
      <SEOHead
        title="Screenshot-Analyse - Energiewirtschafts-Codes automatisch extrahieren"
        description="Laden Sie Screenshots hoch, um automatisch MaLo, MeLo, EIC-Codes und BDEW-Nummern zu erkennen. Kostenloser Service für die Energiewirtschaft."
        keywords="Screenshot-Analyse, MaLo, MeLo, EIC-Code, BDEW, Energiewirtschaft, Code-Erkennung, OCR"
        url="/screenshot-analysis"
      />
      
      <Box>
        <Typography variant="h3" component="h1" gutterBottom>
          Screenshot-Analyse
        </Typography>
        
        <Typography variant="h5" color="text.secondary" paragraph>
          Extrahieren Sie automatisch Energiewirtschafts-Codes aus Screenshots
        </Typography>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Unterstützte Code-Typen:
          </Typography>
          <Box component="ul" sx={{ ml: 2 }}>
            <li><strong>MaLo (Marktlokations-ID):</strong> 11-stellige Zahl zur Identifikation von Marktlokationen</li>
            <li><strong>MeLo (Messlokations-ID):</strong> 33-stellige alphanumerische ID zur Identifikation von Messlokationen</li>
            <li><strong>EIC-Code:</strong> 16-stelliger Energy Identification Code für europäische Energiemarkt-Teilnehmer</li>
            <li><strong>BDEW Code-Nummer:</strong> 13-stellige Zahl zur Identifikation von Marktpartnern nach BDEW-Standard</li>
          </Box>
        </Paper>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Wie es funktioniert:
          </Typography>
          <Box component="ol" sx={{ ml: 2 }}>
            <li>Erstellen Sie einen Screenshot des Dokuments mit den gewünschten Codes</li>
            <li>Kopieren Sie den Screenshot in die Zwischenablage (z.B. mit dem Snipping Tool)</li>
            <li>Klicken Sie auf "Screenshot einfügen & analysieren"</li>
            <li>Unsere KI analysiert das Bild und extrahiert alle erkannten Codes</li>
            <li>Zusätzliche Informationen wie Namen und Adressen werden ebenfalls erkannt</li>
            <li>Für BDEW-Codes werden automatisch Marktpartner-Informationen angezeigt</li>
          </Box>
        </Paper>

        <ScreenshotAnalyzer />

        <Paper sx={{ p: 3, mt: 3, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary" align="center">
            Dieser Service ist kostenlos und erfordert keine Registrierung. 
            Ihre Screenshots werden nicht gespeichert und nur für die Analyse verwendet.
          </Typography>
        </Paper>
      </Box>
    </Layout>
  );
};

export default ScreenshotAnalysisPage;
