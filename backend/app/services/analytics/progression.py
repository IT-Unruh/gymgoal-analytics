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
    data_points: list[dict]


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
            "e1rm": epley(s.weight_kg, s.reps),
        })

    df = pd.DataFrame(rows)
    df["week_num"] = (df["date"] - df["date"].min()).dt.days / 7

    output: list[ExerciseTrend] = []

    for (ex_id, ex_name), group in df.groupby(["exercise_id", "exercise_name"]):
        daily = group.groupby("date")["e1rm"].max().reset_index()
        daily["week_num"] = (daily["date"] - daily["date"].min()).dt.days / 7

        if len(daily) < 2:
            output.append(ExerciseTrend(
                exercise_id=int(ex_id),
                exercise_name=str(ex_name),
                slope_kg_per_week=0.0,
                r_squared=0.0,
                p_value=1.0,
                trend="flat",
                is_plateau=True,
                data_points=[{"date": str(r["date"].date()), "e1rm": round(float(r["e1rm"]), 2)} for _, r in daily.iterrows()],
            ))
            continue

        x = daily["week_num"].values
        y = daily["e1rm"].values
        slope, intercept, r, p_value, _ = stats.linregress(x, y)
        r2 = float(r ** 2)

        # Plateau: rolling 4-week std < 2.5% of mean AND p_value > 0.1
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
            data_points=[{"date": str(r["date"].date()), "e1rm": round(float(r["e1rm"]), 2)} for _, r in daily.iterrows()],
        ))

    output.sort(key=lambda x: x.slope_kg_per_week, reverse=True)
    return output
