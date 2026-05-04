from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ImportLog(Base):
    __tablename__ = "import_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    filename: Mapped[str] = mapped_column(String)
    imported_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    rows_parsed: Mapped[int] = mapped_column(Integer, default=0)
    sets_created: Mapped[int] = mapped_column(Integer, default=0)
    sets_skipped: Mapped[int] = mapped_column(Integer, default=0)
    new_exercises: Mapped[int] = mapped_column(Integer, default=0)
    date_range_start: Mapped[str | None] = mapped_column(String, nullable=True)
    date_range_end: Mapped[str | None] = mapped_column(String, nullable=True)
    raw_file_path: Mapped[str | None] = mapped_column(String, nullable=True)
