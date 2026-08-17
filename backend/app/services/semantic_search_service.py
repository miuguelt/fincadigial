"""Unified search entry point for the farm.

Thin facade over `app.services.search`: it decides how many results each area
gets and applies the final ordering, nothing else. The scoring rules live in
`search.scoring` and each area has its own searcher, so adding a new one does
not touch this file.

The private helpers (`_tokenize`, `_calculate_match_score`) are kept as
delegates because the API namespace and the test suite already call them.
"""

from typing import Any

from app.services.search import (
    FIELD_WEIGHTS,
    match_score,
    normalize_text,
    search_animals,
    search_fields,
    search_records,
    search_supplies,
    search_tasks,
    similarity,
    tokenize,
    top_results,
)

# Areas other than animals share a smaller slice, so one of them cannot fill the
# dropdown and hide the rest.
_MIN_SUB_LIMIT = 5


class SemanticSearchService:
    """Deterministic search across every area of the farm."""

    FIELD_WEIGHTS = FIELD_WEIGHTS

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return tokenize(text)

    @staticmethod
    def _calculate_match_score(query: str, target: str) -> float:
        return match_score(query, target)

    @staticmethod
    def _similarity_score(a: str, b: str) -> float:
        return similarity(a, b)

    @staticmethod
    def _normalize_str(text: str) -> str:
        return normalize_text(text)

    @staticmethod
    def search_animals(
        query: str,
        finca_id: int,
        limit: int = 20,
        include_inactive: bool = False,
    ) -> list[dict[str, Any]]:
        return top_results(
            search_animals(query, finca_id, limit, include_inactive), limit
        )

    @staticmethod
    def search_fields(
        query: str, finca_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        return top_results(search_fields(query, finca_id, limit), limit)

    @staticmethod
    def search_supplies(
        query: str, finca_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        return top_results(search_supplies(query, finca_id, limit), limit)

    @staticmethod
    def search_tasks(
        query: str, finca_id: int, limit: int = 10
    ) -> list[dict[str, Any]]:
        return top_results(search_tasks(query, finca_id, limit), limit)

    @staticmethod
    def search_records(
        query: str,
        finca_id: int,
        record_type: str | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        return top_results(search_records(query, finca_id, record_type, limit), limit)

    @classmethod
    def unified_search(
        cls,
        query: str,
        finca_id: int,
        limit: int = 20,
    ) -> dict[str, list[dict[str, Any]]]:
        """One search per area, each already sorted and cut to its own limit."""
        sub_limit = max(_MIN_SUB_LIMIT, limit // 2)
        return {
            "animals": cls.search_animals(query, finca_id, limit=limit),
            "fields": cls.search_fields(query, finca_id, limit=sub_limit),
            "records": cls.search_records(query, finca_id, limit=sub_limit),
            "supplies": cls.search_supplies(query, finca_id, limit=sub_limit),
            "tasks": cls.search_tasks(query, finca_id, limit=sub_limit),
        }


semantic_search_service = SemanticSearchService()
