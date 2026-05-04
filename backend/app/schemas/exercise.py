from pydantic import BaseModel


class ExerciseRead(BaseModel):
    id: int
    gymgoal_id: int
    name: str
    is_user_created: bool
    primary_muscle_group: str
    secondary_muscle_groups: list[str]
    category: str
    equipment: str
    is_user_overridden: bool

    model_config = {"from_attributes": True}


class ExercisePatch(BaseModel):
    primary_muscle_group: str | None = None
    secondary_muscle_groups: list[str] | None = None
    category: str | None = None
    equipment: str | None = None
