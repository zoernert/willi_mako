// client/src/pages/MessageAnalyzer.tsx
import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Box,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { messageAnalyzerApi, AnalysisResult } from '../services/messageAnalyzerApi';
import { useSnackbar } from '../contexts/SnackbarContext';

const MessageAnalyzerPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const { showSnackbar } = useSnackbar();

  const handleAnalyze = async () => {
    if (!message.trim()) {
      showSnackbar('Please enter a message to analyze.', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    
    // Show a progress message for long-running analysis
    const progressTimer = setTimeout(() => {
      showSnackbar('Analysis in progress... This may take up to 60 seconds for complex messages.', 'info');
    }, 5000);
    
    try {
      const analysisResult = await messageAnalyzerApi.analyze(message);
      clearTimeout(progressTimer);
      console.log('📄 Analysis Result:', analysisResult);
      setResult(analysisResult);
      showSnackbar('Analysis completed successfully!', 'success');
    } catch (error: any) {
      clearTimeout(progressTimer);
      const errorMessage = error.response?.data?.error?.message || 
                          error.message || 
                          'Failed to analyze message. Please check if the message format is correct.';
      showSnackbar(errorMessage, 'error');
      console.error('Analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Energiemarkt-Nachrichten Analyzer
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          EDIFACT oder XML Nachricht eingeben
        </Typography>
        <TextField
          multiline
          rows={10}
          fullWidth
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Fügen Sie Ihre EDIFACT- oder XML-Nachricht hier ein..."
          sx={{ mb: 2, fontFamily: 'monospace' }}
        />
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Analysiere... (bis zu 60s)' : 'Nachricht analysieren'}
        </Button>
        {loading && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            EDIFACT-Struktur wird analysiert und mit Dokumentation angereichert... Bitte warten.
          </Typography>
        )}
      </Paper>

      {result && (
        <Box>
          {/* Debug info */}
          <Paper sx={{ p: 1, mb: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="caption">
              Debug: Result format = {result.format}, Summary length = {result.summary?.length || 0}, 
              Checks count = {result.plausibilityChecks?.length || 0}, 
              Segments count = {result.structuredData?.segments?.length || 0}
            </Typography>
          </Paper>

          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">KI-Zusammenfassung & Plausibilität</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Zusammenfassung
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>{result.summary}</Alert>

                <Typography variant="subtitle1" gutterBottom>
                  Plausibilitätsprüfungen
                </Typography>
                {result.plausibilityChecks.length > 0 ? (
                  result.plausibilityChecks.map((check, index) => (
                    <Alert severity="warning" key={index} sx={{ mb: 1 }}>
                      {check}
                    </Alert>
                  ))
                ) : (
                  <Alert severity="success">Keine Probleme gefunden.</Alert>
                )}
              </Paper>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Strukturierte Daten ({result.format})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Segment</TableCell>
                      <TableCell>Beschreibung</TableCell>
                      <TableCell>Elemente</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.structuredData.segments.map((segment, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{segment.tag}</TableCell>
                        <TableCell>{segment.description}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{segment.elements.join(' : ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Container>
  );
};

export default MessageAnalyzerPage;
