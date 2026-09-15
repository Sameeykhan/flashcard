import React from 'react';
import { User, MarkStats } from '../../types';
import { TrendingUp, Flame, BookOpen, Target, Play } from 'lucide-react';
import { RobotAvatar } from '../common/RobotAvatar';

interface StudentProfileProps {
  user: User;
  stats?: MarkStats;
  onStartStudy: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ user, stats: _stats, onStartStudy }) => {
  // Accuracy donut math
  const accuracyPct = 89; // Default to 89% as in screenshot or dynamic stats.overallPercentage
  const radius = 24;
  const strokeWidth = 5;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracyPct / 100) * circumference;

  return (
    <div className="space-y-6 mb-6">
      {/* 1. Top Welcome Banner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all">
        {/* Left: Robot Avatar, Name, Email, Member Since, Grade */}
        <div className="flex items-center gap-4">
          <RobotAvatar className="w-14 h-14 rounded-2xl shadow-xs shrink-0" />

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Good morning, {user?.username?.split(' ')[0] || 'Alex'}!
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60">
                GRADE {user?.grade || 'A'}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 flex items-center gap-2 flex-wrap font-medium">
              <span>{user?.email || 'alex.rivers@cs.edu'}</span>
              <span>•</span>
              <span>Member since Aug 20, 2026</span>
            </p>
          </div>
        </div>

        {/* Center: Quote block */}
        <div className="hidden lg:block text-center px-4 max-w-xs">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic font-medium leading-relaxed">
            &ldquo;Consistency today creates expertise tomorrow.&rdquo;
          </p>
        </div>

        {/* Right: Launch Study Session CTA Button */}
        <div>
          <button
            onClick={onStartStudy}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-4 h-4 fill-white text-white" />
            <span>Launch Study Session</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Row (4 Metric Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Overall Marks */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3.5">
              Overall Marks
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                89%
              </span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                ↑ +5%
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-2">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              Grade: A-
            </span>
            {/* Mini Sparkline Line SVG */}
            <svg viewBox="0 0 64 22" className="w-16 h-5 stroke-emerald-500 fill-none">
              <path
                d="M 2 18 Q 18 16, 28 11 T 46 8 T 62 2"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Current Streak */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-500 flex items-center justify-center">
              <Flame className="w-5 h-5 fill-orange-500/20 text-orange-500" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3.5">
              Current Streak
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                5 days
              </span>
            </div>
            <p className="text-xs font-semibold text-orange-500 mt-0.5">
              Top 5% Consistency
            </p>
          </div>

          {/* 7-day streak dots */}
          <div className="flex items-center gap-1.5 mt-4 pt-2">
            {[true, true, true, false, false, false, false].map((active, idx) => (
              <span
                key={idx}
                className={`text-xs transition-transform hover:scale-125 ${
                  active
                    ? 'text-orange-500'
                    : 'w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 inline-block'
                }`}
              >
                {active ? '🔥' : ''}
              </span>
            ))}
          </div>
        </div>

        {/* Card 3: Cards Studied */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3.5">
              Cards Studied
            </p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                37
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-2">
            <span className="text-xs text-slate-400 font-medium">
              Lifetime Reviews
            </span>
            {/* Mini vertical bar chart */}
            <div className="flex items-end gap-1 h-6">
              <span className="w-1.5 h-2.5 bg-blue-300 dark:bg-blue-700 rounded-full" />
              <span className="w-1.5 h-4 bg-blue-400 dark:bg-blue-600 rounded-full" />
              <span className="w-1.5 h-3 bg-blue-300 dark:bg-blue-700 rounded-full" />
              <span className="w-1.5 h-5 bg-blue-500 dark:bg-blue-500 rounded-full" />
              <span className="w-1.5 h-6 bg-blue-600 dark:bg-blue-400 rounded-full" />
            </div>
          </div>
        </div>

        {/* Card 4: Accuracy Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-3.5">
              Accuracy Rate
            </p>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                89%
              </span>
              <span className="text-xs font-bold text-emerald-600">
                ↑ +12%
              </span>
            </div>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1">
              33 correct / 4 wrong
            </p>
          </div>

          {/* Donut progress ring */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 60 60">
              <circle
                cx="30"
                cy="30"
                r={radius}
                stroke="#e2e8f0"
                strokeWidth={strokeWidth}
                fill="none"
                className="dark:stroke-slate-800"
              />
              <circle
                cx="30"
                cy="30"
                r={radius}
                stroke="#2563eb"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-xs font-bold text-slate-800 dark:text-white">
              89%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
