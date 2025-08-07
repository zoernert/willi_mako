"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quizService = exports.QuizService = void 0;
const database_1 = require("../../utils/database");
const errors_1 = require("../../utils/errors");
const gemini_1 = require("../../services/gemini");
const gamification_service_1 = require("./gamification.service");
const qdrant_1 = require("../../services/qdrant");
class QuizService {
    constructor() {
        this.geminiService = new gemini_1.GeminiService();
        this.gamificationService = new gamification_service_1.GamificationService();
        this.qdrantService = new qdrant_1.QdrantService();
    }
    async createQuiz(quizData) {
        const query = `
      INSERT INTO quizzes (title, description, difficulty_level, topic_area, time_limit_minutes, question_count, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
        const values = [
            quizData.title,
            quizData.description,
            quizData.difficulty_level,
            quizData.topic_area,
            quizData.time_limit_minutes,
            quizData.question_count,
            quizData.is_active,
            quizData.created_by
        ];
        const newQuiz = await database_1.DatabaseHelper.executeQuerySingle(query, values);
        if (!newQuiz) {
            throw new errors_1.AppError('Failed to create quiz', 500);
        }
        return newQuiz;
    }
    async getQuizById(id, includeInactive = false) {
        const activeFilter = includeInactive ? '' : 'AND q.is_active = true';
        const query = `
      SELECT q.*, 
             json_agg(
               json_build_object(
                 'id', qq.id,
                 'question_text', qq.question_text,
                 'question_type', qq.question_type,
                 'answer_options', qq.answer_options,
                 'correct_answers', qq.correct_answers,
                 'explanation', qq.explanation,
                 'difficulty_level', qq.difficulty_level,
                 'points', qq.points
               ) ORDER BY qq.created_at
             ) as questions
      FROM quizzes q
      LEFT JOIN quiz_questions qq ON q.id = qq.quiz_id
      WHERE q.id = $1 ${activeFilter}
      GROUP BY q.id
    `;
        const quiz = await database_1.DatabaseHelper.executeQuerySingle(query, [id]);
        if (quiz && quiz.questions) {
            // Filter out null questions if no questions exist for the quiz
            quiz.questions = quiz.questions.filter((q) => q.id !== null);
        }
        return quiz;
    }
    async getAvailableQuizzes(userId, limit = 10) {
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
        return database_1.DatabaseHelper.executeQuery(query, [userId, limit]);
    }
    async saveQuizQuestions(quizId, questions) {
        const operations = questions.map(q => {
            const sql = `
            INSERT INTO quiz_questions (quiz_id, question_text, question_type, answer_options, correct_answers, explanation, difficulty_level, points, topic)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;
            const params = [quizId, q.question_text, q.question_type, JSON.stringify(q.answer_options), JSON.stringify(q.correct_answers), q.explanation, q.difficulty_level, q.points, q.topic];
            return (client) => client.query(sql, params);
        });
        await database_1.DatabaseHelper.executeTransaction(operations);
    }
    async startQuizAttempt(userId, quizId) {
        const query = `
        INSERT INTO user_quiz_attempts (user_id, quiz_id)
        VALUES ($1, $2)
        RETURNING *
    `;
        const attempt = await database_1.DatabaseHelper.executeQuerySingle(query, [userId, quizId]);
        if (!attempt) {
            throw new errors_1.AppError('Could not start quiz attempt', 500);
        }
        return attempt;
    }
    async submitQuizAnswers(attemptId, userId, answers) {
        const attempt = await database_1.DatabaseHelper.executeQuerySingle('SELECT * FROM user_quiz_attempts WHERE id = $1 AND user_id = $2', [attemptId, userId]);
        if (!attempt || attempt.completed_at) {
            throw new errors_1.AppError('Invalid or already completed attempt', 400);
        }
        const quiz = await this.getQuizById(attempt.quiz_id);
        if (!quiz || !quiz.questions) {
            throw new errors_1.AppError('Quiz not found', 404);
        }
        let score = 0;
        let correctCount = 0;
        const feedback = [];
        for (const userAnswer of answers) {
            const question = quiz.questions.find(q => q.id === userAnswer.question_id);
            if (!question)
                continue;
            const isCorrect = this.checkAnswer(userAnswer, question);
            if (isCorrect) {
                score += question.points;
                correctCount++;
            }
            feedback.push({
                question_id: question.id,
                question_text: question.question_text,
                user_answer: userAnswer.answer,
                correct_answers: question.correct_answers,
                is_correct: isCorrect,
                explanation: question.explanation
            });
        }
        const percentage = (correctCount / quiz.questions.length) * 100;
        // Calculate time taken with error handling
        let timeTaken = 0;
        try {
            const startTime = new Date(attempt.start_time).getTime();
            const endTime = new Date().getTime();
            if (!isNaN(startTime) && !isNaN(endTime)) {
                timeTaken = Math.round((endTime - startTime) / 1000);
            }
        }
        catch (error) {
            console.error('Error calculating time taken:', error);
            timeTaken = 0;
        }
        const updateQuery = `
        UPDATE user_quiz_attempts
        SET completed_at = CURRENT_TIMESTAMP, score = $1, percentage = $2, is_passed = $3, time_spent_seconds = $4, answers = $5
        WHERE id = $6
        RETURNING *
    `;
        const updatedAttempt = await database_1.DatabaseHelper.executeQuerySingle(updateQuery, [score, percentage, percentage >= 50, timeTaken, JSON.stringify(answers), attemptId]);
        if (!updatedAttempt) {
            throw new errors_1.AppError('Failed to update quiz attempt', 500);
        }
        // Ensure numeric fields are properly converted from database strings
        if (updatedAttempt.percentage && typeof updatedAttempt.percentage === 'string') {
            updatedAttempt.percentage = parseFloat(updatedAttempt.percentage);
        }
        if (updatedAttempt.score && typeof updatedAttempt.score === 'string') {
            updatedAttempt.score = parseInt(updatedAttempt.score);
        }
        if (updatedAttempt.time_spent_seconds !== null && updatedAttempt.time_spent_seconds !== undefined) {
            if (typeof updatedAttempt.time_spent_seconds === 'string') {
                updatedAttempt.time_spent_seconds = parseInt(updatedAttempt.time_spent_seconds);
            }
        }
        else {
            updatedAttempt.time_spent_seconds = 0;
        }
        const badgeEarned = await this.gamificationService.awardBadges(userId, {
            quizId: quiz.id,
            score: percentage,
            topic: quiz.topic_area
        });
        return {
            attempt: updatedAttempt,
            correct_answers: correctCount,
            total_questions: quiz.questions.length,
            feedback,
            badge_earned: badgeEarned
        };
    }
    async getQuizResult(attemptId, userId) {
        const attempt = await database_1.DatabaseHelper.executeQuerySingle('SELECT * FROM user_quiz_attempts WHERE id = $1 AND user_id = $2', [attemptId, userId]);
        if (!attempt || !attempt.completed_at) {
            throw new errors_1.AppError('Quiz attempt not found or not completed', 404);
        }
        // Ensure numeric fields are properly converted from database strings
        if (attempt.percentage && typeof attempt.percentage === 'string') {
            attempt.percentage = parseFloat(attempt.percentage);
        }
        if (attempt.score && typeof attempt.score === 'string') {
            attempt.score = parseInt(attempt.score);
        }
        if (attempt.time_spent_seconds !== null && attempt.time_spent_seconds !== undefined) {
            if (typeof attempt.time_spent_seconds === 'string') {
                attempt.time_spent_seconds = parseInt(attempt.time_spent_seconds);
            }
        }
        else {
            attempt.time_spent_seconds = 0;
        }
        const quiz = await this.getQuizById(attempt.quiz_id);
        if (!quiz || !quiz.questions) {
            throw new errors_1.AppError('Quiz not found for this attempt', 404);
        }
        const userAnswers = attempt.answers;
        let correctCount = 0;
        const feedback = [];
        for (const userAnswer of userAnswers) {
            const question = quiz.questions.find(q => q.id === userAnswer.question_id);
            if (!question)
                continue;
            const isCorrect = this.checkAnswer(userAnswer, question);
            if (isCorrect) {
                correctCount++;
            }
            feedback.push({
                question_id: question.id,
                question_text: question.question_text,
                user_answer: userAnswer.answer,
                correct_answers: question.correct_answers,
                is_correct: isCorrect,
                explanation: question.explanation
            });
        }
        return {
            attempt,
            correct_answers: correctCount,
            total_questions: quiz.questions.length,
            feedback,
            badge_earned: null // Badge info could be retrieved if needed
        };
    }
    checkAnswer(userAnswer, question) {
        console.log('Checking answer:', {
            userAnswer: userAnswer.answer,
            correctAnswers: question.correct_answers,
            correctAnswerIndex: question.correct_answer_index
        });
        // Handle both legacy string-based answers and new index-based answers
        if (question.correct_answers && Array.isArray(question.correct_answers) && question.correct_answers.length > 0) {
            // New index-based system
            const correctIndices = new Set(question.correct_answers.map(a => Number(a)));
            // Handle user answers - convert to numbers and ensure it's an array
            let userAnswerArray = Array.isArray(userAnswer.answer) ? userAnswer.answer : [userAnswer.answer];
            const userIndices = new Set(userAnswerArray.map(a => {
                if (typeof a === 'string') {
                    return parseInt(a);
                }
                return Number(a);
            }));
            console.log('Comparing sets:', { correctIndices: Array.from(correctIndices), userIndices: Array.from(userIndices) });
            if (correctIndices.size !== userIndices.size) {
                return false;
            }
            for (const index of userIndices) {
                if (!correctIndices.has(index)) {
                    return false;
                }
            }
            return true;
        }
        else if (question.correct_answer_index !== undefined && question.correct_answer_index !== null) {
            // Legacy single answer system
            const userIndex = Array.isArray(userAnswer.answer) ? userAnswer.answer[0] : userAnswer.answer;
            const normalizedUserIndex = typeof userIndex === 'string' ? parseInt(userIndex) : Number(userIndex);
            return normalizedUserIndex === Number(question.correct_answer_index);
        }
        console.log('No valid answer format found');
        return false;
    }
    // --- Admin Methods ---
    async getAllQuizzesForAdmin() {
        const query = `
      SELECT 
        q.*,
        COALESCE(u.full_name, u.name, u.email) as creator_name,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count,
        (SELECT COUNT(*) FROM user_quiz_attempts WHERE quiz_id = q.id) as attempt_count
      FROM quizzes q
      LEFT JOIN users u ON q.created_by = u.id
      ORDER BY q.created_at DESC
    `;
        return database_1.DatabaseHelper.executeQuery(query, []);
    }
    async getQuizQuestionsForAdmin(quizId) {
        const query = `
      SELECT * FROM quiz_questions 
      WHERE quiz_id = $1 
      ORDER BY created_at ASC
    `;
        return database_1.DatabaseHelper.executeQuery(query, [quizId]);
    }
    async updateQuizAsAdmin(quizId, quizData) {
        // We need to build the query dynamically based on the fields provided
        const fields = Object.keys(quizData).filter(k => k !== 'id');
        const values = fields.map(k => quizData[k]);
        if (fields.length === 0) {
            throw new errors_1.AppError('No fields to update', 400);
        }
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const query = `
      UPDATE quizzes
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;
        const updatedQuiz = await database_1.DatabaseHelper.executeQuerySingle(query, [...values, quizId]);
        if (!updatedQuiz) {
            throw new errors_1.AppError('Quiz not found or failed to update', 404);
        }
        return updatedQuiz;
    }
    async deleteQuizAsAdmin(quizId) {
        // Using a transaction to delete the quiz and all its related data
        // Note: user_quiz_attempts will be automatically deleted due to CASCADE constraint
        const operations = [
            (client) => client.query('DELETE FROM quiz_questions WHERE quiz_id = $1', [quizId]),
            (client) => client.query('DELETE FROM quizzes WHERE id = $1', [quizId]),
        ];
        await database_1.DatabaseHelper.executeTransaction(operations);
    }
    async updateQuizQuestionAsAdmin(questionId, questionData) {
        const fields = Object.keys(questionData).filter(k => k !== 'id' && k !== 'quiz_id');
        const values = fields.map(k => questionData[k]);
        if (fields.length === 0) {
            throw new errors_1.AppError('No fields to update', 400);
        }
        // Handle JSON fields
        if (questionData.answer_options) {
            const index = fields.indexOf('answer_options');
            values[index] = JSON.stringify(values[index]);
        }
        if (questionData.correct_answers) {
            const index = fields.indexOf('correct_answers');
            values[index] = JSON.stringify(values[index]);
        }
        const setClause = fields.map((field, index) => `${field} = $${index + 1}`).join(', ');
        const query = `
      UPDATE quiz_questions
      SET ${setClause}
      WHERE id = $${fields.length + 1}
      RETURNING *
    `;
        const updatedQuestion = await database_1.DatabaseHelper.executeQuerySingle(query, [...values, questionId]);
        if (!updatedQuestion) {
            throw new errors_1.AppError('Question not found or failed to update', 404);
        }
        return updatedQuestion;
    }
    async deleteQuizQuestionAsAdmin(questionId) {
        const query = 'DELETE FROM quiz_questions WHERE id = $1';
        await database_1.DatabaseHelper.executeQuery(query, [questionId]);
    }
    async generateIntelligentQuiz(topic, numQuestions, difficulty, userId) {
        // 1. Find relevant content from the knowledge base
        const searchResults = await this.qdrantService.searchByText(topic, numQuestions);
        if (searchResults.length === 0) {
            throw new errors_1.AppError(`No content found for topic: ${topic}`, 404);
        }
        const sourceContent = searchResults.map((r) => r.payload.text);
        // 2. Generate questions using Gemini
        const generatedQuestionsRaw = await this.geminiService.generateQuizQuestions(sourceContent, numQuestions, difficulty, topic);
        // 3. Map the raw questions to the QuizQuestion format
        const generatedQuestions = generatedQuestionsRaw.map(q => ({
            question_text: q.question,
            question_type: 'multiple_choice', // Fix the type to match database
            answer_options: q.options,
            correct_answers: [q.correctIndex], // Store as array of indices, not strings
            explanation: q.explanation,
            difficulty_level: difficulty,
            points: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 10 : 15,
            topic: topic,
        }));
        const quizTitle = `Intelligentes Quiz: ${topic}`;
        const quizDescription = `Ein automatisch generiertes Quiz zum Thema ${topic} mit der Schwierigkeit ${difficulty}.`;
        const quizData = {
            title: quizTitle,
            description: quizDescription,
            difficulty_level: difficulty,
            topic_area: topic,
            time_limit_minutes: Math.round(numQuestions * 1.5), // 1.5 minutes per question, rounded to integer
            question_count: generatedQuestions.length,
            is_active: true, // Auto-generated quizzes should be active immediately
            created_by: userId,
        };
        const newQuiz = await this.createQuiz(quizData);
        // We need to adapt saveQuizQuestions to handle the new format without id
        const questionsToSave = generatedQuestions.map(q => (Object.assign(Object.assign({}, q), { quiz_id: newQuiz.id })));
        await this.saveQuizQuestions(newQuiz.id, questionsToSave);
        const finalQuiz = await this.getQuizById(newQuiz.id);
        if (!finalQuiz) {
            throw new errors_1.AppError('Failed to retrieve newly created quiz.', 500);
        }
        return finalQuiz;
    }
    async getUserQuizzes(userId) {
        return this.getAvailableQuizzes(userId);
    }
    async getQuizSuggestions(userId) {
        // Get user's completed quizzes and preferences to suggest relevant ones
        const query = `
      SELECT DISTINCT q.topic_area, q.difficulty_level, COUNT(*) as quiz_count
      FROM quizzes q
      JOIN user_quiz_attempts ua ON q.id = ua.quiz_id
      WHERE ua.user_id = $1 AND ua.completed_at IS NOT NULL
      GROUP BY q.topic_area, q.difficulty_level
      ORDER BY COUNT(*) DESC
      LIMIT 5
    `;
        const userTopics = await database_1.DatabaseHelper.executeQuery(query, [userId]);
        // Generate suggestions based on completed topics
        const suggestions = [];
        for (const topic of userTopics) {
            // Find similar quizzes not yet taken
            const suggestionQuery = `
        SELECT q.* FROM quizzes q
        WHERE q.topic_area = $1 
        AND q.difficulty_level = $2
        AND q.is_active = true
        AND q.id NOT IN (
          SELECT DISTINCT quiz_id FROM user_quiz_attempts WHERE user_id = $3
        )
        ORDER BY q.created_at DESC
        LIMIT 1
      `;
            const suggestedQuizzes = await database_1.DatabaseHelper.executeQuery(suggestionQuery, [topic.topic_area, topic.difficulty_level, userId]);
            if (suggestedQuizzes.length > 0) {
                suggestions.push({
                    quiz: suggestedQuizzes[0],
                    reason: `Based on your interest in ${topic.topic_area}`,
                    relevance_score: 85
                });
            }
        }
        return suggestions;
    }
    async getUserStats(userId) {
        const query = `
      SELECT 
        COUNT(*) as total_attempts,
        COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed_attempts,
        COALESCE(AVG(CASE WHEN completed_at IS NOT NULL THEN score END), 0) as avg_score,
        COALESCE(MAX(score), 0) as best_score,
        COALESCE(SUM(score), 0) as total_points_earned
      FROM user_quiz_attempts
      WHERE user_id = $1
    `;
        const stats = await database_1.DatabaseHelper.executeQuerySingle(query, [userId]);
        return stats || {
            total_attempts: 0,
            completed_attempts: 0,
            avg_score: 0,
            best_score: 0,
            total_points_earned: 0
        };
    }
    async generateQuizFromTopic(topicArea, difficulty, questionCount, userId) {
        return this.generateIntelligentQuiz(topicArea, questionCount, difficulty, userId);
    }
    async generateQuizFromChats(userId, questionCount) {
        // Get recent chat messages from the user to generate context-based quiz
        const chatQuery = `
      SELECT m.content as message, m.created_at
      FROM messages m
      JOIN chats c ON m.chat_id = c.id
      WHERE c.user_id = $1 AND m.role = 'user'
      ORDER BY m.created_at DESC
      LIMIT 50
    `;
        const chatMessages = await database_1.DatabaseHelper.executeQuery(chatQuery, [userId]);
        if (chatMessages.length === 0) {
            throw new errors_1.AppError('No chat messages found to generate quiz from', 400);
        }
        // Extract topics from chat messages using AI
        const chatContent = chatMessages.map(msg => msg.message).join(' ');
        // Simple topic extraction - in production this could use more sophisticated AI
        const topics = ['General Knowledge', 'Technology', 'Science', 'History'];
        const topic = topics[Math.floor(Math.random() * topics.length)];
        return this.generateIntelligentQuiz(topic, questionCount, 'medium', userId);
    }
}
exports.QuizService = QuizService;
exports.quizService = new QuizService();
//# sourceMappingURL=quiz.service.js.map