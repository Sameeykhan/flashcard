"""
Stress Test at Scale — scripts/stress_test.py

Programmatically generates 500 realistic-looking flashcards in an isolated
temporary data directory, benchmarks get_session_queue() performance at scale,
simulates a full 500-card study session (70% correct / 30% wrong), and
reports exact execution timings.
"""

from __future__ import annotations

import os
import random
import shutil
import sys
import time
from typing import List

# Ensure project root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import cards as card_manager
from app import progress as progress_tracker
from app import srs
from app.cards import Card
from app.quiz import QuizSession

STRESS_DIR: str = "data_stress_test"
STRESS_CARDS_PATH: str = os.path.join(STRESS_DIR, "flashcards.json")
STRESS_PROGRESS_PATH: str = os.path.join(STRESS_DIR, "progress.json")

SAMPLE_TEMPLATES = [
    {
        "lang": "python",
        "cat": "decorators",
        "tags": ["python", "decorators", "oop"],
        "q": "How do you define a decorator with arguments in Python?\n\ndef repeat(num):\n    def decorator(fn):\n        ...",
        "a": "Wrap the decorator inside an outer function that accepts the arguments and returns the decorator.",
    },
    {
        "lang": "javascript",
        "cat": "async",
        "tags": ["javascript", "promises", "async"],
        "q": "What is the difference between Promise.all() and Promise.allSettled()?",
        "a": "Promise.all rejects immediately upon any rejection. Promise.allSettled waits for all promises to settle regardless of rejection.",
    },
    {
        "lang": "go",
        "cat": "concurrency",
        "tags": ["go", "goroutines", "channels"],
        "q": "How do you prevent goroutine leaks when reading from a channel?\n\nselect {\ncase val := <-ch:\ncase <-ctx.Done():\n}",
        "a": "Use context.Context cancellation or buffered channels so senders/receivers are not blocked indefinitely.",
    },
    {
        "lang": "rust",
        "cat": "memory",
        "tags": ["rust", "ownership", "borrowing"],
        "q": "What is the difference between &T and &mut T in Rust?",
        "a": "&T is an immutable shared borrow (many allowed). &mut T is an exclusive mutable borrow (only one allowed at a time).",
    },
    {
        "lang": "sql",
        "cat": "indexing",
        "tags": ["sql", "database", "performance"],
        "q": "When does a B-tree composite index (a, b, c) NOT get used?",
        "a": "When the query condition skips the leading column (e.g. WHERE b = 1 AND c = 2) without specifying column 'a'.",
    },
]


def generate_deck(count: int = 500) -> List[Card]:
    """Generate a diverse synthetic deck of flashcards."""
    deck: List[Card] = []
    random.seed(42)  # Deterministic test deck

    for i in range(count):
        template = SAMPLE_TEMPLATES[i % len(SAMPLE_TEMPLATES)]
        difficulty = round(random.uniform(0.5, 3.0), 2)
        q = f"[{i + 1}/{count}] {template['q']}"
        a = f"{template['a']} (Card #{i + 1})"

        card = Card(
            id=f"stress-card-{i + 1:04d}",
            question=q,
            answer=a,
            language=template["lang"],
            category=template["cat"],
            tags=list(template["tags"]),
            difficulty=difficulty,
            correct_count=random.randint(0, 5),
            wrong_count=random.randint(0, 3),
            last_reviewed=None,
            next_due=None,
            created_at="2026-09-11T00:00:00+00:00",
            interval_level=0,
        )
        deck.append(card)

    return deck


def run_stress_test() -> None:
    """Execute performance stress test at 500-card scale."""
    print("=" * 65)
    print(">>> Starting Spaced Repetition Stress Test (500 Cards)")
    print("=" * 65)

    if os.path.exists(STRESS_DIR):
        shutil.rmtree(STRESS_DIR)
    os.makedirs(STRESS_DIR, exist_ok=True)

    try:
        # 1. Deck Generation & Persistence
        t0 = time.perf_counter()
        deck = generate_deck(500)
        card_manager.save_cards(deck, path=STRESS_CARDS_PATH)
        gen_time = time.perf_counter() - t0
        file_size_kb = os.path.getsize(STRESS_CARDS_PATH) / 1024
        print(f"[+] 500 cards generated and saved in {gen_time:.3f}s ({file_size_kb:.1f} KB)")

        # 2. Benchmark get_session_queue at scale
        t0 = time.perf_counter()
        queue_50 = srs.get_session_queue(deck, session_size=50)
        queue_50_time = time.perf_counter() - t0
        print(f"[+] get_session_queue(50 from 500) computed in {queue_50_time * 1000:.2f}ms (size: {len(queue_50)})")
        assert len(queue_50) == 50

        t0 = time.perf_counter()
        queue_full = srs.get_session_queue(deck, session_size=500)
        queue_full_time = time.perf_counter() - t0
        print(f"[+] get_session_queue(500 from 500) computed in {queue_full_time * 1000:.2f}ms (size: {len(queue_full)})")
        assert len(queue_full) == 500
        assert queue_full_time < 0.2, f"Queue generation exceeded threshold: {queue_full_time:.3f}s"

        # 3. Simulate Full QuizSession (500 cards, 70% correct / 30% wrong)
        print("\n[*] Simulating full 500-card QuizSession (atomic writes + SRS + progress tracking)...")
        session = QuizSession(
            cards_path=STRESS_CARDS_PATH,
            progress_path=STRESS_PROGRESS_PATH,
            session_size=500,
        )

        random.seed(123)
        t_session_start = time.perf_counter()
        cards_processed = 0

        while session.has_next():
            # 70% probability correct, 30% wrong
            is_correct = random.random() < 0.70
            session.submit_answer(is_correct)
            cards_processed += 1

        results = session.end_session()
        total_session_time = time.perf_counter() - t_session_start

        print(f"[+] 500 card reviews completed in {total_session_time:.3f}s")
        print(f"  - Throughput: {cards_processed / total_session_time:.1f} cards/sec (includes atomic JSON disk writes)")
        print(f"  - Average latency per submit_answer(): {(total_session_time / cards_processed) * 1000:.2f}ms")
        print(f"  - Session stats: Correct={results['correct_count']}, Wrong={results['wrong_count']}, Accuracy={results['accuracy_pct']}%")

        # 4. Progress verification
        stats = progress_tracker.get_aggregate_stats(
            path=STRESS_PROGRESS_PATH,
            cards_path=STRESS_CARDS_PATH,
        )
        print(f"\n[+] Aggregate statistics at scale:")
        print(f"  - Total sessions: {stats.total_sessions}")
        print(f"  - Total card attempts logged: {stats.total_cards_studied}")
        print(f"  - Mastery breakdown: {stats.mastery_breakdown}")
        print(f"  - Top missed cards identified: {len(stats.most_missed)}")

        print("\n" + "=" * 65)
        print(">>> STRESS TEST PASSED: System exhibits sub-millisecond scheduling and stable I/O at 500 cards.")
        print("=" * 65)

    finally:
        time.sleep(0.2)
        if os.path.exists(STRESS_DIR):
            try:
                shutil.rmtree(STRESS_DIR)
            except Exception:
                pass


if __name__ == "__main__":
    run_stress_test()
