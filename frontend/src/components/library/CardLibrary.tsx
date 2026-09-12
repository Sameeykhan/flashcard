import React, { useState, useMemo } from 'react';
import { Card } from '../../types';
import { cardService } from '../../services/cardService';
import { CodeBlock } from '../common/CodeBlock';
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
} from 'lucide-react';

interface CardLibraryProps {
  cards: Card[];
  onRefreshCards: () => void;
  onEditCard: (card: Card) => void;
  onAddNewCard: () => void;
  onStartStudyWithFilter: (filteredCards: Card[], label: string) => void;
}

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
  const [revealedCardIds, setRevealedCardIds] = useState<Set<string>>(new Set());
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
      setSyncFeedback('Sync failed. Please check network/rules.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
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

  const filteredCards = useMemo(() => {
    return cardService.filterCards(
      cards,
      searchQuery,
      selectedLanguage,
      selectedCategory,
      'all'
    );
  }, [cards, searchQuery, selectedLanguage, selectedCategory]);

  const toggleReveal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRevealedCardIds((prev) => {
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
    onStartStudyWithFilter(filteredCards, label);
  };

  const handleResetDefaults = () => {
    if (confirm('Reset flashcard deck to the default collection?')) {
      cardService.resetToDefault();
      onRefreshCards();
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {/* Top Header & Search Bar */}
      <div className="glass-panel rounded-3xl p-6 border border-[var(--border-color)] mb-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">
              Card Library & Deck Manager
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Browse, search, edit snippets, or launch focused practice
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleSyncFirebase}
              disabled={syncing}
              className="px-3.5 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all hover:scale-105"
              title="Sync cards with Firebase Cloud Firestore"
            >
              <Database className={`w-3.5 h-3.5 text-amber-400 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Syncing...' : 'Sync Firebase'}</span>
            </button>

            <button
              onClick={handleResetDefaults}
              className="px-3 py-2 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Reset default flashcards"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Defaults</span>
            </button>

            <button
              onClick={onAddNewCard}
              className="px-4 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[var(--accent-glow)] transition-all hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              <span>Add Flashcard</span>
            </button>

            {filteredCards.length > 0 && (
              <button
                onClick={handleStudyFiltered}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition-all hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Study Filtered ({filteredCards.length})</span>
              </button>
            )}
          </div>
        </div>

        {syncFeedback && (
          <div className="mb-4 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Database className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-dim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search questions, answers, code, tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Language Selector */}
          <div className="relative">
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] capitalize"
            >
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l === 'all' ? 'All Languages' : l}
                </option>
              ))}
            </select>
          </div>

          {/* Category Selector */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] capitalize"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Categories' : c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Subject Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2 no-scrollbar">
          {languages.map((lang) => {
            const isSelected = selectedLanguage.toLowerCase() === lang.toLowerCase();
            const count = lang === 'all' ? cards.length : cards.filter((c) => c.language.toLowerCase() === lang.toLowerCase()).length;
            return (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white shadow-sm shadow-[var(--accent-glow)]'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-color)]'
                }`}
              >
                {lang === 'all' ? 'All Subjects' : lang} ({count})
              </button>
            );
          })}
        </div>

        {/* Status Count */}
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-dim)]">
          <span>
            Showing <strong className="text-[var(--text-primary)]">{filteredCards.length}</strong> of{' '}
            {cards.length} flashcards
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      {filteredCards.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-[var(--border-color)]">
          <Filter className="w-10 h-10 text-[var(--text-dim)] mx-auto mb-3" />
          <h3 className="text-lg font-bold text-[var(--text-primary)]">No flashcards found</h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 mb-4">
            Try adjusting your search query or language/category filter
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedLanguage('all');
              setSelectedCategory('all');
            }}
            className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white text-xs font-bold"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const isRevealed = revealedCardIds.has(card.id);

            return (
              <div
                key={card.id}
                className="glass-card rounded-2xl p-5 border border-[var(--border-color)] flex flex-col justify-between hover:border-[var(--border-highlight)] transition-all group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                        {card.language}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-[var(--text-muted)]">
                        {card.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-dim)]">
                      {card.hint && (
                        <span className="flex items-center gap-0.5 text-amber-400" title={`Hint: ${card.hint}`}>
                          <Lightbulb className="w-3 h-3" />
                        </span>
                      )}
                      <span className="flex items-center gap-0.5" title="Difficulty">
                        <Flame className="w-3 h-3 text-amber-400" />
                        {card.difficulty.toFixed(1)}x
                      </span>
                      <span className="flex items-center gap-0.5" title="Leitner Level">
                        <Clock className="w-3 h-3 text-sky-400" />
                        Lvl {card.interval_level}
                      </span>
                    </div>
                  </div>

                  {/* Question */}
                  <h4 className="text-sm font-bold text-[var(--text-primary)] mb-2 leading-snug">
                    {card.question}
                  </h4>

                  {/* Snippet Preview */}
                  {card.code_snippet && (
                    <div className="my-2">
                      <CodeBlock
                        code={card.code_snippet}
                        language={card.language}
                        showLineNumbers={false}
                      />
                    </div>
                  )}

                  {/* Revealed Answer Box */}
                  {isRevealed && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 animate-in fade-in duration-150">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-0.5">
                        Answer
                      </div>
                      <div className="text-xs font-mono font-bold text-emerald-200">{card.answer}</div>
                      {card.explanation && (
                        <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                          {card.explanation}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                  {/* Reveal Toggle */}
                  <button
                    onClick={(e) => toggleReveal(card.id, e)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
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

                  {/* Edit / Delete Buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditCard(card);
                      }}
                      className="p-1.5 text-[var(--text-dim)] hover:text-[var(--text-primary)] rounded-lg hover:bg-white/10 transition-colors"
                      title="Edit Card"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(card.id, e)}
                      className="p-1.5 text-[var(--text-dim)] hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Delete Card"
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
    </div>
  );
};
