"""Training frequency and consistency analytics."""

from __future__ import annotations

from collections import Counter
from datetime import date, timedelta

import pandas as pd
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.workout_session import WorkoutSession


class CalendarDay(BaseModel):
    date: str
    session_count: int
    total_sets: int


class FrequencyStats(BaseModel):
    sessions_per_week: list[dict]
    sessions_per_month: list[dict]
    rolling_4w_avg: float
    longest_streak: int
    current_streak: int
    longest_gap_days: int
    day_of_week_distribution: dict[str, int]
    adherence_score: float
    calendar_heatmap: list[CalendarDay]
    total_sessions: int


async def get_frequency_stats(
    user_id: str,
    db: AsyncSession,
    date_from: date | None = None,
    date_to: date | None = None,
    target_sessions_per_week: int = 4,
) -> FrequencyStats:
    q = select(WorkoutSession).where(WorkoutSession.user_id == user_id)
    if date_from:
        q = q.where(WorkoutSession.date >= date_from)
    if date_to:
        q = q.where(WorkoutSession.date <= date_to)
    result = await db.execute(q)
    sessions = result.scalars().all()

    if not sessions:
        return FrequencyStats(
            sessions_per_week=[],
            sessions_per_month=[],
            rolling_4w_avg=0.0,
            longest_streak=0,
            current_streak=0,
            longest_gap_days=0,
            day_of_week_distribution={},
            adherence_score=0.0,
            calendar_heatmap=[],
            total_sessions=0,
        )

    session_dates = sorted({s.date for s in sessions})
    date_counter = Counter(session_dates)

    df = pd.DataFrame({"date": session_dates})
    df["date"] = pd.to_datetime(df["date"])
    df["week"] = df["date"].dt.to_period("W")
    df["month"] = df["date"].dt.to_period("M")

    spw = df.groupby("week").size().reset_index(name="count")
    spm = df.groupby("month").size().reset_index(name="count")

    sessions_per_week = [{"week": str(r["week"]), "count": int(r["count"])} for _, r in spw.iterrows()]
    sessions_per_month = [{"month": str(r["month"]), "count": int(r["count"])} for _, r in spm.iterrows()]

    # Rolling 4-week average
    if len(sessions_per_week) >= 4:
        rolling_4w_avg = float(spw["count"].iloc[-4:].mean())
    else:
        rolling_4w_avg = float(spw["count"].mean()) if len(spw) > 0 else 0.0

    # Streak detection
    sorted_dates = sorted(session_dates)
    longest_streak = current_streak = streak = 1
    for i in range(1, len(sorted_dates)):
        if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
            streak += 1
        else:
            streak = 1
        longest_streak = max(longest_streak, streak)

    today = date.today()
    current_streak = 0
    for d in reversed(sorted_dates):
        if (today - d).days <= 1:
            current_streak += 1
        else:
            break

    # Longest gap
    gaps = [(sorted_dates[i] - sorted_dates[i - 1]).days for i in range(1, len(sorted_dates))]
    longest_gap_days = max(gaps) if gaps else 0

    # Day of week distribution
    dow_names = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"]
    dow_counter: dict[str, int] = {n: 0 for n in dow_names}
    for d in session_dates:
        dow_counter[dow_names[d.weekday()] ] += 1

    # Adherence score
    if date_from and date_to:
        weeks_in_range = max(1, (date_to - date_from).days / 7)
    else:
        if sorted_dates:
            weeks_in_range = max(1, (sorted_dates[-1] - sorted_dates[0]).days / 7)
        else:
            weeks_in_range = 1
    actual_sessions = len(session_dates)
    target_total = target_sessions_per_week * weeks_in_range
    adherence_score = min(1.0, actual_sessions / target_total) if target_total > 0 else 0.0

    # Calendar heatmap
    calendar: list[CalendarDay] = []
    for d, count in sorted(date_counter.items()):
        calendar.append(CalendarDay(date=d.isoformat(), session_count=count, total_sets=0))

    return FrequencyStats(
        sessions_per_week=sessions_per_week,
        sessions_per_month=sessions_per_month,
        rolling_4w_avg=round(rolling_4w_avg, 2),
        longest_streak=longest_streak,
        current_streak=current_streak,
        longest_gap_days=longest_gap_days,
        day_of_week_distribution=dow_counter,
        adherence_score=round(adherence_score, 3),
        calendar_heatmap=calendar,
        total_sessions=len(session_dates),
    )
