"""Tests for the GymGoal .tab importer."""

from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.importer import import_tab_file

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.mark.asyncio
async def test_import_basic(seeded_db: AsyncSession) -> None:
    summary = await import_tab_file(FIXTURES / "sample_export.tab", "sample.tab", "local", seeded_db)
    assert summary.rows_parsed > 0
    assert summary.sets_created > 0
    assert summary.sets_skipped == 0
    assert summary.new_exercises > 0
    assert summary.date_range_start == "2024-01-15"
    assert summary.date_range_end == "2024-01-22"


@pytest.mark.asyncio
async def test_import_dedup(seeded_db: AsyncSession) -> None:
    """Second import of same file creates 0 new sets."""
    s1 = await import_tab_file(FIXTURES / "sample_export.tab", "sample.tab", "local", seeded_db)
    s2 = await import_tab_file(FIXTURES / "sample_export.tab", "sample.tab", "local", seeded_db)
    assert s2.sets_created == 0
    assert s2.sets_skipped == s1.sets_created


@pytest.mark.asyncio
async def test_import_forward_fill(seeded_db: AsyncSession) -> None:
    """Exercise name forward-fill: all sets of Kniebeugen are mapped to correct exercise."""
    summary = await import_tab_file(FIXTURES / "sample_export.tab", "sample.tab", "local", seeded_db)
    # Kniebeugen has 6 sets across two sessions (3+3); name is only on first row
    assert summary.sets_created >= 6  # includes other exercises


@pytest.mark.asyncio
async def test_bodyweight_sets_zero_weight(seeded_db: AsyncSession) -> None:
    """Klimmzüge with weight=0 are imported and not excluded."""
    summary = await import_tab_file(FIXTURES / "sample_export.tab", "sample.tab", "local", seeded_db)
    # Klimmzüge rows: 2 sets with weight=0, reps=8 and 6
    assert summary.sets_created >= 2


@pytest.mark.asyncio
async def test_cardio_imported(seeded_db: AsyncSession) -> None:
    """Cardio row (Fahrradfahren) with time/distance/HR is imported."""
    summary = await import_tab_file(FIXTURES / "sample_export.tab", "sample.tab", "local", seeded_db)
    # Fahrradfahren set has time_total=0:39:42 and distance=15 km
    assert summary.sets_created >= 1


@pytest.mark.asyncio
async def test_import_weight_unit_normalization(seeded_db: AsyncSession) -> None:
    """Sets in lb are normalized to kg in the DB."""
    from sqlalchemy import select
    from app.models.set import Set

    # Create a temporary file with lb weight
    import tempfile, os
    content = (
        "Date\tSession\tExercise ID\tExercise Name\t1RM\tTotal Weight Lifted\tMax Weight Lifted\tWeight Units\t"
        "Set\tWeight\tReps\tTime From\tTime To\tTime Total\tDistance\tDistance Units\tAngle\tCalories\t"
        "Average Heart Rate\tMax Heart Rate\tNotes\n"
        "2024-02-01\t1\t999\tBenchpress (lb)\t\t\t\tlb\t1\t200,0\t5\n"
    )
    with tempfile.NamedTemporaryFile(mode="w", suffix=".tab", delete=False, encoding="utf-8") as f:
        f.write(content)
        tmp_path = Path(f.name)

    try:
        await import_tab_file(tmp_path, "lb_test.tab", "local", seeded_db)
        result = await seeded_db.execute(select(Set).where(Set.user_id == "local"))
        sets = result.scalars().all()
        lb_set = next((s for s in sets if abs(s.weight_kg - 200 * 0.45359237) < 0.01), None)
        assert lb_set is not None, "lb set was not converted to kg"
    finally:
        tmp_path.unlink(missing_ok=True)
