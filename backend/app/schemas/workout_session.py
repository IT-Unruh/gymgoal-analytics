from datetime import date

from pydantic import BaseModel


class WorkoutSessionRead(BaseModel):
    id: int
    date: date
    session_number: int
    notes: str | None

    model_config = {"from_attributes": True}
