import React, { useState, useEffect } from 'react';
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
  Database,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useSound } from '../../context/SoundContext';
import { useAuth } from '../../context/AuthContext';
import { ThemeMode } from '../../types';
import { firebaseSyncService, CloudSyncState } from '../../services/firebaseSyncService';

interface NavbarProps {
  currentTab: 'dashboard' | 'study' | 'library' | 'leaderboard';
  setCurrentTab: (tab: 'dashboard' | 'study' | 'library' | 'leaderboard') => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenAuth }) => {
  const { theme, setTheme, isLight, toggleLightDark, reducedMotion, setReducedMotion } = useTheme();
  const { soundEnabled, toggleSound } = useSound();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);
  const [syncState, setSyncState] = useState<CloudSyncState>(firebaseSyncService.state);

  useEffect(() => {
    const unsubscribe = firebaseSyncService.subscribe((state) => {
      setSyncState(state);
    });
    firebaseSyncService.testConnection().catch(() => {});
    return () => unsubscribe();
  }, []);

  const themeLabels: Record<ThemeMode, { name: string; color: string }> = {
    dark: { name: 'Dark Slate', color: '#6366f1' },
    light: { name: 'Light Modern', color: '#4f46e5' },
    sunset: { name: 'Sunset Fuchsia', color: '#e1306c' },
    emerald: { name: 'Emerald Mint', color: '#25d366' },
    neon: { name: 'Cyber Neon', color: '#00f5d4' },
    nature: { name: 'Nature Calm', color: '#10b981' },
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'study', label: 'Study Session', icon: PlayCircle },
    { id: 'library', label: 'Card Library', icon: BookOpen },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-[var(--color-border)] bg-[var(--color-surface)]/90 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Group 1: Primary Navigation (Logo + Tabs) */}
          <div className="flex items-center gap-6">
            {/* Brand Logo */}
            <div
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group select-none"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[var(--color-accent)] to-indigo-400 p-0.5 shadow-md shadow-[var(--color-accent-subtle)] group-hover:scale-105 transition-transform duration-200">
                <div className="w-full h-full rounded-[10px] bg-[var(--color-surface)] flex items-center justify-center">
                  <Layers className="w-4 h-4 text-[var(--color-accent)] group-hover:rotate-12 transition-transform duration-300" />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[var(--color-text-primary)]">
                  CodeCards
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/25 font-bold">
                  3D
                </span>
              </div>
            </div>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-[var(--color-surface-secondary)] p-1 rounded-xl border border-[var(--color-border)]">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-white shadow-sm'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Group 2: Utility & Status Cluster (Right) */}
          <div className="flex items-center gap-2">
            {/* Subtle Divider between Nav and Utilities */}
            <div className="h-5 w-px bg-[var(--color-border)] mx-1 hidden sm:block" />

            {/* 1. TOP-LEVEL LIGHT / DARK THEME TOGGLE (Visible, Easy to find) */}
            <button
              onClick={toggleLightDark}
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] transition-all hover:scale-105"
              title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              aria-label="Toggle Theme Mode"
            >
              {isLight ? (
                <Moon className="w-4 h-4 text-indigo-600" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            {/* 2. Theme Presets Dropdown (Palette) */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                title={`Current Theme: ${themeLabels[theme]?.name || theme}`}
              >
                <Palette className="w-4 h-4 text-[var(--color-accent)]" />
              </button>

              {themeDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-44 rounded-xl glass-panel shadow-xl p-1.5 border border-[var(--color-border)] z-50 animate-in fade-in zoom-in-95 duration-150"
                  onMouseLeave={() => setThemeDropdownOpen(false)}
                >
                  <div className="text-[10px] font-semibold text-[var(--color-text-tertiary)] px-2.5 py-1 uppercase tracking-wider">
                    Color Themes
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
                            ? 'bg-[var(--color-accent)] text-white font-bold'
                            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10"
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

            {/* 3. Audio Toggle */}
            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  : 'border-red-500/30 text-red-400 bg-red-500/10'
              }`}
              title={soundEnabled ? 'Audio Effects: On (Click to mute)' : 'Audio Effects: Muted (Click to unmute)'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* 4. Firebase Sync Status */}
            <button
              onClick={() => {
                firebaseSyncService.testConnection().catch(() => {});
              }}
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors relative"
              title={`Firebase Cloud: ${syncState.status === 'connected' ? 'Connected & Ready' : syncState.message}`}
            >
              <Database className="w-4 h-4 text-amber-500" />
              <span
                className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                  syncState.status === 'connected'
                    ? 'bg-emerald-500'
                    : syncState.status === 'syncing'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-400'
                }`}
              />
            </button>

            {/* 5. Streak Badge */}
            {user && (
              <div
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs font-bold"
                title={`${user.streakDays} Day Study Streak`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>{user.streakDays}d</span>
              </div>
            )}

            {/* 6. User Profile & Logout */}
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2 pl-1">
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="w-8 h-8 rounded-full border border-[var(--color-border)] bg-black/10 object-cover"
                />
                <button
                  onClick={logout}
                  className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Log out of session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-accent)] text-white text-xs font-bold shadow-sm hover:brightness-110 transition-all"
              >
                Sign In
              </button>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] md:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[var(--color-border)] animate-in fade-in slide-in-from-top-2 duration-150 space-y-1">
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
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
};
