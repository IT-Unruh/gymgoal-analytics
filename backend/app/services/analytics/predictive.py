"""Forecasts, burnout signals, and recommendations."""

from __future__ import annotations

from datetime import date, timedelta

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


class Forecast(BaseModel):
    exercise_id: int
    exercise_name: str
    current_e1rm: float
    forecast_4w: float
    forecast_8w: float
    ci_lower_4w: float
    ci_upper_4w: float
    ci_lower_8w: float
    ci_upper_8w: float


class Warning(BaseModel):
    severity: str  # info | warning | critical
    metric: str
    message: str
    recommendation: str


class PredictiveStats(BaseModel):
    forecasts: list[Forecast]
    warnings: list[Warning]
    acwr: float | None
    acute_load: float
    chronic_load: float


async def get_predictive(
    user_id: str,
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
    target_sessions_per_week: int = 4,
) -> PredictiveStats:
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

    warnings: list[Warning] = []
    forecasts: list[Forecast] = []
    acwr = None
    acute_load = 0.0
    chronic_load = 0.0

    if not sets:
        return PredictiveStats(forecasts=[], warnings=[], acwr=None, acute_load=0, chronic_load=0)

    rows = []
    for s in sets:
        e1rm = epley(s.weight_kg, s.reps) if s.weight_kg > 0 else 0
        rows.append({
            "date": pd.Timestamp(s.session.date),
            "exercise_id": s.exercise_id,
            "exercise_name": s.exercise.name,
            "volume": s.weight_kg * s.reps,
            "e1rm": e1rm,
        })

    df = pd.DataFrame(rows)
    today = pd.Timestamp(date.today())

    # ACWR — acute (7 days) vs chronic (28 days)
    acute_df = df[df["date"] >= today - pd.Timedelta(days=7)]
    chronic_df = df[df["date"] >= today - pd.Timedelta(days=28)]
    acute_load = float(acute_df["volume"].sum())
    chronic_load_total = float(chronic_df["volume"].sum())
    chronic_load = chronic_load_total / 4 if chronic_load_total > 0 else 0  # weekly avg

    if chronic_load > 0:
        acwr = round(acute_load / chronic_load, 3)
        if acwr > 1.5:
            warnings.append(Warning(
                severity="critical",
                metric="acwr",
                message=f"Akute:Chronische Belastungsrate = {acwr:.2f} (> 1.5). Verletzungsrisiko erhöht.",
                recommendation="Reduziiere das Trainingsvolumen dieser Woche um 20–30%.",
            ))
        elif acwr > 1.3:
            warnings.append(Warning(
                severity="warning",
                metric="acwr",
                message=f"Akute:Chronische Belastungsrate = {acwr:.2f} (> 1.3). Beobachte Erholung.",
                recommendation="Behalte das Volumen konstant und priorisiere Schlaf.",
            ))

    # Frequency dip check
    sessions_7d = len(df[df["date"] >= today - pd.Timedelta(days=7)]["date"].dt.date.unique())
    sessions_4w = len(df[df["date"] >= today - pd.Timedelta(days=28)]["date"].dt.date.unique())
    avg_sessions_per_week = sessions_4w / 4
    if avg_sessions_per_week > 0 and sessions_7d < avg_sessions_per_week * 0.6:
        warnings.append(Warning(
            severity="info",
            metric="frequency",
            message=f"Diese Woche nur {sessions_7d} Session(s) vs. Durchschnitt {avg_sessions_per_week:.1f}/Woche.",
            recommendation="Konsistenz prüfen — Trainingstage nachplanen?",
        ))

    # Top 5 lift forecasts
    lift_df = df[df["e1rm"] > 0]
    top_lifts = (
        lift_df.groupby(["exercise_id", "exercise_name"])["e1rm"]
        .max()
        .nlargest(5)
        .reset_index()
    )

    for _, row in top_lifts.iterrows():
        ex_id = int(row["exercise_id"])
        ex_name = str(row["exercise_name"])
        ex_data = lift_df[(lift_df["exercise_id"] == ex_id)].copy()
        daily = ex_data.groupby("date")["e1rm"].max().reset_index()
        daily["week_num"] = (daily["date"] - daily["date"].min()).dt.days / 7

        if len(daily) < 2:
            continue

        x = daily["week_num"].values.astype(float)
        y = daily["e1rm"].values.astype(float)
        slope, intercept, r, p, se = stats.linregress(x, y)
        current_week = float((today - daily["date"].min()).days / 7)
        current_e1rm = float(daily["e1rm"].iloc[-1])

        def predict(w: float) -> tuple[float, float, float]:
            y_hat = slope * w + intercept
            n = len(x)
            x_mean = float(np.mean(x))
            s_err = float(np.sqrt(np.sum((y - (slope * x + intercept)) ** 2) / (n - 2))) if n > 2 else 0
            margin = 1.96 * s_err * float(np.sqrt(1 + 1/n + (w - x_mean)**2 / float(np.sum((x - x_mean)**2) or 1)))
            return float(y_hat), float(y_hat - margin), float(y_hat + margin)

        p4, lo4, hi4 = predict(current_week + 4)
        p8, lo8, hi8 = predict(current_week + 8)

        forecasts.append(Forecast(
            exercise_id=ex_id,
            exercise_name=ex_name,
            current_e1rm=round(current_e1rm, 2),
            forecast_4w=round(max(0, p4), 2),
            forecast_8w=round(max(0, p8), 2),
            ci_lower_4w=round(max(0, lo4), 2),
            ci_upper_4w=round(max(0, hi4), 2),
            ci_lower_8w=round(max(0, lo8), 2),
            ci_upper_8w=round(max(0, hi8), 2),
        ))

    return PredictiveStats(
        forecasts=forecasts,
        warnings=warnings,
        acwr=acwr,
        acute_load=round(acute_load, 2),
        chronic_load=round(chronic_load, 2),
    )
