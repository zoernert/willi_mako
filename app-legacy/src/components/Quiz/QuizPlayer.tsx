import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  LinearProgress,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Container,
  Divider,
  Stack
} from '@mui/material';
import {
  Timer,
  CheckCircle,
  Cancel,
  NavigateNext,
  NavigateBefore,
  Flag,
  Quiz as QuizIcon
} from '@mui/icons-material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { quizApi } from '../../services/quizApi';
import { Quiz, QuizQuestion, UserAnswer, QuizResult } from '../../types/quiz';

const QuizPlayer: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string[] }>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<QuizResult | null>(null);

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId]);

  useEffect(() => {
    if (quizStarted && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0 && quizStarted) {
      // Time up - auto submit
      handleSubmit();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, quizStarted]);

  const loadQuiz = async () => {
    if (!quizId) return;
    try {
      const response = await quizApi.getQuiz(quizId);
      setQuiz(response);
      setTimeLeft(response.time_limit_minutes * 60);
      
      // Check if we have an attempt ID from navigation state
      if (location.state?.attemptId) {
        setAttemptId(location.state.attemptId);
        setQuizStarted(true);
      }
    } catch (err) {
      console.error('Error loading quiz:', err);
      setError('Fehler beim Laden des Quiz');
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async () => {
    if (!quiz) return;
    
    try {
      const response = await quizApi.startQuiz(quiz.id);
      setAttemptId(response.id);
      setQuizStarted(true);
      setTimeLeft(quiz.time_limit_minutes * 60);
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Fehler beim Starten des Quiz');
    }
  };

  const handleAnswerChange = (questionId: string, answerValue: string) => {
    const currentQuestion = quiz?.questions?.find(q => q.id === questionId);
    if (!currentQuestion) return;

    setAnswers(prev => {
      const existingAnswers = prev[questionId] || [];
      if (currentQuestion.question_type === 'multiple-choice') {
        if (existingAnswers.includes(answerValue)) {
          return { ...prev, [questionId]: existingAnswers.filter(a => a !== answerValue) };
        } else {
          return { ...prev, [questionId]: [...existingAnswers, answerValue] };
        }
      } else {
        return { ...prev, [questionId]: [answerValue] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!quiz || !attemptId) return;
    
    try {
      setSubmitting(true);
      
      const userAnswers: UserAnswer[] = (quiz.questions || []).map(question => ({
        question_id: question.id!,
        answer: answers[question.id!] || [],
      }));

      const response = await quizApi.submitQuiz(quiz.id, attemptId, userAnswers);

      setResults(response);
      setShowResults(true);
      
      // Clear timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Fehler beim Einreichen des Quiz');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    navigate('/quiz');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft > 300) return 'success'; // > 5 minutes
    if (timeLeft > 60) return 'warning'; // > 1 minute
    return 'error';
  };

  const progress = quiz ? ((currentQuestionIndex + 1) / quiz.question_count) * 100 : 0;

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Quiz wird geladen...</Typography>
      </Container>
    );
  }

  if (error) {
    return <Container sx={{ mt: 4 }}><Alert severity="error">{error}</Alert></Container>;
  }

  if (!quiz) {
    return <Container sx={{ mt: 4 }}><Alert severity="info">Kein Quiz gefunden.</Alert></Container>;
  }

  if (showResults && results) {
    const { attempt, correct_answers, total_questions, feedback, badge_earned } = results;
    return (
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">Quiz-Ergebnisse</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-around" sx={{ my: 3 }}>
            <Chip label={`Punkte: ${attempt.score}`} color="primary" variant="outlined" />
            <Chip label={`Genauigkeit: ${attempt.percentage.toFixed(2)}%`} color="secondary" variant="outlined" />
            <Chip label={`Zeit: ${attempt.time_taken_seconds}s`} color="info" variant="outlined" />
          </Stack>
          <Typography variant="h6" gutterBottom>Detaillierte Auswertung:</Typography>
          {feedback.map((fb, index) => (
            <Card key={fb.question_id} sx={{ mb: 2, bgcolor: fb.is_correct ? '#e8f5e9' : '#ffebee' }}>
              <CardContent>
                <Typography variant="body1" sx={{ mb: 1 }}><strong>Frage {index + 1}:</strong> {fb.question_text}</Typography>
                <Typography variant="body2">Deine Antwort: {fb.user_answer.join(', ')}</Typography>
                {!fb.is_correct && (
                  <Typography variant="body2" color="success.main">Korrekte Antwort: {fb.correct_answers.join(', ')}</Typography>
                )}
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption"><em>Erklärung: {fb.explanation}</em></Typography>
              </CardContent>
            </Card>
          ))}
          {badge_earned && (
            <Alert severity="success" sx={{ mt: 3 }}>
              Glückwunsch! Du hast ein neues Abzeichen erhalten: {badge_earned.name}
            </Alert>
          )}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="contained" onClick={() => navigate('/quiz')}>Zurück zur Quiz-Übersicht</Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (!quizStarted) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <QuizIcon color="primary" sx={{ fontSize: 60 }} />
          <Typography variant="h4" gutterBottom>{quiz.title}</Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>{quiz.description}</Typography>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
            <Chip label={`Schwierigkeit: ${quiz.difficulty_level}`} />
            <Chip label={`${quiz.question_count} Fragen`} />
            <Chip label={`${quiz.time_limit_minutes} Minuten`} />
          </Stack>
          <Button variant="contained" size="large" onClick={startQuiz}>Quiz starten</Button>
        </Paper>
      </Container>
    );
  }

  const currentQuestion = quiz.questions?.[currentQuestionIndex];

  if (!currentQuestion) {
    return <Container sx={{ mt: 4 }}><Alert severity="warning">Frage nicht gefunden.</Alert></Container>;
  }

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5">{quiz.title}</Typography>
          <Chip
            icon={<Timer />}
            label={formatTime(timeLeft)}
            color={getTimeColor()}
            variant="outlined"
          />
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />
        
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Frage {currentQuestionIndex + 1} von {quiz.question_count}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{currentQuestion.question_text}</Typography>
            
            <RadioGroup
              value={answers[currentQuestion.id!]?.[0] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
            >
              {currentQuestion.answer_options.map((option, index) => (
                <FormControlLabel 
                  key={index} 
                  value={option} 
                  control={<Radio />} 
                  label={option} 
                  sx={{ mb: 1 }}
                />
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            variant="outlined" 
            startIcon={<NavigateBefore />}
            disabled={currentQuestionIndex === 0}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          >
            Zurück
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Flag />}
            onClick={() => { /* Mark for review logic */ }}
          >
            Markieren
          </Button>
          {currentQuestionIndex < quiz.question_count - 1 ? (
            <Button 
              variant="contained" 
              endIcon={<NavigateNext />}
              onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
            >
              Weiter
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="success"
              endIcon={<CheckCircle />}
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Wird eingereicht...' : 'Quiz beenden'}
            </Button>
          )}
        </Box>
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button color="error" onClick={handleExit}>Quiz abbrechen</Button>
        </Box>
      </Paper>

      <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <DialogTitle>Quiz abbrechen?</DialogTitle>
        <DialogContent>
          <Typography>Möchtest du das Quiz wirklich abbrechen? Dein Fortschritt geht verloren.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExitDialog(false)}>Weiter im Quiz</Button>
          <Button onClick={confirmExit} color="error">Abbrechen bestätigen</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizPlayer;
