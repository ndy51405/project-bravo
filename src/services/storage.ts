/**
 * Multi-tenant Quiz Storage & Supabase Hybrid Service
 * Real-time synchronization with Supabase PostgreSQL database,
 * with resilient offline caching and multi-tenant isolation.
 */

import { User, Quiz, Question, ResponseRecord, QuizSessionResult, OptionKey, OptionItem } from '../types';
import { SupabaseService, generateUUID } from './supabase';

const STORAGE_KEYS = {
  CURRENT_USER: 'quiz_app_current_user',
  USERS: 'quiz_app_users',
  QUIZZES: 'quiz_app_quizzes',
  QUESTIONS: 'quiz_app_questions',
  RESPONSES: 'quiz_app_responses',
  RLS_ALERT_SHOWN: 'quiz_app_rls_alert_shown',
};

// Generate random uppercase alphanumeric quiz code (6 characters)
export function generateQuizCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude ambiguous I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initial seed data for immediate demonstration
const SEED_USERS: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: '陳教授 (Prof. Chen)',
    email: 'chen.quiz@example.edu.tw',
    authProvider: 'anonymous',
    avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=chen',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    displayName: 'Google 學生 (ndy51405)',
    email: 'ndy51405@gmail.com',
    authProvider: 'google',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ndy51405',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  }
];

const SEED_QUIZZES: Quiz[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    creatorId: '00000000-0000-0000-0000-000000000001',
    creatorName: '陳教授 (Prof. Chen)',
    title: '基礎雲端架構與 Web 核心測驗',
    description: '涵蓋 HTTP 狀態碼、RESTful API 原理與資料庫索引設計基礎概念。',
    quizCode: 'CLOUD9',
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    creatorId: '00000000-0000-0000-0000-000000000001',
    creatorName: '陳教授 (Prof. Chen)',
    title: 'TypeScript & 前端開發核心挑戰',
    description: '測試對 TypeScript 型別系統、React 渲染週期及現代前端工具的理解。',
    quizCode: 'TS2026',
    isPublished: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  }
];

const SEED_QUESTIONS: Question[] = [
  // Questions for CLOUD9
  {
    id: '33333333-3333-4333-a333-333333333331',
    quizId: '11111111-1111-4111-a111-111111111111',
    questionOrder: 1,
    questionText: 'HTTP 狀態碼中，代表「伺服器成功處理請求，且未返回任何實體內容」的是哪一個代碼？',
    correctOption: 'B',
    explanation: '204 No Content 代表請求已成功執行，但客戶端不需要離開當前頁面，通常用於 DELETE 或不需要返回資料的 PUT/POST 請求。',
    options: [
      { optionKey: 'A', optionText: '200 OK' },
      { optionKey: 'B', optionText: '204 No Content' },
      { optionKey: 'C', optionText: '201 Created' },
      { optionKey: 'D', optionText: '304 Not Modified' },
    ]
  },
  {
    id: '33333333-3333-4333-a333-333333333332',
    quizId: '11111111-1111-4111-a111-111111111111',
    questionOrder: 2,
    questionText: '在關聯式資料庫 (如 PostgreSQL) 中，建立 B-Tree 索引最主要的目的為何？',
    correctOption: 'C',
    explanation: '索引透過特定排序資料結構（如平衡樹），大幅降低查詢時的磁碟 I/O 次數，使等值與範圍查詢時間複雜度由 O(N) 降低至 O(log N)。',
    options: [
      { optionKey: 'A', optionText: '節省資料表在硬碟中所佔據的儲存空間' },
      { optionKey: 'B', optionText: '自動備份資料表以防止硬體故障' },
      { optionKey: 'C', optionText: '加速資料查詢速度，將全表掃描轉為對數搜尋' },
      { optionKey: 'D', optionText: '強制資料庫執行資料欄位的型別檢查' },
    ]
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    quizId: '11111111-1111-4111-a111-111111111111',
    questionOrder: 3,
    questionText: '關於多租戶 (Multi-tenancy) 架構中 Row Level Security (RLS) 的敘述，下列何者正確？',
    correctOption: 'A',
    explanation: 'RLS 直接在資料庫核心層級依據目前連線或使用者身份過濾資料列，能防止應用層邏輯疏漏導致的跨租戶資料洩漏。',
    options: [
      { optionKey: 'A', optionText: '在資料庫引擎層級自動依使用者身份篩選可讀寫的記錄列' },
      { optionKey: 'B', optionText: '只是一種前端加密傳輸協定，與資料庫查詢無關' },
      { optionKey: 'C', optionText: '必須為每一個租戶個別建立獨立的實體資料庫伺服器' },
      { optionKey: 'D', optionText: '主要用於防範分散式阻斷服務攻擊 (DDoS)' },
    ]
  },
  // Questions for TS2026
  {
    id: '44444444-4444-4444-a444-444444444441',
    quizId: '22222222-2222-4222-a222-222222222222',
    questionOrder: 1,
    questionText: '在 TypeScript 中，`type` 與 `interface` 的主要差別之一是什麼？',
    correctOption: 'D',
    explanation: '同名的 interface 會自動進行宣告合併 (Declaration Merging)，而同名的 type alias 則會產生重複定義的編譯錯誤。',
    options: [
      { optionKey: 'A', optionText: 'interface 只能用在 React 函式元件的 Props' },
      { optionKey: 'B', optionText: 'type 無法表示物件結構，只能表示基本型別' },
      { optionKey: 'C', optionText: 'type 會在編譯後的 JavaScript 保留實體程式碼' },
      { optionKey: 'D', optionText: 'interface 支援同名宣告合併 (Declaration Merging)' },
    ]
  },
  {
    id: '44444444-4444-4444-a444-444444444442',
    quizId: '22222222-2222-4222-a222-222222222222',
    questionOrder: 2,
    questionText: '下列哪一個 TypeScript 關鍵字或語法可用於排除 `null` 和 `undefined`？',
    correctOption: 'B',
    explanation: '非空斷言運算子 `!` (Non-null assertion operator) 告訴編譯器該值在運行時必定非空，而工具型別 `NonNullable<T>` 則可以在型別定義中剔除 null 與 undefined。',
    options: [
      { optionKey: 'A', optionText: '可選串連運算子 ?.' },
      { optionKey: 'B', optionText: '非空斷言運算子 ! 或 NonNullable<T>' },
      { optionKey: 'C', optionText: '空值合併運算子 ??' },
      { optionKey: 'D', optionText: '型別保護關鍵字 typeof' },
    ]
  }
];

export class StorageService {
  private static initStorage(): void {
    if (!localStorage.getItem(STORAGE_KEYS.QUIZZES)) {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(SEED_QUIZZES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.QUESTIONS)) {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(SEED_QUESTIONS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.RESPONSES)) {
      localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify([]));
    }
    // Do NOT automatically log in any mock user - App must open to Login Screen if not logged in
  }

  // --- Auth & Users ---
  static getCurrentUser(): User | null {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  }

  static setCurrentUser(user: User | null): void {
    this.initStorage();
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  static logout(): void {
    this.setCurrentUser(null);
  }

  /**
   * Sync all local quizzes (like user-created math quiz) to Supabase PostgreSQL database
   */
  static async autoSyncAllLocalQuizzes(creator?: User): Promise<{ successCount: number; errors: string[] }> {
    this.initStorage();
    const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    const allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');

    if (allQuizzes.length === 0) {
      return { successCount: 0, errors: [] };
    }

    const quizzesWithQuestions = allQuizzes.map(quiz => {
      const questions = allQuestions.filter(q => q.quizId === quiz.id);
      return {
        ...quiz,
        questions,
      };
    });

    try {
      const res = await fetch('/api/quizzes/batch-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizzes: quizzesWithQuestions, creator }),
      });
      const data = await res.json();
      if (data.success) {
        console.log(`[StorageService] Successfully synced ${data.count} local quizzes to Supabase:`, data.quizzes);
        return { successCount: data.count, errors: [] };
      }
      return { successCount: 0, errors: [data.error || '同步失敗'] };
    } catch (e: any) {
      console.warn('[StorageService] autoSyncAllLocalQuizzes error:', e);
      return { successCount: 0, errors: [e.message] };
    }
  }

  static getAllUsers(): User[] {
    this.initStorage();
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  static loginAnonymous(name: string, password?: string): User {
    this.initStorage();
    const users = this.getAllUsers();
    const cleanName = name.trim();
    let existing = users.find(u => u.displayName.toLowerCase() === cleanName.toLowerCase() && u.authProvider === 'anonymous');

    if (existing) {
      this.setCurrentUser(existing);
      return existing;
    }

    const newUser: User = {
      id: generateUUID(),
      displayName: cleanName,
      authProvider: 'anonymous',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanName)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);
    return newUser;
  }

  static loginGoogle(name: string, email: string): User {
    this.initStorage();
    const users = this.getAllUsers();
    const cleanEmail = email.trim().toLowerCase();
    let existing = users.find(u => u.email?.toLowerCase() === cleanEmail);

    if (existing) {
      this.setCurrentUser(existing);
      return existing;
    }

    const newUser: User = {
      id: generateUUID(),
      displayName: name.trim() || 'Google User',
      email: cleanEmail,
      authProvider: 'google',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.setCurrentUser(newUser);
    return newUser;
  }

  // --- Quizzes (Multi-Tenant Isolation) ---

  /**
   * Returns quizzes created by creatorId.
   */
  static getQuizzesByCreator(creatorId: string): Quiz[] {
    this.initStorage();
    const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    const allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');
    const allResponses: ResponseRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESPONSES) || '[]');

    return allQuizzes
      .filter(q => q.creatorId === creatorId)
      .map(q => {
        const questions = allQuestions.filter(qst => qst.quizId === q.id);
        const quizResponses = allResponses.filter(r => r.quizId === q.id);
        
        const sessions = new Set(quizResponses.map(r => r.sessionId));
        const takerCount = sessions.size;

        let averageScore = 0;
        if (takerCount > 0) {
          const sessionScores: number[] = [];
          sessions.forEach(sessId => {
            const sessResps = quizResponses.filter(r => r.sessionId === sessId);
            const correct = sessResps.filter(r => r.isCorrect).length;
            const score = sessResps.length > 0 ? Math.round((correct / sessResps.length) * 100) : 0;
            sessionScores.push(score);
          });
          averageScore = Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length);
        }

        return {
          ...q,
          questions,
          takerCount,
          averageScore,
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Asynchronously load quizzes from Supabase and merge with local cache
   * Queries via direct database API (DATABASE_URL) first, fallback to client SDK
   */
  static async refreshQuizzesFromSupabase(creatorId: string): Promise<Quiz[]> {
    try {
      // 1. Direct PostgreSQL server API
      const apiResp = await fetch(`/api/quizzes/creator/${encodeURIComponent(creatorId)}`);
      if (apiResp.ok) {
        const remoteQuizzes = await apiResp.json();
        if (Array.isArray(remoteQuizzes) && remoteQuizzes.length > 0) {
          const localQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
          let localQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');

          remoteQuizzes.forEach((rq: Quiz) => {
            const idx = localQuizzes.findIndex(lq => lq.id === rq.id || lq.quizCode === rq.quizCode);
            if (idx >= 0) {
              localQuizzes[idx] = rq;
            } else {
              localQuizzes.push(rq);
            }

            if (rq.questions) {
              localQuestions = localQuestions.filter(q => q.quizId !== rq.id);
              localQuestions.push(...rq.questions);
            }
          });

          localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(localQuizzes));
          localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(localQuestions));
          return this.getQuizzesByCreator(creatorId);
        }
      }
    } catch (apiErr) {
      console.warn('[StorageService] /api/quizzes/creator fallback:', apiErr);
    }

    try {
      const remoteQuizzes = await SupabaseService.getQuizzesByCreator(creatorId);
      if (remoteQuizzes && remoteQuizzes.length > 0) {
        // Merge into local storage
        const localQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
        let localQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');

        remoteQuizzes.forEach(rq => {
          const idx = localQuizzes.findIndex(lq => lq.id === rq.id || lq.quizCode === rq.quizCode);
          if (idx >= 0) {
            localQuizzes[idx] = rq;
          } else {
            localQuizzes.push(rq);
          }

          if (rq.questions) {
            localQuestions = localQuestions.filter(q => q.quizId !== rq.id);
            localQuestions.push(...rq.questions);
          }
        });

        localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(localQuizzes));
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(localQuestions));
        return this.getQuizzesByCreator(creatorId);
      }
    } catch (e) {
      console.warn('[StorageService] refreshQuizzesFromSupabase error:', e);
    }
    return this.getQuizzesByCreator(creatorId);
  }

  /**
   * Get single quiz for editing, verifying creator ownership.
   */
  static getQuizForCreator(quizId: string, creatorId: string): (Quiz & { questions: Question[] }) | null {
    this.initStorage();
    const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    const quiz = allQuizzes.find(q => q.id === quizId && q.creatorId === creatorId);
    if (!quiz) return null;

    const allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');
    const questions = allQuestions
      .filter(q => q.quizId === quizId)
      .sort((a, b) => a.questionOrder - b.questionOrder);

    return { ...quiz, questions };
  }

  /**
   * Save (Create or Update) Quiz.
   * Generates a unique uppercase alphanumeric Quiz Code if new.
   * Syncs to Supabase PostgreSQL with local resilience.
   */
  static async saveQuiz(
    quizData: {
      id?: string;
      title: string;
      description: string;
      questions: Array<{
        id?: string;
        questionOrder?: number;
        questionText: string;
        correctOption: OptionKey;
        explanation?: string;
        options: OptionItem[];
      }>;
    },
    creator: User
  ): Promise<Quiz> {
    this.initStorage();
    const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    let allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');

    const now = new Date().toISOString();
    let quizId = quizData.id;
    let quizCode = '';

    if (quizId) {
      // Editing existing quiz - verify ownership
      const existing = allQuizzes.find(q => q.id === quizId);
      if (!existing || existing.creatorId !== creator.id) {
        throw new Error('您無權限修改其他使用者建立的題組！');
      }
      quizCode = existing.quizCode;
      existing.title = quizData.title.trim();
      existing.description = quizData.description.trim();
      existing.updatedAt = now;

      allQuestions = allQuestions.filter(q => q.quizId !== quizId);
    } else {
      // Create new quiz
      quizId = generateUUID();
      do {
        quizCode = generateQuizCode();
      } while (allQuizzes.some(q => q.quizCode === quizCode));

      const newQuiz: Quiz = {
        id: quizId,
        creatorId: creator.id,
        creatorName: creator.displayName,
        title: quizData.title.trim(),
        description: quizData.description.trim(),
        quizCode,
        isPublished: true,
        createdAt: now,
        updatedAt: now,
      };
      allQuizzes.push(newQuiz);
    }

    // Save questions (1 ~ 20 questions)
    const formattedQuestions: Question[] = quizData.questions.slice(0, 20).map((q, idx) => ({
      id: q.id && q.id.includes('-') && q.id.length === 36 ? q.id : generateUUID(),
      quizId: quizId!,
      questionOrder: idx + 1,
      questionText: q.questionText.trim(),
      correctOption: q.correctOption,
      explanation: q.explanation?.trim() || '',
      options: q.options.map(opt => ({
        optionKey: opt.optionKey,
        optionText: opt.optionText.trim(),
      })),
    }));

    allQuestions.push(...formattedQuestions);

    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(allQuizzes));
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(allQuestions));

    const finalQuiz = allQuizzes.find(q => q.id === quizId)!;
    const resultQuiz = { ...finalQuiz, questions: formattedQuestions };

    // Synchronize directly to Supabase database via backend API (DATABASE_URL & SUPABASE_SECRET_KEY)
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          quiz: resultQuiz, 
          quizData, 
          creator, 
          generatedCode: quizCode 
        }),
      });
      const data = await res.json();
      if (data.success) {
        console.log('[Direct PostgreSQL] Successfully saved quiz to Supabase via DATABASE_URL:', quizCode);
      } else {
        console.warn('[Direct PostgreSQL] Server response error:', data.error);
      }
    } catch (apiErr) {
      console.warn('[StorageService] direct /api/quizzes error, falling back to Supabase client:', apiErr);
      try {
        await SupabaseService.saveQuiz(quizData, creator, quizCode);
      } catch (err) {
        console.warn('[SupabaseService] fallback failed:', err);
      }
    }

    return resultQuiz;
  }

  /**
   * Delete quiz - only allowed if owned by the creator.
   */
  static deleteQuiz(quizId: string, creatorId: string): boolean {
    this.initStorage();
    let allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    const existing = allQuizzes.find(q => q.id === quizId);
    if (!existing || existing.creatorId !== creatorId) {
      throw new Error('您無權限刪除其他使用者建立的題組！');
    }

    allQuizzes = allQuizzes.filter(q => q.id !== quizId);
    let allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');
    allQuestions = allQuestions.filter(q => q.quizId !== quizId);

    let allResponses: ResponseRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESPONSES) || '[]');
    allResponses = allResponses.filter(r => r.quizId !== quizId);

    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(allQuizzes));
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(allQuestions));
    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(allResponses));

    // Delete in Supabase via direct backend API
    fetch(`/api/quizzes/${encodeURIComponent(quizId)}`, {
      method: 'DELETE',
    }).catch(() => {
      SupabaseService.deleteQuiz(quizId);
    });

    return true;
  }

  // --- Quiz Taker Operations ---

  /**
   * Look up quiz by uppercase Quiz Code (synchronous local + background Supabase)
   */
  static findQuizByCode(code: string): { quiz: Quiz; questions: Question[] } | null {
    this.initStorage();
    const cleanCode = code.trim().toUpperCase();
    const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    const quiz = allQuizzes.find(q => q.quizCode === cleanCode && q.isPublished);
    if (!quiz) return null;

    const allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');
    const questions = allQuestions
      .filter(q => q.quizId === quiz.id)
      .sort((a, b) => a.questionOrder - b.questionOrder);

    return { quiz, questions };
  }

  /**
   * Asynchronous Supabase-first lookup by code
   * Queries direct backend PostgreSQL API first, fallback to Supabase SDK / local
   */
  static async findQuizByCodeAsync(code: string): Promise<{ quiz: Quiz; questions: Question[] } | null> {
    const cleanCode = code.trim().toUpperCase();

    // 1. Direct PostgreSQL server API
    try {
      const apiResp = await fetch(`/api/quizzes/code/${encodeURIComponent(cleanCode)}`);
      if (apiResp.ok) {
        const remote = await apiResp.json();
        if (remote && remote.quiz) {
          const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
          const idx = allQuizzes.findIndex(q => q.id === remote.quiz.id || q.quizCode === remote.quiz.quizCode);
          if (idx >= 0) {
            allQuizzes[idx] = remote.quiz;
          } else {
            allQuizzes.push(remote.quiz);
          }
          localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(allQuizzes));

          let allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');
          allQuestions = allQuestions.filter(q => q.quizId !== remote.quiz.id);
          allQuestions.push(...remote.questions);
          localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(allQuestions));

          return remote;
        }
      }
    } catch (apiErr) {
      console.warn('[StorageService] /api/quizzes/code API fallback:', apiErr);
    }

    // 2. Try Supabase client SDK
    try {
      const remote = await SupabaseService.findQuizByCode(cleanCode);
      if (remote) {
        // Cache locally
        const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
        const idx = allQuizzes.findIndex(q => q.id === remote.quiz.id || q.quizCode === remote.quiz.quizCode);
        if (idx >= 0) {
          allQuizzes[idx] = remote.quiz;
        } else {
          allQuizzes.push(remote.quiz);
        }
        localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(allQuizzes));

        let allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');
        allQuestions = allQuestions.filter(q => q.quizId !== remote.quiz.id);
        allQuestions.push(...remote.questions);
        localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(allQuestions));

        return remote;
      }
    } catch (e) {
      console.warn('[StorageService] findQuizByCodeAsync remote error:', e);
    }

    // 3. Fallback to local
    return this.findQuizByCode(cleanCode);
  }

  /**
   * Submit quiz responses and calculate real-time score and accuracy analysis report.
   */
  static submitQuizSession(
    quiz: Quiz,
    questions: Question[],
    userAnswers: Record<string, OptionKey>,
    totalTimeSeconds: number,
    currentUser: User | null
  ): QuizSessionResult {
    this.initStorage();
    const sessionId = generateUUID();
    const now = new Date().toISOString();
    const allResponses: ResponseRecord[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.RESPONSES) || '[]');

    let correctCount = 0;
    const detailResults = questions.map(q => {
      const selected = userAnswers[q.id] || ('A' as OptionKey);
      const isCorrect = selected === q.correctOption;
      if (isCorrect) correctCount++;

      const respRecord: ResponseRecord = {
        id: generateUUID(),
        sessionId,
        userId: currentUser?.id,
        userName: currentUser?.displayName || '訪客',
        quizId: quiz.id,
        questionId: q.id,
        selectedOption: selected,
        isCorrect,
        timeSpentSeconds: Math.round(totalTimeSeconds / questions.length),
        answerTime: now,
      };
      allResponses.push(respRecord);

      return {
        question: q,
        selectedOption: selected,
        isCorrect,
      };
    });

    localStorage.setItem(STORAGE_KEYS.RESPONSES, JSON.stringify(allResponses));

    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const accuracyRate = score;

    // Asynchronously record into Supabase responses table via direct backend API
    fetch('/api/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userId: currentUser?.id,
        userName: currentUser?.displayName || '學生',
        quizId: quiz.id,
        responses: detailResults.map(r => ({
          questionId: r.question.id,
          selectedOption: r.selectedOption,
          isCorrect: r.isCorrect,
          timeSpentSeconds: Math.round(totalTimeSeconds / questions.length),
        })),
      }),
    }).catch(() => {
      SupabaseService.submitQuizSession(quiz, questions, userAnswers, totalTimeSeconds, currentUser);
    });

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
      completedAt: now,
    };
  }

  /**
   * Sync all local demo quizzes directly to Supabase PostgreSQL database
   * using DATABASE_URL & SUPABASE_SECRET_KEY (bypassing Supabase Auth and RLS constraints)!
   */
  static async syncAllLocalQuizzesToSupabase(): Promise<{ successCount: number; errors: string[]; method?: string }> {
    this.initStorage();

    // 1. First priority: Direct database synchronization via backend server
    // Operating directly via DATABASE_URL & SUPABASE_SECRET_KEY (No Supabase Auth required!)
    try {
      const resp = await fetch('/api/sync-quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.success) {
          return {
            successCount: data.count || 2,
            errors: [],
            method: 'DATABASE_URL (Direct PostgreSQL) & SUPABASE_SECRET_KEY',
          };
        }
      }
    } catch (apiErr) {
      console.warn('[StorageService] /api/sync-quizzes fallback:', apiErr);
    }

    // 2. Fallback: Client-side SDK
    const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    const allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');
    const users: User[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');

    let successCount = 0;
    const errors: string[] = [];

    for (const quiz of allQuizzes) {
      const quizQuestions = allQuestions.filter(q => q.quizId === quiz.id);
      const creator: User = users.find(u => u.id === quiz.creatorId) || {
        id: quiz.creatorId || '00000000-0000-0000-0000-000000000001',
        displayName: quiz.creatorName || '出題者',
        authProvider: 'anonymous',
        createdAt: new Date().toISOString(),
      };

      const res = await SupabaseService.saveQuiz(
        {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          questions: quizQuestions.map(q => ({
            id: q.id,
            questionOrder: q.questionOrder,
            questionText: q.questionText,
            correctOption: q.correctOption,
            explanation: q.explanation,
            options: q.options,
          })),
        },
        creator,
        quiz.quizCode
      );

      if (res.success) {
        successCount++;
      } else {
        errors.push(`題組 ${quiz.quizCode}: ${res.error}`);
      }
    }

    return { successCount, errors, method: 'Supabase Client SDK' };
  }

  /**
   * Get public active demo quiz codes for quick testing.
   */
  static getAvailableDemoCodes(): Array<{ code: string; title: string; questionCount: number; creatorName: string }> {
    this.initStorage();
    const allQuizzes: Quiz[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUIZZES) || '[]');
    const allQuestions: Question[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS) || '[]');

    return allQuizzes.map(q => ({
      code: q.quizCode,
      title: q.title,
      creatorName: q.creatorName || '出題者',
      questionCount: allQuestions.filter(qst => qst.quizId === q.id).length,
    }));
  }
}
