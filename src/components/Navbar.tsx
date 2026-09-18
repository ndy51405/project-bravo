import React from 'react';
import { User, AppRole } from '../types';
import { BookOpen, Award, LogOut, Database, UserCheck, ArrowLeftRight } from 'lucide-react';

interface NavbarProps {
  currentUser: User | null;
  currentRole: AppRole | null;
  onSelectRole: (role: AppRole | null) => void;
  onOpenAuth: () => void;
  onOpenSqlModal: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentRole,
  onSelectRole,
  onOpenAuth,
  onOpenSqlModal,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-teal-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
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
                多租戶測驗平台
              </span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Multi-Tenant
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              自主出題管理 • 代碼即時測驗 • 深度診斷報告
            </p>
          </div>
        </div>

        {/* Action Controls & User Section */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Supabase Connection & Schema Viewer Button */}
          <button
            id="view-sql-schema-btn"
            type="button"
            onClick={onOpenSqlModal}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
            title="檢視 Supabase 連線狀態、資料表與 RLS 權限腳本"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline font-semibold">Supabase 已連線</span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100/70 px-1 py-0.5 rounded font-mono hidden md:inline">
              hkagibktealrcxlslqzu
            </span>
          </button>

          {/* Current Role Switcher Pill */}
          {currentRole && (
            <button
              id="switch-role-btn"
              type="button"
              onClick={() => onSelectRole(null)}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeftRight className="w-3 h-3 text-slate-500" />
              <span>切換角色</span>
              <span className={`px-1.5 py-0.2 rounded font-semibold ${
                currentRole === 'creator' ? 'bg-teal-100 text-teal-800' : 'bg-orange-100 text-orange-800'
              }`}>
                {currentRole === 'creator' ? '出題者' : '答題者'}
              </span>
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
                id="switch-user-btn"
                type="button"
                onClick={onOpenAuth}
                className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                title="切換帳戶"
              >
                <UserCheck className="w-4 h-4" />
              </button>

              <button
                id="logout-btn"
                type="button"
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
              className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors"
            >
              登入 / 註冊
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
