import React from 'react';
import {
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Database,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSound } from '../../context/SoundContext';
import { ThemeMode } from '../../types';

export const SettingsView: React.FC = () => {
  const { theme, setTheme, isLight, toggleLightDark, reducedMotion, setReducedMotion } = useTheme();
  const { soundEnabled, toggleSound } = useSound();

  const themes: { id: ThemeMode; label: string; color: string }[] = [
    { id: 'light', label: 'Clean Light (Default)', color: '#2563eb' },
    { id: 'dark', label: 'Dark Slate', color: '#6366f1' },
    { id: 'neon', label: 'Cyber Neon', color: '#00f5d4' },
    { id: 'nature', label: 'Nature Calm', color: '#10b981' },
    { id: 'sunset', label: 'Sunset Fuchsia', color: '#e1306c' },
    { id: 'emerald', label: 'Emerald Mint', color: '#25d366' },
  ];

  const handleResetData = () => {
    if (window.confirm('Reset all mock progress and return to fresh baseline?')) {
      localStorage.removeItem('codecards_sessions');
      localStorage.removeItem('codecards_user_stats');
      window.location.reload();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Application Settings
            </h2>
            <p className="text-xs text-slate-400">
              Customize appearance, auditory feedback, and study preferences
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Theme Mode */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Appearance & Palette
            </h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 mb-4">
              <div className="flex items-center gap-3">
                {isLight ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {isLight ? 'Light Modern Mode' : 'Dark Slate Mode'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Switch between crisp light aesthetic and eye-friendly dark mode
                  </p>
                </div>
              </div>

              <button
                onClick={toggleLightDark}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-xs hover:border-blue-500 transition-colors"
              >
                Switch to {isLight ? 'Dark' : 'Light'}
              </button>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    theme === t.id
                      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/40 shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-black/10"
                      style={{ backgroundColor: t.color }}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {t.label}
                    </span>
                  </div>
                  {theme === t.id && <Sparkles className="w-3.5 h-3.5 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Auditory Feedback */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Audio Experience
            </h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-blue-600" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-400" />
                )}
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Sound Effects & Tactile Cues
                  </h4>
                  <p className="text-xs text-slate-400">
                    Play audio when flipping cards, answering questions, or completing decks
                  </p>
                </div>
              </div>

              <button
                onClick={toggleSound}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  soundEnabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {soundEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Accessibility */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Accessibility
            </h3>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Reduced Motion
                  </h4>
                  <p className="text-xs text-slate-400">
                    Minimize 3D rotation and background particle animations
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReducedMotion(!reducedMotion)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  reducedMotion
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {reducedMotion ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          <hr className="border-slate-100 dark:border-slate-800" />

          {/* Data & Storage */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              Data & Cloud Sync
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-purple-500" />
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Local Cache & Spaced Repetition State
                  </h4>
                  <p className="text-xs text-slate-400">
                    Cards and SRS scheduling intervals are persistently saved in your browser
                  </p>
                </div>
              </div>

              <button
                onClick={handleResetData}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 hover:bg-rose-100 transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Demo Data</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
