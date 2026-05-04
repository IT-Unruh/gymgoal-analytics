from datetime import datetime

from pydantic import BaseModel


class ImportSummary(BaseModel):
    rows_parsed: int
    sets_created: int
    sets_skipped: int
    new_exercises: int
    date_range_start: str | None
    date_range_end: str | None
    import_id: int | None = None


class ImportLogRead(BaseModel):
    id: int
    filename: str
    imported_at: datetime
    rows_parsed: int
    sets_created: int
    sets_skipped: int
    new_exercises: int
    date_range_start: str | None
    date_range_end: str | None

    model_config = {"from_attributes": True}
