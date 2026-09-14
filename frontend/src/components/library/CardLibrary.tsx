import React, { useState, useMemo } from 'react';
import { Card } from '../../types';
import { cardService } from '../../services/cardService';
import { CodeBlock } from '../common/CodeBlock';
import { getCategoryToken } from '../../utils/categoryColors';
import {
  Search,
  Plus,
  Play,
  Filter,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Flame,
  Clock,
  RotateCcw,
  Lightbulb,
  Database,
  LayoutGrid,
  List,
  X,
  ChevronDown,
} from 'lucide-react';

interface CardLibraryProps {
  cards: Card[];
  onRefreshCards: () => void;
  onEditCard: (card: Card) => void;
  onAddNewCard: () => void;
  onStartStudyWithFilter: (filteredCards: Card[], label: string) => void;
}

type SortOption = 'srs' | 'diff-desc' | 'diff-asc' | 'level-desc' | 'newest' | 'alpha';

export const CardLibrary: React.FC<CardLibraryProps> = ({
  cards,
  onRefreshCards,
  onEditCard,
  onAddNewCard,
  onStartStudyWithFilter,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('srs');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set());
  const [expandedCodeIds, setExpandedCodeIds] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleSyncFirebase = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await cardService.syncWithCloud();
      setSyncFeedback(res.message);
      if (res.success) {
        onRefreshCards();
      }
    } catch {
      setSyncFeedback('Sync failed. Please check network or Firebase settings.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const languages = useMemo(() => {
    const list = Array.from(new Set(cards.map((c) => c.language))).sort();
    return ['all', ...list];
  }, [cards]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(cards.map((c) => c.category))).sort();
    return ['all', ...list];
  }, [cards]);

  const filteredAndSortedCards = useMemo(() => {
    const filtered = cardService.filterCards(
      cards,
      searchQuery,
      selectedLanguage,
      selectedCategory,
      'all'
    );

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'srs': {
          const timeA = a.next_due ? new Date(a.next_due).getTime() : 0;
          const timeB = b.next_due ? new Date(b.next_due).getTime() : 0;
          return timeA - timeB;
        }
        case 'diff-desc':
          return b.difficulty - a.difficulty;
        case 'diff-asc':
          return a.difficulty - b.difficulty;
        case 'level-desc':
          return b.interval_level - a.interval_level;
        case 'newest':
          return b.id.localeCompare(a.id);
        case 'alpha':
          return a.question.localeCompare(b.question);
        default:
          return 0;
      }
    });
  }, [cards, searchQuery, selectedLanguage, selectedCategory, sortBy]);

  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCodeExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this flashcard?')) {
      cardService.deleteCard(id);
      onRefreshCards();
    }
  };

  const handleStudyFiltered = () => {
    const label =
      selectedLanguage !== 'all'
        ? `${selectedLanguage} Deck`
        : selectedCategory !== 'all'
        ? `${selectedCategory} Deck`
        : 'Filtered Library';
    onStartStudyWithFilter(filteredAndSortedCards, label);
  };

  const handleStudySingle = (card: Card, e: React.MouseEvent) => {
    e.stopPropagation();
    onStartStudyWithFilter([card], `${card.language}: Single Practice`);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset flashcard deck to the original 33 curated questions?')) {
      cardService.resetToDefault();
      onRefreshCards();
    }
  };

  const hasActiveFilters = searchQuery.trim() !== '' || selectedLanguage !== 'all' || selectedCategory !== 'all';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* 1. Header Section with Standardized Button Hierarchy */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--color-text-primary)]">
              Card Library
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border border-[var(--color-accent)]/20">
              {cards.length} Cards
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] mt-1">
            Browse, filter by category, and review your spaced repetition queue.
          </p>
        </div>

        {/* Action Controls: Primary, Secondary, Tertiary/Ghost hierarchy */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Tertiary / Ghost Button 1 */}
          <button
            onClick={handleSyncFirebase}
            disabled={syncing}
            className="px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium flex items-center gap-1.5 transition-colors border border-transparent hover:border-[var(--color-border)]"
            title="Sync cards with Firebase Cloud Firestore"
          >
            <Database className={`w-3.5 h-3.5 text-amber-500 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Syncing...' : 'Sync Cloud'}</span>
          </button>

          {/* Tertiary / Ghost Button 2 */}
          <button
            onClick={handleResetDefaults}
            className="px-3 py-2 rounded-xl text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium flex items-center gap-1.5 transition-colors border border-transparent hover:border-[var(--color-border)]"
            title="Reset deck to original 33 questions"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Deck</span>
          </button>

          {/* Secondary CTA */}
          <button
            onClick={onAddNewCard}
            className="px-3.5 py-2 rounded-xl bg-[var(--color-surface)] hover:bg-[var(--color-surface-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-hover)] text-[var(--color-text-primary)] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[var(--color-accent)]" />
            <span>Add Card</span>
          </button>

          {/* Primary CTA */}
          {filteredAndSortedCards.length > 0 && (
            <button
              onClick={handleStudyFiltered}
              className="px-4 py-2 rounded-xl bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[var(--color-accent-subtle)] transition-all hover:scale-[1.02]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Study ({filteredAndSortedCards.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Sync Feedback Toast Banner */}
      {syncFeedback && (
        <div className="px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
          <Database className="w-4 h-4 text-amber-500 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* 2. Unified Filter & Control Bar with Standardized Heights (h-10) and Gaps */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-[var(--color-border)] shadow-sm space-y-3.5">
        {/* Top Controls Row: Equalized h-10 height & gap-3 */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, code snippets, tags..."
              className="w-full h-10 pl-10 pr-9 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="w-full lg:w-44">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] capitalize cursor-pointer transition-colors"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="w-full lg:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent)] cursor-pointer transition-colors"
            >
              <option value="srs" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                Sort: Due Date (SRS)
              </option>
              <option value="diff-desc" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                Sort: Difficulty (High → Low)
              </option>
              <option value="diff-asc" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                Sort: Difficulty (Low → High)
              </option>
              <option value="level-desc" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                Sort: Mastery Level
              </option>
              <option value="newest" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                Sort: Recently Added
              </option>
              <option value="alpha" className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
                Sort: Question (A → Z)
              </option>
            </select>
          </div>

          {/* View Switcher: Standardized h-10 height */}
          <div className="h-10 flex items-center p-1 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] self-end lg:self-center">
            <button
              onClick={() => setViewMode('grid')}
              className={`h-full px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'grid'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`h-full px-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors ${
                viewMode === 'list'
                  ? 'bg-[var(--color-accent)] text-white shadow-sm'
                  : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Category & Subject Filter Pills (Unified Color System) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          {languages.map((lang) => {
            const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
            const count =
              lang === 'all'
                ? cards.length
                : cards.filter((c) => c.language.toLowerCase() === lang.toLowerCase()).length;
            const token = getCategoryToken(lang);

            return (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                style={
                  isSelected
                    ? {
                        backgroundColor: token.bg,
                        color: token.text,
                        borderColor: token.border,
                      }
                    : undefined
                }
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'shadow-sm'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                {lang !== 'all' && (
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: token.dot }}
                  />
                )}
                <span>{lang === 'all' ? 'All' : lang}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected
                      ? 'bg-black/10 dark:bg-white/10'
                      : 'bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)] text-xs text-[var(--color-text-tertiary)]">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-[var(--color-text-primary)]">{filteredAndSortedCards.length}</strong> of{' '}
              {cards.length} cards
            </span>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedLanguage('all');
                  setSelectedCategory('all');
                }}
                className="text-[var(--color-accent)] hover:underline font-medium text-[11px] ml-2"
              >
                Clear all filters
              </button>
            )}
          </div>
          <span className="text-[11px] font-mono hidden sm:inline">
            Mode: {viewMode === 'grid' ? 'Grid' : 'Compact List'}
          </span>
        </div>
      </div>

      {/* 3. Empty State */}
      {filteredAndSortedCards.length === 0 && (
        <div className="glass-panel rounded-3xl p-12 text-center border border-[var(--color-border)]">
          <Filter className="w-10 h-10 text-[var(--color-text-tertiary)] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-[var(--color-text-primary)]">No flashcards found</h3>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1 mb-4">
            Try adjusting your search query or language/category filter
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedLanguage('all');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-[var(--color-accent)] text-white text-xs font-bold shadow hover:brightness-110"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* 4. Grid View: Enhanced Visual Hierarchy & Equalized Spacing */}
      {viewMode === 'grid' && filteredAndSortedCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedCards.map((card) => {
            const isRevealed = revealedCardIds.has(card.id);
            const isCodeExpanded = expandedCodeIds.has(card.id);
            const token = getCategoryToken(card.language);
            const snippetLines = card.code_snippet?.trim().split('\n') || [];
            const isSnippetLong = snippetLines.length > 4;

            return (
              <div
                key={card.id}
                style={{ borderLeftColor: token.dot }}
                className="glass-card rounded-2xl p-5 sm:p-6 border border-[var(--color-border)] border-l-4 flex flex-col justify-between hover:border-[var(--color-border-hover)] transition-all duration-200 group"
              >
                <div className="w-full">
                  {/* Card Header Row: One Primary Color Accent, Demoted Secondary Metadata */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Primary Color Accent: Language Badge */}
                      <span
                        style={{
                          backgroundColor: token.bg,
                          color: token.text,
                          borderColor: token.border,
                        }}
                        className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: token.dot }}
                        />
                        {card.language}
                      </span>

                      {/* Secondary Monochrome Pill: Category Tag */}
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-surface-secondary)] text-[var(--color-text-tertiary)] border border-[var(--color-border)] font-medium">
                        {card.category}
                      </span>
                    </div>

                    {/* Secondary Metadata: Muted, Monochrome Style */}
                    <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--color-text-tertiary)]">
                      {card.hint && (
                        <span className="text-amber-500" title={`Hint: ${card.hint}`}>
                          <Lightbulb className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span className="flex items-center gap-0.5" title={`Spaced Repetition Ladder Level ${card.interval_level}`}>
                        <Clock className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                        <span>Lvl {card.interval_level}</span>
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5" title={`Difficulty: ${card.difficulty.toFixed(1)}x`}>
                        <Flame className="w-3 h-3 text-[var(--color-text-tertiary)]" />
                        <span>{card.difficulty.toFixed(1)}x</span>
                      </span>
                    </div>
                  </div>

                  {/* Question: Clear Visual Focus of the Card */}
                  <h3 className="text-base font-bold tracking-tight text-[var(--color-text-primary)] mb-3 leading-snug">
                    {card.question}
                  </h3>

                  {/* Code Snippet Preview: High contrast, theme-aware, standardized internal padding */}
                  {card.code_snippet && (
                    <div className="w-full my-0 mb-4">
                      <CodeBlock
                        code={card.code_snippet}
                        language={card.language}
                        showLineNumbers={false}
                        compact={true}
                        maxHeight={isCodeExpanded ? 'none' : '110px'}
                      />
                      {isSnippetLong && (
                        <button
                          onClick={(e) => toggleCodeExpand(card.id, e)}
                          className="text-[10px] text-[var(--color-accent)] hover:underline mt-1 font-mono flex items-center gap-1"
                        >
                          {isCodeExpanded ? '▲ Collapse snippet' : `▼ Show all (${snippetLines.length} lines)`}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Revealed Answer Accordion Drawer */}
                  {isRevealed && (
                    <div className="w-full mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 animate-in fade-in duration-150">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                        Solution
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-200 leading-relaxed">
                        {card.answer}
                      </div>
                      {card.explanation && (
                        <p className="text-[11px] text-[var(--color-text-secondary)] mt-2 leading-relaxed border-t border-emerald-500/15 pt-2">
                          {card.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Row: Equalized Spacing, Clear Left View Answer vs Right Action Cluster */}
                <div className="w-full mt-auto pt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
                  {/* Left-Aligned: View Answer Toggle */}
                  <button
                    onClick={(e) => toggleReveal(card.id, e)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-accent)] transition-colors"
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide Answer</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Answer</span>
                      </>
                    )}
                  </button>

                  {/* Right-Aligned: Action Cluster with Identical 32x32px Button Sizing */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleStudySingle(card, e)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-[var(--color-surface-secondary)] border border-transparent hover:border-[var(--color-border)] transition-colors"
                      title="Practice this card"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCard(card);
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] border border-transparent hover:border-[var(--color-border)] transition-colors"
                      title="Edit card"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(card.id, e)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                      title="Delete card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. List / Table View: Token-Integrated & High-Density */}
      {viewMode === 'list' && filteredAndSortedCards.length > 0 && (
        <div className="glass-panel rounded-2xl border border-[var(--color-border)] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--color-surface-secondary)] border-b border-[var(--color-border)] text-[var(--color-text-secondary)] uppercase tracking-wider font-bold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Question & Details</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Level & Diff</th>
                  <th className="py-3 px-4">Answer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)] text-[var(--color-text-primary)]">
                {filteredAndSortedCards.map((card) => {
                  const isRevealed = revealedCardIds.has(card.id);
                  const token = getCategoryToken(card.language);

                  return (
                    <tr
                      key={card.id}
                      className="hover:bg-[var(--color-surface-hover)] transition-colors group"
                    >
                      {/* Language Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          style={{
                            backgroundColor: token.bg,
                            color: token.text,
                            borderColor: token.border,
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: token.dot }}
                          />
                          {card.language}
                        </span>
                      </td>

                      {/* Question Column */}
                      <td className="py-3.5 px-4 min-w-[280px]">
                        <div className="font-bold text-xs text-[var(--color-text-primary)]">
                          {card.question}
                        </div>
                        {card.code_snippet && (
                          <div className="text-[10px] font-mono text-[var(--color-text-tertiary)] mt-0.5 truncate max-w-md">
                            <code>{card.code_snippet.split('\n')[0]}</code>
                          </div>
                        )}
                      </td>

                      {/* Category Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] border border-[var(--color-border)] text-[11px]">
                          {card.category}
                        </span>
                      </td>

                      {/* Level & Difficulty Column */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-[var(--color-text-tertiary)]">
                          <span>Lvl {card.interval_level}</span>
                          <span>·</span>
                          <span>{card.difficulty.toFixed(1)}x</span>
                        </div>
                      </td>

                      {/* Answer Column */}
                      <td className="py-3.5 px-4 min-w-[180px]">
                        {isRevealed ? (
                          <div className="text-emerald-700 dark:text-emerald-400 font-mono font-medium text-[11px]">
                            {card.answer}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => toggleReveal(card.id, e)}
                            className="text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)] flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Peek</span>
                          </button>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => handleStudySingle(card, e)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-[var(--color-surface-secondary)] transition-colors"
                            title="Study card"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditCard(card);
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors"
                            title="Edit card"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(card.id, e)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-tertiary)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            title="Delete card"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
