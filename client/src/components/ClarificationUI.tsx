import React, { useState, useEffect } from 'react';
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
import { userApi } from '../services/userApi';
import { FlipModePreferences } from '../types/user';

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
  onGenerate: (responses?: { questionId: string; answer: string }[]) => Promise<void>;
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
  onGenerate,
  loading = false,
}) => {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  useEffect(() => {
    const fetchPreferences = async () => {
        try {
            const prefs = await userApi.getFlipModePreferences();
            if (prefs) {
                setResponses(prefs as Record<string, string>);
            }
        } catch (error) {
            console.error("Failed to fetch flip mode preferences", error);
        }
    };
    fetchPreferences();
  }, []);

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
    onGenerate(responseArray);
  };

  const handleSkip = () => {
    onSkip();
    onGenerate(); // Generate with saved preferences
  }
  
  const canProceed = responses[currentQuestion?.id];
  const answeredCount = Object.keys(responses).filter(key => suggestedQuestions.some(q => q.id === key)).length;
  const progressPercentage = suggestedQuestions.length > 0 ? (answeredCount / suggestedQuestions.length) * 100 : 0;
  
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
            kann ich Ihnen eine viel zielgerichtetere Antwort liefern. Ihre Antworten werden für zukünftige Anfragen gespeichert.
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
                >
                  {currentQuestion.options.map((option) => (
                    <FormControlLabel
                      key={option}
                      value={option}
                      control={<Radio />}
                      label={option}
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
          <Tooltip title="Ohne Präzisierung fortfahren und gespeicherte Voreinstellungen nutzen">
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleSkip}
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
