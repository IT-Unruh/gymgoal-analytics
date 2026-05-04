from pydantic import BaseModel


class UserRead(BaseModel):
    id: str
    email: str | None

    model_config = {"from_attributes": True}


class UserSettingsRead(BaseModel):
    target_sessions_per_week: int
    age: int | None
    resting_hr: int | None
    max_hr: int | None
    preferred_1rm_formula: str
    weight_unit: str
    bodyweight_kg: float | None

    model_config = {"from_attributes": True}


class UserSettingsPatch(BaseModel):
    target_sessions_per_week: int | None = None
    age: int | None = None
    resting_hr: int | None = None
    max_hr: int | None = None
    preferred_1rm_formula: str | None = None
    weight_unit: str | None = None
    bodyweight_kg: float | None = None
