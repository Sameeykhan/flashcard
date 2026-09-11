import { motivationalQuotes } from './mockData';

class MotivationalService {
  private consecutiveWrong: number = 0;
  private lastQuoteId: number | null = null;

  recordAnswer(isCorrect: boolean): string | null {
    if (isCorrect) {
      this.consecutiveWrong = 0;
      return null;
    }

    this.consecutiveWrong += 1;

    // Trigger motivational encouragement when 2 or more wrong in a row
    if (this.consecutiveWrong >= 2) {
      return this.getRandomQuote();
    }

    return null;
  }

  getConsecutiveWrong(): number {
    return this.consecutiveWrong;
  }

  reset(): void {
    this.consecutiveWrong = 0;
  }

  private getRandomQuote(): string {
    const pool = motivationalQuotes.filter((q) => q.id !== this.lastQuoteId);
    const chosen = pool[Math.floor(Math.random() * pool.length)] || motivationalQuotes[0];
    this.lastQuoteId = chosen.id;
    return chosen.text;
  }
}

export const motivationalService = new MotivationalService();
