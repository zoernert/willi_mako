import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Chip,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  AutoFixHigh as AIIcon,
  Quiz as QuizIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import { quizApi } from '../services/quizApi';
import { Quiz } from '../types/quiz';

interface IntelligentQuizCreatorProps {
  onQuizCreated?: (quiz: Quiz) => void;
}

const IntelligentQuizCreator: React.FC<IntelligentQuizCreatorProps> = ({ onQuizCreated }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    topic: '',
    difficulty: 'medium',
    questionCount: 5
  });
  const [loading, setLoading] = useState(false);
  const [createdQuiz, setCreatedQuiz] = useState<Quiz | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleCreateQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      handleNext(); // Move to "in progress" step

      const response = await quizApi.createIntelligentQuiz(
        formData.topic,
        formData.questionCount,
        formData.difficulty
      );
      
      setCreatedQuiz(response);
      
      if (onQuizCreated) {
        onQuizCreated(response);
      }
      
      handleNext(); // Move to "finished" step
      
    } catch (err: any) {
      console.error('Error creating intelligent quiz:', err);
      setError(err.response?.data?.message || 'Ein unbekannter Fehler ist aufgetreten.');
      setActiveStep(0); // Go back to the first step on error
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      topic: '',
      difficulty: 'medium',
      questionCount: 5
    });
    setCreatedQuiz(null);
    setError(null);
    setOpen(false);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<AIIcon />}
        onClick={() => setOpen(true)}
        sx={{ mb: 2 }}
      >
        Intelligentes Quiz erstellen
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon />
            Intelligentes Quiz erstellen
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            Das intelligente Quiz-System durchsucht automatisch relevante Dokumente
            und erstellt passende Fragen zu Ihrem Thema.
          </Alert>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Quiz-Details eingeben</StepLabel>
              <StepContent TransitionProps={{ unmountOnExit: true }}>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Quiz-Thema"
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    sx={{ mb: 2 }}
                    placeholder="z.B. APERAK, Marktkommunikation, Bilanzkreismanagement"
                  />
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <FormControl fullWidth>
                      <InputLabel>Schwierigkeit</InputLabel>
                      <Select
                        value={formData.difficulty}
                        onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      >
                        <MenuItem value="easy">Einfach</MenuItem>
                        <MenuItem value="medium">Mittel</MenuItem>
                        <MenuItem value="hard">Schwer</MenuItem>
                      </Select>
                    </FormControl>
                    <TextField
                      fullWidth
                      label="Anzahl Fragen"
                      type="number"
                      value={formData.questionCount}
                      onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) })}
                      inputProps={{ min: 1, max: 20 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleCreateQuiz}
                      disabled={!formData.topic || loading}
                      startIcon={<QuizIcon />}
                    >
                      {loading ? <CircularProgress size={24} /> : 'Quiz erstellen'}
                    </Button>
                  </Box>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Quiz wird erstellt</StepLabel>
              <StepContent TransitionProps={{ unmountOnExit: true }}>
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <CircularProgress size={48} />
                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Quiz wird erstellt...
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Bitte warten Sie, während das System relevante Fragen generiert.
                  </Typography>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Quiz erfolgreich erstellt</StepLabel>
              <StepContent TransitionProps={{ unmountOnExit: true }}>
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="h6">Quiz erfolgreich erstellt!</Typography>
                    <Typography variant="body2">Das Quiz ist initial inaktiv und kann in der Übersicht aktiviert werden.</Typography>
                  </Alert>
                  {createdQuiz && (
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                          <CheckIcon color="success" />
                          <Typography variant="h6">{createdQuiz.title}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {createdQuiz.description}
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                          <Chip
                            label={createdQuiz.difficulty_level}
                            color={getDifficultyColor(createdQuiz.difficulty_level)}
                            size="small"
                          />
                          <Chip
                            label={`${createdQuiz.questions?.length || createdQuiz.question_count} Fragen`}
                            color="primary"
                            size="small"
                          />
                          <Chip
                            label={`${createdQuiz.time_limit_minutes} Min`}
                            color="default"
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2">
                          Thema: {createdQuiz.topic_area}
                        </Typography>
                        {createdQuiz.questions && createdQuiz.questions.length > 0 && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2">Fragenvorschau:</Typography>
                            <List dense>
                              {createdQuiz.questions.slice(0, 3).map((q, i) => (
                                <ListItem key={i} sx={{ pl: 1 }}>
                                  <ListItemText primary={`${i + 1}. ${q.question_text}`} />
                                </ListItem>
                              ))}
                              {createdQuiz.questions.length > 3 && <ListItemText sx={{ pl: 1 }} primary="..." />}
                            </List>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button onClick={handleReset} variant="contained">
                      Weiteres Quiz erstellen
                    </Button>
                    <Button onClick={() => setOpen(false)}>
                      Schließen
                    </Button>
                  </Box>
                </Box>
              </StepContent>
            </Step>
          </Stepper>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleReset}>
            {activeStep === 2 ? 'Neues Quiz' : 'Abbrechen'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default IntelligentQuizCreator;
