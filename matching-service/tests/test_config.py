# Matching Service Tests
import pytest
import os

# Set test environment variables
os.environ["DATABASE_URL"] = "postgresql://test:test@localhost:5432/test"
os.environ["RABBITMQ_HOST"] = "localhost"
os.environ["RABBITMQ_USER"] = "test"
os.environ["RABBITMQ_PASSWORD"] = "test"
os.environ["JWT_SECRET"] = "test_secret"

from app.config import Settings

def test_config_loads():
    """Test that config loads properly"""
    settings = Settings()
    assert settings.APP_NAME == "Matching Service"
    assert settings.JWT_ALGORITHM == "HS256"

def test_config_defaults():
    """Test default values"""
    settings = Settings()
    assert settings.DEBUG == False
    assert settings.RABBITMQ_PORT == 5672

def test_config_env_override():
    """Test environment variable override"""
    settings = Settings()
    assert settings.DATABASE_URL == "postgresql://test:test@localhost:5432/test"
    assert settings.RABBITMQ_HOST == "localhost"
    assert settings.JWT_SECRET == "test_secret"
