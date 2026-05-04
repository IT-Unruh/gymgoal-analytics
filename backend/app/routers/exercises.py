from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.auth import get_current_user
from app.db import get_db
from app.models.exercise import Exercise
from app.models.user import User
from app.schemas.exercise import ExercisePatch, ExerciseRead
from app.services.muscle_mapper import map_exercise

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("", response_model=list[ExerciseRead])
async def list_exercises(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ExerciseRead]:
    result = await db.execute(select(Exercise).order_by(Exercise.name))
    return [ExerciseRead.model_validate(e) for e in result.scalars().all()]


@router.patch("/{exercise_id}", response_model=ExerciseRead)
async def update_exercise(
    exercise_id: int,
    patch: ExercisePatch,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ExerciseRead:
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    exercise = result.scalar_one_or_none()
    if not exercise:
        raise HTTPException(status_code=404, detail="Übung nicht gefunden")

    if patch.primary_muscle_group is not None:
        exercise.primary_muscle_group = patch.primary_muscle_group
    if patch.secondary_muscle_groups is not None:
        exercise.secondary_muscle_groups = patch.secondary_muscle_groups
    if patch.category is not None:
        exercise.category = patch.category
    if patch.equipment is not None:
        exercise.equipment = patch.equipment
    exercise.is_user_overridden = True
    exercise.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(exercise)
    return ExerciseRead.model_validate(exercise)


@router.post("/remap")
async def remap_exercises(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> dict:
    result = await db.execute(select(Exercise).where(Exercise.is_user_overridden == False))  # noqa: E712
    exercises = result.scalars().all()
    remapped = 0
    for ex in exercises:
        mapping = map_exercise(ex.name)
        ex.primary_muscle_group = mapping.primary
        ex.secondary_muscle_groups = list(mapping.secondary)
        ex.category = mapping.category
        ex.equipment = mapping.equipment
        remapped += 1
    await db.commit()
    return {"remapped": remapped}
