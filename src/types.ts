/**
 * Bravo Quiz Platform Type Definitions
 * Matches the Supabase schema in database/create_table.sql
 */

export type AuthProvider = 'anonymous' | 'google' | 'supabase';

export interface User {
  id: string;
  email?: string;
  displayName: string;
  authProvider: AuthProvider;
  avatarUrl?: string;
  createdAt: string;
}

export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E';

export interface OptionItem {
  optionKey: OptionKey;
  optionText: string;
}

export interface Question {
  id: string;
  quizId: string;
  questionOrder: number;
  questionText: string;
  correctOption: OptionKey;
  explanation?: string; // 選填解析
  options: OptionItem[]; // 2 到 5 個選項
}

export interface Quiz {
  id: string;
  creatorId: string;
  creatorName?: string;
  title: string;
  description: string;
  quizCode: string; // 4 位數字 (e.g. "1001")
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  takerCount?: number;
  averageScore?: number;
}

export interface ResponseRecord {
  id: string;
  sessionId: string;
  userId?: string;
  userName?: string;
  quizId: string;
  questionId: string;
  selectedOption: OptionKey;
  isCorrect: boolean;
  timeSpentSeconds: number;
  answerTime: string;
}

export interface QuestionDetailResult {
  question: Question;
  selectedOption: OptionKey;
  isCorrect: boolean;
}

export interface QuizSessionResult {
  sessionId: string;
  quiz: Quiz;
  questions: Question[];
  answers: Record<string, OptionKey>; // questionId -> selectedOption
  results: QuestionDetailResult[];
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  score: number; // 0 ~ 100
  accuracyRate: number; // 0 ~ 100 (%)
  totalTimeSeconds: number;
  completedAt: string;
}

export type AppRole = 'creator' | 'taker';
