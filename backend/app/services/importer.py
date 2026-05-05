"""GymGoal Pro .tab file parser with deduplication."""

from __future__ import annotations

import hashlib
import math
import os
from datetime import date
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exercise import Exercise
from app.models.import_log import ImportLog
from app.models.set import Set
from app.models.workout_session import WorkoutSession
from app.schemas.import_log import ImportSummary
from app.services.muscle_mapper import map_exercise


def _parse_time_to_seconds(val: Any) -> int | None:
    """Convert 'H:MM:SS' or 'MM:SS' string to total seconds."""
    if pd.isna(val) or str(val).strip() == "":
        return None
    parts = str(val).strip().split(":")
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    except ValueError:
        pass
    return None


def _compute_hash(row: pd.Series) -> str:
    def s(v: Any) -> str:
        if pd.isna(v):
            return ""
        return str(v).strip()

    raw = "|".join([
        s(row.get("Date")),
        s(row.get("Session")),
        s(row.get("Exercise ID")),
        s(row.get("Set")),
        s(row.get("Weight")),
        s(row.get("Reps")),
        s(row.get("Time Total")),
        s(row.get("Distance")),
    ])
    return hashlib.sha256(raw.encode()).hexdigest()


def _normalize_weight_to_kg(weight: float, unit: str) -> float:
    if str(unit).strip().lower() == "lb":
        return weight * 0.45359237
    return weight


def _normalize_distance_to_meters(distance: float, exercise_name: str, unit: str) -> float | None:
    if math.isnan(distance):
        return None
    if distance == 0:
        return None
    # Rudermaschine exports distance in meters despite "km" unit label
    if "rudermaschine" in exercise_name.lower():
        return distance
    if str(unit).strip().lower() == "km":
        return distance * 1000
    return distance  # assume meters


def _clean_notes(val: Any) -> str | None:
    if pd.isna(val):
        return None
    s = str(val).strip().strip('"').strip()
    return s if s else None


async def import_tab_file(
    file_path: Path,
    filename: str,
    user_id: str,
    db: AsyncSession,
) -> ImportSummary:
    df = pd.read_csv(
        file_path,
        sep="\t",
        encoding="utf-8-sig",
        decimal=",",
        thousands=".",
        dtype=str,  # read everything as str first for safe forward-fill
    )

    # Forward-fill exercise name and weight units first (before numeric coercion)
    df["Exercise Name"] = df["Exercise Name"].replace("", float("nan")).ffill()
    df["Weight Units"] = df["Weight Units"].replace("", float("nan")).ffill()

    # Coerce numeric columns: German format uses "," as decimal and "." as thousands separator.
    # Read as str so forward-fill works, then convert each column individually.
    for col in ["Session", "Exercise ID", "Set", "Weight", "Reps", "1RM",
                "Total Weight Lifted", "Max Weight Lifted", "Distance",
                "Calories", "Average Heart Rate", "Max Heart Rate", "Angle"]:
        if col in df.columns:
            df[col] = pd.to_numeric(
                df[col].astype(str).str.replace(r"\.", "", regex=True).str.replace(",", "."),
                errors="coerce",
            )

    # Forward-fill per-exercise header columns within (Date, Session, Exercise ID) groups
    for col in ["1RM", "Total Weight Lifted", "Max Weight Lifted"]:
        if col in df.columns:
            df[col] = df.groupby(["Date", "Session", "Exercise ID"])[col].ffill()

    # Skip rows where Set, Weight, Reps AND Time Total AND Distance are all empty.
    # Cardio rows legitimately have no Set/Weight/Reps but do have Time Total or Distance.
    has_time = df["Time Total"].notna() if "Time Total" in df.columns else False
    has_dist = df["Distance"].notna() if "Distance" in df.columns else False
    mask = df["Set"].isna() & df["Weight"].isna() & df["Reps"].isna() & ~has_time & ~has_dist
    df = df[~mask].reset_index(drop=True)
    # Reps == 0 is kept in DB (cardio sets have no reps); analytics filters them where needed

    # Compute content hash
    df["_hash"] = df.apply(_compute_hash, axis=1)

    rows_parsed = len(df)
    sets_created = 0
    sets_skipped = 0
    new_exercises = 0

    # Create import log entry first (to get id)
    import_log = ImportLog(
        user_id=user_id,
        filename=filename,
        rows_parsed=rows_parsed,
        sets_created=0,
        sets_skipped=0,
        new_exercises=0,
        raw_file_path=str(file_path),
    )
    db.add(import_log)
    await db.flush()

    exercise_cache: dict[tuple[int, str], int] = {}  # (gymgoal_id, name) -> exercise.id
    session_cache: dict[tuple[str, int], int] = {}   # (date_str, session_num) -> session.id

    dates: list[str] = []

    for _, row in df.iterrows():
        content_hash = str(row["_hash"])

        # Check for duplicate
        existing = await db.execute(select(Set).where(Set.content_hash == content_hash))
        if existing.scalar_one_or_none() is not None:
            sets_skipped += 1
            continue

        raw_date = str(row.get("Date", "")).strip()
        session_num = int(row["Session"]) if not pd.isna(row.get("Session")) else 1
        gymgoal_id = int(row["Exercise ID"]) if not pd.isna(row.get("Exercise ID")) else 0
        exercise_name = str(row.get("Exercise Name", "Unknown")).strip()
        weight_unit = str(row.get("Weight Units", "kg")).strip()
        weight_raw = float(row["Weight"]) if not pd.isna(row.get("Weight")) else 0.0
        reps = int(row["Reps"]) if not pd.isna(row.get("Reps")) else 0
        set_num = int(row["Set"]) if not pd.isna(row.get("Set")) else 1
        time_total_str = row.get("Time Total")
        distance_raw = float(row["Distance"]) if not pd.isna(row.get("Distance")) else float("nan")
        calories = float(row["Calories"]) if not pd.isna(row.get("Calories")) else None
        avg_hr_raw = row.get("Average Heart Rate")
        max_hr_raw = row.get("Max Heart Rate")

        avg_hr = int(float(avg_hr_raw)) if not pd.isna(avg_hr_raw) else None
        max_hr = int(float(max_hr_raw)) if not pd.isna(max_hr_raw) else None

        dates.append(raw_date)

        weight_kg = _normalize_weight_to_kg(weight_raw, weight_unit)
        distance_m = _normalize_distance_to_meters(distance_raw, exercise_name, str(row.get("Distance Units", "km")))
        time_seconds = _parse_time_to_seconds(time_total_str)

        # Resolve or create exercise
        ex_key = (gymgoal_id, exercise_name)
        if ex_key not in exercise_cache:
            result = await db.execute(
                select(Exercise).where(
                    Exercise.gymgoal_id == gymgoal_id,
                    Exercise.name == exercise_name,
                )
            )
            exercise = result.scalar_one_or_none()
            if exercise is None:
                mapping = map_exercise(exercise_name)
                exercise = Exercise(
                    gymgoal_id=gymgoal_id,
                    name=exercise_name,
                    is_user_created=gymgoal_id < 0,
                    primary_muscle_group=mapping.primary,
                    secondary_muscle_groups=list(mapping.secondary),
                    category=mapping.category,
                    equipment=mapping.equipment,
                )
                db.add(exercise)
                await db.flush()
                new_exercises += 1
            exercise_cache[ex_key] = exercise.id

        exercise_id = exercise_cache[ex_key]

        # Resolve or create session
        sess_key = (raw_date, session_num)
        if sess_key not in session_cache:
            result = await db.execute(
                select(WorkoutSession).where(
                    WorkoutSession.user_id == user_id,
                    WorkoutSession.date == date.fromisoformat(raw_date),
                    WorkoutSession.session_number == session_num,
                )
            )
            session = result.scalar_one_or_none()
            if session is None:
                session = WorkoutSession(
                    user_id=user_id,
                    date=date.fromisoformat(raw_date),
                    session_number=session_num,
                )
                db.add(session)
                await db.flush()
            session_cache[sess_key] = session.id

        session_id = session_cache[sess_key]

        set_obj = Set(
            user_id=user_id,
            session_id=session_id,
            exercise_id=exercise_id,
            import_id=import_log.id,
            set_number=set_num,
            weight_kg=weight_kg,
            reps=reps,
            is_warmup=False,
            time_total_seconds=time_seconds,
            distance_meters=distance_m,
            calories=calories,
            avg_hr=avg_hr,
            max_hr=max_hr,
            content_hash=content_hash,
        )
        db.add(set_obj)
        sets_created += 1

    # Update import log
    import_log.sets_created = sets_created
    import_log.sets_skipped = sets_skipped
    import_log.new_exercises = new_exercises
    if dates:
        import_log.date_range_start = min(dates)
        import_log.date_range_end = max(dates)

    await db.commit()

    return ImportSummary(
        rows_parsed=rows_parsed,
        sets_created=sets_created,
        sets_skipped=sets_skipped,
        new_exercises=new_exercises,
        date_range_start=import_log.date_range_start,
        date_range_end=import_log.date_range_end,
        import_id=import_log.id,
    )
