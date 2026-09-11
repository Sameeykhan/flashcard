import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space / Enter', action: 'Flip card to reveal answer / question' },
    { key: '1 or Y', action: 'Grade as "Got It Right" (Advance SRS level)' },
    { key: '2 or N', action: 'Grade as "Missed It" (Reset to Day 1 review)' },
    { key: 'A', action: 'Open AI Assistant / Explain card' },
    { key: 'Esc', action: 'Close dialog / panel' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm glass-panel rounded-2xl p-6 border border-[var(--border-color)] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-[var(--accent)]/15 text-[var(--accent)]">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">Keyboard Shortcuts</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Hands-free high-speed card reviewing</p>
          </div>
        </div>

        <div className="space-y-2.5">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs"
            >
              <span className="text-[var(--text-muted)]">{s.action}</span>
              <kbd className="px-2 py-1 rounded bg-black/40 border border-white/15 text-white font-mono font-bold text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold hover:bg-[var(--accent-hover)] transition-colors"
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
