import React from 'react';
import { Sparkles, X, HeartHandshake } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'motivational' | 'info' | 'success' | 'warning';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none px-4">
      {toasts.map((toast) => {
        const isMotivational = toast.type === 'motivational';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-xl border transition-all duration-300 transform animate-in slide-in-from-bottom-5 fade-in ${
              isMotivational
                ? 'bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 border-amber-500/40 text-amber-100 shadow-amber-500/10'
                : toast.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-100'
                : 'bg-indigo-950/80 border-indigo-500/40 text-indigo-100'
            }`}
          >
            {/* Top glowing bar */}
            <div
              className={`absolute top-0 left-0 right-0 h-1 ${
                isMotivational
                  ? 'bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 animate-pulse'
                  : 'bg-emerald-400'
              }`}
            />

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-white/10 shrink-0 text-amber-300">
                {isMotivational ? (
                  <HeartHandshake className="w-5 h-5 text-amber-400 animate-bounce" />
                ) : (
                  <Sparkles className="w-5 h-5 text-indigo-300" />
                )}
              </div>

              <div className="flex-1 pr-2">
                {toast.title && (
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 mb-0.5">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm font-medium leading-relaxed italic text-white/95">
                  "{toast.message}"
                </p>
              </div>

              <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-1 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
