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
        return res.status(404).json({ error: 'No questions could be generated for this topic' });
      }
      
      // Create quiz
      const quiz = await quizService.createQuiz({
        title: `${topicArea || 'Allgemein'} Quiz - ${difficulty}`,
        description: `Automatisch generiertes Quiz für ${topicArea || 'Allgemein'}`,
        difficulty_level: difficulty,
        topic_area: topicArea,
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

  return router;
}
