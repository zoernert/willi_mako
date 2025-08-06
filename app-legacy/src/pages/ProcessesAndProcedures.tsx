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
import ReactMarkdown from 'react-markdown';
import MermaidRenderer from '../components/Processes/MermaidRenderer';
import ProcessService, { ProcessSearchResult, ConversationMessage } from '../services/processService';

interface MermaidDiagram {
  id: string;
  title: string;
  content: string;
  mermaidCode: string;
  score: number;
}

// Use interfaces from ProcessService instead of redefining
// Remove these local interfaces as they're imported from ProcessService

const ProcessesAndProcedures: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProcessSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  // Debug: Check if token is available
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('ProcessesAndProcedures - Token check:', token ? 'Token found' : 'No token found');
    if (!token) {
      setError('Kein Authentifizierungs-Token gefunden. Bitte melden Sie sich erneut an.');
    }
  }, []);

  // Test API connection
  const testApiConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const healthCheck = await ProcessService.checkHealth();
      console.log('API Health Check:', healthCheck);
      setError(`API Test erfolgreich: ${healthCheck.status} (${healthCheck.timestamp})`);
    } catch (err) {
      console.error('API Test failed:', err);
      setError(`API Test fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to clean diagram titles
  const cleanTitle = (title: string): string => {
    return title
      .replace(/^#+\s*/, '') // Remove markdown headers (###, ####)
      .replace(/\[cite:\s*\d+(?:,\s*\d+)*\]/g, '') // Remove citation markers
      .replace(/^\d+\.\d+\s+/, '') // Remove numbering like "1.1 "
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  };

  // Helper function to clean content and remove redundant title repetition
  const cleanContent = (content: string, title: string): string => {
    let cleaned = content
      .replace(/^#+\s*/, '') // Remove markdown headers
      .replace(/\[cite:\s*\d+(?:,\s*\d+)*\]/g, '') // Remove citation markers
      .replace(/^\d+\.\d+\s+/, '') // Remove numbering
      .trim();
    
    // Remove title repetition at the beginning of content
    const cleanedTitle = cleanTitle(title);
    if (cleaned.toLowerCase().startsWith(cleanedTitle.toLowerCase())) {
      cleaned = cleaned.substring(cleanedTitle.length).trim();
    }
    
    // Remove any remaining leading punctuation or whitespace
    cleaned = cleaned.replace(/^[:\-\s\.\,]+/, '').trim();
    
    // If content starts with "Dieses Diagramm visualisiert", extract the meaningful part
    if (cleaned.toLowerCase().startsWith('dieses diagramm visualisiert')) {
      const match = cleaned.match(/visualisiert den prozessablauf für den anwendungsfall[:\s]*"([^"]+)"/i);
      if (match) {
        cleaned = `**Anwendungsfall:** ${match[1]}\n\n${cleaned}`;
      }
    }
    
    // Remove duplicate sentences (common in AI-generated content)
    const sentences = cleaned.split(/\.\s+/);
    const uniqueSentences = sentences.filter((sentence, index) => {
      return !sentences.slice(0, index).some(prev => 
        prev.toLowerCase().includes(sentence.toLowerCase().substring(0, 50)) ||
        sentence.toLowerCase().includes(prev.toLowerCase().substring(0, 50))
      );
    });
    cleaned = uniqueSentences.join('. ').trim();
    
    return cleaned || 'Keine zusätzlichen Informationen verfügbar.';
  };

  // Helper function to check if mermaid code is valid
  const isValidMermaidCode = (code: string): boolean => {
    if (!code || !code.trim()) {
      console.log('MermaidValidator: No code provided');
      return false;
    }
    
    const cleaned = code
      .replace(/^```mermaid\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    
    console.log('MermaidValidator: Checking code (first 100 chars):', cleaned.substring(0, 100));
    console.log('MermaidValidator: Full code length:', cleaned.length);
    
    // Check for problematic HTML tags
    if (cleaned.includes('<br>') || cleaned.includes('<BR>') || 
        cleaned.includes('<div>') || cleaned.includes('<span>')) {
      console.log('MermaidValidator: Contains problematic HTML tags');
      return false;
    }
    
    // Basic validation - should start with a mermaid diagram type
    const mermaidTypes = [
      'graph', 'flowchart', 'sequenceDiagram', 'sequencediagram',
      'classDiagram', 'classdiagram', 'erDiagram', 'erdiagram',
      'journey', 'gantt', 'pie', 'gitgraph', 'mindmap', 'timeline'
    ];
    
    const startsWithValidType = mermaidTypes.some(type => 
      cleaned.toLowerCase().startsWith(type.toLowerCase())
    );
    
    console.log('MermaidValidator: Starts with valid type:', startsWithValidType);
    
    // Check for unmatched brackets
    const openSquare = (cleaned.match(/\[/g) || []).length;
    const closeSquare = (cleaned.match(/\]/g) || []).length;
    const openParen = (cleaned.match(/\(/g) || []).length;
    const closeParen = (cleaned.match(/\)/g) || []).length;
    const openBrace = (cleaned.match(/\{/g) || []).length;
    const closeBrace = (cleaned.match(/\}/g) || []).length;

    const balancedBrackets = (openSquare === closeSquare) && 
                           (openParen === closeParen) && 
                           (openBrace === closeBrace);
    
    console.log('MermaidValidator: Balanced brackets:', balancedBrackets);
    
    // Additional check: should contain typical mermaid syntax
    const hasValidSyntax = cleaned.includes('-->') || 
                          cleaned.includes('->') || 
                          cleaned.includes('---') ||
                          cleaned.includes('::') ||
                          cleaned.includes('subgraph') ||
                          cleaned.includes('participant') ||
                          cleaned.includes('activate') ||
                          cleaned.includes('note') ||
                          cleaned.includes('[') ||
                          cleaned.includes('(') ||
                          cleaned.includes('{');
    
    console.log('MermaidValidator: Has valid syntax patterns:', hasValidSyntax);
    
    const isValid = startsWithValidType && cleaned.length > 20 && balancedBrackets;
    console.log('MermaidValidator: Final validation result:', isValid);
    
    return isValid;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Add user message to conversation
      const userMessage: ConversationMessage = {
        type: 'user',
        content: query,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, userMessage]);

      // Use ProcessService with automatic Mermaid improvement
      console.log('ProcessesAndProcedures: Starting search with Mermaid improvement');
      const data = await ProcessService.searchProcessesWithImprovement({
        query,
        conversationHistory: conversationHistory.slice(-5) // Last 5 messages for context
      });

      setResults(data);

      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        type: 'assistant',
        content: data.textualExplanation,
        timestamp: new Date(),
      };
      setConversationHistory(prev => [...prev, assistantMessage]);

      setQuery('');
    } catch (err) {
      console.error('ProcessSearch Error:', err);
      
      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          setError('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
        } else if (err.message.includes('404') || err.message.includes('Not Found')) {
          setError('API-Endpunkt nicht gefunden. Möglicherweise ist der Server nicht verfügbar.');
        } else {
          setError(`Fehler bei der Prozesssuche: ${err.message}`);
        }
      } else {
        setError('Ein unbekannter Fehler ist aufgetreten');
      }
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
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end', mb: 2 }}>
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
        
        {/* Debug/Test Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={testApiConnection}
            disabled={loading}
          >
            API Test
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              const token = localStorage.getItem('token') || localStorage.getItem('authToken');
              console.log('Current token:', token);
              alert(token ? 'Token gefunden (siehe Console)' : 'Kein Token gefunden');
            }}
          >
            Token Check
          </Button>
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
                {message.type === 'user' ? (
                  <Typography variant="body2">
                    {message.content}
                  </Typography>
                ) : (
                  <Box sx={{ 
                    '& p': { mb: 1, fontSize: '0.875rem' },
                    '& ul, & ol': { pl: 2, mb: 1 },
                    '& li': { mb: 0.5, fontSize: '0.875rem' },
                    '& h1, & h2, & h3, & h4, & h5, & h6': { 
                      fontSize: '0.875rem', 
                      fontWeight: 'bold', 
                      mb: 1 
                    }
                  }}>
                    <ReactMarkdown>
                      {message.content}
                    </ReactMarkdown>
                  </Box>
                )}
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
                          {cleanTitle(diagram.title)}
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
                      {/* Cleaned content description */}
                      {cleanContent(diagram.content, diagram.title) !== 'Keine zusätzlichen Informationen verfügbar.' && (
                        <Box sx={{ 
                          mb: 2,
                          '& p': { mb: 1, fontSize: '0.875rem', color: 'text.secondary' },
                          '& ul, & ol': { pl: 2, mb: 1 },
                          '& li': { mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' },
                          '& h1, & h2, & h3, & h4, & h5, & h6': { 
                            fontSize: '0.875rem', 
                            fontWeight: 'bold', 
                            mb: 1,
                            color: 'text.secondary'
                          },
                          '& strong': { fontWeight: 'bold' },
                          '& em': { fontStyle: 'italic' }
                        }}>
                          <ReactMarkdown>
                            {cleanContent(diagram.content, diagram.title)}
                          </ReactMarkdown>
                        </Box>
                      )}
                      
                      {/* Debug Mermaid Code - only show if needed */}
                      {process.env.NODE_ENV === 'development' && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary">
                            Debug - Mermaid Code ({diagram.mermaidCode?.length || 0} chars): 
                            Valid = {isValidMermaidCode(diagram.mermaidCode) ? 'Yes' : 'No'}
                            {diagram.mermaidCode?.includes('Improved by LLM') && ' | LLM Enhanced'}
                          </Typography>
                          {diagram.mermaidCode && (
                            <Typography variant="caption" component="pre" sx={{ 
                              fontSize: '0.7rem', 
                              display: 'block', 
                              maxHeight: 100, 
                              overflow: 'auto', 
                              bgcolor: 'grey.100', 
                              p: 1, 
                              mt: 1,
                              border: '1px solid',
                              borderColor: 'grey.300',
                              borderRadius: 1
                            }}>
                              {diagram.mermaidCode.substring(0, 300)}...
                            </Typography>
                          )}
                        </Box>
                      )}

                      {/* Mermaid Diagram */}
                      {diagram.mermaidCode && diagram.mermaidCode.trim() ? (
                        isValidMermaidCode(diagram.mermaidCode) ? (
                          <Box sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, p: 1, bgcolor: 'grey.50' }}>
                            <Typography variant="caption" color="primary" sx={{ mb: 1, display: 'block' }}>
                              Mermaid-Diagramm:
                            </Typography>
                            <MermaidRenderer
                              code={diagram.mermaidCode}
                              title={cleanTitle(diagram.title)}
                              id={`diagram-${diagram.id}`}
                              height={400}
                              onError={(error) => {
                                console.error(`Mermaid error for ${diagram.title}:`, error);
                                console.log('Full mermaid code:', diagram.mermaidCode);
                              }}
                            />
                          </Box>
                        ) : (
                          <Alert severity="warning" sx={{ mt: 2 }}>
                            <strong>Mermaid-Code Format-Problem</strong>
                            <br />
                            Der Diagramm-Code entspricht nicht dem erwarteten Mermaid-Format.
                            <br />
                            <Typography variant="caption" component="pre" sx={{ mt: 1, fontSize: '0.7rem', bgcolor: 'rgba(0,0,0,0.1)', p: 1, borderRadius: 1 }}>
                              Code Anfang: {diagram.mermaidCode.substring(0, 100)}...
                            </Typography>
                          </Alert>
                        )
                      ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          <strong>Kein Mermaid-Code verfügbar</strong>
                          <br />
                          Für dieses Diagramm ist leider kein Mermaid-Code in der Datenbank hinterlegt.
                        </Alert>
                      )}
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
                    <Box sx={{ 
                      '& p': { mb: 1 },
                      '& ul, & ol': { pl: 2, mb: 1 },
                      '& li': { mb: 0.5 },
                      '& h1, & h2, & h3, & h4, & h5, & h6': { 
                        fontSize: 'inherit', 
                        fontWeight: 'bold', 
                        mb: 1 
                      }
                    }}>
                      <ReactMarkdown>
                        {results.textualExplanation}
                      </ReactMarkdown>
                    </Box>
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
