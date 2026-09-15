import React from 'react';
import { SessionResult } from '../../types';
import { Clock, Calendar, ChevronRight } from 'lucide-react';

interface SessionHistoryProps {
  sessions?: SessionResult[];
  onViewAll?: () => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ onViewAll }) => {
  // Exact session entries from the screenshot
  const sessionRows = [
    {
      id: 'sess-1',
      date: 'Sep 12, 2026, 12:49 AM',
      cardsStudied: 12,
      correct: 11,
      wrong: 1,
      accuracy: 92,
      duration: '3m 5s',
      topic: 'Python',
      topicColor: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
    },
    {
      id: 'sess-2',
      date: 'Sep 13, 2026, 12:49 AM',
      cardsStudied: 10,
      correct: 8,
      wrong: 2,
      accuracy: 80,
      duration: '3m 30s',
      topic: 'JavaScript',
      topicColor: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'sess-3',
      date: 'Sep 14, 2026, 12:49 AM',
      cardsStudied: 15,
      correct: 14,
      wrong: 1,
      accuracy: 93,
      duration: '4m 20s',
      topic: 'All',
      topicColor: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Recent Study Sessions
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Historical logs and performance tracking
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <th className="pb-3 pl-3">DATE & TIME</th>
              <th className="pb-3">CARDS STUDIED</th>
              <th className="pb-3">CORRECT / WRONG</th>
              <th className="pb-3">ACCURACY</th>
              <th className="pb-3">DURATION</th>
              <th className="pb-3 pr-3 text-right">TOPIC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {sessionRows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                {/* Date & Time */}
                <td className="py-4 pl-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{row.date}</span>
                  </div>
                </td>

                {/* Cards Studied */}
                <td className="py-4 font-bold text-slate-900 dark:text-white">
                  {row.cardsStudied}
                </td>

                {/* Correct / Wrong */}
                <td className="py-4 font-semibold">
                  <span className="text-emerald-600 dark:text-emerald-400">{row.correct}</span>
                  <span className="text-slate-300 dark:text-slate-600 mx-1.5">/</span>
                  <span className="text-rose-500">{row.wrong}</span>
                </td>

                {/* Accuracy */}
                <td className="py-4">
                  <span className="inline-block px-2.5 py-0.5 rounded-full font-bold text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                    {row.accuracy}%
                  </span>
                </td>

                {/* Duration */}
                <td className="py-4 text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{row.duration}</span>
                  </div>
                </td>

                {/* Topic Pill */}
                <td className="py-4 pr-3 text-right">
                  <span
                    className={`inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${row.topicColor}`}
                  >
                    {row.topic}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
