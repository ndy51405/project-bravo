/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppRole, Quiz, Question, OptionKey, QuizSessionResult, User } from './types';
import { useAuth } from './context/AuthContext';
import { useQuizzes } from './hooks/useQuizzes';
import { quizApi } from './api/quizApi';
import { responseApi } from './api/responseApi';
import { Navbar } from './components/Navbar';
import { RoleSelector } from './components/RoleSelector';
import { CreatorDashboard } from './components/CreatorDashboard';
import { QuizEditor } from './components/QuizEditor';
import { TakerPortal } from './components/TakerPortal';
import { QuizTakerView } from './components/QuizTakerView';
import { QuizReportView } from './components/QuizReportView';
import { AuthModal } from './components/AuthModal';
import { SqlViewerModal } from './components/SqlViewerModal';
import { LoginView } from './components/LoginView';

export default function App() {
  const { currentUser, logout, setCurrentUser } = useAuth();
  const { quizzes: myQuizzes, reloadQuizzes, deleteQuiz } = useQuizzes(currentUser);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);

  // Creator state
  const [creatorView, setCreatorView] = useState<'list' | 'editor'>('list');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);

  // Taker state
  const [takerView, setTakerView] = useState<'portal' | 'taking' | 'report'>('portal');
  const [activeTakingQuiz, setActiveTakingQuiz] = useState<Quiz | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [quizResult, setQuizResult] = useState<QuizSessionResult | null>(null);
  const [presetTakerCode, setPresetTakerCode] = useState<string>('');

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  // Handle Role Selection
  const handleSelectRole = (role: AppRole | null) => {
    if (!currentUser && role) {
      setIsAuthModalOpen(true);
      return;
    }
    setCurrentRole(role);
    if (role === 'creator') {
      setCreatorView('list');
      setEditingQuizId(null);
      reloadQuizzes();
    } else if (role === 'taker') {
      setTakerView('portal');
    }
  };

  // Creator Actions
  const handleCreateNewQuiz = () => {
    setEditingQuizId(null);
    setCreatorView('editor');
  };

  const handleEditQuiz = (quizId: string) => {
    setEditingQuizId(quizId);
    setCreatorView('editor');
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!currentUser) return;
    await deleteQuiz(quizId);
  };

  const handleSaveQuizSuccess = (_savedQuiz: Quiz) => {
    setCreatorView('list');
    setEditingQuizId(null);
    reloadQuizzes();
  };

  // Test take quiz from Creator view
  const handleTestTakeQuiz = async (quizCode: string) => {
    setPresetTakerCode(quizCode);
    const inMem = myQuizzes.find((q) => q.quizCode === quizCode);
    if (inMem && inMem.questions && inMem.questions.length > 0) {
      setActiveTakingQuiz(inMem);
      setActiveQuestions(inMem.questions);
      setTakerView('taking');
      setCurrentRole('taker');
      return;
    }

    try {
      const found = await quizApi.getQuizByCode(quizCode);
      if (found) {
        setActiveTakingQuiz(found.quiz);
        setActiveQuestions(found.questions);
        setTakerView('taking');
        setCurrentRole('taker');
      }
    } catch (e) {
      console.warn('Test take quiz error:', e);
    }
  };

  // Taker Actions
  const handleStartQuiz = (quiz: Quiz, questions: Question[]) => {
    setActiveTakingQuiz(quiz);
    setActiveQuestions(questions);
    setTakerView('taking');
  };

  const handleSubmitQuiz = async (answers: Record<string, OptionKey>, totalTimeSeconds: number) => {
    if (!activeTakingQuiz) return;
    const result = await responseApi.submitAndCalculate(
      activeTakingQuiz,
      activeQuestions,
      answers,
      totalTimeSeconds,
      currentUser
    );
    setQuizResult(result);
    setTakerView('report');
    reloadQuizzes();
  };

  const handleRetakeQuiz = () => {
    if (activeTakingQuiz && activeQuestions.length > 0) {
      setTakerView('taking');
    } else {
      setTakerView('portal');
    }
  };

  const handleEnterAnotherCode = () => {
    setActiveTakingQuiz(null);
    setActiveQuestions([]);
    setQuizResult(null);
    setPresetTakerCode('');
    setTakerView('portal');
  };

  const handleExitQuizTaking = () => {
    setActiveTakingQuiz(null);
    setActiveQuestions([]);
    setTakerView('portal');
  };

  // Auth actions
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    reloadQuizzes();
  };

  const handleLogout = async () => {
    await logout();
    setCurrentRole(null);
  };

  // If not logged in, show LoginView
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <LoginView onLoginSuccess={handleLoginSuccess} />
        {isSqlModalOpen && (
          <SqlViewerModal
            isOpen={isSqlModalOpen}
            onClose={() => setIsSqlModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 text-slate-800 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenSqlModal={() => setIsSqlModalOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main App Container */}
      <main className="flex-1">
        {/* Step 1: Role Selection Hub */}
        {currentRole === null && (
          <RoleSelector
            currentUser={currentUser}
            onSelectRole={handleSelectRole}
            myQuizCount={myQuizzes.length}
          />
        )}

        {/* Step 2: Quiz Creator Flow */}
        {currentRole === 'creator' && currentUser && (
          <>
            {creatorView === 'list' && (
              <CreatorDashboard
                currentUser={currentUser}
                quizzes={myQuizzes}
                onCreateNewQuiz={handleCreateNewQuiz}
                onEditQuiz={handleEditQuiz}
                onDeleteQuiz={handleDeleteQuiz}
                onTestTakeQuiz={handleTestTakeQuiz}
                onRefreshQuizzes={reloadQuizzes}
              />
            )}

            {creatorView === 'editor' && (
              <QuizEditor
                currentUser={currentUser}
                initialQuizId={editingQuizId}
                initialQuiz={myQuizzes.find((q) => q.id === editingQuizId)}
                onSaveSuccess={handleSaveQuizSuccess}
                onCancel={() => {
                  setCreatorView('list');
                  setEditingQuizId(null);
                }}
              />
            )}
          </>
        )}

        {/* Step 3: Quiz Taker Flow */}
        {currentRole === 'taker' && (
          <>
            {takerView === 'portal' && (
              <TakerPortal
                currentUser={currentUser}
                onStartQuiz={handleStartQuiz}
                onBackToRoleSelector={() => setCurrentRole(null)}
                presetCode={presetTakerCode}
              />
            )}

            {takerView === 'taking' && activeTakingQuiz && (
              <QuizTakerView
                quiz={activeTakingQuiz}
                questions={activeQuestions}
                onSubmitQuiz={handleSubmitQuiz}
                onExitQuiz={handleExitQuizTaking}
              />
            )}

            {takerView === 'report' && quizResult && (
              <QuizReportView
                result={quizResult}
                onRetake={handleRetakeQuiz}
                onEnterAnotherCode={handleEnterAnotherCode}
                onBackToHome={() => {
                  setCurrentRole(null);
                  setTakerView('portal');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        currentUser={currentUser}
      />

      {/* Supabase SQL Schema Viewer Modal */}
      <SqlViewerModal
        isOpen={isSqlModalOpen}
        onClose={() => setIsSqlModalOpen(false)}
      />
    </div>
  );
}
