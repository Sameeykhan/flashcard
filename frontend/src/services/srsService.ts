import { Card } from '../types';

export const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30];

export const srsService = {
  updateOnCorrect(card: Card): Card {
    const now = new Date();
    const nextLevel = Math.min(card.interval_level + 1, SRS_INTERVALS_DAYS.length - 1);
    const intervalDays = SRS_INTERVALS_DAYS[nextLevel];
    const newDifficulty = Math.max(0.1, Math.round(card.difficulty * 0.7 * 100) / 100);

    const nextDueDate = new Date(now);
    nextDueDate.setDate(nextDueDate.getDate() + intervalDays);

    return {
      ...card,
      interval_level: nextLevel,
      difficulty: newDifficulty,
      next_due: nextDueDate.toISOString(),
      last_reviewed: now.toISOString(),
      correct_count: (card.correct_count || 0) + 1,
    };
  },

  updateOnWrong(card: Card): Card {
    const now = new Date();
    const newDifficulty = Math.min(10.0, Math.round(card.difficulty * 1.5 * 100) / 100);

    const nextDueDate = new Date(now);
    nextDueDate.setDate(nextDueDate.getDate() + 1); // Reset to 1 day

    return {
      ...card,
      interval_level: 0, // Reset back to lowest interval
      difficulty: newDifficulty,
      next_due: nextDueDate.toISOString(),
      last_reviewed: now.toISOString(),
      wrong_count: (card.wrong_count || 0) + 1,
    };
  },

  isDue(card: Card): boolean {
    if (!card.next_due) return true;
    const dueTime = new Date(card.next_due).getTime();
    return dueTime <= Date.now();
  },

  getSessionQueue(cards: Card[], sessionSize: number = 10): Card[] {
    const now = Date.now();

    // Partition into due and non-due
    const dueCards: Card[] = [];
    const futureCards: Card[] = [];

    for (const card of cards) {
      if (!card.next_due || new Date(card.next_due).getTime() <= now) {
        dueCards.push(card);
      } else {
        futureCards.push(card);
      }
    }

    // Sort due cards by priority: higher difficulty first, then oldest overdue first
    dueCards.sort((a, b) => {
      if (b.difficulty !== a.difficulty) {
        return b.difficulty - a.difficulty;
      }
      const aTime = a.next_due ? new Date(a.next_due).getTime() : 0;
      const bTime = b.next_due ? new Date(b.next_due).getTime() : 0;
      return aTime - bTime;
    });

    // If we don't have enough due cards to satisfy sessionSize, backfill with future cards sorted by soonest due
    futureCards.sort((a, b) => {
      const aTime = a.next_due ? new Date(a.next_due).getTime() : 0;
      const bTime = b.next_due ? new Date(b.next_due).getTime() : 0;
      return aTime - bTime;
    });

    const combined = [...dueCards, ...futureCards];
    return combined.slice(0, sessionSize);
  },
};
