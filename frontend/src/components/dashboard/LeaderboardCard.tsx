import React from 'react';
import { PeerRank } from '../../types';
import { Trophy, Flame } from 'lucide-react';

interface LeaderboardCardProps {
  peers: PeerRank[];
  currentUsername?: string;
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({ peers, currentUsername }) => {
  return (
    <div className="glass-panel rounded-3xl p-6 border border-[var(--border-color)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Peer Leaderboard</h3>
            <p className="text-xs text-[var(--text-muted)]">Class rankings by marks & consistency</p>
          </div>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          Weekly Season
        </span>
      </div>

      <div className="space-y-2.5">
        {peers.map((peer) => {
          const isCurrentUser = currentUsername?.toLowerCase() === peer.username.toLowerCase();

          const rankBadge =
            peer.rank === 1 ? (
              <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-extrabold flex items-center justify-center text-xs shadow-md shadow-amber-400/40">
                1
              </span>
            ) : peer.rank === 2 ? (
              <span className="w-6 h-6 rounded-full bg-slate-300 text-black font-extrabold flex items-center justify-center text-xs shadow-md">
                2
              </span>
            ) : peer.rank === 3 ? (
              <span className="w-6 h-6 rounded-full bg-amber-700 text-white font-extrabold flex items-center justify-center text-xs shadow-md">
                3
              </span>
            ) : (
              <span className="w-6 h-6 rounded-full bg-white/5 text-[var(--text-dim)] font-mono font-bold flex items-center justify-center text-xs">
                {peer.rank}
              </span>
            );

          return (
            <div
              key={peer.id}
              className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                isCurrentUser
                  ? 'bg-[var(--accent)]/15 border-[var(--accent)] shadow-lg shadow-[var(--accent-glow)]'
                  : 'bg-white/[0.02] border-[var(--border-color)] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-3">
                {rankBadge}
                <img
                  src={peer.avatarUrl}
                  alt={peer.username}
                  className="w-8 h-8 rounded-full border border-[var(--border-color)] bg-black/20"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[var(--text-primary)]">
                      {peer.username}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[10px] font-bold px-1.5 rounded bg-[var(--accent)] text-white">
                        YOU
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-dim)] font-mono">
                    {peer.cardsStudied} cards studied
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-1 text-[11px] font-bold text-amber-400 font-mono"
                  title={`${peer.streakDays} Day Streak`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>{peer.streakDays}d</span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-extrabold font-mono text-[var(--text-primary)]">
                    {peer.overallMarks}%
                  </div>
                  <div className="text-[10px] text-emerald-400 font-semibold">{peer.grade}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
