import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, X, Play, Code, ArrowRight } from 'lucide-react';
import { Card } from '../../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: Card[];
  onSelectCard: (card: Card) => void;
  onStartSession: (deck: Card[], label: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  cards,
  onSelectCard,
  onStartSession,
}) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    setQuery('');
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredCards = useMemo(() => {
    if (!query.trim()) return cards.slice(0, 6);
    const q = query.toLowerCase();
    return cards
      .filter(
        (c) =>
          c.question.toLowerCase().includes(q) ||
          c.answer.toLowerCase().includes(q) ||
          c.language.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [query, cards]);

  const matchingLanguages = useMemo(() => {
    const langs = Array.from(new Set(cards.map((c) => c.language)));
    if (!query.trim()) return langs.slice(0, 4);
    return langs.filter((l) => l.toLowerCase().includes(query.toLowerCase()));
  }, [query, cards]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, topic, or card question..."
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-4 space-y-4">
          {/* Quick Topics / Languages */}
          {matchingLanguages.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Filter by Topic
              </p>
              <div className="flex flex-wrap gap-2">
                {matchingLanguages.map((lang) => (
                  <button
                    key={lang}
                    onClick={() => {
                      const topicCards = cards.filter(
                        (c) => c.language.toLowerCase() === lang.toLowerCase()
                      );
                      onStartSession(topicCards, `${lang} Deck`);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 hover:bg-blue-50 dark:hover:bg-blue-950/40 hover:text-blue-600 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-all group"
                  >
                    <Code className="w-3.5 h-3.5 text-blue-500" />
                    <span>{lang} Deck</span>
                    <Play className="w-3 h-3 text-slate-400 group-hover:text-blue-500 ml-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Cards List */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Flashcards ({filteredCards.length})
            </p>
            {filteredCards.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No cards found matching &quot;{query}&quot;
              </p>
            ) : (
              <div className="space-y-1.5">
                {filteredCards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => {
                      onSelectCard(card);
                      onClose();
                    }}
                    className="p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent hover:border-slate-200 dark:hover:border-slate-700/80 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                          {card.language}
                        </span>
                        <span className="text-[10px] text-slate-400">{card.category}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                        {card.question}
                      </p>
                    </div>

                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Search questions, answers, languages or tags</span>
          <span>Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
