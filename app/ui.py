"""
UI Layer — app/ui.py

Responsibility: All Rich-based terminal rendering — main menu, flashcard panels,
syntax highlighting, answer reveal, live score headers, session results summary,
card management (add/edit/delete/list), progress visualization, settings, and
friendly error boundaries.

Hard constraints:
- This is the ONLY file in the entire project allowed to import Rich or call print()/input().
- Every other module (cards.py, srs.py, progress.py, quiz.py) remains pure.
- All exceptions raised by core modules are caught and rendered as clean Rich messages.
- Consistent color palette reused throughout.
"""

from __future__ import annotations

import json
import os
import sys
from typing import TYPE_CHECKING, Any, Dict, List, Optional

from rich import box
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Confirm, Prompt
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text

from app import cards as card_manager
from app import progress as progress_tracker
from app.quiz import QuizSession

if TYPE_CHECKING:
    from app.cards import Card
    from app.progress import AggregateStats

console = Console()

# ---------------------------------------------------------------------------
# Consistent Color Palette & Design Tokens
# ---------------------------------------------------------------------------
CLR_BRAND: str = "bold cyan"
CLR_CORRECT: str = "bold green"
CLR_WRONG: str = "bold red"
CLR_MUTED: str = "dim white"
CLR_ACCENT: str = "bold yellow"
CLR_INFO: str = "cyan"
CLR_HEADER: str = "bold cyan"

SETTINGS_PATH: str = "data/settings.json"
DEFAULT_SESSION_SIZE: int = 20


# ---------------------------------------------------------------------------
# Settings Persistence
# ---------------------------------------------------------------------------

def load_settings(path: str = SETTINGS_PATH) -> Dict[str, Any]:
    """Load settings from path with safe fallback defaults.

    Parameters
    ----------
    path:
        Path to settings JSON file.

    Returns
    -------
    dict
        Settings dictionary containing 'session_size'.
    """
    try:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
                if isinstance(data, dict):
                    size = int(data.get("session_size", DEFAULT_SESSION_SIZE))
                    return {"session_size": max(1, min(size, 200))}
        else:
            default_settings = {"session_size": DEFAULT_SESSION_SIZE}
            save_settings(default_settings, path)
            return default_settings
    except Exception:
        pass
    return {"session_size": DEFAULT_SESSION_SIZE}


def save_settings(settings: Dict[str, Any], path: str = SETTINGS_PATH) -> None:
    """Save settings atomically via a temporary file.

    Parameters
    ----------
    settings:
        Settings dictionary to write.
    path:
        Filesystem path to settings JSON.
    """
    parent = os.path.dirname(path)
    if parent:
        os.makedirs(parent, exist_ok=True)
    tmp_path = path + ".tmp"
    with open(tmp_path, "w", encoding="utf-8") as fh:
        json.dump(settings, fh, indent=2)
    os.replace(tmp_path, path)


# ---------------------------------------------------------------------------
# Visual Formatting Helpers
# ---------------------------------------------------------------------------

def _rule(title: str = "") -> None:
    """Print a styled horizontal dividing rule."""
    console.rule(f"[{CLR_BRAND}]{title}[/{CLR_BRAND}]")


def _looks_like_code(text: str) -> bool:
    """Determine if a text string looks like a code snippet."""
    indicators = [
        "\n    ", "\n\t", "def ", "function ", "const ", "let ",
        "var ", "return ", "class ", "import ", "from ", "->", "=>",
        "{}", "[]", ";", "public ", "private ", "SELECT ", "fn ",
    ]
    return any(ind in text for ind in indicators)


def _render_content_panel(text: str, language: str, title: str, border_style: str = "cyan") -> Panel:
    """Render question or answer content with syntax highlighting inside a Panel.

    Handles markdown fenced code blocks (```) as well as raw code snippets.
    """
    clean_text = text.strip()
    target_lang = language.strip().lower() if language else ""
    if target_lang in ("text", "general", "none", "—", "-"):
        target_lang = ""

    # 1. Check for fenced code block: ```python ... ```
    if "```" in clean_text:
        parts = clean_text.split("```")
        if len(parts) >= 3:
            code_block = parts[1]
            first_line, _, rest_of_code = code_block.partition("\n")
            detected_lang = first_line.strip().lower()
            if detected_lang and not any(c in detected_lang for c in " \t()[]{};:"):
                target_lang = detected_lang
                code_content = rest_of_code
            else:
                code_content = code_block

            preamble = parts[0].strip()
            postamble = "```".join(parts[2:]).strip()

            try:
                syntax = Syntax(code_content.strip(), target_lang or "python", theme="monokai", word_wrap=True)
                # Combine into a group if there is preamble text
                if preamble:
                    combined_renderable = Console().render_str(f"{preamble}\n\n")
                return Panel(syntax, title=f"[bold]{title}[/bold]", border_style=border_style, padding=(1, 2))
            except Exception:
                pass

    # 2. Syntax highlight if language is set or content heuristic indicates code
    if target_lang or _looks_like_code(clean_text):
        lang_to_use = target_lang if target_lang else "python"
        try:
            syntax = Syntax(clean_text, lang_to_use, theme="monokai", word_wrap=True)
            return Panel(syntax, title=f"[bold]{title}[/bold]", border_style=border_style, padding=(1, 2))
        except Exception:
            pass

    # 3. Fallback to clean text Panel
    return Panel(Text(clean_text), title=f"[bold]{title}[/bold]", border_style=border_style, padding=(1, 2))


def _multiline_input(prompt_label: str) -> str:
    """Collect multi-line input until the user enters a blank line or 'END'.

    Parameters
    ----------
    prompt_label:
        Prompt title displayed to the user.

    Returns
    -------
    str
        The concatenated multi-line string.
    """
    console.print(f"  [bold cyan]{prompt_label}[/bold cyan] [dim](press ENTER on empty line or type 'END' to finish)[/dim]:")
    lines: List[str] = []
    while True:
        try:
            line = input()
        except (KeyboardInterrupt, EOFError):
            break
        stripped = line.strip()
        if stripped.upper() == "END":
            break
        if line == "" and lines:
            break
        if line == "" and not lines:
            # Allow immediate blank line if user wants empty
            break
        lines.append(line)
    return "\n".join(lines).strip()


# ---------------------------------------------------------------------------
# Notification Messages
# ---------------------------------------------------------------------------

def show_error(message: str) -> None:
    """Display an error message inside a red-bordered Panel."""
    console.print()
    console.print(Panel(f"[{CLR_WRONG}]{message}[/{CLR_WRONG}]", title="[bold red]Error[/bold red]", border_style="red"))
    console.print()


def show_success(message: str) -> None:
    """Display a success message inside a green-bordered Panel."""
    console.print()
    console.print(Panel(f"[{CLR_CORRECT}]{message}[/{CLR_CORRECT}]", title="[bold green]Success[/bold green]", border_style="green"))
    console.print()


def show_info(message: str) -> None:
    """Display an informational muted message."""
    console.print(f"[{CLR_MUTED}]{message}[/{CLR_MUTED}]")


# ---------------------------------------------------------------------------
# 1. Main Menu
# ---------------------------------------------------------------------------

def show_main_menu() -> str:
    """Render the Main Menu table and return the user's choice string."""
    console.clear()
    _rule("Interactive Code Flashcards")
    console.print()

    table = Table(box=box.ROUNDED, border_style="cyan", show_header=False, padding=(0, 2))
    table.add_column("Key", style="bold cyan", justify="center")
    table.add_column("Option", style="bold white")
    table.add_column("Description", style="dim")

    table.add_row("1", "Start Study Session", "Review cards scheduled by Spaced Repetition")
    table.add_row("2", "Add Card", "Create a new code syntax or algorithm flashcard")
    table.add_row("3", "Manage Cards", "List, edit, or delete existing flashcards")
    table.add_row("4", "View Progress & Stats", "Check accuracy, study streaks, and mastery breakdown")
    table.add_row("5", "Settings", "Configure default session size")
    table.add_row("6", "Exit", "Save state and quit application (or press 'q')")

    console.print(table)
    console.print()

    valid_choices = {"1", "2", "3", "4", "5", "6", "q", "Q"}
    while True:
        try:
            choice = Prompt.ask("[bold cyan]Choose an option[/bold cyan]").strip()
        except (KeyboardInterrupt, EOFError):
            return "6"
        if choice in valid_choices:
            return "6" if choice in ("q", "Q") else choice
        console.print(f"[{CLR_WRONG}]Invalid choice — please select 1 to 6 or 'q'.[/{CLR_WRONG}]")


def main_menu_loop() -> None:
    """Main menu loop driving application screens."""
    while True:
        choice = show_main_menu()
        if choice == "1":
            run_study_session_flow()
        elif choice == "2":
            add_card_flow()
        elif choice == "3":
            manage_cards_flow()
        elif choice == "4":
            view_progress_flow()
        elif choice == "5":
            settings_flow()
        elif choice == "6":
            console.clear()
            show_info("Goodbye! Thanks for learning with Code Flashcards.\n")
            break


# ---------------------------------------------------------------------------
# 2 & 3. Flashcard Study Session Flow
# ---------------------------------------------------------------------------

def show_question(card: "Card", current: int, total: int, score: int) -> None:
    """Render the question side of a flashcard with score header and syntax highlighting."""
    console.clear()
    lang_display = card.language.upper() if card.language else "CODE"
    cat_display = f" • {card.category}" if card.category else ""

    header_text = (
        f"[{CLR_MUTED}]Card [bold cyan]{current}[/bold cyan] of [bold cyan]{total}[/bold cyan][/{CLR_MUTED}]    "
        f"[{CLR_CORRECT}]Score: {score}[/{CLR_CORRECT}]    "
        f"[{CLR_ACCENT}]{lang_display}{cat_display}[/{CLR_ACCENT}]"
    )
    console.print(header_text)
    console.print()

    console.print(_render_content_panel(card.question, card.language, "Question", border_style="cyan"))


def prompt_answer_reveal() -> None:
    """Prompt the user to press ENTER to reveal the flashcard answer."""
    console.print()
    console.print(f"  [{CLR_MUTED}]Press [bold white]ENTER[/bold white] to reveal the answer…[/{CLR_MUTED}]", end="")
    try:
        input()
    except (KeyboardInterrupt, EOFError):
        pass


def show_answer(card: "Card") -> None:
    """Reveal the answer side of a flashcard with syntax highlighting."""
    console.print()
    console.print(_render_content_panel(card.answer, card.language, "Answer", border_style="green"))


def prompt_correct_or_wrong() -> bool:
    """Collect self-graded feedback: 'y'/'1' for correct, 'n'/'2' for wrong."""
    console.print()
    console.print(
        f"  [{CLR_CORRECT}][y / 1] Got it[/{CLR_CORRECT}]    "
        f"  [{CLR_WRONG}][n / 2] Missed it[/{CLR_WRONG}]"
    )
    yes_answers = {"y", "1", "yes", "t", "true"}
    no_answers = {"n", "2", "no", "f", "false"}

    while True:
        try:
            raw = input("  Self-grade: ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            return False
        if raw in yes_answers:
            return True
        if raw in no_answers:
            return False
        console.print(f"  [{CLR_WRONG}]Please enter 'y' / '1' (correct) or 'n' / '2' (wrong).[/{CLR_WRONG}]")


def run_study_session_flow() -> None:
    """Run an interactive study session driven by QuizSession."""
    settings = load_settings()
    session_size = settings.get("session_size", DEFAULT_SESSION_SIZE)

    try:
        session = QuizSession(session_size=session_size)
    except Exception as exc:
        show_error(f"Could not initialise study session: {exc}")
        input("Press ENTER to return to the menu…")
        return

    if not session.has_next():
        console.clear()
        _rule("Study Session")
        console.print()
        console.print("[dim]No flashcards are currently due for review or deck is empty![/dim]\n")
        console.print("  [cyan]Tip:[/cyan] Add new cards from the main menu or wait until due dates arrive.")
        console.print()
        try:
            input("Press ENTER to return to the menu…")
        except (KeyboardInterrupt, EOFError):
            pass
        return

    # Study loop
    try:
        while session.has_next():
            card = session.current_card()
            curr_idx = session.index + 1
            total_cards = session.total_cards
            curr_score = session.score

            show_question(card, curr_idx, total_cards, curr_score)
            prompt_answer_reveal()
            show_answer(card)

            correct = prompt_correct_or_wrong()
            session.submit_answer(correct)

        results = session.end_session()
        show_session_results(results, results.get("hardest_cards", []))

    except KeyboardInterrupt:
        console.print("\n\n[yellow]Session paused. Saving current progress…[/yellow]")
        results = session.end_session()
        show_info(f"Progress recorded ({results['cards_studied']} cards studied).")
        try:
            input("Press ENTER to return to the menu…")
        except (KeyboardInterrupt, EOFError):
            pass


# ---------------------------------------------------------------------------
# 4. Session Results Screen
# ---------------------------------------------------------------------------

def show_session_results(result: Any, hardest_cards: Optional[List["Card"]] = None) -> None:
    """Display the end-of-session summary screen with hardest cards breakdown."""
    console.clear()
    _rule("Session Complete")
    console.print()

    # Summary table
    table = Table(box=box.ROUNDED, border_style="cyan", show_header=True, header_style="bold cyan")
    table.add_column("Metric", style="bold white")
    table.add_column("Value", justify="right", style="bold")

    duration = float(result.get("duration_seconds", getattr(result, "duration_seconds", 0.0)))
    mins, secs = divmod(int(duration), 60)
    time_str = f"{mins}m {secs:02d}s" if mins > 0 else f"{secs}s"

    cards_studied = result.get("cards_studied", getattr(result, "cards_studied", 0))
    correct = result.get("correct_count", getattr(result, "correct", 0))
    wrong = result.get("wrong_count", getattr(result, "wrong", 0))
    accuracy_pct = result.get("accuracy_pct", 0.0)

    table.add_row("Cards Studied", str(cards_studied))
    table.add_row("Correct", f"[{CLR_CORRECT}]{correct}[/{CLR_CORRECT}]")
    table.add_row("Wrong", f"[{CLR_WRONG}]{wrong}[/{CLR_WRONG}]")
    table.add_row("Accuracy", f"[{CLR_ACCENT}]{accuracy_pct:.1f}%[/{CLR_ACCENT}]")
    table.add_row("Time Taken", time_str)

    console.print(table)

    # Hardest cards list / table
    weak = hardest_cards or result.get("hardest_cards", result.get("weak_cards", []))
    if weak:
        console.print()
        console.print(f"[{CLR_ACCENT}]Hardest Cards from this Session:[/{CLR_ACCENT}]")
        hard_table = Table(box=box.SIMPLE_HEAVY, border_style="red", show_header=True, header_style="bold red")
        hard_table.add_column("ID", style="dim", width=10)
        hard_table.add_column("Question Preview", style="white")
        hard_table.add_column("Difficulty", justify="right", style="yellow")
        hard_table.add_column("Missed", justify="right", style="bold red")

        for card in weak[:5]:
            q_line = card.question.split("\n")[0][:60]
            if len(card.question) > 60:
                q_line += "…"
            hard_table.add_row(
                card.id[:8],
                q_line,
                f"{card.difficulty:.2f}",
                str(card.wrong_count),
            )
        console.print(hard_table)
    else:
        console.print()
        console.print(f"[{CLR_CORRECT}]★ Outstanding! Perfect session with no missed cards.[/{CLR_CORRECT}]")

    console.print()
    try:
        input("Press ENTER to return to the main menu…")
    except (KeyboardInterrupt, EOFError):
        pass


def run_study_session(session: Any) -> Dict[str, Any]:
    """Compatibility driver for external QuizSession runners."""
    total = getattr(session, "total_cards", len(getattr(session, "queue", [])))
    while session.has_next():
        card = session.current_card()
        idx = getattr(session, "index", 0) + 1
        score = getattr(session, "score", 0)

        show_question(card, idx, total, score)
        prompt_answer_reveal()
        show_answer(card)
        correct = prompt_correct_or_wrong()
        session.submit_answer(correct)

    results = session.end_session()
    weak = results.get("hardest_cards", results.get("weak_cards", []))
    show_session_results(results, weak)
    return results


# ---------------------------------------------------------------------------
# 5. Card Management Screens (List / Add / Edit / Delete)
# ---------------------------------------------------------------------------

def manage_cards_flow() -> None:
    """Sub-menu for managing flashcards."""
    while True:
        console.clear()
        _rule("Manage Flashcards")
        console.print()

        table = Table(box=box.ROUNDED, border_style="cyan", show_header=False, padding=(0, 2))
        table.add_column("Key", style="bold cyan", justify="center")
        table.add_column("Option", style="bold white")
        table.add_row("1", "List all flashcards")
        table.add_row("2", "Add a new flashcard")
        table.add_row("3", "Edit an existing flashcard")
        table.add_row("4", "Delete a flashcard")
        table.add_row("b", "Back to main menu")

        console.print(table)
        console.print()

        try:
            choice = Prompt.ask("[bold cyan]Select an action[/bold cyan]").strip().lower()
        except (KeyboardInterrupt, EOFError):
            break

        if choice == "1":
            cards = card_manager.load_cards()
            console.clear()
            _rule("All Flashcards")
            console.print()
            show_card_list(cards)
            console.print()
            try:
                input("Press ENTER to return…")
            except (KeyboardInterrupt, EOFError):
                pass
        elif choice == "2":
            add_card_flow()
        elif choice == "3":
            edit_card_flow()
        elif choice == "4":
            delete_card_flow()
        elif choice in ("b", "back", "q", "quit"):
            break


def show_card_list(cards: List["Card"]) -> None:
    """Render a styled table of flashcards."""
    if not cards:
        console.print("[dim]No flashcards in the deck yet. Use option [2] to add one![/dim]")
        return

    table = Table(
        "ID", "Language", "Category", "Tags", "Difficulty", "Question Preview",
        box=box.ROUNDED, border_style="cyan", show_header=True, header_style="bold cyan",
    )
    for card in cards:
        preview = card.question.split("\n")[0][:45]
        if len(card.question) > 45:
            preview += "…"
        tags_str = ", ".join(card.tags[:3]) if card.tags else "—"
        table.add_row(
            f"[dim]{card.id[:8]}[/dim]",
            card.language or "—",
            card.category or "—",
            tags_str,
            f"{card.difficulty:.2f}",
            preview,
        )
    console.print(table)


def add_card_flow() -> None:
    """Interactive flow to create and persist a new card."""
    console.clear()
    _rule("Add New Flashcard")
    console.print()

    question = _multiline_input("Question / Code Snippet")
    if not question:
        show_error("Card creation cancelled: Question cannot be empty.")
        try:
            input("Press ENTER to continue…")
        except (KeyboardInterrupt, EOFError):
            pass
        return

    answer = _multiline_input("Answer / Solution / Explanation")
    if not answer:
        show_error("Card creation cancelled: Answer cannot be empty.")
        try:
            input("Press ENTER to continue…")
        except (KeyboardInterrupt, EOFError):
            pass
        return

    try:
        language = Prompt.ask("  [bold cyan]Language[/bold cyan]", default="python").strip()
        category = Prompt.ask("  [bold cyan]Category[/bold cyan]", default="general").strip()
        raw_tags = Prompt.ask("  [bold cyan]Tags (comma-separated)[/bold cyan]", default="").strip()
        tags = [t.strip() for t in raw_tags.split(",") if t.strip()]

        new_card = card_manager.add_card(
            question=question,
            answer=answer,
            language=language,
            category=category,
            tags=tags,
        )
        show_success(f"Flashcard created successfully! (ID: {new_card.id[:8]}…)")
    except ValueError as exc:
        show_error(f"Validation Error: {exc}")
    except Exception as exc:
        show_error(f"Failed to add card: {exc}")

    try:
        input("Press ENTER to continue…")
    except (KeyboardInterrupt, EOFError):
        pass


def edit_card_flow() -> None:
    """Interactive flow to edit an existing flashcard."""
    cards = card_manager.load_cards()
    if not cards:
        show_error("No cards exist to edit. Add cards first!")
        input("Press ENTER to continue…")
        return

    console.clear()
    _rule("Edit Flashcard")
    console.print()
    show_card_list(cards)
    console.print()

    try:
        target_id_raw = Prompt.ask("[bold cyan]Enter Card ID (or initial prefix)[/bold cyan]").strip()
    except (KeyboardInterrupt, EOFError):
        return

    if not target_id_raw:
        return

    # Match exact or prefix ID
    matched = [c for c in cards if c.id == target_id_raw or c.id.startswith(target_id_raw)]
    if not matched:
        show_error(f"No card found matching ID prefix '{target_id_raw}'.")
        input("Press ENTER to continue…")
        return

    card = matched[0]
    console.print()
    console.print(f"[bold cyan]Editing Card [yellow]{card.id[:8]}[/yellow][/bold cyan] [dim](press ENTER to keep current value)[/dim]:\n")

    try:
        new_q = Prompt.ask("  Question", default=card.question)
        new_a = Prompt.ask("  Answer", default=card.answer)
        new_lang = Prompt.ask("  Language", default=card.language)
        new_cat = Prompt.ask("  Category", default=card.category)
        curr_tags = ", ".join(card.tags)
        new_tags_raw = Prompt.ask("  Tags (comma-separated)", default=curr_tags)
        new_tags = [t.strip() for t in new_tags_raw.split(",") if t.strip()]

        updates: Dict[str, Any] = {}
        if new_q != card.question:
            updates["question"] = new_q
        if new_a != card.answer:
            updates["answer"] = new_a
        if new_lang != card.language:
            updates["language"] = new_lang
        if new_cat != card.category:
            updates["category"] = new_cat
        if set(new_tags) != set(card.tags):
            updates["tags"] = new_tags

        if updates:
            card_manager.edit_card(card.id, **updates)
            show_success("Flashcard updated successfully!")
        else:
            show_info("No changes made.")
    except ValueError as exc:
        show_error(f"Validation Error: {exc}")
    except Exception as exc:
        show_error(f"Failed to edit card: {exc}")

    try:
        input("Press ENTER to continue…")
    except (KeyboardInterrupt, EOFError):
        pass


def delete_card_flow() -> None:
    """Interactive flow to delete a flashcard with confirmation."""
    cards = card_manager.load_cards()
    if not cards:
        show_error("No cards exist to delete.")
        input("Press ENTER to continue…")
        return

    console.clear()
    _rule("Delete Flashcard")
    console.print()
    show_card_list(cards)
    console.print()

    try:
        target_id_raw = Prompt.ask("[bold red]Enter Card ID to delete[/bold red]").strip()
    except (KeyboardInterrupt, EOFError):
        return

    if not target_id_raw:
        return

    matched = [c for c in cards if c.id == target_id_raw or c.id.startswith(target_id_raw)]
    if not matched:
        show_error(f"No card found matching ID prefix '{target_id_raw}'.")
        input("Press ENTER to continue…")
        return

    card = matched[0]
    preview = card.question.split("\n")[0][:60]
    console.print(f"\n[bold red]Selected for deletion:[/bold red] {card.id[:8]} — [dim]{preview}[/dim]")

    if Confirm.ask(f"[bold red]Are you sure you want to permanently delete this card?[/bold red]", default=False):
        try:
            removed = card_manager.delete_card(card.id)
            if removed:
                show_success(f"Card {card.id[:8]} has been deleted.")
            else:
                show_error(f"Failed to delete card {card.id[:8]}.")
        except Exception as exc:
            show_error(f"Error during deletion: {exc}")
    else:
        show_info("Deletion cancelled.")

    try:
        input("Press ENTER to continue…")
    except (KeyboardInterrupt, EOFError):
        pass


# ---------------------------------------------------------------------------
# 6. View Progress Screen
# ---------------------------------------------------------------------------

def show_progress(stats: "AggregateStats") -> None:
    """Display aggregate statistics, streak, mastery breakdown, and most-missed cards."""
    console.clear()
    _rule("Your Learning Progress")
    console.print()

    # Overview table
    table = Table(box=box.ROUNDED, border_style="cyan", show_header=True, header_style="bold cyan")
    table.add_column("Metric", style="bold white")
    table.add_column("Value", justify="right", style="bold")

    table.add_row("Total Study Sessions", str(stats.total_sessions))
    table.add_row("Total Cards Studied", str(stats.total_cards_studied))

    # Overall accuracy
    acc_pct = getattr(stats, "overall_accuracy_pct", stats.overall_accuracy * 100.0)
    acc_color = CLR_CORRECT if acc_pct >= 80 else (CLR_ACCENT if acc_pct >= 50 else CLR_WRONG)
    table.add_row("Overall Accuracy", f"[{acc_color}]{acc_pct:.1f}%[/{acc_color}]")

    # Streak
    streak_days = stats.current_streak_days
    streak_icon = "🔥" if streak_days > 0 else "❄️"
    table.add_row("Daily Streak", f"{streak_icon} {streak_days} consecutive day(s)")

    console.print(table)
    console.print()

    # Mastery breakdown
    bd = stats.mastery_breakdown
    mastered = bd.get("mastered", 0)
    learning = bd.get("learning", 0)
    new_cards = bd.get("new", 0)
    total_deck = mastered + learning + new_cards

    console.print(f"[{CLR_HEADER}]Deck Mastery Breakdown:[/{CLR_HEADER}]")
    if total_deck > 0:
        bar_len = 30
        m_bars = int(round((mastered / total_deck) * bar_len))
        l_bars = int(round((learning / total_deck) * bar_len))
        n_bars = bar_len - m_bars - l_bars
        progress_bar = f"[{CLR_CORRECT}]{'█' * m_bars}[/{CLR_CORRECT}][{CLR_ACCENT}]{'█' * l_bars}[/{CLR_ACCENT}][{CLR_INFO}]{'█' * max(0, n_bars)}[/{CLR_INFO}]"
        console.print(f"  {progress_bar}")

    console.print(
        f"  [{CLR_CORRECT}]Mastered: {mastered}[/{CLR_CORRECT}]    "
        f"  [{CLR_ACCENT}]Learning: {learning}[/{CLR_ACCENT}]    "
        f"  [{CLR_INFO}]New / Unreviewed: {new_cards}[/{CLR_INFO}]"
    )
    console.print()

    # Most-missed cards
    if stats.most_missed:
        console.print(f"[{CLR_WRONG}]Top Most-Missed Cards:[/{CLR_WRONG}]")
        miss_table = Table(box=box.SIMPLE_HEAVY, border_style="red", show_header=True, header_style="bold red")
        miss_table.add_column("Card ID", style="dim", width=10)
        miss_table.add_column("Question Preview", style="white")
        miss_table.add_column("Attempts", justify="right", style="cyan")
        miss_table.add_column("Missed", justify="right", style="bold red")
        miss_table.add_column("Accuracy", justify="right", style="yellow")

        cards_lookup = {c.id: c for c in card_manager.load_cards()}
        for item in stats.most_missed:
            if isinstance(item, dict):
                cid = item.get("card_id", "")
                q_text = item.get("question", "")
                attempts = item.get("attempts", 0)
                wrong_c = item.get("wrong_count", 0)
                acc = f"{item.get('accuracy_pct', 0.0):.1f}%"
            else:
                cid = str(item)
                card_obj = cards_lookup.get(cid)
                q_text = card_obj.question if card_obj else ""
                attempts = "-"
                wrong_c = card_obj.wrong_count if card_obj else "-"
                acc = "-"

            preview = q_text.split("\n")[0][:45] if q_text else "—"
            if len(q_text) > 45:
                preview += "…"
            miss_table.add_row(cid[:8], preview, str(attempts), str(wrong_c), acc)

        console.print(miss_table)
    else:
        console.print("[dim]No cards have recorded errors yet. Keep up the good work![/dim]")


def view_progress_flow() -> None:
    """Load aggregate stats and show progress screen."""
    try:
        stats = progress_tracker.get_aggregate_stats()
        show_progress(stats)
    except Exception as exc:
        show_error(f"Failed to load progress statistics: {exc}")

    console.print()
    try:
        input("Press ENTER to return to the main menu…")
    except (KeyboardInterrupt, EOFError):
        pass


# ---------------------------------------------------------------------------
# 7. Settings Screen
# ---------------------------------------------------------------------------

def settings_flow() -> None:
    """Interactive settings configuration screen."""
    console.clear()
    _rule("Settings")
    console.print()

    settings = load_settings()
    current_size = settings.get("session_size", DEFAULT_SESSION_SIZE)

    console.print(f"  Current default session size: [bold cyan]{current_size}[/bold cyan] cards\n")

    try:
        raw_input = Prompt.ask(
            "  Enter new default session size (1-200) [press ENTER to keep current]",
            default=str(current_size),
        ).strip()
        new_size = int(raw_input)
        if 1 <= new_size <= 200:
            settings["session_size"] = new_size
            save_settings(settings)
            show_success(f"Default session size updated to {new_size} cards.")
        else:
            show_error("Session size must be between 1 and 200.")
    except ValueError:
        show_error("Please enter a valid integer.")
    except Exception as exc:
        show_error(f"Failed to update settings: {exc}")

    try:
        input("Press ENTER to continue…")
    except (KeyboardInterrupt, EOFError):
        pass
