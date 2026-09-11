"""
Tests for app/progress.py — Progress Tracker Engine.

Covers PRD §5.5 & Prompt 4 requirements:
- load_progress and save_progress resilience (safe load, atomic replace).
- record_session appends and persists session history.
- record_card_attempt tracks and accumulates attempts, correct, wrong, and timestamps.
- get_aggregate_stats:
  - Exact overall_accuracy_pct calculation across sessions.
  - Deterministic streak calculation (consecutive vs. non-consecutive days with fixed today date).
  - most_missed_cards ordering and top-N limiting.
  - mastery_breakdown categorization.
- Module purity: zero Rich imports, zero print()/input() calls.
"""

from __future__ import annotations

import ast
import json
import os
from datetime import date, datetime, timedelta, timezone
from unittest.mock import patch

import pytest

from app.progress import (
    AggregateStats,
    CardStats,
    SessionResult,
    get_aggregate_stats,
    load_progress,
    record_card_attempt,
    record_session,
    save_progress,
    update_card_stats,
)


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_path_json(tmp_path):
    """Return a path string inside an isolated temporary directory."""
    return str(tmp_path / "progress.json")


# ---------------------------------------------------------------------------
# Safe Load & Atomic Save Resilience
# ---------------------------------------------------------------------------

class TestPersistenceResilience:
    def test_missing_file_initializes_empty_schema_without_crashing(self, tmp_path_json):
        data = load_progress(tmp_path_json)
        assert isinstance(data, dict)
        assert data["sessions"] == []
        assert data["card_stats"] == {}
        # Verify file was safely created
        assert os.path.exists(tmp_path_json)

    def test_corrupt_file_recovers_empty_schema_without_crashing(self, tmp_path_json):
        with open(tmp_path_json, "w", encoding="utf-8") as fh:
            fh.write("INVALID JSON MALFORMED { [")
        data = load_progress(tmp_path_json)
        assert isinstance(data, dict)
        assert data["sessions"] == []
        assert data["card_stats"] == {}

    def test_save_progress_atomic_write_uses_os_replace(self, tmp_path_json):
        with patch("os.replace") as mock_replace:
            mock_replace.side_effect = lambda src, dst: os.rename(src, dst)
            save_progress({"sessions": [], "card_stats": {}}, tmp_path_json)
            mock_replace.assert_called_once()
            src, dst = mock_replace.call_args[0]
            assert src == tmp_path_json + ".tmp"
            assert dst == tmp_path_json

    def test_tmp_file_not_left_behind_after_save(self, tmp_path_json):
        save_progress({"sessions": [], "card_stats": {}}, tmp_path_json)
        assert not os.path.exists(tmp_path_json + ".tmp")


# ---------------------------------------------------------------------------
# Recording Sessions
# ---------------------------------------------------------------------------

class TestRecordSession:
    def test_record_session_persists_and_reloads(self, tmp_path_json):
        session_payload = {
            "date": "2026-09-11T12:00:00+00:00",
            "cards_studied": 10,
            "correct_count": 8,
            "wrong_count": 2,
            "accuracy_pct": 80.0,
            "duration_seconds": 95.5,
        }
        record_session(session_payload, path=tmp_path_json)

        data = load_progress(tmp_path_json)
        assert len(data["sessions"]) == 1
        saved = data["sessions"][0]
        assert saved["cards_studied"] == 10
        assert saved["correct_count"] == 8
        assert saved["wrong_count"] == 2
        assert saved["accuracy_pct"] == 80.0
        assert saved["duration_seconds"] == 95.5
        assert saved["date"] == "2026-09-11T12:00:00+00:00"

    def test_multiple_sessions_append_sequentially(self, tmp_path_json):
        s1 = {"cards_studied": 5, "correct_count": 4, "wrong_count": 1, "accuracy_pct": 80.0}
        s2 = {"cards_studied": 12, "correct_count": 10, "wrong_count": 2, "accuracy_pct": 83.33}
        record_session(s1, path=tmp_path_json)
        record_session(s2, path=tmp_path_json)

        data = load_progress(tmp_path_json)
        assert len(data["sessions"]) == 2
        assert data["sessions"][0]["cards_studied"] == 5
        assert data["sessions"][1]["cards_studied"] == 12

    def test_record_session_supports_session_result_dataclass(self, tmp_path_json):
        res = SessionResult(
            id="test-session-id",
            date="2026-09-11T15:00:00+00:00",
            cards_studied=20,
            correct=18,
            wrong=2,
            accuracy=0.9,
            duration_seconds=120.0,
        )
        record_session(res, path=tmp_path_json)
        data = load_progress(tmp_path_json)
        assert len(data["sessions"]) == 1
        assert data["sessions"][0]["correct_count"] == 18
        assert data["sessions"][0]["accuracy_pct"] == 90.0


# ---------------------------------------------------------------------------
# Recording Card Attempts
# ---------------------------------------------------------------------------

class TestRecordCardAttempt:
    def test_first_attempt_initializes_card_stats(self, tmp_path_json):
        stats = record_card_attempt("card-100", correct=True, path=tmp_path_json)
        assert stats["attempts"] == 1
        assert stats["correct_count"] == 1
        assert stats["wrong_count"] == 0
        assert stats["last_attempt_date"] is not None

        # Verify disk persistence
        data = load_progress(tmp_path_json)
        assert "card-100" in data["card_stats"]
        assert data["card_stats"]["card-100"]["attempts"] == 1

    def test_multiple_card_attempts_accumulate_correctly(self, tmp_path_json):
        # 3 correct, 2 wrong
        record_card_attempt("card-xyz", correct=True, path=tmp_path_json)
        record_card_attempt("card-xyz", correct=False, path=tmp_path_json)
        record_card_attempt("card-xyz", correct=True, path=tmp_path_json)
        record_card_attempt("card-xyz", correct=True, path=tmp_path_json)
        record_card_attempt("card-xyz", correct=False, path=tmp_path_json)

        data = load_progress(tmp_path_json)
        c = data["card_stats"]["card-xyz"]
        assert c["attempts"] == 5
        assert c["correct_count"] == 3
        assert c["wrong_count"] == 2
        assert c["correct"] == 3
        assert c["wrong"] == 2

    def test_update_card_stats_compatibility_wrapper(self, tmp_path_json):
        res = update_card_stats("card-legacy", correct=False, path=tmp_path_json)
        assert isinstance(res, CardStats)
        assert res.attempts == 1
        assert res.wrong == 1
        assert res.correct == 0


# ---------------------------------------------------------------------------
# Aggregate Statistics
# ---------------------------------------------------------------------------

class TestGetAggregateStats:
    def test_empty_progress_returns_zero_stats(self, tmp_path_json):
        stats = get_aggregate_stats(tmp_path_json)
        assert isinstance(stats, dict)
        assert stats["total_sessions"] == 0
        assert stats["total_cards_studied"] == 0
        assert stats["overall_accuracy_pct"] == 0.0
        assert stats["current_streak_days"] == 0
        assert stats["most_missed_cards"] == []

    def test_exact_overall_accuracy_pct_calculation(self, tmp_path_json):
        # Session 1: 10 studied, 7 correct, 3 wrong
        record_session({
            "cards_studied": 10,
            "correct_count": 7,
            "wrong_count": 3,
            "accuracy_pct": 70.0,
        }, path=tmp_path_json)

        # Session 2: 15 studied, 12 correct, 3 wrong
        record_session({
            "cards_studied": 15,
            "correct_count": 12,
            "wrong_count": 3,
            "accuracy_pct": 80.0,
        }, path=tmp_path_json)

        # Session 3: 5 studied, 3 correct, 2 wrong
        record_session({
            "cards_studied": 5,
            "correct_count": 3,
            "wrong_count": 2,
            "accuracy_pct": 60.0,
        }, path=tmp_path_json)

        # Total: 30 studied, 22 correct -> 22 / 30 * 100 = 73.33%
        stats = get_aggregate_stats(tmp_path_json)
        assert stats["total_sessions"] == 3
        assert stats["total_cards_studied"] == 30
        assert stats["overall_accuracy_pct"] == 73.33

    def test_streak_calculation_consecutive_days_with_fixed_today(self, tmp_path_json):
        fixed_today = date(2026, 9, 15)

        # Sessions on Sep 13, Sep 14, Sep 15 (3 consecutive days)
        for day in [13, 14, 15]:
            record_session({
                "date": f"2026-09-{day}T14:00:00+00:00",
                "cards_studied": 10,
                "correct_count": 9,
                "wrong_count": 1,
            }, path=tmp_path_json)

        stats = get_aggregate_stats(tmp_path_json, today=fixed_today)
        assert stats["current_streak_days"] == 3

    def test_streak_calculation_non_consecutive_broken_by_gap(self, tmp_path_json):
        fixed_today = date(2026, 9, 15)

        # Sessions on Sep 12 and Sep 15 (gap on 13 and 14)
        for day in [12, 15]:
            record_session({
                "date": f"2026-09-{day}T10:00:00+00:00",
                "cards_studied": 10,
                "correct_count": 8,
                "wrong_count": 2,
            }, path=tmp_path_json)

        stats = get_aggregate_stats(tmp_path_json, today=fixed_today)
        # Streak counting backward from today is 1 (Sep 15 only)
        assert stats["current_streak_days"] == 1

    def test_streak_active_from_yesterday_when_today_not_yet_studied(self, tmp_path_json):
        fixed_today = date(2026, 9, 15)

        # Sessions on Sep 13 and Sep 14 (yesterday), no session on Sep 15 yet
        for day in [13, 14]:
            record_session({
                "date": f"2026-09-{day}T18:00:00+00:00",
                "cards_studied": 10,
                "correct_count": 10,
                "wrong_count": 0,
            }, path=tmp_path_json)

        stats = get_aggregate_stats(tmp_path_json, today=fixed_today)
        # Streak is alive from yesterday: 2 days
        assert stats["current_streak_days"] == 2

    def test_most_missed_cards_ordering_and_top_five_limit(self, tmp_path_json):
        # Create card attempts with known wrong counts
        attempts_data = {
            "card-A": 5,   # rank 3
            "card-B": 10,  # rank 1
            "card-C": 1,   # rank 6 (should be omitted from top 5)
            "card-D": 0,   # 0 wrong (should be omitted)
            "card-E": 7,   # rank 2
            "card-F": 3,   # rank 5
            "card-G": 4,   # rank 4
        }

        for cid, wrong_cnt in attempts_data.items():
            for _ in range(wrong_cnt):
                record_card_attempt(cid, correct=False, path=tmp_path_json)
            # Add at least one correct attempt for card-D
            if wrong_cnt == 0:
                record_card_attempt(cid, correct=True, path=tmp_path_json)

        stats = get_aggregate_stats(tmp_path_json)
        expected_top_five = ["card-B", "card-E", "card-A", "card-G", "card-F"]
        assert stats["most_missed_cards"] == expected_top_five
        assert stats.most_missed == expected_top_five
        assert len(stats["most_missed_cards"]) == 5

    def test_mastery_breakdown_categorization(self, tmp_path_json):
        # Mastered: >= 3 attempts and >= 80% accuracy
        for _ in range(4):
            record_card_attempt("mastered-card", correct=True, path=tmp_path_json)

        # Learning: 1 correct, 2 wrong (< 80%)
        record_card_attempt("learning-card", correct=True, path=tmp_path_json)
        record_card_attempt("learning-card", correct=False, path=tmp_path_json)
        record_card_attempt("learning-card", correct=False, path=tmp_path_json)

        stats = get_aggregate_stats(tmp_path_json)
        bd = stats["mastery_breakdown"]
        assert bd["mastered"] >= 1
        assert bd["learning"] >= 1


# ---------------------------------------------------------------------------
# Module Purity Constraints
# ---------------------------------------------------------------------------

class TestProgressPurity:
    def test_no_rich_imports(self):
        import app.progress as prog_mod
        with open(prog_mod.__file__, "r", encoding="utf-8") as fh:
            content = fh.read()
        assert "import rich" not in content
        assert "from rich" not in content

    def test_no_print_or_input_calls(self):
        import app.progress as prog_mod
        with open(prog_mod.__file__, "r", encoding="utf-8") as fh:
            content = fh.read()
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Name):
                    if func.id == "print":
                        pytest.fail("progress.py contains a print() call!")
                    if func.id == "input":
                        pytest.fail("progress.py contains an input() call!")
