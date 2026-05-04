.PHONY: dev backend frontend test lint seed import clean

PYTHON := backend/.venv/Scripts/python
PIP    := backend/.venv/Scripts/pip
ALEMBIC := backend/.venv/Scripts/alembic
PYTEST := backend/.venv/Scripts/pytest
NPM    := npm

# ── Setup ─────────────────────────────────────────────────────────────────────

setup: setup-backend setup-frontend

setup-backend:
	cd backend && python -m venv .venv && $(PIP) install -e ".[dev]"

setup-frontend:
	cd frontend && $(NPM) install

# ── Dev servers ───────────────────────────────────────────────────────────────

dev:
	@echo "Starting backend + frontend..."
	$(MAKE) -j2 backend frontend

backend:
	cd backend && $(PYTHON) -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && $(NPM) run dev

# ── Database ──────────────────────────────────────────────────────────────────

migrate:
	cd backend && $(ALEMBIC) -c alembic/alembic.ini upgrade head

seed: migrate
	cd backend && $(PYTHON) app/seed/seed.py

# ── Import ────────────────────────────────────────────────────────────────────

import:
ifndef FILE
	$(error FILE is required: make import FILE=path/to/export.tab)
endif
	cd backend && $(PYTHON) -c "\
import asyncio; \
from app.seed.seed import seed; \
from app.services.importer import import_tab_file; \
from app.db import AsyncSessionLocal; \
from pathlib import Path; \
async def run(): \
    await seed(); \
    async with AsyncSessionLocal() as db: \
        s = await import_tab_file(Path('$(FILE)'), '$(notdir $(FILE))', 'local', db); \
        print(s); \
asyncio.run(run())"

# ── Tests ─────────────────────────────────────────────────────────────────────

test: test-backend test-frontend

test-backend:
	cd backend && $(PYTEST) tests/ -v --cov=app/services --cov-report=term-missing

test-frontend:
	cd frontend && $(NPM) run test -- --run

# ── Lint ──────────────────────────────────────────────────────────────────────

lint: lint-backend lint-frontend

lint-backend:
	cd backend && backend/.venv/Scripts/ruff check app/ && backend/.venv/Scripts/mypy app/services/

lint-frontend:
	cd frontend && $(NPM) run build

# ── Clean ─────────────────────────────────────────────────────────────────────

clean:
	@read -p "Alle Daten in data/ löschen? [y/N] " confirm && [ "$$confirm" = "y" ]
	rm -rf backend/data/gymgoal.db backend/data/uploads/*
	@echo "Daten gelöscht."
