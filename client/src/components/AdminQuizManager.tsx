import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ExpandMore as ExpandMoreIcon,
  Quiz as QuizIcon
} from '@mui/icons-material';
import axios from 'axios';
import IntelligentQuizCreator from './IntelligentQuizCreator';

interface Quiz {
  id: string;
  title: string;
  description: string;
  difficulty_level: string;
  topic_area: string;
  time_limit_minutes: number;
  question_count: number;
  attempt_count: number;
  is_active: boolean;
  creator_name: string;
  created_at: string;
}

interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  correct_answer_index: number;
  answer_options: string[];
  explanation: string;
  difficulty_level: string;
  points: number;
  source_faq_id?: string;
  source_chat_id?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const AdminQuizManager: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<{ [quizId: string]: QuizQuestion[] }>({});
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState<{open: boolean, quiz: Quiz | null}>({
    open: false,
    quiz: null
  });
  const [editQuestionDialog, setEditQuestionDialog] = useState<{open: boolean, question: QuizQuestion | null}>({
    open: false,
    question: null
  });
  const [deleteDialog, setDeleteDialog] = useState<{open: boolean, quiz: Quiz | null}>({
    open: false,
    quiz: null
  });
  const [expandedQuiz, setExpandedQuiz] = useState<string | false>(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await axios.get('/api/quiz/admin/all-quizzes');
      setQuizzes(response.data);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizQuestions = async (quizId: string) => {
    try {
      const response = await axios.get(`/api/quiz/admin/quizzes/${quizId}/questions`);
      setQuestions(prev => ({ ...prev, [quizId]: response.data }));
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
    }
  };

  const handleQuizAccordionChange = (quizId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedQuiz(isExpanded ? quizId : false);
    if (isExpanded && !questions[quizId]) {
      fetchQuizQuestions(quizId);
    }
  };

  const handleEdit = (quiz: Quiz) => {
    setEditDialog({ open: true, quiz });
  };

  const handleEditQuestion = (question: QuizQuestion) => {
    setEditQuestionDialog({ open: true, question });
  };

  const handleDelete = (quiz: Quiz) => {
    setDeleteDialog({ open: true, quiz });
  };

  const handleSaveEdit = async (quiz: Quiz) => {
    try {
      await axios.put(`/api/quiz/admin/quizzes/${quiz.id}`, {
        title: quiz.title,
        description: quiz.description,
        is_active: quiz.is_active,
        difficulty_level: quiz.difficulty_level,
        topic_area: quiz.topic_area,
        time_limit_minutes: quiz.time_limit_minutes
      });
      setEditDialog({ open: false, quiz: null });
      fetchQuizzes();
    } catch (error) {
      console.error('Error updating quiz:', error);
    }
  };

  const handleSaveEditQuestion = async (question: QuizQuestion) => {
    try {
      await axios.put(`/api/quiz/admin/questions/${question.id}`, {
        question_text: question.question_text,
        answer_options: question.answer_options,
        correct_answer_index: question.correct_answer_index,
        explanation: question.explanation,
        difficulty_level: question.difficulty_level,
        points: question.points
      });
      setEditQuestionDialog({ open: false, question: null });
      // Refresh questions for the specific quiz
      if (question.quiz_id) {
        fetchQuizQuestions(question.quiz_id);
      }
    } catch (error) {
      console.error('Error updating quiz question:', error);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteDialog.quiz) {
      try {
        await axios.delete(`/api/quiz/admin/quizzes/${deleteDialog.quiz.id}`);
        setDeleteDialog({ open: false, quiz: null });
        fetchQuizzes();
      } catch (error) {
        console.error('Error deleting quiz:', error);
      }
    }
  };

  const handleDeleteQuestion = async (questionId: string, quizId: string) => {
    try {
      await axios.delete(`/api/quiz/admin/questions/${questionId}`);
      fetchQuizQuestions(quizId);
    } catch (error) {
      console.error('Error deleting question:', error);
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

  if (loading) {
    return <Typography>Lade Quizzes...</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Quiz-Verwaltung</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IntelligentQuizCreator onQuizCreated={fetchQuizzes} />
          <Button variant="outlined" startIcon={<AddIcon />}>
            Manuelles Quiz
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Hier können Sie alle Quizzes verwalten, bearbeiten und löschen. 
        Das intelligente Quiz-System erstellt automatisch relevante Fragen basierend auf Ihren FAQs.
        Aktive Quizzes sind für alle Benutzer sichtbar.
      </Alert>

      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
        <Tab label="Quiz-Übersicht" />
        <Tab label="Fragen bearbeiten" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Titel</TableCell>
                <TableCell>Thema</TableCell>
                <TableCell>Schwierigkeit</TableCell>
                <TableCell>Fragen</TableCell>
                <TableCell>Versuche</TableCell>
                <TableCell>Ersteller</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Aktionen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz.id}>
                  <TableCell>{quiz.title}</TableCell>
                  <TableCell>{quiz.topic_area}</TableCell>
                  <TableCell>
                    <Chip 
                      label={quiz.difficulty_level} 
                      color={getDifficultyColor(quiz.difficulty_level)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{quiz.question_count}</TableCell>
                  <TableCell>{quiz.attempt_count}</TableCell>
                  <TableCell>{quiz.creator_name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={quiz.is_active ? 'Aktiv' : 'Inaktiv'}
                      color={quiz.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(quiz)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(quiz)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="h6" gutterBottom>
          Fragen bearbeiten
        </Typography>
        {quizzes.map((quiz) => (
          <Accordion 
            key={quiz.id}
            expanded={expandedQuiz === quiz.id}
            onChange={handleQuizAccordionChange(quiz.id)}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <QuizIcon />
                <Typography variant="h6">{quiz.title}</Typography>
                <Chip 
                  label={`${quiz.question_count} Fragen`}
                  size="small"
                  color="primary"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {questions[quiz.id] ? (
                <Box>
                  {questions[quiz.id].map((question, index) => (
                    <Paper key={question.id} sx={{ p: 2, mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Frage {index + 1}: {question.question_text}
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            {question.answer_options.map((option, optionIndex) => (
                              <Typography 
                                key={optionIndex}
                                variant="body2"
                                sx={{ 
                                  color: optionIndex === question.correct_answer_index ? 'success.main' : 'text.secondary',
                                  fontWeight: optionIndex === question.correct_answer_index ? 'bold' : 'normal'
                                }}
                              >
                                {String.fromCharCode(65 + optionIndex)}) {option}
                              </Typography>
                            ))}
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            {question.explanation}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <IconButton onClick={() => handleEditQuestion(question)}>
                            <EditIcon />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteQuestion(question.id, quiz.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ) : (
                <Typography>Lade Fragen...</Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </TabPanel>

      {/* Edit Quiz Dialog */}
      <Dialog 
        open={editDialog.open} 
        onClose={() => setEditDialog({ open: false, quiz: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Quiz bearbeiten</DialogTitle>
        <DialogContent>
          {editDialog.quiz && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Titel"
                value={editDialog.quiz.title}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  quiz: { ...editDialog.quiz!, title: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Beschreibung"
                multiline
                rows={3}
                value={editDialog.quiz.description}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  quiz: { ...editDialog.quiz!, description: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Thema"
                value={editDialog.quiz.topic_area}
                onChange={(e) => setEditDialog({
                  ...editDialog,
                  quiz: { ...editDialog.quiz!, topic_area: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Schwierigkeit</InputLabel>
                  <Select
                    value={editDialog.quiz.difficulty_level}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      quiz: { ...editDialog.quiz!, difficulty_level: e.target.value }
                    })}
                  >
                    <MenuItem value="easy">Einfach</MenuItem>
                    <MenuItem value="medium">Mittel</MenuItem>
                    <MenuItem value="hard">Schwer</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Zeitlimit (Minuten)"
                  type="number"
                  value={editDialog.quiz.time_limit_minutes}
                  onChange={(e) => setEditDialog({
                    ...editDialog,
                    quiz: { ...editDialog.quiz!, time_limit_minutes: parseInt(e.target.value) }
                  })}
                />
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={editDialog.quiz.is_active}
                    onChange={(e) => setEditDialog({
                      ...editDialog,
                      quiz: { ...editDialog.quiz!, is_active: e.target.checked }
                    })}
                  />
                }
                label="Aktiv"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, quiz: null })}>
            Abbrechen
          </Button>
          <Button onClick={() => handleSaveEdit(editDialog.quiz!)} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Question Dialog */}
      <Dialog 
        open={editQuestionDialog.open} 
        onClose={() => setEditQuestionDialog({ open: false, question: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Frage bearbeiten</DialogTitle>
        <DialogContent>
          {editQuestionDialog.question && (
            <Box sx={{ pt: 2 }}>
              <TextField
                fullWidth
                label="Frage"
                multiline
                rows={3}
                value={editQuestionDialog.question.question_text}
                onChange={(e) => setEditQuestionDialog({
                  ...editQuestionDialog,
                  question: { ...editQuestionDialog.question!, question_text: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              
              {editQuestionDialog.question.answer_options.map((option, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <TextField
                    fullWidth
                    label={`Antwort ${String.fromCharCode(65 + index)}`}
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...editQuestionDialog.question!.answer_options];
                      newOptions[index] = e.target.value;
                      setEditQuestionDialog({
                        ...editQuestionDialog,
                        question: { ...editQuestionDialog.question!, answer_options: newOptions }
                      });
                    }}
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editQuestionDialog.question?.correct_answer_index === index}
                        onChange={(e) => {
                          if (e.target.checked && editQuestionDialog.question) {
                            setEditQuestionDialog({
                              ...editQuestionDialog,
                              question: { ...editQuestionDialog.question, correct_answer_index: index }
                            });
                          }
                        }}
                      />
                    }
                    label="Richtig"
                  />
                </Box>
              ))}
              
              <TextField
                fullWidth
                label="Erklärung"
                multiline
                rows={2}
                value={editQuestionDialog.question.explanation}
                onChange={(e) => setEditQuestionDialog({
                  ...editQuestionDialog,
                  question: { ...editQuestionDialog.question!, explanation: e.target.value }
                })}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Schwierigkeit</InputLabel>
                  <Select
                    value={editQuestionDialog.question.difficulty_level}
                    onChange={(e) => setEditQuestionDialog({
                      ...editQuestionDialog,
                      question: { ...editQuestionDialog.question!, difficulty_level: e.target.value }
                    })}
                  >
                    <MenuItem value="easy">Einfach</MenuItem>
                    <MenuItem value="medium">Mittel</MenuItem>
                    <MenuItem value="hard">Schwer</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Punkte"
                  type="number"
                  value={editQuestionDialog.question.points}
                  onChange={(e) => setEditQuestionDialog({
                    ...editQuestionDialog,
                    question: { ...editQuestionDialog.question!, points: parseInt(e.target.value) }
                  })}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditQuestionDialog({ open: false, question: null })}>
            Abbrechen
          </Button>
          <Button onClick={() => handleSaveEditQuestion(editQuestionDialog.question!)} variant="contained">
            Speichern
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, quiz: null })}>
        <DialogTitle>Quiz löschen</DialogTitle>
        <DialogContent>
          <Typography>
            Sind Sie sicher, dass Sie das Quiz "{deleteDialog.quiz?.title}" löschen möchten?
            Diese Aktion kann nicht rückgängig gemacht werden.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, quiz: null })}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Löschen
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminQuizManager;
