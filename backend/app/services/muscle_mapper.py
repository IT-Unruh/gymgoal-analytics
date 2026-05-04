"""Heuristic keyword-based muscle group mapper for unmapped exercises."""

from typing import NamedTuple


def _norm(s: str) -> str:
    """Normalize German umlauts to ASCII equivalents for substring matching."""
    return (s.lower()
            .replace("ü", "u")
            .replace("ö", "o")
            .replace("ä", "a")
            .replace("ß", "ss"))


# Rules are checked in ORDER — put more specific rules first.
# Each tuple: (keywords, primary_muscle_group, default_category)
KEYWORD_RULES: list[tuple[list[str], str, str]] = [
    # Core — must come before Brust so "schrägbank-situps" → Core, not Brust
    (["core", "plank", "crunch", "situp", "sit-up", "beinheben", "ab "], "Core", "bodyweight"),
    # Brust
    (["bank", "brust", "bench", "chest", "fly", "butterfly", "butterflys"], "Brust", "compound"),
    # Rücken — "klimmzug" normalized to "klimmzug" matches "klimmzuge" (klimmzüge normalized)
    (["klimmzug", "pull-up", "pullup", "rudern", "row", "kreuzheben", "deadlift", "lat", "latzug"], "Rücken", "compound"),
    # Schultern
    (["schulter", "shoulder", "seitenheb", "lateral", "facepull", "overhead press"], "Schultern", "compound"),
    # Hamstrings — before Bizeps so "beinbizeps" doesn't match Bizeps rule
    (["beinbizeps", "hamstring", "rdl", "romanian", "nordic"], "Beine_Hamstrings", "compound"),
    # Bizeps
    (["bizeps", "bicep", "curl"], "Arme_Bizeps", "isolation"),
    # Trizeps
    (["trizeps", "tricep", "dip"], "Arme_Trizeps", "isolation"),
    # Beine Quads
    (["kniebeug", "squat", "lunge", "ausfall", "beinpress", "beinstreck", "legpress"], "Beine_Quads", "compound"),
    # Glutes
    (["glute", "hip thrust", "gesass", "huft"], "Beine_Glutes", "compound"),
    # Waden
    (["waden", "calf", "tibialis"], "Beine_Waden", "isolation"),
    # Funktionell
    (["kettlebell", "swing", "farmer", "carry", "turkish", "get-up"], "Funktionell", "functional"),
    # Cardio — "rudermaschine" normalized matches "rudermaschine" (no umlauts)
    (["lauf", "run", "bike", "fahrrad", "rudermaschine", "treppen", "cardio", "ergometer", "treadmill"], "Cardio", "cardio"),
]


class MuscleMapping(NamedTuple):
    primary: str
    secondary: list[str]
    category: str
    equipment: str


def map_exercise(name: str) -> MuscleMapping:
    """Return a heuristic muscle mapping for an exercise name."""
    normalized = _norm(name)
    for keywords, primary, category in KEYWORD_RULES:
        if any(kw in normalized for kw in keywords):
            equipment = _guess_equipment(normalized)
            return MuscleMapping(primary=primary, secondary=[], category=category, equipment=equipment)
    return MuscleMapping(primary="Sonstige", secondary=[], category="bodyweight", equipment="other")


def _guess_equipment(name_normalized: str) -> str:
    if any(k in name_normalized for k in ["lh", "langhantel", "barbell", "stange"]):
        return "barbell"
    if any(k in name_normalized for k in ["kh", "kurzhantel", "dumbbell"]):
        return "dumbbell"
    if any(k in name_normalized for k in ["kabel", "cable", "seil"]):
        return "cable"
    if any(k in name_normalized for k in ["maschine", "machine", "gerat"]):
        return "machine"
    if any(k in name_normalized for k in ["kettlebell", "kb"]):
        return "kettlebell"
    if any(k in name_normalized for k in ["cardio", "fahrrad", "rudermaschine", "treppen", "ergometer"]):
        return "cardio_machine"
    return "bodyweight"
