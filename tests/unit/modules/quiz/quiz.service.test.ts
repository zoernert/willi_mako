import { quizService } from '../../../../src/modules/quiz/quiz.service';
import { DatabaseHelper } from '../../../../src/utils/database';
import { GamificationService } from '../../../../src/modules/quiz/gamification.service';
import { GeminiService } from '../../../../src/services/gemini';
import { Quiz, QuizQuestion, UserAnswer } from '../../../../src/modules/quiz/quiz.interface';
import { AppError } from '../../../../src/utils/errors';

jest.mock('../../../../src/utils/database');
jest.mock('../../../../src/modules/quiz/gamification.service');
jest.mock('../../../../src/services/gemini');

const mockQuiz: Quiz = {
    id: 'quiz1',
    title: 'Test Quiz',
    description: 'A quiz for testing',
    difficulty_level: 'medium',
    topic_area: 'testing',
    time_limit_minutes: 10,
    question_count: 1,
    is_active: true,
    created_by: 'user1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    questions: [
        {
            id: 'q1',
            quiz_id: '1',
            question_text: 'Is this a test?',
            question_type: 'single-choice',
            answer_options: ['Yes', 'No'],
            correct_answers: ['Yes'],
            explanation: 'Because it is.',
            difficulty_level: 'easy',
            points: 10,
        }
    ]
};

describe('QuizService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getQuizById', () => {
        it('should return a quiz with questions when found', async () => {
            (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(mockQuiz);
            const quiz = await quizService.getQuizById('quiz1');
            expect(quiz).toEqual(mockQuiz);
            expect(DatabaseHelper.executeQuerySingle).toHaveBeenCalled();
        });

        it('should return null if quiz not found', async () => {
            (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(null);
            const quiz = await quizService.getQuizById('quiz2');
            expect(quiz).toBeNull();
        });
    });

    describe('submitQuizAnswers', () => {
        it('should calculate score and return results', async () => {
            const mockAttempt = { id: 'attempt1', user_id: 'user1', quiz_id: 'quiz1', completed_at: null, started_at: new Date().toISOString() };
            const mockUpdatedAttempt = { ...mockAttempt, completed_at: new Date().toISOString(), score: 10, percentage: 100, is_passed: true };
            const userAnswers: UserAnswer[] = [{ question_id: 'q1', answer: ['Yes'] }];

            (DatabaseHelper.executeQuerySingle as jest.Mock)
                .mockResolvedValueOnce(mockAttempt) // get attempt
                .mockResolvedValueOnce(mockQuiz) // get quiz by id
                .mockResolvedValueOnce(mockUpdatedAttempt); // update attempt

            (GamificationService.prototype.awardBadges as jest.Mock).mockResolvedValue(null);

            const result = await quizService.submitQuizAnswers('attempt1', 'user1', userAnswers);

            expect(result.attempt).toEqual(mockUpdatedAttempt);
            expect(result.correct_answers).toBe(1);
            expect(result.total_questions).toBe(1);
            expect(result.feedback[0].is_correct).toBe(true);
            expect(GamificationService.prototype.awardBadges).toHaveBeenCalled();
        });

        it('should throw an error for an invalid attempt', async () => {
            (DatabaseHelper.executeQuerySingle as jest.Mock).mockResolvedValue(null);
            await expect(quizService.submitQuizAnswers('attempt1', 'user1', [])).rejects.toThrow(new AppError('Invalid or already completed attempt', 400));
        });
    });
});
