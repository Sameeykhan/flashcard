import { Card } from '../types';
import { initialCards } from './mockData';
import { firebaseSyncService } from './firebaseSyncService';

const STORAGE_KEY = 'codecards_library_v2';

export const cardService = {
  getCards(): Card[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCards));
      return initialCards;
    }
    try {
      const stored: Card[] = JSON.parse(raw);
      // Filter out invalid/empty or temporary "test" cards from previous trials
      const cleaned = stored.filter((c) => {
        const q = c.question?.trim().toLowerCase();
        return q && q !== 'test' && q !== 'testing' && c.answer?.trim();
      });

      // Auto-merge any new default cards that aren't yet present
      const existingIds = new Set(cleaned.map((c) => c.id));
      const missingDefaults = initialCards.filter((c) => !existingIds.has(c.id));
      if (missingDefaults.length > 0 || cleaned.length !== stored.length) {
        const merged = [...cleaned, ...missingDefaults];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
      return cleaned;
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialCards));
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
    // Background cloud sync to Firestore
    firebaseSyncService.saveCardToCloud(newCard).catch(() => {});
    return newCard;
  },

  updateCard(card: Card): void {
    const cards = this.getCards();
    const updated = cards.map((c) => (c.id === card.id ? card : c));
    this.saveCards(updated);
    // Background cloud sync to Firestore
    firebaseSyncService.saveCardToCloud(card).catch(() => {});
  },

  deleteCard(id: string): void {
    const cards = this.getCards();
    const updated = cards.filter((c) => c.id !== id);
    this.saveCards(updated);
    // Background cloud sync to Firestore
    firebaseSyncService.deleteCardFromCloud(id).catch(() => {});
  },

  /**
   * Reconcile local cards with Firebase Firestore
   */
  async syncWithCloud(): Promise<{ success: boolean; message: string; count: number }> {
    const localCards = this.getCards();
    const result = await firebaseSyncService.fetchCardsFromCloud();
    if (result.success && result.cards.length > 0) {
      // Merge remote cards into local
      const localMap = new Map(localCards.map((c) => [c.id, c]));
      result.cards.forEach((rc) => {
        localMap.set(rc.id, rc);
      });
      const merged = Array.from(localMap.values());
      this.saveCards(merged);
      return {
        success: true,
        message: `Synced ${result.cards.length} cards from Firebase Database`,
        count: merged.length,
      };
    } else if (result.success && result.cards.length === 0) {
      // Cloud collection is empty, push local cards to populate Firestore
      const uploadRes = await firebaseSyncService.uploadAllCardsToCloud(localCards);
      if (uploadRes.success) {
        return {
          success: true,
          message: `Uploaded ${uploadRes.count} cards to Firebase database!`,
          count: uploadRes.count,
        };
      }
      return {
        success: false,
        message: uploadRes.error || 'Failed to initialize Firebase database',
        count: localCards.length,
      };
    } else {
      return {
        success: false,
        message: result.error || 'Could not connect to Firebase',
        count: localCards.length,
      };
    }
  },

  /**
   * Push all local cards to Firebase Firestore
   */
  async pushAllToCloud(): Promise<{ success: boolean; message: string; count: number }> {
    const localCards = this.getCards();
    const uploadRes = await firebaseSyncService.uploadAllCardsToCloud(localCards);
    if (uploadRes.success) {
      return {
        success: true,
        message: `Uploaded ${uploadRes.count} cards to Firebase database!`,
        count: uploadRes.count,
      };
    }
    return {
      success: false,
      message: uploadRes.error || 'Failed to upload cards to Firebase',
      count: 0,
    };
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
