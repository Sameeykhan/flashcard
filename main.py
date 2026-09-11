"""
Interactive Code Snippet Flashcard System — main.py

Responsibility:
- Ensures the data/ directory exists on startup.
- Self-heals and bootstraps flashcards.json and progress.json with valid empty schemas
  via safe load_cards() and load_progress() calls.
- Launches ui.py's main menu loop.
- Top-level exception boundaries:
  * Catches KeyboardInterrupt (Ctrl+C) and exits cleanly with a friendly goodbye message.
  * Catches any unhandled exception, logs the full traceback to debug.log, and displays
    a friendly message without leaking raw stack traces to the terminal.
"""

from __future__ import annotations

import os
import sys
import traceback
from datetime import datetime, timezone

from app import cards as card_manager
from app import progress as progress_tracker
from app import ui


def bootstrap() -> None:
    """Ensure data/ directory and JSON storage files exist with valid empty schemas."""
    os.makedirs("data", exist_ok=True)
    card_manager.load_cards()
    progress_tracker.load_progress()
    ui.load_settings()


def main() -> None:
    """Application entry point."""
    try:
        bootstrap()
        ui.main_menu_loop()
    except KeyboardInterrupt:
        ui.show_info("\nGoodbye! Thanks for studying with Code Flashcards.\n")
        sys.exit(0)
    except Exception as exc:
        timestamp = datetime.now(timezone.utc).isoformat()
        try:
            with open("debug.log", "a", encoding="utf-8") as fh:
                fh.write(f"\n[{timestamp}] Unhandled Exception: {exc}\n")
                traceback.print_exc(file=fh)
        except Exception:
            pass
        ui.show_error(f"Something went wrong: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
