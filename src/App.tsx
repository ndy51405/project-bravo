/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, AppRole, Quiz, Question, OptionKey, QuizSessionResult } from './types';
import { StorageService } from './services/storage';
import { SupabaseService } from './services/supabase';
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
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);

  // Check Supabase Auth active session on startup
  useEffect(() => {
    SupabaseService.getCurrentAuthUser().then(authU => {
      if (authU && !currentUser) {
        setCurrentUser(authU);
        StorageService.setCurrentUser(authU);
      }
    });
  }, []);

  // Creator state
  const [creatorView, setCreatorView] = useState<'list' | 'editor'>('list');
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [myQuizzes, setMyQuizzes] = useState<Quiz[]>([]);

  // Taker state
  const [takerView, setTakerView] = useState<'portal' | 'taking' | 'report'>('portal');
  const [activeTakingQuiz, setActiveTakingQuiz] = useState<Quiz | null>(null);
  const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
  const [quizResult, setQuizResult] = useState<QuizSessionResult | null>(null);
  const [presetTakerCode, setPresetTakerCode] = useState<string>('');

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);

  // Load creator quizzes whenever currentUser changes
  const reloadMyQuizzes = async () => {
    if (currentUser) {
      // First, auto-sync any local quizzes that haven't been written to Supabase yet
      try {
        await StorageService.autoSyncAllLocalQuizzes(currentUser);
      } catch (syncErr) {
        console.warn('[App] Auto sync local quizzes notice:', syncErr);
      }

      const list = StorageService.getQuizzesByCreator(currentUser.id);
      setMyQuizzes(list);
      // Asynchronously refresh from Supabase and merge
      try {
        const refreshed = await StorageService.refreshQuizzesFromSupabase(currentUser.id);
        if (refreshed) {
          setMyQuizzes(refreshed);
        }
      } catch (err) {
        console.warn('[App] Failed to refresh quizzes from Supabase:', err);
      }
    } else {
      setMyQuizzes([]);
    }
  };

  useEffect(() => {
    reloadMyQuizzes();
  }, [currentUser]);

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
      reloadMyQuizzes();
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

  const handleDeleteQuiz = (quizId: string) => {
    if (!currentUser) return;
    StorageService.deleteQuiz(quizId, currentUser.id);
    reloadMyQuizzes();
  };

  const handleSaveQuizSuccess = (savedQuiz: Quiz) => {
    setCreatorView('list');
    setEditingQuizId(null);
    reloadMyQuizzes();
  };

  // Test take quiz from Creator view
  const handleTestTakeQuiz = (quizCode: string) => {
    setPresetTakerCode(quizCode);
    const found = StorageService.findQuizByCode(quizCode);
    if (found) {
      setActiveTakingQuiz(found.quiz);
      setActiveQuestions(found.questions);
      setTakerView('taking');
      setCurrentRole('taker');
    }
  };

  // Taker Actions
  const handleStartQuiz = (quiz: Quiz, questions: Question[]) => {
    setActiveTakingQuiz(quiz);
    setActiveQuestions(questions);
    setTakerView('taking');
  };

  const handleSubmitQuiz = (answers: Record<string, OptionKey>, totalTimeSeconds: number) => {
    if (!activeTakingQuiz) return;
    const result = StorageService.submitQuizSession(
      activeTakingQuiz,
      activeQuestions,
      answers,
      totalTimeSeconds,
      currentUser
    );
    setQuizResult(result);
    setTakerView('report');
    reloadMyQuizzes();
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
    reloadMyQuizzes();
  };

  const handleLogout = async () => {
    await SupabaseService.signOut();
    StorageService.logout();
    setCurrentUser(null);
    setCurrentRole(null);
    setMyQuizzes([]);
  };

  // If not logged in, the primary initial screen is the Login / Register screen
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
                onRefreshQuizzes={reloadMyQuizzes}
              />
            )}

            {creatorView === 'editor' && (
              <QuizEditor
                currentUser={currentUser}
                initialQuizId={editingQuizId}
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

      {/* Auth Modal (Anonymous or Google) */}
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
