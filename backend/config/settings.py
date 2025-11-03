from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Supabase Configuration
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_anon_key: str = Field(..., env="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(..., env="SUPABASE_SERVICE_ROLE_KEY")
    
    # Security Settings
    jwt_secret: str = Field(default="your-secret-key", env="JWT_SECRET")
    cookie_secure: bool = Field(default=True, env="COOKIE_SECURE")
    cookie_httponly: bool = Field(default=True, env="COOKIE_HTTPONLY")
    cookie_samesite: str = Field(default="lax", env="COOKIE_SAMESITE")
    
    # Application Settings
    app_name: str = Field(default="Niya API", env="APP_NAME")
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="production", env="ENVIRONMENT")
    
    # Rate Limiting
    rate_limit_per_minute: int = Field(default=60, env="RATE_LIMIT_PER_MINUTE")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # CORS Settings
    cors_origins: list = Field(default=["http://localhost:3000"], env="CORS_ORIGINS")

    # Embeddings
    embedding_preferred: str = Field(default="openai", env="EMBEDDING_PREFERRED")
    embedding_dimension: int = Field(default=1536, env="EMBEDDING_DIMENSION")
    openai_embedding_model: str = Field(default="text-embedding-3-small", env="OPENAI_EMBEDDING_MODEL")
    gemini_embedding_model: str = Field(default="text-embedding-004", env="GEMINI_EMBEDDING_MODEL")
    # Optional API keys (providers read directly from env too)
    google_api_key: Optional[str] = Field(default=None, env="GOOGLE_API_KEY")
    gemini_api_key: Optional[str] = Field(default=None, env="GEMINI_API_KEY")
    # Embedding batching
    embedding_batch_size: int = Field(default=64, env="EMBEDDING_BATCH_SIZE")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


def get_settings() -> Settings:
    """Get application settings"""
    return settings 