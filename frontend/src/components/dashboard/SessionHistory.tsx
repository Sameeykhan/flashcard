import React from 'react';
import { SessionResult } from '../../types';
import { History, Clock, Check, X, Calendar } from 'lucide-react';

interface SessionHistoryProps {
  sessions: SessionResult[];
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ sessions }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 border border-[var(--border-color)] mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Recent Study Sessions</h3>
            <p className="text-xs text-[var(--text-muted)]">Historical logs and performance tracking</p>
          </div>
        </div>
        <span className="text-xs font-mono text-[var(--text-dim)]">
          Total Sessions: <strong className="text-[var(--text-primary)]">{sessions.length}</strong>
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[var(--border-color)] text-[var(--text-dim)] uppercase tracking-wider font-semibold">
              <th className="pb-3 pl-2">Date & Time</th>
              <th className="pb-3">Cards Studied</th>
              <th className="pb-3">Correct / Wrong</th>
              <th className="pb-3">Accuracy</th>
              <th className="pb-3">Duration</th>
              <th className="pb-3 pr-2">Topic Filter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {sessions.map((session, idx) => {
              const acc = session.accuracy_pct;
              const badgeClass =
                acc >= 90
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : acc >= 75
                  ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30';

              return (
                <tr
                  key={session.id || idx}
                  className="hover:bg-white/[0.02] transition-colors font-medium text-[var(--text-primary)]"
                >
                  <td className="py-3 pl-2 text-[var(--text-muted)] flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-dim)]" />
                    <span>{formatDate(session.date)}</span>
                  </td>
                  <td className="py-3 font-mono font-bold">{session.cards_studied}</td>
                  <td className="py-3 font-mono">
                    <span className="text-emerald-400 font-semibold">{session.correct_count}</span>
                    <span className="text-[var(--text-dim)] mx-1">/</span>
                    <span className="text-red-400 font-semibold">{session.wrong_count}</span>
                  </td>
                  <td className="py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${badgeClass}`}
                    >
                      {acc}%
                    </span>
                  </td>
                  <td className="py-3 text-[var(--text-muted)] font-mono whitespace-nowrap">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--text-dim)]" />
                      {formatDuration(session.duration_seconds)}
                    </span>
                  </td>
                  <td className="py-3 pr-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-mono text-[var(--text-muted)] border border-[var(--border-color)]">
                      {session.filter_applied?.language || 'All Languages'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
