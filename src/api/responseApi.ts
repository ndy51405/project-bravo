import { apiClient } from './client';
import { Quiz, Question, OptionKey, QuizSessionResult, User } from '../types';
import { generateUUID } from '../utils/uuid';

export interface SubmitResponsePayload {
  sessionId: string;
  quizId: string;
  userId?: string | null;
  userName?: string | null;
  answers: {
    questionId: string;
    selectedOption: string;
    isCorrect: boolean;
    timeSpentSeconds?: number;
  }[];
}

export const responseApi = {
  /**
   * Submit student answers to the backend database
   */
  async submitResponses(payload: SubmitResponsePayload): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>('/api/responses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Pure functional calculation of score, accuracy rate, and question analysis
   */
  calculateSessionResult(
    sessionId: string,
    quiz: Quiz,
    questions: Question[],
    userAnswers: Record<string, OptionKey>,
    totalTimeSeconds: number
  ): QuizSessionResult {
    let correctCount = 0;
    const detailResults = questions.map((q) => {
      const selected = userAnswers[q.id] || ('A' as OptionKey);
      const isCorrect = selected === q.correctOption;
      if (isCorrect) correctCount++;

      return {
        question: q,
        selectedOption: selected,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const accuracyRate = score;

    return {
      sessionId,
      quiz,
      questions,
      answers: userAnswers,
      results: detailResults,
      totalQuestions,
      correctCount,
      incorrectCount: totalQuestions - correctCount,
      score,
      accuracyRate,
      totalTimeSeconds,
      completedAt: new Date().toISOString(),
    };
  },

  /**
   * Convenient helper to submit answers and get calculated result
   */
  async submitAndCalculate(
    quiz: Quiz,
    questions: Question[],
    userAnswers: Record<string, OptionKey>,
    totalTimeSeconds: number,
    currentUser?: User | null
  ): Promise<QuizSessionResult> {
    const sessionId = generateUUID();
    const result = this.calculateSessionResult(sessionId, quiz, questions, userAnswers, totalTimeSeconds);

    const avgTimePerQuestion = questions.length > 0 ? Math.round(totalTimeSeconds / questions.length) : 0;

    // Asynchronously post to backend
    this.submitResponses({
      sessionId,
      quizId: quiz.id,
      userId: currentUser?.id || null,
      userName: currentUser?.displayName || '訪客',
      answers: result.results.map((r) => ({
        questionId: r.question.id,
        selectedOption: r.selectedOption,
        isCorrect: r.isCorrect,
        timeSpentSeconds: avgTimePerQuestion,
      })),
    }).catch((err) => {
      console.warn('[responseApi] Background submission warning:', err);
    });

    return result;
  },
};

