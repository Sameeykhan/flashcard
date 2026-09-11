export type ThemeMode = 'light' | 'dark' | 'neon' | 'nature';

export interface User {
  id: string;
  username: string;
  name?: string;
  email: string;
  avatarUrl: string;
  grade: string;
  overallMarks: number;
  streakDays: number;
  totalCardsStudied: number;
  accuracyPct: number;
  joinedDate: string;
  themePreference?: ThemeMode;
}

export interface Card {
  id: string;
  question: string;
  answer: string;
  code_snippet?: string;
  explanation?: string;
  language: string;
  category: string;
  tags: string[];
  difficulty: number;
  interval_level: number;
  next_due: string | null;
  last_reviewed: string | null;
  wrong_count: number;
  correct_count: number;
  created_at?: string;
}

export interface SessionResult {
  id: string;
  date: string;
  cards_studied: number;
  correct_count: number;
  wrong_count: number;
  accuracy_pct: number;
  duration_seconds: number;
  filter_applied?: {
    language?: string;
    category?: string;
  };
}

export interface MarkStats {
  overallPercentage: number;
  letterGrade: string;
  totalCardsStudied: number;
  totalCorrect: number;
  totalWrong: number;
  languageBreakdown: Record<string, { studied: number; correct: number; percentage: number }>;
  categoryBreakdown: Record<string, { studied: number; correct: number; percentage: number }>;
  historicalDays: Array<{ date: string; studied: number; accuracyPct: number }>;
}

export interface PeerRank {
  id: string;
  username: string;
  avatarUrl: string;
  overallMarks: number;
  grade: string;
  cardsStudied: number;
  streakDays: number;
  rank: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface AIMessage {
  id: string;
  sender: 'user' | 'ai' | 'assistant';
  text: string;
  timestamp: string;
}

export interface MotivationalQuote {
  id: number;
  text: string;
}
