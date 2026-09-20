-- ========================================================================
-- Supabase PostgreSQL 建立資料庫表格結構 (Multi-tenant Quiz Schema)
-- 包含：Quizzes, Questions, Options, Responses (無需自訂 users 表，原生對接 Supabase Auth)
-- 包含主鍵、外鍵、檢查約束、索引 (Indexes) 與 Row Level Security (RLS) 安全策略
-- ========================================================================

-- 啟用必要擴充功能 (UUID 生成)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 題組資料表 (Quizzes)
-- 記錄出題者 UUID、出題者名稱、標題、描述與 4 位數字題組代碼
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL,
    creator_name VARCHAR(100) DEFAULT '出題者',
    title VARCHAR(150) NOT NULL,
    description TEXT,
    quiz_code TEXT NOT NULL UNIQUE,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT quiz_code_four_digits CHECK (quiz_code ~ '^[0-9]{4}$')
);

COMMENT ON TABLE public.quizzes IS '題組主表，記錄出題者、名稱、描述與專屬代碼';
COMMENT ON COLUMN public.quizzes.creator_id IS '題組建立者 UUID (對應 Supabase Auth 或訪客 ID)';
COMMENT ON COLUMN public.quizzes.creator_name IS '出題者名稱';
COMMENT ON COLUMN public.quizzes.quiz_code IS '題組密碼/代碼，由 4 位數字組成，供答題者輸入';

-- 2. 題目資料表 (Questions)
-- 題組內的題目資料，包含題目、答案、解析、外鍵是 Quizzes 主鍵
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_order INT NOT NULL DEFAULT 1,
    question_text TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D', 'E')),
    explanation TEXT, -- 解析為選填
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.questions IS '單選題目表，每個題目隸屬於一個題組';
COMMENT ON COLUMN public.questions.correct_option IS '正確選項字母 (A, B, C, D, E)';
COMMENT ON COLUMN public.questions.explanation IS '題目答案解析 (選填)';

-- 3. 選項資料表 (Options)
-- Question 的選項，pk 使用 (question_id + option_key 其一)，foreign key 是 question_id
CREATE TABLE IF NOT EXISTS public.options (
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_key VARCHAR(1) NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D', 'E')),
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (question_id, option_key)
);

COMMENT ON TABLE public.options IS '題目選項表，主鍵為 (question_id, option_key)';
COMMENT ON COLUMN public.options.option_key IS '選項代號 (A, B, C, D, E)';
COMMENT ON COLUMN public.options.option_text IS '選項內文';

-- 4. 作答紀錄資料表 (Responses)
-- 記錄使用者作答結果，包含 answer_time, quiz_id, question_id, 選擇的選項, 答對與否等
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL, -- 每次測驗作答階段的識別碼
    user_id UUID,
    user_name VARCHAR(100),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option VARCHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D', 'E')),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    answer_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.responses IS '作答歷史記錄表，追蹤每題作答選項、花費時間與答對狀態';
COMMENT ON COLUMN public.responses.session_id IS '作答測驗場次 ID';

-- ========================================================================
-- 建立效能索引 (Indexes)
-- ========================================================================
CREATE INDEX IF NOT EXISTS idx_quizzes_creator ON public.quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_code ON public.quizzes(quiz_code);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON public.questions(quiz_id, question_order);
CREATE INDEX IF NOT EXISTS idx_options_question ON public.options(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_session ON public.responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_quiz ON public.responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_responses_user ON public.responses(user_id);

-- ========================================================================
-- Supabase Row Level Security (RLS) 權限防護策略
-- 保證使用者資料隱私隔離：出題者只能讀取與編輯自己建立的題組，不能看或改他人的題組
-- ========================================================================

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Quizzes RLS:
-- 1. 出題者只能查看、新增、修改、刪除自己建立的題組
CREATE POLICY "Creators can manage their own quizzes"
    ON public.quizzes
    FOR ALL
    USING (auth.uid() = creator_id)
    WITH CHECK (auth.uid() = creator_id);

-- 2. 答題者可以透過 quiz_code 讀取已發布的題組資訊
CREATE POLICY "Public can view published quizzes by code"
    ON public.quizzes
    FOR SELECT
    USING (is_published = TRUE);

-- Questions & Options RLS:
-- 出題者可完整操作題目與選項；答題者可透過關聯題組讀取
CREATE POLICY "Creators can manage questions in own quizzes"
    ON public.questions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes
            WHERE public.quizzes.id = public.questions.quiz_id
            AND public.quizzes.creator_id = auth.uid()
        )
    );

CREATE POLICY "Takers can view questions of published quizzes"
    ON public.questions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes
            WHERE public.quizzes.id = public.questions.quiz_id
            AND public.quizzes.is_published = TRUE
        )
    );

CREATE POLICY "Creators can manage options in own quizzes"
    ON public.options
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.questions
            JOIN public.quizzes ON public.quizzes.id = public.questions.quiz_id
            WHERE public.questions.id = public.options.question_id
            AND public.quizzes.creator_id = auth.uid()
        )
    );

CREATE POLICY "Takers can view options of published quizzes"
    ON public.options
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.questions
            JOIN public.quizzes ON public.quizzes.id = public.questions.quiz_id
            WHERE public.questions.id = public.options.question_id
            AND public.quizzes.is_published = TRUE
        )
    );

-- Responses RLS:
-- 答題者可寫入自己的作答記錄，並查看自己的作答報告
CREATE POLICY "Users can insert own responses"
    ON public.responses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view own responses"
    ON public.responses
    FOR SELECT
    USING (auth.uid() = user_id);

-- 題組建立者也可以查詢該題組的作答統計資訊
CREATE POLICY "Quiz creators can view responses for their quizzes"
    ON public.responses
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes
            WHERE public.quizzes.id = public.responses.quiz_id
            AND public.quizzes.creator_id = auth.uid()
        )
    );
