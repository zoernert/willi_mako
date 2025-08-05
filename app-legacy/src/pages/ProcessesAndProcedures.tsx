import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  AccountTree as ProcessIcon,
} from '@mui/icons-material';
import MermaidRenderer from '../components/Processes/MermaidRenderer';

interface MermaidDiagram {
  id: string;
  title: string;
  content: string;
  mermaidCode: string;
  score: number;
}

interface ProcessSearchResult {
  diagrams: MermaidDiagram[];
  textualExplanation: string;
  processSteps: string[];
}

const ProcessesAndProcedures: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProcessSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Array<{
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([]);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Add user message to conversation
      const userMessage = {
        type: 'user' as const,
        content: query,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, userMessage]);

      const response = await fetch('/api/processes/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          conversationHistory: conversationHistory.slice(-5) // Last 5 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error('Fehler bei der Prozesssuche');
      }

      const data = await response.json();
      setResults(data);

      // Add assistant response to conversation
      const assistantMessage = {
        type: 'assistant' as const,
        content: data.textualExplanation,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, assistantMessage]);

      setQuery('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ein unbekannter Fehler ist aufgetreten');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSearch();
    }
  };

  const exportDiagram = (diagram: MermaidDiagram) => {
    // TODO: Implement diagram export functionality
    console.log('Exporting diagram:', diagram.title);
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setResults(null);
    setError(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ProcessIcon color="primary" />
          Prozesse und Verfahren
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Erstellen und optimieren Sie Prozessbeschreibungen mit KI-gestützter Analyse und Mermaid-Diagrammen
        </Typography>
      </Box>

      {/* Search Input */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            label="Beschreiben Sie den gewünschten Prozess oder stellen Sie eine Optimierungsfrage"
            placeholder="z.B. 'Zeige mir den Prozess für die Lieferantenwechsel bei Stromkunden' oder 'Optimiere den Kündigungsprozess für weniger Rückfragen'"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            variant="outlined"
          />
          <Button
            variant="contained"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{ height: 'fit-content', minWidth: 120 }}
          >
            {loading ? 'Suche...' : 'Suchen'}
          </Button>
          {conversationHistory.length > 0 && (
            <Tooltip title="Konversation zurücksetzen">
              <IconButton onClick={clearConversation} color="default">
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Konversationsverlauf
          </Typography>
          <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
            {conversationHistory.map((message, index) => (
              <Box
                key={index}
                sx={{
                  mb: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: message.type === 'user' ? 'primary.light' : 'grey.100',
                  color: message.type === 'user' ? 'primary.contrastText' : 'text.primary',
                }}
              >
                <Typography variant="caption" display="block" sx={{ mb: 1, opacity: 0.8 }}>
                  {message.type === 'user' ? 'Sie' : 'KI-Assistent'} • {message.timestamp.toLocaleTimeString()}
                </Typography>
                <Typography variant="body2">
                  {message.content}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      )}

      {/* Results Display */}
      {results && (
        <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Mermaid Diagrams */}
          {results.diagrams && results.diagrams.length > 0 && (
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Prozessdiagramme
                  <Chip label={`${results.diagrams.length} gefunden`} size="small" color="primary" />
                </Typography>
                
                {results.diagrams.map((diagram, index) => (
                  <Accordion key={diagram.id} defaultExpanded={index === 0}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                        <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                          {diagram.title}
                        </Typography>
                        <Chip 
                          label={`${Math.round(diagram.score * 100)}% Relevanz`} 
                          size="small" 
                          color={diagram.score > 0.8 ? 'success' : diagram.score > 0.6 ? 'warning' : 'default'}
                        />
                        <Tooltip title="Diagramm exportieren">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              exportDiagram(diagram);
                            }}
                          >
                            <DownloadIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {diagram.content}
                        </Typography>
                      </Box>
                      
                      {/* Mermaid Diagram */}
                      <MermaidRenderer
                        code={diagram.mermaidCode}
                        title={diagram.title}
                        id={`diagram-${diagram.id}`}
                        height={300}
                        onError={(error) => console.error(`Mermaid error for ${diagram.title}:`, error)}
                      />
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Paper>
            </Box>
          )}

          {/* Process Information */}
          <Box sx={{ minWidth: { lg: 400 } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Prozessanalyse
                </Typography>
                
                {results.textualExplanation && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      Erklärung
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {results.textualExplanation}
                    </Typography>
                  </Box>
                )}

                {results.processSteps && results.processSteps.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      Wichtige Prozessschritte
                    </Typography>
                    <Box component="ul" sx={{ pl: 2, m: 0 }}>
                      {results.processSteps.map((step, index) => (
                        <Typography key={index} component="li" variant="body2" sx={{ mb: 1 }}>
                          {step}
                        </Typography>
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                  💡 Tipps für bessere Ergebnisse
                </Typography>
                <Typography variant="body2" component="div">
                  <ul style={{ paddingLeft: 16, margin: 0 }}>
                    <li>Beschreiben Sie spezifische Marktprozesse</li>
                    <li>Stellen Sie Optimierungsfragen zu bestehenden Abläufen</li>
                    <li>Nutzen Sie Fachbegriffe aus der Energiewirtschaft</li>
                    <li>Fragen Sie nach konkreten Nachrichtenformaten</li>
                  </ul>
                </Typography>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Welcome Message */}
      {!results && conversationHistory.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ProcessIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Willkommen bei Prozesse und Verfahren
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Nutzen Sie die KI-gestützte Suche, um Prozesse der Marktkommunikation zu erkunden, 
            zu verstehen und zu optimieren. Die Anwendung durchsucht automatisch die Qdrant-Collection 
            nach relevanten Mermaid-Diagrammen und erstellt maßgeschneiderte Prozessbeschreibungen.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Beginnen Sie mit einer Frage oder Beschreibung des gewünschten Prozesses.
          </Typography>
        </Paper>
      )}
    </Container>
  );
};

export default ProcessesAndProcedures;
