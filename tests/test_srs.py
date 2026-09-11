"""
Tests for app/srs.py — Spaced Repetition Engine.

Covers PRD §5.3 requirements:
- update_on_wrong:
  - Increases difficulty (* 1.5, capped at 10.0).
  - Sets next_due to ~1 day out (ISO-8601 UTC string).
  - Sets last_reviewed to now (ISO-8601 UTC string).
  - Increments wrong_count.
  - Resets interval level back to the shortest interval (1 day, level 0) - regression prevention.
- update_on_correct:
  - Decreases difficulty (* 0.7, floored at 0.1).
  - Advances next_due further out along the fixed ladder:
    1 day -> 3 days -> 7 days -> 14 days -> 30 days (staying at 30 days).
  - Sets next_due to now + interval.
  - Sets last_reviewed to now.
  - Increments correct_count.
- get_session_queue:
  - Due cards returned before non-due cards.
  - Due cards prioritized by higher difficulty first (descending).
  - Remainder filled with never-reviewed cards, then soonest-due future cards.
  - Respects session_size and handles smaller/empty decks safely.
  - Default session_size is 20 when None.
- Datetime consistency:
  - Timezone-aware UTC datetimes and ISO-8601 parsing/formatting helpers.
- Architectural purity:
  - Zero dependencies on Rich, zero calls to print() or input().
"""

from __future__ import annotations

import ast
from datetime import date, datetime, timedelta, timezone

import pytest

from app.cards import Card
from app.srs import (
    DEFAULT_SESSION_SIZE,
    DIFFICULTY_DECREASE_FACTOR,
    DIFFICULTY_INCREASE_FACTOR,
    DIFFICULTY_MAX,
    DIFFICULTY_MIN,
    INTERVAL_LEVELS,
    compute_next_due,
    format_iso_datetime,
    get_interval_level,
    get_session_queue,
    is_due,
    is_scheduled_due,
    now_iso,
    now_utc,
    parse_iso_datetime,
    today_utc,
    update_on_correct,
    update_on_wrong,
)


# ---------------------------------------------------------------------------
# Test Helpers
# ---------------------------------------------------------------------------

def _make_card(
    card_id: str = "test-card",
    difficulty: float = 1.0,
    correct_count: int = 0,
    wrong_count: int = 0,
    next_due: str | None = None,
    last_reviewed: str | None = None,
    interval_level: int = 0,
) -> Card:
    return Card(
        id=card_id,
        question="What is a closure?",
        answer="A function that retains access to its lexical scope.",
        language="python",
        category="functions",
        tags=["core", "scope"],
        difficulty=difficulty,
        correct_count=correct_count,
        wrong_count=wrong_count,
        last_reviewed=last_reviewed,
        next_due=next_due,
        created_at="2026-09-11T00:00:00+00:00",
        interval_level=interval_level,
    )


def _days_from_now(days: int | float) -> str:
    dt = now_utc() + timedelta(days=days)
    return format_iso_datetime(dt)


# ---------------------------------------------------------------------------
# update_on_wrong
# ---------------------------------------------------------------------------

class TestUpdateOnWrong:
    def test_increments_wrong_count(self):
        card = _make_card(wrong_count=2)
        update_on_wrong(card)
        assert card.wrong_count == 3

    def test_increases_difficulty_by_one_point_five(self):
        card = _make_card(difficulty=2.0)
        update_on_wrong(card)
        assert card.difficulty == pytest.approx(3.0)

    def test_sets_next_due_to_approx_one_day_out(self):
        ref_time = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)
        card = _make_card()
        update_on_wrong(card, now=ref_time)

        expected_due = ref_time + timedelta(days=1)
        actual_due = parse_iso_datetime(card.next_due)
        assert actual_due == expected_due
        # Ensure it's stored as a valid ISO-8601 string
        assert isinstance(card.next_due, str)
        assert "2026-09-12" in card.next_due

    def test_sets_last_reviewed_to_now(self):
        ref_time = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)
        card = _make_card()
        update_on_wrong(card, now=ref_time)
        assert card.last_reviewed == format_iso_datetime(ref_time)

    def test_resets_interval_level_back_to_one_day_regression_prevention(self):
        # Card was previously well-studied (level 3 = 14 days or level 4 = 30 days)
        ref_time = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)
        card = _make_card(
            interval_level=4,
            last_reviewed=format_iso_datetime(ref_time - timedelta(days=30)),
            next_due=format_iso_datetime(ref_time),
            correct_count=10,
        )
        update_on_wrong(card, now=ref_time)

        # Must reset back to level 0 (1-day interval)
        assert card.interval_level == 0
        expected_due = ref_time + timedelta(days=1)
        assert parse_iso_datetime(card.next_due) == expected_due

    def test_difficulty_capped_at_max_after_repeated_wrong_answers(self):
        card = _make_card(difficulty=1.0)
        # Apply 20 consecutive wrong answers
        for _ in range(20):
            update_on_wrong(card)
        assert card.difficulty == DIFFICULTY_MAX
        assert card.difficulty <= 10.0

    def test_returns_same_card_object(self):
        card = _make_card()
        returned = update_on_wrong(card)
        assert returned is card


# ---------------------------------------------------------------------------
# update_on_correct
# ---------------------------------------------------------------------------

class TestUpdateOnCorrect:
    def test_increments_correct_count(self):
        card = _make_card(correct_count=1)
        update_on_correct(card)
        assert card.correct_count == 2

    def test_decreases_difficulty_by_zero_point_seven(self):
        card = _make_card(difficulty=2.0)
        update_on_correct(card)
        assert card.difficulty == pytest.approx(1.4)

    def test_sets_last_reviewed_to_now(self):
        ref_time = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
        card = _make_card()
        update_on_correct(card, now=ref_time)
        assert card.last_reviewed == format_iso_datetime(ref_time)

    def test_advances_interval_ladder_consecutive_correct(self):
        """Test at least two consecutive correct answers advance: 1 day -> 3 days -> 7 days."""
        ref_time = datetime(2026, 9, 11, 8, 0, 0, tzinfo=timezone.utc)
        card = _make_card()  # new card

        # Answer 1: Enters ladder at level 0 (1 day)
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 0
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=1)

        # Answer 2 (first consecutive advancement): 1 day -> 3 days (level 1)
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 1
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=3)

        # Answer 3 (second consecutive advancement): 3 days -> 7 days (level 2)
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 2
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=7)

    def test_interval_ladder_advances_through_all_levels_and_caps_at_30(self):
        ref_time = datetime(2026, 9, 11, 8, 0, 0, tzinfo=timezone.utc)
        card = _make_card()

        # Step 0: 1 day
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 0
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=1)

        # Step 1: 3 days
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 1
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=3)

        # Step 2: 7 days
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 2
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=7)

        # Step 3: 14 days
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 3
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=14)

        # Step 4: 30 days
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 4
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=30)

        # Subsequent answers stay at 30 days (capped)
        update_on_correct(card, now=ref_time)
        assert card.interval_level == 4
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=30)

    def test_difficulty_floored_at_min_after_repeated_correct_answers(self):
        card = _make_card(difficulty=1.0)
        # Apply 20 consecutive correct answers
        for _ in range(20):
            update_on_correct(card)
        assert card.difficulty == DIFFICULTY_MIN
        assert card.difficulty >= 0.1

    def test_returns_same_card_object(self):
        card = _make_card()
        returned = update_on_correct(card)
        assert returned is card


# ---------------------------------------------------------------------------
# Ladder Regression & Recovery
# ---------------------------------------------------------------------------

class TestLadderRegression:
    def test_card_on_long_interval_resets_on_wrong_and_recovers_stepwise(self):
        ref_time = datetime(2026, 9, 11, 8, 0, 0, tzinfo=timezone.utc)
        card = _make_card(
            interval_level=4,
            last_reviewed=format_iso_datetime(ref_time - timedelta(days=30)),
            next_due=format_iso_datetime(ref_time),
            difficulty=0.2,
        )

        # Answered wrong: resets to level 0 (1 day)
        update_on_wrong(card, now=ref_time)
        assert card.interval_level == 0
        assert parse_iso_datetime(card.next_due) == ref_time + timedelta(days=1)
        assert card.difficulty == pytest.approx(0.3)

        # Next answer correct: advances from 1 day to 3 days (level 1), NOT jumping back to 30!
        update_on_correct(card, now=ref_time + timedelta(days=1))
        assert card.interval_level == 1
        assert parse_iso_datetime(card.next_due) == (ref_time + timedelta(days=1)) + timedelta(days=3)

        # Next answer correct: advances from 3 days to 7 days (level 2)
        update_on_correct(card, now=ref_time + timedelta(days=4))
        assert card.interval_level == 2
        assert parse_iso_datetime(card.next_due) == (ref_time + timedelta(days=4)) + timedelta(days=7)


# ---------------------------------------------------------------------------
# compute_next_due
# ---------------------------------------------------------------------------

class TestComputeNextDue:
    def test_wrong_computes_level_0_one_day(self):
        ref_time = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)
        card = _make_card(interval_level=3)
        res = compute_next_due(card, correct=False, now=ref_time)
        expected = format_iso_datetime(ref_time + timedelta(days=1))
        assert res == expected

    def test_correct_advances_from_current_level(self):
        ref_time = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)
        card = _make_card(
            interval_level=1,
            last_reviewed=format_iso_datetime(ref_time - timedelta(days=3)),
            next_due=format_iso_datetime(ref_time),
        )
        res = compute_next_due(card, correct=True, now=ref_time)
        expected = format_iso_datetime(ref_time + timedelta(days=INTERVAL_LEVELS[2]))  # 7 days
        assert res == expected

    def test_correct_caps_at_max_interval(self):
        ref_time = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)
        card = _make_card(
            interval_level=4,
            last_reviewed=format_iso_datetime(ref_time - timedelta(days=30)),
            next_due=format_iso_datetime(ref_time),
        )
        res = compute_next_due(card, correct=True, now=ref_time)
        expected = format_iso_datetime(ref_time + timedelta(days=INTERVAL_LEVELS[4]))  # 30 days
        assert res == expected


# ---------------------------------------------------------------------------
# is_due
# ---------------------------------------------------------------------------

class TestIsDue:
    def test_overdue_card_is_due(self):
        card = _make_card(next_due=_days_from_now(-2))
        assert is_due(card) is True
        assert is_scheduled_due(card) is True

    def test_due_now_is_due(self):
        card = _make_card(next_due=_days_from_now(0))
        assert is_due(card) is True
        assert is_scheduled_due(card) is True

    def test_future_card_is_not_due(self):
        card = _make_card(next_due=_days_from_now(3))
        assert is_due(card) is False
        assert is_scheduled_due(card) is False

    def test_never_reviewed_card_is_due_by_default_prd_5_3(self):
        # Per PRD §5.3: A card is "due" if next_due is None (never reviewed) or next_due <= now
        card = _make_card(next_due=None)
        assert is_due(card, include_new=True) is True
        assert is_due(card) is True
        # Explicit scheduled-only check returns False
        assert is_scheduled_due(card) is False


# ---------------------------------------------------------------------------
# get_session_queue
# ---------------------------------------------------------------------------

class TestGetSessionQueue:
    def test_returns_due_cards_before_non_due_cards(self):
        card_due = _make_card("due-1", difficulty=1.0, next_due=_days_from_now(-1))
        card_future = _make_card("future-1", difficulty=5.0, next_due=_days_from_now(5))
        card_new = _make_card("new-1", difficulty=2.0, next_due=None)

        deck = [card_future, card_due, card_new]
        queue = get_session_queue(deck, session_size=3)

        ids = [c.id for c in queue]
        # Priority order: due reviewed -> never reviewed -> future
        assert ids == ["due-1", "new-1", "future-1"]

    def test_higher_difficulty_due_cards_appear_first(self):
        card_easy = _make_card("easy", difficulty=0.5, next_due=_days_from_now(-1))
        card_hard = _make_card("hard", difficulty=3.0, next_due=_days_from_now(-1))
        card_medium = _make_card("medium", difficulty=1.5, next_due=_days_from_now(-1))

        deck = [card_easy, card_hard, card_medium]
        queue = get_session_queue(deck, session_size=3)

        ids = [c.id for c in queue]
        assert ids == ["hard", "medium", "easy"]

    def test_never_reviewed_cards_sorted_by_difficulty_descending(self):
        new_easy = _make_card("new-easy", difficulty=0.7, next_due=None)
        new_hard = _make_card("new-hard", difficulty=4.0, next_due=None)

        queue = get_session_queue([new_easy, new_hard], session_size=2)
        assert [c.id for c in queue] == ["new-hard", "new-easy"]

    def test_not_yet_due_cards_sorted_by_soonest_due_first(self):
        card_due_soon = _make_card("soon", next_due=_days_from_now(1))
        card_due_later = _make_card("later", next_due=_days_from_now(5))

        queue = get_session_queue([card_due_later, card_due_soon], session_size=2)
        assert [c.id for c in queue] == ["soon", "later"]

    def test_respects_session_size(self):
        deck = [_make_card(f"c{i}", next_due=_days_from_now(-1)) for i in range(10)]
        queue = get_session_queue(deck, session_size=4)
        assert len(queue) == 4

    def test_deck_smaller_than_session_size_returns_all_cards(self):
        deck = [_make_card(f"c{i}", next_due=_days_from_now(-1)) for i in range(3)]
        queue = get_session_queue(deck, session_size=10)
        assert len(queue) == 3
        assert len(queue) <= len(deck)

    def test_empty_deck_returns_empty_list_without_error(self):
        assert get_session_queue([]) == []
        assert get_session_queue([], session_size=10) == []

    def test_session_size_defaults_to_20_when_none(self):
        deck = [_make_card(f"c{i}", next_due=_days_from_now(-1)) for i in range(30)]
        queue = get_session_queue(deck, session_size=None)
        assert len(queue) == 20
        assert DEFAULT_SESSION_SIZE == 20

    def test_no_duplicate_cards_in_queue(self):
        c1 = _make_card("c1", difficulty=2.0, next_due=_days_from_now(-1))
        c2 = _make_card("c2", difficulty=1.0, next_due=_days_from_now(3))
        queue = get_session_queue([c1, c2, c1], session_size=10)
        ids = [c.id for c in queue]
        assert ids == ["c1", "c2"]
        assert len(ids) == len(set(ids))


# ---------------------------------------------------------------------------
# Datetime & ISO-8601 Helpers
# ---------------------------------------------------------------------------

class TestDateHelpers:
    def test_parse_iso_datetime_supports_various_formats(self):
        # Full UTC with +00:00
        dt1 = parse_iso_datetime("2026-09-11T16:20:00+00:00")
        assert dt1.year == 2026
        assert dt1.tzinfo == timezone.utc

        # With trailing Z
        dt2 = parse_iso_datetime("2026-09-11T16:20:00Z")
        assert dt2 == dt1

        # Date only (midnight UTC)
        dt3 = parse_iso_datetime("2026-09-11")
        assert dt3 == datetime(2026, 9, 11, 0, 0, 0, tzinfo=timezone.utc)

    def test_format_iso_datetime_includes_timezone_offset(self):
        dt = datetime(2026, 9, 11, 14, 30, 0, tzinfo=timezone.utc)
        iso = format_iso_datetime(dt)
        assert iso == "2026-09-11T14:30:00+00:00"

    def test_now_utc_returns_timezone_aware_datetime(self):
        now = now_utc()
        assert isinstance(now, datetime)
        assert now.tzinfo is not None
        assert now.tzinfo == timezone.utc


# ---------------------------------------------------------------------------
# Module Purity Constraints
# ---------------------------------------------------------------------------

class TestSrsPurity:
    def test_no_rich_imports(self):
        import app.srs as srs_mod
        with open(srs_mod.__file__, "r", encoding="utf-8") as fh:
            content = fh.read()
        assert "import rich" not in content
        assert "from rich" not in content

    def test_no_print_or_input_calls(self):
        import app.srs as srs_mod
        with open(srs_mod.__file__, "r", encoding="utf-8") as fh:
            content = fh.read()
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Name):
                    if func.id == "print":
                        pytest.fail("srs.py contains a print() call!")
                    if func.id == "input":
                        pytest.fail("srs.py contains an input() call!")
