import { apiClient } from './client';
import { Quiz, Question, User } from '../types';

export const quizApi = {
  /**
   * Fetch all quizzes created by a specific user with aggregated stats
   */
  async getQuizzesByCreator(creatorId: string): Promise<Quiz[]> {
    return apiClient<Quiz[]>(`/api/quizzes/creator/${encodeURIComponent(creatorId)}`);
  },

  /**
   * Fetch a published quiz by its 4-digit access code
   */
  async getQuizByCode(code: string): Promise<{ quiz: Quiz; questions: Question[] }> {
    return apiClient<{ quiz: Quiz; questions: Question[] }>(`/api/quizzes/code/${encodeURIComponent(code)}`);
  },

  /**
   * Fetch currently published quizzes from the database
   */
  async getPublishedQuizzes(limit = 10): Promise<Array<{ code: string; title: string; creatorName: string; questionCount: number }>> {
    return apiClient<Array<{ code: string; title: string; creatorName: string; questionCount: number }>>(`/api/quizzes/published?limit=${limit}`);
  },

  /**
   * Save or update a quiz
   */
  async saveQuiz(
    quizData: any,
    creator?: User | null
  ): Promise<{ success: boolean; quizId: string; quizCode: string }> {
    return apiClient<{ success: boolean; quizId: string; quizCode: string }>('/api/quizzes', {
      method: 'POST',
      body: JSON.stringify({
        quiz: quizData,
        creator: creator
          ? {
              id: creator.id,
              displayName: creator.displayName,
            }
          : undefined,
      }),
    });
  },

  /**
   * Delete a quiz by ID
   */
  async deleteQuiz(id: string): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(`/api/quizzes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /**
   * Synchronize official seed quizzes to the database
   */
  async syncSeedQuizzes(): Promise<{ success: boolean; count: number; quizzes: any[]; message: string }> {
    return apiClient<{ success: boolean; count: number; quizzes: any[]; message: string }>('/api/sync-quizzes', {
      method: 'POST',
    });
  },
};

