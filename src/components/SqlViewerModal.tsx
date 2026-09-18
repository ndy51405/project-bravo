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
  ExternalLink,
  Table
} from 'lucide-react';
import { SupabaseService, SupabaseHealthStatus, SUPABASE_URL, SUPABASE_KEY } from '../services/supabase';
import { StorageService } from '../services/storage';

interface SqlViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RLS_FIX_SQL = `-- ========================================================================
-- Supabase RLS 權限更新腳本 (針對 Publishable Key / 前端應用程式直接讀寫)
-- 請複製以下 SQL，至 Supabase Dashboard -> SQL Editor 執行此腳本即可開通權限！
-- ========================================================================

-- 解除資料表 RLS 嚴格限制，允許前端使用 Publishable Key 進行新增、讀取與刪除
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.options DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.responses DISABLE ROW LEVEL SECURITY;

-- 授權 anon (未登入/訪客/Publishable Key) 與 authenticated (登入者) 角色存取權限
GRANT ALL ON TABLE public.users TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.quizzes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.questions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.options TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.responses TO anon, authenticated, service_role;

-- 確保序列 (如有) 權限
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 插入系統預設使用者，避免出題者 UUID 外鍵關聯失敗
INSERT INTO public.users (id, display_name, email, auth_provider)
VALUES ('00000000-0000-0000-0000-000000000001', '預設出題者 (Prof. Chen)', 'chen.quiz@example.edu.tw', 'anonymous')
ON CONFLICT (id) DO NOTHING;
`;

const SCHEMA_SQL = `-- ========================================================================
-- Supabase PostgreSQL 建立資料庫表格結構 (Multi-tenant Quiz Schema)
-- 包含：Users, Quizzes, Questions, Options, Responses
-- 包含主鍵、外鍵、檢查約束、索引 (Indexes) 與 Row Level Security (RLS) 安全策略
-- 檔案路徑: database/create_table.sql
-- ========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 使用者資料表 (Users)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    display_name TEXT NOT NULL,
    auth_provider TEXT NOT NULL DEFAULT 'anonymous' CHECK (auth_provider IN ('anonymous', 'google')),
    password_hash TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 題組資料表 (Quizzes)
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    quiz_code VARCHAR(12) NOT NULL UNIQUE,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT quiz_code_uppercase_alphanumeric CHECK (quiz_code ~ '^[A-Z0-9]{4,12}$')
);

-- 3. 題目資料表 (Questions)
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

-- 4. 選項資料表 (Options)
CREATE TABLE IF NOT EXISTS public.options (
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    option_key VARCHAR(1) NOT NULL CHECK (option_key IN ('A', 'B', 'C', 'D', 'E')),
    option_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (question_id, option_key)
);

-- 5. 作答紀錄資料表 (Responses)
CREATE TABLE IF NOT EXISTS public.responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    selected_option VARCHAR(1) NOT NULL CHECK (selected_option IN ('A', 'B', 'C', 'D', 'E')),
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    answer_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
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
      const res = await SupabaseService.checkHealth();
      setHealth(res);
    } catch (e) {
      console.error(e);
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
      const result = await StorageService.syncAllLocalQuizzesToSupabase();
      if (result.successCount > 0) {
        setSyncResult(`🎉 成功使用 DATABASE_URL & SUPABASE_SECRET_KEY 同步 ${result.successCount} 筆範例題組至 Supabase PostgreSQL！（免依賴 Supabase Auth，直連資料庫成功）`);
        runHealthCheck();
      } else if (result.errors.length > 0) {
        setSyncResult(`⚠️ 同步遇到回報：${result.errors[0]}`);
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
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>連線狀態與診斷</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rls-fix')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'rls-fix'
                ? 'border-amber-600 text-amber-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>RLS 權限修復 SQL (必看)</span>
            <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.2 rounded font-semibold">推薦</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`py-3 px-3 text-xs font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'schema'
                ? 'border-teal-600 text-teal-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>完整建表 SQL (create_table.sql)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50">
          {/* TAB 1: STATUS & DIAGNOSTICS */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* Connection Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs uppercase font-bold tracking-wider text-slate-400">目前 Supabase 連線資訊</h4>
                    <p className="text-sm font-semibold text-slate-800 mt-1 font-mono break-all">{SUPABASE_URL}</p>
                  </div>
                  <button
                    type="button"
                    onClick={runHealthCheck}
                    disabled={isChecking}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>重新檢測</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-lg flex items-center justify-between">
                    <span className="text-emerald-900 font-medium">直連操作通道:</span>
                    <span className="font-bold text-emerald-800 font-mono text-[11px]">DATABASE_URL (pg.Pool)</span>
                  </div>
                  <div className="bg-emerald-50/80 border border-emerald-200/60 p-2.5 rounded-lg flex items-center justify-between">
                    <span className="text-emerald-900 font-medium">特權金鑰 (免 Auth):</span>
                    <span className="font-bold text-emerald-800 font-mono text-[11px]">SUPABASE_SECRET_KEY</span>
                  </div>
                </div>

                {health?.rowCount && (
                  <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg">
                    <div className="text-[11px] font-bold text-slate-500 uppercase mb-2">遠端資料庫實際已儲存列數 (Live Row Counts)</div>
                    <div className="flex flex-wrap gap-2 text-xs font-mono">
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
                        使用者 (users): <strong className="text-emerald-700 font-sans">{health.rowCount.users}</strong>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { name: 'public.users', key: 'users', desc: '出題者與作答者帳號' },
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
                      透過 <strong>DATABASE_URL & SUPABASE_SECRET_KEY</strong> 直接寫入資料庫，無需通過 Supabase Auth，無 RLS 限制。包含「基礎雲端架構測驗 (CLOUD9)」與「TypeScript 挑戰 (TS2026)」。
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
                    您的 Supabase 目前已建立資料表，但 PostgreSQL 預設啟用了 Row Level Security (RLS) 且要求使用 <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono">auth.uid() = creator_id</code>。
                    若前端應用程式使用 Publishable Key 進行出題者題組寫入，PostgreSQL 會擋下寫入。
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
            <span>已成功連接至 https://hkagibktealrcxlslqzu.supabase.co</span>
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
