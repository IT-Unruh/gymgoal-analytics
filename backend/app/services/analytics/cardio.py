"""Cardio-specific analytics."""

from __future__ import annotations

from datetime import date

import pandas as pd
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.set import Set
from app.models.workout_session import WorkoutSession


class CardioSession(BaseModel):
    date: str
    exercise_name: str
    duration_minutes: float
    distance_km: float | None
    calories: float | None
    avg_hr: int | None
    pace_min_per_km: float | None


class CardioStats(BaseModel):
    total_duration_hours: float
    total_distance_km: float
    total_calories: float
    sessions: list[CardioSession]
    weekly_duration: list[dict]
    weekly_distance: list[dict]
    has_data: bool


async def get_cardio(
    user_id: str,
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
    resting_hr: int | None = None,
    max_hr: int | None = None,
    age: int | None = None,
) -> CardioStats:
    q = (
        select(Set)
        .join(WorkoutSession, Set.session_id == WorkoutSession.id)
        .where(Set.user_id == user_id)
        .where(Set.time_total_seconds.isnot(None))
        .options(selectinload(Set.exercise), selectinload(Set.session))
    )
    if date_from:
        q = q.where(WorkoutSession.date >= date_from)
    if date_to:
        q = q.where(WorkoutSession.date <= date_to)

    result = await db.execute(q)
    sets = result.scalars().all()

    if not sets:
        return CardioStats(
            total_duration_hours=0,
            total_distance_km=0,
            total_calories=0,
            sessions=[],
            weekly_duration=[],
            weekly_distance=[],
            has_data=False,
        )

    rows = []
    for s in sets:
        duration_min = (s.time_total_seconds or 0) / 60
        dist_km = (s.distance_meters or 0) / 1000 if s.distance_meters else None
        pace = None
        if dist_km and dist_km > 0 and duration_min > 0:
            pace = duration_min / dist_km

        rows.append({
            "date": pd.Timestamp(s.session.date),
            "exercise_name": s.exercise.name,
            "duration_min": duration_min,
            "distance_km": dist_km,
            "calories": s.calories,
            "avg_hr": s.avg_hr,
            "pace": pace,
        })

    df = pd.DataFrame(rows)
    df["week"] = df["date"].dt.to_period("W")

    sessions_out: list[CardioSession] = []
    for _, row in df.iterrows():
        sessions_out.append(CardioSession(
            date=str(row["date"].date()),
            exercise_name=str(row["exercise_name"]),
            duration_minutes=round(float(row["duration_min"]), 1),
            distance_km=round(float(row["distance_km"]), 3) if row["distance_km"] is not None and not pd.isna(row["distance_km"]) else None,
            calories=float(row["calories"]) if row["calories"] is not None and not pd.isna(row["calories"]) else None,
            avg_hr=int(row["avg_hr"]) if row["avg_hr"] is not None and not pd.isna(row["avg_hr"]) else None,
            pace_min_per_km=round(float(row["pace"]), 2) if row["pace"] is not None and not pd.isna(row["pace"]) else None,
        ))

    weekly_dur = df.groupby("week")["duration_min"].sum().reset_index()
    weekly_dist = df.dropna(subset=["distance_km"]).groupby("week")["distance_km"].sum().reset_index()

    return CardioStats(
        total_duration_hours=round(float(df["duration_min"].sum()) / 60, 2),
        total_distance_km=round(float(df["distance_km"].sum()) if df["distance_km"].notna().any() else 0, 2),
        total_calories=round(float(df["calories"].sum()) if df["calories"].notna().any() else 0, 2),
        sessions=sessions_out,
        weekly_duration=[{"week": str(r["week"]), "duration_min": round(float(r["duration_min"]), 1)} for _, r in weekly_dur.iterrows()],
        weekly_distance=[{"week": str(r["week"]), "distance_km": round(float(r["distance_km"]), 2)} for _, r in weekly_dist.iterrows()],
        has_data=True,
    )
