from pydantic import BaseModel


class SetRead(BaseModel):
    id: int
    session_id: int
    exercise_id: int
    set_number: int
    weight_kg: float
    reps: int
    is_warmup: bool
    time_total_seconds: int | None
    distance_meters: float | None
    calories: float | None
    avg_hr: int | None
    max_hr: int | None

    model_config = {"from_attributes": True}
