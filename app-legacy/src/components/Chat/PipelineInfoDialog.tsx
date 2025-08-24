import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  LinearProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
} from '@mui/material';
import {
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  Search as SearchIcon,
  Assessment as AssessmentIcon,
  CheckCircle as CheckCircleIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

interface ReasoningStep {
  step: string;
  description?: string;
  duration?: number;
  timestamp?: number;
  qdrantQueries?: string[];
  qdrantResults?: number;
  result?: any; // Contains the actual step results with various structures
}

interface QAAnalysis {
  mainIntent?: string;
  complexityLevel?: 'easy' | 'medium' | 'hard';
  marketCommunicationRelevance?: number;
  semanticConcepts?: string[];
  domainKeywords?: string[];
  confidence?: number;
}

interface PipelineInfo {
  contextSources?: number;
  userContextUsed?: boolean;
  contextReason?: string;
  reasoningSteps?: ReasoningStep[];
  finalQuality?: number;
  iterationsUsed?: number;
  qdrantQueries?: number;
  qdrantResults?: number;
  semanticClusters?: number;
  pipelineDecisions?: any;
  qaAnalysis?: QAAnalysis;
  contextAnalysis?: any;
  type?: string;
  sources?: Array<{
    score: number;
    content_type: string;
    source_document: string;
    document_name?: string;
    chunk_type?: string;
  }>;
  sourceCount?: number;
}

interface PipelineInfoDialogProps {
  pipelineInfo: PipelineInfo;
}

const PipelineInfoDialog: React.FC<PipelineInfoDialogProps> = ({ pipelineInfo }) => {
  const [open, setOpen] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | false>('overview');

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedAccordion(isExpanded ? panel : false);
  };

  const getStepIcon = (stepName: string) => {
    switch (stepName) {
      case 'question_analysis':
      case 'enhanced_search':
        return <SearchIcon />;
      case 'context_analysis':
        return <SearchIcon />;
      case 'preliminary_answer':
      case 'direct_response':
        return <AssessmentIcon />;
      case 'answer_validation':
        return <CheckCircleIcon />;
      case 'enhanced_context_retrieval':
        return <SearchIcon color="secondary" />;
      case 'final_answer_generation':
        return <CheckCircleIcon color="success" />;
      default:
        return <SettingsIcon />;
    }
  };

  const getStepTitle = (stepName: string) => {
    const titles: Record<string, string> = {
      'question_analysis': 'Frageanalyse',
      'context_analysis': 'Kontextsuche',
      'preliminary_answer': 'Vorläufige Antwort',
      'answer_validation': 'Antwortvalidierung',
      'enhanced_context_retrieval': 'Erweiterte Kontextsuche',
      'final_answer_generation': 'Finale Antwort',
      'enhanced_search': 'Erweiterte Suche',
      'direct_response': 'Direkte Antwort'
    };
    return titles[stepName] || stepName;
  };

  const formatConfidence = (confidence?: number) => {
    if (confidence === undefined || confidence === null || isNaN(confidence)) {
      return 'N/A';
    }
    return `${Math.round(confidence * 100)}%`;
  };

  const getConfidenceValue = (step: ReasoningStep): number => {
    // Try to get confidence from result
    if (step.result?.confidence !== undefined && !isNaN(step.result.confidence)) {
      return step.result.confidence;
    }
    return 0.5; // Default fallback
  };

  const getStepQueries = (step: ReasoningStep): string[] => {
    const queries: string[] = [];
    
    console.log('Extracting queries from step:', step.step, {
      qdrantQueries: step.qdrantQueries,
      resultSearchQueries: step.result?.searchQueries,
      resultQdrantQueries: step.result?.qdrantQueries,
      fullResult: step.result
    });
    
    // Check direct qdrantQueries
    if (step.qdrantQueries && Array.isArray(step.qdrantQueries)) {
      queries.push(...step.qdrantQueries);
    }
    
    // Check result.searchQueries
    if (step.result?.searchQueries && Array.isArray(step.result.searchQueries)) {
      queries.push(...step.result.searchQueries);
    }
    
    // Check result.qdrantQueries
    if (step.result?.qdrantQueries && Array.isArray(step.result.qdrantQueries)) {
      queries.push(...step.result.qdrantQueries);
    }
    
    // Remove duplicates
    const uniqueQueries = Array.from(new Set(queries));
    console.log('Final queries for step:', step.step, uniqueQueries);
    return uniqueQueries;
  };

  const extractQAAnalysis = (): QAAnalysis | null => {
    // Debug logging
    console.log('Pipeline Info - qaAnalysis:', pipelineInfo.qaAnalysis);
    console.log('Pipeline Info - reasoningSteps:', pipelineInfo.reasoningSteps);
    
    // First check if qaAnalysis is directly available
    if (pipelineInfo.qaAnalysis && Object.keys(pipelineInfo.qaAnalysis).length > 0) {
      console.log('Using direct qaAnalysis:', pipelineInfo.qaAnalysis);
      return pipelineInfo.qaAnalysis;
    }
    
    // Check reasoning steps for qaAnalysis
    if (pipelineInfo.reasoningSteps) {
      for (const step of pipelineInfo.reasoningSteps) {
        if (step.result?.qaAnalysis && Object.keys(step.result.qaAnalysis).length > 0) {
          console.log('Found qaAnalysis in step:', step.step, step.result.qaAnalysis);
          return step.result.qaAnalysis;
        }
      }
    }
    
    console.log('No qaAnalysis found');
    return null;
  };

  const getQualityColor = (quality: number): "success" | "warning" | "error" => {
    if (quality >= 0.8) return 'success';
    if (quality >= 0.6) return 'warning';
    return 'error';
  };

  return (
    <>
      <IconButton
        onClick={() => setOpen(true)}
        color="info"
        size="small"
        sx={{ ml: 1 }}
        title="Pipeline-Informationen anzeigen"
      >
        <InfoIcon />
      </IconButton>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="lg"
        fullWidth
        scroll="paper"
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon color="info" />
            <Typography variant="h6">Pipeline-Analyse</Typography>
            {pipelineInfo.finalQuality && (
              <Chip
                label={`Qualität: ${formatConfidence(pipelineInfo.finalQuality)}`}
                color={getQualityColor(pipelineInfo.finalQuality)}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {/* Pipeline Übersicht */}
          <Accordion 
            expanded={expandedAccordion === 'overview'} 
            onChange={handleAccordionChange('overview')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6">Pipeline-Übersicht</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Grundlegende Metriken
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Pipeline-Typ</TableCell>
                        <TableCell>
                          {pipelineInfo.type === 'cs30_additional' ? 'CS30 Additional' : 
                           pipelineInfo.pipelineDecisions?.reason === 'Direct response for speed' ? (
                             <Tooltip title="Schnelle Antwort mit nur einer Iteration. Möglicherweise nicht optimal.">
                               <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                 <Typography variant="body2">
                                   {pipelineInfo.pipelineDecisions?.reason || 'Standard'}
                                 </Typography>
                                 {pipelineInfo.iterationsUsed === 1 && (
                                   <Chip 
                                     label="Einfache Suche" 
                                     size="small" 
                                     color="warning" 
                                     variant="outlined"
                                   />
                                 )}
                               </Box>
                             </Tooltip>
                           ) : (
                             pipelineInfo.pipelineDecisions?.reason || 'Standard'
                           )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Iterationen</TableCell>
                        <TableCell>
                          <Tooltip 
                            title={
                              pipelineInfo.iterationsUsed === 1 && pipelineInfo.pipelineDecisions?.maxIterations === 1 
                                ? "Nur eine Iteration wurde verwendet. Mehr Iterationen könnten bessere Ergebnisse liefern."
                                : "Anzahl der durchgeführten Iterationen und maximale konfigurierte Iterationen"
                            }
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              {pipelineInfo.iterationsUsed || 1} / {pipelineInfo.pipelineDecisions?.maxIterations || 1}
                              {pipelineInfo.iterationsUsed === 1 && pipelineInfo.pipelineDecisions?.maxIterations === 1 && (
                                <Chip 
                                  label="Minimal" 
                                  size="small" 
                                  color="warning" 
                                  variant="outlined"
                                  sx={{ ml: 1 }}
                                />
                              )}
                            </Box>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Minimale Konfidenz</TableCell>
                        <TableCell>
                          {pipelineInfo.pipelineDecisions?.confidenceThreshold ? 
                            `${Math.round(pipelineInfo.pipelineDecisions.confidenceThreshold * 100)}%` : 'N/A'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Kontextquellen</TableCell>
                        <TableCell>{pipelineInfo.contextSources || pipelineInfo.sourceCount || 0}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    QDrant-Analyse
                  </Typography>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>QDrant-Abfragen</TableCell>
                        <TableCell>
                          {pipelineInfo.qdrantQueries || 0}
                          {pipelineInfo.qdrantQueries === 0 && (
                            <Chip 
                              label="Keine Abfragen" 
                              size="small" 
                              color="warning" 
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gefundene Quellen</TableCell>
                        <TableCell>
                          {pipelineInfo.qdrantResults || 0}
                          {pipelineInfo.qdrantResults === 0 && (
                            <Chip 
                              label="Keine Ergebnisse" 
                              size="small" 
                              color="error" 
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Semantische Cluster</TableCell>
                        <TableCell>{pipelineInfo.semanticClusters || 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Domain-Abdeckung</TableCell>
                        <TableCell>
                          {pipelineInfo.contextAnalysis?.qdrantRelevance?.domainCoverage 
                            ? `${Math.round(pipelineInfo.contextAnalysis.qdrantRelevance.domainCoverage * 100)}%`
                            : 'N/A'
                          }
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Box>
              </Box>

              {pipelineInfo.finalQuality && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Antwortqualität
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={pipelineInfo.finalQuality * 100}
                      color={getQualityColor(pipelineInfo.finalQuality)}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2">
                      {formatConfidence(pipelineInfo.finalQuality)}
                    </Typography>
                  </Box>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Frageanalyse - wird nur angezeigt, wenn Daten verfügbar sind */}
          <Accordion 
            expanded={expandedAccordion === 'qa'} 
            onChange={handleAccordionChange('qa')}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6">Frageanalyse</Typography>
                {!extractQAAnalysis() && (
                  <Chip 
                    label="Nicht verfügbar" 
                    size="small" 
                    color="default" 
                    variant="outlined"
                  />
                )}
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {!extractQAAnalysis() ? (
                <Box sx={{ p: 3, bgcolor: '#f9f9f9', borderRadius: 1, textAlign: 'center' }}>
                  <PsychologyIcon color="disabled" sx={{ fontSize: 40, mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    Für diese Anfrage sind keine Frageanalyse-Daten verfügbar.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Die Frageanalyse ist ein Feature, das hauptsächlich im Kontext der FAQ-Erstellung und -Verwaltung 
                    durch Administratoren verwendet wird. Für normale Chat-Antworten sind diese detaillierten 
                    Analysedaten üblicherweise nicht verfügbar.
                  </Typography>
                </Box>
              ) : (
                <>
                  {(() => {
                    // Sichere Typenzuweisung für TypeScript
                    const qaAnalysis = extractQAAnalysis() as QAAnalysis;
                    
                    return (
                      <>
                        <Box sx={{ p: 2, bgcolor: '#f0f7ff', borderRadius: 1, mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Die Frageanalyse-Funktion ist ein Feature, das hauptsächlich im Kontext der FAQ-Erstellung und -Verwaltung 
                            verwendet wird. Für normale Chat-Antworten sind diese detaillierten Analysedaten üblicherweise 
                            nicht verfügbar.
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Hauptintention
                            </Typography>
                            <Typography variant="body2" paragraph>
                              {qaAnalysis.mainIntent || 'Keine Information verfügbar'}
                            </Typography>
                            
                            <Typography variant="subtitle2" gutterBottom>
                              Komplexitätslevel
                            </Typography>
                            {qaAnalysis.complexityLevel ? (
                              <Chip 
                                label={qaAnalysis.complexityLevel} 
                                color={
                                  qaAnalysis.complexityLevel === 'hard' ? 'error' :
                                  qaAnalysis.complexityLevel === 'medium' ? 'warning' : 'success'
                                }
                                size="small"
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">Keine Information verfügbar</Typography>
                            )}
                            
                            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                              Marktkommunikations-Relevanz
                            </Typography>
                            {typeof qaAnalysis.marketCommunicationRelevance === 'number' ? (
                              <LinearProgress
                                variant="determinate"
                                value={(qaAnalysis.marketCommunicationRelevance || 0) * 100}
                                sx={{ mt: 1 }}
                              />
                            ) : (
                              <Typography variant="caption" color="text.secondary">Keine Information verfügbar</Typography>
                            )}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Semantische Konzepte
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                              {qaAnalysis.semanticConcepts && qaAnalysis.semanticConcepts.length > 0 ? 
                                qaAnalysis.semanticConcepts.map((concept: string, index: number) => (
                                  <Chip key={index} label={concept} size="small" variant="outlined" />
                                )) : 
                                <Typography variant="caption" color="text.secondary">Keine verfügbar</Typography>
                              }
                            </Box>
                            
                            <Typography variant="subtitle2" gutterBottom>
                              Domain-Keywords
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {qaAnalysis.domainKeywords && qaAnalysis.domainKeywords.length > 0 ? 
                                qaAnalysis.domainKeywords.map((keyword: string, index: number) => (
                                  <Chip key={index} label={keyword} size="small" color="primary" variant="outlined" />
                                )) : 
                                <Typography variant="caption" color="text.secondary">Keine verfügbar</Typography>
                              }
                            </Box>
                          </Box>
                        </Box>
                      </>
                    );
                  })()}
                </>
              )}
            </AccordionDetails>
          </Accordion>

          {/* Sources Section - For CS30 Additional responses */}
          {pipelineInfo.sources && pipelineInfo.sources.length > 0 && (
            <Accordion 
              expanded={expandedAccordion === 'sources'} 
              onChange={handleAccordionChange('sources')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Quellen & Dokumententypen ({pipelineInfo.sourceCount || pipelineInfo.sources.length})</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Diese Antwort basiert auf folgenden Quellen und Dokumententypen:
                  </Typography>
                  
                  <Table size="small">
                    <TableBody>
                      {pipelineInfo.sources.map((source, index) => (
                        <TableRow key={index}>
                          <TableCell width="60%">
                            {source.source_document}
                            {source.document_name && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Dokument: {source.document_name}
                              </Typography>
                            )}
                            {source.chunk_type && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                Typ: {source.chunk_type}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={`Relevanz: ${Math.round(source.score * 100)}%`}
                              color={source.score > 0.65 ? 'success' : source.score > 0.5 ? 'warning' : 'default'}
                              size="small"
                            />
                            {source.content_type && source.content_type !== 'N/A' && (
                              <Chip
                                label={source.content_type}
                                size="small"
                                variant="outlined"
                                sx={{ mt: 1 }}
                              />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* Reasoning-Schritte */}
          {pipelineInfo.reasoningSteps && pipelineInfo.reasoningSteps.length > 0 && (
            <Accordion 
              expanded={expandedAccordion === 'steps'} 
              onChange={handleAccordionChange('steps')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">
                  Reasoning-Schritte ({pipelineInfo.reasoningSteps.length})
                  {pipelineInfo.reasoningSteps.length === 1 && 
                   pipelineInfo.pipelineDecisions?.reason === 'Direct response for speed' && (
                    <Chip 
                      label="Einfacher Prozess" 
                      size="small" 
                      color="warning" 
                      variant="outlined"
                      sx={{ ml: 1 }}
                    />
                  )}
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {pipelineInfo.reasoningSteps.map((step, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      {getStepIcon(step.step)}
                      <Typography variant="subtitle1" fontWeight="bold">
                        {getStepTitle(step.step)}
                      </Typography>
                      <Chip 
                        label={step.step} 
                        size="small" 
                        variant="outlined" 
                      />
                      <Chip
                        label={`Vertrauen: ${formatConfidence(getConfidenceValue(step))}`}
                        size="small"
                        color={getConfidenceValue(step) >= 0.7 ? 'success' : getConfidenceValue(step) >= 0.5 ? 'warning' : 'error'}
                      />
                      {step.qdrantQueries && step.qdrantQueries.length > 0 && (
                        <Chip
                          label={`${step.qdrantQueries.length} QDrant-Abfragen`}
                          size="small"
                          color="info"
                        />
                      )}
                    </Box>
                    
                    {step.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
                        {step.description}
                      </Typography>
                    )}
                    
                    {step.qdrantQueries && step.qdrantQueries.length > 0 && (
                      <Box sx={{ ml: 4, mb: 1 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Suchabfragen:
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                          {step.qdrantQueries.map((query, qIndex) => (
                            <Chip
                              key={qIndex}
                              label={query}
                              size="small"
                              variant="outlined"
                              color="info"
                            />
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    <Box sx={{ ml: 4, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
                      {step.duration !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          Dauer: {(step.duration / 1000).toFixed(2)}s
                        </Typography>
                      )}
                      {step.qdrantResults !== undefined && (
                        <Typography variant="caption" color="text.secondary">
                          Gefundene Ergebnisse: {step.qdrantResults}
                          {step.qdrantResults === 0 && (
                            <Chip 
                              label="Keine Ergebnisse" 
                              size="small" 
                              color="error" 
                              variant="outlined"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      )}
                      {step.timestamp ? (
                        <Typography variant="caption" color="text.secondary">
                          Zeit: {new Date(step.timestamp).toLocaleTimeString('de-DE')}
                        </Typography>
                      ) : null}
                    </Box>
                    
                    {index < (pipelineInfo.reasoningSteps?.length || 0) - 1 && (
                      <Divider sx={{ mt: 2 }} />
                    )}
                  </Box>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {/* Kontextanalyse */}
          {pipelineInfo.contextAnalysis && (
            <Accordion 
              expanded={expandedAccordion === 'context'} 
              onChange={handleAccordionChange('context')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Kontextanalyse</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Kontextqualität
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={pipelineInfo.contextAnalysis.contextQuality * 100}
                      color={getQualityColor(pipelineInfo.contextAnalysis.contextQuality)}
                      sx={{ mb: 2 }}
                    />
                    
                    {pipelineInfo.contextAnalysis.topicsIdentified && pipelineInfo.contextAnalysis.topicsIdentified.length > 0 && (
                      <>
                        <Typography variant="subtitle2" gutterBottom>
                          Identifizierte Themen
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                          {pipelineInfo.contextAnalysis.topicsIdentified.map((topic: string, index: number) => (
                            <Chip key={index} label={topic} size="small" color="primary" variant="outlined" />
                          ))}
                        </Box>
                      </>
                    )}
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Primäre Konzepte
                    </Typography>
                    {pipelineInfo.contextAnalysis.qdrantRelevance?.primaryConcepts?.map((concept: any, index: number) => (
                      <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2">{concept.concept}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {concept.sources} Quellen
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Semantische Cluster
                    </Typography>
                    {pipelineInfo.contextAnalysis.semanticClusters?.map((cluster: any, index: number) => (
                      <Box key={index} sx={{ mb: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight="medium">
                            {cluster.theme}
                          </Typography>
                          <Chip 
                            label={`${cluster.sources.length} Quellen`} 
                            size="small" 
                            variant="outlined" 
                          />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={cluster.relevance * 100}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    ))}
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
          )}

          {/* QDrant-Erkenntnisse */}
          {pipelineInfo.pipelineDecisions?.qdrantInsights && (
            <Accordion 
              expanded={expandedAccordion === 'qdrant'} 
              onChange={handleAccordionChange('qdrant')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">QDrant-Erkenntnisse</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                  {pipelineInfo.pipelineDecisions.qdrantInsights}
                </Typography>
              </AccordionDetails>
            </Accordion>
          )}
        </DialogContent>

        <DialogActions>
          {pipelineInfo.reasoningSteps && pipelineInfo.reasoningSteps.length === 1 && 
           pipelineInfo.pipelineDecisions?.reason === 'Direct response for speed' && (
            <Tooltip title="Diese Antwort wurde mit minimalem Aufwand generiert. Eine gründlichere Suche könnte bessere Ergebnisse liefern.">
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={() => {
                  // TODO: Hier die Logik für die gründlichere Suche implementieren
                  alert("Diese Funktionalität wird in einem kommenden Update implementiert. Eine gründlichere Suche würde mehr Iterationen nutzen und möglicherweise bessere Ergebnisse liefern, indem sie semantische Konzepte in der Anfrage eingehender analysiert.");
                  setOpen(false);
                }}
                startIcon={<SearchIcon />}
                sx={{ mr: 'auto' }}
              >
                Gründlichere Suche durchführen
              </Button>
            </Tooltip>
          )}
          <Button onClick={() => setOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PipelineInfoDialog;
