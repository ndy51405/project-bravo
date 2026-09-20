import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { authApi } from '../api/authApi';
import { generateUUID } from '../utils/uuid';

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  register: (email: string, password: string, displayName: string) => Promise<{ success: boolean; user?: User; error?: string }>;
  loginAsGuest: (displayName?: string) => User;
  logout: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_STORAGE_KEY = 'project_bravo_auth_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Sync user state with session storage cache
  const updateCurrentUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    }
  };

  // Check Supabase session on startup
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const name =
            session.user.user_metadata?.display_name ||
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            '使用者';

          const user: User = {
            id: session.user.id,
            email: session.user.email,
            displayName: name,
            authProvider: 'supabase',
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(session.user.id)}`,
            createdAt: session.user.created_at || new Date().toISOString(),
          };
          updateCurrentUser(user);
        }
      } catch (err) {
        console.warn('[AuthContext] Session restore error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    checkSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const name =
          data.user.user_metadata?.display_name ||
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          '使用者';

        const user: User = {
          id: data.user.id,
          email: data.user.email,
          displayName: name,
          authProvider: 'supabase',
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.user.id)}`,
          createdAt: data.user.created_at || new Date().toISOString(),
        };

        updateCurrentUser(user);
        return { success: true, user };
      }

      return { success: false, error: '未取得使用者資訊' };
    } catch (err: any) {
      return { success: false, error: err.message || '登入時發生錯誤' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, displayName: string) => {
    setIsLoading(true);
    try {
      // 1. Call backend admin register endpoint (auto-confirms email)
      const res = await authApi.register(email, password, displayName);
      if (res.success && res.user) {
        // Auto sign-in with credentials to establish active Supabase session
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });
        updateCurrentUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, error: res.error || '註冊失敗' };
    } catch (err: any) {
      return { success: false, error: err.message || '註冊時發生錯誤' };
    } finally {
      setIsLoading(false);
    }
  };

  const loginAsGuest = (displayName?: string) => {
    const name = displayName?.trim() || '訪客學者';
    const guestUser: User = {
      id: generateUUID(),
      displayName: name,
      authProvider: 'anonymous',
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
      createdAt: new Date().toISOString(),
    };
    updateCurrentUser(guestUser);
    return guestUser;
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] SignOut error:', err);
    }
    updateCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isLoading,
        login,
        register,
        loginAsGuest,
        logout,
        setCurrentUser: updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

