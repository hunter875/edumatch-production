"""
Configuration settings using pydantic-settings
"""
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Application settings"""
    
    # App info
    APP_NAME: str = "Matching Service"
    APP_VERSION: str = "1.2"
    GIT_COMMIT: str = "local"
    DEPLOY_ENVIRONMENT: str = "local"
    DEBUG: bool = False

    # Production safety: disable docs/metrics in prod
    ENABLE_DOCS: bool = False
    ENABLE_METRICS: bool = False
    ENABLE_INTERNAL_PING: bool = False

    # Observability
    APPLICATIONINSIGHTS_CONNECTION_STRING: Optional[str] = None
    OTEL_SERVICE_NAME: Optional[str] = None
    
    # Database
    DATABASE_URL: str
    RUN_MIGRATIONS: bool = True
    AUTO_CREATE_TABLES: bool = False
    
    # RabbitMQ
    RABBITMQ_HOST: str = "rabbitmq"
    RABBITMQ_PORT: int = 5672
    RABBITMQ_USER: str
    RABBITMQ_PASSWORD: str
    
    # JWT Authentication (must match Auth Service settings)
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_PUBLIC_KEY_PATH: Optional[str] = None  # RSA public key for RS256
    JWT_EXPECTED_ISSUER: Optional[str] = "edumatch-auth"  # validate iss claim
    
    # Celery
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str = "rpc://"
    
    # ML Settings
    ML_MODEL_PATH: Optional[str] = "/app/models"
    TFIDF_MAX_FEATURES: int = 1000
    TFIDF_MIN_DF: int = 2
    
    # CORS (matching is internal-only; allow only gateway origin)
    CORS_ALLOWED_ORIGINS: str = "http://localhost:8080,http://localhost:18080"

    # Performance
    RECOMMENDATION_DEFAULT_LIMIT: int = 10
    RECOMMENDATION_MAX_LIMIT: int = 100
    SCORE_CACHE_TTL: int = 300  # 5 minutes
    RECOMMENDATION_CACHE_TTL: int = 900  # 15 minutes
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
