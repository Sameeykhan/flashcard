import React from 'react';
import { Achievement } from '../../types';
import {
  Award,
  Zap,
  Flame,
  Globe,
  Gem,
  Trophy,
  Brain,
  Lock,
  ChevronRight,
} from 'lucide-react';

interface BadgesCardProps {
  achievements?: Achievement[];
  onViewAll?: () => void;
}

export const BadgesCard: React.FC<BadgesCardProps> = ({ onViewAll }) => {
  // Exact 6 achievement cards from the screenshot
  const badgeList = [
    {
      id: 'b-1',
      title: 'First Step',
      desc: 'Completed your first flashcard session',
      date: 'Aug 20, 2026',
      icon: Zap,
      unlocked: true,
      bg: 'bg-emerald-600',
      iconColor: 'text-white',
    },
    {
      id: 'b-2',
      title: '5-Day Flame',
      desc: 'Maintained a 5-day streak',
      date: 'Sep 10, 2026',
      icon: Flame,
      unlocked: true,
      bg: 'bg-gradient-to-b from-orange-500 to-amber-600',
      iconColor: 'text-white',
    },
    {
      id: 'b-3',
      title: 'Polyglot Explorer',
      desc: 'Mastered cards across 4 different topics',
      date: 'Sep 11, 2026',
      icon: Globe,
      unlocked: true,
      bg: 'bg-blue-600',
      iconColor: 'text-white',
    },
    {
      id: 'b-4',
      title: 'Flawless Run',
      desc: 'Scored 100% accuracy on a session',
      icon: Gem,
      unlocked: false,
      bg: 'bg-blue-500',
      iconColor: 'text-white',
    },
    {
      id: 'b-5',
      title: 'Century Master',
      desc: 'Studied over 100 flashcards in total',
      date: 'Sep 11, 2026',
      icon: Trophy,
      unlocked: true,
      bg: 'bg-amber-500',
      iconColor: 'text-white',
    },
    {
      id: 'b-6',
      title: 'SRS Disciplinarian',
      desc: 'Reached Leitner level 4 on 5 cards',
      icon: Brain,
      unlocked: false,
      bg: 'bg-rose-400',
      iconColor: 'text-white',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Achievement Badges
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Milestones unlocked during your study journey
            </p>
          </div>
        </div>

        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2x3 Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {badgeList.map((badge) => {
          const Icon = badge.icon;

          return (
            <div
              key={badge.id}
              className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-3 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
            >
              {/* Hexagonal Shield Badge Icon */}
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${badge.bg} ${badge.iconColor}`}
              >
                <Icon className="w-5 h-5" />
              </div>

              {/* Badge Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {badge.title}
                  </h4>
                  {!badge.unlocked && (
                    <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-1">
                  {badge.desc}
                </p>

                {badge.unlocked && badge.date && (
                  <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                    {badge.date}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
