"""
🗄️ Database Connection Module

CONCEPT: SQLAlchemy - The Python ORM

ORM = Object-Relational Mapper
- Instead of writing SQL: "SELECT * FROM recipes WHERE id = 1"
- You write Python: session.query(Recipe).filter(Recipe.id == 1).first()

Benefits:
1. Database-agnostic: Same code works with PostgreSQL, MySQL, SQLite
2. Type safety: Your IDE can autocomplete model attributes
3. Security: Automatic SQL injection protection
4. Pythonic: Work with objects, not raw strings

This file sets up the database connection and session management.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import settings

# =============================================================================
# CONCEPT: Database Engine
# =============================================================================
# The engine is the "home base" for the database connection.
# It maintains a pool of connections that can be reused.
#
# Connection pooling is important because:
# - Creating new database connections is slow
# - Reusing connections is fast
# - Pool limits prevent overwhelming the database

engine = create_engine(
    settings.DATABASE_URL,
    echo=True,  # Log all SQL statements (helpful for learning!)
    pool_pre_ping=True,  # Check if connection is alive before using
)

# =============================================================================
# CONCEPT: Session Factory
# =============================================================================
# A session is like a "workspace" for database operations.
# - You query, add, modify objects through a session
# - Changes are collected and sent to DB when you commit()
# - If something fails, you can rollback() to undo changes

SessionLocal = sessionmaker(
    autocommit=False,  # We'll manually commit (more control)
    autoflush=False,   # Don't auto-sync changes (more predictable)
    bind=engine,
)


# =============================================================================
# CONCEPT: Base Class for Models
# =============================================================================
# All our models will inherit from this Base class.
# SQLAlchemy uses this to:
# - Track all model classes
# - Generate CREATE TABLE statements
# - Understand relationships between tables

class Base(DeclarativeBase):
    """Base class for all database models."""
    pass


# =============================================================================
# CONCEPT: Dependency Injection for FastAPI
# =============================================================================
# This function creates a session for each request and ensures cleanup.
#
# The `yield` keyword makes this a "generator" that:
# 1. Creates a session
# 2. Gives it to the request handler
# 3. Cleans up after the request (even if there's an error)

def get_db():
    """
    Dependency that provides a database session.
    
    Usage in FastAPI:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

