"""API integration tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health(client: AsyncClient) -> None:
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "local@local"


@pytest.mark.asyncio
async def test_list_exercises_empty(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/exercises")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_analytics_frequency_empty(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/analytics/frequency")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_sessions"] == 0


@pytest.mark.asyncio
async def test_analytics_volume_empty(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/analytics/volume")
    assert resp.status_code == 200
    assert resp.json()["total_volume_kg"] == 0


@pytest.mark.asyncio
async def test_settings_get_and_patch(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/settings")
    assert resp.status_code == 200
    assert resp.json()["target_sessions_per_week"] == 4

    resp = await client.patch("/api/v1/settings", json={"target_sessions_per_week": 5})
    assert resp.status_code == 200
    assert resp.json()["target_sessions_per_week"] == 5


@pytest.mark.asyncio
async def test_list_imports_empty(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/imports")
    assert resp.status_code == 200
    assert resp.json() == []
