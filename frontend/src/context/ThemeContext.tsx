import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
  isLight: boolean;
  toggleLightDark: () => void;
  reducedMotion: boolean;
  setReducedMotion: (reduced: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEMES: ThemeMode[] = ['dark', 'light', 'sunset', 'emerald', 'neon', 'nature'];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    let saved = localStorage.getItem('codecards_theme');
    if (saved === 'instagram') saved = 'sunset';
    if (saved === 'whatsapp') saved = 'emerald';
    if (saved && THEMES.includes(saved as ThemeMode)) {
      return saved as ThemeMode;
    }
    // Default to system preference on first visit
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    return 'dark';
  });

  const [reducedMotion, setReducedMotionState] = useState<boolean>(() => {
    const saved = localStorage.getItem('codecards_reduced_motion');
    if (saved !== null) {
      return saved === 'true';
    }
    return typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('codecards_theme', theme);
  }, [theme]);

  // Listen to system preference changes if user hasn't explicitly set a preference
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = (e: MediaQueryListEvent) => {
      const hasExplicit = localStorage.getItem('codecards_theme_explicit');
      if (!hasExplicit) {
        setThemeState(e.matches ? 'light' : 'dark');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-reduced-motion', String(reducedMotion));
    localStorage.setItem('codecards_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  const setTheme = (newTheme: ThemeMode) => {
    localStorage.setItem('codecards_theme_explicit', 'true');
    setThemeState(newTheme);
  };

  const isLight = theme === 'light';

  const toggleLightDark = () => {
    localStorage.setItem('codecards_theme_explicit', 'true');
    if (isLight) {
      const lastDark = (localStorage.getItem('codecards_last_dark_theme') as ThemeMode) || 'dark';
      setThemeState(THEMES.includes(lastDark) && lastDark !== 'light' ? lastDark : 'dark');
    } else {
      localStorage.setItem('codecards_last_dark_theme', theme);
      setThemeState('light');
    }
  };

  const cycleTheme = () => {
    setThemeState((prev) => {
      const idx = THEMES.indexOf(prev);
      const nextIdx = (idx + 1) % THEMES.length;
      return THEMES[nextIdx];
    });
  };

  const setReducedMotion = (reduced: boolean) => {
    setReducedMotionState(reduced);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        cycleTheme,
        isLight,
        toggleLightDark,
        reducedMotion,
        setReducedMotion,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
