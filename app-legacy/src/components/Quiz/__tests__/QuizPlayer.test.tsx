import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import QuizPlayer from '../QuizPlayer';

// Mock quiz API
const mockGetQuiz = jest.fn();
const mockStartQuiz = jest.fn();
const mockSubmitQuiz = jest.fn();

jest.mock('../../../services/quizApi', () => ({
  quizApi: {
    getQuiz: (...args: any[]) => mockGetQuiz(...args),
    startQuiz: (...args: any[]) => mockStartQuiz(...args),
    submitQuiz: (...args: any[]) => mockSubmitQuiz(...args),
  }
}));

describe('QuizPlayer', () => {
  const fakeQuiz = {
    id: 'quiz-1',
    title: 'Test Quiz',
    description: 'Beschreibung',
    difficulty_level: 'easy',
    topic_area: 'Allgemein',
    time_limit_minutes: 10,
    question_count: 2,
    is_active: true,
    created_by: 'u1',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
    questions: [
      {
        id: 'q1',
        quiz_id: 'quiz-1',
        question_text: 'Erste Frage?',
        question_type: 'single-choice',
        answer_options: ['A1', 'B1'],
        correct_answers: ['0'],
        explanation: 'Erklärung 1',
        difficulty_level: 'easy',
        points: 1,
        topic: 't1'
      },
      {
        id: 'q2',
        quiz_id: 'quiz-1',
        question_text: 'Zweite Frage?',
        question_type: 'multiple-choice',
        answer_options: ['A2', 'B2', 'C2'],
        correct_answers: ['0', '2'],
        explanation: 'Erklärung 2',
        difficulty_level: 'easy',
        points: 1,
        topic: 't2'
      }
    ]
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockGetQuiz.mockResolvedValue(fakeQuiz);
    mockStartQuiz.mockResolvedValue({ id: 'attempt-1', user_id: 'u1', quiz_id: 'quiz-1', started_at: new Date().toISOString(), score: 0, percentage: 0, is_passed: false, time_taken_seconds: 0 });

    mockSubmitQuiz.mockImplementation((_quizId: string, _attemptId: string, answers: Array<{ question_id: string; answer: string[] }>) => {
      // Build a simple result echoing answers
      const feedback = answers.map((a) => {
        const q = fakeQuiz.questions!.find((qq) => qq.id === a.question_id)!;
        const sortedUser = [...a.answer].sort();
        const sortedCorrect = [...q.correct_answers].sort();
        const isCorrect = sortedUser.length === sortedCorrect.length && sortedCorrect.every((v, i) => v === sortedUser[i]);
        return {
          question_id: q.id!,
          question_text: q.question_text,
          user_answer: a.answer,
          correct_answers: q.correct_answers,
          is_correct: isCorrect,
          explanation: q.explanation,
        };
      });
      const correct_answers = feedback.filter(f => f.is_correct).length;
      const total_questions = fakeQuiz.question_count;
      return Promise.resolve({
        attempt: { id: 'attempt-1', user_id: 'u1', quiz_id: 'quiz-1', started_at: new Date().toISOString(), completed_at: new Date().toISOString(), score: correct_answers, percentage: (correct_answers/total_questions)*100, is_passed: correct_answers === total_questions, time_taken_seconds: 5 },
        correct_answers,
        total_questions,
        feedback,
        badge_earned: null
      });
    });

    // Clear any persisted state from previous tests
    try { localStorage.clear(); } catch {}
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('flows through start -> answer -> submit -> shows results', async () => {
    render(<QuizPlayer />);

    // Loading
    expect(screen.getByText(/Quiz wird geladen/i)).toBeInTheDocument();

    // Intro screen
    expect(await screen.findByText('Test Quiz')).toBeInTheDocument();
    const startBtn = screen.getByRole('button', { name: /Quiz starten/i });
    await userEvent.click(startBtn);

    // First question
    expect(await screen.findByText('Erste Frage?')).toBeInTheDocument();
    // Select 'B1' (index 1)
    await userEvent.click(screen.getByLabelText('B1'));

    // Next
    await userEvent.click(screen.getByRole('button', { name: /Weiter/i }));

    // Second question
    expect(await screen.findByText('Zweite Frage?')).toBeInTheDocument();
    // Select 'A2' (0) and 'C2' (2)
    await userEvent.click(screen.getByLabelText('A2'));
    await userEvent.click(screen.getByLabelText('C2'));

    // Submit
    await userEvent.click(screen.getByRole('button', { name: /Quiz beenden/i }));

    // Results
    expect(await screen.findByText(/Quiz-Ergebnisse/i)).toBeInTheDocument();

    // Verify that the answers are displayed as labels (not indices)
    expect(screen.getByText(/Deine Antwort: B1/)).toBeInTheDocument();
    expect(screen.getByText(/Korrekte Antwort: A1/)).toBeInTheDocument();

    // For the multiple-choice question we answered correctly, the component won't render a 'Korrekte Antwort' line.
    // Instead, verify our answer mapping shows the labels and that no extra correct-answer line appears for that card.
    // Use a broad query then ensure at least one occurrence of the MC labels appear in the document.
    expect(screen.getByText(/Deine Antwort: A2/i)).toBeInTheDocument();
    expect(screen.getByText(/Deine Antwort: .*C2/i)).toBeInTheDocument();

    // Ensure there isn't an extra "Korrekte Antwort:" line for the second question (since it was correct)
    const allCorrectLines = screen.getAllByText((content, node) => /Korrekte Antwort:/.test(content));
    // Should be exactly one (from question 1)
    expect(allCorrectLines.length).toBe(1);
  });
});
