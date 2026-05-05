@echo off
echo Starting GymGoal Analytics...

start "GymGoal Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
start "GymGoal Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
