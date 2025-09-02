import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Stack,
  Checkbox,
  FormGroup,
  TextField
} from '@mui/material';
import {
  Timer,
  CheckCircle,
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
  const submitGuardRef = useRef(false);
  const STORAGE_KEY = quizId ? `quizProgress:${quizId}` : '';
  
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Helper: get question by id
  const getQuestionById = (qid: string) => quiz?.questions?.find(q => q.id === qid);

  // Helper: map values (indices) to option labels for display
  const mapAnswersToLabels = (question: QuizQuestion | undefined, values: string[]): string[] => {
    if (!question) return values;
    return values.map(v => {
      if (/^\d+$/.test(v)) {
        const idx = Number(v);
        return question.answer_options?.[idx] ?? v;
      }
      return v;
    });
  };

  // Validate a single question by id
  const isQuestionAnswered = (qid: string): boolean => {
    const q = getQuestionById(qid);
    if (!q) return false;
    const val = answers[qid] || [];
    if (q.question_type === 'short-answer') return (val[0]?.trim()?.length ?? 0) > 0;
    return val.length > 0;
  };

  // Validate all; returns first invalid index or -1
  const findFirstInvalidIndex = (): number => {
    const list = quiz?.questions || [];
    for (let i = 0; i < list.length; i++) {
      const q = list[i];
      if (!q.id) return i;
      if (!isQuestionAnswered(q.id)) return i;
    }
    return -1;
  };

  const loadQuiz = useCallback(async () => {
    if (!quizId) return;
    try {
      const response = await quizApi.getQuiz(quizId);
      setQuiz(response);
      setTimeLeft(response.time_limit_minutes * 60);
      
      // Restore saved progress if available
      try {
        const raw = STORAGE_KEY ? localStorage.getItem(STORAGE_KEY) : null;
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved?.quizId === quizId) {
            if (saved.answers) setAnswers(saved.answers);
            if (typeof saved.currentQuestionIndex === 'number') setCurrentQuestionIndex(saved.currentQuestionIndex);
            if (typeof saved.timeLeft === 'number') {
              const maxAllowed = response.time_limit_minutes * 60;
              setTimeLeft(Math.max(0, Math.min(saved.timeLeft, maxAllowed)));
            }
            if (saved.attemptId) {
              setAttemptId(saved.attemptId);
              setQuizStarted(!!saved.quizStarted);
            }
          }
        }
      } catch {}
      
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
  }, [STORAGE_KEY, location.state, quizId]);

  useEffect(() => {
    if (quizId) {
      loadQuiz();
    }
  }, [quizId, loadQuiz]);

  const startQuiz = async () => {
    if (!quiz) return;
    
    try {
      const response = await quizApi.startQuiz(quiz.id);
      setAttemptId(response.id);
      setQuizStarted(true);
      setTimeLeft(quiz.time_limit_minutes * 60);
      // Persist attempt id immediately
      try {
        if (STORAGE_KEY) {
          const raw = localStorage.getItem(STORAGE_KEY);
          const prev = raw ? JSON.parse(raw) : {};
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...prev, quizId, attemptId: response.id, quizStarted: true, timeLeft: quiz.time_limit_minutes * 60 })
          );
        }
      } catch {}
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Fehler beim Starten des Quiz');
    }
  };

  const handleAnswerChange = (questionId: string, answerValue: string) => {
    const currentQuestion = quiz?.questions?.find(q => q.id === questionId);
    if (!currentQuestion) return;

    setTouched(prev => ({ ...prev, [questionId]: true }));

    setAnswers(prev => {
      const existingAnswers = prev[questionId] || [];
      const newVal = answerValue;

      if (currentQuestion.question_type === 'multiple-choice') {
        if (existingAnswers.includes(newVal)) {
          return { ...prev, [questionId]: existingAnswers.filter(a => a !== newVal) };
        } else {
          return { ...prev, [questionId]: [...existingAnswers, newVal] };
        }
      } else if (currentQuestion.question_type === 'short-answer') {
        return { ...prev, [questionId]: [answerValue] };
      } else {
        return { ...prev, [questionId]: [newVal] };
      }
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!quiz || !attemptId) return;
    if (submitGuardRef.current || submitting || showResults) return;
    
    try {
      submitGuardRef.current = true;
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
      // Clear saved progress
      try { if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY); } catch {}
    } catch (err) {
      console.error('Error submitting quiz:', err);
      setError('Fehler beim Einreichen des Quiz');
    } finally {
      setSubmitting(false);
    }
  }, [STORAGE_KEY, answers, attemptId, quiz, showResults, submitting]);

  useEffect(() => {
    if (!quizStarted || showResults || submitting) return;

    if (timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && quizStarted) {
      // Time up - auto submit (guard against double submissions)
      handleSubmit();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeLeft, quizStarted, showResults, submitting, handleSubmit]);

  // Persist progress to localStorage
  useEffect(() => {
    try {
      if (!STORAGE_KEY || !quiz) return;
      const payload = {
        quizId,
        answers,
        currentQuestionIndex,
        timeLeft,
        quizStarted,
        attemptId,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {}
  }, [STORAGE_KEY, quiz, quizId, answers, currentQuestionIndex, timeLeft, quizStarted, attemptId]);

  const handleExit = () => {
    setShowExitDialog(true);
  };

  const confirmExit = () => {
    // Clear saved progress on explicit exit
    try { if (STORAGE_KEY) localStorage.removeItem(STORAGE_KEY); } catch {}
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
    const { attempt, feedback, badge_earned } = results;
    return (
      <Container maxWidth="md" sx={{ my: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom align="center">Quiz-Ergebnisse</Typography>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-around" sx={{ my: 3 }}>
            <Chip label={`Punkte: ${attempt.score}`} color="primary" variant="outlined" />
            <Chip label={`Genauigkeit: ${attempt.percentage.toFixed(2)}%`} color="secondary" variant="outlined" />
            <Chip label={`Zeit: ${(attempt as any).time_spent_seconds ?? (attempt as any).time_taken_seconds ?? 0}s`} color="info" variant="outlined" />
          </Stack>
          <Typography variant="h6" gutterBottom>Detaillierte Auswertung:</Typography>
          {feedback.map((fb, index) => {
            const q = getQuestionById(fb.question_id);
            const userAns = mapAnswersToLabels(q, fb.user_answer || []);
            const correctAns = mapAnswersToLabels(q, fb.correct_answers || []);
            return (
              <Card key={fb.question_id} sx={{ mb: 2, bgcolor: fb.is_correct ? '#e8f5e9' : '#ffebee' }}>
                <CardContent>
                  <Typography variant="body1" sx={{ mb: 1 }}><strong>Frage {index + 1}:</strong> {fb.question_text}</Typography>
                  <Typography variant="body2">Deine Antwort: {userAns.join(', ') || '—'}</Typography>
                  {!fb.is_correct && (
                    <Typography variant="body2" color="success.main">Korrekte Antwort: {correctAns.join(', ')}</Typography>
                  )}
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="caption"><em>Erklärung: {fb.explanation}</em></Typography>
                </CardContent>
              </Card>
            );
          })}
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
  const currentValid = currentQuestion?.id ? isQuestionAnswered(currentQuestion.id) : false;
  const questionTitleId = currentQuestion?.id ? `question-title-${currentQuestion.id}` : undefined;
  const validationMsgId = currentQuestion?.id ? `validation-${currentQuestion.id}` : undefined;

  const goPrev = () => setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  const goNext = () => setCurrentQuestionIndex(prev => Math.min((quiz?.question_count || 1) - 1, prev + 1));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (submitting || showResults || !quizStarted) return;
    // Some IME composition events set isComposing; guard with cast
    if ((e as any)?.isComposing) return;

    const q = quiz?.questions?.[currentQuestionIndex];
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentQuestionIndex < (quiz?.question_count || 1) - 1) {
        if (q?.id && !isQuestionAnswered(q.id)) {
          if (q?.id) setTouched(prev => ({ ...prev, [q.id!]: true }));
          return;
        }
        goNext();
      } else {
        const firstInvalid = findFirstInvalidIndex();
        if (firstInvalid !== -1) {
          const qi = quiz?.questions?.[firstInvalid];
          if (qi?.id) setTouched(prev => ({ ...prev, [qi.id!]: true }));
          setCurrentQuestionIndex(firstInvalid);
          setError('Bitte alle Fragen beantworten, bevor du einreichst.');
          return;
        }
        handleSubmit();
      }
    } else if ((e.key === 'Enter' && e.shiftKey) || e.key === 'ArrowLeft') {
      e.preventDefault();
      if (currentQuestionIndex > 0) goPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (currentQuestionIndex < (quiz?.question_count || 1) - 1) {
        if (q?.id && !isQuestionAnswered(q.id)) {
          if (q?.id) setTouched(prev => ({ ...prev, [q.id!]: true }));
          return;
        }
        goNext();
      }
    }
  };

  if (!currentQuestion) {
    return <Container sx={{ mt: 4 }}><Alert severity="warning">Frage nicht gefunden.</Alert></Container>;
  }

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      <Paper elevation={2} sx={{ p: 3 }} tabIndex={0} onKeyDown={handleKeyDown} aria-label="Quiz Spieler">
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
            <Typography id={questionTitleId} variant="h6" sx={{ mb: 2 }}>
              Frage {currentQuestionIndex + 1} von {quiz.question_count}
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>{currentQuestion?.question_text}</Typography>

            <Box role="group" aria-labelledby={questionTitleId} aria-describedby={!currentValid ? validationMsgId : undefined}>
              {/* Render answer input based on question type */}
              {currentQuestion.question_type === 'multiple-choice' ? (
                <FormGroup>
                  {currentQuestion.answer_options.map((option, index) => (
                    <FormControlLabel
                      key={index}
                      control={
                        <Checkbox
                          checked={(answers[currentQuestion.id!]?.includes(String(index))) || false}
                          onChange={() => handleAnswerChange(currentQuestion.id!, String(index))}
                        />
                      }
                      label={option}
                      sx={{ mb: 1 }}
                    />
                  ))}
                </FormGroup>
              ) : currentQuestion.question_type === 'short-answer' ? (
                <TextField
                  fullWidth
                  placeholder="Antwort eingeben"
                  value={(answers[currentQuestion.id!] && answers[currentQuestion.id!][0]) || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
                />
              ) : (
                <RadioGroup
                  value={answers[currentQuestion.id!]?.[0] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id!, e.target.value)}
                >
                  {currentQuestion.answer_options.map((option, index) => (
                    <FormControlLabel 
                      key={index} 
                      value={String(index)} 
                      control={<Radio />} 
                      label={option} 
                      sx={{ mb: 1 }}
                    />
                  ))}
                </RadioGroup>
              )}
            </Box>

            {currentQuestion?.id && touched[currentQuestion.id] && !currentValid && (
              <Alert id={validationMsgId} role="alert" severity="warning" sx={{ mt: 2 }}>
                Bitte beantworte diese Frage, um fortzufahren.
              </Alert>
            )}
          </CardContent>
        </Card>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button 
            variant="outlined" 
            startIcon={<NavigateBefore />}
            disabled={currentQuestionIndex === 0 || submitting}
            onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
          >
            Zurück
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Flag />}
            disabled={submitting}
            onClick={() => { /* Mark for review logic */ }}
          >
            Markieren
          </Button>
          {currentQuestionIndex < quiz.question_count - 1 ? (
            <Button 
              variant="contained" 
              endIcon={<NavigateNext />}
              disabled={submitting}
              onClick={() => {
                if (currentQuestion?.id && !isQuestionAnswered(currentQuestion.id)) {
                  setTouched(prev => ({ ...prev, [currentQuestion.id!]: true }));
                  return;
                }
                setCurrentQuestionIndex(prev => prev + 1);
              }}
            >
              Weiter
            </Button>
          ) : (
            <Button 
              variant="contained" 
              color="success"
              endIcon={<CheckCircle />}
              onClick={() => {
                const firstInvalid = findFirstInvalidIndex();
                if (firstInvalid !== -1) {
                  const q = quiz.questions?.[firstInvalid];
                  if (q?.id) setTouched(prev => ({ ...prev, [q.id!]: true }));
                  setCurrentQuestionIndex(firstInvalid);
                  setError('Bitte alle Fragen beantworten, bevor du einreichst.');
                  return;
                }
                handleSubmit();
              }}
              disabled={submitting}
            >
              {submitting ? 'Wird eingereicht...' : 'Quiz beenden'}
            </Button>
          )}
        </Box>
        <Box sx={{ mt: 3, textAlign: 'right' }}>
          <Button color="error" onClick={handleExit} disabled={submitting}>Quiz abbrechen</Button>
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
