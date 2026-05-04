"""Golden-data tests for analytics modules."""

from __future__ import annotations

from datetime import date, datetime
from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.analytics.frequency import get_frequency_stats
from app.services.analytics.prs import epley, brzycki, get_prs
from app.services.analytics.volume import get_volume_stats
from app.services.importer import import_tab_file

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
async def imported_db(seeded_db: AsyncSession) -> AsyncSession:
    await import_tab_file(FIXTURES / "sample_export.tab", "sample.tab", "local", seeded_db)
    return seeded_db


# --- 1RM formula unit tests ---

def test_epley_single_rep() -> None:
    assert epley(100, 1) == 100.0


def test_epley_five_reps() -> None:
    assert abs(epley(100, 5) - 116.67) < 0.1


def test_brzycki_single_rep() -> None:
    assert brzycki(100, 1) == 100.0


def test_brzycki_ten_reps() -> None:
    assert abs(brzycki(100, 10) - 133.33) < 0.5


# --- Frequency analytics ---

@pytest.mark.asyncio
async def test_frequency_session_count(imported_db: AsyncSession) -> None:
    stats = await get_frequency_stats("local", imported_db)
    # Sample has sessions on 4 dates: 2024-01-15, 2024-01-16, 2024-01-20, 2024-01-22
    # The cardio row (Reps=0) is kept in the DB so 2024-01-16 session is created
    assert stats.total_sessions == 4


@pytest.mark.asyncio
async def test_frequency_streak(imported_db: AsyncSession) -> None:
    stats = await get_frequency_stats("local", imported_db)
    # 2024-01-15 and 2024-01-16 are consecutive → longest streak >= 2
    assert stats.longest_streak >= 2


@pytest.mark.asyncio
async def test_frequency_adherence_range(imported_db: AsyncSession) -> None:
    stats = await get_frequency_stats("local", imported_db)
    assert 0.0 <= stats.adherence_score <= 1.0


# --- Volume analytics ---

@pytest.mark.asyncio
async def test_volume_nonzero(imported_db: AsyncSession) -> None:
    stats = await get_volume_stats("local", imported_db)
    # Kniebeugen: (100*5 + 100*5 + 80*8) + (105*5 + 100*5 + 85*8) = 1640 + 1205 = 2845 kg
    # Bankdrücken: 80*5 + 80*5 + 60*10 = 1400 kg
    assert stats.total_volume_kg > 1000


@pytest.mark.asyncio
async def test_volume_muscle_groups_present(imported_db: AsyncSession) -> None:
    stats = await get_volume_stats("local", imported_db)
    mg_names = {mg.muscle_group for mg in stats.muscle_group_volumes}
    assert "Beine_Quads" in mg_names  # Kniebeugen
    assert "Brust" in mg_names        # Bankdrücken


@pytest.mark.asyncio
async def test_volume_weekly_list(imported_db: AsyncSession) -> None:
    stats = await get_volume_stats("local", imported_db)
    assert len(stats.volume_per_week) >= 1


# --- PR analytics ---

@pytest.mark.asyncio
async def test_prs_returned(imported_db: AsyncSession) -> None:
    prs = await get_prs("local", imported_db)
    assert len(prs) > 0


@pytest.mark.asyncio
async def test_pr_best_e1rm_monotone(imported_db: AsyncSession) -> None:
    """best_estimated_1rm_epley must be >= any single set e1rm."""
    prs = await get_prs("local", imported_db)
    for ex_pr in prs:
        for entry in ex_pr.pr_timeline:
            assert ex_pr.best_estimated_1rm_epley >= entry.estimated_1rm_epley - 0.01
