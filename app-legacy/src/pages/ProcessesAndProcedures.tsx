import React, { useState, useEffect, useRef, createRef } from 'react';
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
import MermaidRenderer, { MermaidRendererHandles } from '../components/Processes/MermaidRenderer';
import ProcessService, { ProcessSearchResult, ConversationMessage } from '../services/processService';

interface MermaidDiagram {
  id: string;
  title: string;
  content: string;
  mermaidCode: string;
  score: number;
  structuredData?: {
    process_steps: Array<{ id: string; label: string; shape?: string }>;
    connections: Array<{ from: string; to: string; label?: string }>;
  };
}

// Use interfaces from ProcessService instead of redefining
// Remove these local interfaces as they're imported from ProcessService

const ProcessesAndProcedures: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProcessSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const mermaidRefs = useRef<React.RefObject<MermaidRendererHandles>[]>([]);

  // Debug: Check if token is available
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    console.log('ProcessesAndProcedures - Token check:', token ? 'Token found' : 'No token found');
    if (!token) {
      setError('Kein Authentifizierungs-Token gefunden. Bitte melden Sie sich erneut an.');
    }
  }, []);

  // When results change, create refs for each diagram
  useEffect(() => {
    if (results?.diagrams) {
      mermaidRefs.current = results.diagrams.map(
        (_, i) => mermaidRefs.current[i] ?? createRef<MermaidRendererHandles>()
      );
    }
  }, [results?.diagrams]);

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

  // Helper function to clean mermaid code on the frontend before rendering
  const cleanMermaidCodeForFrontend = (code: string): string => {
    if (!code) return '';
    // Replace <br> tags with newlines, as they are problematic for Mermaid rendering
    let cleanedCode = code.replace(/<br\s*\/?>/gi, '\n');
    
    // Fix common arrow syntax issues by removing spaces around arrows
    cleanedCode = cleanedCode.replace(/--\s+>/g, '-->');
    cleanedCode = cleanedCode.replace(/-\s+->/g, '->');
    
    // Fix for labeled arrows with spaces, e.g., '-- text -- >'
    cleanedCode = cleanedCode.replace(/--\s*([^->\n]+?)\s*--\s*>/g, '-- $1 -->');

    return cleanedCode;
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
    
    // Check for broken arrow syntax
    if (cleaned.includes('-- >') || cleaned.includes('- ->')) {
      console.log('MermaidValidator: Contains broken arrow syntax');
      return false;
    }
    
    // This check is now considered too strict, as the backend service
    // is responsible for cleaning and fixing arrow syntax. Removing it
    // prevents the frontend from rejecting valid, backend-corrected code.
    /*
    const incompleteLabeledArrows = cleaned.match(/--\s*[^->\n]+?\s*--(?!\s*>)/g);
    if (incompleteLabeledArrows) {
      console.log('MermaidValidator: Contains incomplete labeled arrows:', incompleteLabeledArrows);
      return false;
    }
    */

    // Check for duplicate node definitions (a common source of parse errors)
    const nodeDefinitions = cleaned.match(/^\s*([a-zA-Z0-9_]+)\s*(\[|\(|\{|>)/gm);
    if (nodeDefinitions) {
      const nodeIds = nodeDefinitions.map(def => def.trim().split(/[\(\[\{>]/)[0]);
      const uniqueNodeIds = new Set(nodeIds);
      if (nodeIds.length !== uniqueNodeIds.size) {
        const duplicates = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
        console.log('MermaidValidator: Contains duplicate node definitions:', duplicates);
        return false;
      }
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
    
    const isValid = startsWithValidType && 
                    cleaned.length > 15 && // Reduced min length slightly for very simple diagrams
                    balancedBrackets && 
                    hasValidSyntax; // Make syntax pattern check mandatory

    console.log('MermaidValidator: Final validation result:', isValid);
    
    return isValid;
  };

  // Frontend function to generate Mermaid code from structured data
  // This ensures 100% compatibility with frontend validation
  const generateMermaidCodeInFrontend = (processData: {
    process_steps: Array<{ id: string; label: string; shape?: string }>;
    connections: Array<{ from: string; to: string; label?: string }>;
  }): string => {
    if (!processData || !processData.process_steps || !processData.connections) {
      console.warn('Frontend: Invalid process data provided');
      return 'graph TD\n    error[Ungültige Prozessdaten]';
    }

    const { process_steps, connections } = processData;
    let mermaidCode = 'graph TD\n';

    // 1. Define all nodes with sanitized labels and proper bracket handling
    process_steps.forEach(step => {
      // Thoroughly clean labels to prevent bracket issues
      const label = step.label
        .replace(/["\[\]{}()]/g, '')  // Remove all bracket types and quotes
        .replace(/[|]/g, '')          // Remove pipes
        .replace(/\s+/g, ' ')         // Normalize whitespace
        .trim();
      
      // Ensure we have a valid label
      const safeLabel = label || 'Schritt';
      
      let nodeDefinition;
      switch (step.shape) {
        case 'diamond':
          nodeDefinition = `${step.id}{${safeLabel}}`;
          break;
        case 'round':
          nodeDefinition = `${step.id}(${safeLabel})`;
          break;
        default:
          nodeDefinition = `${step.id}[${safeLabel}]`;
          break;
      }
      mermaidCode += `    ${nodeDefinition}\n`;
    });

    mermaidCode += '\n';

    // 2. Define connections with ultra-clean syntax
    connections.forEach(conn => {
      if (conn.label && conn.label.trim()) {
        // Clean label thoroughly - no special characters at all
        const label = conn.label
          .replace(/["\[\]{}()|]/g, '')  // Remove all problematic characters
          .replace(/\s+/g, ' ')          // Normalize whitespace
          .trim();
        
        if (label) {
          // Use the cleanest possible syntax: A --text--> B
          mermaidCode += `    ${conn.from} --${label}--> ${conn.to}\n`;
        } else {
          mermaidCode += `    ${conn.from} --> ${conn.to}\n`;
        }
      } else {
        mermaidCode += `    ${conn.from} --> ${conn.to}\n`;
      }
    });

    const result = mermaidCode.trim();
    console.log('Frontend: Generated Mermaid code:', result.substring(0, 200) + '...');
    return result;
  };

  // Process diagrams received from backend to ensure clean Mermaid code
  const processSearchResults = (data: ProcessSearchResult): ProcessSearchResult => {
    const processedDiagrams = data.diagrams.map(diagram => {
      // If we have structured data, regenerate the Mermaid code in the frontend
      if ((diagram as any).structuredData) {
        console.log('Frontend: Using structured data to generate clean Mermaid code for:', diagram.title);
        const frontendGeneratedCode = generateMermaidCodeInFrontend((diagram as any).structuredData);
        return {
          ...diagram,
          mermaidCode: frontendGeneratedCode
        };
      }
      
      // Otherwise, clean any problematic syntax from backend-generated code
      if (diagram.mermaidCode.includes('-- ') && diagram.mermaidCode.includes(' -->')) {
        console.log('Frontend: Cleaning backend-generated Mermaid code for:', diagram.title);
        const cleanedCode = diagram.mermaidCode
          .replace(/--\s*\|([^|]+)\|\s*-->/g, '--$1-->')  // Remove pipes from labeled arrows
          .replace(/--\s*"([^"]+)"\s*-->/g, '--$1-->')    // Remove quotes from labeled arrows
          .replace(/--\s+/g, '--')                         // Remove extra spaces after --
          .replace(/\s+-->/g, '-->')                       // Remove extra spaces before -->
          .trim();
        
        return {
          ...diagram,
          mermaidCode: cleanedCode
        };
      }
      return diagram;
    });

    return {
      ...data,
      diagrams: processedDiagrams
    };
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

      // Process the results to ensure clean Mermaid code
      const processedResults = processSearchResults(data);
      setResults(processedResults);

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

  const exportDiagram = (diagramIndex: number) => {
    console.log(`Triggering export for diagram index: ${diagramIndex}`);
    mermaidRefs.current[diagramIndex]?.current?.export();
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
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Process Requirements (User Input History) */}
      {conversationHistory.length > 0 && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Prozess Anforderungen
          </Typography>
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {conversationHistory
              .filter(message => message.type === 'user') // Only show user requirements
              .map((message, index) => (
                <Box
                  key={index}
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 2,
                    bgcolor: 'primary.light',
                    color: 'primary.contrastText',
                  }}
                >
                  <Typography variant="caption" display="block" sx={{ mb: 1, opacity: 0.8 }}>
                    Anforderung • {message.timestamp.toLocaleTimeString()}
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
          {/* Mermaid Diagrams - Left Column */}
          {results.diagrams && results.diagrams.length > 0 && (
            <Box sx={{ flex: 1 }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Prozessdiagramme
                  <Chip label={`${results.diagrams.length} gefunden`} size="small" color="primary" />
                </Typography>
                
                {results.diagrams.map((diagram, index) => {
                  // Clean mermaid code once before validation and rendering
                  const cleanedCode = cleanMermaidCodeForFrontend(diagram.mermaidCode);

                  return (
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
                              exportDiagram(index);
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
                      
                      {/* Mermaid Diagram */}
                      {diagram.mermaidCode && diagram.mermaidCode.trim() ? (() => {
                        const isValid = isValidMermaidCode(cleanedCode);
                        
                        // ALWAYS render MermaidRenderer - let it handle errors internally
                        return (
                          <Box sx={{ border: '1px solid', borderColor: 'grey.300', borderRadius: 1, p: 1, bgcolor: 'grey.50' }}>
                            <Typography variant="caption" color="primary" sx={{ mb: 1, display: 'block' }}>
                              Mermaid-Diagramm:
                            </Typography>
                            <MermaidRenderer
                              ref={mermaidRefs.current[index]}
                              code={cleanedCode}
                              diagramId={`diagram-${diagram.id}`}
                              title={cleanTitle(diagram.title)}
                              onError={(error) => {
                                console.error(`Mermaid error for ${diagram.title}:`, error);
                                console.log('Full (cleaned) mermaid code:', cleanedCode);
                              }}
                            />
                            
                            {/* Show validation warning if needed, but don't prevent rendering */}
                            {!isValid && (
                              <Alert severity="warning" sx={{ mt: 1 }}>
                                <Typography variant="body2">
                                  <strong>Hinweis:</strong> Das Diagramm könnte Darstellungsprobleme haben.
                                </Typography>
                              </Alert>
                            )}
                          </Box>
                        );
                      })() : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                          <strong>Kein Mermaid-Code verfügbar</strong>
                          <br />
                          Für dieses Diagramm ist leider kein Mermaid-Code in der Datenbank hinterlegt.
                        </Alert>
                      )}
                    </AccordionDetails>
                  </Accordion>
                  );
                })}
              </Paper>
            </Box>
          )}

          {/* Process Analysis - Right Column */}
          <Box sx={{ minWidth: { lg: 400 } }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Prozessanalyse
                </Typography>
                
                {results.textualExplanation && (
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom color="primary">
                      KI-Analyse
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
                      Wichtige Erkenntnisse
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
