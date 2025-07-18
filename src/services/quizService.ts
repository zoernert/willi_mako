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
    let relevantFaqs: any[] = [];
    
    if (topicArea) {
      console.log(`Generating questions for topic: "${topicArea}"`);
      
      // First, use smart keyword search to find relevant FAQs
      relevantFaqs = await this.findRelevantFAQs(topicArea, count * 4); // Get more candidates
      
      console.log(`Found ${relevantFaqs.length} candidate FAQs for topic: "${topicArea}"`);
      
      // If no relevant FAQs found, try with broader search
      if (relevantFaqs.length === 0) {
        console.log(`No FAQs found for "${topicArea}", trying broader search...`);
        
        // Extract first word from topic and try again
        const firstWord = topicArea.split(/[\s-]+/)[0];
        if (firstWord && firstWord.length > 2) {
          relevantFaqs = await this.findRelevantFAQs(firstWord, count * 2);
          console.log(`Broader search for "${firstWord}" returned ${relevantFaqs.length} FAQs`);
        }
      }
      
      // If still no results, fall back to general search
      if (relevantFaqs.length === 0) {
        console.log(`No FAQs found for topic, using general FAQ search...`);
        const generalQuery = `
          SELECT id, title, context, answer, tags
          FROM faqs
          WHERE is_active = true
          ORDER BY created_at DESC
          LIMIT $1
        `;
        const generalResult = await this.db.query(generalQuery, [count * 2]);
        relevantFaqs = generalResult.rows;
      }
    } else {
      // If no topic specified, get recent FAQs
      const faqQuery = `
        SELECT id, title, context, answer, tags
        FROM faqs
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT $1
      `;
      const faqResult = await this.db.query(faqQuery, [count * 2]);
      relevantFaqs = faqResult.rows;
    }
    
    console.log(`Total FAQs available for processing: ${relevantFaqs.length}`);
    
    const faqs = relevantFaqs;
    
    const questions: QuizQuestion[] = [];
    
    // Filter and validate FAQs for relevance
    const validatedFaqs: any[] = [];
    
    console.log(`Starting FAQ validation for topic: "${topicArea}"`);
    
    for (const faq of faqs.slice(0, count * 3)) { // Process more candidates
      if (topicArea && topicArea !== 'undefined') {
        const isRelevant = await this.validateFAQRelevance(faq, topicArea);
        if (isRelevant) {
          validatedFaqs.push(faq);
          console.log(`✓ FAQ "${faq.title}" validated as relevant`);
        } else {
          console.log(`✗ FAQ "${faq.title}" rejected as not relevant`);
        }
      } else {
        validatedFaqs.push(faq);
      }
      
      // Stop if we have enough relevant FAQs
      if (validatedFaqs.length >= count) {
        break;
      }
    }
    
    // Use the validated FAQs for question generation
    const selectedFaqs = validatedFaqs.slice(0, count);
    
    console.log(`Selected ${selectedFaqs.length} validated FAQs for topic: "${topicArea}"`);
    
    if (selectedFaqs.length === 0) {
      console.warn(`No relevant FAQs found for topic: "${topicArea}"`);
      return questions; // Return empty array instead of generic questions
    }
    
    for (const faq of selectedFaqs) {
      try {
        // Enhanced context for better question generation
        const enhancedContext = `
          Quiz-Thema: ${topicArea || 'Allgemein'}
          
          FAQ-Informationen:
          Titel: ${faq.title}
          Kontext: ${faq.context}
          Vollständige Antwort: ${faq.answer}
          
          Zusatzinformationen:
          - Diese FAQ ist relevant für das Quiz-Thema "${topicArea}"
          - Erstelle eine präzise Frage, die das Kernwissen aus dieser FAQ testet
          - Die Frage sollte praxisrelevant und eindeutig beantwortbar sein
        `;
        
        // Add delay between API calls to avoid rate limiting
        if (questions.length > 0) {
          await this.delay(1000); // 1 second delay between questions
        }
        
        const generatedQuestion = await this.geminiService.generateMultipleChoiceQuestion(
          enhancedContext,
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
        
        console.log(`Generated question from FAQ: ${faq.title}`);
        
      } catch (error) {
        console.error('Error generating question from FAQ:', faq.title, error);
        // Continue with other FAQs instead of failing completely
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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  private async findRelevantFAQs(topicArea: string, limit: number): Promise<any[]> {
    try {
      console.log(`Searching for relevant FAQs for topic: "${topicArea}"`);
      
      // Extract keywords from the topic area
      const keywords = this.extractKeywords(topicArea);
      console.log(`Extracted keywords: ${keywords.join(', ')}`);
      
      // Smart keyword-based search with relevance scoring
      const searchQuery = `
        SELECT id, title, context, answer, tags,
               (
                 -- Title match gets highest score
                 CASE 
                   WHEN LOWER(title) LIKE LOWER($1) THEN 10.0
                   WHEN LOWER(title) LIKE LOWER($2) THEN 8.0
                   WHEN LOWER(title) LIKE LOWER($3) THEN 6.0
                   ELSE 0
                 END +
                 -- Context match gets medium score
                 CASE 
                   WHEN LOWER(context) LIKE LOWER($1) THEN 6.0
                   WHEN LOWER(context) LIKE LOWER($2) THEN 4.0
                   WHEN LOWER(context) LIKE LOWER($3) THEN 2.0
                   ELSE 0
                 END +
                 -- Answer match gets lower score
                 CASE 
                   WHEN LOWER(answer) LIKE LOWER($1) THEN 4.0
                   WHEN LOWER(answer) LIKE LOWER($2) THEN 2.0
                   WHEN LOWER(answer) LIKE LOWER($3) THEN 1.0
                   ELSE 0
                 END +
                 -- Tag match gets bonus
                 CASE 
                   WHEN tags ? $4 THEN 5.0
                   WHEN tags ? $5 THEN 3.0
                   WHEN tags ? $6 THEN 1.0
                   ELSE 0
                 END
               ) as relevance_score
        FROM faqs
        WHERE is_active = true
          AND (
            LOWER(title) LIKE LOWER($1) OR
            LOWER(title) LIKE LOWER($2) OR
            LOWER(title) LIKE LOWER($3) OR
            LOWER(context) LIKE LOWER($1) OR
            LOWER(context) LIKE LOWER($2) OR
            LOWER(context) LIKE LOWER($3) OR
            LOWER(answer) LIKE LOWER($1) OR
            LOWER(answer) LIKE LOWER($2) OR
            LOWER(answer) LIKE LOWER($3) OR
            tags ? $4 OR
            tags ? $5 OR
            tags ? $6
          )
        ORDER BY relevance_score DESC
        LIMIT $7
      `;
      
      // Prepare search patterns
      const patterns = [
        `%${keywords[0] || topicArea}%`,
        `%${keywords[1] || topicArea}%`,
        `%${keywords[2] || topicArea}%`
      ];
      
      // Use keywords for tag matching
      const tagKeywords = [
        keywords[0] || topicArea,
        keywords[1] || topicArea,
        keywords[2] || topicArea
      ];
      
      const result = await this.db.query(searchQuery, [
        ...patterns,
        ...tagKeywords,
        limit
      ]);
      
      console.log(`Found ${result.rows.length} FAQs with relevance scores`);
      
      // Filter out very low relevance scores
      const relevantFaqs = result.rows.filter(faq => faq.relevance_score > 0.5);
      
      return relevantFaqs;
      
    } catch (error) {
      console.error('Error in findRelevantFAQs:', error);
      
      // Final fallback: simple search
      const fallbackQuery = `
        SELECT id, title, context, answer, tags, 1.0 as relevance_score
        FROM faqs
        WHERE is_active = true
          AND (
            LOWER(title) LIKE LOWER($1) OR
            LOWER(context) LIKE LOWER($1) OR
            LOWER(answer) LIKE LOWER($1)
          )
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const fallbackResult = await this.db.query(fallbackQuery, [`%${topicArea}%`, limit]);
      console.log(`Fallback search returned ${fallbackResult.rows.length} FAQs`);
      
      return fallbackResult.rows;
    }
  }
  
  private extractKeywords(text: string): string[] {
    // Remove special characters and split by common separators
    const cleanText = text.replace(/[^\w\s-]/g, ' ').toLowerCase();
    const words = cleanText.split(/[\s-]+/).filter(word => word.length > 2);
    
    // Remove common stop words
    const stopWords = ['der', 'die', 'das', 'und', 'oder', 'mit', 'von', 'für', 'in', 'zu', 'auf', 'bei', 'nach', 'über', 'unter', 'durch', 'gegen', 'ohne', 'um'];
    const keywords = words.filter(word => !stopWords.includes(word));
    
    // Return top 3 keywords
    return keywords.slice(0, 3);
  }

  private async validateFAQRelevance(faq: any, topicArea: string): Promise<boolean> {
    try {
      // Extract keywords from topic area
      const topicKeywords = this.extractKeywords(topicArea);
      
      // Simple keyword matching validation first
      const faqText = `${faq.title} ${faq.context} ${faq.answer}`.toLowerCase();
      const topicLower = topicArea.toLowerCase();
      
      // Check if FAQ contains any of the topic keywords
      const hasKeywordMatch = topicKeywords.some(keyword => 
        faqText.includes(keyword.toLowerCase())
      );
      
      // Check if FAQ title/context is directly related to topic
      const hasDirectMatch = faqText.includes(topicLower) || 
                           topicLower.includes(faq.title.toLowerCase().substring(0, 10));
      
      // If there's a strong keyword or direct match, it's likely relevant
      if (hasKeywordMatch || hasDirectMatch) {
        console.log(`FAQ "${faq.title}" passed keyword validation for topic: ${topicArea}`);
        
        // Optional: Use LLM for final validation only for borderline cases
        if (faq.relevance_score && faq.relevance_score < 3.0) {
          return await this.validateWithLLM(faq, topicArea);
        }
        
        return true;
      }
      
      // If no keyword match, use LLM validation
      console.log(`FAQ "${faq.title}" requires LLM validation for topic: ${topicArea}`);
      return await this.validateWithLLM(faq, topicArea);
      
    } catch (error) {
      console.error('Error validating FAQ relevance:', error);
      // In case of error, assume it's relevant to avoid blocking
      return true;
    }
  }
  
  private async validateWithLLM(faq: any, topicArea: string): Promise<boolean> {
    try {
      const validationPrompt = `
        Quiz-Thema: "${topicArea}"
        
        FAQ-Titel: "${faq.title}"
        FAQ-Kontext: "${faq.context}"
        FAQ-Antwort: "${faq.answer}"
        
        Ist diese FAQ für ein Quiz zum Thema "${topicArea}" relevant?
        
        Bewertungskriterien:
        - Bezieht sich die FAQ direkt auf das Quiz-Thema?
        - Enthält die FAQ nützliche Informationen zum Thema?
        - Kann aus dieser FAQ eine sinnvolle Quizfrage erstellt werden?
        
        Antworten Sie nur mit "JA" oder "NEIN" und einer kurzen Begründung (max. 20 Wörter).
      `;
      
      const response = await this.geminiService.generateText(validationPrompt);
      const isRelevant = response.toUpperCase().includes('JA');
      
      console.log(`LLM Validation - Topic: ${topicArea}, FAQ: ${faq.title}, Relevant: ${isRelevant}, Response: ${response.substring(0, 100)}...`);
      
      return isRelevant;
      
    } catch (error) {
      console.error('Error in LLM validation:', error);
      return false; // Be more conservative with LLM errors
    }
  }

  async createIntelligentQuiz(title: string, description: string, difficulty: 'easy' | 'medium' | 'hard', questionCount: number, createdBy?: string): Promise<{ quiz: Quiz; questions: QuizQuestion[] }> {
    try {
      // Extract topic area from title and description
      const topicExtractionPrompt = `
        Titel: "${title}"
        Beschreibung: "${description}"
        
        Extrahiere das Hauptthema oder die Kernbegriffe aus diesem Quiz-Titel und der Beschreibung.
        Antworte nur mit den wichtigsten Suchbegriffen (maximal 3-5 Begriffe), getrennt durch Kommas.
        
        Beispiel:
        - Für "APERAK - Arbeiten mit Anwendungsfehlern" -> "APERAK, Anwendungsfehler, Fehlerbehebung"
        - Für "EDI Nachrichten im Energiebereich" -> "EDI, Energiebereich, Nachrichten"
      `;
      
      const topicKeywords = await this.geminiService.generateText(topicExtractionPrompt);
      const extractedTopics = topicKeywords.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      console.log(`Extracted topics for quiz "${title}": ${extractedTopics.join(', ')}`);
      
      // Find relevant FAQs for each topic
      let allRelevantFaqs: any[] = [];
      
      for (const topic of extractedTopics) {
        const topicFaqs = await this.findRelevantFAQs(topic, questionCount);
        allRelevantFaqs = allRelevantFaqs.concat(topicFaqs);
      }
      
      // Remove duplicates
      const uniqueFaqs = Array.from(
        new Map(allRelevantFaqs.map(faq => [faq.id, faq])).values()
      );
      
      console.log(`Found ${uniqueFaqs.length} unique FAQs for quiz topics`);
      
      // Validate relevance for all FAQs
      const validatedFaqs: any[] = [];
      
      for (const faq of uniqueFaqs) {
        const isRelevant = await this.validateFAQRelevance(faq, title);
        if (isRelevant) {
          validatedFaqs.push(faq);
        }
        
        // Stop if we have enough relevant FAQs
        if (validatedFaqs.length >= questionCount) {
          break;
        }
      }
      
      if (validatedFaqs.length < questionCount) {
        console.warn(`Only found ${validatedFaqs.length} relevant FAQs for ${questionCount} questions`);
      }
      
      // Create the quiz
      const quiz = await this.createQuiz({
        title,
        description,
        difficulty_level: difficulty,
        topic_area: extractedTopics.join(', '),
        time_limit_minutes: questionCount * 2, // 2 minutes per question
        question_count: Math.min(validatedFaqs.length, questionCount),
        is_active: true,
        created_by: createdBy
      });
      
      // Generate questions from validated FAQs
      const questions: QuizQuestion[] = [];
      
      for (const faq of validatedFaqs.slice(0, questionCount)) {
        try {
          const enhancedContext = `
            Quiz-Titel: "${title}"
            Quiz-Beschreibung: "${description}"
            
            FAQ-Informationen:
            Titel: ${faq.title}
            Kontext: ${faq.context}
            Vollständige Antwort: ${faq.answer}
            
            Erstelle eine Multiple-Choice-Frage, die:
            1. Direkt zum Quiz-Thema passt
            2. Das Kernwissen aus dieser FAQ testet
            3. Praxisrelevant und präzise ist
            4. Eindeutig beantwortbar ist
          `;
          
          const generatedQuestion = await this.geminiService.generateMultipleChoiceQuestion(
            enhancedContext,
            difficulty,
            title
          );
          
          questions.push({
            id: '', // Will be set when saved to DB
            quiz_id: quiz.id,
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
          
          console.log(`Generated intelligent question from FAQ: ${faq.title}`);
          
        } catch (error) {
          console.error('Error generating intelligent question from FAQ:', faq.title, error);
        }
      }
      
      // Save questions to database
      await this.saveQuizQuestions(quiz.id, questions);
      
      // Update quiz with actual question count
      await this.updateQuiz(quiz.id, { question_count: questions.length });
      
      console.log(`Created intelligent quiz "${title}" with ${questions.length} questions`);
      
      return { quiz, questions };
      
    } catch (error) {
      console.error('Error creating intelligent quiz:', error);
      throw new Error('Failed to create intelligent quiz');
    }
  }
}
