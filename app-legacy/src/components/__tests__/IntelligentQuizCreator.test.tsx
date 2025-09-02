import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock apiClient so quizApi normalization is exercised
jest.mock('../../services/apiClient', () => {
  const mockPostWithTimeout = jest.fn();
  const client = { postWithTimeout: mockPostWithTimeout };
  return {
    __esModule: true,
    default: client,
    apiClient: client,
    // Expose the mock for tests via named export
    mockPostWithTimeout,
  };
});

import IntelligentQuizCreator from '../IntelligentQuizCreator';

// Access the exposed mock function
const { mockPostWithTimeout } = require('../../services/apiClient');

describe('IntelligentQuizCreator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates and renders a normalized quiz from object-shaped backend fields', async () => {
    const rawQuiz = {
      id: 'quiz-ai-1',
      title: { text: 'AI Titel' },
      description: { text: 'AI Beschreibung' },
      difficulty_level: 'medium',
      topic_area: { text: 'Marktkommunikation' },
      time_limit_minutes: 7,
      questions: [
        {
          id: 'q1',
          quiz_id: 'quiz-ai-1',
          question_text: { text: 'Frage 1 Text' },
          question_type: 'single-choice',
          answer_options: [{ text: 'Opt A' }, { label: 'Opt B' }],
          correct_answers: [{ index: 1 }],
          explanation: { text: 'Erklärung 1' },
          difficulty_level: 'easy',
          points: 1,
          topic: 't'
        },
        {
          id: 'q2',
          quiz_id: 'quiz-ai-1',
          question_text: { text: 'Frage 2 Text' },
          question_type: 'multiple-choice',
          answer_options: [{ text: 'Opt C' }, { text: 'Opt D' }, 'Opt E'],
          correct_answers: [{ text: 'Opt C' }, 2],
          explanation: { text: 'Erklärung 2' },
          difficulty_level: 'medium',
          points: 1,
          topic: 't2'
        },
        {
          id: 'q3',
          quiz_id: 'quiz-ai-1',
          question_text: { text: 'Frage 3 Text' },
          question_type: 'short-answer',
          answer_options: [],
          correct_answers: [],
          explanation: '—',
          difficulty_level: 'hard',
          points: 1,
          topic: 't3'
        }
      ]
    };

    // Backend may return either { quiz } or the quiz directly; return raw quiz directly here
    mockPostWithTimeout.mockResolvedValueOnce(rawQuiz);

    render(<IntelligentQuizCreator />);

    // Open dialog
    await userEvent.click(screen.getByRole('button', { name: /Intelligentes Quiz erstellen/i }));

    // Fill form
    await userEvent.type(screen.getByLabelText(/Quiz-Thema/i), 'APERAK');
    const countField = screen.getByLabelText(/Anzahl Fragen/i);
    await userEvent.clear(countField);
    await userEvent.type(countField, '3');

    // Create quiz
    await userEvent.click(screen.getByRole('button', { name: /Quiz erstellen/i }));

    // Wait for success view
    expect(await screen.findByText(/Quiz erfolgreich erstellt!/i)).toBeInTheDocument();

    // Normalized fields should be strings, rendered without React child errors
    expect(screen.getByText('AI Titel')).toBeInTheDocument();
    expect(screen.getByText('AI Beschreibung')).toBeInTheDocument();

    // Chips for difficulty, question count and time should render
    expect(screen.getByText(/medium/i)).toBeInTheDocument();
    expect(screen.getByText(/3 Fragen|\d+ Fragen/)).toBeInTheDocument();
    expect(screen.getByText(/7 Min/)).toBeInTheDocument();

    // Preview should show first question text (normalized)
    expect(screen.getByText(/Frage 1 Text/)).toBeInTheDocument();
  });

  it('shows a friendly error on timeout and resets to the first step', async () => {
    mockPostWithTimeout.mockRejectedValueOnce(new Error('timeout of 180000ms exceeded'));

    render(<IntelligentQuizCreator />);

    // Open dialog
    await userEvent.click(screen.getByRole('button', { name: /Intelligentes Quiz erstellen/i }));

    // Fill form
    await userEvent.type(screen.getByLabelText(/Quiz-Thema/i), 'Thema');

    // Trigger create
    await userEvent.click(screen.getByRole('button', { name: /Quiz erstellen/i }));

    // Error alert appears
    expect(await screen.findByText(/Ein unbekannter Fehler ist aufgetreten/i)).toBeInTheDocument();

    // Ensure loading step content is not shown anymore (StepLabel may still be visible)
    await waitFor(() => {
      expect(screen.queryByText(/Quiz wird erstellt\.{3}/i)).not.toBeInTheDocument();
      expect(
        screen.queryByText(/Bitte warten Sie, während das System relevante Fragen generiert\./i)
      ).not.toBeInTheDocument();
    });

    // Back on first step: primary action should be enabled again (topic remains filled)
    expect(screen.getByRole('button', { name: /Quiz erstellen/i })).toBeEnabled();
  });
});
