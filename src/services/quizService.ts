import { Pool } from 'pg';
import { Quiz, QuizQuestion, UserQuizAttempt, UserAnswer, QuizResult, QuizSuggestion } from '../types/quiz';
import { GeminiService } from './gemini';
import { GamificationService } from './gamification';

export class QuizService {
  private db: Pool;
  private geminiService: GeminiService;
  private gamificationService: GamificationService;

  constructor(db: Pool, geminiService: GeminiService, gamificationService: GamificationService) {
    this.db = db;
    this.geminiService = geminiService;
    this.gamificationService = gamificationService;
  }

  async createQuiz(quiz: Omit<Quiz, 'id' | 'created_at' | 'updated_at'>): Promise<Quiz> {
    const query = `
      INSERT INTO quizzes (title, description, difficulty_level, topic_area, time_limit_minutes, question_count, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      quiz.title,
      quiz.description,
      quiz.difficulty_level,
      quiz.topic_area,
      quiz.time_limit_minutes,
      quiz.question_count,
      quiz.is_active,
      quiz.created_by
    ];

    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async getQuizById(id: string): Promise<Quiz | null> {
    const query = `
      SELECT q.*, 
             json_agg(
               json_build_object(
                 'id', qq.id,
                 'question_text', qq.question_text,
                 'question_type', qq.question_type,
                 'answer_options', qq.answer_options,
                 'explanation', qq.explanation,
                 'difficulty_level', qq.difficulty_level,
                 'points', qq.points
               ) ORDER BY qq.created_at
             ) as questions
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      WHERE q.id = $1 AND q.is_active = true
      GROUP BY q.id
    `;
    
    const result = await this.db.query(query, [id]);
    if (result.rows.length === 0) return null;
    
    const quiz = result.rows[0];
    quiz.questions = quiz.questions.filter((q: any) => q.id !== null);
    return quiz;
  }

  async getAvailableQuizzes(userId: string, limit: number = 10): Promise<Quiz[]> {
    const query = `
      SELECT q.*, 
             COUNT(uqa.id) as attempt_count,
             MAX(uqa.percentage) as best_score
      FROM quizzes q
      LEFT JOIN user_quiz_attempts uqa ON q.id = uqa.quiz_id AND uqa.user_id = $1
      WHERE q.is_active = true
      GROUP BY q.id
      ORDER BY q.created_at DESC
      LIMIT $2
    `;
    
    const result = await this.db.query(query, [userId, limit]);
    return result.rows;
  }

  async generateQuestionsFromFAQs(topicArea?: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium', count: number = 5): Promise<QuizQuestion[]> {
    let faqQuery = `
      SELECT id, title, context, answer, tags
      FROM faqs
      WHERE is_active = true
    `;
    
    const params: any[] = [];
    
    if (topicArea) {
      faqQuery += ` AND tags ? $1`;
      params.push(topicArea);
    }
    
    faqQuery += ` ORDER BY RANDOM() LIMIT $${params.length + 1}`;
    params.push(count * 2); // Fetch more to have options
    
    const faqResult = await this.db.query(faqQuery, params);
    const faqs = faqResult.rows;
    
    const questions: QuizQuestion[] = [];
    
    for (const faq of faqs.slice(0, count)) {
      try {
        const generatedQuestion = await this.geminiService.generateMultipleChoiceQuestion(
          `Titel: ${faq.title}\nKontext: ${faq.context}\nAntwort: ${faq.answer}`,
          difficulty,
          topicArea || 'Allgemein'
        );
        
        questions.push({
          id: '', // Will be set when saved to DB
          quiz_id: '',
          question_text: generatedQuestion.question,
          question_type: 'multiple_choice',
          correct_answer_index: generatedQuestion.correctIndex,
          answer_options: generatedQuestion.options,
          explanation: generatedQuestion.explanation,
          difficulty_level: difficulty,
          points: this.getPointsForDifficulty(difficulty),
          source_faq_id: faq.id,
          created_at: new Date()
        });
      } catch (error) {
        console.error('Error generating question from FAQ:', error);
      }
    }
    
    return questions;
  }

  async generateQuestionsFromChats(userId: string, limit: number = 5): Promise<QuizQuestion[]> {
    const chatQuery = `
      SELECT c.id, c.title, m.content as question, 
             (SELECT m2.content FROM messages m2 WHERE m2.chat_id = c.id AND m2.role = 'assistant' 
              ORDER BY m2.created_at LIMIT 1) as answer
      FROM chats c
      JOIN messages m ON c.id = m.chat_id
      WHERE c.user_id = $1 AND m.role = 'user'
      ORDER BY c.created_at DESC
      LIMIT $2
    `;
    
    const chatResult = await this.db.query(chatQuery, [userId, limit * 2]);
    const chats = chatResult.rows;
    
    const questions: QuizQuestion[] = [];
    
    for (const chat of chats.slice(0, limit)) {
      try {
        if (!chat.answer) continue; // Skip if no assistant response
        
        const generatedQuestion = await this.geminiService.generateMultipleChoiceQuestion(
          `Titel: ${chat.title}\nFrage: ${chat.question}\nAntwort: ${chat.answer}`,
          'medium',
          'Persönlich'
        );
        
        questions.push({
          id: '',
          quiz_id: '',
          question_text: generatedQuestion.question,
          question_type: 'multiple_choice',
          correct_answer_index: generatedQuestion.correctIndex,
          answer_options: generatedQuestion.options,
          explanation: generatedQuestion.explanation,
          difficulty_level: 'medium',
          points: 15,
          source_chat_id: chat.id,
          created_at: new Date()
        });
      } catch (error) {
        console.error('Error generating question from chat:', error);
      }
    }
    
    return questions;
  }

  async saveQuizQuestions(quizId: string, questions: QuizQuestion[]): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      for (const question of questions) {
        const query = `
          INSERT INTO quiz_questions (quiz_id, question_text, question_type, correct_answer_index, answer_options, explanation, difficulty_level, points, source_faq_id, source_chat_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `;
        
        const values = [
          quizId,
          question.question_text,
          question.question_type,
          question.correct_answer_index,
          JSON.stringify(question.answer_options),
          question.explanation,
          question.difficulty_level,
          question.points,
          question.source_faq_id,
          question.source_chat_id
        ];
        
        await client.query(query, values);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async startQuizAttempt(userId: string, quizId: string): Promise<UserQuizAttempt> {
    const query = `
      INSERT INTO user_quiz_attempts (user_id, quiz_id, start_time, is_completed)
      VALUES ($1, $2, CURRENT_TIMESTAMP, false)
      RETURNING *
    `;
    
    const result = await this.db.query(query, [userId, quizId]);
    return result.rows[0];
  }

  async submitQuizAnswers(attemptId: string, answers: UserAnswer[]): Promise<QuizResult> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      // Get attempt details
      const attemptQuery = `
        SELECT uqa.*, q.question_count, q.topic_area
        FROM user_quiz_attempts uqa
        JOIN quizzes q ON uqa.quiz_id = q.id
        WHERE uqa.id = $1
      `;
      const attemptResult = await client.query(attemptQuery, [attemptId]);
      const attempt = attemptResult.rows[0];
      
      // Get quiz questions with correct answers
      const questionsQuery = `
        SELECT id, correct_answer_index, points
        FROM quiz_questions
        WHERE quiz_id = $1
      `;
      const questionsResult = await client.query(questionsQuery, [attempt.quiz_id]);
      const questions = questionsResult.rows;
      
      // Calculate score
      let totalScore = 0;
      let maxScore = 0;
      const evaluatedAnswers: UserAnswer[] = [];
      
      for (const question of questions) {
        maxScore += question.points;
        const userAnswer = answers.find(a => a.question_id === question.id);
        
        if (userAnswer) {
          const isCorrect = userAnswer.selected_answer_index === question.correct_answer_index;
          evaluatedAnswers.push({
            ...userAnswer,
            is_correct: isCorrect
          });
          
          if (isCorrect) {
            totalScore += question.points;
          }
        }
      }
      
      const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      
      // Update attempt
      const updateQuery = `
        UPDATE user_quiz_attempts
        SET end_time = CURRENT_TIMESTAMP,
            score = $1,
            max_score = $2,
            percentage = $3,
            time_spent_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)),
            is_completed = true,
            answers = $4
        WHERE id = $5
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [
        totalScore,
        maxScore,
        percentage,
        JSON.stringify(evaluatedAnswers),
        attemptId
      ]);
      
      const updatedAttempt = updateResult.rows[0];
      
      await client.query('COMMIT');
      
      // Award points and update expertise
      const pointsEarned = await this.gamificationService.awardPoints(
        attempt.user_id,
        totalScore,
        'quiz',
        attemptId
      );
      
      const expertiseUpdates = await this.gamificationService.updateExpertiseLevel(
        attempt.user_id,
        attempt.topic_area || 'Allgemein'
      );
      
      const achievements = await this.gamificationService.checkAchievements(attempt.user_id);
      
      return {
        attempt: updatedAttempt,
        points_earned: pointsEarned,
        expertise_updates: expertiseUpdates,
        achievements
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getPersonalizedQuizSuggestions(userId: string, limit: number = 3): Promise<QuizSuggestion[]> {
    // Get user's recent chat topics
    const chatTopicsQuery = `
      SELECT DISTINCT c.title, COUNT(*) as frequency
      FROM chats c
      WHERE c.user_id = $1 AND c.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
      GROUP BY c.title
      ORDER BY frequency DESC
      LIMIT 5
    `;
    
    const chatTopicsResult = await this.db.query(chatTopicsQuery, [userId]);
    const userTopics = chatTopicsResult.rows.map(row => row.title);
    
    // Get user's quiz history
    const historyQuery = `
      SELECT q.topic_area, AVG(uqa.percentage) as avg_score
      FROM user_quiz_attempts uqa
      JOIN quizzes q ON uqa.quiz_id = q.id
      WHERE uqa.user_id = $1 AND uqa.is_completed = true
      GROUP BY q.topic_area
      ORDER BY avg_score ASC
    `;
    
    const historyResult = await this.db.query(historyQuery, [userId]);
    const weakAreas = historyResult.rows.slice(0, 3);
    
    // Generate suggestions
    const suggestions: QuizSuggestion[] = [];
    
    // Suggest quizzes for weak areas
    for (const area of weakAreas) {
      const quiz = await this.generateQuizForTopic(area.topic_area, 'medium', 5, userId);
      if (quiz) {
        suggestions.push({
          quiz,
          reason: `Verbesserung in ${area.topic_area} (${Math.round(area.avg_score)}% Durchschnitt)`,
          relevance_score: 100 - area.avg_score
        });
      }
    }
    
    // Suggest quizzes for user's interests
    for (const topic of userTopics.slice(0, 2)) {
      const quiz = await this.generateQuizForTopic(topic, 'medium', 5, userId);
      if (quiz) {
        suggestions.push({
          quiz,
          reason: `Basierend auf Ihren Interessen in ${topic}`,
          relevance_score: 80
        });
      }
    }
    
    return suggestions.slice(0, limit);
  }

  private async generateQuizForTopic(topicArea: string, difficulty: 'easy' | 'medium' | 'hard', questionCount: number, createdBy?: string): Promise<Quiz | null> {
    try {
      const questions = await this.generateQuestionsFromFAQs(topicArea, difficulty, questionCount);
      
      if (questions.length === 0) return null;
      
      const quiz = await this.createQuiz({
        title: `${topicArea} Quiz - ${difficulty}`,
        description: `Automatisch generiertes Quiz für ${topicArea}`,
        difficulty_level: difficulty,
        topic_area: topicArea,
        time_limit_minutes: 10,
        question_count: questions.length,
        is_active: true,
        created_by: createdBy
      });
      
      await this.saveQuizQuestions(quiz.id, questions);
      
      return quiz;
    } catch (error) {
      console.error('Error generating quiz for topic:', error);
      return null;
    }
  }

  private getPointsForDifficulty(difficulty: string): number {
    switch (difficulty) {
      case 'easy': return 10;
      case 'medium': return 15;
      case 'hard': return 25;
      default: return 10;
    }
  }

  async getUserQuizStats(userId: string): Promise<any> {
    const query = `
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN is_completed = true THEN 1 END) as completed_attempts,
        AVG(CASE WHEN is_completed = true THEN percentage END) as avg_score,
        MAX(percentage) as best_score,
        SUM(score) as total_points_earned
      FROM user_quiz_attempts
      WHERE user_id = $1
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows[0];
  }

  // Admin functions
  async getAllQuizzes(): Promise<Quiz[]> {
    const query = `
      SELECT q.*, 
             u.full_name as creator_name,
             COUNT(DISTINCT qq.id) as question_count,
             COUNT(DISTINCT uqa.id) as attempt_count
      FROM quizzes q
      LEFT JOIN users u ON q.created_by = u.id
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      LEFT JOIN user_quiz_attempts uqa ON q.id = uqa.quiz_id
      GROUP BY q.id, u.full_name
      ORDER BY q.created_at DESC
    `;
    
    const result = await this.db.query(query);
    return result.rows;
  }

  async updateQuiz(id: string, updates: Partial<Quiz>): Promise<Quiz> {
    const allowedFields = ['title', 'description', 'difficulty_level', 'topic_area', 'time_limit_minutes', 'is_active'];
    const filteredUpdates: any = {};
    
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = (updates as any)[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    const setClause = Object.keys(filteredUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const query = `
      UPDATE quizzes
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, ...Object.values(filteredUpdates)];
    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Quiz not found');
    }
    
    return result.rows[0];
  }

  async deleteQuiz(id: string): Promise<void> {
    const query = `
      UPDATE quizzes
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Quiz not found');
    }
  }

  async getQuizQuestions(quizId: string): Promise<QuizQuestion[]> {
    const query = `
      SELECT * FROM quiz_questions
      WHERE quiz_id = $1
      ORDER BY created_at
    `;
    
    const result = await this.db.query(query, [quizId]);
    return result.rows;
  }

  async updateQuizQuestion(id: string, updates: Partial<QuizQuestion>): Promise<QuizQuestion> {
    const allowedFields = ['question_text', 'question_type', 'correct_answer_index', 'answer_options', 'explanation', 'difficulty_level', 'points'];
    const filteredUpdates: any = {};
    
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = (updates as any)[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Handle JSON fields
    if (filteredUpdates.answer_options) {
      filteredUpdates.answer_options = JSON.stringify(filteredUpdates.answer_options);
    }

    const setClause = Object.keys(filteredUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const query = `
      UPDATE quiz_questions
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [id, ...Object.values(filteredUpdates)];
    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Quiz question not found');
    }
    
    return result.rows[0];
  }

  async deleteQuizQuestion(id: string): Promise<void> {
    const query = `DELETE FROM quiz_questions WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    
    if (result.rowCount === 0) {
      throw new Error('Quiz question not found');
    }
  }

  async addQuizQuestion(quizId: string, question: Omit<QuizQuestion, 'id' | 'quiz_id' | 'created_at'>): Promise<QuizQuestion> {
    const query = `
      INSERT INTO quiz_questions (quiz_id, question_text, question_type, correct_answer_index, answer_options, explanation, difficulty_level, points, source_faq_id, source_chat_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      quizId,
      question.question_text,
      question.question_type,
      question.correct_answer_index,
      JSON.stringify(question.answer_options),
      question.explanation,
      question.difficulty_level,
      question.points,
      question.source_faq_id || null,
      question.source_chat_id || null
    ];
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }
}
