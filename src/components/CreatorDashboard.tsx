import React, { useState } from 'react';
import { Quiz, User } from '../types';
import { quizApi } from '../api/quizApi';
import { 
  Plus, 
  Copy, 
  Check, 
  Trash2, 
  Edit3, 
  Search, 
  ShieldCheck, 
  ExternalLink,
  BookOpen,
  CloudUpload
} from 'lucide-react';

interface CreatorDashboardProps {
  currentUser: User;
  quizzes: Quiz[];
  onCreateNewQuiz: () => void;
  onEditQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
  onTestTakeQuiz: (quizCode: string) => void;
  onRefreshQuizzes?: () => void;
}

export const CreatorDashboard: React.FC<CreatorDashboardProps> = ({
  currentUser,
  quizzes,
  onCreateNewQuiz,
  onEditQuiz,
  onDeleteQuiz,
  onTestTakeQuiz,
  onRefreshQuizzes,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncStatus('正在同步範例題組至 Supabase PostgreSQL 資料庫...');
    try {
      const res = await quizApi.syncSeedQuizzes();
      if (onRefreshQuizzes) {
        onRefreshQuizzes();
      }
      setSyncStatus(`同步完成！已將 ${res.count} 組官方範例題組寫入資料庫！`);
    } catch (err: any) {
      setSyncStatus(err?.message || '同步失敗');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 4500);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2000);
  };

  const filteredQuizzes = quizzes.filter(
    (q) =>
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.quizCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
              Quiz Creator 中心
            </span>
            <span className="text-xs text-slate-500">
              建立者: <strong className="text-slate-700">{currentUser.displayName}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mt-1">
            我建立的題組管理
          </h1>
        </div>

        <div className="flex items-center space-x-3 self-start sm:self-auto">
          <button
            id="sync-quizzes-btn"
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 shadow-2xs transition-all cursor-pointer"
            title="將範例題組同步儲存至 Supabase"
          >
            <CloudUpload className={`w-4 h-4 ${isSyncing ? 'animate-bounce' : ''}`} />
            <span>{isSyncing ? '同步中...' : '同步至 Supabase'}</span>
          </button>

          <button
            id="create-quiz-btn"
            type="button"
            onClick={onCreateNewQuiz}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm transition-all hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>建立新題組</span>
          </button>
        </div>
      </div>

      {syncStatus && (
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* Multi-tenant Isolation Notice */}
      <div className="mt-4 p-3.5 bg-teal-50/70 rounded-xl border border-teal-200/80 flex items-start space-x-3 text-xs text-teal-900">
        <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div>
          <strong>多租戶隱私防護已啟用：</strong>
          您目前僅能瀏覽與編輯由自己帳戶建立的題組（共 {quizzes.length} 個）。系統嚴格隔離其他出題者的題組，保障出題內容隱私。
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="search-quiz-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜尋題組名稱或密碼..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
          />
        </div>
        <div className="text-xs text-slate-500">
          顯示 {filteredQuizzes.length} / {quizzes.length} 個題組
        </div>
      </div>

      {/* Quizzes List */}
      {filteredQuizzes.length === 0 ? (
        <div className="mt-8 text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700">
            {searchQuery ? '無相符的題組' : '尚未建立任何題組'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery 
              ? '請嘗試不同的搜尋關鍵字' 
              : '您可以點擊「建立新題組」按鈕，立即設定 1~20 道單選題並獲得專屬題組密碼。'}
          </p>
          {!searchQuery && (
            <button
              id="empty-create-quiz-btn"
              type="button"
              onClick={onCreateNewQuiz}
              className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>立即建立第一個題組</span>
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuizzes.map((quiz) => {
            const questionCount = quiz.questions?.length || 0;
            const isDeleting = deleteConfirmId === quiz.id;

            return (
              <div
                key={quiz.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-teal-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  {/* Top Bar: Code Pill & Actions */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] text-slate-500 font-medium">題組密碼:</span>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(quiz.quizCode)}
                        title="點擊複製題組密碼"
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
                      >
                        <span>{quiz.quizCode}</span>
                        {copiedCode === quiz.quizCode ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-teal-600" />
                        )}
                      </button>
                    </div>

                    <span className="text-[11px] font-medium text-slate-400">
                      {new Date(quiz.createdAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-bold text-slate-800 line-clamp-1">
                    {quiz.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                    {quiz.description || '無描述說明'}
                  </p>

                  {/* Metadata Stats */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-50">
                      <div className="text-slate-400 text-[10px] mb-0.5">題目數</div>
                      <div className="font-bold text-slate-700">{questionCount} 題</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <div className="text-slate-400 text-[10px] mb-0.5">作答人次</div>
                      <div className="font-bold text-slate-700">{quiz.takerCount || 0} 人</div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50">
                      <div className="text-slate-400 text-[10px] mb-0.5">平均得分</div>
                      <div className="font-bold text-teal-700">
                        {quiz.takerCount ? `${quiz.averageScore}分` : '-'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Footer */}
                <div className="px-5 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onTestTakeQuiz(quiz.quizCode)}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
                    title="以答題者身份測試本題組"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>測試作答</span>
                  </button>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => onEditQuiz(quiz.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      title="編輯題組與題目"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {isDeleting ? (
                      <div className="flex items-center space-x-1 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                        <span className="text-[11px] text-rose-600 font-medium">確定刪除？</span>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteQuiz(quiz.id);
                            setDeleteConfirmId(null);
                          }}
                          className="text-[11px] font-bold text-rose-700 hover:underline"
                        >
                          刪除
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(quiz.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="刪除題組"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
