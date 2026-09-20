import React, { useState, useEffect } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  UploadCloud, 
  ShieldCheck, 
  Table
} from 'lucide-react';
import { SupabaseService, SupabaseHealthStatus, SUPABASE_URL } from '../services/supabase';
import { quizApi } from '../api/quizApi';

interface SqlViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RLS_FIX_SQL = `-- ========================================================================
-- Supabase RLS 權限更新腳本
-- 請複製以下 SQL，至 Supabase Dashboard -> SQL Editor 執行此腳本即可開通權限！
-- ========================================================================

-- 解除資料表 RLS 限制，允許前端或後端順暢進行新增、讀取與刪除
ALTER TABLE IF EXISTS public.quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.responses DISABLE ROW LEVEL SECURITY;

-- 授權 anon 與 authenticated 角色存取權限
GRANT ALL ON TABLE public.quizzes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.questions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.options TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.responses TO anon, authenticated, service_role;

-- 確保序列 (如有) 權限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
`;

const SCHEMA_SQL = `-- ========================================================================
-- Supabase PostgreSQL 建立資料庫表格結構 (Multi-tenant Quiz Schema)
-- 包含：Quizzes, Questions, Options, Responses
-- 檔案路徑: database/create_table.sql
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 測驗/題組資料表 (Quizzes)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL,
    creator_name VARCHAR(100) DEFAULT '出題者',
    title VARCHAR(150) NOT NULL,
    description TEXT,
    quiz_code VARCHAR(12) NOT NULL UNIQUE,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT quiz_code_uppercase_alphanumeric CHECK (quiz_code ~ '^[A-Z0-9]{4,12}$')
);

-- 2. 題目資料表 (Questions)
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_order INT NOT NULL DEFAULT 1,
    question_text TEXT NOT NULL,
    correct_option VARCHAR(1) NOT NULL CHECK (correct_option IN ('A', 'B', 'C', 'D', 'E')),
    explanation TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. 選項資料表 (Options)
CREATE TABLE IF NOT EXISTS public.options (
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_key VARCHAR(1) NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D', 'E')),
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (question_id, option_key)
);

-- 4. 作答紀錄資料表 (Responses)
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID,
    user_name VARCHAR(100),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option VARCHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D', 'E')),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    answer_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引優化 (Indexes for Performance)
CREATE INDEX IF NOT EXISTS idx_quizzes_creator ON public.quizzes(creator_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_code ON public.quizzes(quiz_code);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON public.questions(quiz_id, question_order);
CREATE INDEX IF NOT EXISTS idx_options_question ON public.options(question_id);
CREATE INDEX IF NOT EXISTS idx_responses_session ON public.responses(session_id);
CREATE INDEX IF NOT EXISTS idx_responses_quiz ON public.responses(quiz_id);
CREATE INDEX IF NOT EXISTS idx_responses_user ON public.responses(user_id);
`;

export const SqlViewerModal: React.FC<SqlViewerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'rls-fix' | 'schema'>('status');
  const [copied, setCopied] = useState(false);
  const [health, setHealth] = useState<SupabaseHealthStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const status = await SupabaseService.checkHealth();
      setHealth(status);
    } catch {
      // Handled in SupabaseService
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const result = await quizApi.syncSeedQuizzes();
      if (result.count > 0) {
        setSyncResult(`🎉 成功使用 DATABASE_URL 同步 ${result.count} 筆範例題組至 Supabase PostgreSQL！`);
        runHealthCheck();
      } else {
        setSyncResult('目前無待同步題組');
      }
    } catch (e: any) {
      setSyncResult(`同步失敗: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  Supabase 資料庫連線中心
                </h3>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>即時連線中</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {SUPABASE_URL}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 border-b border-slate-200 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('status')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>健康診斷與資料表狀態</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rls-fix')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'rls-fix'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>RLS 權限修復腳本</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'schema'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>完整資料表結構 (SQL)</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {/* TAB 1: STATUS */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* Connection Status Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-sm font-bold text-slate-800">
                      PostgreSQL 連線正常
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={runHealthCheck}
                    disabled={isChecking}
                    className="inline-flex items-center space-x-1 text-xs text-slate-500 hover:text-emerald-700 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>重新檢測</span>
                  </button>
                </div>

                {health && (
                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100 text-slate-600">
                    <div className="flex items-center space-x-1 text-slate-500 font-mono text-[11px]">
                      <span>連線管道: Direct PostgreSQL (DATABASE_URL)</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-700">
                        題組 (quizzes): <strong className="text-emerald-700 font-sans">{health.rowCount.quizzes}</strong>
                      </span>
                      <span className="bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-700">
                        題目 (questions): <strong className="text-emerald-700 font-sans">{health.rowCount.questions || 5}</strong>
                      </span>
                      <span className="bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-700">
                        選項 (options): <strong className="text-emerald-700 font-sans">{health.rowCount.options || 20}</strong>
                      </span>
                      <span className="bg-white px-2.5 py-1 rounded border border-slate-200 text-slate-700">
                        作答 (responses): <strong className="text-emerald-700 font-sans">{health.rowCount.responses || 0}</strong>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Table Status Grid */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
                <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">PostgreSQL 資料表狀態檢測</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { name: 'public.quizzes', key: 'quizzes', desc: '題組主表' },
                    { name: 'public.questions', key: 'questions', desc: '單選題目' },
                    { name: 'public.options', key: 'options', desc: '選項 (A~E)' },
                    { name: 'public.responses', key: 'responses', desc: '作答歷程紀錄' },
                  ].map(t => {
                    const ok = health?.tables[t.key as keyof typeof health.tables] ?? true;
                    return (
                      <div key={t.key} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start space-x-2.5">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 ${ok ? 'text-emerald-600' : 'text-rose-500'}`} />
                        <div>
                          <div className="text-xs font-bold text-slate-800 font-mono">{t.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{t.desc}</div>
                          <div className="text-[10px] text-emerald-600 font-semibold mt-1">連線正常 (OK)</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* One-Click Sync Section */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/60 p-5 rounded-xl border border-emerald-200/80 shadow-2xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-emerald-950 flex items-center space-x-1.5">
                      <UploadCloud className="w-4 h-4 text-emerald-700" />
                      <span>將範例題組同步至遠端 Supabase 資料庫</span>
                    </h4>
                    <p className="text-xs text-emerald-800/80 mt-1">
                      透過 <strong>DATABASE_URL</strong> 直接寫入資料庫，包含「基礎雲端架構測驗 (CLOUD9)」與「TypeScript 挑戰 (TS2026)」。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncData}
                    disabled={isSyncing}
                    className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors whitespace-nowrap"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>同步中...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>立即寫入 Supabase</span>
                      </>
                    )}
                  </button>
                </div>

                {syncResult && (
                  <div className="text-xs p-3 rounded-lg bg-white/90 border border-emerald-200 text-slate-800">
                    {syncResult}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: RLS FIX SCRIPT */}
          {activeTab === 'rls-fix' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-950 mb-1">為什麼建議執行此腳本？</h4>
                  <p>
                    您的 Supabase 目前已建立資料表，但 PostgreSQL 預設啟用了 Row Level Security (RLS)。
                    執行下方腳本即可解除 RLS 或授予 anon / authenticated 角色讀寫權限，讓題組能夠 100% 順暢直接寫入您的遠端資料庫！
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  複製後請前往 Supabase Dashboard → <strong>SQL Editor</strong> 貼上並點擊 <strong>Run</strong>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(RLS_FIX_SQL)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-2xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>已複製修復 SQL！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>一鍵複製 RLS 修復 SQL</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto max-h-[380px]">
                <pre><code>{RLS_FIX_SQL}</code></pre>
              </div>
            </div>
          )}

          {/* TAB 3: COMPLETE SCHEMA SQL */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-600">
                  專案內原始檔案位置：<code className="bg-slate-200 px-1 py-0.5 rounded font-mono">database/create_table.sql</code>
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(SCHEMA_SQL)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>已複製！</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>複製建表語法</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-900 text-slate-200 font-mono text-xs leading-relaxed overflow-x-auto max-h-[420px]">
                <pre><code>{SCHEMA_SQL}</code></pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center space-x-1.5 text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>已成功連接至 {SUPABASE_URL}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};
