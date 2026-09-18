import React, { useState } from 'react';
import { User } from '../types';
import { SupabaseService, SUPABASE_URL } from '../services/supabase';
import { StorageService } from '../services/storage';
import { 
  BookOpen, 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Database, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'guest'>('signin');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  // Guest / Anonymous state
  const [guestName, setGuestName] = useState('');

  // UI status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Check if there are local quizzes to inform the user
  const localQuizCount = (() => {
    try {
      const q = JSON.parse(localStorage.getItem('online_quiz_quizzes') || '[]');
      return q.length;
    } catch {
      return 0;
    }
  })();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('請輸入電子信箱與密碼');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await SupabaseService.signInWithEmail(email, password);
      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      if (result.user) {
        setSuccessMessage('登入成功！正在載入測驗平台...');
        StorageService.setCurrentUser(result.user);
        // Automatically sync any locally created quizzes (such as the math quiz) into Supabase PostgreSQL
        await StorageService.autoSyncAllLocalQuizzes(result.user);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 400);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '登入時發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || !displayName.trim()) {
      setErrorMessage('請填寫姓名、電子信箱與密碼');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('密碼長度至少需 6 個字元');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await SupabaseService.signUpWithEmail(email, password, displayName);
      if (result.error) {
        setErrorMessage(result.error);
        setIsLoading(false);
        return;
      }

      if (result.user) {
        if (result.requiresEmailConfirmation) {
          setSuccessMessage('註冊請求已送出至 Supabase Auth！若您的專案啟用了信箱驗證，請至信箱點擊驗證連結，或可切換至「快速訪客模式」立即體驗。');
        } else {
          setSuccessMessage('註冊成功！帳號已直接寫入 Supabase Auth 系統，正在為您建立工作區...');
        }

        StorageService.setCurrentUser(result.user);
        // Automatically sync any locally created quizzes into Supabase PostgreSQL
        await StorageService.autoSyncAllLocalQuizzes(result.user);
        setTimeout(() => {
          onLoginSuccess(result.user!);
        }, 600);
      }
    } catch (err: any) {
      setErrorMessage(err.message || '註冊過程中發生錯誤');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = guestName.trim() || '訪客學者';
    const user: User = {
      id: crypto.randomUUID ? crypto.randomUUID() : '00000000-0000-0000-0000-000000000003',
      displayName: name,
      authProvider: 'anonymous',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
    };

    StorageService.setCurrentUser(user);
    StorageService.autoSyncAllLocalQuizzes(user);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-600 text-white shadow-md mb-4 shadow-teal-600/20">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">
          多租戶測驗與學習診斷平台
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          登入以管理個人題組、產生專屬密碼與即時診斷報告
        </p>

        {/* Supabase Status Pill */}
        <div className="mt-3 inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-semibold">Supabase Auth 已就緒</span>
          <span className="text-[11px] text-emerald-600 font-mono">
            {SUPABASE_URL.replace('https://', '')}
          </span>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl sm:px-10 border border-slate-200/80">
          
          {/* Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
            <button
              id="tab-signin-btn"
              type="button"
              onClick={() => { setActiveTab('signin'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'signin'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>帳號登入</span>
            </button>
            <button
              id="tab-signup-btn"
              type="button"
              onClick={() => { setActiveTab('signup'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'signup'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>新用戶註冊</span>
            </button>
            <button
              id="tab-guest-btn"
              type="button"
              onClick={() => { setActiveTab('guest'); setErrorMessage(''); setSuccessMessage(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'guest'
                  ? 'bg-white text-teal-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>訪客試用</span>
            </button>
          </div>

          {/* Feedback Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* SIGN IN FORM */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  電子信箱 (Email)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="signin-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  密碼
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signin-password-input"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                id="signin-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <span>驗證中...</span>
                ) : (
                  <>
                    <span>登入 Supabase Auth</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="p-3 bg-teal-50/70 border border-teal-100 rounded-xl text-xs text-teal-800">
                註冊帳號將直接寫入 <strong>Supabase Auth</strong> 系統，完全不需要維護自定義的 users 表。
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  您的姓名或暱稱
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-name-input"
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="王大明 (或教授/老師稱謂)"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  電子信箱 (Email)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  設定密碼 (至少 6 碼)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="signup-password-input"
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 位密碼"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <button
                id="signup-submit-btn"
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <span>註冊中...</span>
                ) : (
                  <>
                    <span>註冊至 Supabase Auth</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* GUEST / TEST MODE */}
          {activeTab === 'guest' && (
            <form onSubmit={handleGuestLogin} className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-800">
                以訪客身分可立即瀏覽範例題組、輸入密碼作答測驗或測試出題功能。
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  訪客姓名
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    id="guest-name-input"
                    type="text"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="訪客學生"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    autoFocus
                  />
                </div>
              </div>

              <button
                id="guest-submit-btn"
                type="submit"
                className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors shadow-xs flex items-center justify-center space-x-2"
              >
                <span>以訪客身份進入平台</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            </form>
          )}

          {/* Local Math Quizzes Notification */}
          {localQuizCount > 0 && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center space-x-2 bg-slate-50/60 p-2.5 rounded-lg">
              <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
              <div>
                偵測到您本機瀏覽器中存有 <strong>{localQuizCount} 組題組（包含建立的 math 題組）</strong>，登入後將自動同步寫入 Supabase 雲端資料庫！
              </div>
            </div>
          )}

          <div className="mt-5 pt-3 border-t border-slate-100 text-center">
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>安全連線 • 無自訂 users 表 • 原生 Supabase Auth</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
