import React from 'react';
import { User, MarkStats } from '../../types';
import { Flame, Award, BookOpen, Target, Calendar, ArrowRight, Play } from 'lucide-react';

interface StudentProfileProps {
  user: User;
  stats: MarkStats;
  onStartStudy: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ user, stats, onStartStudy }) => {
  return (
    <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-[var(--border-color)] shadow-xl mb-8">
      {/* Background Accent Gradients */}
      <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-[var(--accent)] opacity-20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full bg-emerald-500 opacity-15 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Left: Avatar & Bio */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative">
            <img
              src={user.avatarUrl}
              alt={user.username}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-[var(--border-highlight)] bg-black/40 p-1 object-cover shadow-lg"
            />
            <div
              className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-amber-500 text-black shadow-md"
              title={`${user.streakDays} Day Active Streak`}
            >
              <Flame className="w-4 h-4 fill-black text-black" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
                {user.username}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Grade {user.grade}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 flex items-center gap-3 flex-wrap">
              <span>{user.email}</span>
              <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-dim)]" />
              <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--text-dim)]">
                <Calendar className="w-3 h-3" /> Member since {user.joinedDate}
              </span>
            </p>
          </div>
        </div>

        {/* Right: Quick Action Banner */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={onStartStudy}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-indigo-600 hover:from-[var(--accent-hover)] hover:to-indigo-700 text-white font-bold text-sm shadow-xl shadow-[var(--accent-glow)] transition-all hover:scale-105"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Launch Study Session</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>

      {/* Metric Quick Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[var(--border-color)]">
        <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Overall Marks</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono">
            {stats.overallPercentage}%
          </div>
          <div className="text-[10px] text-emerald-400 font-semibold mt-0.5">Grade: {stats.letterGrade}</div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Current Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono">
            {user.streakDays} <span className="text-xs font-normal text-[var(--text-muted)]">Days</span>
          </div>
          <div className="text-[10px] text-amber-400 font-semibold mt-0.5">Top 5% Consistency</div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Cards Studied</span>
            <BookOpen className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono">
            {stats.totalCardsStudied}
          </div>
          <div className="text-[10px] text-sky-400 font-semibold mt-0.5">Lifetime Reviews</div>
        </div>

        <div className="p-3 sm:p-4 rounded-2xl bg-white/[0.02] border border-[var(--border-color)]">
          <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1">
            <span>Accuracy Rate</span>
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--text-primary)] font-mono">
            {stats.overallPercentage}%
          </div>
          <div className="text-[10px] text-purple-400 font-semibold mt-0.5">
            {stats.totalCorrect} correct / {stats.totalWrong} wrong
          </div>
        </div>
      </div>
    </div>
  );
};
