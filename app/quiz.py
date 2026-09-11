"""
Quiz Engine — app/quiz.py

Responsibility: Orchestrates a study session end-to-end. Builds the session
queue via srs.get_session_queue(), loops through cards, calls ui.py to
display questions/answers and collect input, updates card state via cards.py
and srs.py after every answer, tracks running score, and produces a final
SessionResult for progress.py.

NOT responsible for: rendering output (delegates to ui.py), SRS math
(delegates to srs.py), persistence (delegates to cards.py / progress.py),
importing Rich, or calling print()/input() directly.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Callable, List, Optional

from app import cards as card_manager
from app import progress as progress_tracker
from app import srs
from app.cards import Card
from app.progress import SessionResult

DEFAULT_SESSION_SIZE = 20


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

@dataclass
class SessionState:
    """Mutable state accumulated during an in-progress study session."""

    queue: List[Card]
    correct: int = 0
    wrong: int = 0
    cards_studied: int = 0
    start_time: float = field(default_factory=time.time)
    wrong_cards: List[Card] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def start_session(
    deck_filter: Optional[dict] = None,
    session_size: int = DEFAULT_SESSION_SIZE,
    cards_path: str = "data/flashcards.json",
    progress_path: str = "data/progress.json",
    # Injectable callables so tests can drive the session without Rich.
    show_question_fn: Optional[Callable] = None,
    show_answer_fn: Optional[Callable] = None,
    prompt_reveal_fn: Optional[Callable] = None,
    prompt_correct_fn: Optional[Callable] = None,
    show_results_fn: Optional[Callable] = None,
) -> SessionResult:
    """Run a complete study session and return the result.

    Flow:
    1. Load and optionally filter cards.
    2. Build session queue via srs.get_session_queue().
    3. Loop: show question → wait for reveal → collect correct/wrong →
       update SRS fields → re-insert wrong cards at queue tail.
    4. Persist updated cards and call end_session() to record results.

    Parameters
    ----------
    deck_filter:
        Optional dict with keys ``category``, ``language``, ``tag`` used
        to filter the card pool before building the queue.
    session_size:
        Maximum number of unique cards to study (default 20).
    cards_path:
        Path to ``flashcards.json``.
    progress_path:
        Path to ``progress.json``.
    show_question_fn / show_answer_fn / prompt_reveal_fn / prompt_correct_fn:
        Injectable display/input callables.  When None, the real ui
        functions are imported and used.  Injected in tests to avoid Rich.
    show_results_fn:
        Injectable results display callable.

    Returns
    -------
    SessionResult
        The completed session's summary (also persisted to progress.json).

    Raises
    ------
    ValueError
        If the filtered deck is empty (nothing to study).
    """
    # ---- lazy-import ui only when we actually need it ----
    if any(fn is None for fn in [show_question_fn, show_answer_fn,
                                  prompt_reveal_fn, prompt_correct_fn,
                                  show_results_fn]):
        from app import ui as _ui
        show_question_fn = show_question_fn or _ui.show_question
        show_answer_fn = show_answer_fn or _ui.show_answer
        prompt_reveal_fn = prompt_reveal_fn or _ui.prompt_answer_reveal
        prompt_correct_fn = prompt_correct_fn or _ui.prompt_correct_or_wrong
        show_results_fn = show_results_fn or (
            lambda result, weak: _ui.show_session_results(result, weak)
        )

    # 1. Load + filter cards
    filter_kwargs = {}
    if deck_filter:
        for key in ("category", "language", "tag"):
            if key in deck_filter and deck_filter[key]:
                filter_kwargs[key] = deck_filter[key]
    all_cards = card_manager.list_cards(**filter_kwargs, path=cards_path)

    if not all_cards:
        raise ValueError("No cards found for the selected filter. Add some cards first!")

    # 2. Build session queue
    queue = srs.get_session_queue(all_cards, session_size=session_size)
    state = SessionState(queue=list(queue))

    # Keep a dict of all cards for fast lookup when saving
    card_lookup: dict = {c.id: c for c in all_cards}

    # 3. Study loop — we pop from the front of state.queue
    total_in_queue = len(state.queue)
    shown_index = 0

    while state.queue:
        card = state.queue.pop(0)
        shown_index += 1

        show_question_fn(card, shown_index, total_in_queue, state.correct)
        prompt_reveal_fn()
        show_answer_fn(card)

        correct = prompt_correct_fn()
        process_answer(card, correct, state, cards_path=cards_path, progress_path=progress_path)

        # Update the lookup so save_cards gets the latest version
        card_lookup[card.id] = card

    # 4. Persist all updated cards
    updated_all = card_manager.load_cards(cards_path)
    for i, c in enumerate(updated_all):
        if c.id in card_lookup:
            updated_all[i] = card_lookup[c.id]
    card_manager.save_cards(updated_all, cards_path)

    # 5. Finalise
    result = end_session(state, progress_path=progress_path)
    show_results_fn(result, state.wrong_cards)
    return result


def end_session(
    state: SessionState,
    progress_path: str = "data/progress.json",
) -> SessionResult:
    """Finalise a session: compute stats, persist results, return summary.

    Parameters
    ----------
    state:
        The SessionState accumulated during the session.
    progress_path:
        Path to ``progress.json`` (for recording the session).

    Returns
    -------
    SessionResult
        Completed session summary (also persisted to progress.json).
    """
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


def process_answer(
    card: Card,
    correct: bool,
    state: SessionState,
    cards_path: str = "data/flashcards.json",
    progress_path: str = "data/progress.json",
) -> None:
    """Handle one card answer: update SRS state, score, and re-insert if wrong.

    - Calls srs.update_on_correct or srs.update_on_wrong (modifies card in place).
    - If wrong, appends card to the tail of state.queue for same-session
      re-insertion (immediate reinforcement).
    - Tracks wrong cards separately for the results screen.
    - Updates state.correct / state.wrong / state.cards_studied.
    - Calls progress.update_card_stats() to persist the per-card result.

    Parameters
    ----------
    card:
        The card that was just answered.
    correct:
        True if the user marked it correct, False if wrong.
    state:
        The live SessionState to mutate.
    cards_path:
        Path to ``flashcards.json`` (unused here, kept for symmetry).
    progress_path:
        Path to ``progress.json``.
    """
    if correct:
        srs.update_on_correct(card)
        state.correct += 1
    else:
        srs.update_on_wrong(card)
        state.wrong += 1
        state.queue.append(card)          # re-insert at tail for same-session retry
        if card not in state.wrong_cards:
            state.wrong_cards.append(card)

    state.cards_studied += 1
    progress_tracker.update_card_stats(card.id, correct=correct, path=progress_path)
