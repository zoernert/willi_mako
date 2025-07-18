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
import axios from 'axios';

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  topic_area: string;
  time_limit_minutes: number;
  question_count: number;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  id: string;
  question_text: string;
  answer_options: string[];
  correct_answer_index: number;
  explanation: string;
  points: number;
}

interface UserAnswer {
  question_id: string;
  selected_answer_index: number;
  selected_answer_text: string;
  is_correct: boolean;
}

interface QuizResult {
  attempt: any;
  points_earned: number;
  expertise_updates: any[];
  achievements: any[];
}

const QuizPlayer: React.FC = () => {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
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
    loadQuiz();
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
    try {
      const response = await axios.get(`/quiz/quizzes/${quizId}`);
      setQuiz(response.data);
      setTimeLeft(response.data.time_limit_minutes * 60);
      
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
      const response = await axios.post(`/quiz/quizzes/${quiz.id}/start`);
      setAttemptId(response.data.id);
      setQuizStarted(true);
      setTimeLeft(quiz.time_limit_minutes * 60);
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Fehler beim Starten des Quiz');
    }
  };

  const handleAnswerChange = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmit = async () => {
    if (!quiz || !attemptId) return;
    
    try {
      setSubmitting(true);
      
      const userAnswers: UserAnswer[] = quiz.questions.map(question => ({
        question_id: question.id,
        selected_answer_index: answers[question.id] ?? -1,
        selected_answer_text: answers[question.id] !== undefined 
          ? question.answer_options[answers[question.id]] 
          : '',
        is_correct: answers[question.id] === question.correct_answer_index
      }));

      const response = await axios.post(`/quiz/quizzes/${quiz.id}/submit`, {
        attemptId,
        answers: userAnswers
      });

      setResults(response.data);
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
    return 'error'; // < 1 minute
  };

  const getProgress = () => {
    return ((currentQuestionIndex + 1) / (quiz?.questions?.length || 1)) * 100;
  };

  const currentQuestion = quiz?.questions[currentQuestionIndex];

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <Typography>Quiz wird geladen...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!quiz) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Quiz nicht gefunden</Alert>
      </Container>
    );
  }

  if (showResults && results) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <CheckCircle color="success" /> Quiz Abgeschlossen!
          </Typography>
          
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 4 }}>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="h3" color="primary">
                {Math.round(results.attempt.percentage)}%
              </Typography>
              <Typography variant="h6">Punktzahl</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Typography variant="h3" color="success.main">
                {results.points_earned}
              </Typography>
              <Typography variant="h6">Punkte Erhalten</Typography>
            </Box>
          </Stack>

          <Typography variant="h6" gutterBottom>
            Ergebnis-Details:
          </Typography>
          <Typography>
            • Richtige Antworten: {results.attempt.score} von {results.attempt.max_score} Punkten
          </Typography>
          <Typography>
            • Zeitverbrauch: {Math.round(results.attempt.time_spent_seconds / 60)} Minuten
          </Typography>
          
          {results.expertise_updates.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Expertenstatus Updates:
              </Typography>
              {results.expertise_updates.map((update, index) => (
                <Chip
                  key={index}
                  label={`${update.topic_area}: ${update.old_level} → ${update.new_level}`}
                  color="primary"
                  sx={{ mr: 1, mb: 1 }}
                />
              ))}
            </Box>
          )}

          {results.achievements.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                Neue Erfolge:
              </Typography>
              {results.achievements.map((achievement, index) => (
                <Alert key={index} severity="success" sx={{ mb: 1 }}>
                  <strong>{achievement.title}</strong>: {achievement.description}
                </Alert>
              ))}
            </Box>
          )}

          <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={() => navigate('/quiz')}
            >
              Zurück zur Übersicht
            </Button>
            <Button
              variant="outlined"
              onClick={() => window.location.reload()}
            >
              Quiz Wiederholen
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  if (!quizStarted) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <QuizIcon /> {quiz.title}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {quiz.description}
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Chip label={`${quiz.question_count} Fragen`} />
            <Chip label={`${quiz.time_limit_minutes} Minuten`} />
            <Chip label={quiz.difficulty_level} />
            {quiz.topic_area && <Chip label={quiz.topic_area} />}
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              • Sie haben {quiz.time_limit_minutes} Minuten Zeit<br />
              • {quiz.question_count} Fragen zu beantworten<br />
              • Nach dem Start können Sie das Quiz nicht pausieren<br />
              • Wählen Sie die beste Antwort für jede Frage
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={startQuiz}
            >
              Quiz Starten
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate('/quiz')}
            >
              Abbrechen
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">{quiz.title}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Chip
              icon={<Timer />}
              label={formatTime(timeLeft)}
              color={getTimeColor()}
            />
            <Button
              variant="outlined"
              color="error"
              onClick={handleExit}
            >
              Beenden
            </Button>
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Frage {currentQuestionIndex + 1} von {quiz.questions.length}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={getProgress()}
            sx={{ mt: 1 }}
          />
        </Box>
      </Paper>

      {/* Question */}
      {currentQuestion && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              {currentQuestion.question_text}
            </Typography>
            
            <RadioGroup
              value={answers[currentQuestion.id] ?? ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, parseInt(e.target.value))}
            >
              {currentQuestion.answer_options.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={index}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<NavigateBefore />}
          onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Zurück
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {quiz.questions.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: index === currentQuestionIndex
                  ? 'primary.main'
                  : answers[quiz.questions[index].id] !== undefined
                  ? 'success.main'
                  : 'grey.300',
                cursor: 'pointer'
              }}
              onClick={() => setCurrentQuestionIndex(index)}
            />
          ))}
        </Box>

        {currentQuestionIndex === quiz.questions.length - 1 ? (
          <Button
            variant="contained"
            color="success"
            startIcon={<Flag />}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Einreichen...' : 'Einreichen'}
          </Button>
        ) : (
          <Button
            variant="outlined"
            endIcon={<NavigateNext />}
            onClick={() => setCurrentQuestionIndex(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
          >
            Weiter
          </Button>
        )}
      </Box>

      {/* Exit Dialog */}
      <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <DialogTitle>Quiz Beenden</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie das Quiz beenden möchten? Ihr Fortschritt geht verloren.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowExitDialog(false)}>Abbrechen</Button>
          <Button onClick={confirmExit} color="error">
            Beenden
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizPlayer;
