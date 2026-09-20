import React from 'react';
import { User, AppRole } from '../types';
import { BookOpen, LogOut, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentRole: AppRole | null;
  onSelectRole: (role: AppRole | null) => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  onSelectRole,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-teal-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left Side: Back Arrow Button & Brand */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div 
            id="brand-header-button"
            onClick={() => onSelectRole(null)}
            className="flex items-center space-x-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-800 tracking-tight group-hover:text-teal-700 transition-colors">
                  Bravo自助測驗平台
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                自主出題管理 • 代碼即時測驗 • 深度診斷報告
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & User Section */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Back to Main Menu Button */}
          {currentRole && (
            <button
              id="back-to-main-btn"
              type="button"
              onClick={() => onSelectRole(null)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-teal-700 bg-slate-100 hover:bg-teal-50 border border-slate-200 hover:border-teal-200 transition-colors cursor-pointer"
              title="返回主選單"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              <span>回主選單</span>
            </button>
          )}

          {/* User Account Info */}
          {currentUser ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="flex items-center space-x-2">
                <img
                  src={currentUser.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                  alt={currentUser.displayName}
                  className="w-8 h-8 rounded-full border border-teal-300 bg-white"
                />
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-semibold text-slate-800 flex items-center space-x-1">
                    <span>{currentUser.displayName}</span>
                    {currentUser.authProvider === 'google' ? (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1 py-0.2 rounded font-normal">Google</span>
                    ) : (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.2 rounded font-normal">匿名</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-none">
                    {currentUser.email || '未綁定 Email'}
                  </div>
                </div>
              </div>

              <button
                id="logout-btn"
                type="button"
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title="登出帳號"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="login-btn"
              type="button"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors cursor-pointer"
            >
              登入 / 註冊
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
