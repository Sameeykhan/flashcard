"""
Progress Tracker — app/progress.py

Responsibility: Records per-session results and per-card historical stats,
computes aggregate stats (accuracy, streaks, mastery breakdown, most-missed),
and persists everything to progress.json atomically.

NOT responsible for: card scheduling (srs.py), session orchestration (quiz.py),
any UI rendering (ui.py), importing Rich, or calling print()/input().

Architecture & Design (PRD §5.5):
- Dual-Tracking Architecture:
  Per-card performance counters exist in both flashcards.json and progress.json:
  1. flashcards.json (Card.correct_count / Card.wrong_count / Card.interval_level):
     Holds the active, mutable SRS-relevant state required directly by the
     scheduling algorithm in app/srs.py.
  2. progress.json (card_stats):
     Holds the cumulative historical audit log across all study sessions
     (lifetime attempts, correct/wrong counts, and last attempt dates) to power
     aggregate progress tracking, mastery breakdowns, and streak analysis
     independently of deck modifications.
- Atomic Writes:
  Uses the temp-file + os.replace pattern to prevent partial writes or file corruption.
- Resilience:
  Missing or corrupt files are automatically re-initialized with an empty schema.
"""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Union

DEFAULT_PROGRESS_PATH: str = "data/progress.json"


# ---------------------------------------------------------------------------
# Data models & stats dictionary
# ---------------------------------------------------------------------------

@dataclass
class SessionResult:
    """Summary of a completed study session."""

    id: str
    date: str                   # ISO-8601 UTC datetime string
    cards_studied: int
    correct: int
    wrong: int
    accuracy: float             # Ratio 0.0 – 1.0
    duration_seconds: float
    correct_count: int = 0      # Alias for correct
    wrong_count: int = 0        # Alias for wrong
    accuracy_pct: float = 0.0   # Percentage 0.0 – 100.0

    def __post_init__(self) -> None:
        if not self.correct_count:
            self.correct_count = self.correct
        if not self.wrong_count:
            self.wrong_count = self.wrong
        if not self.accuracy_pct:
            self.accuracy_pct = round(self.accuracy * 100.0, 2)


@dataclass
class CardStats:
    """Aggregate stats for a single card across all sessions."""

    attempts: int = 0
    correct: int = 0
    wrong: int = 0
    last_reviewed: Optional[str] = None   # ISO-8601 or None
    correct_count: int = 0
    wrong_count: int = 0
    last_attempt_date: Optional[str] = None

    def __post_init__(self) -> None:
        if not self.correct_count:
            self.correct_count = self.correct
        if not self.wrong_count:
            self.wrong_count = self.wrong
        if not self.last_attempt_date:
            self.last_attempt_date = self.last_reviewed


class AggregateStats(dict):
    """Aggregate statistics dictionary supporting both dict indexing and attribute access.

    Returned by get_aggregate_stats() as a dict while preserving attribute access
    for backward compatibility with the UI layer (ui.show_progress).
    """

    def __init__(
        self,
        total_sessions: int = 0,
        total_cards_studied: int = 0,
        overall_accuracy_pct: float = 0.0,
        current_streak_days: int = 0,
        mastery_breakdown: Optional[Dict[str, int]] = None,
        most_missed_cards: Optional[List[str]] = None,
        **extra: Any,
    ) -> None:
        mastery = mastery_breakdown or {"new": 0, "learning": 0, "mastered": 0}
        missed = most_missed_cards or []
        overall_accuracy = round(overall_accuracy_pct / 100.0, 4)

        data = {
            "total_sessions": total_sessions,
            "total_cards_studied": total_cards_studied,
            "overall_accuracy_pct": overall_accuracy_pct,
            "overall_accuracy": overall_accuracy,
            "current_streak_days": current_streak_days,
            "mastery_breakdown": mastery,
            "most_missed_cards": missed,
            "most_missed": missed,
        }
        data.update(extra)
        super().__init__(data)

    def __getattr__(self, item: str) -> Any:
        try:
            return self[item]
        except KeyError:
            raise AttributeError(f"'AggregateStats' object has no attribute '{item}'")

    def __setattr__(self, key: str, value: Any) -> None:
        self[key] = value


# ---------------------------------------------------------------------------
# Date & time helpers
# ---------------------------------------------------------------------------

def now_utc() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def format_iso_datetime(dt: datetime) -> str:
    """Format a datetime as a timezone-aware UTC ISO-8601 string."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat()


def parse_iso_datetime(iso_str: str) -> datetime:
    """Parse an ISO-8601 date or datetime string into a timezone-aware UTC datetime."""
    cleaned = iso_str.strip()
    if cleaned.endswith("Z") or cleaned.endswith("z"):
        cleaned = cleaned[:-1] + "+00:00"

    try:
        dt = datetime.fromisoformat(cleaned)
    except ValueError:
        d = date.fromisoformat(cleaned)
        return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt


def now_iso() -> str:
    """Return current UTC time as an ISO-8601 string."""
    return format_iso_datetime(now_utc())


def _now_iso() -> str:
    """Internal alias for now_iso."""
    return now_iso()


def _empty_store() -> Dict[str, Any]:
    """Return the canonical empty progress.json data structure."""
    return {"sessions": [], "card_stats": {}}


def _ensure_dir(path: str) -> None:
    """Ensure parent directory of path exists."""
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def _write_json(path: str, data: Dict[str, Any]) -> None:
    """Atomically write data to path via a temporary file."""
    _ensure_dir(path)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


class SessionRecord(dict):
    """Session dictionary supporting both dict indexing and attribute access."""

    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'SessionRecord' object has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value


class ProgressData(dict):
    """Progress data dictionary supporting dict operations and legacy 2-tuple unpacking."""

    def __iter__(self):
        # Yield sessions and card_stats to support tuple unpacking:
        # sessions, card_stats = load_progress(...)
        return iter([self.get("sessions", []), self.get("card_stats", {})])


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def load_progress(path: str = DEFAULT_PROGRESS_PATH) -> ProgressData:
    """Load progress data from path.

    If the file does not exist, is empty, or contains invalid JSON, the file
    is initialized with an empty schema ({"sessions": [], "card_stats": {}})
    and the empty dictionary is returned. Never raises on missing or corrupt files.

    Parameters
    ----------
    path:
        Filesystem path to progress.json.

    Returns
    -------
    ProgressData (dict subclass)
        Progress data dictionary containing 'sessions' and 'card_stats', which
        also supports legacy 2-tuple unpacking (sessions, card_stats = load_progress()).
    """
    _ensure_dir(path)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        if not isinstance(data, dict):
            raise ValueError("Root progress object must be a dictionary.")
        raw_sessions = data.get("sessions", [])
        sessions = [SessionRecord(s) if isinstance(s, dict) else s for s in raw_sessions]
        card_stats = data.get("card_stats", {})
        return ProgressData({"sessions": sessions, "card_stats": card_stats})
    except (FileNotFoundError, json.JSONDecodeError, ValueError, KeyError):
        empty = _empty_store()
        try:
            _write_json(path, empty)
        except OSError:
            pass
        return ProgressData(empty)


def save_progress(
    data: Union[Dict[str, Any], List[Any]],
    path: str = DEFAULT_PROGRESS_PATH,
    *args: Any,
) -> None:
    """Persist progress data to path atomically using a temp file and os.replace().

    Parameters
    ----------
    data:
        The progress data dictionary (containing 'sessions' and 'card_stats')
        to persist. Also supports legacy signature (sessions, card_stats, path).
    path:
        Filesystem path to progress.json.
    """
    # Support legacy signature: save_progress(sessions, card_stats, path)
    if isinstance(data, list) and args:
        card_stats = path if isinstance(path, dict) else {}
        target_path = str(args[0]) if args else DEFAULT_PROGRESS_PATH
        serialized_sessions = [asdict(s) if hasattr(s, "__dataclass_fields__") else s for s in data]
        serialized_stats = {
            k: asdict(v) if hasattr(v, "__dataclass_fields__") else v
            for k, v in card_stats.items()
        }
        data_to_write: Dict[str, Any] = {
            "sessions": serialized_sessions,
            "card_stats": serialized_stats,
        }
        _write_json(target_path, data_to_write)
        return

    if not isinstance(data, dict):
        raise TypeError(f"Expected dict for progress data, got {type(data).__name__}")

    _write_json(path, data)


# ---------------------------------------------------------------------------
# Recording Results
# ---------------------------------------------------------------------------

def record_session(
    session_result: Union[Dict[str, Any], SessionResult],
    path: str = DEFAULT_PROGRESS_PATH,
) -> None:
    """Append a session record to progress history and persist to disk.

    A session_result should contain at least:
    - date: ISO-8601 UTC string (e.g. '2026-09-11T12:00:00+00:00')
    - cards_studied: int
    - correct_count: int
    - wrong_count: int
    - accuracy_pct: float (0.0 to 100.0)
    - duration_seconds: float or int

    Parameters
    ----------
    session_result:
        Dictionary or SessionResult instance describing the finished session.
    path:
        Filesystem path to progress.json.
    """
    if hasattr(session_result, "__dataclass_fields__"):
        res_dict = asdict(session_result)
    else:
        res_dict = dict(session_result)

    cards_studied = int(res_dict.get("cards_studied", 0))
    correct_count = int(res_dict.get("correct_count", res_dict.get("correct", 0)))
    wrong_count = int(res_dict.get("wrong_count", res_dict.get("wrong", 0)))

    if "accuracy_pct" in res_dict:
        accuracy_pct = float(res_dict["accuracy_pct"])
    elif "accuracy" in res_dict:
        accuracy_pct = round(float(res_dict["accuracy"]) * 100.0, 2)
    elif cards_studied > 0:
        accuracy_pct = round((correct_count / cards_studied) * 100.0, 2)
    else:
        accuracy_pct = 0.0

    accuracy_ratio = round(accuracy_pct / 100.0, 4)

    record: Dict[str, Any] = {
        "id": res_dict.get("id", str(uuid.uuid4())),
        "date": res_dict.get("date", now_iso()),
        "cards_studied": cards_studied,
        "correct_count": correct_count,
        "correct": correct_count,
        "wrong_count": wrong_count,
        "wrong": wrong_count,
        "accuracy_pct": accuracy_pct,
        "accuracy": accuracy_ratio,
        "duration_seconds": float(res_dict.get("duration_seconds", 0.0)),
    }

    data = load_progress(path)
    sessions = data.setdefault("sessions", [])
    sessions.append(record)
    save_progress(data, path)


def record_card_attempt(
    card_id: str,
    correct: bool,
    path: str = DEFAULT_PROGRESS_PATH,
) -> Dict[str, Any]:
    """Update a per-card-id entry in progress data tracking cumulative attempts.

    # -----------------------------------------------------------------------
    # Dual-Tracking Architecture Note:
    # Per-card performance counters exist in both flashcards.json and progress.json
    # for clean architectural separation of concerns:
    # - flashcards.json (Card.correct_count / Card.wrong_count / Card.interval_level):
    #   Holds the active, mutable SRS-relevant state required directly by the
    #   scheduling algorithm in app/srs.py.
    # - progress.json (card_stats):
    #   Holds the cumulative historical audit log across all study sessions
    #   (lifetime attempts, correct/wrong counts, and last attempt dates) to power
    #   aggregate progress tracking, mastery breakdowns, and streak analysis
    #   independently of deck modifications.
    # -----------------------------------------------------------------------

    Parameters
    ----------
    card_id:
        Identifier / UUID of the card attempted.
    correct:
        True if the card was answered correctly, False if incorrect.
    path:
        Filesystem path to progress.json.

    Returns
    -------
    dict
        The updated card_stats dictionary entry for this card.
    """
    data = load_progress(path)
    card_stats = data.setdefault("card_stats", {})

    stats = card_stats.get(card_id, {
        "attempts": 0,
        "correct_count": 0,
        "correct": 0,
        "wrong_count": 0,
        "wrong": 0,
        "last_attempt_date": None,
        "last_reviewed": None,
    })

    stats["attempts"] = int(stats.get("attempts", 0)) + 1
    if correct:
        c = int(stats.get("correct_count", stats.get("correct", 0))) + 1
        stats["correct_count"] = c
        stats["correct"] = c
    else:
        w = int(stats.get("wrong_count", stats.get("wrong", 0))) + 1
        stats["wrong_count"] = w
        stats["wrong"] = w

    timestamp = now_iso()
    stats["last_attempt_date"] = timestamp
    stats["last_reviewed"] = timestamp

    card_stats[card_id] = stats
    save_progress(data, path)
    return stats


def update_card_stats(
    card_id: str,
    correct: bool,
    path: str = DEFAULT_PROGRESS_PATH,
) -> CardStats:
    """Compatibility wrapper around record_card_attempt returning a CardStats dataclass."""
    stats_dict = record_card_attempt(card_id, correct, path=path)
    return CardStats(
        attempts=stats_dict["attempts"],
        correct=stats_dict["correct_count"],
        wrong=stats_dict["wrong_count"],
        last_reviewed=stats_dict["last_attempt_date"],
    )


# ---------------------------------------------------------------------------
# Aggregate Statistics
# ---------------------------------------------------------------------------

def get_aggregate_stats(
    path: str = DEFAULT_PROGRESS_PATH,
    cards_path: str = "data/flashcards.json",
    today: Optional[date] = None,
) -> AggregateStats:
    """Compute aggregate statistics across all recorded sessions and card attempts.

    Computes and returns:
    - overall_accuracy_pct: Overall percentage (0.0 to 100.0) of correct answers across all sessions.
    - current_streak_days: Number of consecutive calendar days with at least one recorded session,
      counting backward from today (UTC).
    - most_missed_cards: Top 5 card_ids ordered by wrong_count descending.
    - mastery_breakdown:
      - 'new': Cards that have never been reviewed.
      - 'learning': Reviewed cards with interval < 14 days or accuracy < 80%.
      - 'mastered': Cards with interval >= 14 days and high accuracy (>= 80% with >= 3 attempts).

    Parameters
    ----------
    path:
        Filesystem path to progress.json.
    cards_path:
        Filesystem path to flashcards.json (to count unreviewed 'new' cards if present).
    today:
        Optional reference date (UTC) for deterministic streak calculations.

    Returns
    -------
    AggregateStats
        Dictionary subclass containing all computed metrics.
    """
    data = load_progress(path)
    sessions = data.get("sessions", [])
    card_stats = data.get("card_stats", {})

    total_sessions = len(sessions)
    total_cards_studied = sum(int(s.get("cards_studied", 0)) for s in sessions)
    total_correct = sum(int(s.get("correct_count", s.get("correct", 0))) for s in sessions)

    if total_cards_studied > 0:
        overall_accuracy_pct = round((total_correct / total_cards_studied) * 100.0, 2)
    else:
        overall_accuracy_pct = 0.0

    # -----------------------------------------------------------------------
    # Streak Calculation
    # -----------------------------------------------------------------------
    session_dates = set()
    for s in sessions:
        date_str = s.get("date")
        if date_str:
            try:
                session_dates.add(parse_iso_datetime(date_str).date())
            except (ValueError, TypeError):
                pass

    ref_date = today or now_utc().date()
    streak = 0

    if ref_date in session_dates:
        check = ref_date
        while check in session_dates:
            streak += 1
            check -= timedelta(days=1)
    elif (ref_date - timedelta(days=1)) in session_dates:
        # Yesterday had a session, so streak is active for today
        check = ref_date - timedelta(days=1)
        while check in session_dates:
            streak += 1
            check -= timedelta(days=1)

    # -----------------------------------------------------------------------
    # Most-Missed Cards (Top 5 by wrong_count descending)
    # -----------------------------------------------------------------------
    missed_items = []
    for cid, stats in card_stats.items():
        w = int(stats.get("wrong_count", stats.get("wrong", 0)))
        a = int(stats.get("attempts", 0))
        if w > 0:
            missed_items.append((cid, w, a))

    # Sort primarily by wrong_count descending (-w), then attempts descending (-a), then card_id
    missed_items.sort(key=lambda item: (-item[1], -item[2], item[0]))
    most_missed_cards = [cid for cid, _, _ in missed_items[:5]]

    # -----------------------------------------------------------------------
    # Mastery Breakdown
    # -----------------------------------------------------------------------
    deck_cards = []
    if os.path.exists(cards_path):
        try:
            from app import cards as card_manager
            deck_cards = card_manager.load_cards(cards_path)
        except Exception:
            pass

    card_lookup = {c.id: c for c in deck_cards}
    all_card_ids = set(card_lookup.keys()) | set(card_stats.keys())

    new_count = 0
    learning_count = 0
    mastered_count = 0

    for cid in all_card_ids:
        card = card_lookup.get(cid)
        stats = card_stats.get(cid)

        # Card is completely unreviewed
        if stats is None and (card is not None and card.last_reviewed is None):
            new_count += 1
            continue

        attempts = int(stats.get("attempts", 0)) if stats else (card.correct_count + card.wrong_count if card else 0)
        correct = int(stats.get("correct_count", stats.get("correct", 0))) if stats else (card.correct_count if card else 0)
        acc = (correct / attempts) if attempts > 0 else 0.0
        interval_level = getattr(card, "interval_level", 0) if card else 0
        difficulty = getattr(card, "difficulty", 1.0) if card else 1.0

        # Mastered threshold: interval >= 14 days (level >= 3) and difficulty <= 0.7,
        # OR historical accuracy >= 80% with at least 3 attempts
        is_mastered = (interval_level >= 3 and difficulty <= 0.7) or (attempts >= 3 and acc >= 0.8)

        if is_mastered:
            mastered_count += 1
        elif attempts > 0 or (card and card.last_reviewed is not None):
            learning_count += 1
        else:
            new_count += 1

    mastery_breakdown = {
        "new": new_count,
        "learning": learning_count,
        "mastered": mastered_count,
    }

    return AggregateStats(
        total_sessions=total_sessions,
        total_cards_studied=total_cards_studied,
        overall_accuracy_pct=overall_accuracy_pct,
        current_streak_days=streak,
        mastery_breakdown=mastery_breakdown,
        most_missed_cards=most_missed_cards,
    )
