"""Personal records analytics."""

from __future__ import annotations

from datetime import date

import pandas as pd
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.set import Set
from app.models.workout_session import WorkoutSession


def epley(weight: float, reps: int) -> float:
    if reps == 1:
        return weight
    return weight * (1 + reps / 30)


def brzycki(weight: float, reps: int) -> float:
    if reps == 1:
        return weight
    if reps >= 37:
        return weight  # formula breaks down
    return weight * 36 / (37 - reps)


class PREntry(BaseModel):
    date: str
    exercise_id: int
    exercise_name: str
    weight_kg: float
    reps: int
    estimated_1rm_epley: float
    estimated_1rm_brzycki: float
    is_weight_pr: bool
    is_estimated_1rm_pr: bool
    is_volume_session_pr: bool


class ExercisePRs(BaseModel):
    exercise_id: int
    exercise_name: str
    actual_1rm: float
    best_estimated_1rm_epley: float
    best_estimated_1rm_brzycki: float
    pr_timeline: list[PREntry]


async def get_prs(
    user_id: str,
    db: AsyncSession,
    exercise_id: int | None = None,
    formula: str = "epley",
    date_from: date | None = None,
    date_to: date | None = None,
) -> list[ExercisePRs]:
    q = (
        select(Set)
        .join(WorkoutSession, Set.session_id == WorkoutSession.id)
        .where(Set.user_id == user_id)
        .where(Set.weight_kg > 0)
        .where(Set.reps > 0)
        .options(selectinload(Set.exercise), selectinload(Set.session))
    )
    if exercise_id:
        q = q.where(Set.exercise_id == exercise_id)
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
            "date": s.session.date.isoformat(),
            "exercise_id": s.exercise_id,
            "exercise_name": s.exercise.name,
            "weight_kg": s.weight_kg,
            "reps": s.reps,
            "e1rm_epley": epley(s.weight_kg, s.reps),
            "e1rm_brzycki": brzycki(s.weight_kg, s.reps),
        })

    df = pd.DataFrame(rows)
    output: list[ExercisePRs] = []

    for (ex_id, ex_name), group in df.groupby(["exercise_id", "exercise_name"]):
        group = group.sort_values("date")
        timeline: list[PREntry] = []

        max_weight = 0.0
        max_e1rm = 0.0
        session_volume: dict[str, float] = {}
        max_session_vol = 0.0

        for _, row in group.iterrows():
            date_str = str(row["date"])
            w = float(row["weight_kg"])
            r = int(row["reps"])
            e_ep = float(row["e1rm_epley"])
            e_br = float(row["e1rm_brzycki"])

            session_volume[date_str] = session_volume.get(date_str, 0) + w * r
            is_weight_pr = w > max_weight
            is_e1rm_pr = e_ep > max_e1rm
            is_vol_pr = session_volume[date_str] > max_session_vol

            if is_weight_pr:
                max_weight = w
            if is_e1rm_pr:
                max_e1rm = e_ep
            if is_vol_pr:
                max_session_vol = session_volume[date_str]

            timeline.append(PREntry(
                date=date_str,
                exercise_id=int(ex_id),
                exercise_name=str(ex_name),
                weight_kg=round(w, 2),
                reps=r,
                estimated_1rm_epley=round(e_ep, 2),
                estimated_1rm_brzycki=round(e_br, 2),
                is_weight_pr=is_weight_pr,
                is_estimated_1rm_pr=is_e1rm_pr,
                is_volume_session_pr=is_vol_pr,
            ))

        output.append(ExercisePRs(
            exercise_id=int(ex_id),
            exercise_name=str(ex_name),
            actual_1rm=round(float(group["weight_kg"].max()), 2),
            best_estimated_1rm_epley=round(float(group["e1rm_epley"].max()), 2),
            best_estimated_1rm_brzycki=round(float(group["e1rm_brzycki"].max()), 2),
            pr_timeline=timeline,
        ))

    return output
