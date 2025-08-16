import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import ScreenshotAnalyzer from '../components/ScreenshotAnalyzer';

const ScreenshotAnalysisPage: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Screenshot-Analyse
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Laden Sie Screenshots hoch oder fügen Sie sie aus der Zwischenablage ein, 
        um automatisch Marktpartner-Codes und weitere relevante Informationen zu extrahieren.
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

      <ScreenshotAnalyzer />
    </Box>
  );
};

export default ScreenshotAnalysisPage;
