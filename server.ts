import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// PostgreSQL Connection Pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});

// Admin Supabase Client using SUPABASE_SECRET_KEY (bypasses RLS and Supabase Auth)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hkagibktealrcxlslqzu.supabase.co';
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || '';
const adminSupabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Standard Seed Data for initial demonstration
const SEED_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    displayName: '陳教授 (Prof. Chen)',
    email: 'chen.quiz@example.edu.tw',
    authProvider: 'anonymous',
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    displayName: 'Google 學生 (ndy51405)',
    email: 'ndy51405@gmail.com',
    authProvider: 'google',
  },
];

const SEED_QUIZZES = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    creatorId: '00000000-0000-0000-0000-000000000001',
    title: '基礎雲端架構與 Web 核心測驗',
    description: '涵蓋 HTTP 狀態碼、RESTful API 原理與資料庫索引設計基礎概念。',
    quizCode: 'CLOUD9',
    isPublished: true,
    questions: [
      {
        id: '33333333-3333-4333-a333-333333333331',
        order: 1,
        text: 'HTTP 狀態碼中，代表「伺服器成功處理請求，且未返回任何實體內容」的是哪一個代碼？',
        correct: 'B',
        explanation: '204 No Content 代表請求已成功執行，但客戶端不需要離開當前頁面，通常用於 DELETE 或不需要返回資料的 PUT/POST 請求。',
        options: [
          { key: 'A', text: '200 OK' },
          { key: 'B', text: '204 No Content' },
          { key: 'C', text: '201 Created' },
          { key: 'D', text: '304 Not Modified' },
        ],
      },
      {
        id: '33333333-3333-4333-a333-333333333332',
        order: 2,
        text: '在關聯式資料庫 (如 PostgreSQL) 中，建立 B-Tree 索引最主要的目的為何？',
        correct: 'C',
        explanation: '索引透過特定排序資料結構（如平衡樹），大幅降低查詢時的磁碟 I/O 次數，使等值與範圍查詢時間複雜度由 O(N) 降低至 O(log N)。',
        options: [
          { key: 'A', text: '節省資料表在硬碟中所佔據的儲存空間' },
          { key: 'B', text: '自動備份資料表以防止硬體故障' },
          { key: 'C', text: '加速資料查詢速度，將全表掃描轉為對數搜尋' },
          { key: 'D', text: '強制資料庫執行資料欄位的型別檢查' },
        ],
      },
      {
        id: '33333333-3333-4333-a333-333333333333',
        order: 3,
        text: '關於多租戶 (Multi-tenancy) 架構中 Row Level Security (RLS) 的敘述，下列何者正確？',
        correct: 'A',
        explanation: 'RLS 直接在資料庫核心層級依據目前連線或使用者身份過濾資料列，能防止應用層邏輯疏漏導致的跨租戶資料洩漏。',
        options: [
          { key: 'A', text: '在資料庫引擎層級自動依使用者身份篩選可讀寫的記錄列' },
          { key: 'B', text: '只是一種前端加密傳輸協定，與資料庫查詢無關' },
          { key: 'C', text: '必須為每一個租戶個別建立獨立的實體資料庫伺服器' },
          { key: 'D', text: '主要用於防範分散式阻斷服務攻擊 (DDoS)' },
        ],
      },
    ],
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    creatorId: '00000000-0000-0000-0000-000000000001',
    title: 'TypeScript & 前端開發核心挑戰',
    description: '測試對 TypeScript 型別系統、React 渲染週期及現代前端工具的理解。',
    quizCode: 'TS2026',
    isPublished: true,
    questions: [
      {
        id: '44444444-4444-4444-a444-444444444441',
        order: 1,
        text: '在 TypeScript 中，`type` 與 `interface` 的主要差別之一是什麼？',
        correct: 'D',
        explanation: '同名的 interface 會自動進行宣告合併 (Declaration Merging)，而同名的 type alias 則會產生重複定義的編譯錯誤。',
        options: [
          { key: 'A', text: 'interface 只能用在 React 函式元件的 Props' },
          { key: 'B', text: 'type 無法表示物件結構，只能表示基本型別' },
          { key: 'C', text: 'type 會在編譯後的 JavaScript 保留實體程式碼' },
          { key: 'D', text: 'interface 支援同名宣告合併 (Declaration Merging)' },
        ],
      },
      {
        id: '44444444-4444-4444-a444-444444444442',
        order: 2,
        text: '下列哪一個 TypeScript 關鍵字或語法可用於排除 `null` 和 `undefined`？',
        correct: 'B',
        explanation: '非空斷言運算子 `!` (Non-null assertion operator) 告訴編譯器該值在運行時必定非空，而工具型別 `NonNullable<T>` 則可以在型別定義中剔除 null 與 undefined。',
        options: [
          { key: 'A', text: '可選串連運算子 ?.' },
          { key: 'B', text: '非空斷言運算子 ! 或 NonNullable<T>' },
          { key: 'C', text: '空值合併運算子 ??' },
          { key: 'D', text: '型別保護關鍵字 typeof' },
        ],
      },
    ],
  },
];

// Helper to execute batch database sync using PostgreSQL Transaction (DATABASE_URL)
async function syncQuizzesDirect(quizzesToSync: typeof SEED_QUIZZES) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insert or update quizzes directly (no users table required)
    for (const q of quizzesToSync) {
      // Upsert quiz
      await client.query(
        `INSERT INTO public.quizzes (id, creator_id, creator_name, title, description, quiz_code, is_published, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           creator_name = EXCLUDED.creator_name,
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           quiz_code = EXCLUDED.quiz_code,
           is_published = EXCLUDED.is_published,
           updated_at = NOW()`,
        [q.id, q.creatorId, '陳教授 (Prof. Chen)', q.title, q.description, q.quizCode, q.isPublished]
      );

      // Clean old questions for this quiz to avoid duplicate order
      await client.query('DELETE FROM public.questions WHERE quiz_id = $1', [q.id]);

      // Insert questions and options
      for (const qst of q.questions) {
        await client.query(
          `INSERT INTO public.questions (id, quiz_id, question_order, question_text, correct_option, explanation, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [qst.id, q.id, qst.order, qst.text, qst.correct, qst.explanation]
        );

        for (const opt of qst.options) {
          await client.query(
            `INSERT INTO public.options (question_id, option_key, option_text)
             VALUES ($1, $2, $3)
             ON CONFLICT (question_id, option_key) DO UPDATE SET option_text = EXCLUDED.option_text`,
            [qst.id, opt.key, opt.text]
          );
        }
      }
    }

    await client.query('COMMIT');
    return { success: true, count: quizzesToSync.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ==========================================
// API ROUTES
// ==========================================

// 1. Health check & database connection test (no users table needed)
app.get('/api/health', async (req, res) => {
  try {
    const dbRes = await pool.query('SELECT NOW() as current_time');
    const tableCounts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.quizzes) AS quizzes_count,
        (SELECT COUNT(*) FROM public.questions) AS questions_count,
        (SELECT COUNT(*) FROM public.options) AS options_count,
        (SELECT COUNT(*) FROM public.responses) AS responses_count
    `);

    res.json({
      status: 'ok',
      connection: 'connected',
      method: 'DATABASE_URL (Direct PostgreSQL) & SUPABASE_SECRET_KEY',
      timestamp: dbRes.rows[0].current_time,
      counts: {
        users: 0,
        quizzes: parseInt(tableCounts.rows[0].quizzes_count, 10),
        questions: parseInt(tableCounts.rows[0].questions_count, 10),
        options: parseInt(tableCounts.rows[0].options_count, 10),
        responses: parseInt(tableCounts.rows[0].responses_count, 10),
      },
    });
  } catch (err: any) {
    console.error('Health check error:', err);
    res.status(500).json({
      status: 'error',
      connection: 'failed',
      message: err?.message || 'Database connection error',
    });
  }
});

// 1.5 Supabase Auth direct user registration (Bypasses email delivery filter & auto-confirms email)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: '請提供電子郵件與密碼' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const name = String(displayName || '').trim() || cleanEmail.split('@')[0];

    // Create user directly in Supabase Auth (auth.users) using SUPABASE_SECRET_KEY
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email: cleanEmail,
      password: String(password).trim(),
      email_confirm: true, // Auto-confirm email so no verification link is required
      user_metadata: {
        display_name: name,
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      },
    });

    if (error) {
      console.warn('[API /api/auth/register] Supabase error:', error.message);
      let userFriendlyMsg = error.message;
      if (error.message.includes('already been registered') || error.message.includes('already registered')) {
        userFriendlyMsg = '此電子信箱已註冊，請直接進行登入';
      }
      return res.status(400).json({ error: userFriendlyMsg });
    }

    const user = data.user;
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: name,
        authProvider: 'supabase',
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.id)}`,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    console.error('[API /api/auth/register] Internal error:', err);
    return res.status(500).json({ error: err?.message || '註冊失敗' });
  }
});

// 2. Sync example quizzes directly using DATABASE_URL & SUPABASE_SECRET_KEY (no Supabase Auth needed)
app.post('/api/sync-quizzes', async (req, res) => {
  try {
    console.log('[API] Syncing example quizzes to Supabase via DATABASE_URL & SUPABASE_SECRET_KEY...');
    const result = await syncQuizzesDirect(SEED_QUIZZES);

    res.json({
      success: true,
      count: result.count,
      quizzes: SEED_QUIZZES.map(q => ({ id: q.id, code: q.quizCode, title: q.title })),
      message: '已成功使用 DATABASE_URL & SUPABASE_SECRET_KEY 將範例題組同步至 Supabase PostgreSQL 資料庫！',
    });
  } catch (err: any) {
    console.error('[API] Sync error:', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Failed to sync quizzes to database',
    });
  }
});

// 3. Find quiz by code (Direct database query, bypassing any RLS or Auth issues)
app.get('/api/quizzes/code/:code', async (req, res) => {
  try {
    const code = (req.params.code || '').trim().toUpperCase();
    const quizRes = await pool.query(
      `SELECT q.*, COALESCE(q.creator_name, '出題者') as creator_name 
       FROM public.quizzes q
       WHERE q.quiz_code = $1 AND q.is_published = true`,
      [code]
    );

    if (quizRes.rows.length === 0) {
      return res.status(404).json({ error: '查無此題組密碼' });
    }

    const quizRow = quizRes.rows[0];

    // Fetch questions
    const qstRes = await pool.query(
      `SELECT * FROM public.questions WHERE quiz_id = $1 ORDER BY question_order ASC`,
      [quizRow.id]
    );

    // Fetch options
    const questionIds = qstRes.rows.map(r => r.id);
    let optionsRows: any[] = [];
    if (questionIds.length > 0) {
      const optRes = await pool.query(
        `SELECT * FROM public.options WHERE question_id = ANY($1::uuid[]) ORDER BY option_key ASC`,
        [questionIds]
      );
      optionsRows = optRes.rows;
    }

    const questions = qstRes.rows.map(qst => ({
      id: qst.id,
      quizId: qst.quiz_id,
      questionOrder: qst.question_order,
      questionText: qst.question_text,
      correctOption: qst.correct_option,
      explanation: qst.explanation || '',
      options: optionsRows
        .filter(opt => opt.question_id === qst.id)
        .map(opt => ({
          optionKey: opt.option_key,
          optionText: opt.option_text,
        })),
    }));

    res.json({
      quiz: {
        id: quizRow.id,
        creatorId: quizRow.creator_id,
        creatorName: quizRow.creator_name || '出題者',
        title: quizRow.title,
        description: quizRow.description || '',
        quizCode: quizRow.quiz_code,
        isPublished: quizRow.is_published,
        createdAt: quizRow.created_at,
        updatedAt: quizRow.updated_at,
        questions,
      },
      questions,
    });
  } catch (err: any) {
    console.error('Fetch quiz by code error:', err);
    res.status(500).json({ error: err?.message || 'Database query error' });
  }
});

// 4. Get quizzes created by a user
app.get('/api/quizzes/creator/:creatorId', async (req, res) => {
  try {
    const { creatorId } = req.params;
    const client = await pool.connect();
    try {
      const qRes = await client.query(
        `SELECT q.*, 
                COUNT(DISTINCT r.session_id) as taker_count,
                COALESCE(AVG(CASE WHEN r.is_correct THEN 100.0 ELSE 0.0 END), 0) as average_score
         FROM public.quizzes q
         LEFT JOIN public.responses r ON q.id = r.quiz_id
         WHERE q.creator_id = $1
         GROUP BY q.id
         ORDER BY q.created_at DESC`,
        [creatorId]
      );

      const quizIds = qRes.rows.map(r => r.id);
      let questionsRows: any[] = [];
      let optionsRows: any[] = [];

      if (quizIds.length > 0) {
        const qstRes = await client.query(
          `SELECT * FROM public.questions WHERE quiz_id = ANY($1::uuid[]) ORDER BY question_order ASC`,
          [quizIds]
        );
        questionsRows = qstRes.rows;

        const qstIds = questionsRows.map(r => r.id);
        if (qstIds.length > 0) {
          const optRes = await client.query(
            `SELECT * FROM public.options WHERE question_id = ANY($1::uuid[]) ORDER BY option_key ASC`,
            [qstIds]
          );
          optionsRows = optRes.rows;
        }
      }

      const quizzes = qRes.rows.map(row => {
        const qList = questionsRows
          .filter(qst => qst.quiz_id === row.id)
          .map(qst => ({
            id: qst.id,
            quizId: qst.quiz_id,
            questionOrder: qst.question_order,
            questionText: qst.question_text,
            correctOption: qst.correct_option,
            explanation: qst.explanation || '',
            options: optionsRows
              .filter(o => o.question_id === qst.id)
              .map(o => ({ optionKey: o.option_key, optionText: o.option_text })),
          }));

        return {
          id: row.id,
          creatorId: row.creator_id,
          title: row.title,
          description: row.description || '',
          quizCode: row.quiz_code,
          isPublished: row.is_published,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          questions: qList,
          takerCount: parseInt(row.taker_count || '0', 10),
          averageScore: Math.round(parseFloat(row.average_score || '0')),
        };
      });

      res.json(quizzes);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Fetch creator quizzes error:', err);
    res.status(500).json({ error: err?.message || 'Database error' });
  }
});

// 5. Submit responses (No users table constraint)
app.post('/api/responses', async (req, res) => {
  try {
    const { sessionId, quizId, userId, userName, answers, responses, timeSpentSeconds } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const items = answers || responses || [];
      for (const item of items) {
        await client.query(
          `INSERT INTO public.responses 
            (id, session_id, quiz_id, question_id, user_id, user_name, selected_option, is_correct, time_spent_seconds, answer_time)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
          [
            sessionId,
            quizId,
            item.questionId,
            userId || null,
            userName || null,
            item.selectedOption,
            item.isCorrect,
            item.timeSpentSeconds || 0,
          ]
        );
      }

      await client.query('COMMIT');
      res.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Submit response error:', err);
    res.status(500).json({ error: err?.message || 'Database error' });
  }
});

// Helper function to save a single quiz and its questions
async function saveQuizToDatabase(client: any, quizItem: any, creatorItem?: any) {
  const qTitle = (quizItem.title || quizItem.quizData?.title || '').trim();
  const qDesc = (quizItem.description || quizItem.quizData?.description || '').trim();
  const qCode = (quizItem.quizCode || quizItem.generatedCode || quizItem.code || quizItem.quizData?.quizCode || '').trim().toUpperCase();
  const qId = quizItem.id || quizItem.quizData?.id || crypto.randomUUID();
  const cId = creatorItem?.id || quizItem.creatorId || '00000000-0000-0000-0000-000000000001';
  const cName = creatorItem?.displayName || quizItem.creatorName || '出題者';
  const rawQuestions = quizItem.questions || quizItem.quizData?.questions || [];

  if (!qTitle) {
    throw new Error('題組標題不能為空');
  }

  // Upsert quiz (NO users table dependency)
  await client.query(
    `INSERT INTO public.quizzes (id, creator_id, creator_name, title, description, quiz_code, is_published, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (id) DO UPDATE SET 
       creator_name = EXCLUDED.creator_name,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       quiz_code = EXCLUDED.quiz_code,
       is_published = EXCLUDED.is_published,
       updated_at = NOW()`,
    [qId, cId, cName, qTitle, qDesc, qCode, true]
  );

  // Delete old questions
  await client.query('DELETE FROM public.questions WHERE quiz_id = $1', [qId]);

  // Insert questions and options
  let order = 1;
  for (const qst of rawQuestions) {
    const qstId = qst.id && qst.id.includes('-') && qst.id.length === 36 ? qst.id : crypto.randomUUID();
    const qstOrder = qst.questionOrder || qst.order || order++;
    const qstText = (qst.questionText || qst.text || '').trim();
    const correctOpt = qst.correctOption || qst.correct || 'A';
    const expl = (qst.explanation || '').trim();

    await client.query(
      `INSERT INTO public.questions (id, quiz_id, question_order, question_text, correct_option, explanation, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [qstId, qId, qstOrder, qstText, correctOpt, expl || null]
    );

    const options = qst.options || [];
    for (const opt of options) {
      const optKey = opt.optionKey || opt.key;
      const optText = (opt.optionText || opt.text || '').trim();
      await client.query(
        `INSERT INTO public.options (question_id, option_key, option_text)
         VALUES ($1, $2, $3)
         ON CONFLICT (question_id, option_key) DO UPDATE SET option_text = EXCLUDED.option_text`,
        [qstId, optKey, optText]
      );
    }
  }

  return { id: qId, quizCode: qCode, title: qTitle };
}

// 6. Save or Update Quiz (Direct Database Transaction, accepts quiz or quizData)
app.post('/api/quizzes', async (req, res) => {
  try {
    const { quiz, quizData, creator, generatedCode } = req.body;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const targetQuiz = quiz || { quizData, generatedCode };
      const saved = await saveQuizToDatabase(client, targetQuiz, creator);

      await client.query('COMMIT');
      res.json({ success: true, quizId: saved.id, quizCode: saved.quizCode });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Save quiz error:', err);
    res.status(500).json({ error: err?.message || 'Database error' });
  }
});

// 7. Batch sync quizzes (e.g. from local storage cache to Supabase)
app.post('/api/quizzes/batch-sync', async (req, res) => {
  try {
    const { quizzes, creator } = req.body;
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res.json({ success: true, count: 0 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const synced: any[] = [];
      for (const q of quizzes) {
        const saved = await saveQuizToDatabase(client, q, creator);
        synced.push(saved);
      }
      await client.query('COMMIT');
      res.json({ success: true, count: synced.length, quizzes: synced });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Batch sync error:', err);
    res.status(500).json({ error: err?.message || 'Database sync error' });
  }
});

// 8. Delete Quiz
app.delete('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM public.quizzes WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Delete quiz error:', err);
    res.status(500).json({ error: err?.message || 'Database error' });
  }
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVING
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Database connected via DATABASE_URL & SUPABASE_SECRET_KEY`);
  });
}

startServer();
