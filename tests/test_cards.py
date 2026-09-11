"""
Tests for app/cards.py — Card Manager.

Covers:
- Adding a card and verifying it's persisted and reloadable.
- Editing a card's fields.
- Deleting a card (and deleting a non-existent id returns False, no crash).
- Filtering by category, language, and tag (AND logic).
- Validation failure on empty question/answer.
- That save_cards() uses the temp-file + os.replace atomic pattern.
"""

from __future__ import annotations

import json
import os
import tempfile
from unittest.mock import patch

import pytest

from app.cards import (
    Card,
    add_card,
    delete_card,
    edit_card,
    list_cards,
    load_cards,
    save_cards,
)


# ---------------------------------------------------------------------------
# Fixture: isolated temp file for each test
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_path_json(tmp_path):
    """Return a path string inside a fresh temp directory."""
    return str(tmp_path / "flashcards.json")


# ---------------------------------------------------------------------------
# load_cards — resilience
# ---------------------------------------------------------------------------

class TestLoadCards:
    def test_missing_file_returns_empty_list(self, tmp_path_json):
        result = load_cards(tmp_path_json)
        assert result == []

    def test_missing_file_creates_empty_json(self, tmp_path_json):
        load_cards(tmp_path_json)
        with open(tmp_path_json, "r") as fh:
            data = json.load(fh)
        assert data == {"cards": []}

    def test_corrupted_json_returns_empty_list(self, tmp_path_json):
        with open(tmp_path_json, "w") as fh:
            fh.write("NOT VALID JSON }{")
        result = load_cards(tmp_path_json)
        assert result == []

    def test_empty_json_object_returns_empty_list(self, tmp_path_json):
        with open(tmp_path_json, "w") as fh:
            json.dump({}, fh)
        result = load_cards(tmp_path_json)
        assert result == []


# ---------------------------------------------------------------------------
# add_card
# ---------------------------------------------------------------------------

class TestAddCard:
    def test_add_card_returns_card_with_correct_fields(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", ["tag1"], path=tmp_path_json)
        assert isinstance(card, Card)
        assert card.question == "Q?"
        assert card.answer == "A."
        assert card.language == "python"
        assert card.category == "basics"
        assert card.tags == ["tag1"]
        assert card.difficulty == 1.0
        assert card.correct_count == 0
        assert card.wrong_count == 0
        assert card.last_reviewed is None
        assert card.next_due is None
        assert card.id != ""
        assert card.created_at != ""

    def test_add_card_is_persisted_and_reloadable(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", [], path=tmp_path_json)
        reloaded = load_cards(tmp_path_json)
        assert len(reloaded) == 1
        assert reloaded[0].id == card.id
        assert reloaded[0].question == card.question

    def test_add_multiple_cards(self, tmp_path_json):
        add_card("Q1?", "A1.", "python", "cat1", [], path=tmp_path_json)
        add_card("Q2?", "A2.", "javascript", "cat2", [], path=tmp_path_json)
        cards = load_cards(tmp_path_json)
        assert len(cards) == 2

    def test_whitespace_stripped_from_question_and_answer(self, tmp_path_json):
        card = add_card("  Q?  ", "  A.  ", "python", "basics", [], path=tmp_path_json)
        assert card.question == "Q?"
        assert card.answer == "A."

    def test_empty_question_raises_value_error(self, tmp_path_json):
        with pytest.raises(ValueError, match="Question"):
            add_card("", "A.", "python", "basics", [], path=tmp_path_json)

    def test_whitespace_only_question_raises_value_error(self, tmp_path_json):
        with pytest.raises(ValueError, match="Question"):
            add_card("   ", "A.", "python", "basics", [], path=tmp_path_json)

    def test_empty_answer_raises_value_error(self, tmp_path_json):
        with pytest.raises(ValueError, match="Answer"):
            add_card("Q?", "", "python", "basics", [], path=tmp_path_json)

    def test_whitespace_only_answer_raises_value_error(self, tmp_path_json):
        with pytest.raises(ValueError, match="Answer"):
            add_card("Q?", "   ", "python", "basics", [], path=tmp_path_json)

    def test_empty_tags_filtered_out(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", ["", "  ", "tag1"], path=tmp_path_json)
        assert card.tags == ["tag1"]


# ---------------------------------------------------------------------------
# edit_card
# ---------------------------------------------------------------------------

class TestEditCard:
    def test_edit_question(self, tmp_path_json):
        card = add_card("Old Q?", "A.", "python", "basics", [], path=tmp_path_json)
        updated = edit_card(card.id, path=tmp_path_json, question="New Q?")
        assert updated.question == "New Q?"

    def test_edit_preserves_other_fields(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", ["t1"], path=tmp_path_json)
        updated = edit_card(card.id, path=tmp_path_json, question="Updated Q?")
        assert updated.answer == "A."
        assert updated.language == "python"
        assert updated.tags == ["t1"]

    def test_edit_multiple_fields(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", [], path=tmp_path_json)
        updated = edit_card(card.id, path=tmp_path_json, question="New Q?", category="advanced")
        assert updated.question == "New Q?"
        assert updated.category == "advanced"

    def test_edit_persisted_after_reload(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", [], path=tmp_path_json)
        edit_card(card.id, path=tmp_path_json, answer="New A.")
        reloaded = load_cards(tmp_path_json)
        assert reloaded[0].answer == "New A."

    def test_edit_nonexistent_id_raises_key_error(self, tmp_path_json):
        with pytest.raises(KeyError):
            edit_card("nonexistent-id", path=tmp_path_json, question="X")

    def test_edit_empty_question_raises_value_error(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", [], path=tmp_path_json)
        with pytest.raises(ValueError):
            edit_card(card.id, path=tmp_path_json, question="")

    def test_edit_empty_answer_raises_value_error(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", [], path=tmp_path_json)
        with pytest.raises(ValueError):
            edit_card(card.id, path=tmp_path_json, answer="  ")


# ---------------------------------------------------------------------------
# delete_card
# ---------------------------------------------------------------------------

class TestDeleteCard:
    def test_delete_existing_card_returns_true(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", [], path=tmp_path_json)
        result = delete_card(card.id, path=tmp_path_json)
        assert result is True

    def test_delete_removes_card_from_file(self, tmp_path_json):
        card = add_card("Q?", "A.", "python", "basics", [], path=tmp_path_json)
        delete_card(card.id, path=tmp_path_json)
        reloaded = load_cards(tmp_path_json)
        assert len(reloaded) == 0

    def test_delete_nonexistent_id_returns_false(self, tmp_path_json):
        result = delete_card("does-not-exist", path=tmp_path_json)
        assert result is False

    def test_delete_nonexistent_id_no_crash(self, tmp_path_json):
        # Should not raise anything
        delete_card("does-not-exist", path=tmp_path_json)

    def test_delete_only_removes_target_card(self, tmp_path_json):
        c1 = add_card("Q1?", "A1.", "python", "basics", [], path=tmp_path_json)
        c2 = add_card("Q2?", "A2.", "python", "basics", [], path=tmp_path_json)
        delete_card(c1.id, path=tmp_path_json)
        remaining = load_cards(tmp_path_json)
        assert len(remaining) == 1
        assert remaining[0].id == c2.id


# ---------------------------------------------------------------------------
# list_cards — filtering
# ---------------------------------------------------------------------------

class TestListCards:
    @pytest.fixture(autouse=True)
    def _populate(self, tmp_path_json):
        """Seed a small deck and store path for helper methods."""
        self.path = tmp_path_json
        add_card("Q1?", "A.", "python", "decorators", ["python", "oop"], path=self.path)
        add_card("Q2?", "A.", "python", "closures", ["python", "scope"], path=self.path)
        add_card("Q3?", "A.", "javascript", "closures", ["javascript", "scope"], path=self.path)
        add_card("Q4?", "A.", "javascript", "equality", ["javascript", "gotcha"], path=self.path)

    def test_list_all_no_filter(self):
        cards = list_cards(path=self.path)
        assert len(cards) == 4

    def test_filter_by_language_python(self):
        cards = list_cards(language="python", path=self.path)
        assert len(cards) == 2
        assert all(c.language == "python" for c in cards)

    def test_filter_by_language_javascript(self):
        cards = list_cards(language="javascript", path=self.path)
        assert len(cards) == 2

    def test_filter_by_category(self):
        cards = list_cards(category="closures", path=self.path)
        assert len(cards) == 2

    def test_filter_by_tag(self):
        cards = list_cards(tag="scope", path=self.path)
        assert len(cards) == 2

    def test_filter_by_tag_case_insensitive(self):
        cards = list_cards(tag="SCOPE", path=self.path)
        assert len(cards) == 2

    def test_filter_by_language_and_category_and_logic(self):
        # python AND closures → 1 card
        cards = list_cards(language="python", category="closures", path=self.path)
        assert len(cards) == 1
        assert cards[0].language == "python"
        assert cards[0].category == "closures"

    def test_filter_returns_empty_when_no_match(self):
        cards = list_cards(language="go", path=self.path)
        assert cards == []

    def test_filter_by_language_and_tag(self):
        cards = list_cards(language="javascript", tag="scope", path=self.path)
        assert len(cards) == 1
        assert cards[0].language == "javascript"


# ---------------------------------------------------------------------------
# save_cards — atomic write (temp file + os.replace)
# ---------------------------------------------------------------------------

class TestSaveCardsAtomic:
    def test_atomic_write_uses_os_replace(self, tmp_path_json):
        """Verify that save_cards calls os.replace (the atomic swap)."""
        cards = [
            Card(
                id="test-id-1",
                question="Q?",
                answer="A.",
                language="python",
                category="basics",
                tags=[],
                created_at="2026-09-11T00:00:00+00:00",
            )
        ]
        with patch("os.replace") as mock_replace:
            # We still want the real write to happen so we don't blow up
            mock_replace.side_effect = lambda src, dst: os.rename(src, dst)
            save_cards(cards, path=tmp_path_json)
            mock_replace.assert_called_once()
            src, dst = mock_replace.call_args[0]
            assert src == tmp_path_json + ".tmp"
            assert dst == tmp_path_json

    def test_saved_file_is_valid_json(self, tmp_path_json):
        cards = [
            Card(
                id="test-id-2",
                question="Q?",
                answer="A.",
                language="python",
                category="basics",
                tags=["t1"],
                created_at="2026-09-11T00:00:00+00:00",
            )
        ]
        save_cards(cards, path=tmp_path_json)
        with open(tmp_path_json, "r") as fh:
            data = json.load(fh)
        assert "cards" in data
        assert len(data["cards"]) == 1
        assert data["cards"][0]["id"] == "test-id-2"

    def test_tmp_file_not_left_behind_after_save(self, tmp_path_json):
        cards = [
            Card(
                id="test-id-3",
                question="Q?",
                answer="A.",
                language="python",
                category="basics",
                tags=[],
                created_at="2026-09-11T00:00:00+00:00",
            )
        ]
        save_cards(cards, path=tmp_path_json)
        assert not os.path.exists(tmp_path_json + ".tmp")

    def test_no_rich_import_in_cards(self):
        """cards.py must never import Rich."""
        import importlib
        import app.cards as cards_module
        source_file = cards_module.__file__
        with open(source_file, "r", encoding="utf-8") as fh:
            source = fh.read()
        assert "import rich" not in source
        assert "from rich" not in source

    def test_no_print_in_cards(self):
        """cards.py must never call print() directly."""
        import app.cards as cards_module
        with open(cards_module.__file__, "r", encoding="utf-8") as fh:
            source = fh.read()
        # Allow 'print' only inside docstrings/comments (this naive check is
        # sufficient for enforcement purposes).
        import ast
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                func = node.func
                if isinstance(func, ast.Name) and func.id == "print":
                    pytest.fail("cards.py contains a print() call.")
