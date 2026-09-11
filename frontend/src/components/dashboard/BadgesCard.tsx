import React from 'react';
import { Achievement } from '../../types';
import { Award, Lock, Sparkles } from 'lucide-react';

interface BadgesCardProps {
  achievements: Achievement[];
}

export const BadgesCard: React.FC<BadgesCardProps> = ({ achievements }) => {
  return (
    <div className="glass-panel rounded-3xl p-6 border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Achievement Badges</h3>
            <p className="text-xs text-[var(--text-muted)]">Milestones unlocked during your study journey</p>
          </div>
        </div>
        <span className="text-xs font-mono text-[var(--text-dim)]">
          {achievements.filter((a) => a.unlocked).length} of {achievements.length} Unlocked
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {achievements.map((badge) => {
          return (
            <div
              key={badge.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3 ${
                badge.unlocked
                  ? 'bg-gradient-to-r from-[var(--accent)]/10 to-purple-500/10 border-[var(--border-highlight)] shadow-sm'
                  : 'bg-white/[0.01] border-[var(--border-color)] opacity-60'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shrink-0 ${
                  badge.unlocked
                    ? 'bg-[var(--accent)]/20 shadow-md shadow-[var(--accent-glow)]'
                    : 'bg-black/30'
                }`}
              >
                {badge.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                    {badge.title}
                  </h4>
                  {!badge.unlocked && <Lock className="w-3 h-3 text-[var(--text-dim)]" />}
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">
                  {badge.description}
                </p>
                {badge.unlocked && badge.unlockedAt && (
                  <span className="text-[10px] text-emerald-400 font-mono">
                    Unlocked {badge.unlockedAt}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
