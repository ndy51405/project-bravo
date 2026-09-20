import { useState, useEffect, useCallback } from 'react';
import { Quiz, User } from '../types';
import { quizApi } from '../api/quizApi';

export function useQuizzes(currentUser: User | null) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuizzes = useCallback(async () => {
    if (!currentUser) {
      setQuizzes([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const list = await quizApi.getQuizzesByCreator(currentUser.id);
      setQuizzes(list);
    } catch (err: any) {
      console.warn('[useQuizzes] Fetch quizzes failed:', err);
      setError(err?.message || '載入題組失敗');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  const deleteQuiz = async (quizId: string) => {
    try {
      await quizApi.deleteQuiz(quizId);
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
      return true;
    } catch (err: any) {
      setError(err?.message || '刪除題組失敗');
      return false;
    }
  };

  const syncSeedQuizzes = async () => {
    setIsLoading(true);
    try {
      const res = await quizApi.syncSeedQuizzes();
      await fetchQuizzes();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    quizzes,
    isLoading,
    error,
    reloadQuizzes: fetchQuizzes,
    deleteQuiz,
    syncSeedQuizzes,
  };
}

