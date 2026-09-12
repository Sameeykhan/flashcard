import React, { useEffect } from 'react';
import { Trophy, RotateCcw, LayoutDashboard } from 'lucide-react';
import { useSound } from '../../context/SoundContext';
import { useTheme } from '../../context/ThemeContext';
import confetti from 'canvas-confetti';

interface SessionSummaryModalProps {
  isOpen: boolean;
  totalCards: number;
  correctCount: number;
  wrongCount: number;
  durationSeconds: number;
  onRestart: () => void;
  onReviewMissed?: () => void;
  onGoToDashboard: () => void;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  totalCards,
  correctCount,
  wrongCount,
  durationSeconds,
  onRestart,
  onReviewMissed,
  onGoToDashboard,
}) => {
  const { playSuccess } = useSound();
  const { reducedMotion } = useTheme();

  const accuracyPct = totalCards > 0 ? Math.round((correctCount / totalCards) * 100) : 0;

  const letterGrade =
    accuracyPct >= 95 ? 'A+' :
    accuracyPct >= 90 ? 'A' :
    accuracyPct >= 85 ? 'A-' :
    accuracyPct >= 80 ? 'B+' :
    accuracyPct >= 75 ? 'B' :
    accuracyPct >= 70 ? 'B-' :
    accuracyPct >= 60 ? 'C' : 'D';

  useEffect(() => {
    if (isOpen) {
      playSuccess();
      if (!reducedMotion) {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#6366f1', '#10b981', '#fbbf24', '#f43f5e', '#38bdf8', '#e1306c', '#25d366'],
        });
      }
    }
  }, [isOpen, reducedMotion, playSuccess]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}m ${remainder}s`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg glass-panel rounded-3xl p-6 sm:p-8 border border-[var(--border-color)] shadow-2xl text-center overflow-hidden">
        {/* Top Glow Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--accent)] via-emerald-400 to-amber-400" />

        {/* Trophy Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 mx-auto mb-4 flex items-center justify-center shadow-lg shadow-amber-500/30">
          <Trophy className="w-8 h-8 text-white" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mb-1">
          Session Completed!
        </h2>
        <p className="text-xs sm:text-sm text-[var(--text-muted)] mb-6">
          Great work! Your spaced repetition intervals and student progress have been updated.
        </p>

        {/* Score Card */}
        <div className="p-5 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mb-6">
          <div className="flex items-center justify-center gap-6 mb-4">
            <div>
              <div className="text-4xl font-extrabold text-[var(--accent)] font-mono">
                {accuracyPct}%
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                Accuracy Score
              </div>
            </div>

            <div className="h-10 w-px bg-[var(--border-color)]" />

            <div>
              <div className="text-4xl font-extrabold text-emerald-400 font-mono">
                {letterGrade}
              </div>
              <div className="text-[11px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                Session Grade
              </div>
            </div>
          </div>

          {/* Detailed Counts */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--border-color)] text-xs">
            <div className="p-2 rounded-xl bg-white/[0.02]">
              <div className="font-bold text-base text-[var(--text-primary)] font-mono">{totalCards}</div>
              <div className="text-[10px] text-[var(--text-dim)]">Cards Studied</div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <div className="font-bold text-base font-mono">{correctCount}</div>
              <div className="text-[10px]">Mastered</div>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
              <div className="font-bold text-base font-mono">{wrongCount}</div>
              <div className="text-[10px]">Needs Review</div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-[var(--text-dim)] font-mono">
            Time elapsed: <span className="text-[var(--text-primary)]">{formatTime(durationSeconds)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {wrongCount > 0 && onReviewMissed && (
            <button
              onClick={onReviewMissed}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Review {wrongCount} Missed Cards</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={onRestart}
              className="py-2.5 px-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:border-[var(--accent)] text-xs font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Start New Session</span>
            </button>

            <button
              onClick={onGoToDashboard}
              className="py-2.5 px-4 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-xs font-bold text-white shadow-md shadow-[var(--accent-glow)] transition-all flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Go to Dashboard</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
