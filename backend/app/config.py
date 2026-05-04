from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./data/gymgoal.db"
    auth_enabled: bool = False
    default_user_email: str = "local@local"
    secret_key: str = "change-me-in-prod"
    upload_dir: str = "./data/uploads"
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"


settings = Settings()
