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
  Chip,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { messageAnalyzerApi, AnalysisResult, AIExplanationResult } from '../services/messageAnalyzerApi';
import { useSnackbar } from '../contexts/SnackbarContext';

const MessageAnalyzerPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResult | null>(null);
  const [aiExplanationLoading, setAiExplanationLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  const handleAnalyze = async () => {
    if (!message.trim()) {
      showSnackbar('Please enter a message to analyze.', 'warning');
      return;
    }
    setLoading(true);
    setResult(null);
    setAiExplanation(null);
    
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

  const handleAIExplanation = async () => {
    if (!message.trim()) {
      showSnackbar('Please enter a message to get AI explanation.', 'warning');
      return;
    }
    setAiExplanationLoading(true);
    
    try {
      const explanationResult = await messageAnalyzerApi.getAIExplanation(message);
      console.log('🤖 AI Explanation Result:', explanationResult);
      setAiExplanation(explanationResult);
      showSnackbar('KI-Erklärung erfolgreich generiert!', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.message || 
                          'Fehler beim Generieren der KI-Erklärung.';
      showSnackbar(errorMessage, 'error');
      console.error('AI Explanation error:', error);
    } finally {
      setAiExplanationLoading(false);
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
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Sie können hier EDIFACT- oder XML-Nachrichten analysieren. Nutzen Sie den "KI-Erklärung" Button für eine verständliche Interpretation der Marktmeldung - genauso wie im Chat mit dem Prompt "Erkläre mir den Inhalt folgender Marktmeldung: ...".
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
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Button
            variant="contained"
            onClick={handleAnalyze}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Analysiere... (bis zu 60s)' : 'Nachricht analysieren'}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={handleAIExplanation}
            disabled={aiExplanationLoading}
            startIcon={aiExplanationLoading ? <CircularProgress size={20} /> : <SmartToyIcon />}
          >
            {aiExplanationLoading ? 'KI arbeitet...' : 'KI-Erklärung'}
          </Button>
        </Box>
        {(loading || aiExplanationLoading) && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {loading && 'EDIFACT-Struktur wird analysiert und mit Dokumentation angereichert... Bitte warten.'}
            {aiExplanationLoading && 'KI generiert eine verständliche Erklärung der Marktmeldung... Bitte warten.'}
          </Typography>
        )}
      </Paper>

      {aiExplanation && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SmartToyIcon color="secondary" />
            <Typography variant="h6" color="secondary">
              KI-Erklärung der Marktmeldung
            </Typography>
          </Box>
          <Alert severity="info" sx={{ whiteSpace: 'pre-wrap' }}>
            {aiExplanation.explanation}
          </Alert>
        </Paper>
      )}

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
                      <TableCell>Aufgelöste Codes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.structuredData.segments.map((segment, index) => (
                      <TableRow key={index}>
                        <TableCell sx={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{segment.tag}</TableCell>
                        <TableCell>{segment.description}</TableCell>
                        <TableCell sx={{ fontFamily: 'monospace' }}>{segment.elements.join(' : ')}</TableCell>
                        <TableCell>
                          {segment.resolvedCodes && Object.keys(segment.resolvedCodes).length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                              {Object.entries(segment.resolvedCodes).map(([code, companyName]) => (
                                <Tooltip key={code} title={`Code: ${code}`} placement="top">
                                  <Chip
                                    label={`${code}: ${companyName}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ 
                                      fontSize: '0.75rem',
                                      maxWidth: '100%',
                                      '& .MuiChip-label': {
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                      }
                                    }}
                                  />
                                </Tooltip>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              Keine Codes gefunden
                            </Typography>
                          )}
                        </TableCell>
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
