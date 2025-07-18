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
  ListItemText,
  Divider
} from '@mui/material';
import {
  AutoFixHigh as AIIcon,
  Quiz as QuizIcon,
  Search as SearchIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material';
import axios from 'axios';

interface IntelligentQuizCreatorProps {
  onQuizCreated?: (quiz: any) => void;
}

const IntelligentQuizCreator: React.FC<IntelligentQuizCreatorProps> = ({ onQuizCreated }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    difficulty: 'medium',
    questionCount: 5
  });
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [createdQuiz, setCreatedQuiz] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const steps = [
    'Quiz-Details eingeben',
    'Relevante FAQs suchen',
    'Quiz erstellen',
    'Fertig'
  ];

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const handleSearchFAQs = async () => {
    try {
      setLoading(true);
      
      // Mock search for now - in real implementation, this would search the FAQ database
      const mockSearchResults = [
        {
          id: '1',
          title: 'APERAK Grundlagen',
          context: 'Grundlagen der APERAK Nachrichtenverarbeitung',
          answer: 'APERAK ist ein EDI-Standard für...',
          relevance: 0.95
        },
        {
          id: '2',
          title: 'Anwendungsfehler behandeln',
          context: 'Behandlung von Anwendungsfehlern in APERAK',
          answer: 'Bei Anwendungsfehlern sollten Sie...',
          relevance: 0.87
        }
      ];
      
      setSearchResults(mockSearchResults);
      handleNext();
      
    } catch (error) {
      console.error('Error searching FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    try {
      setLoading(true);
      
      const response = await axios.post('/api/quiz/quizzes/create-intelligent', {
        title: formData.title,
        description: formData.description,
        difficulty: formData.difficulty,
        questionCount: formData.questionCount
      });
      
      setCreatedQuiz(response.data.quiz);
      
      if (onQuizCreated) {
        onQuizCreated(response.data.quiz);
      }
      
      handleNext();
      
    } catch (error) {
      console.error('Error creating intelligent quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData({
      title: '',
      description: '',
      difficulty: 'medium',
      questionCount: 5
    });
    setSearchResults([]);
    setCreatedQuiz(null);
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
            Das intelligente Quiz-System durchsucht automatisch relevante FAQs 
            und erstellt passende Fragen zu Ihrem Thema.
          </Alert>

          <Stepper activeStep={activeStep} orientation="vertical">
            <Step>
              <StepLabel>Quiz-Details eingeben</StepLabel>
              <StepContent>
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    label="Quiz-Titel"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    sx={{ mb: 2 }}
                    placeholder="z.B. APERAK - Arbeiten mit Anwendungsfehlern"
                  />
                  <TextField
                    fullWidth
                    label="Beschreibung"
                    multiline
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    sx={{ mb: 2 }}
                    placeholder="Detaillierte Beschreibung des Quiz-Themas..."
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
                      onClick={handleSearchFAQs}
                      disabled={!formData.title || !formData.description || loading}
                      startIcon={<SearchIcon />}
                    >
                      Relevante FAQs suchen
                    </Button>
                  </Box>
                </Box>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Relevante FAQs gefunden</StepLabel>
              <StepContent>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Gefundene FAQs für "{formData.title}"
                  </Typography>
                  <List>
                    {searchResults.map((faq, index) => (
                      <React.Fragment key={faq.id}>
                        <ListItem>
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle1">{faq.title}</Typography>
                                <Chip
                                  label={`${Math.round(faq.relevance * 100)}% relevant`}
                                  color="primary"
                                  size="small"
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  {faq.context}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {faq.answer.substring(0, 100)}...
                                </Typography>
                              </Box>
                            }
                          />
                        </ListItem>
                        {index < searchResults.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <Button onClick={handleBack}>Zurück</Button>
                    <Button
                      variant="contained"
                      onClick={handleCreateQuiz}
                      disabled={loading}
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
              <StepContent>
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
              <StepContent>
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Typography variant="h6">Quiz erfolgreich erstellt!</Typography>
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
                            label={`${createdQuiz.question_count} Fragen`}
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
      </Dialog>
    </>
  );
};

export default IntelligentQuizCreator;
