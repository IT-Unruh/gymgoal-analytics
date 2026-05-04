# GymGoal Analytics

A local-first analytics dashboard for your **GymGoal Pro** (iOS) workout history.  
Import your `.tab` export, get instant charts for frequency, volume, PRs, progression, periodization, forecasts, and cardio.

---

## Quick Start (5 commands)

```bash
git clone <repo> gymgoal-analytics && cd gymgoal-analytics

# 1. Python backend
cd backend && python -m venv .venv && .venv/Scripts/pip install -e ".[dev]"
.venv/Scripts/alembic -c alembic/alembic.ini upgrade head
.venv/Scripts/python app/seed/seed.py

# 2. Frontend
cd ../frontend && npm install

# 3. Run
make dev          # starts backend on :8000 and frontend on :5173
```

Then open **http://localhost:5173**, go to **Import**, drag your `.tab` file in.

---

## Architecture

```
gymgoal-analytics/
├── backend/            FastAPI + SQLAlchemy (async) + SQLite
│   ├── app/
│   │   ├── main.py     FastAPI entrypoint, CORS, routers
│   │   ├── models/     SQLAlchemy ORM (users, exercises, sessions, sets, imports)
│   │   ├── routers/    REST API: auth, imports, exercises, settings, analytics
│   │   └── services/
│   │       ├── importer.py       .tab parser + dedup (content hash)
│   │       ├── muscle_mapper.py  Heuristic keyword mapper
│   │       └── analytics/        8 modules (frequency, volume, prs, …)
│   ├── alembic/        DB migrations
│   └── tests/          pytest, 51 tests
└── frontend/           React 18 + Vite + TypeScript + TailwindCSS + Recharts
    └── src/
        ├── pages/      One page per route (12 pages)
        ├── api/        TanStack Query hooks
        ├── components/ Layout, KpiCard, EmptyState, skeletons
        └── lib/        format.ts (German locale), colors.ts
```

---

## How to export from GymGoal Pro

1. Open GymGoal Pro on iPhone
2. Settings → **Export** → **Workouts**
3. Choose **Tab Separated** format
4. Send to yourself via email
5. Save the `.tab` file and drag it onto the Import page

[screenshot: GymGoal export screen]

---

## How to add a new analytics module

1. Create `backend/app/services/analytics/mymodule.py`:

```python
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

class MyStats(BaseModel):
    total: int

async def get_my_stats(user_id: str, db: AsyncSession) -> MyStats:
    # query sets, compute, return
    return MyStats(total=0)
```

2. Add an endpoint in `backend/app/routers/analytics.py`:

```python
from app.services.analytics.mymodule import MyStats, get_my_stats

@router.get("/mymodule", response_model=MyStats)
async def analytics_mymodule(...) -> MyStats:
    return await get_my_stats(current_user.id, db)
```

3. Add a TanStack Query hook in `frontend/src/api/hooks.ts` and a page in `frontend/src/pages/`.

---

## Makefile targets

| Command | Action |
|---|---|
| `make dev` | Run backend + frontend concurrently |
| `make backend` | Backend only (uvicorn --reload) |
| `make frontend` | Frontend only (vite dev) |
| `make seed` | Migrate DB + create local user + seed exercises |
| `make test` | Both test suites |
| `make lint` | ruff + mypy (backend), tsc (frontend) |
| `make import FILE=path/to/export.tab` | CLI import |
| `make clean` | Delete all data (with confirmation) |

---

## Deployment

For production: set `AUTH_ENABLED=true`, a strong `SECRET_KEY`, and serve the frontend build via a reverse proxy (nginx) or serve it from FastAPI with `StaticFiles`.

```bash
docker compose up -d
```

The container runs migrations, seeds the DB, and starts uvicorn on port 8000.
