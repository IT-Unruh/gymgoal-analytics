"""Exercise and period comparison analytics."""

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

PUSH_GROUPS = {"Brust", "Schultern", "Arme_Trizeps"}
PULL_GROUPS = {"Rücken", "Arme_Bizeps"}
QUAD_GROUP = "Beine_Quads"
HAM_GROUP = "Beine_Hamstrings"


class ExerciseComparison(BaseModel):
    exercise_a_id: int
    exercise_a_name: str
    exercise_b_id: int
    exercise_b_name: str
    timeline: list[dict]  # [{date, e1rm_a, e1rm_b}]


class PeriodMetrics(BaseModel):
    label: str
    date_from: str
    date_to: str
    total_volume_kg: float
    total_sessions: int
    total_sets: int
    avg_weekly_volume: float
    muscle_distribution: dict[str, float]
    top_prs: list[dict]


class PeriodComparison(BaseModel):
    period_1: PeriodMetrics
    period_2: PeriodMetrics


class MuscleBalance(BaseModel):
    push_pull_ratio: float
    push_pull_status: str
    quad_ham_ratio: float
    quad_ham_status: str
    anterior_posterior_ratio: float


async def compare_exercises(
    user_id: str,
    db: AsyncSession,
    exercise_a_id: int,
    exercise_b_id: int,
    date_from: date | None = None,
    date_to: date | None = None,
) -> ExerciseComparison:
    async def fetch_exercise_data(ex_id: int) -> pd.DataFrame:
        q = (
            select(Set)
            .join(WorkoutSession, Set.session_id == WorkoutSession.id)
            .where(Set.user_id == user_id)
            .where(Set.exercise_id == ex_id)
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
        rows = []
        for s in sets:
            rows.append({
                "date": s.session.date.isoformat(),
                "e1rm": epley(s.weight_kg, s.reps),
                "name": s.exercise.name,
            })
        return pd.DataFrame(rows)

    df_a = await fetch_exercise_data(exercise_a_id)
    df_b = await fetch_exercise_data(exercise_b_id)

    name_a = str(df_a["name"].iloc[0]) if not df_a.empty else f"Exercise {exercise_a_id}"
    name_b = str(df_b["name"].iloc[0]) if not df_b.empty else f"Exercise {exercise_b_id}"

    if not df_a.empty:
        daily_a = df_a.groupby("date")["e1rm"].max().reset_index().rename(columns={"e1rm": "e1rm_a"})
    else:
        daily_a = pd.DataFrame(columns=["date", "e1rm_a"])

    if not df_b.empty:
        daily_b = df_b.groupby("date")["e1rm"].max().reset_index().rename(columns={"e1rm": "e1rm_b"})
    else:
        daily_b = pd.DataFrame(columns=["date", "e1rm_b"])

    merged = pd.merge(daily_a, daily_b, on="date", how="outer").sort_values("date")
    timeline = merged.fillna(float("nan")).to_dict("records")

    return ExerciseComparison(
        exercise_a_id=exercise_a_id,
        exercise_a_name=name_a,
        exercise_b_id=exercise_b_id,
        exercise_b_name=name_b,
        timeline=[{k: (None if (isinstance(v, float) and pd.isna(v)) else v) for k, v in row.items()} for row in timeline],
    )


async def _period_metrics(
    user_id: str,
    db: AsyncSession,
    date_from: date,
    date_to: date,
    label: str,
) -> PeriodMetrics:
    q = (
        select(Set)
        .join(WorkoutSession, Set.session_id == WorkoutSession.id)
        .where(Set.user_id == user_id)
        .where(Set.reps > 0)
        .where(WorkoutSession.date >= date_from)
        .where(WorkoutSession.date <= date_to)
        .options(selectinload(Set.exercise), selectinload(Set.session))
    )
    result = await db.execute(q)
    sets = result.scalars().all()

    rows = []
    for s in sets:
        rows.append({
            "date": s.session.date.isoformat(),
            "session_id": s.session_id,
            "volume": s.weight_kg * s.reps,
            "muscle_group": s.exercise.primary_muscle_group,
            "e1rm": epley(s.weight_kg, s.reps) if s.weight_kg > 0 else 0,
            "exercise_name": s.exercise.name,
        })

    if not rows:
        return PeriodMetrics(
            label=label,
            date_from=date_from.isoformat(),
            date_to=date_to.isoformat(),
            total_volume_kg=0,
            total_sessions=0,
            total_sets=0,
            avg_weekly_volume=0,
            muscle_distribution={},
            top_prs=[],
        )

    df = pd.DataFrame(rows)
    total_vol = float(df["volume"].sum())
    total_sessions = int(df["session_id"].nunique())
    weeks = max(1, (date_to - date_from).days / 7)
    mg_dist = df.groupby("muscle_group")["volume"].sum().to_dict()
    top_prs = df.groupby("exercise_name")["e1rm"].max().nlargest(5).reset_index().to_dict("records")

    return PeriodMetrics(
        label=label,
        date_from=date_from.isoformat(),
        date_to=date_to.isoformat(),
        total_volume_kg=round(total_vol, 2),
        total_sessions=total_sessions,
        total_sets=len(df),
        avg_weekly_volume=round(total_vol / weeks, 2),
        muscle_distribution={k: round(float(v), 2) for k, v in mg_dist.items()},
        top_prs=[{"exercise": r["exercise_name"], "e1rm": round(float(r["e1rm"]), 2)} for r in top_prs],
    )


async def compare_periods(
    user_id: str,
    db: AsyncSession,
    p1_from: date,
    p1_to: date,
    p2_from: date,
    p2_to: date,
) -> PeriodComparison:
    p1 = await _period_metrics(user_id, db, p1_from, p1_to, "Periode 1")
    p2 = await _period_metrics(user_id, db, p2_from, p2_to, "Periode 2")
    return PeriodComparison(period_1=p1, period_2=p2)


async def get_muscle_balance(
    user_id: str,
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
) -> MuscleBalance:
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

    push = pull = quad = ham = anterior = posterior = 0.0
    for s in sets:
        vol = s.weight_kg * s.reps
        mg = s.exercise.primary_muscle_group
        if mg in PUSH_GROUPS:
            push += vol
        if mg in PULL_GROUPS:
            pull += vol
        if mg == QUAD_GROUP:
            quad += vol
        if mg == HAM_GROUP:
            ham += vol
        if mg in PUSH_GROUPS or mg == QUAD_GROUP or mg == "Core":
            anterior += vol
        if mg in PULL_GROUPS or mg in ("Beine_Glutes", "Beine_Hamstrings"):
            posterior += vol

    pp_ratio = round(push / pull, 3) if pull > 0 else 0
    qh_ratio = round(quad / ham, 3) if ham > 0 else 0
    ap_ratio = round(anterior / posterior, 3) if posterior > 0 else 0

    return MuscleBalance(
        push_pull_ratio=pp_ratio,
        push_pull_status="ok" if 0.8 <= pp_ratio <= 1.2 else ("too_much_push" if pp_ratio > 1.2 else "too_much_pull"),
        quad_ham_ratio=qh_ratio,
        quad_ham_status="ok" if 1.3 <= qh_ratio <= 1.8 else ("too_much_quad" if qh_ratio > 1.8 else "too_much_ham"),
        anterior_posterior_ratio=ap_ratio,
    )
