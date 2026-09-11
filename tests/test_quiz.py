"""
Tests for app/quiz.py — Quiz Engine (PRD §5.4 & Prompt 5).

Covers:
- Full session lifecycle using isolated tmp_path fixtures:
  score updates correctly, has_next() becomes False after the last card,
  end_session() computes correct duration and accuracy, progress.json
  actually gets a new session record, and cards.json persists updated card state.
- Graceful empty deck handling (has_next() is immediately False, no crash).
- Clear exception when submit_answer() or current_card() is called after session is finished.
- deck_filter correctly restricts cards by category, language, and tag.
- Hardest cards calculation and prioritization in session results.
- Zero Rich imports and zero print()/input() calls in app/quiz.py (module purity).
"""

from __future__ import annotations

import ast
import time
from datetime import datetime, timezone

import pytest

from app.cards import Card, add_card, load_cards, save_cards
from app.progress import load_progress
from app.quiz import (
    QuizSession,
    SessionEmptyError,
    SessionResultDict,
    SessionState,
    end_session,
    process_answer,
    start_session,
)


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def _seed_card(
    cards_path: str,
    question: str = "What is X?",
    answer: str = "X is Y.",
    language: str = "python",
    category: str = "general",
    tags: list[str] | None = None,
    difficulty: float = 1.0,
) -> Card:
    """Add and persist a single card to cards_path."""
    return add_card(
        question=question,
        answer=answer,
        language=language,
        category=category,
        tags=tags or [],
        path=cards_path,
    )


# ---------------------------------------------------------------------------
# Full Session Lifecycle
# ---------------------------------------------------------------------------

class TestQuizSessionLifecycle:
    def test_full_session_lifecycle(self, tmp_path):
        c_path = str(tmp_path / "flashcards.json")
        p_path = str(tmp_path / "progress.json")

        card1 = _seed_card(c_path, question="Q1?", answer="A1.", difficulty=1.0)
        card2 = _seed_card(c_path, question="Q2?", answer="A2.", difficulty=1.0)
        card3 = _seed_card(c_path, question="Q3?", answer="A3.", difficulty=1.0)

        session = QuizSession(cards_path=c_path, progress_path=p_path, session_size=3)

        assert session.has_next() is True
        assert session.total_cards == 3
        assert session.score == 0
        assert session.correct_count == 0
        assert session.wrong_count == 0

        # Answer card 1: Correct
        active_card = session.current_card()
        assert active_card.id == card1.id
        session.submit_answer(correct=True)

        assert session.score == 1
        assert session.correct_count == 1
        assert session.wrong_count == 0
        assert session.has_next() is True

        # Answer card 2: Wrong
        active_card = session.current_card()
        assert active_card.id == card2.id
        session.submit_answer(correct=False)

        assert session.score == 1
        assert session.correct_count == 1
        assert session.wrong_count == 1
        assert session.has_next() is True

        # Answer card 3: Correct
        active_card = session.current_card()
        assert active_card.id == card3.id
        session.submit_answer(correct=True)

        assert session.score == 2
        assert session.correct_count == 2
        assert session.wrong_count == 1

        # Session should now be exhausted
        assert session.has_next() is False

        # End session and verify metrics
        results = session.end_session()
        assert isinstance(results, dict)
        assert isinstance(results, SessionResultDict)
        assert results["correct_count"] == 2
        assert results["wrong_count"] == 1
        assert results["cards_studied"] == 3
        assert abs(results["accuracy_pct"] - 66.67) < 0.1
        assert abs(results["accuracy"] - 0.6667) < 0.01
        assert results["duration_seconds"] >= 0.0

        # Attribute access compatibility
        assert results.correct == 2
        assert results.wrong == 1
        assert results.accuracy_pct == results["accuracy_pct"]

        # Hardest cards: card2 was wrong so it must be included
        assert len(results["hardest_cards"]) > 0
        assert results["hardest_cards"][0].id == card2.id

        # Verify persistence to progress.json
        p_data = load_progress(p_path)
        sessions = p_data["sessions"]
        assert len(sessions) == 1
        saved_session = sessions[0]
        assert saved_session["correct_count"] == 2
        assert saved_session["wrong_count"] == 1
        assert abs(saved_session["accuracy_pct"] - 66.67) < 0.1

        # Verify card_stats in progress.json
        card_stats = p_data["card_stats"]
        assert card1.id in card_stats
        assert card_stats[card1.id]["correct_count"] == 1
        assert card2.id in card_stats
        assert card_stats[card2.id]["wrong_count"] == 1

        # Verify persistence to flashcards.json
        disk_cards = {c.id: c for c in load_cards(c_path)}
        assert disk_cards[card1.id].correct_count == 1
        assert disk_cards[card2.id].wrong_count == 1
        assert disk_cards[card2.id].difficulty > 1.0  # increased due to wrong answer


# ---------------------------------------------------------------------------
# Empty Deck Handling
# ---------------------------------------------------------------------------

class TestEmptyDeckHandling:
    def test_empty_deck_does_not_crash(self, tmp_path):
        c_path = str(tmp_path / "empty_cards.json")
        p_path = str(tmp_path / "empty_progress.json")

        session = QuizSession(cards_path=c_path, progress_path=p_path)
        assert session.has_next() is False
        assert session.total_cards == 0
        assert session.score == 0

    def test_current_card_on_empty_deck_raises_clear_exception(self, tmp_path):
        c_path = str(tmp_path / "empty_cards.json")
        p_path = str(tmp_path / "empty_progress.json")

        session = QuizSession(cards_path=c_path, progress_path=p_path)
        with pytest.raises(SessionEmptyError) as exc_info:
            session.current_card()
        assert "No cards" in str(exc_info.value)

    def test_submit_answer_on_empty_deck_raises_clear_exception(self, tmp_path):
        c_path = str(tmp_path / "empty_cards.json")
        p_path = str(tmp_path / "empty_progress.json")

        session = QuizSession(cards_path=c_path, progress_path=p_path)
        with pytest.raises(SessionEmptyError) as exc_info:
            session.submit_answer(True)
        assert "Cannot submit answer" in str(exc_info.value)

    def test_end_session_on_empty_deck_returns_valid_zero_results(self, tmp_path):
        c_path = str(tmp_path / "empty_cards.json")
        p_path = str(tmp_path / "empty_progress.json")

        session = QuizSession(cards_path=c_path, progress_path=p_path)
        results = session.end_session()
        assert results["cards_studied"] == 0
        assert results["correct_count"] == 0
        assert results["wrong_count"] == 0
        assert results["accuracy_pct"] == 0.0


# ---------------------------------------------------------------------------
# Finished Session Exceptions
# ---------------------------------------------------------------------------

class TestFinishedSessionExceptions:
    def test_submit_answer_after_completion_raises_exception(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        _seed_card(c_path, question="Q1?")
        session = QuizSession(cards_path=c_path, progress_path=p_path, session_size=1)

        assert session.has_next() is True
        session.submit_answer(True)
        assert session.has_next() is False

        # Now that session is finished, submitting another answer must raise
        with pytest.raises(SessionEmptyError) as exc_info:
            session.submit_answer(True)
        assert "Cannot submit answer" in str(exc_info.value)

    def test_current_card_after_completion_raises_exception(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        _seed_card(c_path, question="Q1?")
        session = QuizSession(cards_path=c_path, progress_path=p_path, session_size=1)

        session.submit_answer(True)
        with pytest.raises(SessionEmptyError):
            session.current_card()


# ---------------------------------------------------------------------------
# Deck Filtering
# ---------------------------------------------------------------------------

class TestDeckFiltering:
    def test_deck_filter_by_category(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        _seed_card(c_path, question="PyQ?", language="python", category="oop")
        _seed_card(c_path, question="GoQ?", language="go", category="concurrency")

        session = QuizSession(
            deck_filter={"category": "oop"},
            cards_path=c_path,
            progress_path=p_path,
        )
        assert session.total_cards == 1
        assert session.current_card().category == "oop"

    def test_deck_filter_by_language(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        _seed_card(c_path, question="Q1?", language="python")
        _seed_card(c_path, question="Q2?", language="javascript")
        _seed_card(c_path, question="Q3?", language="python")

        session = QuizSession(
            deck_filter={"language": "python"},
            cards_path=c_path,
            progress_path=p_path,
        )
        assert session.total_cards == 2

    def test_deck_filter_by_tag(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        _seed_card(c_path, question="Q1?", tags=["basics", "easy"])
        _seed_card(c_path, question="Q2?", tags=["advanced"])

        session = QuizSession(
            deck_filter={"tag": "easy"},
            cards_path=c_path,
            progress_path=p_path,
        )
        assert session.total_cards == 1
        assert "easy" in session.current_card().tags

    def test_deck_filter_no_matches_returns_empty_session(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        _seed_card(c_path, question="Q1?", category="oop")

        session = QuizSession(
            deck_filter={"category": "nonexistent"},
            cards_path=c_path,
            progress_path=p_path,
        )
        assert session.has_next() is False
        assert session.total_cards == 0


# ---------------------------------------------------------------------------
# Reinsert Wrong Option
# ---------------------------------------------------------------------------

class TestReinsertWrongOption:
    def test_reinsert_wrong_true_repeats_card(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        card = _seed_card(c_path, question="Hard question?")
        session = QuizSession(
            cards_path=c_path,
            progress_path=p_path,
            session_size=1,
            reinsert_wrong=True,
        )

        # 1st attempt: wrong -> re-inserts at tail
        session.submit_answer(False)
        assert session.has_next() is True
        assert session.current_card().id == card.id

        # 2nd attempt: correct -> advances to completion
        session.submit_answer(True)
        assert session.has_next() is False
        assert session.correct_count == 1
        assert session.wrong_count == 1


# ---------------------------------------------------------------------------
# Legacy Compatibility & Callbacks
# ---------------------------------------------------------------------------

class TestLegacyCompatibility:
    def test_start_session_with_callbacks(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")

        _seed_card(c_path, question="Q1?")
        _seed_card(c_path, question="Q2?")

        shown_questions = []

        def mock_show_q(card, idx, total, score):
            shown_questions.append(card.id)

        result = start_session(
            cards_path=c_path,
            progress_path=p_path,
            session_size=2,
            show_question_fn=mock_show_q,
            prompt_reveal_fn=lambda: None,
            show_answer_fn=lambda card: None,
            prompt_correct_fn=lambda: True,
            show_results_fn=lambda res, weak: None,
        )
        assert len(shown_questions) == 2
        assert result.correct == 2

    def test_process_answer_legacy(self, tmp_path):
        c_path = str(tmp_path / "cards.json")
        p_path = str(tmp_path / "progress.json")
        card = _seed_card(c_path, question="Legacy Q?")

        state = SessionState(queue=[])
        process_answer(card, correct=True, state=state, cards_path=c_path, progress_path=p_path)
        assert state.correct == 1
        assert state.cards_studied == 1

        res = end_session(state, progress_path=p_path)
        assert res.correct == 1


# ---------------------------------------------------------------------------
# Module Purity Checks
# ---------------------------------------------------------------------------

class TestQuizPurity:
    def test_zero_print_calls(self):
        import app.quiz as quiz_module
        with open(quiz_module.__file__, "r", encoding="utf-8") as fh:
            source = fh.read()
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Name) and func.id in ("print", "input"):
                    pytest.fail(f"app/quiz.py contains a direct {func.id}() call.")

    def test_zero_rich_imports(self):
        import app.quiz as quiz_module
        with open(quiz_module.__file__, "r", encoding="utf-8") as fh:
            source = fh.read()
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                if isinstance(node, ast.ImportFrom) and node.module and "rich" in node.module.lower():
                    pytest.fail(f"app/quiz.py contains a Rich import: {node.module}")
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if "rich" in alias.name.lower():
                            pytest.fail(f"app/quiz.py contains a Rich import: {alias.name}")
