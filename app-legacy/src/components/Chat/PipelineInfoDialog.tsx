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
  input: string;
  output: string;
  confidence?: number;
  iteration: number;
  timestamp: Date;
  qdrantQueries?: string[];
  qdrantResults?: number;
  result?: any; // Contains the actual step results with various structures
}

interface PipelineInfo {
  contextSources: number;
  userContextUsed: boolean;
  contextReason: string;
  reasoningSteps?: ReasoningStep[];
  finalQuality?: number;
  iterationsUsed?: number;
  qdrantQueries?: number;
  qdrantResults?: number;
  semanticClusters?: number;
  pipelineDecisions?: any;
  qaAnalysis?: any;
  contextAnalysis?: any;
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
        return <PsychologyIcon />;
      case 'context_analysis':
        return <SearchIcon />;
      case 'preliminary_answer':
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
      'final_answer_generation': 'Finale Antwort'
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
    // Debug logging for confidence
    console.log('Step confidence values:', {
      step: step.step,
      stepConfidence: step.confidence,
      resultConfidence: step.result?.confidence,
      fullStep: step
    });
    
    // Try to get confidence from various sources
    if (step.confidence !== undefined && !isNaN(step.confidence)) {
      return step.confidence;
    }
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

  const extractQAAnalysis = () => {
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
                          {pipelineInfo.pipelineDecisions?.pipelineType || 'Standard'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Iterationen</TableCell>
                        <TableCell>
                          {pipelineInfo.iterationsUsed || 1} / {pipelineInfo.pipelineDecisions?.maxIterations || 10}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Chat-Fokus</TableCell>
                        <TableCell>
                          {pipelineInfo.pipelineDecisions?.chatFocus || 'Allgemein'}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Kontextquellen</TableCell>
                        <TableCell>{pipelineInfo.contextSources}</TableCell>
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
                        <TableCell>{pipelineInfo.qdrantQueries || 0}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gefundene Quellen</TableCell>
                        <TableCell>{pipelineInfo.qdrantResults || 0}</TableCell>
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

          {/* Frageanalyse */}
          {extractQAAnalysis() && (
            <Accordion 
              expanded={expandedAccordion === 'qa'} 
              onChange={handleAccordionChange('qa')}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">Frageanalyse</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Hauptintention
                    </Typography>
                    <Typography variant="body2" paragraph>
                      {extractQAAnalysis()?.mainIntent || 'N/A'}
                    </Typography>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Komplexitätslevel
                    </Typography>
                    <Chip 
                      label={extractQAAnalysis()?.complexityLevel || 'N/A'} 
                      color={
                        extractQAAnalysis()?.complexityLevel === 'hard' ? 'error' :
                        extractQAAnalysis()?.complexityLevel === 'medium' ? 'warning' : 'success'
                      }
                      size="small"
                    />
                    
                    <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                      Marktkommunikations-Relevanz
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(extractQAAnalysis()?.marketCommunicationRelevance || 0) * 100}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Semantische Konzepte
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                      {extractQAAnalysis()?.semanticConcepts?.map((concept: string, index: number) => (
                        <Chip key={index} label={concept} size="small" variant="outlined" />
                      )) || <Typography variant="caption" color="text.secondary">Keine verfügbar</Typography>}
                    </Box>
                    
                    <Typography variant="subtitle2" gutterBottom>
                      Domain-Keywords
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {extractQAAnalysis()?.domainKeywords?.map((keyword: string, index: number) => (
                        <Chip key={index} label={keyword} size="small" color="primary" variant="outlined" />
                      )) || <Typography variant="caption" color="text.secondary">Keine verfügbar</Typography>}
                    </Box>
                  </Box>
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
                        label={`Iteration ${step.iteration}`} 
                        size="small" 
                        variant="outlined" 
                      />
                      <Chip
                        label={`Vertrauen: ${formatConfidence(getConfidenceValue(step))}`}
                        size="small"
                        color={getConfidenceValue(step) >= 0.7 ? 'success' : getConfidenceValue(step) >= 0.5 ? 'warning' : 'error'}
                      />
                      {getStepQueries(step).length > 0 && (
                        <Chip
                          label={`${getStepQueries(step).length} QDrant-Abfragen`}
                          size="small"
                          color="info"
                        />
                      )}
                    </Box>
                    
                    {getStepQueries(step).length > 0 && (
                      <Box sx={{ ml: 4, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">
                          QDrant-Abfragen: {getStepQueries(step).join(', ')}
                        </Typography>
                      </Box>
                    )}
                    
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                      {new Date(step.timestamp).toLocaleTimeString('de-DE')}
                    </Typography>
                    
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
          <Button onClick={() => setOpen(false)}>Schließen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PipelineInfoDialog;
