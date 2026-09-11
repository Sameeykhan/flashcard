"""
UI Layer — app/ui.py

Responsibility: All Rich-based rendering — menus, flashcard panels with
syntax highlighting, answer reveal, live score display, session results
table, and all user input prompts. This is the ONLY file that imports Rich
or calls print()/input().

NOT responsible for: any business logic, SRS math, card scheduling,
persistence, or owning application state.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, List

from rich import print as rprint
from rich.columns import Columns
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.syntax import Syntax
from rich.table import Table
from rich.text import Text
from rich import box

if TYPE_CHECKING:
    from app.cards import Card
    from app.progress import AggregateStats, SessionResult

console = Console()

# Colour palette
CLR_BRAND   = "bold cyan"
CLR_CORRECT = "bold green"
CLR_WRONG   = "bold red"
CLR_MUTED   = "dim white"
CLR_ACCENT  = "bold yellow"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rule(title: str = "") -> None:
    console.rule(f"[{CLR_BRAND}]{title}[/{CLR_BRAND}]")


def _syntax_panel(code: str, language: str, title: str, border_style: str = "cyan") -> Panel:
    """Wrap *code* in a syntax-highlighted Rich Panel."""
    try:
        syntax = Syntax(code, language or "text", theme="monokai", word_wrap=True)
    except Exception:
        syntax = Syntax(code, "text", theme="monokai", word_wrap=True)
    return Panel(syntax, title=f"[bold]{title}[/bold]", border_style=border_style, padding=(1, 2))


def _looks_like_code(text: str) -> bool:
    """Heuristic: treat text as code if it contains common code indicators."""
    indicators = ["\n    ", "\n\t", "def ", "function ", "const ", "let ",
                  "var ", "return ", "class ", "import ", "->", "=>", "{}"]
    return any(ind in text for ind in indicators)


# ---------------------------------------------------------------------------
# Main menu
# ---------------------------------------------------------------------------

def show_main_menu() -> str:
    """Render the main menu and return the user's choice.

    Returns
    -------
    str
        One of: ``"1"``, ``"2"``, ``"3"``, ``"4"``, ``"5"``, ``"q"``.
    """
    console.clear()
    _rule("Interactive Code Flashcards")
    console.print()
    console.print("  [bold cyan]1[/bold cyan]  Start Study Session")
    console.print("  [bold cyan]2[/bold cyan]  Add Card")
    console.print("  [bold cyan]3[/bold cyan]  Manage Cards  (edit / delete / list)")
    console.print("  [bold cyan]4[/bold cyan]  View Progress & Stats")
    console.print("  [bold cyan]5[/bold cyan]  Settings")
    console.print("  [bold cyan]q[/bold cyan]  Quit")
    console.print()

    valid = {"1", "2", "3", "4", "5", "q", "Q"}
    while True:
        choice = Prompt.ask("[dim]Choose an option[/dim]").strip()
        if choice in valid:
            return choice.lower() if choice == "Q" else choice
        console.print("[red]Invalid choice — enter 1-5 or q.[/red]")


# ---------------------------------------------------------------------------
# Flashcard display
# ---------------------------------------------------------------------------

def show_question(card: "Card", current: int, total: int, score: int) -> None:
    """Render the question side of a flashcard.

    Parameters
    ----------
    card:
        The card whose question to display.
    current:
        1-based index of this card in the session.
    total:
        Total unique cards in the session queue.
    score:
        Current correct-answer count.
    """
    console.clear()
    # Header bar
    header = (
        f"[{CLR_MUTED}]Card {current}/{total}[/{CLR_MUTED}]   "
        f"[{CLR_CORRECT}]✓ {score}[/{CLR_CORRECT}]   "
        f"[{CLR_ACCENT}]{card.language.upper() or '—'}[/{CLR_ACCENT}]  "
        f"[{CLR_MUTED}]{card.category}[/{CLR_MUTED}]"
    )
    console.print(header)
    console.print()

    question = card.question
    if _looks_like_code(question):
        console.print(_syntax_panel(question, card.language, "Question", "cyan"))
    else:
        console.print(Panel(question, title="[bold]Question[/bold]",
                            border_style="cyan", padding=(1, 2)))


def show_answer(card: "Card") -> None:
    """Reveal the answer side of a flashcard.

    Parameters
    ----------
    card:
        The card whose answer to display.
    """
    answer = card.answer
    if _looks_like_code(answer):
        console.print(_syntax_panel(answer, card.language, "Answer", "green"))
    else:
        console.print(Panel(answer, title="[bold]Answer[/bold]",
                            border_style="green", padding=(1, 2)))


def prompt_answer_reveal() -> None:
    """Wait for the user to press ENTER before revealing the answer."""
    console.print(f"\n[{CLR_MUTED}]Press ENTER to reveal the answer…[/{CLR_MUTED}]", end="")
    try:
        input()
    except (KeyboardInterrupt, EOFError):
        pass


def prompt_correct_or_wrong() -> bool:
    """Ask the user whether they got the card right or wrong.

    Accepts ``y`` / ``1`` for correct and ``n`` / ``2`` for wrong.
    Re-prompts on invalid input.

    Returns
    -------
    bool
        True if correct, False if wrong.
    """
    console.print()
    console.print(
        f"  [{CLR_CORRECT}][y/1][/{CLR_CORRECT}] Got it    "
        f"  [{CLR_WRONG}][n/2][/{CLR_WRONG}] Missed it"
    )
    yes = {"y", "1", "yes"}
    no  = {"n", "2", "no"}
    while True:
        try:
            raw = input("  Your answer: ").strip().lower()
        except (KeyboardInterrupt, EOFError):
            return False
        if raw in yes:
            return True
        if raw in no:
            return False
        console.print(f"  [{CLR_WRONG}]Enter y/1 (correct) or n/2 (wrong).[/{CLR_WRONG}]")


# ---------------------------------------------------------------------------
# Session results
# ---------------------------------------------------------------------------

def show_session_results(result: "SessionResult", weak_cards: List["Card"]) -> None:
    """Display the end-of-session summary screen.

    Parameters
    ----------
    result:
        The SessionResult from the completed session.
    weak_cards:
        Cards the user got wrong in this session.
    """
    console.clear()
    _rule("Session Complete")
    console.print()

    # Summary table
    table = Table(box=box.ROUNDED, border_style="cyan", show_header=True,
                  header_style="bold cyan")
    table.add_column("Metric", style="dim")
    table.add_column("Value", justify="right")

    minutes, seconds = divmod(int(result.duration_seconds), 60)
    table.add_row("Cards studied", str(result.cards_studied))
    table.add_row("Correct", f"[{CLR_CORRECT}]{result.correct}[/{CLR_CORRECT}]")
    table.add_row("Wrong",   f"[{CLR_WRONG}]{result.wrong}[/{CLR_WRONG}]")
    table.add_row("Accuracy", f"[bold]{result.accuracy * 100:.1f}%[/bold]")
    table.add_row("Time", f"{minutes}m {seconds:02d}s")

    console.print(table)

    # Weak cards list
    if weak_cards:
        console.print()
        console.print(f"[{CLR_ACCENT}]Cards to review:[/{CLR_ACCENT}]")
        shown = weak_cards[:5]
        for card in shown:
            preview = card.question.split("\n")[0][:70]
            console.print(f"  [{CLR_WRONG}]•[/{CLR_WRONG}] [{CLR_MUTED}]{preview}…[/{CLR_MUTED}]")
    else:
        console.print(f"\n[{CLR_CORRECT}]Perfect session! All cards correct.[/{CLR_CORRECT}]")

    console.print()
    try:
        input("Press ENTER to return to the menu…")
    except (KeyboardInterrupt, EOFError):
        pass


def run_study_session(session: Any) -> Dict[str, Any]:
    """Drive an interactive study session using QuizSession public methods.

    The UI layer controls session iteration and user I/O:
    - Checks session.has_next()
    - Retrieves active card via session.current_card()
    - Prompts user and records response via session.submit_answer(correct)
    - Finalises session via session.end_session() and displays results screen.

    Parameters
    ----------
    session:
        An active QuizSession instance.

    Returns
    -------
    dict
        Completed session metrics dictionary.
    """
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
# Progress / stats display
# ---------------------------------------------------------------------------

def show_progress(stats: "AggregateStats") -> None:
    """Display aggregate progress statistics.

    Parameters
    ----------
    stats:
        AggregateStats object from progress.get_aggregate_stats().
    """
    console.clear()
    _rule("Your Progress")
    console.print()

    table = Table(box=box.SIMPLE, show_header=False)
    table.add_column("Metric", style="dim")
    table.add_column("Value", justify="right")

    table.add_row("Total sessions",      str(stats.total_sessions))
    table.add_row("Cards studied (all)", str(stats.total_cards_studied))
    table.add_row("Overall accuracy",    f"{stats.overall_accuracy * 100:.1f}%")
    table.add_row("Current streak",      f"{stats.current_streak_days} day(s)")

    console.print(table)

    # Mastery breakdown
    console.print()
    bd = stats.mastery_breakdown
    console.print(
        f"  Mastery:  "
        f"[{CLR_CORRECT}]Mastered {bd.get('mastered', 0)}[/{CLR_CORRECT}]  "
        f"[{CLR_ACCENT}]Learning {bd.get('learning', 0)}[/{CLR_ACCENT}]"
    )

    if stats.most_missed:
        console.print(f"\n[{CLR_WRONG}]Most-missed card IDs:[/{CLR_WRONG}]")
        for cid in stats.most_missed[:5]:
            console.print(f"  [{CLR_MUTED}]{cid}[/{CLR_MUTED}]")

    console.print()
    try:
        input("Press ENTER to return to the menu…")
    except (KeyboardInterrupt, EOFError):
        pass


# ---------------------------------------------------------------------------
# Card management UI helpers
# ---------------------------------------------------------------------------

def prompt_new_card() -> dict:
    """Interactively collect fields for a new flashcard.

    Returns
    -------
    dict
        Keys: ``question``, ``answer``, ``language``, ``category``, ``tags``
        (tags as list[str]).
    """
    console.print(Panel("[bold]Add New Flashcard[/bold]", border_style="cyan"))
    console.print(f"[{CLR_MUTED}](Enter a blank line to finish multi-line input)[/{CLR_MUTED}]\n")

    question = _multiline_prompt("Question (code/text)")
    answer   = _multiline_prompt("Answer / Explanation")
    language = Prompt.ask("Language", default="python").strip()
    category = Prompt.ask("Category", default="general").strip()
    raw_tags = Prompt.ask("Tags (comma-separated)", default="").strip()
    tags = [t.strip() for t in raw_tags.split(",") if t.strip()]

    return {
        "question": question,
        "answer":   answer,
        "language": language,
        "category": category,
        "tags":     tags,
    }


def _multiline_prompt(label: str) -> str:
    """Collect multi-line input until a blank line is entered."""
    console.print(f"[bold]{label}[/bold] [dim](blank line to finish)[/dim]")
    lines = []
    while True:
        try:
            line = input()
        except (KeyboardInterrupt, EOFError):
            break
        if line == "":
            break
        lines.append(line)
    return "\n".join(lines)


def show_card_list(cards: List["Card"]) -> None:
    """Render a table listing cards.

    Parameters
    ----------
    cards:
        List of cards to display.
    """
    if not cards:
        console.print("[dim]No cards to display.[/dim]")
        return

    table = Table(
        "ID (first 8)", "Language", "Category", "Question preview",
        box=box.SIMPLE_HEAVY, border_style="cyan", show_header=True,
        header_style="bold cyan",
    )
    for card in cards:
        preview = card.question.split("\n")[0][:55]
        table.add_row(
            card.id[:8],
            card.language,
            card.category,
            preview + ("…" if len(card.question) > 55 else ""),
        )
    console.print(table)


def prompt_edit_card(card: "Card") -> dict:
    """Collect updated fields for an existing card.

    Shows current value as the default; pressing ENTER keeps it.

    Parameters
    ----------
    card:
        The card being edited.

    Returns
    -------
    dict
        Only the fields the user actually changed.
    """
    console.print(Panel(f"[bold]Editing card[/bold] [dim]{card.id[:8]}…[/dim]",
                        border_style="cyan"))
    updates: dict = {}

    new_q = Prompt.ask("Question", default=card.question)
    if new_q != card.question:
        updates["question"] = new_q

    new_a = Prompt.ask("Answer", default=card.answer)
    if new_a != card.answer:
        updates["answer"] = new_a

    new_lang = Prompt.ask("Language", default=card.language)
    if new_lang != card.language:
        updates["language"] = new_lang

    new_cat = Prompt.ask("Category", default=card.category)
    if new_cat != card.category:
        updates["category"] = new_cat

    return updates


# ---------------------------------------------------------------------------
# Generic helpers
# ---------------------------------------------------------------------------

def show_error(message: str) -> None:
    """Display an error message in a red-bordered Panel.

    Parameters
    ----------
    message:
        Human-readable error description.
    """
    console.print(Panel(f"[bold red]{message}[/bold red]",
                        title="Error", border_style="red"))


def show_success(message: str) -> None:
    """Display a success message in a green-bordered Panel.

    Parameters
    ----------
    message:
        Human-readable success description.
    """
    console.print(Panel(f"[bold green]{message}[/bold green]",
                        title="✓", border_style="green"))


def show_info(message: str) -> None:
    """Display an informational message.

    Parameters
    ----------
    message:
        Human-readable info text.
    """
    console.print(f"[{CLR_MUTED}]{message}[/{CLR_MUTED}]")
