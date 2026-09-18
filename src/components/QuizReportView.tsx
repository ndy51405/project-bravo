import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { QuizSessionResult } from '../types';
import { 
  Award, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RotateCcw, 
  ArrowRight, 
  Home, 
  Sparkles,
  HelpCircle,
  BookOpen
} from 'lucide-react';

interface QuizReportViewProps {
  result: QuizSessionResult;
  onRetake: () => void;
  onEnterAnotherCode: () => void;
  onBackToHome: () => void;
}

export const QuizReportView: React.FC<QuizReportViewProps> = ({
  result,
  onRetake,
  onEnterAnotherCode,
  onBackToHome,
}) => {
  const {
    quiz,
    totalQuestions,
    correctCount,
    incorrectCount,
    score,
    accuracyRate,
    totalTimeSeconds,
    results,
  } = result;

  useEffect(() => {
    // Trigger celebratory confetti if score >= 70
    if (accuracyRate >= 60) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0d9488', '#14b8a6', '#f97316', '#ea580c', '#38bdf8'],
      });
    }
  }, [accuracyRate]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins} 分 ${remainingSecs} 秒`;
  };

  const getTier = (rate: number) => {
    if (rate >= 90) return { label: '卓越出眾', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    if (rate >= 75) return { label: '表現優異', color: 'bg-teal-100 text-teal-800 border-teal-300' };
    if (rate >= 60) return { label: '合格通過', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: '再接再厲', color: 'bg-rose-100 text-rose-800 border-rose-300' };
  };

  const tier = getTier(accuracyRate);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Top Banner */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>測驗即時統計分析報告</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">
          {quiz.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          題組代碼: {quiz.quizCode} • 出題者: {quiz.creatorName || '出題者'}
        </p>
      </div>

      {/* Main Score & Metrics Bento Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center">
          {/* Main Score Badge */}
          <div className="md:col-span-1 text-center py-4 px-2 rounded-2xl bg-gradient-to-br from-teal-50 to-teal-100/50 border border-teal-200">
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-1">
              測驗總分
            </div>
            <div className="text-5xl font-black text-teal-700 tracking-tight">
              {score}
              <span className="text-lg font-bold text-teal-500 ml-1">分</span>
            </div>
            <div className={`mt-3 inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${tier.color}`}>
              {tier.label}
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Accuracy Rate */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                整體答對率
              </div>
              <div className="text-2xl font-bold text-slate-800">
                {accuracyRate}%
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-teal-500 rounded-full"
                  style={{ width: `${accuracyRate}%` }}
                />
              </div>
            </div>

            {/* Questions Stats */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                題目統計
              </div>
              <div className="text-sm font-semibold text-slate-700 flex items-center space-x-2 mt-1">
                <span className="text-emerald-600 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-0.5" /> 正確 {correctCount}
                </span>
                <span className="text-rose-600 flex items-center">
                  <XCircle className="w-4 h-4 mr-0.5" /> 錯誤 {incorrectCount}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                總題數: {totalQuestions} 題
              </div>
            </div>

            {/* Time Spent */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 col-span-2 sm:col-span-1">
              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                測驗耗時
              </div>
              <div className="text-xl font-bold text-slate-800 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-orange-500" />
                <span>{formatTime(totalTimeSeconds)}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                平均每題約 {Math.round(totalTimeSeconds / (totalQuestions || 1))} 秒
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRetake}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新測驗本題</span>
          </button>

          <button
            type="button"
            onClick={onEnterAnotherCode}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-xs transition-colors"
          >
            <span>輸入其他題組代碼</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>返回身分主畫面</span>
          </button>
        </div>
      </div>

      {/* Detailed Question Review List with Explanations */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <span>逐題解析與作答診斷回顧</span>
          </h2>
          <span className="text-xs text-slate-500">
            共 {results.length} 題
          </span>
        </div>

        {results.map((item, idx) => {
          const { question, selectedOption, isCorrect } = item;
          const selectedOptObj = question.options.find(o => o.optionKey === selectedOption);
          const correctOptObj = question.options.find(o => o.optionKey === question.correctOption);

          return (
            <div
              key={question.id}
              className={`bg-white rounded-2xl border p-6 transition-all shadow-2xs ${
                isCorrect ? 'border-teal-200/80' : 'border-rose-200/80'
              }`}
            >
              {/* Question Top Indicator */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    第 {idx + 1} 題
                  </span>
                </div>

                <div className="flex items-center space-x-1">
                  {isCorrect ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>答對</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>答錯</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Question Text */}
              <h3 className="text-base font-bold text-slate-900 mb-4 leading-relaxed">
                {question.questionText}
              </h3>

              {/* Option breakdown */}
              <div className="space-y-2 mb-4">
                {question.options.map(opt => {
                  const wasChosen = opt.optionKey === selectedOption;
                  const isAnswerKey = opt.optionKey === question.correctOption;

                  let rowStyle = 'bg-slate-50/50 border-slate-200 text-slate-700';
                  if (isAnswerKey) {
                    rowStyle = 'bg-teal-50 border-teal-300 text-teal-900 font-semibold';
                  } else if (wasChosen && !isCorrect) {
                    rowStyle = 'bg-rose-50/70 border-rose-300 text-rose-900 font-medium';
                  }

                  return (
                    <div
                      key={opt.optionKey}
                      className={`p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between ${rowStyle}`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isAnswerKey 
                            ? 'bg-teal-600 text-white' 
                            : wasChosen 
                              ? 'bg-rose-500 text-white' 
                              : 'bg-white border text-slate-600'
                        }`}>
                          {opt.optionKey}
                        </span>
                        <span>{opt.optionText}</span>
                      </div>

                      <div className="flex items-center space-x-1 text-xs">
                        {wasChosen && (
                          <span className={`px-2 py-0.5 rounded-md font-semibold ${
                            isCorrect ? 'bg-teal-200/70 text-teal-800' : 'bg-rose-200/70 text-rose-800'
                          }`}>
                            您的選擇
                          </span>
                        )}
                        {isAnswerKey && (
                          <span className="px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800">
                            正確解答
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Question Explanation */}
              {question.explanation ? (
                <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/70 text-xs text-teal-950">
                  <div className="font-bold flex items-center space-x-1.5 text-teal-800 mb-1">
                    <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                    <span>題目解析</span>
                  </div>
                  <p className="leading-relaxed pl-5">
                    {question.explanation}
                  </p>
                </div>
              ) : (
                <div className="text-[11px] text-slate-400 italic">
                  出題者未附解答解析
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
