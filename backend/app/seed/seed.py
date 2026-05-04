"""Seed script: create local user + load exercise taxonomy."""

from __future__ import annotations

import asyncio
import json
import sys
import uuid
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.models.exercise import Exercise
from app.models.user import User, UserSettings

TAXONOMY_PATH = Path(__file__).parent / "exercise_taxonomy.json"

# Stable fake gymgoal_id for seeded exercises (seeds start at -9999)
SEED_BASE_ID = -9999


async def seed(engine_url: str = settings.database_url) -> None:
    engine = create_async_engine(engine_url)
    SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

    async with SessionLocal() as db:
        await _seed_user(db)
        await _seed_exercises(db)

    await engine.dispose()
    print("Seed complete.")


async def _seed_user(db: AsyncSession) -> None:
    result = await db.execute(select(User).where(User.email == settings.default_user_email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(
            id="local",
            email=settings.default_user_email,
            created_at=datetime.utcnow(),
        )
        db.add(user)
        await db.flush()
        print(f"Created user: {settings.default_user_email}")
    else:
        print(f"User already exists: {settings.default_user_email}")

    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    if result.scalar_one_or_none() is None:
        db.add(UserSettings(user_id=user.id))
        print("Created user settings")

    await db.commit()


async def _seed_exercises(db: AsyncSession) -> None:
    taxonomy: dict = json.loads(TAXONOMY_PATH.read_text(encoding="utf-8"))
    created = 0
    for i, (name, mapping) in enumerate(taxonomy.items()):
        gymgoal_id = SEED_BASE_ID - i
        result = await db.execute(
            select(Exercise).where(Exercise.gymgoal_id == gymgoal_id, Exercise.name == name)
        )
        if result.scalar_one_or_none() is None:
            ex = Exercise(
                gymgoal_id=gymgoal_id,
                name=name,
                primary_muscle_group=mapping["primary"],
                secondary_muscle_groups=mapping.get("secondary", []),
                category=mapping["category"],
                equipment=mapping["equipment"],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(ex)
            created += 1
    await db.commit()
    print(f"Seeded {created} exercises (skipped existing)")


if __name__ == "__main__":
    asyncio.run(seed())
