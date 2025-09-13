// client/src/pages/MessageAnalyzer.tsx
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Container,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  Box,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { messageAnalyzerApi, AnalysisResult, AIExplanationResult } from '../services/messageAnalyzerApi';
import { useSnackbar } from '../contexts/SnackbarContext';
import CreateFromContextButton from '../components/BilateralClarifications/CreateFromContextButton';

const MessageAnalyzerPage: React.FC = () => {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<AIExplanationResult | null>(null);
  const [aiExplanationLoading, setAiExplanationLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  // Hinweis: Die klassische Struktur-Analyse wird nicht mehr separat angeboten.
  // Es bleibt nur die KI-Analyse (Erklärung) erhalten.

  const handleAIExplanation = async () => {
    if (!message.trim()) {
      showSnackbar('Bitte geben Sie eine Nachricht für die KI-Analyse ein.', 'warning');
      return;
    }
    setAiExplanationLoading(true);
    setLoading(true);
    setResult(null);
    setAiExplanation(null);
    
    try {
      const explanationResult = await messageAnalyzerApi.getAIExplanation(message);
      console.log('🤖 AI Explanation Result:', explanationResult);
      setAiExplanation(explanationResult);
      showSnackbar('KI-Analyse erfolgreich durchgeführt!', 'success');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 
                          error.message || 
                          'Fehler bei der KI-Analyse.';
      showSnackbar(errorMessage, 'error');
      console.error('AI Explanation error:', error);
    } finally {
      setAiExplanationLoading(false);
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
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Sie können hier EDIFACT- oder XML-Nachrichten analysieren. Nutzen Sie die "KI-Analyse" für eine verständliche Interpretation der Marktmeldung – genauso wie im Chat mit dem Prompt "Erkläre mir den Inhalt folgender Marktmeldung: ...".
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
            color="primary"
            onClick={handleAIExplanation}
            disabled={aiExplanationLoading}
            startIcon={aiExplanationLoading ? <CircularProgress size={20} /> : <SmartToyIcon />}
          >
            {aiExplanationLoading ? 'KI analysiert...' : 'KI-Analyse'}
          </Button>
          
          {/* Bilaterale Klärung Button */}
          {message.trim() && (
            <CreateFromContextButton
              variant="button"
              size="medium"
              context={{
                source: 'message_analyzer',
                messageAnalyzerContext: {
                  originalMessage: message,
                  analysisResult: result || undefined,
                  aiExplanation: aiExplanation || undefined
                }
              }}
              onSuccess={(clarification) => {
                console.log('Bilaterale Klärung erstellt:', clarification);
              }}
            />
          )}
        </Box>
        {(loading || aiExplanationLoading) && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {aiExplanationLoading && 'KI erstellt eine verständliche Analyse der Marktmeldung... Bitte warten.'}
          </Typography>
        )}
      </Paper>

      {aiExplanation && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <SmartToyIcon color="secondary" />
            <Typography variant="h6" color="secondary">
              Ergebnis der KI-Analyse
            </Typography>
          </Box>
          {/* Markdown wird als HTML gerendert */}
          <Box
            sx={{
              "& h1, & h2, & h3": { fontWeight: 600, mt: 2 },
              "& p": { mb: 1.5 },
              "& ul, & ol": { pl: 3, mb: 1.5 },
              "& code": {
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
                px: 0.5,
              },
              "& pre": {
                backgroundColor: '#f8f9fa',
                p: 2,
                borderRadius: 1,
                overflowX: 'auto',
                border: '1px solid',
                borderColor: 'divider',
              },
              "& a": { color: 'primary.main' },
              m: 0,
            }}
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {aiExplanation.explanation}
            </ReactMarkdown>
          </Box>
        </Paper>
      )}

      {/* Strukturierte Detail-Ansichten der klassischen Analyse wurden entfernt */}
    </Container>
  );
};

export default MessageAnalyzerPage;
