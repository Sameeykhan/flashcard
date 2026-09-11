import React from 'react';
import { HelpCircle, X, Check, ArrowLeft } from 'lucide-react';

interface StudyHeaderProps {
  currentIndex: number;
  totalCards: number;
  correctCount: number;
  wrongCount: number;
  onOpenShortcuts: () => void;
  onExit: () => void;
  filterLabel?: string;
}

export const StudyHeader: React.FC<StudyHeaderProps> = ({
  currentIndex,
  totalCards,
  correctCount,
  wrongCount,
  onOpenShortcuts,
  onExit,
  filterLabel,
}) => {
  const answeredTotal = correctCount + wrongCount;
  const accuracyPct = answeredTotal > 0 ? Math.round((correctCount / answeredTotal) * 100) : 100;
  const progressPct = totalCards > 0 ? Math.round(((currentIndex) / totalCards) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto mb-6">
      {/* Top row: Back button, title/filter, shortcuts button */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit Session</span>
        </button>

        {filterLabel && (
          <div className="text-xs font-mono text-[var(--text-dim)] truncate max-w-[200px] sm:max-w-xs">
            Filter: <span className="text-[var(--accent)] font-semibold">{filterLabel}</span>
          </div>
        )}

        <button
          onClick={onOpenShortcuts}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs font-medium text-[var(--text-muted)] hover:text-[var(--accent)] transition-all"
          title="Keyboard shortcuts [?]"
        >
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Shortcuts</span>
        </button>
      </div>

      {/* Stats and Progress Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-[var(--border-color)]">
        <div className="flex items-center justify-between text-xs font-semibold mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[var(--text-primary)] font-bold text-sm">
              Card {currentIndex + 1}
            </span>
            <span className="text-[var(--text-dim)] font-mono">of {totalCards}</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Check className="w-3.5 h-3.5" />
              {correctCount}
            </span>
            <span className="flex items-center gap-1 text-red-400 font-bold">
              <X className="w-3.5 h-3.5" />
              {wrongCount}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)] font-bold">
              {accuracyPct}% Acc
            </span>
          </div>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
