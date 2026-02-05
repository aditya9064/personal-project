"""
📐 Pydantic Schemas (API Data Models)

CONCEPT: Pydantic vs SQLAlchemy Models

SQLAlchemy Models (models.py):
- Define database tables
- Used for database operations
- Have relationships, foreign keys

Pydantic Schemas (this file):
- Define API request/response shapes
- Used for validation and serialization
- Can be different from database models!

Why separate?
- API responses often need different fields than the database
- You might want to hide certain fields (like passwords)
- You might want to compute fields or reshape data
- Separation of concerns = cleaner code
"""

from pydantic import BaseModel
from datetime import datetime


# =============================================================================
# Ingredient Schemas
# =============================================================================

class IngredientBase(BaseModel):
    """Base ingredient schema with common fields."""
    name: str


class IngredientResponse(IngredientBase):
    """Ingredient as returned by the API."""
    id: int
    category: str | None = None
    
    class Config:
        from_attributes = True  # Allow creating from SQLAlchemy models


# =============================================================================
# Recipe Schemas
# =============================================================================

class RecipeBase(BaseModel):
    """Base recipe schema with common fields."""
    name: str
    description: str | None = None
    cuisine: str | None = None
    difficulty: str | None = None


class RecipeCreate(RecipeBase):
    """Schema for creating a new recipe."""
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    servings: int | None = None
    dietary_tags: list[str] = []
    instructions: str | None = None
    ingredients: list[str] = []  # Just ingredient names for simplicity


class RecipeResponse(RecipeBase):
    """Full recipe as returned by the API."""
    id: int
    prep_time_minutes: int | None = None
    cook_time_minutes: int | None = None
    total_time: str  # Computed field
    servings: int | None = None
    dietary_tags: list[str] = []
    instructions: str | None = None
    ingredients: list[IngredientResponse] = []
    image_url: str | None = None
    created_at: datetime | None = None
    
    class Config:
        from_attributes = True


class RecipeSummary(BaseModel):
    """Lightweight recipe for listing."""
    id: int
    name: str
    description: str | None = None
    cuisine: str | None = None
    difficulty: str | None = None
    total_time: str
    dietary_tags: list[str] = []
    image_url: str | None = None
    
    class Config:
        from_attributes = True


# =============================================================================
# Recipe Suggestion Schemas (for AI-powered suggestions)
# =============================================================================

class IngredientInput(BaseModel):
    """What the user sends when asking for recipe suggestions."""
    ingredients: list[str]  # List of ingredient names they have
    dietary_restrictions: list[str] = []  # ["vegetarian", "gluten-free"]
    cuisine_preference: str | None = None  # "Italian", "Thai", etc.


class RecipeSuggestion(BaseModel):
    """A recipe suggestion with match information."""
    id: int
    name: str
    description: str | None
    ingredients_have: list[str]  # Ingredients user already has
    ingredients_need: list[str]  # Ingredients user needs to buy
    match_percentage: int  # How much of the recipe they can make
    total_time: str
    difficulty: str | None
    cuisine: str | None
    dietary_tags: list[str] = []


class RecipeSuggestionsResponse(BaseModel):
    """Response containing multiple recipe suggestions."""
    suggestions: list[RecipeSuggestion]
    message: str
    total_recipes_searched: int


# =============================================================================
# User Schemas (for future auth)
# =============================================================================

class UserPreferencesBase(BaseModel):
    """User dietary preferences."""
    dietary_restrictions: list[str] = []
    allergies: list[str] = []
    favorite_cuisines: list[str] = []
    skill_level: str = "beginner"
    default_servings: int = 2


class UserPreferencesResponse(UserPreferencesBase):
    """User preferences as returned by API."""
    id: int
    
    class Config:
        from_attributes = True

