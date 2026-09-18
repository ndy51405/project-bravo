/**
 * Supabase Client and Database Service
 * Connects directly to the user's Supabase PostgreSQL instance
 */

import { createClient } from '@supabase/supabase-js';
import { User, Quiz, Question, OptionKey, OptionItem, QuizSessionResult, ResponseRecord } from '../types';

// Fallback to the user's provided credentials if env vars are not set
export const SUPABASE_URL = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  'https://hkagibktealrcxlslqzu.supabase.co';

export const SUPABASE_KEY = 
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_dFYFg_OoCmEcvZU9CD4pwg_6AMkyx1i';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to generate a valid RFC4122 v4 UUID
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface SupabaseHealthStatus {
  isConnected: boolean;
  url: string;
  method?: string;
  tables: {
    users: boolean;
    quizzes: boolean;
    questions: boolean;
    options: boolean;
    responses: boolean;
  };
  hasRlsIssue: boolean;
  errorMessage?: string;
  rowCount: {
    quizzes: number;
    users: number;
    questions?: number;
    options?: number;
    responses?: number;
  };
}

export class SupabaseService {
  /**
   * Register a new user directly in Supabase Auth (Sign Up)
   * Uses backend Admin API with SUPABASE_SECRET_KEY to bypass client-side email delivery checks
   * (which reject addresses like aaa@gmail.com) and auto-confirms the email.
   * Completely bypasses any custom users table.
   */
  static async signUpWithEmail(email: string, password: string, displayName: string): Promise<{ user: User | null; session: any; error?: string; requiresEmailConfirmation?: boolean }> {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = displayName.trim() || cleanEmail.split('@')[0];

      // 1. Try server-side Supabase Auth Admin creation (auto-confirms email and bypasses client mailer restrictions)
      try {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: password.trim(),
            displayName: cleanName,
          }),
        });
        const regData = await regRes.json();
        
        if (regRes.ok && regData.success) {
          // Immediately sign in with the client SDK to get active session tokens
          const loginRes = await this.signInWithEmail(cleanEmail, password.trim());
          if (loginRes.user) {
            return {
              user: loginRes.user,
              session: loginRes.session,
              requiresEmailConfirmation: false,
            };
          }
          return {
            user: regData.user,
            session: null,
            requiresEmailConfirmation: false,
          };
        } else if (regData.error) {
          return { user: null, session: null, error: regData.error };
        }
      } catch (backendErr) {
        console.warn('[SupabaseService] /api/auth/register unavailable, falling back to client SDK:', backendErr);
      }

      // 2. Fallback to client SDK
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: {
          data: {
            display_name: cleanName,
            full_name: cleanName,
          },
        },
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (data.user) {
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          displayName: cleanName,
          authProvider: 'supabase',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.id)}`,
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        const hasSession = !!data.session;
        return {
          user,
          session: data.session,
          requiresEmailConfirmation: !hasSession,
        };
      }

      return { user: null, session: null, error: '註冊未返回使用者資訊' };
    } catch (e: any) {
      return { user: null, session: null, error: e.message || '註冊過程中發生錯誤' };
    }
  }

  /**
   * Log in an existing user with Supabase Auth (Email + Password)
   */
  static async signInWithEmail(email: string, password: string): Promise<{ user: User | null; session: any; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (data.user) {
        const name = data.user.user_metadata?.display_name || data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || '使用者';
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          displayName: name,
          authProvider: 'supabase',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.id)}`,
          createdAt: data.user.created_at || new Date().toISOString(),
        };
        return { user, session: data.session };
      }

      return { user: null, session: null, error: '登入未取得使用者資訊' };
    } catch (e: any) {
      return { user: null, session: null, error: e.message || '登入時發生錯誤' };
    }
  }

  /**
   * Sign out of Supabase Auth
   */
  static async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[SupabaseService] signOut error:', e);
    }
  }

  /**
   * Get currently active session and user from Supabase Auth
   */
  static async getCurrentAuthUser(): Promise<User | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const name = session.user.user_metadata?.display_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '使用者';
        return {
          id: session.user.id,
          email: session.user.email,
          displayName: name,
          authProvider: 'supabase',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(session.user.id)}`,
          createdAt: session.user.created_at || new Date().toISOString(),
        };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Check connection and schema health on Supabase
   * Uses /api/health (direct PostgreSQL with DATABASE_URL & SUPABASE_SECRET_KEY)
   */
  static async checkHealth(): Promise<SupabaseHealthStatus> {
    const status: SupabaseHealthStatus = {
      isConnected: false,
      url: SUPABASE_URL,
      method: 'DATABASE_URL & SUPABASE_SECRET_KEY',
      tables: {
        users: false,
        quizzes: false,
        questions: false,
        options: false,
        responses: false,
      },
      hasRlsIssue: false,
      rowCount: {
        quizzes: 0,
        users: 0,
        questions: 0,
        options: 0,
        responses: 0,
      },
    };

    // 1. Try server-side direct database check first
    try {
      const apiRes = await fetch('/api/health');
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (data.status === 'ok') {
          status.isConnected = true;
          status.method = data.method || 'DATABASE_URL & SUPABASE_SECRET_KEY';
          status.tables = {
            users: true,
            quizzes: true,
            questions: true,
            options: true,
            responses: true,
          };
          status.rowCount = {
            quizzes: data.counts?.quizzes || 0,
            users: data.counts?.users || 0,
            questions: data.counts?.questions || 0,
            options: data.counts?.options || 0,
            responses: data.counts?.responses || 0,
          };
          return status;
        }
      }
    } catch (e) {
      console.warn('[SupabaseService] /api/health check fallback to client SDK:', e);
    }

    // 2. Fallback to Supabase client SDK
    try {
      const [uRes, qRes, qstRes, optRes, respRes] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('quizzes').select('id', { count: 'exact', head: true }),
        supabase.from('questions').select('id', { count: 'exact', head: true }),
        supabase.from('options').select('question_id', { count: 'exact', head: true }),
        supabase.from('responses').select('id', { count: 'exact', head: true }),
      ]);

      status.tables.users = !uRes.error;
      status.tables.quizzes = !qRes.error;
      status.tables.questions = !qstRes.error;
      status.tables.options = !optRes.error;
      status.tables.responses = !respRes.error;

      status.isConnected = status.tables.quizzes && status.tables.questions;
      status.rowCount.quizzes = qRes.count || 0;
      status.rowCount.users = uRes.count || 0;

      if (uRes.error || qRes.error) {
        status.errorMessage = uRes.error?.message || qRes.error?.message;
      }
    } catch (err: any) {
      status.isConnected = false;
      status.errorMessage = err?.message || '無法連線至 Supabase 伺服器';
    }

    return status;
  }

  /**
   * Sync user - No users table needed anymore (handled by Supabase Auth)
   */
  static async upsertUser(_user: User): Promise<boolean> {
    return true;
  }

  /**
   * Fetch quizzes created by a specific creator from Supabase
   */
  static async getQuizzesByCreator(creatorId: string): Promise<Quiz[]> {
    try {
      // 1. Fetch quizzes
      const { data: quizzesData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false });

      if (quizError || !quizzesData) {
        console.warn('[Supabase] getQuizzesByCreator error:', quizError);
        return [];
      }

      // 2. Fetch questions and options for these quizzes
      const quizIds = quizzesData.map(q => q.id);
      if (quizIds.length === 0) return [];

      const { data: questionsData } = await supabase
        .from('questions')
        .select(`
          id,
          quiz_id,
          question_order,
          question_text,
          correct_option,
          explanation
        `)
        .in('quiz_id', quizIds)
        .order('question_order', { ascending: true });

      const questionIds = (questionsData || []).map(q => q.id);

      let optionsData: any[] = [];
      if (questionIds.length > 0) {
        const { data: opts } = await supabase
          .from('options')
          .select('*')
          .in('question_id', questionIds)
          .order('option_key', { ascending: true });
        optionsData = opts || [];
      }

      // Fetch response statistics
      const { data: responsesData } = await supabase
        .from('responses')
        .select('session_id, quiz_id, is_correct')
        .in('quiz_id', quizIds);

      // Map relational rows to Quiz domain object
      return quizzesData.map(q => {
        const qstList: Question[] = (questionsData || [])
          .filter(qst => qst.quiz_id === q.id)
          .map(qst => {
            const opts: OptionItem[] = optionsData
              .filter(opt => opt.question_id === qst.id)
              .map(opt => ({
                optionKey: opt.option_key as OptionKey,
                optionText: opt.option_text,
              }));
            return {
              id: qst.id,
              quizId: qst.quiz_id,
              questionOrder: qst.question_order,
              questionText: qst.question_text,
              correctOption: qst.correct_option as OptionKey,
              explanation: qst.explanation || '',
              options: opts,
            };
          });

        const quizResps = (responsesData || []).filter(r => r.quiz_id === q.id);
        const sessionSet = new Set(quizResps.map(r => r.session_id));
        const takerCount = sessionSet.size;

        let averageScore = 0;
        if (takerCount > 0) {
          const sessionScores: number[] = [];
          sessionSet.forEach(sId => {
            const sResps = quizResps.filter(r => r.session_id === sId);
            const correct = sResps.filter(r => r.is_correct).length;
            const score = sResps.length > 0 ? Math.round((correct / sResps.length) * 100) : 0;
            sessionScores.push(score);
          });
          averageScore = Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length);
        }

        return {
          id: q.id,
          creatorId: q.creator_id,
          title: q.title,
          description: q.description || '',
          quizCode: q.quiz_code,
          isPublished: q.is_published,
          createdAt: q.created_at,
          updatedAt: q.updated_at,
          questions: qstList,
          takerCount,
          averageScore,
        };
      });
    } catch (e) {
      console.warn('[Supabase] getQuizzesByCreator exception:', e);
      return [];
    }
  }

  /**
   * Find a published quiz by code from Supabase
   */
  static async findQuizByCode(code: string): Promise<{ quiz: Quiz; questions: Question[] } | null> {
    try {
      const cleanCode = code.trim().toUpperCase();
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('quiz_code', cleanCode)
        .eq('is_published', true)
        .maybeSingle();

      if (quizError || !quizData) {
        return null;
      }

      // Fetch questions
      const { data: questionsData, error: qstError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('question_order', { ascending: true });

      if (qstError || !questionsData) {
        return null;
      }

      // Fetch options
      const questionIds = questionsData.map(q => q.id);
      const { data: optionsData } = await supabase
        .from('options')
        .select('*')
        .in('question_id', questionIds)
        .order('option_key', { ascending: true });

      const mappedQuestions: Question[] = questionsData.map(qst => {
        const opts = (optionsData || [])
          .filter(o => o.question_id === qst.id)
          .map(o => ({
            optionKey: o.option_key as OptionKey,
            optionText: o.option_text,
          }));

        return {
          id: qst.id,
          quizId: qst.quiz_id,
          questionOrder: qst.question_order,
          questionText: qst.question_text,
          correctOption: qst.correct_option as OptionKey,
          explanation: qst.explanation || '',
          options: opts,
        };
      });

      const quiz: Quiz = {
        id: quizData.id,
        creatorId: quizData.creator_id,
        title: quizData.title,
        description: quizData.description || '',
        quizCode: quizData.quiz_code,
        isPublished: quizData.is_published,
        createdAt: quizData.created_at,
        updatedAt: quizData.updated_at,
        questions: mappedQuestions,
      };

      return { quiz, questions: mappedQuestions };
    } catch (e) {
      console.warn('[Supabase] findQuizByCode exception:', e);
      return null;
    }
  }

  /**
   * Save (Create or Update) Quiz directly in Supabase PostgreSQL
   */
  static async saveQuiz(
    quizData: any,
    creator: User,
    generatedCode: string
  ): Promise<{ success: boolean; quiz?: Quiz; error?: string; isRlsError?: boolean }> {
    try {
      // 1. Send to server direct PostgreSQL API (DATABASE_URL & SUPABASE_SECRET_KEY)
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizData, creator, generatedCode }),
      });
      const data = await res.json();
      if (data.success) {
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e: any) {
      console.error('[Supabase] saveQuiz exception:', e);
      return { success: false, error: e?.message || '儲存題組時發生錯誤' };
    }
  }

  /**
   * Delete quiz from Supabase
   */
  static async deleteQuiz(quizId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) {
        console.warn('[Supabase] deleteQuiz error:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[Supabase] deleteQuiz exception:', e);
      return false;
    }
  }

  /**
   * Submit quiz responses into Supabase responses table
   */
  static async submitQuizSession(
    quiz: Quiz,
    questions: Question[],
    userAnswers: Record<string, OptionKey>,
    totalTimeSeconds: number,
    currentUser: User | null
  ): Promise<boolean> {
    try {
      const sessionId = generateUUID();
      const now = new Date().toISOString();

      let userUuid = currentUser?.id;
      if (userUuid && (!userUuid.includes('-') || userUuid.length !== 36)) {
        userUuid = '00000000-0000-0000-0000-000000000001';
      }

      const rows = questions.map(q => {
        const selected = userAnswers[q.id] || ('A' as OptionKey);
        const isCorrect = selected === q.correctOption;
        return {
          id: generateUUID(),
          session_id: sessionId,
          user_id: userUuid || null,
          quiz_id: quiz.id,
          question_id: q.id,
          selected_option: selected,
          is_correct: isCorrect,
          time_spent_seconds: Math.round(totalTimeSeconds / questions.length),
          answer_time: now,
        };
      });

      const { error } = await supabase.from('responses').insert(rows);
      if (error) {
        console.warn('[Supabase] submitQuizSession warning (may be RLS):', error.message);
        return false;
      }
      return true;
    } catch (e) {
      console.warn('[Supabase] submitQuizSession exception:', e);
      return false;
    }
  }
}
