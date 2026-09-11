"""
SRS Engine — app/srs.py

Responsibility: Spaced repetition logic — assigns and updates difficulty
weights per card, computes next-due intervals according to a fixed ladder,
and constructs prioritized study session queues. Pure functions only,
fully unit-testable in isolation with zero dependencies on Rich, terminal
I/O, or disk persistence.

NOT responsible for: persistence (cards.py), session flow (quiz.py),
any UI rendering (ui.py), importing Rich, or calling print()/input().

Algorithm & Design (PRD §5.3):
- Difficulty weight: Starts at 1.0 for a new card.
  - Wrong answer: difficulty * 1.5 (capped at DIFFICULTY_MAX = 10.0).
  - Correct answer: difficulty * 0.7 (floored at DIFFICULTY_MIN = 0.1).
- Interval Ladder: Fixed intervals of [1, 3, 7, 14, 30] days.
  - Wrong answer: resets to shortest interval (1 day, level 0).
  - Correct answer: advances along the ladder (1 -> 3 -> 7 -> 14 -> 30 days),
    capping at 30 days once reached.
  - New card on first review: enters ladder at level 0 (1 day on correct; 1 day on wrong).
  - Tracking: Explicitly tracked via Card.interval_level (0-indexed: 0=1d, 1=3d, 2=7d, 3=14d, 4=30d)
    with implicit fallback derivation from (next_due - last_reviewed) if interval_level is not preset.
- Session Queue Priority:
  1. Reviewed cards that are currently due/overdue (next_due <= now), sorted by difficulty descending.
  2. Never-reviewed cards (next_due is None), sorted by difficulty descending.
  3. Future / not-yet-due cards (next_due > now), sorted by soonest-due date ascending.
  Default session size: 20 cards.
- Dates & Timezones: Python datetime module with timezone-aware UTC ISO-8601 strings throughout.
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import List, Optional

from app.cards import Card

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEFAULT_DIFFICULTY: float = 1.0
DIFFICULTY_INCREASE_FACTOR: float = 1.5
DIFFICULTY_DECREASE_FACTOR: float = 0.7
DIFFICULTY_MAX: float = 10.0
DIFFICULTY_MIN: float = 0.1

# Fixed interval ladder in days (0-indexed: 0=1d, 1=3d, 2=7d, 3=14d, 4=30d)
INTERVAL_LEVELS: List[int] = [1, 3, 7, 14, 30]

DEFAULT_SESSION_SIZE: int = 20


# ---------------------------------------------------------------------------
# Date & time helpers (UTC ISO-8601)
# ---------------------------------------------------------------------------

def now_utc() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def today_utc() -> date:
    """Return today's date in UTC (kept for compatibility with tests)."""
    return now_utc().date()


def format_iso_datetime(dt: datetime) -> str:
    """Format a datetime as a timezone-aware UTC ISO-8601 string."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.isoformat()


def parse_iso_datetime(iso_str: str) -> datetime:
    """Parse an ISO-8601 date or datetime string into a timezone-aware UTC datetime.

    Handles:
    - Full UTC ISO strings (e.g. '2026-09-11T12:00:00+00:00' or '2026-09-11T12:00:00Z')
    - Non-UTC ISO strings with timezone offsets (converted to UTC)
    - Naive ISO strings (assumed UTC)
    - Date-only ISO strings (e.g. '2026-09-11', parsed as midnight UTC)
    """
    cleaned = iso_str.strip()
    if cleaned.endswith("Z") or cleaned.endswith("z"):
        cleaned = cleaned[:-1] + "+00:00"

    try:
        dt = datetime.fromisoformat(cleaned)
    except ValueError:
        # Fallback for date-only if needed
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


def _date_from_iso(iso: str) -> date:
    """Parse an ISO date or datetime string into a date object."""
    return parse_iso_datetime(iso).date()


# ---------------------------------------------------------------------------
# Interval ladder tracking
# ---------------------------------------------------------------------------

def get_interval_level(card: Card) -> Optional[int]:
    """Determine the current interval ladder level (0-indexed) of a card.

    Ladder levels:
        0: 1 day
        1: 3 days
        2: 7 days
        3: 14 days
        4: 30 days
        None: Never reviewed (new card)

    Checks explicit card.interval_level attribute first, falling back to
    calculating the interval delta between next_due and last_reviewed.
    """
    level = getattr(card, "interval_level", 0)

    # If an explicit higher level is set on the card, respect it
    if level is not None and isinstance(level, int) and 0 < level < len(INTERVAL_LEVELS):
        return level

    # If card has been reviewed at least once and level is 0, it's at level 0 (1 day)
    if card.last_reviewed is not None:
        return 0

    # If card has never been reviewed, it has no ladder level yet
    if card.last_reviewed is None and card.next_due is None:
        return None

    # Implicit derivation from previous scheduled interval: next_due - last_reviewed
    if card.next_due is not None and card.last_reviewed is not None:
        try:
            start = parse_iso_datetime(card.last_reviewed)
            end = parse_iso_datetime(card.next_due)
            delta_days = round((end - start).total_seconds() / 86400.0)
            if delta_days <= 1:
                return 0
            elif delta_days <= 4:
                return 1
            elif delta_days <= 10:
                return 2
            elif delta_days <= 20:
                return 3
            else:
                return 4
        except (ValueError, TypeError):
            pass

    # Fallback for cards with next_due but no last_reviewed
    if card.next_due is not None:
        return 0

    return None


# ---------------------------------------------------------------------------
# Per-answer update functions
# ---------------------------------------------------------------------------

def update_on_correct(card: Card, now: Optional[datetime] = None) -> Card:
    """Update a card's SRS fields after a correct answer.

    - Multiplies difficulty by DIFFICULTY_DECREASE_FACTOR (0.7, floored at 0.1).
    - Advances the card to the next interval level on the fixed ladder:
      1 day -> 3 days -> 7 days -> 14 days -> 30 days (capped at 30 days).
      New cards enter the ladder at level 0 (1 day).
    - Sets next_due = now + (interval).
    - Sets last_reviewed to now (UTC ISO-8601).
    - Increments correct_count.
    - Updates card.interval_level.
    - Returns the updated card (does not persist to disk).
    """
    if now is None:
        now = now_utc()

    # Determine current ladder level before setting last_reviewed
    current_level = get_interval_level(card)
    if current_level is None:
        new_level = 0
    else:
        new_level = min(current_level + 1, len(INTERVAL_LEVELS) - 1)

    card.correct_count += 1
    card.difficulty = max(DIFFICULTY_MIN, round(card.difficulty * DIFFICULTY_DECREASE_FACTOR, 4))
    card.last_reviewed = format_iso_datetime(now)
    card.interval_level = new_level
    interval_days = INTERVAL_LEVELS[new_level]
    card.next_due = format_iso_datetime(now + timedelta(days=interval_days))
    return card


def update_on_wrong(card: Card, now: Optional[datetime] = None) -> Card:
    """Update a card's SRS fields after a wrong answer.

    - Multiplies difficulty by DIFFICULTY_INCREASE_FACTOR (1.5, capped at 10.0).
    - Resets interval level back to the shortest interval (1 day, level 0).
    - Sets next_due = now + 1 day (UTC ISO-8601).
    - Sets last_reviewed to now (UTC ISO-8601).
    - Increments wrong_count.
    - Updates card.interval_level = 0.
    - Returns the updated card (does not persist to disk).
    """
    if now is None:
        now = now_utc()

    card.wrong_count += 1
    card.difficulty = min(DIFFICULTY_MAX, round(card.difficulty * DIFFICULTY_INCREASE_FACTOR, 4))
    card.last_reviewed = format_iso_datetime(now)
    card.interval_level = 0
    interval_days = INTERVAL_LEVELS[0]
    card.next_due = format_iso_datetime(now + timedelta(days=interval_days))
    return card


# ---------------------------------------------------------------------------
# Next-due computation
# ---------------------------------------------------------------------------

def compute_next_due(card: Card, correct: bool, now: Optional[datetime] = None) -> str:
    """Compute the next due ISO-8601 string for a card without modifying it.

    Parameters
    ----------
    card:
        The card whose next due date is being computed.
    correct:
        True if the answer was correct, False if wrong.
    now:
        Reference datetime (defaults to current UTC time).

    Returns
    -------
    str
        ISO-8601 string for the next review datetime.
    """
    if now is None:
        now = now_utc()

    if not correct:
        return format_iso_datetime(now + timedelta(days=INTERVAL_LEVELS[0]))

    current_level = get_interval_level(card)
    if current_level is None:
        new_level = 0
    else:
        new_level = min(current_level + 1, len(INTERVAL_LEVELS) - 1)

    return format_iso_datetime(now + timedelta(days=INTERVAL_LEVELS[new_level]))


# ---------------------------------------------------------------------------
# Due-date checks
# ---------------------------------------------------------------------------

def is_due(card: Card, include_new: bool = True) -> bool:
    """Return True if the card is due for review.

    Per PRD §5.3: A card is "due" if next_due is None (never reviewed)
    or next_due <= now (UTC).

    Parameters
    ----------
    card:
        Card to check.
    include_new:
        If True (default), cards with next_due is None are considered due.
        If False, only cards with next_due <= now are considered due.
    """
    if card.next_due is None:
        return include_new
    try:
        return parse_iso_datetime(card.next_due) <= now_utc()
    except (ValueError, TypeError):
        return True


def is_scheduled_due(card: Card) -> bool:
    """Return True if the card has a scheduled next_due timestamp and next_due <= now."""
    return is_due(card, include_new=False)


# ---------------------------------------------------------------------------
# Session queue builder
# ---------------------------------------------------------------------------

def get_session_queue(
    cards: List[Card],
    session_size: Optional[int] = None,
) -> List[Card]:
    """Build an ordered list of cards for one study session.

    Selection priority per PRD §5.3:
    1. Due cards (previously reviewed cards where next_due <= now):
       Sorted by difficulty descending (higher difficulty first). Ties are broken
       by oldest next_due (most overdue first).
    2. Never-reviewed cards (next_due is None):
       Used to fill the remainder up to session_size, sorted by difficulty descending.
    3. Not-yet-due cards (next_due > now):
       Fallback filler if session_size is still not reached, sorted by soonest-due
       ascending, then difficulty descending.

    Parameters
    ----------
    cards:
        Full pool of cards to draw from. May be empty.
    session_size:
        Maximum number of unique cards in the returned queue. Defaults to 20 if None.

    Returns
    -------
    List[Card]
        Ordered session queue containing unique cards, length <= session_size.
        Returns an empty list without error on an empty deck.
    """
    if not cards:
        return []

    if session_size is None:
        session_size = DEFAULT_SESSION_SIZE
    if session_size <= 0:
        return []

    now = now_utc()

    # Partition cards into priority tiers
    due_reviewed: List[Card] = []
    never_reviewed: List[Card] = []
    not_yet_due: List[Card] = []

    for card in cards:
        if card.next_due is None:
            never_reviewed.append(card)
        else:
            try:
                due_dt = parse_iso_datetime(card.next_due)
            except (ValueError, TypeError):
                # If unparseable date, treat as due immediately
                due_reviewed.append(card)
                continue

            if due_dt <= now:
                due_reviewed.append(card)
            else:
                not_yet_due.append(card)

    # Sort Tier 1: higher difficulty first (-difficulty), tie-break oldest next_due ascending
    due_reviewed.sort(
        key=lambda c: (
            -c.difficulty,
            parse_iso_datetime(c.next_due) if c.next_due else now,
        )
    )

    # Sort Tier 2: higher difficulty first (-difficulty)
    never_reviewed.sort(
        key=lambda c: -c.difficulty
    )

    # Sort Tier 3: soonest-due first (ascending next_due), tie-break higher difficulty
    not_yet_due.sort(
        key=lambda c: (
            parse_iso_datetime(c.next_due) if c.next_due else now,
            -c.difficulty,
        )
    )

    # Build queue without duplicates up to session_size
    selected: List[Card] = []
    seen_ids = set()

    for tier in (due_reviewed, never_reviewed, not_yet_due):
        for card in tier:
            if len(selected) >= session_size:
                break
            if card.id not in seen_ids:
                selected.append(card)
                seen_ids.add(card.id)
        if len(selected) >= session_size:
            break

    return selected[:session_size]
