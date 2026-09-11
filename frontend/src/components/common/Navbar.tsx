import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  Volume2,
  VolumeX,
  Palette,
  Eye,
  LogOut,
  Flame,
  Menu,
  X,
  BookOpen,
  Trophy,
  LayoutDashboard,
  PlayCircle,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSound } from '../../context/SoundContext';
import { useAuth } from '../../context/AuthContext';
import { ThemeMode } from '../../types';

interface NavbarProps {
  currentTab: 'dashboard' | 'study' | 'library' | 'leaderboard';
  setCurrentTab: (tab: 'dashboard' | 'study' | 'library' | 'leaderboard') => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenAuth }) => {
  const { theme, setTheme, cycleTheme, reducedMotion, setReducedMotion } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

  const themeLabels: Record<ThemeMode, { name: string; color: string }> = {
    dark: { name: 'Dark Slate', color: '#6366f1' },
    light: { name: 'Light Modern', color: '#4f46e5' },
    neon: { name: 'Cyber Neon', color: '#00f5d4' },
    nature: { name: 'Nature Calm', color: '#52b788' },
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study', label: 'Study Session', icon: PlayCircle },
    { id: 'library', label: 'Card Library', icon: BookOpen },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--border-color)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div
            onClick={() => setCurrentTab('dashboard')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[var(--accent)] to-indigo-400 p-0.5 shadow-lg shadow-[var(--accent-glow)] group-hover:scale-105 transition-transform duration-200">
              <div className="w-full h-full rounded-[10px] bg-[var(--bg-primary)] flex items-center justify-center">
                <Layers className="w-5 h-5 text-[var(--accent)] group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[var(--text-primary)] via-[var(--text-primary)] to-[var(--accent)] bg-clip-text text-transparent">
                  CodeCards
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                  3D
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] hidden sm:block">Interactive Mastery System</p>
            </div>
          </div>

          {/* Desktop Nav Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-secondary)]/70 p-1 rounded-xl border border-[var(--border-color)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-[var(--accent)] text-white shadow-md shadow-[var(--accent-glow)] scale-[1.02]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Toolbar Controls */}
          <div className="hidden sm:flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                soundEnabled
                  ? 'border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--accent)]/10'
                  : 'border-dashed border-red-500/40 text-red-400 bg-red-500/10'
              }`}
              title={soundEnabled ? 'Mute Audio Effects' : 'Unmute Audio Effects'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Reduced Motion Toggle */}
            <button
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                reducedMotion
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/15'
                  : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
              title={reducedMotion ? 'Reduced Motion: Active' : 'Reduced Motion: Off (Click to enable)'}
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Theme Selector Dropdown */}
            <div className="relative">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--border-highlight)] transition-colors"
                title="Switch Theme"
              >
                <Palette className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="capitalize text-xs font-semibold">{theme}</span>
              </button>

              {themeDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl glass-panel shadow-2xl p-1.5 border border-[var(--border-color)] z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setThemeDropdownOpen(false)}
                >
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] px-2.5 py-1 uppercase tracking-wider">
                    Select Theme
                  </div>
                  {(Object.keys(themeLabels) as ThemeMode[]).map((tKey) => {
                    const tInfo = themeLabels[tKey];
                    const isSelected = theme === tKey;
                    return (
                      <button
                        key={tKey}
                        onClick={() => {
                          setTheme(tKey);
                          setThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent)] text-white font-bold'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/20"
                            style={{ backgroundColor: tInfo.color }}
                          />
                          <span>{tInfo.name}</span>
                        </div>
                        {isSelected && <Sparkles className="w-3 h-3" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User Streak & Profile */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[var(--border-color)]">
                {/* Streak Badge */}
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold"
                  title={`${user.streakDays} Day Streak!`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  <span>{user.streakDays}d</span>
                </div>

                {/* Avatar & Logout */}
                <div className="flex items-center gap-2">
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="w-8 h-8 rounded-full border border-[var(--accent)] bg-black/20 p-0.5 object-cover"
                  />
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold leading-tight">{user.username}</div>
                    <div className="text-[10px] text-emerald-400 font-semibold">{user.grade} Grade</div>
                  </div>
                  <button
                    onClick={logout}
                    className="p-1.5 text-[var(--text-dim)] hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold shadow-md shadow-[var(--accent-glow)] transition-all"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-panel border-b border-[var(--border-color)] px-4 pt-2 pb-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-muted)] hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between">
            <button
              onClick={cycleTheme}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"
            >
              <Palette className="w-4 h-4 text-[var(--accent)]" />
              <span>Theme: {theme}</span>
            </button>
            <button
              onClick={toggleSound}
              className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span>Sound {soundEnabled ? 'On' : 'Off'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
