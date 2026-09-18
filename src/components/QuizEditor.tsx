import React, { useState } from 'react';
import { Quiz, Question, OptionKey, OptionItem, User } from '../types';
import { StorageService } from '../services/storage';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  HelpCircle,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Database
} from 'lucide-react';

interface QuizEditorProps {
  currentUser: User;
  initialQuizId?: string | null;
  onSaveSuccess: (savedQuiz: Quiz) => void;
  onCancel: () => void;
}

const OPTION_KEYS: OptionKey[] = ['A', 'B', 'C', 'D', 'E'];

interface FormQuestion {
  id?: string;
  questionText: string;
  correctOption: OptionKey;
  explanation: string;
  options: Array<{ optionKey: OptionKey; optionText: string }>;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
  currentUser,
  initialQuizId,
  onSaveSuccess,
  onCancel,
}) => {
  const isEditing = Boolean(initialQuizId);

  // Load initial data if editing
  const existingQuiz = initialQuizId 
    ? StorageService.getQuizForCreator(initialQuizId, currentUser.id) 
    : null;

  const [title, setTitle] = useState(existingQuiz?.title || '');
  const [description, setDescription] = useState(existingQuiz?.description || '');
  const [questions, setQuestions] = useState<FormQuestion[]>(() => {
    if (existingQuiz?.questions && existingQuiz.questions.length > 0) {
      return existingQuiz.questions.map(q => ({
        id: q.id,
        questionText: q.questionText,
        correctOption: q.correctOption,
        explanation: q.explanation || '',
        options: q.options.map(opt => ({
          optionKey: opt.optionKey,
          optionText: opt.optionText,
        })),
      }));
    }
    // Default initial single question
    return [
      {
        questionText: '',
        correctOption: 'A',
        explanation: '',
        options: [
          { optionKey: 'A', optionText: '' },
          { optionKey: 'B', optionText: '' },
          { optionKey: 'C', optionText: '' },
          { optionKey: 'D', optionText: '' },
        ],
      },
    ];
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [createdResultQuiz, setCreatedResultQuiz] = useState<Quiz | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Question manipulation
  const handleAddQuestion = () => {
    if (questions.length >= 20) {
      setValidationError('每個題組最多只能包含 20 個題目！');
      return;
    }
    setValidationError(null);
    setQuestions([
      ...questions,
      {
        questionText: '',
        correctOption: 'A',
        explanation: '',
        options: [
          { optionKey: 'A', optionText: '' },
          { optionKey: 'B', optionText: '' },
          { optionKey: 'C', optionText: '' },
          { optionKey: 'D', optionText: '' },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (questions.length <= 1) {
      setValidationError('題組至少需要包含 1 個題目！');
      return;
    }
    setValidationError(null);
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleQuestionTextChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].questionText = text;
    setQuestions(updated);
  };

  const handleExplanationChange = (index: number, text: string) => {
    const updated = [...questions];
    updated[index].explanation = text;
    setQuestions(updated);
  };

  const handleCorrectOptionChange = (index: number, optionKey: OptionKey) => {
    const updated = [...questions];
    updated[index].correctOption = optionKey;
    setQuestions(updated);
  };

  // Option manipulation within a question (2 to 5 options)
  const handleOptionTextChange = (qIndex: number, optIndex: number, text: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex].optionText = text;
    setQuestions(updated);
  };

  const handleAddOption = (qIndex: number) => {
    const currentOptions = questions[qIndex].options;
    if (currentOptions.length >= 5) {
      setValidationError('每題最多只能設定 5 個選項 (A ~ E)');
      return;
    }
    setValidationError(null);
    const nextKey = OPTION_KEYS[currentOptions.length];
    const updated = [...questions];
    updated[qIndex].options.push({ optionKey: nextKey, optionText: '' });
    setQuestions(updated);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const currentOptions = questions[qIndex].options;
    if (currentOptions.length <= 2) {
      setValidationError('每題至少需要提供 2 個選項');
      return;
    }
    setValidationError(null);
    const updated = [...questions];
    const removedKey = currentOptions[optIndex].optionKey;
    updated[qIndex].options.splice(optIndex, 1);
    
    // Re-key remaining options to sequential A, B, C, D...
    updated[qIndex].options = updated[qIndex].options.map((opt, i) => ({
      optionKey: OPTION_KEYS[i],
      optionText: opt.optionText,
    }));

    // If removed key was selected answer, reset to A
    if (questions[qIndex].correctOption === removedKey || !updated[qIndex].options.some(o => o.optionKey === questions[qIndex].correctOption)) {
      updated[qIndex].correctOption = 'A';
    }

    setQuestions(updated);
  };

  // Save Quiz
  const handleSave = async () => {
    setValidationError(null);

    // Validate Quiz Title
    if (!title.trim()) {
      setValidationError('請輸入題組名稱！');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Validate Questions
    if (questions.length < 1 || questions.length > 20) {
      setValidationError('每個題組必須包含 1 至 20 個單選題！');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.questionText.trim()) {
        setValidationError(`第 ${i + 1} 題的題目內容不可為空！`);
        return;
      }
      if (q.options.length < 2 || q.options.length > 5) {
        setValidationError(`第 ${i + 1} 題必須包含 2 至 5 個選項！`);
        return;
      }
      for (let j = 0; j < q.options.length; j++) {
        if (!q.options[j].optionText.trim()) {
          setValidationError(`第 ${i + 1} 題的選項 ${q.options[j].optionKey} 內容不可為空！`);
          return;
        }
      }
      // Ensure correct option is one of the valid options
      const hasCorrect = q.options.some(opt => opt.optionKey === q.correctOption);
      if (!hasCorrect) {
        setValidationError(`第 ${i + 1} 題的正確答案設定無效，請選擇有效的選項代號！`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const saved = await StorageService.saveQuiz(
        {
          id: existingQuiz?.id,
          title: title.trim(),
          description: description.trim(),
          questions: questions.map((q, idx) => ({
            id: q.id,
            questionOrder: idx + 1,
            questionText: q.questionText,
            correctOption: q.correctOption,
            explanation: q.explanation,
            options: q.options,
          })),
        },
        currentUser
      );

      if (!isEditing) {
        // Show success modal with generated Quiz Code
        setCreatedResultQuiz(saved);
      } else {
        onSaveSuccess(saved);
      }
    } catch (err: any) {
      setValidationError(err.message || '儲存失敗，請稍後重試');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyResultCode = () => {
    if (createdResultQuiz?.quizCode) {
      navigator.clipboard.writeText(createdResultQuiz.quizCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Breadcrumb & Action */}
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回題組清單</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            取消
          </button>
          <button
            id="save-quiz-submit-btn"
            type="button"
            disabled={isSaving}
            onClick={handleSave}
            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-all"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>寫入 Supabase 中...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{isEditing ? '儲存修改' : '建立題組並發布'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {isEditing ? '編輯題組內容' : '建立新測驗題組'}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          題組名稱、題目、2~5 個選項與正確答案為必填，答案解析為選填。
        </p>
      </div>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Basic Quiz Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-6 space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider text-teal-700">
          題組基本資訊
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            題組名稱 <span className="text-rose-500">*</span>
          </label>
          <input
            id="quiz-title-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如: 基礎雲端架構與 Web 核心測驗"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            題組描述 (說明或指引)
          </label>
          <textarea
            id="quiz-desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="請簡短描述此題組的主題、受測對象或測驗注意事項..."
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {/* Questions Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            測驗題目列表 ({questions.length} / 20 題)
          </h2>
          <p className="text-xs text-slate-500">
            支援 1~20 道單選題，每題可設定 2~5 個選項與正確答案。
          </p>
        </div>

        {questions.length < 20 && (
          <button
            id="add-question-top-btn"
            type="button"
            onClick={handleAddQuestion}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>新增題目</span>
          </button>
        )}
      </div>

      {/* Questions Editor Cards */}
      <div className="space-y-6">
        {questions.map((question, qIdx) => (
          <div
            key={qIdx}
            className="bg-white rounded-2xl border border-slate-200 hover:border-teal-300 p-6 shadow-xs transition-all space-y-5"
          >
            {/* Question Card Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center justify-center">
                  {qIdx + 1}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  第 {qIdx + 1} 題 (單選題)
                </span>
              </div>

              {questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveQuestion(qIdx)}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="刪除此題目"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                題目敘述 <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={question.questionText}
                onChange={(e) => handleQuestionTextChange(qIdx, e.target.value)}
                rows={2}
                placeholder="請輸入題目內容 (例如: 下列何者不是 HTTP 安全標頭？)"
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            {/* Options List (2 to 5) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">
                  選項列表 (請點選單選圓圈標記正確答案) <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  目前 {question.options.length} 個選項 (可設定 2~5 個)
                </span>
              </div>

              <div className="space-y-2.5">
                {question.options.map((opt, optIdx) => {
                  const isCorrect = question.correctOption === opt.optionKey;
                  return (
                    <div
                      key={opt.optionKey}
                      className={`flex items-center space-x-2 p-2 rounded-xl border transition-colors ${
                        isCorrect
                          ? 'border-teal-500 bg-teal-50/50'
                          : 'border-slate-200 bg-slate-50/40'
                      }`}
                    >
                      {/* Radio for Correct Answer */}
                      <button
                        type="button"
                        onClick={() => handleCorrectOptionChange(qIdx, opt.optionKey)}
                        className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 transition-all ${
                          isCorrect
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'bg-white border border-slate-300 text-slate-600 hover:border-teal-400'
                        }`}
                        title={`點擊設為正確答案 (目前: ${opt.optionKey})`}
                      >
                        {opt.optionKey}
                      </button>

                      {/* Option Text Input */}
                      <input
                        type="text"
                        value={opt.optionText}
                        onChange={(e) => handleOptionTextChange(qIdx, optIdx, e.target.value)}
                        placeholder={`選項 ${opt.optionKey} 內容...`}
                        className="flex-1 px-3 py-1.5 text-xs sm:text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />

                      {/* Correct Badge */}
                      {isCorrect && (
                        <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-100 text-teal-800 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-teal-600" />
                          <span>正解</span>
                        </span>
                      )}

                      {/* Delete option button if > 2 */}
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(qIdx, optIdx)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 shrink-0"
                          title="移除此選項"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add Option button (if < 5) */}
              {question.options.length < 5 && (
                <button
                  type="button"
                  onClick={() => handleAddOption(qIdx)}
                  className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-teal-700 hover:text-teal-800 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增選項 ({OPTION_KEYS[question.options.length]})</span>
                </button>
              )}
            </div>

            {/* Explanation Field (Optional) */}
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center space-x-1 text-xs font-semibold text-slate-700 mb-1">
                <span>答案解析 (選填)</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  - 答題者完成測驗後會顯示此解析
                </span>
              </label>
              <textarea
                value={question.explanation}
                onChange={(e) => handleExplanationChange(qIdx, e.target.value)}
                rows={2}
                placeholder="請輸入此題正解的詳細原因、觀念提示或解析說明 (可留空)..."
                className="w-full px-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Add Question Bar */}
      {questions.length < 20 && (
        <button
          id="add-question-bottom-btn"
          type="button"
          onClick={handleAddQuestion}
          className="mt-6 w-full py-3.5 rounded-2xl border-2 border-dashed border-teal-200 hover:border-teal-400 hover:bg-teal-50/50 text-teal-700 text-xs sm:text-sm font-semibold flex items-center justify-center space-x-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>新增下一道題目 (目前 {questions.length} / 20 題)</span>
        </button>
      )}

      {/* Floating or Bottom Save Bar */}
      <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          取消返回
        </button>
        <button
          id="save-quiz-footer-btn"
          type="button"
          disabled={isSaving}
          onClick={handleSave}
          className="inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm transition-all"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在寫入 Supabase 資料庫...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{isEditing ? '儲存題組修改' : '建立題組並發布'}</span>
            </>
          )}
        </button>
      </div>

      {/* Success Modal with Generated Quiz Code */}
      {createdResultQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 text-center border border-teal-100 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-bold text-slate-800">
              題組建立成功！
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              您的題組「{createdResultQuiz.title}」已發布完成。請將下方的題組密碼分享給答題者。
            </p>

            <div className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
              <Database className="w-3.5 h-3.5" />
              <span>已成功寫入 Supabase PostgreSQL 雲端資料庫</span>
            </div>

            {/* Generated Quiz Code Banner */}
            <div className="my-6 p-4 rounded-xl bg-teal-50 border-2 border-dashed border-teal-300 flex flex-col items-center justify-center">
              <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider mb-1">
                專屬題組密碼 (Quiz Code)
              </span>
              <div className="text-3xl font-mono font-black text-teal-700 tracking-widest my-1">
                {createdResultQuiz.quizCode}
              </div>
              <button
                type="button"
                onClick={handleCopyResultCode}
                className="mt-2 inline-flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-semibold bg-white border border-teal-200 text-teal-700 hover:bg-teal-100 transition-colors shadow-2xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">已複製密碼！</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>點擊複製密碼</span>
                  </>
                )}
              </button>
            </div>

            <button
              id="confirm-quiz-created-btn"
              type="button"
              onClick={() => onSaveSuccess(createdResultQuiz)}
              className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors shadow-xs"
            >
              完成並返回出題管理中心
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
