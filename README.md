# Interactive Code Snippet Flashcard System

A command-line flashcard app for developers who want to actively memorise
code syntax, algorithms, and language idioms using **Spaced Repetition (SRS)**.
Built with Python 3.10+ and a polished terminal UI powered by [Rich](https://github.com/Textualize/rich).

---

## Features

- Create, edit, delete, and filter flashcards containing code snippets.
- Syntax-highlighted code display in the terminal (uses the card's `language` field).
- Spaced Repetition System — harder cards reappear sooner and more often.
- Per-session results screen (score, accuracy %, time taken, weak cards).
- Progress tracking across sessions (streak, mastery breakdown, most-missed cards).
- Atomic JSON writes — data is never corrupted by a mid-write crash.
- Fully layered architecture — core logic is UI-agnostic and reusable.

---

## Installation

```bash
# 1. Clone or download the project
cd interactive-flashcards

# 2. (Recommended) Create a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Usage

```bash
python main.py
```

You'll see the main menu:

```
── Interactive Code Flashcards ──

  1  Start Study Session
  2  Add Card
  3  Manage Cards  (edit / delete / list)
  4  View Progress & Stats
  5  Settings
  q  Quit
```

### Keyboard shortcuts during a session

| Key | Action |
|-----|--------|
| ENTER | Reveal the answer |
| `y` or `1` | Mark card as correct |
| `n` or `2` | Mark card as wrong (card is re-shown later in the same session) |
| Ctrl+C | Interrupt — progress is saved |

---

## Running the tests

```bash
python -m pytest tests/ -v
```

All core logic modules (`cards.py`, `srs.py`, `progress.py`, `quiz.py`)
have passing unit tests and contain **no Rich imports** — they are fully
independent of the UI layer.

---

## Project Structure

```
interactive-flashcards/
├── main.py              # Entry point — bootstraps data files, runs menu loop
├── app/
│   ├── cards.py         # Card CRUD + atomic JSON persistence
│   ├── srs.py           # Spaced repetition logic (pure functions)
│   ├── progress.py      # Session + card-stats recording and aggregation
│   ├── quiz.py          # Session orchestration (calls srs, cards, progress, ui)
│   └── ui.py            # All Rich rendering (the ONLY file that imports Rich)
├── data/
│   ├── flashcards.json  # Card storage
│   └── progress.json    # Session history + per-card stats
├── tests/
│   ├── test_cards.py
│   ├── test_srs.py
│   ├── test_progress.py
│   └── test_quiz.py
└── requirements.txt
```

---

## SRS Design Decisions (v1)

| Question | Decision | Reason |
|---|---|---|
| Algorithm | Simple leveled intervals: 1 → 3 → 7 → 14 → 30 days | Transparent, easy to test; SM-2 deferred to v2 |
| Wrong answer handling | Re-inserted into the **same session** queue | Immediate reinforcement; no extra scheduling complexity |
| Default session size | **20 cards** | ~10–15 min session; configurable |

**Difficulty weight:** starts at `1.0`. Each wrong answer multiplies by `1.5`
(capped at `5.0`). Each correct answer multiplies by `0.7` (floored at `0.1`).
Higher-difficulty cards are sampled more frequently when building the session queue.

---

## Architecture

```
USER
  ↓
ui.py          ← only file that imports Rich / calls input()
  ↓
quiz.py        ← session orchestration, no rendering
  ↓
cards.py  │  srs.py  │  progress.py   ← pure logic, no UI dependency
  ↓
data/flashcards.json + data/progress.json
```

The core modules (`cards`, `srs`, `progress`) can be imported by a Flask/FastAPI
backend or a desktop GUI without any modification — just swap `ui.py` for a
different front-end.

---

## Data Format

### `data/flashcards.json`

```json
{
  "cards": [
    {
      "id": "uuid-string",
      "question": "What does @staticmethod do?",
      "answer": "Defines a method with no implicit self/cls argument.",
      "language": "python",
      "category": "decorators",
      "tags": ["python", "oop"],
      "difficulty": 1.0,
      "correct_count": 0,
      "wrong_count": 0,
      "last_reviewed": null,
      "next_due": null,
      "created_at": "2026-09-11T00:00:00+00:00"
    }
  ]
}
```

### `data/progress.json`

```json
{
  "sessions": [
    {
      "id": "uuid",
      "date": "2026-09-11T00:00:00+00:00",
      "cards_studied": 20,
      "correct": 17,
      "wrong": 3,
      "accuracy": 0.85,
      "duration_seconds": 312.5
    }
  ],
  "card_stats": {
    "<card-id>": {
      "attempts": 5,
      "correct": 4,
      "wrong": 1,
      "last_reviewed": "2026-09-11T00:00:00+00:00"
    }
  }
}
```
