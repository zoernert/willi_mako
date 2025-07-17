import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Stack,
  Alert,
  Divider,
  IconButton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Help as HelpIcon,
  Info as InfoIcon,
  Check as CheckIcon,
  Lightbulb as LightbulbIcon,
  ArrowForward as ArrowForwardIcon,
  SkipNext as SkipNextIcon,
} from '@mui/icons-material';

interface ClarificationQuestion {
  id: string;
  question: string;
  category: 'scope' | 'context' | 'detail_level' | 'stakeholder' | 'energy_type';
  options?: string[];
  priority: number;
}

interface ClarificationResult {
  needsClarification: boolean;
  ambiguityScore: number;
  detectedTopics: string[];
  suggestedQuestions: ClarificationQuestion[];
  reasoning: string;
  sessionId?: string;
}

interface ClarificationUIProps {
  clarificationResult: ClarificationResult;
  onSubmit: (responses: { questionId: string; answer: string }[]) => void;
  onSkip: () => void;
  loading?: boolean;
}

const categoryLabels: Record<string, string> = {
  energy_type: 'Energieträger',
  stakeholder: 'Perspektive',
  context: 'Anwendungsbereich',
  detail_level: 'Detailgrad',
  scope: 'Themenfokus',
};

const categoryIcons: Record<string, React.ReactElement> = {
  energy_type: <LightbulbIcon />,
  stakeholder: <HelpIcon />,
  context: <InfoIcon />,
  detail_level: <CheckIcon />,
  scope: <ArrowForwardIcon />,
};

const ClarificationUI: React.FC<ClarificationUIProps> = ({
  clarificationResult,
  onSubmit,
  onSkip,
  loading = false,
}) => {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  const { suggestedQuestions, reasoning, ambiguityScore, detectedTopics } = clarificationResult;
  const currentQuestion = suggestedQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === suggestedQuestions.length - 1;
  
  const handleAnswerChange = (questionId: string, answer: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < suggestedQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  
  const handleSubmit = () => {
    const responseArray = Object.entries(responses).map(([questionId, answer]) => ({
      questionId,
      answer,
    }));
    
    onSubmit(responseArray);
  };
  
  const canProceed = responses[currentQuestion?.id];
  const answeredCount = Object.keys(responses).length;
  const progressPercentage = (answeredCount / suggestedQuestions.length) * 100;
  
  if (!currentQuestion) {
    return null;
  }
  
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        mb: 2,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        border: '1px solid #e3f2fd',
        borderRadius: 2,
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Chip
            icon={<LightbulbIcon />}
            label="Flip Mode"
            color="primary"
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
            Präzisierung gewünscht
          </Typography>
        </Stack>
        
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Ich möchte Ihnen die bestmögliche Antwort geben! Mit ein paar zusätzlichen Informationen 
            kann ich Ihnen eine viel zielgerichtetere Antwort liefern.
          </Typography>
        </Alert>
        
        {/* Progress */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Frage {currentQuestionIndex + 1} von {suggestedQuestions.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {Math.round(progressPercentage)}% abgeschlossen
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: '#e0e0e0',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundColor: '#1976d2',
              },
            }}
          />
        </Box>
        
        {/* Detected Topics */}
        {detectedTopics.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Erkannte Themen:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {detectedTopics.map((topic, index) => (
                <Chip
                  key={index}
                  label={topic}
                  size="small"
                  variant="outlined"
                  color="secondary"
                />
              ))}
            </Stack>
          </Box>
        )}
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Current Question */}
      <Box sx={{ mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2 }}>
          <Box sx={{ color: 'primary.main', mt: 0.5 }}>
            {categoryIcons[currentQuestion.category]}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
              {categoryLabels[currentQuestion.category]}
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
              {currentQuestion.question}
            </Typography>
            
            {currentQuestion.options && (
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <RadioGroup
                  value={responses[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  sx={{ gap: 1 }}
                >
                  {currentQuestion.options.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      value={option}
                      control={<Radio />}
                      label={option}
                      sx={{
                        mx: 0,
                        p: 1,
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'rgba(25, 118, 210, 0.04)',
                        },
                        '& .MuiFormControlLabel-label': {
                          fontSize: '0.95rem',
                        },
                      }}
                    />
                  ))}
                </RadioGroup>
              </FormControl>
            )}
          </Box>
        </Stack>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Navigation */}
      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
        <Box>
          <Button
            variant="text"
            color="secondary"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
            size="small"
          >
            Zurück
          </Button>
        </Box>
        
        <Box>
          <Tooltip title="Ohne Präzisierung fortfahren">
            <Button
              variant="outlined"
              color="secondary"
              onClick={onSkip}
              size="small"
              startIcon={<SkipNextIcon />}
              sx={{ mr: 1 }}
            >
              Überspringen
            </Button>
          </Tooltip>
          
          {!isLastQuestion ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!canProceed}
              size="small"
              endIcon={<ArrowForwardIcon />}
            >
              Weiter
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={!canProceed || loading}
              size="small"
              endIcon={loading ? null : <CheckIcon />}
              sx={{ minWidth: 120 }}
            >
              {loading ? 'Verarbeite...' : 'Antwort generieren'}
            </Button>
          )}
        </Box>
      </Stack>
      
      {/* Reasoning */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Grund für Präzisierung:</strong> {reasoning}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          (Ambiguity Score: {Math.round(ambiguityScore * 100)}%)
        </Typography>
      </Box>
    </Paper>
  );
};

export default ClarificationUI;
