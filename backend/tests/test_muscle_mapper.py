"""Tests for heuristic muscle mapper."""

import pytest
from app.services.muscle_mapper import map_exercise


@pytest.mark.parametrize("name,expected_primary", [
    ("Bankdrücken", "Brust"),
    ("Schrägbank-drücken (LH)", "Brust"),
    ("Butterfly vorne", "Brust"),
    ("Klimmzüge (vorne, breit)", "Rücken"),
    ("Vorgebeugtes Rudern (LH)", "Rücken"),
    ("Kreuzheben", "Rücken"),
    ("Schulterdrücken (vorne, LH)", "Schultern"),
    ("Seitenheben (KH)", "Schultern"),
    ("Bizepscurls (KH, stehend)", "Arme_Bizeps"),
    ("Trizepsdrücken am Kabel", "Arme_Trizeps"),
    ("Kniebeugen", "Beine_Quads"),
    ("Bulgarian Split Squat", "Beine_Quads"),
    ("Beinbizeps-Curls (liegend)", "Beine_Hamstrings"),
    ("Wadenheben (Maschine)", "Beine_Waden"),
    ("Plank", "Core"),
    ("Schrägbank-Situps", "Core"),
    ("Kettlebell Swings", "Funktionell"),
    ("Farmer Carries", "Funktionell"),
    ("Fahrradfahren", "Cardio"),
    ("Rudermaschine", "Cardio"),
    ("Treppensteigen", "Cardio"),
    ("Unbekannte Übung", "Sonstige"),
])
def test_keyword_mapping(name: str, expected_primary: str) -> None:
    result = map_exercise(name)
    assert result.primary == expected_primary, f"{name!r}: got {result.primary!r}, expected {expected_primary!r}"


def test_fallback_is_sonstige() -> None:
    result = map_exercise("xyzzy unbekannt")
    assert result.primary == "Sonstige"
    assert result.category == "bodyweight"
    assert result.equipment == "other"


def test_barbell_equipment_detection() -> None:
    result = map_exercise("Bankdrücken (LH)")
    assert result.equipment == "barbell"


def test_dumbbell_equipment_detection() -> None:
    result = map_exercise("Schulterdrücken (KH)")
    assert result.equipment == "dumbbell"


def test_cable_equipment_detection() -> None:
    result = map_exercise("Trizepsdrücken am Kabel (Seil)")
    assert result.equipment == "cable"
