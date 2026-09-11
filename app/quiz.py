"""
Quiz Engine — app/quiz.py

Responsibility: Orchestrates a study session by interfacing with cards.py,
srs.py, and progress.py.
Follows PRD §5.4: UI drives the quiz engine via well-defined method calls,
never the reverse.

Hard constraints:
- Zero Rich imports, zero print()/input() calls anywhere in this module.
- Type hints and docstrings on every public class and method.
- Graceful empty deck handling (has_next() immediately False).
- Clear exception when submit_answer() is called on an ended/empty session.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Union

from app import cards as card_manager
from app import progress as progress_tracker
from app import srs
from app.cards import Card
from app.progress import SessionResult

DEFAULT_SESSION_SIZE: int = 20
DEFAULT_CARDS_PATH: str = "data/flashcards.json"
DEFAULT_PROGRESS_PATH: str = "data/progress.json"


# ---------------------------------------------------------------------------
# Exceptions & Result Dictionary
# ---------------------------------------------------------------------------

class SessionEmptyError(IndexError, RuntimeError):
    """Raised when attempting to access or answer cards in an empty or completed session."""
    pass


class SessionResultDict(dict):
    """Session results dictionary supporting both dict indexing and attribute access."""

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'SessionResultDict' object has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


# ---------------------------------------------------------------------------
# Legacy SessionState (for backward compatibility)
# ---------------------------------------------------------------------------

@dataclass
class SessionState:
    """Mutable state accumulated during an in-progress study session (legacy)."""

    queue: List[Card]
    correct: int = 0
    wrong: int = 0
    cards_studied: int = 0
    start_time: float = field(default_factory=time.time)
    wrong_cards: List[Card] = field(default_factory=list)


# ---------------------------------------------------------------------------
# QuizSession — PRD §5.4 Core Engine
# ---------------------------------------------------------------------------

class QuizSession:
    """Orchestrates an interactive study session driven by UI method calls.

    Manages card queue generation, SRS progression, score tracking,
    card persistence, and final session metric reporting.
    """

    def __init__(
        self,
        deck_filter: Optional[Dict[str, Any]] = None,
        session_size: Optional[int] = None,
        cards_path: str = DEFAULT_CARDS_PATH,
        progress_path: str = DEFAULT_PROGRESS_PATH,
        reinsert_wrong: bool = False,
    ) -> None:
        """Initialise a new QuizSession.

        Loads cards via cards.py, applies deck_filter if provided, builds
        the prioritized study queue via srs.get_session_queue(), and sets
        up counters and timestamps.

        Parameters
        ----------
        deck_filter:
            Optional dict with keys 'category', 'language', 'tag' to restrict cards.
        session_size:
            Maximum number of cards to include in this session (default 20).
        cards_path:
            Filesystem path to flashcards.json.
        progress_path:
            Filesystem path to progress.json.
        reinsert_wrong:
            If True, cards answered incorrectly are re-inserted at the queue
            tail for same-session reinforcement.
        """
        self.cards_path: str = cards_path
        self.progress_path: str = progress_path
        self.reinsert_wrong: bool = reinsert_wrong

        # 1. Filter and load cards
        filter_kwargs: Dict[str, Any] = {}
        if deck_filter:
            for key in ("category", "language", "tag"):
                val = deck_filter.get(key)
                if val:
                    filter_kwargs[key] = val

        if filter_kwargs:
            pool = card_manager.list_cards(**filter_kwargs, path=cards_path)
        else:
            pool = card_manager.load_cards(cards_path)

        # 2. Build SRS prioritized session queue (handles empty pool safely)
        if not pool:
            self.queue: List[Card] = []
        else:
            effective_size = (
                session_size if (session_size is not None and session_size > 0)
                else DEFAULT_SESSION_SIZE
            )
            self.queue = list(srs.get_session_queue(pool, session_size=effective_size))

        # 3. Session state initialization
        self.score: int = 0
        self.correct_count: int = 0
        self.wrong_count: int = 0
        self.index: int = 0
        self.start_time: datetime = datetime.now(timezone.utc)
        self._start_timestamp: float = time.time()
        self.answered_log: List[Dict[str, Any]] = []
        self.is_ended: bool = False
        self.total_cards: int = len(self.queue)
        self._result: Optional[SessionResultDict] = None

    def has_next(self) -> bool:
        """Return whether there are more cards remaining in this session."""
        return not self.is_ended and self.index < len(self.queue)

    def current_card(self) -> Card:
        """Return the current card without advancing the session.

        Returns
        -------
        Card
            The flashcard currently at the head of the session queue.

        Raises
        ------
        SessionEmptyError
            If has_next() is False (session is empty or already completed).
        """
        if not self.has_next():
            raise SessionEmptyError("No cards left in this study session.")
        return self.queue[self.index]

    def submit_answer(self, correct: bool) -> None:
        """Record an answer for the current card, apply SRS updates, and advance.

        Applies srs.update_on_correct or srs.update_on_wrong, persists the
        updated card to disk atomically, logs the attempt to progress.json,
        updates running scores, appends to answered_log, and moves to next card.

        Parameters
        ----------
        correct:
            True if user recalled the card correctly, False if missed.

        Raises
        ------
        SessionEmptyError
            If called when has_next() is already False.
        """
        if not self.has_next():
            raise SessionEmptyError("Cannot submit answer: session is finished or has no cards.")

        card = self.current_card()

        if correct:
            srs.update_on_correct(card)
            self.score += 1
            self.correct_count += 1
        else:
            srs.update_on_wrong(card)
            self.wrong_count += 1
            if self.reinsert_wrong:
                self.queue.append(card)

        # Persist updated card in cards_path atomically
        self._persist_card(card)

        # Audit per-card attempt in progress.json
        progress_tracker.record_card_attempt(card.id, correct=correct, path=self.progress_path)

        # Log attempt for session statistics and hardest cards compilation
        self.answered_log.append({
            "card": card,
            "card_id": card.id,
            "question": card.question,
            "correct": bool(correct),
            "difficulty": card.difficulty,
            "interval_level": getattr(card, "interval_level", 0),
            "next_due": card.next_due,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        # Advance to next card
        self.index += 1

    def end_session(self) -> SessionResultDict:
        """Finalise the session, compute performance metrics, and persist results.

        Computes duration, accuracy_pct, correct_count, wrong_count, builds
        the hardest cards list, records the session via progress.record_session(),
        and returns the full results dict.

        Returns
        -------
        SessionResultDict
            Detailed session summary containing metrics and hardest cards.
        """
        if self._result is not None:
            return self._result

        duration = max(0.0, round(time.time() - self._start_timestamp, 2))
        cards_studied = len(self.answered_log)
        total_answers = self.correct_count + self.wrong_count

        if total_answers > 0:
            accuracy_pct = round((self.correct_count / total_answers) * 100.0, 2)
            accuracy_ratio = round(self.correct_count / total_answers, 4)
        else:
            accuracy_pct = 0.0
            accuracy_ratio = 0.0

        # Build hardest cards list: cards missed first (sorted by difficulty desc),
        # followed by other cards sorted by difficulty desc.
        seen_ids = set()
        hardest_cards: List[Card] = []

        missed_cards = [entry["card"] for entry in self.answered_log if not entry["correct"]]
        missed_cards.sort(key=lambda c: c.difficulty, reverse=True)
        for c in missed_cards:
            if c.id not in seen_ids:
                seen_ids.add(c.id)
                hardest_cards.append(c)

        all_cards = [entry["card"] for entry in self.answered_log]
        all_cards.sort(key=lambda c: c.difficulty, reverse=True)
        for c in all_cards:
            if c.id not in seen_ids:
                seen_ids.add(c.id)
                hardest_cards.append(c)

        result_dict = SessionResultDict({
            "id": str(uuid.uuid4()),
            "date": datetime.now(timezone.utc).isoformat(),
            "cards_studied": cards_studied,
            "correct_count": self.correct_count,
            "correct": self.correct_count,
            "wrong_count": self.wrong_count,
            "wrong": self.wrong_count,
            "accuracy_pct": accuracy_pct,
            "accuracy": accuracy_ratio,
            "duration_seconds": duration,
            "hardest_cards": hardest_cards,
            "weak_cards": hardest_cards,
        })

        # Persist session to progress.json
        progress_tracker.record_session(result_dict, path=self.progress_path)

        self.is_ended = True
        self._result = result_dict
        return result_dict

    def _persist_card(self, card: Card) -> None:
        """Update and persist a single card in self.cards_path."""
        all_cards = card_manager.load_cards(self.cards_path)
        found = False
        for i, c in enumerate(all_cards):
            if c.id == card.id:
                all_cards[i] = card
                found = True
                break
        if not found:
            all_cards.append(card)
        card_manager.save_cards(all_cards, self.cards_path)


# ---------------------------------------------------------------------------
# Backward-Compatible Function APIs
# ---------------------------------------------------------------------------

def process_answer(
    card: Card,
    correct: bool,
    state: SessionState,
    cards_path: str = DEFAULT_CARDS_PATH,
    progress_path: str = DEFAULT_PROGRESS_PATH,
) -> None:
    """Handle one card answer (legacy functional helper)."""
    if correct:
        srs.update_on_correct(card)
        state.correct += 1
    else:
        srs.update_on_wrong(card)
        state.wrong += 1
        state.queue.append(card)
        if card not in state.wrong_cards:
            state.wrong_cards.append(card)

    state.cards_studied += 1

    # Persist card to cards_path
    all_cards = card_manager.load_cards(cards_path)
    found = False
    for i, c in enumerate(all_cards):
        if c.id == card.id:
            all_cards[i] = card
            found = True
            break
    if not found:
        all_cards.append(card)
    card_manager.save_cards(all_cards, cards_path)

    progress_tracker.record_card_attempt(card.id, correct=correct, path=progress_path)


def end_session(
    state: SessionState,
    progress_path: str = DEFAULT_PROGRESS_PATH,
) -> SessionResult:
    """Finalise a session for legacy SessionState objects."""
    duration = time.time() - state.start_time
    total = state.correct + state.wrong
    accuracy = (state.correct / total) if total > 0 else 0.0

    result = SessionResult(
        id=str(uuid.uuid4()),
        date=datetime.now(timezone.utc).isoformat(),
        cards_studied=state.cards_studied,
        correct=state.correct,
        wrong=state.wrong,
        accuracy=round(accuracy, 4),
        duration_seconds=round(duration, 2),
    )
    progress_tracker.record_session(result, path=progress_path)
    return result


def start_session(
    deck_filter: Optional[Dict[str, Any]] = None,
    session_size: int = DEFAULT_SESSION_SIZE,
    cards_path: str = DEFAULT_CARDS_PATH,
    progress_path: str = DEFAULT_PROGRESS_PATH,
    show_question_fn: Optional[Callable] = None,
    show_answer_fn: Optional[Callable] = None,
    prompt_reveal_fn: Optional[Callable] = None,
    prompt_correct_fn: Optional[Callable] = None,
    show_results_fn: Optional[Callable] = None,
) -> SessionResultDict:
    """Run a study session via provided callback hooks (legacy/test runner).

    Note: This module does NOT import Rich or UI functions directly.
    Callbacks must be injected by the caller.
    """
    session = QuizSession(
        deck_filter=deck_filter,
        session_size=session_size,
        cards_path=cards_path,
        progress_path=progress_path,
        reinsert_wrong=True,
    )

    if not session.has_next():
        raise ValueError("No cards found for the selected filter. Add some cards first!")

    while session.has_next():
        card = session.current_card()
        idx = session.index + 1
        total = session.total_cards
        score = session.score

        if show_question_fn:
            show_question_fn(card, idx, total, score)
        if prompt_reveal_fn:
            prompt_reveal_fn()
        if show_answer_fn:
            show_answer_fn(card)

        correct = prompt_correct_fn() if prompt_correct_fn else True
        session.submit_answer(correct)

    results = session.end_session()
    if show_results_fn:
        show_results_fn(results, results.get("hardest_cards", []))
    return results
