import json
from pathlib import Path

_DB_PATH = Path(__file__).parent.parent / "data" / "egyptian_foods.json"

_foods: list[dict] = []


def _load() -> list[dict]:
    global _foods
    if not _foods:
        with open(_DB_PATH, encoding="utf-8") as f:
            _foods = json.load(f)
    return _foods


def search_egyptian_foods(query: str, max_results: int = 5) -> list[dict]:
    """Search the local Egyptian food database. Returns matching food dicts or empty list."""
    q = query.lower().strip()
    foods = _load()

    scored: list[tuple[int, dict]] = []
    for food in foods:
        name = food["name"].lower()
        aliases = [a.lower() for a in food.get("aliases", [])]
        all_terms = [name] + aliases

        # Exact match on any term → highest priority
        if any(q == term for term in all_terms):
            scored.append((3, food))
        # Any term starts with query (e.g. "kosh" → "koshary")
        elif any(term.startswith(q) for term in all_terms):
            scored.append((2, food))
        # Query appears anywhere in any term
        elif any(q in term for term in all_terms):
            scored.append((1, food))
        # Any individual word of the query matches a term word
        else:
            words = q.split()
            if words and any(
                any(w in term for w in words)
                for term in all_terms
            ):
                scored.append((0, food))

    # Sort by score descending, return top N
    scored.sort(key=lambda x: x[0], reverse=True)
    return [food for _, food in scored[:max_results]]


def format_results(foods: list[dict], query: str) -> str:
    """Format Egyptian food results into the same string format as search_food."""
    if not foods:
        return ""
    lines = [f"Top {len(foods)} results for '{query}' (per 100g) [Egyptian Food Database]:"]
    for food in foods:
        lines.append(
            f"• {food['name']}: {food['calories_per_100g']} kcal | "
            f"Protein: {food['protein_g']}g | Carbs: {food['carbs_g']}g | Fat: {food['fat_g']}g"
        )
    return "\n".join(lines)
