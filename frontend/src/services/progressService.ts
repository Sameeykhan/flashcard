import { SessionResult, MarkStats, PeerRank, Achievement } from '../types';
import { initialSessions, initialLeaderboard, initialAchievements } from './mockData';

const SESSIONS_KEY = 'codecards_sessions_v1';

export const progressService = {
  getSessions(): SessionResult[] {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) {
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(initialSessions));
      return initialSessions;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialSessions;
    }
  },

  recordSession(result: SessionResult): void {
    const sessions = this.getSessions();
    const updated = [result, ...sessions];
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(updated));
  },

  getStats(): MarkStats {
    const sessions = this.getSessions();

    if (sessions.length === 0) {
      return {
        overallPercentage: 0,
        letterGrade: 'N/A',
        totalCardsStudied: 0,
        totalCorrect: 0,
        totalWrong: 0,
        languageBreakdown: {},
        categoryBreakdown: {},
        historicalDays: [],
      };
    }

    let totalStudied = 0;
    let totalCorrect = 0;
    let totalWrong = 0;

    const langMap: Record<string, { total: number; correct: number }> = {};
    const catMap: Record<string, { total: number; correct: number }> = {};
    const dayMap: Record<string, { studied: number; correct: number; totalPct: number; count: number }> = {};

    sessions.forEach((s) => {
      totalStudied += s.cards_studied;
      totalCorrect += s.correct_count;
      totalWrong += s.wrong_count;

      // Group by date
      const dateKey = s.date.split('T')[0];
      if (!dayMap[dateKey]) {
        dayMap[dateKey] = { studied: 0, correct: 0, totalPct: 0, count: 0 };
      }
      dayMap[dateKey].studied += s.cards_studied;
      dayMap[dateKey].correct += s.correct_count;
      dayMap[dateKey].totalPct += s.accuracy_pct;
      dayMap[dateKey].count += 1;

      // Filter breakdown if available
      const lang = s.filter_applied?.language || 'Multi';
      if (!langMap[lang]) langMap[lang] = { total: 0, correct: 0 };
      langMap[lang].total += s.cards_studied;
      langMap[lang].correct += s.correct_count;

      const cat = s.filter_applied?.category || 'General';
      if (!catMap[cat]) catMap[cat] = { total: 0, correct: 0 };
      catMap[cat].total += s.cards_studied;
      catMap[cat].correct += s.correct_count;
    });

    const overallPct = totalStudied > 0 ? Math.round((totalCorrect / totalStudied) * 100) : 0;

    const letterGrade =
      overallPct >= 95 ? 'A+' :
      overallPct >= 90 ? 'A' :
      overallPct >= 85 ? 'A-' :
      overallPct >= 80 ? 'B+' :
      overallPct >= 75 ? 'B' :
      overallPct >= 70 ? 'B-' :
      overallPct >= 65 ? 'C+' :
      overallPct >= 60 ? 'C' : 'D';

    const languageBreakdown: Record<string, { studied: number; correct: number; percentage: number }> = {};
    Object.entries(langMap).forEach(([lang, data]) => {
      languageBreakdown[lang] = {
        studied: data.total,
        correct: data.correct,
        percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      };
    });

    const categoryBreakdown: Record<string, { studied: number; correct: number; percentage: number }> = {};
    Object.entries(catMap).forEach(([cat, data]) => {
      categoryBreakdown[cat] = {
        studied: data.total,
        correct: data.correct,
        percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      };
    });

    // Sort historical days chronologically
    const sortedDates = Object.keys(dayMap).sort();
    const historicalDays = sortedDates.map((date) => ({
      date,
      studied: dayMap[date].studied,
      accuracyPct: Math.round(dayMap[date].totalPct / dayMap[date].count),
    }));

    return {
      overallPercentage: overallPct,
      letterGrade,
      totalCardsStudied: totalStudied,
      totalCorrect,
      totalWrong,
      languageBreakdown,
      categoryBreakdown,
      historicalDays,
    };
  },

  getLeaderboard(): PeerRank[] {
    return initialLeaderboard;
  },

  getAchievements(): Achievement[] {
    return initialAchievements;
  },
};
