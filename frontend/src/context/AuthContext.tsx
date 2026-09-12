import React, { createContext, useContext, useState } from 'react';
import { User } from '../types';
import { initialUser } from '../services/mockData';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (emailOrUsername: string, password: string, rememberMe: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  demoLogin: () => void;
  logout: () => void;
  forgotPassword: (email: string) => Promise<{ success: boolean; message: string }>;
  updateUserStats: (updater: (prev: User) => User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedLocal = localStorage.getItem('codecards_user');
    if (savedLocal) {
      try {
        return JSON.parse(savedLocal);
      } catch {
        // ignore
      }
    }
    const savedSession = sessionStorage.getItem('codecards_user');
    if (savedSession) {
      try {
        return JSON.parse(savedSession);
      } catch {
        // ignore
      }
    }
    // Default to initial demo user so dashboard/study can be explored immediately or logged out
    return initialUser;
  });

  const saveUserToStorage = (userData: User | null, remember: boolean = true) => {
    if (!userData) {
      localStorage.removeItem('codecards_user');
      sessionStorage.removeItem('codecards_user');
    } else if (remember) {
      localStorage.setItem('codecards_user', JSON.stringify(userData));
      sessionStorage.removeItem('codecards_user');
    } else {
      sessionStorage.setItem('codecards_user', JSON.stringify(userData));
      localStorage.removeItem('codecards_user');
    }
  };

  const login = async (
    emailOrUsername: string,
    password: string,
    rememberMe: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    // Basic client-side validation
    if (!emailOrUsername.trim()) {
      return { success: false, error: 'Please enter your email or username' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters long' };
    }

    // Simulated network delay
    await new Promise((res) => setTimeout(res, 300));

    const loggedUser: User = {
      ...initialUser,
      username: emailOrUsername.includes('@') ? emailOrUsername.split('@')[0] : emailOrUsername,
      email: emailOrUsername.includes('@') ? emailOrUsername : `${emailOrUsername}@student.edu`,
    };

    setUser(loggedUser);
    saveUserToStorage(loggedUser, rememberMe);
    return { success: true };
  };

  const signup = async (
    username: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!username.trim() || username.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters' };
    }
    if (!email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    await new Promise((res) => setTimeout(res, 300));

    const newUser: User = {
      id: `u-${Date.now()}`,
      username,
      email,
      grade: 'A-',
      overallMarks: 82,
      streakDays: 1,
      totalCardsStudied: 0,
      accuracyPct: 100,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      joinedDate: new Date().toISOString().split('T')[0],
      themePreference: 'dark',
    };

    setUser(newUser);
    saveUserToStorage(newUser, true);
    return { success: true };
  };

  const demoLogin = () => {
    setUser(initialUser);
    saveUserToStorage(initialUser, true);
  };

  const logout = () => {
    setUser(null);
    saveUserToStorage(null);
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message: string }> => {
    if (!email || !email.includes('@')) {
      return { success: false, message: 'Please enter a valid email address' };
    }
    await new Promise((res) => setTimeout(res, 400));
    return {
      success: true,
      message: `Password reset link has been dispatched to ${email}. Check your inbox!`,
    };
  };

  const updateUserStats = (updater: (prev: User) => User) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = updater(prev);
      const isRemembered = localStorage.getItem('codecards_user') !== null;
      saveUserToStorage(updated, isRemembered);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        signup,
        demoLogin,
        logout,
        forgotPassword,
        updateUserStats,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
