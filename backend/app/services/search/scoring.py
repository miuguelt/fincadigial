"""Text scoring shared by every search in the farm.

Single source for three questions that used to live inside the search service
and could not be exercised without a database session:

  - how a query is broken into tokens,
  - how close a token is to a stored value,
  - how much each field weighs in the final score.

Every function here is pure: same input, same output, no session, no models.
"""

import re
import unicodedata
from difflib import SequenceMatcher

# Weight of each field in the final score of a result.
FIELD_WEIGHTS = {
    "record": 1.0,
    "name": 1.0,
    "title": 0.9,
    "breed_name": 0.85,
    "species_name": 0.8,
    "description": 0.7,
    "notes": 0.65,
}

# Below this score a row is noise and is dropped from the results.
MIN_SCORE = 0.1

_STOPWORDS = {
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "de",
    "del",
    "al",
    "y",
    "o",
    "en",
    "con",
    "por",
    "para",
    "a",
    "e",
    "i",
    "u",
}


def normalize_text(text) -> str:
    """Lowercase and strip accents so "vacunacion" matches "vacunación"."""
    if not text:
        return ""
    nfkd = unicodedata.normalize("NFKD", str(text).lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c)).strip()


def tokenize(text: str) -> list[str]:
    """Split a query into searchable tokens.

    Single-character tokens are kept on purpose: the search runs on every
    keystroke, so dropping "a" or "v1" would make the first letters return
    nothing and the box would look broken.
    """
    if not text:
        return []
    cleaned = re.sub(r"[^\w\s]", " ", normalize_text(text))
    return [token for token in cleaned.split() if token not in _STOPWORDS]


def match_score(query: str, target: str) -> float:
    """How well `query` matches `target`, from 0 to 1.

    The ladder is ordered from the most explicit intent to the least: an exact
    hit, then a prefix of the whole value, then a prefix of one of its words,
    then a substring anywhere, and only at the end a fuzzy ratio.
    """
    q = normalize_text(query)
    t = normalize_text(target)
    if not q or not t:
        return 0.0

    if q == t:
        return 1.0

    if t.startswith(q):
        return 0.85 + min(0.1, (len(q) / max(len(t), 1)) * 0.1)

    for word in t.split():
        if word.startswith(q):
            return 0.75 + min(0.1, (len(q) / max(len(word), 1)) * 0.1)

    if q in t:
        return 0.6 + min(0.1, (len(q) / max(len(t), 1)) * 0.1)

    # The stored value is itself a word inside what the user typed.
    if t in q:
        return 0.65 + min(0.1, (len(t) / max(len(q), 1)) * 0.1)

    return round(SequenceMatcher(None, q, t).ratio(), 3)


def similarity(a: str, b: str) -> float:
    """Plain fuzzy ratio, without the prefix and substring ladder."""
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, normalize_text(a), normalize_text(b)).ratio()


def best_score(query: str, targets) -> float:
    """Highest weighted score among `(value, weight)` pairs; 0 when there is none."""
    scores = [match_score(query, value) * weight for value, weight in targets if value]
    return max(scores) if scores else 0.0


def enum_value(value, default: str = "") -> str:
    """Readable text of an enum column, whichever way SQLAlchemy hands it over."""
    if value is None:
        return default
    return value.value if hasattr(value, "value") else str(value)


def top_results(results: list[dict], limit: int) -> list[dict]:
    """Sort by score, best first, and keep the requested amount."""
    return sorted(results, key=lambda row: row["score"], reverse=True)[:limit]
