"""
Tests for app/quiz.py — Quiz Engine.

Covers:
- process_answer: correct path (SRS update, score increment).
- process_answer: wrong path (SRS update, re-insertion into queue).
- process_answer: wrong card tracked in wrong_cards list.
- start_session: raises ValueError on empty deck.
- start_session: returns a SessionResult.
- start_session: correct/wrong counts reflected in result.
- end_session: accuracy, duration, persisted to progress.json.
- No Rich / no print() in quiz.py.
"""

from __future__ import annotations

import ast
import time
from datetime import date, timedelta

import pytest

from app.cards import Card
from app.quiz import SessionState, end_session, process_answer, start_session


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_card(card_id: str = "card-1", difficulty: float = 1.0) -> Card:
    return Card(
        id=card_id,
        question="What is X?",
        answer="X is Y.",
        language="python",
        category="test",
        tags=[],
        difficulty=difficulty,
        created_at="2026-09-11T00:00:00+00:00",
    )


def _noop(*args, **kwargs):
    """No-op stand-in for any UI function."""
    pass


def _correct_fn():
    return True


def _wrong_fn():
    return False


# ---------------------------------------------------------------------------
# process_answer
# ---------------------------------------------------------------------------

class TestProcessAnswer:
    def test_correct_increments_score(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=True, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert state.correct == 1
        assert state.wrong == 0

    def test_wrong_increments_wrong(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=False, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert state.wrong == 1
        assert state.correct == 0

    def test_wrong_reinserts_card_in_queue(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=False, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert card in state.queue

    def test_correct_does_not_reinsert(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=True, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert card not in state.queue

    def test_wrong_adds_to_wrong_cards(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=False, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert card in state.wrong_cards

    def test_correct_does_not_add_to_wrong_cards(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=True, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert card not in state.wrong_cards

    def test_cards_studied_incremented_for_correct(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=True, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert state.cards_studied == 1

    def test_cards_studied_incremented_for_wrong(self, tmp_path):
        card = _make_card()
        state = SessionState(queue=[])
        process_answer(card, correct=False, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert state.cards_studied == 1

    def test_correct_updates_srs_difficulty_down(self, tmp_path):
        card = _make_card(difficulty=1.0)
        state = SessionState(queue=[])
        process_answer(card, correct=True, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert card.difficulty < 1.0

    def test_wrong_updates_srs_difficulty_up(self, tmp_path):
        card = _make_card(difficulty=1.0)
        state = SessionState(queue=[])
        process_answer(card, correct=False, state=state,
                       progress_path=str(tmp_path / "p.json"))
        assert card.difficulty > 1.0


# ---------------------------------------------------------------------------
# end_session
# ---------------------------------------------------------------------------

class TestEndSession:
    def test_returns_session_result(self, tmp_path):
        state = SessionState(queue=[], correct=8, wrong=2, cards_studied=10,
                             start_time=time.time() - 60)
        result = end_session(state, progress_path=str(tmp_path / "p.json"))
        from app.progress import SessionResult
        assert isinstance(result, SessionResult)

    def test_accuracy_computed_correctly(self, tmp_path):
        state = SessionState(queue=[], correct=7, wrong=3, cards_studied=10,
                             start_time=time.time())
        result = end_session(state, progress_path=str(tmp_path / "p.json"))
        assert abs(result.accuracy - 0.7) < 0.01

    def test_all_wrong_accuracy_zero(self, tmp_path):
        state = SessionState(queue=[], correct=0, wrong=5, cards_studied=5,
                             start_time=time.time())
        result = end_session(state, progress_path=str(tmp_path / "p.json"))
        assert result.accuracy == 0.0

    def test_all_correct_accuracy_one(self, tmp_path):
        state = SessionState(queue=[], correct=5, wrong=0, cards_studied=5,
                             start_time=time.time())
        result = end_session(state, progress_path=str(tmp_path / "p.json"))
        assert result.accuracy == 1.0

    def test_duration_positive(self, tmp_path):
        state = SessionState(queue=[], correct=1, wrong=0, cards_studied=1,
                             start_time=time.time() - 5)
        result = end_session(state, progress_path=str(tmp_path / "p.json"))
        assert result.duration_seconds >= 0

    def test_result_persisted_to_progress(self, tmp_path):
        p_path = str(tmp_path / "p.json")
        state = SessionState(queue=[], correct=3, wrong=1, cards_studied=4,
                             start_time=time.time())
        end_session(state, progress_path=p_path)
        from app.progress import load_progress
        sessions, _ = load_progress(p_path)
        assert len(sessions) == 1
        assert sessions[0].correct == 3


# ---------------------------------------------------------------------------
# start_session
# ---------------------------------------------------------------------------

class TestStartSession:
    def _seed_cards(self, cards_path: str, n: int = 3) -> None:
        """Write n simple cards to cards_path."""
        from app.cards import add_card
        for i in range(n):
            add_card(f"Q{i}?", f"A{i}.", "python", "test", [], path=cards_path)

    def test_raises_on_empty_deck(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")
        with pytest.raises(ValueError, match="No cards"):
            start_session(
                cards_path=c_path, progress_path=p_path,
                show_question_fn=_noop, show_answer_fn=_noop,
                prompt_reveal_fn=_noop, prompt_correct_fn=_correct_fn,
                show_results_fn=_noop,
            )

    def test_returns_session_result(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")
        self._seed_cards(c_path, n=2)

        result = start_session(
            session_size=2,
            cards_path=c_path, progress_path=p_path,
            show_question_fn=_noop, show_answer_fn=_noop,
            prompt_reveal_fn=_noop, prompt_correct_fn=_correct_fn,
            show_results_fn=_noop,
        )
        from app.progress import SessionResult
        assert isinstance(result, SessionResult)

    def test_all_correct_session(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")
        self._seed_cards(c_path, n=3)

        result = start_session(
            session_size=3,
            cards_path=c_path, progress_path=p_path,
            show_question_fn=_noop, show_answer_fn=_noop,
            prompt_reveal_fn=_noop, prompt_correct_fn=_correct_fn,
            show_results_fn=_noop,
        )
        assert result.correct == 3
        assert result.wrong == 0
        assert result.accuracy == 1.0

    def test_wrong_answers_cause_reinsertion_and_appear_in_result(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")
        self._seed_cards(c_path, n=2)

        # First call: wrong. Second call: correct. (alternating)
        answers = iter([False, False, True, True])
        result = start_session(
            session_size=2,
            cards_path=c_path, progress_path=p_path,
            show_question_fn=_noop, show_answer_fn=_noop,
            prompt_reveal_fn=_noop,
            prompt_correct_fn=lambda: next(answers),
            show_results_fn=_noop,
        )
        assert result.wrong >= 2

    def test_deck_filter_by_category(self, tmp_path):
        from app.cards import add_card
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")
        add_card("Q1?", "A1.", "python", "alpha", [], path=c_path)
        add_card("Q2?", "A2.", "python", "beta",  [], path=c_path)

        result = start_session(
            deck_filter={"category": "alpha"},
            session_size=5,
            cards_path=c_path, progress_path=p_path,
            show_question_fn=_noop, show_answer_fn=_noop,
            prompt_reveal_fn=_noop, prompt_correct_fn=_correct_fn,
            show_results_fn=_noop,
        )
        # Only 1 card in "alpha" category
        assert result.cards_studied == 1

    def test_session_persisted_to_progress(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")
        self._seed_cards(c_path, n=2)

        start_session(
            session_size=2,
            cards_path=c_path, progress_path=p_path,
            show_question_fn=_noop, show_answer_fn=_noop,
            prompt_reveal_fn=_noop, prompt_correct_fn=_correct_fn,
            show_results_fn=_noop,
        )
        from app.progress import load_progress
        sessions, _ = load_progress(p_path)
        assert len(sessions) == 1


# ---------------------------------------------------------------------------
# Module purity checks
# ---------------------------------------------------------------------------

class TestQuizPurity:
    def test_no_direct_print_calls(self):
        import app.quiz as quiz_module
        with open(quiz_module.__file__, "r", encoding="utf-8") as fh:
            source = fh.read()
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Name) and func.id == "print":
                    pytest.fail("quiz.py contains a bare print() call.")

    def test_no_top_level_rich_import(self):
        import app.quiz as quiz_module
        with open(quiz_module.__file__, "r", encoding="utf-8") as fh:
            source = fh.read()
        # Rich may only be imported inside a function body (lazy), not at top level
        tree = ast.parse(source)
        for node in tree.body:   # only top-level statements
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                if isinstance(node, ast.ImportFrom) and node.module and "rich" in node.module:
                    pytest.fail("quiz.py has a top-level Rich import.")
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if "rich" in alias.name:
                            pytest.fail("quiz.py has a top-level Rich import.")
