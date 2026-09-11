import React from 'react';
import { MarkStats } from '../../types';
import { Code, Layers, CheckCircle, TrendingUp } from 'lucide-react';

interface MarksOverviewProps {
  stats: MarkStats;
}

interface BreakdownItem {
  name: string;
  studied: number;
  correct: number;
  percentage: number;
}

export const MarksOverview: React.FC<MarksOverviewProps> = ({ stats }) => {
  const languageEntries = Object.entries(stats.languageBreakdown);
  const categoryEntries = Object.entries(stats.categoryBreakdown);

  const displayLanguages: BreakdownItem[] =
    languageEntries.length > 0
      ? languageEntries.map(([lang, data]) => ({
          name: lang,
          studied: data.studied,
          correct: data.correct,
          percentage: data.percentage,
        }))
      : [
          { name: 'Python', studied: 45, correct: 41, percentage: 91 },
          { name: 'JavaScript', studied: 38, correct: 33, percentage: 87 },
          { name: 'Go', studied: 22, correct: 18, percentage: 82 },
          { name: 'Rust', studied: 16, correct: 12, percentage: 75 },
          { name: 'SQL', studied: 28, correct: 26, percentage: 93 },
        ];

  const displayCategories: BreakdownItem[] =
    categoryEntries.length > 0
      ? categoryEntries.map(([cat, data]) => ({
          name: cat,
          studied: data.studied,
          correct: data.correct,
          percentage: data.percentage,
        }))
      : [
          { name: 'Algorithms', studied: 34, correct: 30, percentage: 88 },
          { name: 'Syntax', studied: 40, correct: 38, percentage: 95 },
          { name: 'Concurrency', studied: 18, correct: 14, percentage: 78 },
          { name: 'Database', studied: 25, correct: 23, percentage: 92 },
          { name: 'Data Structures', studied: 22, correct: 19, percentage: 86 },
          { name: 'Memory Safety', studied: 12, correct: 9, percentage: 75 },
        ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Per-Language Marks Breakdown */}
      <div className="glass-panel rounded-3xl p-6 border border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Language Mastery Marks</h3>
              <p className="text-xs text-[var(--text-muted)]">Per-language accuracy & competency</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-semibold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Target: 85%+</span>
          </div>
        </div>

        <div className="space-y-4">
          {displayLanguages.map((item) => {
            const pct = item.percentage;
            const colorClass =
              pct >= 90
                ? 'from-emerald-500 to-teal-400'
                : pct >= 80
                ? 'from-indigo-500 to-sky-400'
                : pct >= 70
                ? 'from-amber-500 to-yellow-400'
                : 'from-rose-500 to-red-400';

            return (
              <div key={item.name} className="p-3 rounded-2xl bg-white/[0.02] border border-[var(--border-color)]">
                <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                  <span className="font-bold text-[var(--text-primary)]">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[var(--text-dim)] font-mono">
                      {item.correct}/{item.studied} correct
                    </span>
                    <span className="font-bold text-[var(--text-primary)] font-mono">{pct}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${colorClass} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category Competency & Mastery */}
      <div className="glass-panel rounded-3xl p-6 border border-[var(--border-color)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">Domain & Category Grades</h3>
              <p className="text-xs text-[var(--text-muted)]">Core CS concepts & operational skill</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {displayCategories.map((item) => {
            const pct = item.percentage;

            return (
              <div
                key={item.name}
                className="p-3.5 rounded-2xl bg-white/[0.02] border border-[var(--border-color)] flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="text-[var(--text-primary)] truncate">{item.name}</span>
                  <span
                    className={`font-mono text-xs px-2 py-0.5 rounded-full ${
                      pct >= 90
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : pct >= 80
                        ? 'bg-sky-500/15 text-sky-400'
                        : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {pct}%
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-dim)]">
                  <span>{item.studied} cards tracked</span>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
