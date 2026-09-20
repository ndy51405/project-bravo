import React, { useState, useEffect } from 'react';
import { quizApi } from '../api/quizApi';
import { Quiz, Question, User } from '../types';
import { KeyRound, ArrowRight, AlertCircle, Sparkles, Loader2 } from 'lucide-react';

interface TakerPortalProps {
  currentUser: User | null;
  onStartQuiz: (quiz: Quiz, questions: Question[]) => void;
  onBackToRoleSelector: () => void;
  presetCode?: string;
}

export const TakerPortal: React.FC<TakerPortalProps> = ({
  currentUser,
  onStartQuiz,
  onBackToRoleSelector,
  presetCode = '',
}) => {
  const [code, setCode] = useState(presetCode.toUpperCase());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [publishedQuizzes, setPublishedQuizzes] = useState<Array<{ code: string; title: string; creatorName: string; questionCount: number }>>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchPublished = async () => {
      try {
        setIsLoadingList(true);
        const data = await quizApi.getPublishedQuizzes();
        if (isMounted && Array.isArray(data)) {
          setPublishedQuizzes(data);
        }
      } catch (err) {
        console.warn('載入現有發布題組失敗:', err);
      } finally {
        if (isMounted) {
          setIsLoadingList(false);
        }
      }
    };

    fetchPublished();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleVerifyAndStart = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMessage('請輸入出題者提供的題組密碼 (Quiz Code)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const found = await quizApi.getQuizByCode(cleanCode);
      setIsLoading(false);

      if (!found || !found.questions || found.questions.length === 0) {
        setErrorMessage('查無此題組密碼或該測驗尚未公開，請確認後重新輸入！');
        return;
      }

      onStartQuiz(found.quiz, found.questions);
    } catch (e: any) {
      setIsLoading(false);
      setErrorMessage(e?.message || '查詢題組時發生錯誤，請稍後重試');
    }
  };

  const handleQuickCode = async (quickCode: string) => {
    setCode(quickCode);
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const found = await quizApi.getQuizByCode(quickCode);
      setIsLoading(false);
      if (found && found.questions.length > 0) {
        onStartQuiz(found.quiz, found.questions);
      } else {
        setErrorMessage('查無此題組密碼');
      }
    } catch (e: any) {
      setIsLoading(false);
      setErrorMessage(e?.message || '查詢題組時發生錯誤');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white rounded-3xl border-2 border-orange-100 shadow-sm p-6 sm:p-10 relative overflow-hidden">
        {/* Background Subtle Accent */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-orange-50/70 -z-10" />

        {/* Portal Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            輸入題組密碼
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-500">
            請輸入出題者 (Quiz Creator) 提供的題組密碼以進入專屬測驗
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div 
            id="quiz-code-error-alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5 animate-in fade-in duration-150"
          >
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Code Input Form */}
        <form onSubmit={handleVerifyAndStart} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
              題組代碼 (4 位數字)
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                id="quiz-code-input"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setCode(val);
                  setErrorMessage(null);
                }}
                maxLength={4}
                placeholder="例如: 1001"
                className="w-full text-center text-xl sm:text-2xl font-mono font-bold tracking-widest px-4 py-3 rounded-xl border-2 border-orange-200 focus:outline-none focus:ring-4 focus:ring-orange-100 focus:border-orange-500 uppercase bg-orange-50/20 text-slate-800 transition-all placeholder:text-slate-300"
                autoFocus
              />
            </div>
          </div>

          <button
            id="start-quiz-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-2xl text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 active:scale-[0.99] transition-all shadow-sm hover:shadow-md flex items-center justify-center space-x-2 cursor-pointer"
          >
            <span>{isLoading ? '驗證中...' : '開始此題組測驗'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Published Quizzes from Database */}
        {(isLoadingList || publishedQuizzes.length > 0) && (
          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span>現有發布題組 (點擊直接代入測驗)</span>
              </span>
              {isLoadingList && (
                <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                  <Loader2 className="w-3 h-3 animate-spin text-orange-500" />
                  <span>資料庫同步中...</span>
                </span>
              )}
            </div>
            {isLoadingList ? (
              <div className="space-y-2">
                <div className="h-12 rounded-xl bg-slate-100/80 animate-pulse border border-slate-200/50" />
                <div className="h-12 rounded-xl bg-slate-100/80 animate-pulse border border-slate-200/50" />
              </div>
            ) : (
              <div className="space-y-2">
                {publishedQuizzes.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => handleQuickCode(item.code)}
                    className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-orange-50/70 border border-slate-200/80 hover:border-orange-200 transition-colors flex items-center justify-between group cursor-pointer"
                  >
                    <div className="truncate pr-2">
                      <div className="text-xs font-bold text-slate-800 group-hover:text-orange-700 truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        出題者: {item.creatorName} • 共 {item.questionCount} 題
                      </div>
                    </div>
                    <div className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-white text-orange-700 border border-orange-200 shrink-0 shadow-2xs">
                      {item.code}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={onBackToRoleSelector}
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            ← 返回身分選擇主畫面
          </button>
        </div>
      </div>
    </div>
  );
};
