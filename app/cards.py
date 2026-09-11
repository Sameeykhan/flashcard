"""
Card Manager — app/cards.py

Responsibility: CRUD operations on flashcards: load, add, edit, delete,
list by category/tag/language. Owns the Card dataclass and all JSON
persistence for flashcards.json. Writes are atomic (temp-file + os.replace).

NOT responsible for: SRS scheduling logic, session orchestration,
any UI rendering, importing Rich, or calling print()/input().
"""

from __future__ import annotations

import json
import os
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class Card:
    """Represents a single flashcard with all SRS metadata."""

    id: str
    question: str
    answer: str
    language: str
    category: str
    tags: List[str]
    difficulty: float = 1.0
    correct_count: int = 0
    wrong_count: int = 0
    last_reviewed: Optional[str] = None   # ISO-8601 or None
    next_due: Optional[str] = None        # ISO-8601 or None
    created_at: str = ""                  # ISO-8601, set once on creation
    interval_level: int = 0               # 0-indexed ladder level (0=1d, 1=3d, 2=7d, 3=14d, 4=30d)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _now_iso() -> str:
    """Return the current UTC time as an ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _empty_store() -> Dict[str, Any]:
    """Return the canonical empty flashcards.json structure."""
    return {"cards": []}


def _card_from_dict(d: Dict[str, Any]) -> Card:
    """Deserialise a dict (from JSON) into a Card dataclass instance."""
    return Card(
        id=d["id"],
        question=d["question"],
        answer=d["answer"],
        language=d.get("language", ""),
        category=d.get("category", ""),
        tags=d.get("tags", []),
        difficulty=float(d.get("difficulty", 1.0)),
        correct_count=int(d.get("correct_count", 0)),
        wrong_count=int(d.get("wrong_count", 0)),
        last_reviewed=d.get("last_reviewed"),
        next_due=d.get("next_due"),
        created_at=d.get("created_at", ""),
        interval_level=int(d.get("interval_level", 0)),
    )


def _ensure_dir(path: str) -> None:
    """Create the parent directory of *path* if it doesn't already exist."""
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

def load_cards(path: str = "data/flashcards.json") -> List[Card]:
    """Load all flashcards from *path*.

    If the file does not exist, is empty, or contains invalid JSON the file
    is (re-)created with ``{"cards": []}`` and an empty list is returned.
    This function never raises on a missing or corrupt file.

    Parameters
    ----------
    path:
        Filesystem path to ``flashcards.json``.

    Returns
    -------
    list[Card]
        All cards stored in the file, or an empty list.
    """
    _ensure_dir(path)
    try:
        with open(path, "r", encoding="utf-8") as fh:
            data = json.load(fh)
        return [_card_from_dict(c) for c in data.get("cards", [])]
    except (FileNotFoundError, json.JSONDecodeError, KeyError):
        # File missing or corrupt — recreate with empty structure.
        _write_json(path, _empty_store())
        return []


def save_cards(cards: List[Card], path: str = "data/flashcards.json") -> None:
    """Persist *cards* to *path* atomically.

    Writes to ``<path>.tmp`` first, then uses ``os.replace()`` to swap the
    temp file over the real file.  The on-disk file is never left in a
    partially-written state even if the process is killed mid-write.

    Parameters
    ----------
    cards:
        Full list of cards to persist (overwrites the existing file).
    path:
        Filesystem path to ``flashcards.json``.
    """
    _ensure_dir(path)
    store = {"cards": [asdict(c) for c in cards]}
    _write_json(path, store)


def _write_json(path: str, data: Dict[str, Any]) -> None:
    """Write *data* to *path* atomically via a temp file."""
    _ensure_dir(path)
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, ensure_ascii=False)
    os.replace(tmp_path, path)


# ---------------------------------------------------------------------------
# CRUD operations
# ---------------------------------------------------------------------------

def add_card(
    question: str,
    answer: str,
    language: str,
    category: str,
    tags: List[str],
    path: str = "data/flashcards.json",
) -> Card:
    """Create and persist a new flashcard.

    Validates that *question* and *answer* are non-empty after stripping
    whitespace.  Generates a UUID4 ``id`` and an ISO-8601 ``created_at``
    timestamp automatically.

    Parameters
    ----------
    question:
        The front of the card (may include a code snippet).
    answer:
        The back of the card (explanation or corrected snippet).
    language:
        Programming language tag, e.g. ``"python"``.
    category:
        Topic category, e.g. ``"decorators"``.
    tags:
        Arbitrary list of string tags.
    path:
        Path to ``flashcards.json``.

    Returns
    -------
    Card
        The newly created and persisted card.

    Raises
    ------
    ValueError
        If *question* or *answer* is empty after stripping whitespace.
    """
    if not question.strip():
        raise ValueError("Question must not be empty.")
    if not answer.strip():
        raise ValueError("Answer must not be empty.")

    card = Card(
        id=str(uuid.uuid4()),
        question=question.strip(),
        answer=answer.strip(),
        language=language.strip(),
        category=category.strip(),
        tags=[t.strip() for t in tags if t.strip()],
        created_at=_now_iso(),
    )
    cards = load_cards(path)
    cards.append(card)
    save_cards(cards, path)
    return card


def edit_card(card_id: str, path: str = "data/flashcards.json", **fields) -> Card:
    """Update fields on an existing card and persist the change.

    Only the keyword arguments provided in *fields* are modified; all other
    fields remain unchanged.

    Parameters
    ----------
    card_id:
        UUID of the card to edit.
    path:
        Path to ``flashcards.json``.
    **fields:
        Any subset of Card fields to update (e.g. ``question="new text"``).

    Returns
    -------
    Card
        The updated card.

    Raises
    ------
    KeyError
        If no card with *card_id* exists.
    ValueError
        If an updated ``question`` or ``answer`` is empty after strip.
    """
    cards = load_cards(path)
    for i, card in enumerate(cards):
        if card.id == card_id:
            for key, value in fields.items():
                if not hasattr(card, key):
                    raise ValueError(f"Card has no field '{key}'.")
                # Validate non-empty for question/answer
                if key in ("question", "answer"):
                    if not str(value).strip():
                        raise ValueError(f"'{key}' must not be empty.")
                    value = str(value).strip()
                setattr(card, key, value)
            cards[i] = card
            save_cards(cards, path)
            return card
    raise KeyError(f"No card found with id '{card_id}'.")


def delete_card(card_id: str, path: str = "data/flashcards.json") -> bool:
    """Remove a card by ID and persist the change.

    Parameters
    ----------
    card_id:
        UUID of the card to remove.
    path:
        Path to ``flashcards.json``.

    Returns
    -------
    bool
        ``True`` if the card was found and removed; ``False`` if no card
        with *card_id* existed (does **not** raise in this case).
    """
    cards = load_cards(path)
    original_len = len(cards)
    cards = [c for c in cards if c.id != card_id]
    if len(cards) == original_len:
        return False
    save_cards(cards, path)
    return True


def list_cards(
    category: Optional[str] = None,
    language: Optional[str] = None,
    tag: Optional[str] = None,
    path: str = "data/flashcards.json",
) -> List[Card]:
    """Return cards, optionally filtered.

    When multiple filters are provided they are combined with AND logic —
    a card must match all supplied filters to be included.

    Parameters
    ----------
    category:
        If given, only cards whose ``category`` matches (case-insensitive).
    language:
        If given, only cards whose ``language`` matches (case-insensitive).
    tag:
        If given, only cards that include *tag* in their ``tags`` list
        (case-insensitive).
    path:
        Path to ``flashcards.json``.

    Returns
    -------
    list[Card]
        Filtered (or full) list of cards.
    """
    cards = load_cards(path)

    if category is not None:
        cards = [c for c in cards if c.category.lower() == category.lower()]
    if language is not None:
        cards = [c for c in cards if c.language.lower() == language.lower()]
    if tag is not None:
        tag_lower = tag.lower()
        cards = [c for c in cards if tag_lower in [t.lower() for t in c.tags]]

    return cards
