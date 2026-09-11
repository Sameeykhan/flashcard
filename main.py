"""
Entry Point — main.py

Responsibility: Initialises the data/ directory and JSON files if missing,
launches the main menu loop, and handles graceful exit (Ctrl+C) without
corrupting data files.

NOT responsible for: any business logic, SRS math, card scheduling,
rendering, or persistence beyond bootstrapping the data files.
"""

from __future__ import annotations

import sys

from app import cards as card_manager
from app import progress as progress_tracker
from app import ui


def bootstrap() -> None:
    """Ensure data/ directory and JSON files exist with valid empty schemas."""
    # Calling load_cards / load_progress will auto-create the files if missing.
    card_manager.load_cards()
    progress_tracker.load_progress()


def main() -> None:
    """Application entry point — run the main menu loop."""
    bootstrap()

    while True:
        try:
            choice = ui.show_main_menu()
        except KeyboardInterrupt:
            ui.show_info("\nGoodbye!")
            sys.exit(0)

        if choice == "1":
            _run_session()
        elif choice == "2":
            _add_card()
        elif choice == "3":
            _manage_cards()
        elif choice == "4":
            _view_progress()
        elif choice == "5":
            _settings()
        elif choice in ("q", "Q"):
            ui.show_info("Goodbye!")
            sys.exit(0)


# ---------------------------------------------------------------------------
# Menu action handlers
# ---------------------------------------------------------------------------

def _run_session() -> None:
    """Start a study session."""
    from app import quiz
    try:
        result = quiz.start_session()
        # Results screen is shown inside start_session via ui.py
    except KeyboardInterrupt:
        ui.show_info("\nSession interrupted. Progress was saved.")
    except Exception as exc:
        ui.show_error(str(exc))


def _add_card() -> None:
    """Prompt for a new card and persist it."""
    try:
        data = ui.prompt_new_card()
        card = card_manager.add_card(
            question=data["question"],
            answer=data["answer"],
            language=data["language"],
            category=data["category"],
            tags=data["tags"],
        )
        ui.show_success(f"Card added (id: {card.id[:8]}…)")
    except KeyboardInterrupt:
        ui.show_info("Cancelled.")
    except ValueError as exc:
        ui.show_error(str(exc))


def _manage_cards() -> None:
    """Show the manage-cards sub-menu (list / edit / delete)."""
    try:
        all_cards = card_manager.list_cards()
        if not all_cards:
            ui.show_info("No cards yet. Add some first!")
            return
        ui.show_card_list(all_cards)

        from rich.prompt import Prompt
        action = Prompt.ask(
            "Action",
            choices=["edit", "delete", "back"],
            default="back",
        )
        if action == "back":
            return
        card_id = Prompt.ask("Card ID (paste full id)").strip()

        if action == "delete":
            removed = card_manager.delete_card(card_id)
            if removed:
                ui.show_success("Card deleted.")
            else:
                ui.show_error(f"No card found with id '{card_id}'.")

        elif action == "edit":
            target = next((c for c in all_cards if c.id == card_id), None)
            if target is None:
                ui.show_error(f"No card found with id '{card_id}'.")
                return
            updates = ui.prompt_edit_card(target)
            if updates:
                card_manager.edit_card(card_id, **updates)
                ui.show_success("Card updated.")
            else:
                ui.show_info("No changes made.")

    except KeyboardInterrupt:
        ui.show_info("Cancelled.")
    except (KeyError, ValueError) as exc:
        ui.show_error(str(exc))


def _view_progress() -> None:
    """Display aggregate progress statistics."""
    stats = progress_tracker.get_aggregate_stats()
    ui.show_progress(stats)


def _settings() -> None:
    """Placeholder for future settings screen."""
    ui.show_info("Settings coming soon.")


if __name__ == "__main__":
    main()
