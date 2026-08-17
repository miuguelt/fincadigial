"""Unit tests for the pure scoring core of the farm search.

They need no database: that is the point of having moved these rules out of
`SemanticSearchService`, where they could only be exercised through a session.
"""

import pytest

from app.services.search.scoring import (
    best_score,
    enum_value,
    match_score,
    normalize_text,
    tokenize,
    top_results,
)


class TestNormalizeText:
    def test_strips_accents_and_lowercases(self):
        assert normalize_text("Vacunación") == "vacunacion"
        assert normalize_text("PASTÓ") == "pasto"

    def test_empty_values_return_empty_string(self):
        assert normalize_text("") == ""
        assert normalize_text(None) == ""


class TestTokenize:
    def test_keeps_short_tokens(self):
        # La búsqueda corre en cada tecla: descartar prefijos de una o dos
        # letras dejaría las primeras pulsaciones sin resultados.
        assert tokenize("v") == ["v"]
        assert tokenize("an") == ["an"]
        assert tokenize("v1") == ["v1"]

    def test_single_letter_stopwords_are_still_dropped(self):
        # 'a', 'e', 'i', 'u' e 'y' están en la lista de vacías: buscarlas
        # sueltas no acota nada.
        assert tokenize("a") == []
        assert tokenize("y") == []

    def test_drops_stopwords_and_punctuation(self):
        assert tokenize("la vaca de el potrero") == ["vaca", "potrero"]
        assert tokenize("¿Vacuna, aftosa?") == ["vacuna", "aftosa"]

    def test_empty_query_has_no_tokens(self):
        assert tokenize("") == []
        assert tokenize("   ") == []


class TestMatchScore:
    def test_exact_match_scores_one(self):
        assert match_score("an", "an") == 1.0

    def test_ranks_prefix_above_substring(self):
        prefix = match_score("an", "animal")
        substring = match_score("an", "cabana")
        assert prefix > substring > 0

    def test_word_prefix_sits_between_the_two(self):
        whole_prefix = match_score("an", "animal")
        word_prefix = match_score("an", "vaca animal")
        substring = match_score("an", "cabana")
        assert whole_prefix > word_prefix > substring

    def test_ignores_accents(self):
        assert match_score("pasto", "Pastó") == 1.0

    def test_missing_values_score_zero(self):
        assert match_score("", "animal") == 0.0
        assert match_score("animal", "") == 0.0


class TestBestScore:
    def test_returns_the_highest_weighted_field(self):
        score = best_score("holstein", [("AN-001", 1.0), ("Holstein", 0.85)])
        assert score == pytest.approx(0.85)

    def test_ignores_empty_fields(self):
        assert best_score("x", [(None, 1.0), ("", 1.0)]) == 0.0

    def test_no_fields_scores_zero(self):
        assert best_score("x", []) == 0.0


class TestEnumValue:
    def test_reads_the_value_attribute_when_present(self):
        class Status:
            value = "Vivo"

        assert enum_value(Status()) == "Vivo"

    def test_falls_back_to_the_given_default(self):
        assert enum_value(None) == ""
        assert enum_value(None, "Activo") == "Activo"


class TestTopResults:
    def test_sorts_by_score_and_cuts_to_the_limit(self):
        rows = [{"score": 0.2}, {"score": 0.9}, {"score": 0.5}]
        assert top_results(rows, 2) == [{"score": 0.9}, {"score": 0.5}]

    def test_empty_input_stays_empty(self):
        assert top_results([], 5) == []
