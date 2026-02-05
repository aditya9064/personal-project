"""
🔧 Configuration Module

CONCEPT: Configuration Management
Instead of hardcoding values, we load them from environment variables.
This lets the same code work in different environments (dev, staging, prod).

The pattern:
1. Try to load from environment variable
2. Fall back to a sensible default for development
"""

import os
from functools import lru_cache

# Try to load .env file if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Settings:
    """
    Application settings loaded from environment variables.
    
    CONCEPT: Why a class?
    Using a class makes it easy to:
    - Group related settings together
    - Add validation
    - Provide defaults
    - Mock in tests
    """
    
    # Database
    # Format: postgresql://user:password@host:port/database
    # For local dev without password, just use: postgresql://username@localhost/dbname
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://adityamiriyala@localhost:5432/pantry_chef"
    )
    
    # API Settings
    API_TITLE: str = "Pantry Chef AI"
    API_VERSION: str = "0.2.0"
    
    # CORS Origins (comma-separated in env var)
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:5174,http://localhost:3000"
    ).split(",")
    
    # OpenAI (Phase 3)
    # Set your API key via environment variable: export OPENAI_API_KEY="your-key"
    OPENAI_API_KEY: str | None = os.getenv("OPENAI_API_KEY")


@lru_cache()
def get_settings() -> Settings:
    """
    CONCEPT: @lru_cache
    
    This decorator caches the result so we only create Settings once.
    Every subsequent call returns the same instance (singleton pattern).
    """
    return Settings()


# Export a settings instance for convenience
settings = get_settings()

