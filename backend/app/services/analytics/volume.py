"""Volume and tonnage analytics."""

from __future__ import annotations

from datetime import date

import pandas as pd
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.set import Set
from app.models.workout_session import WorkoutSession


MUSCLE_GROUPS = [
    "Brust", "Rücken", "Schultern", "Arme_Bizeps", "Arme_Trizeps",
    "Beine_Quads", "Beine_Hamstrings", "Beine_Glutes", "Beine_Waden",
    "Core", "Funktionell", "Cardio", "Sonstige",
]

HYPERTROPHY_MIN = 10
HYPERTROPHY_MAX = 22


class MuscleGroupVolume(BaseModel):
    muscle_group: str
    sets_per_week: float
    total_sets: int
    total_volume_kg: float
    status: str  # "optimal", "undertrained", "overtrained"


class VolumeStats(BaseModel):
    total_volume_kg: float
    total_sets: int
    volume_per_week: list[dict]
    volume_per_month: list[dict]
    muscle_group_volumes: list[MuscleGroupVolume]
    volume_by_category: dict[str, float]
    volume_by_equipment: dict[str, float]


async def get_volume_stats(
    user_id: str,
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> VolumeStats:
    q = (
        select(Set)
        .join(WorkoutSession, Set.session_id == WorkoutSession.id)
        .where(Set.user_id == user_id)
        .options(selectinload(Set.exercise), selectinload(Set.session))
    )
    if date_from:
        q = q.where(WorkoutSession.date >= date_from)
    if date_to:
        q = q.where(WorkoutSession.date <= date_to)
    result = await db.execute(q)
    sets = result.scalars().all()

    if not sets:
        empty_muscle = [
            MuscleGroupVolume(muscle_group=m, sets_per_week=0, total_sets=0, total_volume_kg=0, status="undertrained")
            for m in MUSCLE_GROUPS
        ]
        return VolumeStats(
            total_volume_kg=0,
            total_sets=0,
            volume_per_week=[],
            volume_per_month=[],
            muscle_group_volumes=empty_muscle,
            volume_by_category={},
            volume_by_equipment={},
        )

    rows = []
    for s in sets:
        if s.reps == 0:
            continue
        rows.append({
            "date": s.session.date,
            "weight_kg": s.weight_kg,
            "reps": s.reps,
            "volume": s.weight_kg * s.reps,
            "muscle_group": s.exercise.primary_muscle_group,
            "category": s.exercise.category,
            "equipment": s.exercise.equipment,
        })

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df["week"] = df["date"].dt.to_period("W")
    df["month"] = df["date"].dt.to_period("M")

    total_volume = float(df["volume"].sum())
    total_sets = len(df)

    vpw = df.groupby("week")["volume"].sum().reset_index()
    vpm = df.groupby("month")["volume"].sum().reset_index()

    volume_per_week = [{"week": str(r["week"]), "volume_kg": round(float(r["volume"]), 2)} for _, r in vpw.iterrows()]
    volume_per_month = [{"month": str(r["month"]), "volume_kg": round(float(r["volume"]), 2)} for _, r in vpm.iterrows()]

    # Weeks in range for weekly average calculation
    if len(df) > 0:
        first_d = df["date"].min()
        last_d = df["date"].max()
        weeks_in_range = max(1, (last_d - first_d).days / 7)
    else:
        weeks_in_range = 1

    # Muscle group sets per week
    mg_sets = df.groupby("muscle_group").size().to_dict()
    mg_volume = df.groupby("muscle_group")["volume"].sum().to_dict()
    mg_list: list[MuscleGroupVolume] = []
    for mg in MUSCLE_GROUPS:
        total_s = int(mg_sets.get(mg, 0))
        spw = total_s / weeks_in_range
        status = "optimal"
        if mg not in ("Cardio", "Sonstige", "Funktionell"):
            if spw < HYPERTROPHY_MIN:
                status = "undertrained"
            elif spw > HYPERTROPHY_MAX:
                status = "overtrained"
        mg_list.append(MuscleGroupVolume(
            muscle_group=mg,
            sets_per_week=round(spw, 1),
            total_sets=total_s,
            total_volume_kg=round(float(mg_volume.get(mg, 0)), 2),
            status=status,
        ))

    by_category = {k: round(float(v), 2) for k, v in df.groupby("category")["volume"].sum().to_dict().items()}
    by_equipment = {k: round(float(v), 2) for k, v in df.groupby("equipment")["volume"].sum().to_dict().items()}

    return VolumeStats(
        total_volume_kg=round(total_volume, 2),
        total_sets=total_sets,
        volume_per_week=volume_per_week,
        volume_per_month=volume_per_month,
        muscle_group_volumes=mg_list,
        volume_by_category=by_category,
        volume_by_equipment=by_equipment,
    )
