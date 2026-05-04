"""Training phase classification and deload detection."""

from __future__ import annotations

from datetime import date

import pandas as pd
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.set import Set
from app.models.workout_session import WorkoutSession
from app.services.analytics.prs import epley


class WeekBlock(BaseModel):
    week: str
    volume_kg: float
    avg_intensity_pct: float
    phase: str  # accumulation | intensification | deload | mixed
    is_deload: bool


class PeriodizationStats(BaseModel):
    week_blocks: list[WeekBlock]
    deload_weeks: list[str]
    volume_intensity_plot: list[dict]


async def get_periodization(
    user_id: str,
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> PeriodizationStats:
    q = (
        select(Set)
        .join(WorkoutSession, Set.session_id == WorkoutSession.id)
        .where(Set.user_id == user_id)
        .where(Set.reps > 0)
        .options(selectinload(Set.exercise), selectinload(Set.session))
    )
    if date_from:
        q = q.where(WorkoutSession.date >= date_from)
    if date_to:
        q = q.where(WorkoutSession.date <= date_to)

    result = await db.execute(q)
    sets = result.scalars().all()

    if not sets:
        return PeriodizationStats(week_blocks=[], deload_weeks=[], volume_intensity_plot=[])

    rows = []
    for s in sets:
        e1rm = epley(s.weight_kg, s.reps) if s.weight_kg > 0 else 0
        rows.append({
            "date": pd.Timestamp(s.session.date),
            "volume": s.weight_kg * s.reps,
            "e1rm": e1rm,
            "weight_kg": s.weight_kg,
        })

    df = pd.DataFrame(rows)
    df["week"] = df["date"].dt.to_period("W")

    weekly = df.groupby("week").agg(
        volume_kg=("volume", "sum"),
        max_e1rm=("e1rm", "max"),
        avg_weight=("weight_kg", "mean"),
    ).reset_index()
    weekly["volume_kg"] = weekly["volume_kg"].fillna(0)

    # Intensity % of max e1rm
    global_max_e1rm = float(df["e1rm"].max()) if df["e1rm"].max() > 0 else 1
    weekly["avg_intensity_pct"] = (weekly["max_e1rm"] / global_max_e1rm * 100).round(1)

    # Rolling 4-week avg volume
    weekly["rolling_vol"] = weekly["volume_kg"].rolling(4, min_periods=1).mean().shift(1)

    deload_weeks: list[str] = []
    blocks: list[WeekBlock] = []

    for i, row in weekly.iterrows():
        week_str = str(row["week"])
        vol = float(row["volume_kg"])
        intensity = float(row["avg_intensity_pct"])
        rolling = float(row["rolling_vol"]) if not pd.isna(row["rolling_vol"]) else vol

        # Deload: volume drops >30% vs trailing 4-week avg AND preceded by 3+ heavy weeks
        is_deload = False
        if rolling > 0 and vol < rolling * 0.7 and i >= 3:
            prior_vols = weekly["volume_kg"].iloc[max(0, i-3):i]
            if (prior_vols > rolling * 0.8).all():
                is_deload = True
                deload_weeks.append(week_str)

        # Phase classification
        if is_deload:
            phase = "deload"
        elif vol >= rolling * 1.0 and intensity < 80:
            phase = "accumulation"
        elif vol < rolling * 0.9 and intensity >= 80:
            phase = "intensification"
        else:
            phase = "mixed"

        blocks.append(WeekBlock(
            week=week_str,
            volume_kg=round(vol, 2),
            avg_intensity_pct=intensity,
            phase=phase,
            is_deload=is_deload,
        ))

    vi_plot = [{"week": b.week, "volume_kg": b.volume_kg, "intensity_pct": b.avg_intensity_pct, "phase": b.phase} for b in blocks]

    return PeriodizationStats(
        week_blocks=blocks,
        deload_weeks=deload_weeks,
        volume_intensity_plot=vi_plot,
    )
