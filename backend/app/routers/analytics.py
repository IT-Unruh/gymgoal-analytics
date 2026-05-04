from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.db import get_db
from app.models.user import User, UserSettings
from app.schemas.user import UserSettingsRead
from app.services.analytics.cardio import CardioStats, get_cardio
from app.services.analytics.comparisons import (
    ExerciseComparison,
    MuscleBalance,
    PeriodComparison,
    compare_exercises,
    compare_periods,
    get_muscle_balance,
)
from app.services.analytics.frequency import FrequencyStats, get_frequency_stats
from app.services.analytics.periodization import PeriodizationStats, get_periodization
from app.services.analytics.predictive import PredictiveStats, get_predictive
from app.services.analytics.progression import ExerciseTrend, get_progression
from app.services.analytics.prs import ExercisePRs, get_prs
from app.services.analytics.volume import VolumeStats, get_volume_stats

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def _get_user_settings(user_id: str, db: AsyncSession) -> UserSettings:
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user_id))
    s = result.scalar_one_or_none()
    if not s:
        s = UserSettings(user_id=user_id)
        db.add(s)
        await db.commit()
        await db.refresh(s)
    return s


@router.get("/frequency", response_model=FrequencyStats)
async def analytics_frequency(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FrequencyStats:
    settings = await _get_user_settings(current_user.id, db)
    return await get_frequency_stats(current_user.id, db, from_date, to_date, settings.target_sessions_per_week)


@router.get("/volume", response_model=VolumeStats)
async def analytics_volume(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> VolumeStats:
    return await get_volume_stats(current_user.id, db, from_date, to_date)


@router.get("/prs", response_model=list[ExercisePRs])
async def analytics_prs(
    exercise_id: int | None = Query(None),
    formula: str = Query("epley"),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ExercisePRs]:
    return await get_prs(current_user.id, db, exercise_id, formula, from_date, to_date)


@router.get("/progression", response_model=list[ExerciseTrend])
async def analytics_progression(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ExerciseTrend]:
    return await get_progression(current_user.id, db, from_date, to_date)


@router.get("/periodization", response_model=PeriodizationStats)
async def analytics_periodization(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodizationStats:
    return await get_periodization(current_user.id, db, from_date, to_date)


@router.get("/predictive", response_model=PredictiveStats)
async def analytics_predictive(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PredictiveStats:
    settings = await _get_user_settings(current_user.id, db)
    return await get_predictive(current_user.id, db, from_date, to_date, settings.target_sessions_per_week)


@router.get("/cardio", response_model=CardioStats)
async def analytics_cardio(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CardioStats:
    settings = await _get_user_settings(current_user.id, db)
    return await get_cardio(current_user.id, db, from_date, to_date, settings.resting_hr, settings.max_hr, settings.age)


@router.get("/compare/exercises", response_model=ExerciseComparison)
async def analytics_compare_exercises(
    a: int = Query(...),
    b: int = Query(...),
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ExerciseComparison:
    return await compare_exercises(current_user.id, db, a, b, from_date, to_date)


@router.get("/compare/periods", response_model=PeriodComparison)
async def analytics_compare_periods(
    p1_from: date = Query(...),
    p1_to: date = Query(...),
    p2_from: date = Query(...),
    p2_to: date = Query(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodComparison:
    return await compare_periods(current_user.id, db, p1_from, p1_to, p2_from, p2_to)


@router.get("/muscle-balance", response_model=MuscleBalance)
async def analytics_muscle_balance(
    from_date: date | None = Query(None, alias="from"),
    to_date: date | None = Query(None, alias="to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MuscleBalance:
    return await get_muscle_balance(current_user.id, db, from_date, to_date)
