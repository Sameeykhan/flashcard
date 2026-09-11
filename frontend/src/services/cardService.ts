import { Card } from '../types';
import { initialCards } from './mockData';

const STORAGE_KEY = 'codecards_library_v1';

export const cardService = {
  getCards(): Card[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCards));
      return initialCards;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return initialCards;
    }
  },

  saveCards(cards: Card[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  },

  getCardById(id: string): Card | undefined {
    const cards = this.getCards();
    return cards.find((c) => c.id === id);
  },

  addCard(cardData: Omit<Card, 'id' | 'interval_level' | 'difficulty' | 'next_due' | 'last_reviewed' | 'wrong_count' | 'correct_count'>): Card {
    const cards = this.getCards();
    const newCard: Card = {
      ...cardData,
      id: `card-${Date.now()}`,
      interval_level: 0,
      difficulty: 1.0,
      next_due: new Date().toISOString(),
      last_reviewed: null,
      wrong_count: 0,
      correct_count: 0,
    };
    const updated = [newCard, ...cards];
    this.saveCards(updated);
    return newCard;
  },

  updateCard(card: Card): void {
    const cards = this.getCards();
    const updated = cards.map((c) => (c.id === card.id ? card : c));
    this.saveCards(updated);
  },

  deleteCard(id: string): void {
    const cards = this.getCards();
    const updated = cards.filter((c) => c.id !== id);
    this.saveCards(updated);
  },

  filterCards(
    cards: Card[],
    query: string = '',
    language: string = 'all',
    category: string = 'all',
    tag: string = 'all'
  ): Card[] {
    return cards.filter((card) => {
      if (language !== 'all' && card.language.toLowerCase() !== language.toLowerCase()) {
        return false;
      }
      if (category !== 'all' && card.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
      if (tag !== 'all' && !card.tags.includes(tag)) {
        return false;
      }
      if (query.trim()) {
        const q = query.toLowerCase();
        const matchesQuestion = card.question.toLowerCase().includes(q);
        const matchesAnswer = card.answer.toLowerCase().includes(q);
        const matchesCode = card.code_snippet?.toLowerCase().includes(q);
        const matchesExplanation = card.explanation?.toLowerCase().includes(q);
        const matchesTags = card.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchesQuestion && !matchesAnswer && !matchesCode && !matchesExplanation && !matchesTags) {
          return false;
        }
      }
      return true;
    });
  },

  getAvailableLanguages(): string[] {
    const cards = this.getCards();
    const set = new Set(cards.map((c) => c.language));
    return Array.from(set).sort();
  },

  getAvailableCategories(): string[] {
    const cards = this.getCards();
    const set = new Set(cards.map((c) => c.category));
    return Array.from(set).sort();
  },

  getAvailableTags(): string[] {
    const cards = this.getCards();
    const set = new Set(cards.flatMap((c) => c.tags));
    return Array.from(set).sort();
  },

  resetToDefault(): Card[] {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCards));
    return initialCards;
  },
};
