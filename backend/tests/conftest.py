"""Shared pytest fixtures."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db import Base, get_db
from app.main import app
from app.models.user import User, UserSettings

FIXTURES_DIR = Path(__file__).parent / "fixtures"
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    SessionLocal = async_sessionmaker(db_engine, expire_on_commit=False)
    async with SessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def seeded_db(db_session: AsyncSession) -> AsyncSession:
    from datetime import datetime
    user = User(id="local", email="local@local", created_at=datetime.utcnow())
    db_session.add(user)
    db_session.add(UserSettings(user_id="local"))
    await db_session.commit()
    return db_session


@pytest_asyncio.fixture(scope="function")
async def client(db_engine) -> AsyncGenerator[AsyncClient, None]:
    from datetime import datetime
    SessionLocal = async_sessionmaker(db_engine, expire_on_commit=False)

    async def override_get_db():
        async with SessionLocal() as session:
            # Seed local user
            from sqlalchemy import select
            result = await session.execute(
                select(User).where(User.email == "local@local")
            )
            if result.scalar_one_or_none() is None:
                session.add(User(id="local", email="local@local", created_at=datetime.utcnow()))
                session.add(UserSettings(user_id="local"))
                await session.commit()
            yield session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()
