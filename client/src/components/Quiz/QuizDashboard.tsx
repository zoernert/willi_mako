import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Container,
  Tabs,
  Tab,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import {
  Quiz as QuizIcon,
  Stars,
  TrendingUp,
  PlayArrow,
  Add,
  EmojiEvents,
  School,
  Timer,
  Person
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  topic_area: string;
  time_limit_minutes: number;
  question_count: number;
  attempt_count: number;
  best_score: number;
  created_at: string;
}

interface QuizSuggestion {
  quiz: Quiz;
  reason: string;
  relevance_score: number;
}

interface UserStats {
  total_attempts: number;
  completed_attempts: number;
  avg_score: number;
  best_score: number;
  total_points_earned: number;
}

interface LeaderboardEntry {
  display_name: string;
  total_points: number;
  quiz_count: number;
  average_score: number;
}

const QuizDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [suggestions, setSuggestions] = useState<QuizSuggestion[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [generateForm, setGenerateForm] = useState({
    topicArea: '',
    difficulty: 'medium' as 'easy' | 'medium' | 'hard',
    questionCount: 5
  });
  const [generating, setGenerating] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [quizzesRes, suggestionsRes, statsRes, leaderboardRes] = await Promise.all([
        axios.get('/quiz/quizzes'),
        axios.get('/quiz/suggestions'),
        axios.get('/quiz/stats'),
        axios.get('/quiz/leaderboard')
      ]);

      setQuizzes(quizzesRes.data);
      setSuggestions(suggestionsRes.data);
      setUserStats(statsRes.data);
      setLeaderboard(leaderboardRes.data);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Fehler beim Laden der Quiz-Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (quizId: string) => {
    try {
      const response = await axios.post(`/quiz/quizzes/${quizId}/start`);
      navigate(`/quiz/${quizId}`, { state: { attemptId: response.data.id } });
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Fehler beim Starten des Quiz');
    }
  };

  const handleGenerateQuiz = async () => {
    try {
      setGenerating(true);
      const response = await axios.post('/quiz/quizzes/generate', generateForm);
      setGenerateDialogOpen(false);
      setGenerateForm({ topicArea: '', difficulty: 'medium', questionCount: 5 });
      
      // Reload quizzes
      const quizzesRes = await axios.get('/quiz/quizzes');
      setQuizzes(quizzesRes.data);
      
      // Navigate to new quiz
      navigate(`/quiz/${response.data.quiz.id}`);
    } catch (err) {
      console.error('Error generating quiz:', err);
      setError('Fehler beim Generieren des Quiz');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateFromChats = async () => {
    try {
      setGenerating(true);
      const response = await axios.post('/quiz/quizzes/generate-from-chats', {
        questionCount: 5
      });
      
      // Navigate to new quiz
      navigate(`/quiz/${response.data.quiz.id}`);
    } catch (err) {
      console.error('Error generating quiz from chats:', err);
      setError('Fehler beim Generieren des Quiz aus Chats');
    } finally {
      setGenerating(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'success';
      case 'medium': return 'warning';
      case 'hard': return 'error';
      default: return 'default';
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Einfach';
      case 'medium': return 'Mittel';
      case 'hard': return 'Schwer';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <QuizIcon /> Wissens-Challenge
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* User Stats */}
      {userStats && (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ mb: 4 }}>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <QuizIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">{userStats.completed_attempts}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Abgeschlossene Quizzes
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h6">{Math.round(userStats.avg_score)}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Durchschnittliche Punktzahl
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Stars />
                </Avatar>
                <Box>
                  <Typography variant="h6">{Math.round(userStats.best_score)}%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Beste Punktzahl
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <EmojiEvents />
                </Avatar>
                <Box>
                  <Typography variant="h6">{userStats.total_points_earned}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Gesammelte Punkte
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Verfügbare Quizzes" />
          <Tab label="Empfehlungen" />
          <Tab label="Bestenliste" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setGenerateDialogOpen(true)}
            >
              Quiz Generieren
            </Button>
            <Button
              variant="outlined"
              startIcon={<Person />}
              onClick={handleGenerateFromChats}
              disabled={generating}
            >
              {generating ? 'Generiere...' : 'Aus Chats Generieren'}
            </Button>
          </Box>

          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3 
          }}>
            {quizzes.map((quiz) => (
              <Card key={quiz.id}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {quiz.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {quiz.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={getDifficultyText(quiz.difficulty_level)}
                      color={getDifficultyColor(quiz.difficulty_level) as any}
                      size="small"
                    />
                    <Chip
                      label={`${quiz.question_count} Fragen`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      label={`${quiz.time_limit_minutes} Min`}
                      size="small"
                      variant="outlined"
                      icon={<Timer />}
                    />
                  </Box>
                  {quiz.topic_area && (
                    <Chip
                      label={quiz.topic_area}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  )}
                  {quiz.best_score && (
                    <Typography variant="body2" color="success.main">
                      Beste Punktzahl: {Math.round(quiz.best_score)}%
                    </Typography>
                  )}
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartQuiz(quiz.id)}
                  >
                    Starten
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Personalisierte Empfehlungen
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 3 
          }}>
            {suggestions.map((suggestion, index) => (
              <Card key={index}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {suggestion.quiz.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {suggestion.reason}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <Chip
                      label={getDifficultyText(suggestion.quiz.difficulty_level)}
                      color={getDifficultyColor(suggestion.quiz.difficulty_level) as any}
                      size="small"
                    />
                    <Chip
                      label={`${suggestion.quiz.question_count} Fragen`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  <Typography variant="body2" color="primary">
                    Relevanz: {Math.round(suggestion.relevance_score)}%
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => handleStartQuiz(suggestion.quiz.id)}
                  >
                    Starten
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Bestenliste
          </Typography>
          <Card>
            <List>
              {leaderboard.map((entry, index) => (
                <ListItem key={index}>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: index < 3 ? 'gold' : 'grey.500' }}>
                      {index + 1}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={entry.display_name}
                    secondary={`${entry.total_points} Punkte • ${entry.quiz_count} Quizzes • ⌀ ${Math.round(entry.average_score)}%`}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
        </Box>
      )}

      {/* Generate Quiz Dialog */}
      <Dialog open={generateDialogOpen} onClose={() => setGenerateDialogOpen(false)}>
        <DialogTitle>Quiz Generieren</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Themenbereich"
            fullWidth
            variant="outlined"
            value={generateForm.topicArea}
            onChange={(e) => setGenerateForm({ ...generateForm, topicArea: e.target.value })}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Schwierigkeit</InputLabel>
            <Select
              value={generateForm.difficulty}
              label="Schwierigkeit"
              onChange={(e) => setGenerateForm({ ...generateForm, difficulty: e.target.value as any })}
            >
              <MenuItem value="easy">Einfach</MenuItem>
              <MenuItem value="medium">Mittel</MenuItem>
              <MenuItem value="hard">Schwer</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Anzahl Fragen"
            type="number"
            fullWidth
            variant="outlined"
            value={generateForm.questionCount}
            onChange={(e) => setGenerateForm({ ...generateForm, questionCount: parseInt(e.target.value) || 5 })}
            inputProps={{ min: 1, max: 20 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGenerateDialogOpen(false)}>Abbrechen</Button>
          <Button onClick={handleGenerateQuiz} disabled={generating}>
            {generating ? 'Generiere...' : 'Generieren'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuizDashboard;
