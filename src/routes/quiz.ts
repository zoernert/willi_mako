import express from 'express';
import { Pool } from 'pg';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { QuizService } from '../services/quizService';
import { GamificationService } from '../services/gamification';
import { GeminiService } from '../services/gemini';
import { UserAnswer } from '../types/quiz';

const router = express.Router();

export default function createQuizRoutes(db: Pool) {
  const geminiService = new GeminiService();
  const gamificationService = new GamificationService(db);
  const quizService = new QuizService(db, geminiService, gamificationService);

  // Get available quizzes
  router.get('/quizzes', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const limit = parseInt(req.query.limit as string) || 10;
      const quizzes = await quizService.getAvailableQuizzes(userId, limit);
      return res.json(quizzes);
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Generate quiz from FAQs
  router.post('/quizzes/generate', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { topicArea, difficulty = 'medium', questionCount = 5 } = req.body;
      
      // Generate questions
      const questions = await quizService.generateQuestionsFromFAQs(
        topicArea,
        difficulty,
        questionCount
      );
      
      if (questions.length === 0) {
        // If no questions found for specific topic, try without topic filter
        const fallbackQuestions = await quizService.generateQuestionsFromFAQs(
          undefined,
          difficulty,
          questionCount
        );
        
        if (fallbackQuestions.length === 0) {
          return res.status(404).json({ error: 'No questions could be generated for this topic' });
        }
        
        // Use fallback questions
        questions.push(...fallbackQuestions);
      }
      
      // Create quiz
      const quiz = await quizService.createQuiz({
        title: `${topicArea || 'Allgemein'} Quiz - ${difficulty}`,
        description: `Automatisch generiertes Quiz für ${topicArea || 'Allgemein'}`,
        difficulty_level: difficulty,
        topic_area: topicArea || 'Allgemein',
        time_limit_minutes: 10,
        question_count: questions.length,
        is_active: true,
        created_by: userId
      });
      
      // Save questions
      await quizService.saveQuizQuestions(quiz.id, questions);
      
      return res.json({ quiz, questions: questions.length });
    } catch (error) {
      console.error('Error generating quiz:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Generate quiz from user's chats
  router.post('/quizzes/generate-from-chats', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { count = 5 } = req.body;
      
      // Generate questions from user's chats
      const questions = await quizService.generateQuestionsFromChats(userId, count);
      
      if (questions.length === 0) {
        return res.status(400).json({ error: 'No suitable chat content found for quiz generation' });
      }
      
      // Create quiz
      const quiz = await quizService.createQuiz({
        title: `Persönliches Quiz - ${new Date().toLocaleDateString()}`,
        description: 'Quiz basierend auf Ihren Chat-Unterhaltungen',
        difficulty_level: 'medium',
        topic_area: 'Persönlich',
        time_limit_minutes: 10,
        question_count: questions.length,
        is_active: true,
        created_by: userId
      });
      
      // Save questions
      await quizService.saveQuizQuestions(quiz.id, questions);
      
      return res.json({ quiz, questions: questions.length });
    } catch (error) {
      console.error('Error generating quiz from chats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get quiz details
  router.get('/quizzes/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const quizId = req.params.id;
      const quiz = await quizService.getQuizById(quizId);
      
      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }
      
      return res.json(quiz);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start quiz attempt
  router.post('/quizzes/:id/start', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const quizId = req.params.id;
      const attempt = await quizService.startQuizAttempt(userId, quizId);
      return res.json(attempt);
    } catch (error) {
      console.error('Error starting quiz:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Submit quiz answers
  router.post('/quizzes/:id/submit', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const { attemptId, answers } = req.body;
      
      if (!attemptId || !answers || !Array.isArray(answers)) {
        return res.status(400).json({ error: 'Invalid request data' });
      }
      
      const result = await quizService.submitQuizAnswers(attemptId, answers as UserAnswer[]);
      return res.json(result);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get quiz suggestions
  router.get('/suggestions', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const limit = parseInt(req.query.limit as string) || 3;
      const suggestions = await quizService.getPersonalizedQuizSuggestions(userId, limit);
      return res.json(suggestions);
    } catch (error) {
      console.error('Error fetching quiz suggestions:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user quiz statistics
  router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const stats = await quizService.getUserQuizStats(userId);
      return res.json(stats);
    } catch (error) {
      console.error('Error fetching quiz stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get leaderboard
  router.get('/leaderboard', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const timeframe = req.query.timeframe as 'week' | 'month' | 'all' || 'all';
      
      const leaderboard = await gamificationService.getLeaderboard(limit, timeframe);
      return res.json(leaderboard);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user points
  router.get('/points', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const points = await gamificationService.getUserPoints(userId);
      return res.json(points);
    } catch (error) {
      console.error('Error fetching user points:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get user expertise
  router.get('/expertise', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const expertise = await gamificationService.getUserExpertise(userId);
      return res.json(expertise);
    } catch (error) {
      console.error('Error fetching user expertise:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin routes
  router.get('/admin/all-quizzes', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      console.log(`Admin access attempt - User ID: ${userId}, Role: ${userRole}`);
      
      // Temporary: Allow all authenticated users to access admin functions
      // TODO: Implement proper role-based access control
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const allQuizzes = await quizService.getAllQuizzes();
      return res.json(allQuizzes);
    } catch (error) {
      console.error('Error fetching all quizzes:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/admin/quizzes/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { id } = req.params;
      const updatedQuiz = await quizService.updateQuiz(id, req.body);
      return res.json(updatedQuiz);
    } catch (error) {
      console.error('Error updating quiz:', error);
      return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
    }
  });

  router.delete('/admin/quizzes/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { id } = req.params;
      await quizService.deleteQuiz(id);
      return res.json({ message: 'Quiz deleted successfully' });
    } catch (error) {
      console.error('Error deleting quiz:', error);
      return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
    }
  });

  router.get('/admin/quizzes/:id/questions', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { id } = req.params;
      const questions = await quizService.getQuizQuestions(id);
      return res.json(questions);
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.put('/admin/questions/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { id } = req.params;
      const updatedQuestion = await quizService.updateQuizQuestion(id, req.body);
      return res.json(updatedQuestion);
    } catch (error) {
      console.error('Error updating quiz question:', error);
      return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
    }
  });

  router.delete('/admin/questions/:id', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { id } = req.params;
      await quizService.deleteQuizQuestion(id);
      return res.json({ message: 'Quiz question deleted successfully' });
    } catch (error) {
      console.error('Error deleting quiz question:', error);
      return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
    }
  });

  router.post('/admin/quizzes/:id/questions', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userRole = req.user?.role;
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }
      
      const { id } = req.params;
      const newQuestion = await quizService.addQuizQuestion(id, req.body);
      return res.json(newQuestion);
    } catch (error) {
      console.error('Error adding quiz question:', error);
      return res.status(500).json({ error: (error as Error).message || 'Internal server error' });
    }
  });

  // Create intelligent quiz with semantic search and relevance validation
  router.post('/quizzes/create-intelligent', authenticateToken, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { title, description, difficulty = 'medium', questionCount = 5 } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      console.log(`Creating intelligent quiz: ${title} (${difficulty}, ${questionCount} questions)`);
      
      // Create intelligent quiz
      const { quiz, questions } = await quizService.createIntelligentQuiz(
        title,
        description,
        difficulty,
        questionCount,
        userId
      );
      
      return res.json({ 
        quiz,
        questions: questions.length,
        message: `Intelligent quiz created with ${questions.length} relevant questions`
      });
      
    } catch (error) {
      console.error('Error creating intelligent quiz:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
