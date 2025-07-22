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
        Market Communication Message Analyzer
      </Typography>
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Enter EDIFACT or XML Message
        </Typography>
        <TextField
          multiline
          rows={10}
          fullWidth
          variant="outlined"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Paste your EDIFACT or XML message here..."
          sx={{ mb: 2, fontFamily: 'monospace' }}
        />
        <Button
          variant="contained"
          onClick={handleAnalyze}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? 'Analyzing... (up to 60s)' : 'Analyze Message'}
        </Button>
        {loading && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Analyzing EDIFACT structure and enriching with documentation... Please wait.
          </Typography>
        )}
      </Paper>

      {result && (
        <Box>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">AI Summary & Plausibility</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Summary
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>{result.summary}</Alert>

                <Typography variant="subtitle1" gutterBottom>
                  Plausibility Checks
                </Typography>
                {result.plausibilityChecks.length > 0 ? (
                  result.plausibilityChecks.map((check, index) => (
                    <Alert severity="warning" key={index} sx={{ mb: 1 }}>
                      {check}
                    </Alert>
                  ))
                ) : (
                  <Alert severity="success">No issues found.</Alert>
                )}
              </Paper>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Structured Data ({result.format})</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Segment</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Elements</TableCell>
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
