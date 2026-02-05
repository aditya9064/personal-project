"""
📊 Database Models

CONCEPT: SQLAlchemy Models

A model is a Python class that represents a database table.
- Each class = one table
- Each attribute = one column
- Each instance = one row

SQLAlchemy uses "declarative" style:
- You declare what you want using Python classes
- SQLAlchemy generates the SQL to create tables
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime, 
    ForeignKey, Float, JSON, Table
)
from sqlalchemy.orm import relationship
from database import Base


# =============================================================================
# CONCEPT: Many-to-Many Relationships
# =============================================================================
# A recipe can have many ingredients, and an ingredient can be in many recipes.
# This requires a "junction table" (also called "association table").
#
# We don't need a full model class for this - just a Table definition.

recipe_ingredients = Table(
    'recipe_ingredients',
    Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id'), primary_key=True),
    Column('ingredient_id', Integer, ForeignKey('ingredients.id'), primary_key=True),
    Column('quantity', String(100)),  # e.g., "2 cups", "1 lb"
    Column('is_optional', Boolean, default=False),
)


# =============================================================================
# Ingredient Model
# =============================================================================

class Ingredient(Base):
    """
    Represents a cooking ingredient.
    
    Examples: chicken, garlic, olive oil, salt
    """
    __tablename__ = 'ingredients'
    
    # CONCEPT: Primary Key
    # Every table needs a unique identifier for each row.
    # autoincrement means PostgreSQL assigns the next number automatically.
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # The ingredient name (required, must be unique)
    name = Column(String(100), nullable=False, unique=True, index=True)
    
    # Category for organization (protein, vegetable, dairy, etc.)
    category = Column(String(50))
    
    # Relationships (back-references)
    recipes = relationship(
        "Recipe",
        secondary=recipe_ingredients,
        back_populates="ingredients"
    )
    
    def __repr__(self):
        return f"<Ingredient(name='{self.name}')>"


# =============================================================================
# Recipe Model
# =============================================================================

class Recipe(Base):
    """
    Represents a cooking recipe.
    
    CONCEPT: Column Types
    - String(n): Variable-length text up to n characters
    - Text: Unlimited text (for long descriptions)
    - Integer: Whole numbers
    - Float: Decimal numbers
    - Boolean: True/False
    - DateTime: Timestamps
    - JSON: Flexible structured data
    """
    __tablename__ = 'recipes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Basic info
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text)
    
    # Cooking details
    prep_time_minutes = Column(Integer)  # Time to prepare
    cook_time_minutes = Column(Integer)  # Time to cook
    servings = Column(Integer)
    difficulty = Column(String(20))  # Easy, Medium, Hard
    
    # Cuisine and dietary info
    cuisine = Column(String(50), index=True)  # Italian, Mexican, etc.
    dietary_tags = Column(JSON)  # ["vegetarian", "gluten-free"]
    
    # The actual recipe content
    instructions = Column(Text)  # Step-by-step instructions
    
    # Metadata
    image_url = Column(String(500))
    source_url = Column(String(500))  # Original recipe source
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # CONCEPT: Relationships
    # This creates a virtual attribute that loads related ingredients
    # SQLAlchemy handles the JOIN query automatically
    ingredients = relationship(
        "Ingredient",
        secondary=recipe_ingredients,
        back_populates="recipes"
    )
    
    def __repr__(self):
        return f"<Recipe(name='{self.name}')>"
    
    @property
    def total_time_minutes(self) -> int:
        """Total cooking time (prep + cook)."""
        prep = self.prep_time_minutes or 0
        cook = self.cook_time_minutes or 0
        return prep + cook
    
    @property
    def total_time_display(self) -> str:
        """Human-readable total time."""
        total = self.total_time_minutes
        if total >= 60:
            hours = total // 60
            mins = total % 60
            return f"{hours}h {mins}m" if mins else f"{hours}h"
        return f"{total} minutes"


# =============================================================================
# User Model (for future user accounts)
# =============================================================================

class User(Base):
    """
    Represents a user of the application.
    
    For now, this is basic. Later we can add:
    - Password hashing
    - Email verification
    - OAuth integration
    """
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False)
    
    # We'll add proper password hashing in Phase 3
    # For now, this is just a placeholder
    hashed_password = Column(String(255))
    
    # Profile
    display_name = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    preferences = relationship("UserPreference", back_populates="user", uselist=False)
    
    def __repr__(self):
        return f"<User(username='{self.username}')>"


# =============================================================================
# User Preferences Model
# =============================================================================

class UserPreference(Base):
    """
    Stores user's dietary preferences and restrictions.
    
    CONCEPT: One-to-One Relationship
    Each user has exactly one preferences record.
    We use uselist=False in the relationship to get a single object instead of a list.
    """
    __tablename__ = 'user_preferences'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # CONCEPT: Foreign Key
    # Links this record to a specific user
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    
    # Dietary restrictions (stored as JSON array)
    dietary_restrictions = Column(JSON, default=list)  # ["vegetarian", "gluten-free"]
    
    # Allergies (stored as JSON array)
    allergies = Column(JSON, default=list)  # ["peanuts", "shellfish"]
    
    # Favorite cuisines
    favorite_cuisines = Column(JSON, default=list)  # ["Italian", "Mexican"]
    
    # Cooking skill level
    skill_level = Column(String(20), default="beginner")  # beginner, intermediate, advanced
    
    # Preferred serving size
    default_servings = Column(Integer, default=2)
    
    # Relationship back to user
    user = relationship("User", back_populates="preferences")
    
    def __repr__(self):
        return f"<UserPreference(user_id={self.user_id})>"


# =============================================================================
# Saved Recipes (User's Cookbook)
# =============================================================================

class SavedRecipe(Base):
    """
    Junction table for user's saved/favorite recipes.
    
    This allows users to:
    - Save recipes to their cookbook
    - Rate recipes
    - Add personal notes
    """
    __tablename__ = 'saved_recipes'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    recipe_id = Column(Integer, ForeignKey('recipes.id'), nullable=False)
    
    # User's personal additions
    rating = Column(Integer)  # 1-5 stars
    notes = Column(Text)  # Personal notes about the recipe
    saved_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<SavedRecipe(user_id={self.user_id}, recipe_id={self.recipe_id})>"

