import React, { useState, useEffect } from 'react';
import { Quiz, Question, OptionKey } from '../types';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  XCircle,
  Sparkles
} from 'lucide-react';

interface QuizTakerViewProps {
  quiz: Quiz;
  questions: Question[];
  onSubmitQuiz: (answers: Record<string, OptionKey>, totalTimeSeconds: number) => void;
  onExitQuiz: () => void;
}

export const QuizTakerView: React.FC<QuizTakerViewProps> = ({
  quiz,
  questions,
  onSubmitQuiz,
  onExitQuiz,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, OptionKey>>({});
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const totalCount = questions.length;
  const progressPercent = Math.round(((currentIndex + 1) / totalCount) * 100);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionKey: OptionKey) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionKey,
    }));
  };

  const handleNext = () => {
    if (currentIndex < totalCount - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleConfirmSubmit = () => {
    onSubmitQuiz(answers, secondsElapsed);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-3xl w-full mx-auto">
        {/* Minimalist Top Bar: Quiz Title, Timer & Exit */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                代碼: {quiz.quizCode}
              </span>
              <span className="text-xs text-slate-500">出題者: {quiz.creatorName || '出題者'}</span>
            </div>
            <h1 className="text-base sm:text-lg font-bold text-slate-800 line-clamp-1 mt-0.5">
              {quiz.title}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {/* Timer */}
            <div className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono font-semibold text-slate-700 shadow-2xs">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>{formatTime(secondsElapsed)}</span>
            </div>

            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              className="text-xs text-slate-400 hover:text-rose-600 transition-colors"
            >
              中途退出
            </button>
          </div>
        </div>

        {/* Progress Bar & Question Counter */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
            <span className="font-semibold text-teal-800">
              第 {currentIndex + 1} 題 / 共 {totalCount} 題
            </span>
            <span>已作答: {answeredCount} 題</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-teal-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Focused Question Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8">
          {/* Question Order & Title */}
          <div className="mb-6">
            <span className="inline-block text-xs font-bold text-teal-600 bg-teal-50 px-2.5 py-1 rounded-lg mb-2">
              單選題
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed tracking-tight">
              {currentQuestion.questionText}
            </h2>
          </div>

          {/* Options List */}
          <div className="space-y-3">
            {currentQuestion.options.map(option => {
              const isSelected = answers[currentQuestion.id] === option.optionKey;
              return (
                <button
                  key={option.optionKey}
                  type="button"
                  onClick={() => handleSelectOption(option.optionKey)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-start space-x-3.5 cursor-pointer ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/60 shadow-xs'
                      : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                  }`}
                >
                  {/* Option Letter Badge */}
                  <div
                    className={`w-8 h-8 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {option.optionKey}
                  </div>

                  {/* Option Text */}
                  <div className="flex-1 pt-1 text-sm sm:text-base text-slate-800 leading-snug">
                    {option.optionText}
                  </div>

                  {/* Checked indicator */}
                  {isSelected && (
                    <div className="pt-1 text-teal-600 shrink-0">
                      <CheckCircle2 className="w-5 h-5 fill-teal-100" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation & Submission Controls */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Prev / Next Buttons */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1 transition-colors ${
                currentIndex === 0
                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                  : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>上一題</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              disabled={currentIndex === totalCount - 1}
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1 transition-colors ${
                currentIndex === totalCount - 1
                  ? 'text-slate-300 bg-slate-100 cursor-not-allowed'
                  : 'text-slate-700 bg-white border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>下一題</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Submit button */}
          <button
            id="submit-quiz-btn"
            type="button"
            onClick={() => setShowSubmitConfirm(true)}
            className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-orange-600 hover:bg-orange-700 shadow-sm transition-all flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>繳卷並檢視報告</span>
          </button>
        </div>

        {/* Question Jump Numbers */}
        <div className="mt-6 p-4 bg-white rounded-2xl border border-slate-200/80">
          <div className="text-[11px] font-semibold text-slate-500 mb-2">
            題目跳轉快捷列 (點選數字切換題目)
          </div>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const isAnswered = Boolean(answers[q.id]);
              const isCurrent = idx === currentIndex;

              let btnClass = 'bg-slate-100 text-slate-600 border-slate-200';
              if (isCurrent) {
                btnClass = 'ring-2 ring-teal-500 bg-teal-600 text-white font-bold border-teal-600';
              } else if (isAnswered) {
                btnClass = 'bg-teal-50 text-teal-700 border-teal-300 font-semibold';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-8 h-8 rounded-lg text-xs border transition-all flex items-center justify-center ${btnClass}`}
                  title={`第 ${idx + 1} 題 ${isAnswered ? '(已作答)' : '(未作答)'}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-orange-100 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-800">
              確定繳交測驗卷？
            </h3>

            {answeredCount < totalCount ? (
              <div className="my-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs text-left flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  還有 <strong>{totalCount - answeredCount}</strong> 題尚未作答！未作答題目將直接視為錯誤。
                </div>
              </div>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                您已完成所有 {totalCount} 道題目作答，繳交後將立即計算分數與答對率報告。
              </p>
            )}

            <div className="mt-5 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                繼續作答
              </button>
              <button
                id="confirm-submit-quiz-btn"
                type="button"
                onClick={handleConfirmSubmit}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-xs"
              >
                確認繳交
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center border border-slate-200">
            <h3 className="text-base font-bold text-slate-800">
              確認中途離開測驗？
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              離開將不會儲存當前的作答進度。
            </p>
            <div className="mt-5 flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                留下作答
              </button>
              <button
                type="button"
                onClick={onExitQuiz}
                className="flex-1 py-2 rounded-xl text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100"
              >
                確定離開
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
