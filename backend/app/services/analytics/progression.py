"""Progression and trend analytics with linear regression."""

from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd
from pydantic import BaseModel
from scipy import stats
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.set import Set
from app.models.workout_session import WorkoutSession
from app.services.analytics.prs import epley


class ExerciseTrend(BaseModel):
    exercise_id: int
    exercise_name: str
    slope_kg_per_week: float
    r_squared: float
    p_value: float
    trend: str  # increasing | flat | decreasing
    is_plateau: bool
    total_sets: int
    avg_sets_per_week: float
    max_weight_kg: float
    sets_per_week: list[dict]   # [{"week": str, "sets": int}]
    data_points: list[dict]     # one entry per training day


async def get_progression(
    user_id: str,
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[ExerciseTrend]:
    q = (
        select(Set)
        .join(WorkoutSession, Set.session_id == WorkoutSession.id)
        .where(Set.user_id == user_id)
        .where(Set.weight_kg > 0)
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
        return []

    rows = []
    for s in sets:
        rows.append({
            "date": pd.Timestamp(s.session.date),
            "exercise_id": s.exercise_id,
            "exercise_name": s.exercise.name,
            "weight_kg": s.weight_kg,
            "reps": s.reps,
            "volume_kg": s.weight_kg * s.reps,
            "e1rm": epley(s.weight_kg, s.reps),
        })

    df = pd.DataFrame(rows)

    output: list[ExerciseTrend] = []

    for (ex_id, ex_name), group in df.groupby(["exercise_id", "exercise_name"]):
        group = group.copy()
        group["week"] = group["date"].dt.to_period("W")

        # Per-session aggregation
        daily = group.groupby("date").agg(
            e1rm=("e1rm", "max"),
            max_weight_kg=("weight_kg", "max"),
            avg_weight_kg=("weight_kg", "mean"),
            sets=("weight_kg", "count"),
            total_reps=("reps", "sum"),
            volume_kg=("volume_kg", "sum"),
        ).reset_index()
        daily["week_num"] = (daily["date"] - daily["date"].min()).dt.days / 7

        # Per-week set counts
        weekly_sets = group.groupby("week").size().reset_index(name="sets")
        sets_per_week_list = [
            {"week": str(r["week"]), "sets": int(r["sets"])}
            for _, r in weekly_sets.iterrows()
        ]

        total_sets = len(group)
        weeks_span = max(1.0, (group["date"].max() - group["date"].min()).days / 7)
        avg_sets_per_week = round(total_sets / weeks_span, 1)
        max_weight = float(group["weight_kg"].max())

        if len(daily) < 2:
            output.append(ExerciseTrend(
                exercise_id=int(ex_id),
                exercise_name=str(ex_name),
                slope_kg_per_week=0.0,
                r_squared=0.0,
                p_value=1.0,
                trend="flat",
                is_plateau=True,
                total_sets=total_sets,
                avg_sets_per_week=avg_sets_per_week,
                max_weight_kg=round(max_weight, 2),
                sets_per_week=sets_per_week_list,
                data_points=_build_data_points(daily),
            ))
            continue

        x = daily["week_num"].values
        y = daily["e1rm"].values
        slope, _intercept, r, p_value, _ = stats.linregress(x, y)
        r2 = float(r ** 2)

        # Plateau: rolling 4-session std < 2.5% of mean AND p_value > 0.1
        recent = daily.tail(4)["e1rm"]
        is_plateau = False
        if len(recent) >= 2:
            pct_std = float(recent.std() / recent.mean()) if recent.mean() != 0 else 0
            is_plateau = pct_std < 0.025 and float(p_value) > 0.1

        if float(p_value) < 0.05:
            trend = "increasing" if float(slope) > 0 else "decreasing"
        else:
            trend = "flat"

        output.append(ExerciseTrend(
            exercise_id=int(ex_id),
            exercise_name=str(ex_name),
            slope_kg_per_week=round(float(slope), 3),
            r_squared=round(r2, 3),
            p_value=round(float(p_value), 4),
            trend=trend,
            is_plateau=is_plateau,
            total_sets=total_sets,
            avg_sets_per_week=avg_sets_per_week,
            max_weight_kg=round(max_weight, 2),
            sets_per_week=sets_per_week_list,
            data_points=_build_data_points(daily),
        ))

    output.sort(key=lambda x: x.slope_kg_per_week, reverse=True)
    return output


def _build_data_points(daily: pd.DataFrame) -> list[dict]:
    return [
        {
            "date": str(r["date"].date()),
            "e1rm": round(float(r["e1rm"]), 2),
            "max_weight_kg": round(float(r["max_weight_kg"]), 2),
            "avg_weight_kg": round(float(r["avg_weight_kg"]), 2),
            "sets": int(r["sets"]),
            "total_reps": int(r["total_reps"]),
            "volume_kg": round(float(r["volume_kg"]), 2),
        }
        for _, r in daily.iterrows()
    ]
