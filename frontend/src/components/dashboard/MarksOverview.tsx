import React from 'react';
import { MarkStats } from '../../types';
import { Code2, Layers, LayoutGrid, Network, Globe, ChevronRight } from 'lucide-react';

interface MarksOverviewProps {
  stats?: MarkStats;
  onViewAllLanguages?: () => void;
  onViewAllCategories?: () => void;
}

// Mini Radial Circle Gauge component
const MiniRadialGauge: React.FC<{ pct: number; strokeColor: string }> = ({
  pct,
  strokeColor,
}) => {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
        <circle
          cx="20"
          cy="20"
          r={r}
          stroke="#f1f5f9"
          strokeWidth="3.5"
          fill="none"
          className="dark:stroke-slate-800"
        />
        <circle
          cx="20"
          cy="20"
          r={r}
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-800 dark:text-slate-200">
        {pct}%
      </span>
    </div>
  );
};

export const MarksOverview: React.FC<MarksOverviewProps> = ({
  onViewAllLanguages,
  onViewAllCategories,
}) => {

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* LEFT: Language Mastery Marks */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Language Mastery Marks
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Per-language accuracy & competency
              </p>
            </div>
          </div>

          <button
            onClick={onViewAllLanguages}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3 Language Mastery Progress Rows */}
        <div className="space-y-5">
          {/* 1. Python */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <div className="flex items-center gap-2.5">
                {/* Python Logo icon */}
                <div className="w-6 h-6 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path
                      fill="#387eb8"
                      d="M11.9 2c-5.2 0-4.9 2.3-4.9 2.3l.01 2.4h5v.7H4.3S2 7.1 2 12.3s2 5.1 2 5.1h1.2v-2.5s-.1-2.9 2.9-2.9h5s2.8.1 2.8-2.7V4.3S16.3 2 11.9 2zM9.3 4.2a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8z"
                    />
                    <path
                      fill="#ffe052"
                      d="M12.1 22c5.2 0 4.9-2.3 4.9-2.3l-.01-2.4h-5v-.7h7.7s2.3.3 2.3-4.9-2-5.1-2-5.1h-1.2v2.5s.1 2.9-2.9 2.9h-5s-2.8-.1-2.8 2.7v4.9s-.4 2.3 4 2.3zm2.6-2.2a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8z"
                    />
                  </svg>
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Python
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400 font-medium">11/12</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white w-8 text-right">
                  92%
                </span>
              </div>
            </div>
            {/* Teal/Emerald bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-700"
                style={{ width: '92%' }}
              />
            </div>
          </div>

          {/* 2. JavaScript */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <div className="flex items-center gap-2.5">
                {/* JS Yellow badge */}
                <div className="w-5 h-5 rounded bg-[#f7df1e] text-slate-950 font-black text-[9px] flex items-center justify-center shrink-0 shadow-xs">
                  JS
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  JavaScript
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400 font-medium">8/10</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white w-8 text-right">
                  80%
                </span>
              </div>
            </div>
            {/* Bright Blue bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-700"
                style={{ width: '80%' }}
              />
            </div>
          </div>

          {/* 3. All Topics */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <div className="flex items-center gap-2.5">
                {/* Purple Layers icon */}
                <div className="w-5 h-5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
                  <Layers className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  All Topics
                </span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-xs text-slate-400 font-medium">14/15</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white w-8 text-right">
                  93%
                </span>
              </div>
            </div>
            {/* Purple gradient bar */}
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-700"
                style={{ width: '93%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Domain & Category Grades */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                Domain & Category Grades
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Core CS concepts & operational skill
              </p>
            </div>
          </div>

          <button
            onClick={onViewAllCategories}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2x2 Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Item 1: General */}
          <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                <LayoutGrid className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  General
                </h4>
                <p className="text-[11px] text-slate-400">37 cards tracked</p>
              </div>
            </div>
            <MiniRadialGauge pct={89} strokeColor="#10b981" />
          </div>

          {/* Item 2: Data Structures */}
          <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Data Structures
                </h4>
                <p className="text-[11px] text-slate-400">24 cards tracked</p>
              </div>
            </div>
            <MiniRadialGauge pct={92} strokeColor="#0d9488" />
          </div>

          {/* Item 3: Algorithms */}
          <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center shrink-0 font-bold text-sm">
                Σ
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Algorithms
                </h4>
                <p className="text-[11px] text-slate-400">18 cards tracked</p>
              </div>
            </div>
            <MiniRadialGauge pct={86} strokeColor="#2563eb" />
          </div>

          {/* Item 4: Web Development */}
          <div className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Web Development
                </h4>
                <p className="text-[11px] text-slate-400">12 cards tracked</p>
              </div>
            </div>
            <MiniRadialGauge pct={78} strokeColor="#f59e0b" />
          </div>
        </div>
      </div>
    </div>
  );
};
