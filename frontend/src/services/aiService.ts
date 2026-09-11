import { AIMessage, Card } from '../types';

export const aiService = {
  async getAIResponse(prompt: string, currentCard?: Card | null): Promise<string> {
    // Simulated natural typing delay
    await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));

    const lower = prompt.toLowerCase();

    // If active card context is available, formulate smart contextual explanations
    if (currentCard) {
      if (lower.includes('explain differently') || lower.includes('eli5') || lower.includes('simple')) {
        return `💡 **Simplified Breakdown for "${currentCard.question}":**\n\nThink of this concept like a real-world scenario:\nInstead of getting bogged down in syntax, remember the core purpose: **${currentCard.answer}**.\n\n` +
          `🔍 **Line-by-Line Intuition:**\n` +
          `When you write this in **${currentCard.language}**, the compiler/interpreter prepares the execution state. Here, the critical part is avoiding unintended state mutations or excessive allocations.\n\n` +
          `🧠 **Memory Mnemonic:** *"${currentCard.tags.join(' ➔ ') || 'Pattern ➔ Solution'}"*`;
      }

      if (lower.includes('pitfall') || lower.includes('gotcha') || lower.includes('edge case') || lower.includes('mistake')) {
        return `⚠️ **Common Pitfalls for this Pattern (${currentCard.language}):**\n\n` +
          `1. **Type & Reference Caveats:** In ${currentCard.language}, default references or mutability can lead to silent side-effects if you modify the instance in-place.\n` +
          `2. **Off-by-One / Boundary Limits:** Always verify what happens with null, undefined, empty collections, or zero-length inputs.\n` +
          `3. **Performance Cost:** Keep algorithmic complexity in mind — this operation is efficient, but looping inside nested structures can turn O(1) lookups into O(N).`;
      }

      if (lower.includes('example') || lower.includes('real-world') || lower.includes('use case')) {
        return `🚀 **Production Real-World Use Case:**\n\n` +
          `In real production applications built with **${currentCard.language}**, this pattern is frequently used in:\n` +
          `- High-throughput REST or gRPC APIs when parsing or serializing payload records.\n` +
          `- Concurrency pipelines where race conditions must be eliminated.\n` +
          `- Clean architecture patterns ensuring separation between domain logic and raw data models.\n\n` +
          `💡 **Takeaway:** Mastering this prevents brittle refactoring down the line!`;
      }
    }

    // General programming responses
    if (lower.includes('spaced repetition') || lower.includes('srs') || lower.includes('leitner')) {
      return `🧠 **Spaced Repetition (SRS) Explained:**\n\nSpaced repetition is based on the Ebbinghaus forgetting curve. When you answer a card correctly, the review interval expands ([1 ➔ 3 ➔ 7 ➔ 14 ➔ 30 days]). When you miss a card, it immediately resets to Day 1 and increases priority so you reinforce the weak spot before it fades!`;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('who are you')) {
      return `👋 Hi there! I'm your **CodeCards AI Tutor**. I'm here to clarify tricky syntax, provide alternative analogies, point out subtle edge cases, or test your comprehension. Ask me anything about your current card or programming concepts!`;
    }

    // Default intelligent guidance
    return `✨ **Tutor Insight:**\n\nRegarding *"${prompt}"*:\nIn modern software engineering, clean code prioritizes readability and deterministic behavior over clever one-liners.\n\n` +
      (currentCard
        ? `For this **${currentCard.language}** card on **${currentCard.category}**, notice how the core answer (*${currentCard.answer}*) directly solves the problem statement. Would you like me to explain it with an analogy or test you on an edge case?`
        : `Feel free to click **"Explain this card"** during any study session to get instant context-aware breakdowns!`);
  },

  getInitialMessages(): AIMessage[] {
    return [
      {
        id: 'msg-welcome',
        sender: 'ai',
        text: '👋 Hello! I am your interactive AI study tutor. Studying a tricky code snippet? Click **"Explain Card"** or ask me any question below!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  },
};
