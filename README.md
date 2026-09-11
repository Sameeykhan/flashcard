# Interactive Code Snippet Flashcard System

An interactive command-line flashcard application designed specifically for software developers and programmers who want to actively master language syntax, algorithms, data structures, and idioms using an evidence-based **Spaced Repetition System (SRS)**. Built with Python 3.10+ and an aesthetically crafted terminal interface powered by [Rich](https://github.com/Textualize/rich), the system reinforces memory retention by scheduling challenging cards more frequently and stepping mastered concepts further into the future.

---

## Features

- **Full Flashcard Lifecycle**: Create, list, edit, and delete flashcards with support for multi-line code snippets, language identifiers, categories, and tags.
- **Syntax-Highlighted Code Display**: Automatic syntax highlighting for fenced code blocks and raw snippets (Python, JavaScript, TypeScript, Go, Rust, SQL, and more) powered by Pygments themes.
- **Spaced Repetition Engine (SRS)**: Adaptive scheduling using an interval ladder (`1 → 3 → 7 → 14 → 30` days) combined with dynamic difficulty weighting (`0.1` to `10.0`) and instant regression reset.
- **Interactive Quiz Orchestration**: Real-time study sessions featuring live score headers, progressive answer reveal, single-keypress self-grading (`y`/`1` vs `n`/`2`), and end-of-session performance breakdowns.
- **Comprehensive Analytics & Progress Tracking**: Dual-tracked audit logging tracking overall accuracy %, daily study streaks (`🔥`), deck mastery breakdowns (`Mastered`, `Learning`, `New`), and top most-missed cards.
- **Configurable Settings**: Customizable default study session sizes stored in `data/settings.json`.
- **Zero-Corruption Atomic Persistence**: All disk writes utilize the temp-file + `os.replace()` pattern, ensuring data integrity even if the process is killed mid-write.
- **Strict Decoupled Architecture**: 100% UI-agnostic core logic (`cards.py`, `srs.py`, `progress.py`, `quiz.py`) with zero Rich or I/O dependencies, allowing seamless future front-end integrations.

---

## Installation

```bash
# 1. Clone or download the repository
git clone https://github.com/Sameeykhan/flashcard.git
cd flashcard/interactive-flashcards

# 2. (Recommended) Create and activate a Python virtual environment
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS / Linux:
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Usage

Launch the application with:

```bash
python main.py
```

### Main Menu Navigation

Upon starting, you will be greeted by the main dashboard:

```text
── Interactive Code Flashcards ──

  1  Start Study Session       Review cards scheduled by Spaced Repetition
  2  Add Card                  Create a new code syntax or algorithm flashcard
  3  Manage Cards              List, edit, or delete existing flashcards
  4  View Progress & Stats     Check accuracy, study streaks, and mastery breakdown
  5  Settings                  Configure default session size
  6  Exit                      Save state and quit application (or press 'q')
```

### Study Session Controls

During a live review session:
- **Reveal Answer**: Press `ENTER` to reveal the solution and syntax-highlighted code.
- **Self-Grade**:
  - `y` or `1`: Mark card as **Correct** (advances ladder interval, decreases difficulty).
  - `n` or `2`: Mark card as **Missed** (resets interval to 1 day, increases difficulty).
- **Graceful Pause**: Press `Ctrl+C` at any point to exit safely; partial session progress is saved immediately.

---

## How the Spaced Repetition Works

The Spaced Repetition System prioritizes flashcards based on urgency and difficulty to maximize memory retention with minimal review time. 

1. **The Interval Ladder**: Flashcards move through a 5-stage interval ladder (`[1, 3, 7, 14, 30]` days). Each time you answer a card correctly, its review interval advances to the next step on the ladder, and its difficulty weight decreases by 30% ($\times 0.7$, floored at `0.1`).
2. **Regression Reset**: If you miss a card, its interval immediately resets back to Level 0 (1 day) to prevent knowledge regression, and its difficulty increases by 50% ($\times 1.5$, capped at `10.0`).
3. **Queue Prioritization**: When building a study session, the app prioritizes cards that are currently due (`next_due <= now`), ordered with the highest-difficulty cards first. If there are fewer due cards than the requested session size, unreviewed new cards are pulled in next, followed by upcoming future cards scheduled soonest.

---

## Project Structure

```text
interactive-flashcards/
├── main.py                  # Application entry point, bootstrap & top-level error boundaries
├── requirements.txt         # Minimal production dependencies (rich>=13.0.0)
├── README.md                # Comprehensive documentation
├── app/
│   ├── __init__.py          # Package initialization
│   ├── cards.py             # Card dataclass, validation, CRUD & atomic JSON persistence
│   ├── srs.py               # Pure spaced repetition logic (ladder math, queue priority)
│   ├── progress.py          # Session audit logging, streak & deck aggregate stats
│   ├── quiz.py              # QuizSession engine orchestrating cards, SRS & progress
│   └── ui.py                # Exclusive Rich presentation layer, menus & input handlers
├── data/
│   ├── flashcards.json      # Flashcard deck store
│   ├── progress.json        # Historical sessions and per-card performance statistics
│   └── settings.json        # User preferences (default session size)
├── tests/
│   ├── __init__.py          # Test package initialization
│   ├── test_cards.py        # 39 tests: CRUD, filtering, validation, atomic saves
│   ├── test_srs.py          # 36 tests: ladder progression, regression, queue sorting
│   ├── test_progress.py     # 19 tests: streak calculations, stats aggregation, resilience
│   └── test_quiz.py         # 16 tests: full lifecycle, empty deck safety, filter checks
└── scripts/
    └── stress_test.py       # Standalone scale benchmark (500 cards, throughput timing)
```

---

## Design Decisions

- **SRS Algorithm Style**: Leveled intervals (`[1, 3, 7, 14, 30]` days) were chosen over full SM-2 for v1. This provides a transparent, deterministic learning curve that is easy to understand, debug, and test while remaining faithful to spaced learning science.
- **Same-Session vs. Future-Session Re-insertion**: During review, incorrect cards are flagged for immediate retention and scheduled for next-day review (`now + 1 day`). `QuizSession` supports optional same-session tail re-insertion via `reinsert_wrong=True`.
- **Default Session Size**: Standardized to **20 cards** (~10–15 minutes of focused review). Users can adjust this default via the interactive Settings menu or programmatically via the `QuizSession(session_size=...)` parameter.
- **Card Schema Evolution (`interval_level`)**: Added an explicit `interval_level: int = 0` field to the `Card` dataclass. While `correct_count` tracks lifetime successes, it cannot distinguish whether a card with 10 correct answers was just reset following an error. Adding `interval_level` guarantees accurate progression along the `[1, 3, 7, 14, 30]` ladder while maintaining full backward-compatibility with older deck files.
- **Dual-Tracking Architecture**:
  - `data/flashcards.json`: Stores active, mutable SRS state (`difficulty`, `interval_level`, `next_due`, `last_reviewed`).
  - `data/progress.json`: Stores an append-only historical audit log of every study session (`sessions`) and cumulative per-card counters (`card_stats`), isolating lifetime analytics from card edits or deck resets.
- **Atomic Persistence**: Both `cards.py` and `progress.py` write to a temporary file (`.tmp`) before calling `os.replace()`. This guarantees that unexpected shutdowns or crashes never leave JSON files partially written or corrupted.
- **Strict Presentation Boundary**: Rich imports and `print()`/`input()` calls are strictly quarantined within `app/ui.py`. The business and algorithmic modules (`cards`, `srs`, `progress`, `quiz`) contain zero UI dependencies.

---

## Running the Tests

Execute the complete test suite using `pytest`:

```bash
python -m pytest -v
```

All 110 unit tests run across isolated `tmp_path` fixtures without touching production data files in `data/`.

---

## Future Roadmap

The codebase was architected from day one with a clean separation between the presentation tier (`ui.py`) and the core domain engines (`quiz.py`, `cards.py`, `srs.py`, `progress.py`):
1. **Web & GUI Frontends**: Because core logic is decoupled from terminal I/O, `ui.py` can be seamlessly replaced or supplemented by a FastAPI / Flask REST API, a Next.js / React web interface, or a desktop GUI (PyQt/Textual) without altering a single line of scheduling or progress logic.
2. **SQLite Storage Backend**: While atomic JSON persistence is lightweight and zero-dependency for up to thousands of cards, migrating to an embedded SQLite database using the same dataclass models is straightforward for multi-user deployments.
3. **Advanced SM-2 / FSRS Algorithms**: The modular design of `app/srs.py` allows dropping in more advanced algorithms (such as SuperMemo SM-2 or Free Spaced Repetition Scheduler FSRS) by updating `update_on_correct` and `update_on_wrong` without touching the quiz orchestration or card storage layers.
