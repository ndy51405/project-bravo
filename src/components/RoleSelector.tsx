import React from 'react';
import { AppRole, User } from '../types';
import { PenTool, CheckCircle2, ArrowRight, ShieldCheck, KeyRound, Sparkles, BookOpen } from 'lucide-react';

interface RoleSelectorProps {
  currentUser: User | null;
  onSelectRole: (role: AppRole) => void;
  myQuizCount: number;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  currentUser,
  onSelectRole,
  myQuizCount,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Welcome Banner */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>多租戶題庫與即時作答系統</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          歡迎，{currentUser?.displayName || '使用者'}！請選擇您的操作身分
        </h1>
        <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
          系統支援雙重角色：您可以建立與管理自己的專屬題組，或以答題者身分輸入題組密碼進行測驗。
        </p>
      </div>

      {/* Two Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Role 1: Quiz Creator (Turquoise Theme) */}
        <div
          id="select-creator-role-card"
          onClick={() => onSelectRole('creator')}
          className="group relative bg-white rounded-2xl p-6 sm:p-8 border-2 border-teal-100 hover:border-teal-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-4 right-4">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
              {myQuizCount} 個我的題組
            </span>
          </div>

          <div>
            <div className="w-14 h-14 rounded-2xl bg-teal-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
              <PenTool className="w-7 h-7" />
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-teal-600 mb-1">
              Quiz Creator
            </div>
            <h2 className="text-xl font-bold text-slate-800 group-hover:text-teal-700 transition-colors">
              我是出題者
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              建立專屬題組 (1~20 題)，自訂 2~5 個選項、正確答案與詳細解析。
              系統自動產生專屬題組密碼，並保障多租戶隔離，其他人無法查看或編輯您的題組。
            </p>

            {/* Feature highlights */}
            <ul className="mt-5 space-y-2 text-xs text-slate-600">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>自由增刪修改題組與題目 (支援 2~5 選項)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>生成大寫英數題組密碼 (Quiz Code)</span>
              </li>
              <li className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span>嚴格租戶隔離：僅能管理自己建立的題組</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-teal-700 font-semibold text-sm group-hover:translate-x-1 transition-transform">
            <span>前往出題管理中心</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>

        {/* Role 2: Quiz Taker (Orange Theme) */}
        <div
          id="select-taker-role-card"
          onClick={() => onSelectRole('taker')}
          className="group relative bg-white rounded-2xl p-6 sm:p-8 border-2 border-orange-100 hover:border-orange-500 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="absolute top-4 right-4">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              即刻開始答題
            </span>
          </div>

          <div>
            <div className="w-14 h-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center mb-5 shadow-sm group-hover:scale-105 transition-transform">
              <KeyRound className="w-7 h-7" />
            </div>

            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">
              Quiz Taker
            </div>
            <h2 className="text-xl font-bold text-slate-800 group-hover:text-orange-700 transition-colors">
              我是答題者
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              輸入出題者提供的題組密碼 (Quiz Code)，即可進入無干擾的純淨答題介面。
              全心專注在題目與選項作答，答題結束後立即獲得即時計分與答對率分析報告。
            </p>

            {/* Feature highlights */}
            <ul className="mt-5 space-y-2 text-xs text-slate-600">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>憑題組密碼迅速載入題目，驗證無誤即可開始</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>極簡純粹的作答版面，專注於題目文字與選項</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                <span>即時分數、答對率與各題解答解析回顧</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-orange-700 font-semibold text-sm group-hover:translate-x-1 transition-transform">
            <span>輸入密碼開始測驗</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
