import { apiClient } from './client';
import { User } from '../types';

export interface RegisterResponse {
  success: boolean;
  user: User;
  error?: string;
}

export interface HealthResponse {
  status: string;
  connection: string;
  method: string;
  timestamp: string;
  counts: {
    users: number;
    quizzes: number;
    questions: number;
    options: number;
    responses: number;
  };
}

export const authApi = {
  /**
   * Register a new user via the backend Admin API
   */
  async register(email: string, password: string, displayName?: string): Promise<RegisterResponse> {
    return apiClient<RegisterResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
  },

  /**
   * Check backend & database connection health
   */
  async checkHealth(): Promise<HealthResponse> {
    return apiClient<HealthResponse>('/api/health');
  },
};

