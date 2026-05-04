"""Initial schema

Revision ID: 001
Revises:
Create Date: 2024-01-01
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("email", sa.String(), unique=True, nullable=True),
        sa.Column("password_hash", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )

    op.create_table(
        "user_settings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id"), unique=True),
        sa.Column("target_sessions_per_week", sa.Integer(), default=4),
        sa.Column("age", sa.Integer(), nullable=True),
        sa.Column("resting_hr", sa.Integer(), nullable=True),
        sa.Column("max_hr", sa.Integer(), nullable=True),
        sa.Column("preferred_1rm_formula", sa.String(), default="epley"),
        sa.Column("weight_unit", sa.String(), default="kg"),
        sa.Column("bodyweight_kg", sa.Float(), nullable=True),
    )

    op.create_table(
        "exercises",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("gymgoal_id", sa.Integer(), nullable=False, index=True),
        sa.Column("name", sa.String(), nullable=False, index=True),
        sa.Column("is_user_created", sa.Boolean(), default=False),
        sa.Column("primary_muscle_group", sa.String(), default="Sonstige"),
        sa.Column("secondary_muscle_groups", sa.JSON(), default=list),
        sa.Column("category", sa.String(), default="bodyweight"),
        sa.Column("equipment", sa.String(), default="other"),
        sa.Column("is_user_overridden", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("gymgoal_id", "name", name="uq_exercise_gymgoal_id_name"),
    )

    op.create_table(
        "workout_sessions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id")),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("session_number", sa.Integer(), default=1),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("user_id", "date", "session_number", name="uq_session"),
    )

    op.create_table(
        "import_logs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id")),
        sa.Column("filename", sa.String(), nullable=False),
        sa.Column("imported_at", sa.DateTime(), nullable=False),
        sa.Column("rows_parsed", sa.Integer(), default=0),
        sa.Column("sets_created", sa.Integer(), default=0),
        sa.Column("sets_skipped", sa.Integer(), default=0),
        sa.Column("new_exercises", sa.Integer(), default=0),
        sa.Column("date_range_start", sa.String(), nullable=True),
        sa.Column("date_range_end", sa.String(), nullable=True),
        sa.Column("raw_file_path", sa.String(), nullable=True),
    )

    op.create_table(
        "sets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(), sa.ForeignKey("users.id")),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("workout_sessions.id")),
        sa.Column("exercise_id", sa.Integer(), sa.ForeignKey("exercises.id")),
        sa.Column("import_id", sa.Integer(), sa.ForeignKey("import_logs.id"), nullable=True),
        sa.Column("set_number", sa.Integer()),
        sa.Column("weight_kg", sa.Float(), default=0.0),
        sa.Column("reps", sa.Integer(), default=0),
        sa.Column("rpe", sa.Float(), nullable=True),
        sa.Column("is_warmup", sa.Boolean(), default=False),
        sa.Column("time_total_seconds", sa.Integer(), nullable=True),
        sa.Column("distance_meters", sa.Float(), nullable=True),
        sa.Column("calories", sa.Float(), nullable=True),
        sa.Column("avg_hr", sa.Integer(), nullable=True),
        sa.Column("max_hr", sa.Integer(), nullable=True),
        sa.Column("content_hash", sa.String(), unique=True, index=True),
        sa.UniqueConstraint("content_hash", name="uq_set_content_hash"),
    )


def downgrade() -> None:
    op.drop_table("sets")
    op.drop_table("import_logs")
    op.drop_table("workout_sessions")
    op.drop_table("exercises")
    op.drop_table("user_settings")
    op.drop_table("users")
