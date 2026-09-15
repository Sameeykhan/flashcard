import React, { useState } from 'react';
import { PeerRank } from '../../types';
import { Trophy, Flame, ChevronDown } from 'lucide-react';
import { RobotAvatar } from '../common/RobotAvatar';

interface LeaderboardCardProps {
  peers?: PeerRank[];
  currentUsername?: string;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  currentUsername = 'Alex Rivers',
}) => {
  const [timeframe, setTimeframe] = useState<'Weekly' | 'Monthly' | 'All-time'>('Weekly');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Exact peers from the screenshot
  const peerList = [
    {
      id: 'p-1',
      rank: 1,
      name: 'Elena Rostova',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      cardsStudied: '320 cards studied',
      streak: '14d',
      marks: '96%',
      grade: 'A+',
    },
    {
      id: 'p-2',
      rank: 2,
      name: 'Marcus Vance',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      cardsStudied: '245 cards studied',
      streak: '8d',
      marks: '91%',
      grade: 'A',
    },
    {
      id: 'p-3',
      rank: 3,
      name: 'Alex Rivers',
      isYou: true,
      cardsStudied: '124 cards studied',
      streak: '5d',
      marks: '88%',
      grade: 'A',
    },
    {
      id: 'p-4',
      rank: 4,
      name: 'Sarah Chen',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      cardsStudied: '110 cards studied',
      streak: '4d',
      marks: '84%',
      grade: 'B+',
    },
    {
      id: 'p-5',
      rank: 5,
      name: 'Devon Miles',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      cardsStudied: '95 cards studied',
      streak: '3d',
      marks: '79%',
      grade: 'B',
    },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
      {/* Card Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-500 flex items-center justify-center">
            <Trophy className="w-5 h-5 fill-amber-500/20 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Peer Leaderboard
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Class rankings by marks & consistency
            </p>
          </div>
        </div>

        {/* Timeframe Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
          >
            <span>{timeframe}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-1 w-28 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg py-1 z-20">
              {(['Weekly', 'Monthly', 'All-time'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTimeframe(t);
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs font-medium ${
                    timeframe === t
                      ? 'bg-blue-50 text-blue-600 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5 Peer Rows */}
      <div className="space-y-2.5">
        {peerList.map((peer) => {
          const isUser = peer.isYou || currentUsername?.toLowerCase().includes('alex');

          return (
            <div
              key={peer.id}
              className={`flex items-center justify-between p-3 rounded-2xl transition-all ${
                isUser
                  ? 'bg-blue-50/50 dark:bg-blue-950/25 border border-blue-300 dark:border-blue-700 shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-transparent hover:border-slate-100 dark:hover:border-slate-800'
              }`}
            >
              {/* Left info: Rank badge + Avatar + Name + Cards studied */}
              <div className="flex items-center gap-3">
                {/* Rank Badge */}
                {peer.rank === 1 ? (
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black flex items-center justify-center text-xs shadow-xs">
                    1
                  </span>
                ) : peer.rank === 2 ? (
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black flex items-center justify-center text-xs">
                    2
                  </span>
                ) : peer.rank === 3 ? (
                  <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-black flex items-center justify-center text-xs shadow-xs">
                    3
                  </span>
                ) : (
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold flex items-center justify-center text-xs">
                    {peer.rank}
                  </span>
                )}

                {/* Avatar */}
                {isUser ? (
                  <RobotAvatar className="w-8 h-8 rounded-xl shadow-xs" />
                ) : (
                  <img
                    src={peer.avatarUrl}
                    alt={peer.name}
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 shrink-0"
                  />
                )}

                {/* Name & Studied Count */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {peer.name}
                    </span>
                    {isUser && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">{peer.cardsStudied}</p>
                </div>
              </div>

              {/* Right info: Streak Flame + Marks & Grade */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs font-bold text-orange-500">
                  <Flame className="w-3.5 h-3.5 fill-orange-500/20 text-orange-500" />
                  <span>{peer.streak}</span>
                </div>

                <div className="text-right min-w-[36px]">
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {peer.marks}
                  </div>
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {peer.grade}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
