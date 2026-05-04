from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, JSON, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Exercise(Base):
    __tablename__ = "exercises"
    __table_args__ = (UniqueConstraint("gymgoal_id", "name", name="uq_exercise_gymgoal_id_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    gymgoal_id: Mapped[int] = mapped_column(Integer, index=True)
    name: Mapped[str] = mapped_column(String, index=True)
    is_user_created: Mapped[bool] = mapped_column(Boolean, default=False)
    primary_muscle_group: Mapped[str] = mapped_column(String, default="Sonstige")
    secondary_muscle_groups: Mapped[list] = mapped_column(JSON, default=list)
    category: Mapped[str] = mapped_column(String, default="bodyweight")
    equipment: Mapped[str] = mapped_column(String, default="other")
    is_user_overridden: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    sets: Mapped[list["Set"]] = relationship("Set", back_populates="exercise")  # type: ignore[name-defined]
