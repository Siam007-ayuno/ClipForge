import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "ClipForge"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "clipforge-super-secret-jwt-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = "sqlite:///./clipforge.db"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    # Storage adapter: "local" or "s3"
    STORAGE_TYPE: str = "local"
    LOCAL_STORAGE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "storage_data"))
    
    # S3 / Cloudflare R2 settings
    S3_ENDPOINT_URL: str = ""
    S3_ACCESS_KEY_ID: str = ""
    S3_SECRET_ACCESS_KEY: str = ""
    S3_BUCKET_NAME: str = "clipforge-bucket"
    S3_REGION: str = "auto"

    # AI / LLM Configuration
    LLM_PROVIDER: str = "gemini"  # "gemini" or "claude"
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.0-flash"
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"

    # Whisper Transcription Configuration
    WHISPER_MODEL_SIZE: str = "base"  # tiny, base, small, medium, large-v3
    WHISPER_DEVICE: str = "cpu"       # "cpu" or "cuda"
    WHISPER_COMPUTE_TYPE: str = "int8" # "int8", "float16", "float32"

    # Clip Extraction Constraints
    MIN_CLIP_DURATION: float = 20.0   # minimum clip seconds (20-30s turbo shorts)
    MAX_CLIP_DURATION: float = 60.0   # maximum clip seconds
    TARGET_CLIPS_COUNT: int = 5       # number of top viral clips to extract

    # Uploads
    MAX_UPLOAD_SIZE_BYTES: int = 2 * 1024 * 1024 * 1024  # 2 GB
    CHUNK_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB default chunk

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
