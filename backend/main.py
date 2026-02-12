"""
Pantry Chef AI - Backend

Phase 5: Vision-powered ingredient detection!

This is our FastAPI server that:
- Connects to PostgreSQL to store recipes
- Uses OpenAI GPT-4 for intelligent recipe suggestions
- ChromaDB for vector embeddings and semantic search
- RAG pipeline for grounded AI responses
- GPT-4 Vision for ingredient detection from photos
"""

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
import base64

from config import settings
from database import get_db
from models import Recipe, Ingredient
from schemas import (
    IngredientInput, 
    RecipeSuggestion, 
    RecipeSuggestionsResponse,
    RecipeResponse,
    RecipeSummary,
)
import llm_service
import rag_service
import vision_service
import voice_service
import live_cook_service

# =============================================================================
# Create FastAPI Application
# =============================================================================

app = FastAPI(
    title=settings.API_TITLE,
    description="AI-powered cooking assistant with PostgreSQL, GPT-4, RAG, Vision, and Voice",
    version="0.6.0",  # Phase 6: Voice Agent!
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Health Check Endpoints
# =============================================================================

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "healthy", 
        "message": "Pantry Chef AI is running",
        "version": "0.6.0",
        "features": ["PostgreSQL", "GPT-4 AI", "RAG", "Semantic Search", "Vision", "Voice Agent"]
    }


@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check with database, AI, and RAG connectivity test."""
    try:
        db.execute(func.now())
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    ai_status = "configured" if settings.OPENAI_API_KEY else "not configured"
    
    rag_stats = rag_service.get_collection_stats()
    rag_status = f"{rag_stats.get('document_count', 0)} recipes indexed"
    
    return {
        "status": "ok",
        "database": db_status,
        "ai": ai_status,
        "rag": rag_status
    }


# =============================================================================
# Recipe Endpoints (Database)
# =============================================================================

@app.get("/api/recipes", response_model=list[RecipeSummary])
async def list_recipes(
    cuisine: str | None = None,
    difficulty: str | None = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """List all recipes with optional filtering."""
    query = db.query(Recipe)
    
    if cuisine:
        query = query.filter(Recipe.cuisine.ilike(f"%{cuisine}%"))
    
    if difficulty:
        query = query.filter(Recipe.difficulty.ilike(f"%{difficulty}%"))
    
    recipes = query.limit(limit).all()
    
    return [
        RecipeSummary(
            id=r.id,
            name=r.name,
            description=r.description,
            cuisine=r.cuisine,
            difficulty=r.difficulty,
            total_time=r.total_time_display,
            dietary_tags=r.dietary_tags or [],
            image_url=r.image_url
        )
        for r in recipes
    ]


@app.get("/api/recipes/{recipe_id}", response_model=RecipeResponse)
async def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    """Get a specific recipe by ID."""
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    return RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        description=recipe.description,
        cuisine=recipe.cuisine,
        difficulty=recipe.difficulty,
        prep_time_minutes=recipe.prep_time_minutes,
        cook_time_minutes=recipe.cook_time_minutes,
        total_time=recipe.total_time_display,
        servings=recipe.servings,
        dietary_tags=recipe.dietary_tags or [],
        instructions=recipe.instructions,
        ingredients=[
            {"id": ing.id, "name": ing.name, "category": ing.category}
            for ing in recipe.ingredients
        ],
        image_url=recipe.image_url,
        created_at=recipe.created_at
    )


# =============================================================================
# Recipe Suggestion Endpoints
# =============================================================================

@app.post("/api/recipes/suggest", response_model=RecipeSuggestionsResponse)
async def suggest_recipes(
    input_data: IngredientInput,
    use_ai: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get recipe suggestions based on available ingredients.
    
    Query params:
    - use_ai: If true, uses GPT-4 for creative suggestions. If false, uses database matching.
    """
    
    user_ingredients = [ing.lower().strip() for ing in input_data.ingredients]
    
    if not user_ingredients:
        raise HTTPException(
            status_code=400, 
            detail="Please provide at least one ingredient"
        )
    
    # Get recipes from database
    query = db.query(Recipe)
    
    if input_data.cuisine_preference:
        query = query.filter(
            Recipe.cuisine.ilike(f"%{input_data.cuisine_preference}%")
        )
    
    if input_data.dietary_restrictions:
        for restriction in input_data.dietary_restrictions:
            query = query.filter(
                Recipe.dietary_tags.contains([restriction])
            )
    
    recipes = query.all()
    
    # Database matching algorithm
    suggestions = []
    
    for recipe in recipes:
        recipe_ingredients_names = [ing.name.lower() for ing in recipe.ingredients]
        
        ingredients_have = []
        ingredients_need = []
        
        for recipe_ing in recipe_ingredients_names:
            has_ingredient = any(
                user_ing in recipe_ing or recipe_ing in user_ing
                for user_ing in user_ingredients
            )
            
            if has_ingredient:
                ingredients_have.append(recipe_ing)
            else:
                ingredients_need.append(recipe_ing)
        
        total_ingredients = len(recipe_ingredients_names)
        if total_ingredients > 0:
            match_pct = int((len(ingredients_have) / total_ingredients) * 100)
        else:
            match_pct = 0
        
        if match_pct > 0 or len(user_ingredients) == 0:
            suggestions.append(RecipeSuggestion(
                id=recipe.id,
                name=recipe.name,
                description=recipe.description,
                ingredients_have=ingredients_have,
                ingredients_need=ingredients_need,
                match_percentage=match_pct,
                total_time=recipe.total_time_display,
                difficulty=recipe.difficulty,
                cuisine=recipe.cuisine,
                dietary_tags=recipe.dietary_tags or []
            ))
    
    suggestions.sort(key=lambda x: x.match_percentage, reverse=True)
    suggestions = suggestions[:10]
    
    return RecipeSuggestionsResponse(
        suggestions=suggestions,
        message=f"Found {len(suggestions)} recipes matching your {len(user_ingredients)} ingredients!",
        total_recipes_searched=len(recipes)
    )


# =============================================================================
# AI-Powered Endpoints (Phase 3)
# =============================================================================

class AIRecipeRequest(BaseModel):
    """Request for AI-powered recipe suggestions."""
    ingredients: list[str]
    dietary_restrictions: list[str] = []
    cuisine_preference: str | None = None


class AIRecipeResponse(BaseModel):
    """AI-generated recipe suggestions."""
    suggestions: list[dict]
    chef_note: str
    ai_powered: bool = True


class ChatRequest(BaseModel):
    """Request for chatting with Chef AI."""
    message: str
    conversation_history: list[dict] = []


class ChatResponse(BaseModel):
    """Response from Chef AI."""
    response: str
    success: bool


@app.post("/api/ai/suggest", response_model=AIRecipeResponse)
async def ai_suggest_recipes(
    request: AIRecipeRequest,
    db: Session = Depends(get_db)
):
    """
    🤖 AI-Powered Recipe Suggestions
    
    Uses GPT-4 to creatively suggest recipes based on your ingredients.
    The AI considers:
    - What you have available
    - Your dietary restrictions
    - Cuisine preferences
    - Creative combinations you might not think of!
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set OPENAI_API_KEY."
        )
    
    # Get some existing recipes for context
    existing_recipes = db.query(Recipe).limit(5).all()
    recipe_context = [
        {"name": r.name, "description": r.description, "cuisine": r.cuisine}
        for r in existing_recipes
    ]
    
    # Call the AI service
    result = await llm_service.get_ai_recipe_suggestions(
        ingredients=request.ingredients,
        dietary_restrictions=request.dietary_restrictions,
        cuisine_preference=request.cuisine_preference,
        existing_recipes=recipe_context
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {result.get('error', 'Unknown error')}"
        )
    
    data = result["data"]
    
    return AIRecipeResponse(
        suggestions=data.get("suggestions", []),
        chef_note=data.get("chef_note", "Here are some ideas for you!"),
        ai_powered=True
    )


@app.post("/api/ai/chat", response_model=ChatResponse)
async def chat_with_chef(request: ChatRequest):
    """
    💬 Chat with Chef Pantry
    
    Have a conversation about cooking! Ask questions like:
    - "What can I make with leftover rice?"
    - "How do I properly sear a steak?"
    - "What's a good substitute for eggs in baking?"
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured. Please set OPENAI_API_KEY."
        )
    
    result = await llm_service.chat_with_chef(
        message=request.message,
        conversation_history=request.conversation_history
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"AI service error: {result.get('error', 'Unknown error')}"
        )
    
    return ChatResponse(
        response=result["response"],
        success=True
    )


@app.get("/api/ai/test")
async def test_ai_connection():
    """Test the AI connection."""
    
    if not settings.OPENAI_API_KEY:
        return {"success": False, "error": "OPENAI_API_KEY not configured"}
    
    result = await llm_service.test_connection()
    return result


# =============================================================================
# RAG Endpoints (Phase 4)
# =============================================================================

class RAGSearchRequest(BaseModel):
    """Request for RAG-powered search."""
    query: str
    ingredients: list[str] = []
    dietary_restrictions: list[str] = []
    cuisine_preference: str | None = None


class SemanticSearchRequest(BaseModel):
    """Request for semantic search."""
    query: str
    n_results: int = 5
    cuisine_filter: str | None = None


@app.post("/api/rag/index")
async def index_recipes():
    """
    Index all recipes into ChromaDB for semantic search.
    
    This creates vector embeddings for each recipe, enabling:
    - Semantic search (find by meaning, not just keywords)
    - Similarity matching
    - RAG-powered recommendations
    
    Run this after adding new recipes to the database.
    """
    result = rag_service.index_all_recipes()
    return result


@app.get("/api/rag/stats")
async def get_rag_stats():
    """Get statistics about the vector database."""
    return rag_service.get_collection_stats()


@app.post("/api/rag/search")
async def semantic_search(request: SemanticSearchRequest):
    """
    Semantic search for recipes.
    
    Unlike keyword search, this understands meaning:
    - "quick healthy dinner" finds light, fast recipes
    - "comfort food for winter" finds hearty soups/stews
    - "impressive date night meal" finds elegant dishes
    """
    results = rag_service.semantic_search(
        query=request.query,
        n_results=request.n_results,
        cuisine_filter=request.cuisine_filter
    )
    
    return {
        "query": request.query,
        "results": results,
        "count": len(results)
    }


@app.post("/api/rag/suggest")
async def rag_suggest_recipes(request: RAGSearchRequest):
    """
    RAG-Powered Recipe Suggestions
    
    The best of both worlds:
    1. Retrieves relevant recipes from YOUR database using semantic search
    2. Uses GPT-4 to analyze and personalize suggestions
    3. Responses are grounded in real data, not hallucinated
    
    This is more accurate than pure AI suggestions because
    it references actual recipes in your database.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured"
        )
    
    # Check if we have indexed recipes
    stats = rag_service.get_collection_stats()
    if stats.get("document_count", 0) == 0:
        raise HTTPException(
            status_code=400,
            detail="No recipes indexed. Call POST /api/rag/index first."
        )
    
    result = await rag_service.rag_recipe_suggestions(
        query=request.query,
        ingredients=request.ingredients,
        dietary_restrictions=request.dietary_restrictions,
        cuisine_preference=request.cuisine_preference
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "RAG service error")
        )
    
    return result


@app.delete("/api/rag/clear")
async def clear_rag_index():
    """Clear the vector database (useful for re-indexing)."""
    return rag_service.clear_collection()


# =============================================================================
# Vision Endpoints (Phase 5)
# =============================================================================

class ImageURLRequest(BaseModel):
    """Request with image URL."""
    image_url: str


class VisionResponse(BaseModel):
    """Response from vision analysis."""
    success: bool
    ingredients: list[dict] = []
    ingredient_names: list[str] = []
    summary: str = ""
    suggestions: str = ""
    error: str | None = None


@app.post("/api/vision/analyze", response_model=VisionResponse)
async def analyze_image(file: UploadFile = File(...)):
    """
    Analyze an uploaded image to detect food ingredients.
    
    Upload a photo of your:
    - Refrigerator
    - Pantry
    - Kitchen counter
    - Grocery bags
    
    Returns a list of detected ingredients that can be used for recipe suggestions.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Vision service not configured"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)"
        )
    
    # Read and encode image
    contents = await file.read()
    
    # Check file size (max 20MB for GPT-4 Vision)
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image too large. Maximum size is 20MB."
        )
    
    # Analyze with GPT-4 Vision
    result = await vision_service.analyze_image_for_ingredients(
        image_data=contents,
        is_base64=False
    )
    
    if not result["success"]:
        return VisionResponse(
            success=False,
            error=result.get("error", "Failed to analyze image")
        )
    
    data = result["data"]
    ingredient_names = vision_service.get_simple_ingredient_list(result)
    
    return VisionResponse(
        success=True,
        ingredients=data.get("ingredients", []),
        ingredient_names=ingredient_names,
        summary=data.get("summary", ""),
        suggestions=data.get("suggestions", "")
    )


@app.post("/api/vision/analyze-base64", response_model=VisionResponse)
async def analyze_image_base64(image_data: str = ""):
    """
    Analyze a base64-encoded image to detect food ingredients.
    
    Send the image as a base64 string in the request body.
    Useful for webcam captures or when image is already in memory.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Vision service not configured"
        )
    
    if not image_data:
        raise HTTPException(
            status_code=400,
            detail="No image data provided"
        )
    
    result = await vision_service.analyze_image_for_ingredients(
        image_data=image_data,
        is_base64=True
    )
    
    if not result["success"]:
        return VisionResponse(
            success=False,
            error=result.get("error", "Failed to analyze image")
        )
    
    data = result["data"]
    ingredient_names = vision_service.get_simple_ingredient_list(result)
    
    return VisionResponse(
        success=True,
        ingredients=data.get("ingredients", []),
        ingredient_names=ingredient_names,
        summary=data.get("summary", ""),
        suggestions=data.get("suggestions", "")
    )


@app.post("/api/vision/analyze-url", response_model=VisionResponse)
async def analyze_image_from_url(request: ImageURLRequest):
    """
    Analyze an image from a URL to detect food ingredients.
    
    Provide a public URL to an image of your pantry or fridge.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Vision service not configured"
        )
    
    result = await vision_service.analyze_image_url(request.image_url)
    
    if not result["success"]:
        return VisionResponse(
            success=False,
            error=result.get("error", "Failed to analyze image")
        )
    
    data = result["data"]
    ingredient_names = vision_service.get_simple_ingredient_list(result)
    
    return VisionResponse(
        success=True,
        ingredients=data.get("ingredients", []),
        ingredient_names=ingredient_names,
        summary=data.get("summary", ""),
        suggestions=data.get("suggestions", "")
    )


class DetailedVisionRequest(BaseModel):
    """Request for detailed vision analysis."""
    focus_areas: list[str] = []


class DetailedVisionResponse(BaseModel):
    """Response from detailed vision analysis."""
    success: bool
    ingredients: list[dict] = []
    ingredient_names: list[str] = []
    ingredients_by_category: dict = {}
    total_count: int = 0
    areas_checked: list[str] = []
    summary: str = ""
    meal_potential: str = ""
    notes: str = ""
    error: str | None = None


class FastVisionResponse(BaseModel):
    """Response from fast vision analysis."""
    success: bool
    ingredients: list[dict] = []
    ingredient_names: list[str] = []
    total_count: int = 0
    summary: str = ""
    mode: str = "fast"
    error: str | None = None


@app.post("/api/vision/analyze-fast", response_model=FastVisionResponse)
async def analyze_image_fast(file: UploadFile = File(...)):
    """
    ⚡ FAST Ingredient Analysis (2-3 seconds)
    
    Optimized for speed using GPT-4o-mini with low detail mode.
    Use this when quick feedback is more important than exhaustive detection.
    
    Tradeoffs:
    - ~3-4x faster than detailed analysis
    - May miss smaller or partially hidden items
    - Less accurate for crowded images
    
    Best for:
    - Quick pantry scans
    - Real-time cooking assistance
    - Mobile users who want instant results
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Vision service not configured"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)"
        )
    
    # Read and encode image
    contents = await file.read()
    
    # Check file size (max 20MB)
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image too large. Maximum size is 20MB"
        )
    
    result = await vision_service.analyze_image_fast(
        image_data=contents,
        is_base64=False
    )
    
    if not result["success"]:
        return FastVisionResponse(
            success=False,
            error=result.get("error", "Failed to analyze image"),
            mode="fast"
        )
    
    return FastVisionResponse(
        success=True,
        ingredients=result.get("ingredients", []),
        ingredient_names=result.get("ingredient_names", []),
        total_count=result.get("total_count", 0),
        summary=result.get("summary", ""),
        mode="fast"
    )


@app.post("/api/vision/analyze-detailed", response_model=DetailedVisionResponse)
async def analyze_image_detailed(
    file: UploadFile = File(...),
    focus_areas: str = ""
):
    """
    🔍 DETAILED Ingredient Analysis
    
    Performs an exhaustive multi-pass scan to detect ALL ingredients.
    Use this when the standard analysis misses items.
    
    Features:
    - Systematic scanning of entire image
    - Category-based ingredient grouping
    - Location tracking for each item
    - Higher token limit for comprehensive results
    
    Optional: Pass focus_areas as comma-separated string to 
    emphasize certain areas (e.g., "door shelves,bottom drawer")
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Vision service not configured"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (JPEG, PNG, etc.)"
        )
    
    # Read and encode image
    contents = await file.read()
    
    # Check file size
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="Image too large. Maximum size is 20MB."
        )
    
    # Parse focus areas
    areas = [a.strip() for a in focus_areas.split(",") if a.strip()] if focus_areas else None
    
    # Use detailed analysis
    result = await vision_service.analyze_image_detailed(
        image_data=contents,
        is_base64=False,
        focus_areas=areas
    )
    
    if not result["success"]:
        return DetailedVisionResponse(
            success=False,
            error=result.get("error", "Failed to analyze image")
        )
    
    data = result["data"]
    ingredient_names = vision_service.get_simple_ingredient_list(result)
    ingredients_by_category = vision_service.get_ingredients_by_category(result)
    
    return DetailedVisionResponse(
        success=True,
        ingredients=data.get("ingredients", []),
        ingredient_names=ingredient_names,
        ingredients_by_category=ingredients_by_category,
        total_count=data.get("total_count", len(ingredient_names)),
        areas_checked=data.get("areas_checked", []),
        summary=data.get("summary", ""),
        meal_potential=data.get("meal_potential", ""),
        notes=data.get("notes", ""),
    )


# =============================================================================
# Ingredients Endpoint
# =============================================================================

@app.get("/api/ingredients")
async def list_ingredients(
    search: str | None = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """List all ingredients, optionally filtered by search term."""
    query = db.query(Ingredient)
    
    if search:
        query = query.filter(Ingredient.name.ilike(f"%{search}%"))
    
    ingredients = query.order_by(Ingredient.name).limit(limit).all()
    
    return [{"id": ing.id, "name": ing.name, "category": ing.category} for ing in ingredients]


# =============================================================================
# Nutrition Estimation Endpoint
# =============================================================================

class NutritionRequest(BaseModel):
    """Request for nutrition estimation."""
    recipe_name: str
    ingredients: list[str]
    servings: int = 4


class NutritionResponse(BaseModel):
    """Nutrition estimation response."""
    success: bool
    per_serving: dict | None = None
    health_notes: list[str] = []
    disclaimer: str = ""
    error: str | None = None


@app.post("/api/nutrition/estimate", response_model=NutritionResponse)
async def estimate_recipe_nutrition(request: NutritionRequest):
    """
    🥗 Estimate Nutritional Information
    
    Uses AI to estimate macros and nutrition for a recipe based on its ingredients.
    These are estimates only and should not be used for medical purposes.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured"
        )
    
    result = await llm_service.estimate_nutrition(
        recipe_name=request.recipe_name,
        ingredients=request.ingredients,
        servings=request.servings
    )
    
    if not result["success"]:
        return NutritionResponse(
            success=False,
            error=result.get("error", "Failed to estimate nutrition")
        )
    
    data = result["data"]
    
    return NutritionResponse(
        success=True,
        per_serving=data.get("per_serving", {}),
        health_notes=data.get("health_notes", []),
        disclaimer=data.get("disclaimer", "Estimates only. Consult a nutritionist for accurate values.")
    )


@app.get("/api/recipes/{recipe_id}/nutrition")
async def get_recipe_nutrition(recipe_id: int, db: Session = Depends(get_db)):
    """
    Get estimated nutrition for a specific recipe from the database.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured"
        )
    
    # Get the recipe
    recipe = db.query(Recipe).filter(Recipe.id == recipe_id).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    # Get ingredient names
    ingredient_names = [ing.name for ing in recipe.ingredients]
    
    # Get nutrition estimate
    result = await llm_service.estimate_nutrition(
        recipe_name=recipe.name,
        ingredients=ingredient_names,
        servings=recipe.servings or 4
    )
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to estimate nutrition")
        )
    
    data = result["data"]
    
    return {
        "recipe_id": recipe_id,
        "recipe_name": recipe.name,
        "servings": recipe.servings or 4,
        "per_serving": data.get("per_serving", {}),
        "health_notes": data.get("health_notes", []),
        "disclaimer": data.get("disclaimer", "Estimates only.")
    }


# =============================================================================
# Voice Endpoints (Phase 6)
# =============================================================================

class VoiceChatRequest(BaseModel):
    """Request for voice chat."""
    message: str
    conversation_history: list[dict] = []
    detected_ingredients: list[str] = []
    current_recipe: dict | None = None


class VoiceChatResponse(BaseModel):
    """Response from voice chat with optional audio."""
    success: bool
    text_response: str
    audio_base64: str | None = None
    error: str | None = None


class IngredientsGreetRequest(BaseModel):
    """Request for ingredients greeting."""
    ingredients: list[str]
    generate_audio: bool = True


class VoiceSuggestRequest(BaseModel):
    """Request for voice recipe suggestions."""
    ingredients: list[str]
    cuisine_preference: str | None = None
    dietary_restrictions: list[str] = []
    time_constraint: str | None = None
    generate_audio: bool = True


class CookingStepRequest(BaseModel):
    """Request for cooking step guidance."""
    recipe_name: str
    current_step: int
    total_steps: int
    step_instruction: str
    user_question: str | None = None
    generate_audio: bool = True


@app.post("/api/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    """
    🎤 Transcribe audio to text using OpenAI Whisper.
    
    Upload an audio file (webm, mp3, wav) and get the transcribed text.
    Perfect for voice commands while cooking.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Voice service not configured"
        )
    
    # Get file extension
    file_ext = file.filename.split('.')[-1] if file.filename else "webm"
    
    # Read audio data
    audio_data = await file.read()
    
    result = await voice_service.transcribe_audio(audio_data, file_ext)
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to transcribe audio")
        )
    
    return {
        "success": True,
        "text": result["text"]
    }


class SpeakRequest(BaseModel):
    """Request for text-to-speech."""
    text: str
    voice: str = "nova"


@app.post("/api/voice/speak")
async def text_to_speech(request: SpeakRequest):
    """
    🔊 Convert text to speech using OpenAI TTS.
    
    Voices available:
    - nova: Warm, friendly (recommended for cooking assistant)
    - alloy: Neutral, balanced
    - echo: Male voice
    - fable: Expressive
    - onyx: Deep male
    - shimmer: Soft female
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Voice service not configured"
        )
    
    result = await voice_service.generate_speech(request.text, request.voice)
    
    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to generate speech")
        )
    
    return {
        "success": True,
        "audio_base64": result["audio_base64"],
        "format": result["format"]
    }


@app.post("/api/voice/chat", response_model=VoiceChatResponse)
async def voice_chat(request: VoiceChatRequest):
    """
    💬 Voice conversation with Chef Pantry.
    
    Send text (or transcribed speech) and get a conversational response
    with optional audio. The AI is optimized for voice interactions:
    - Short, conversational responses
    - Proactive follow-up questions
    - Context-aware cooking guidance
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Voice service not configured"
        )
    
    # Get AI response
    chat_result = await voice_service.voice_chat(
        message=request.message,
        conversation_history=request.conversation_history,
        detected_ingredients=request.detected_ingredients,
        current_recipe=request.current_recipe,
    )
    
    if not chat_result["success"]:
        return VoiceChatResponse(
            success=False,
            text_response="",
            error=chat_result.get("error", "Failed to get response")
        )
    
    text_response = chat_result["response"]
    
    # Generate audio
    audio_result = await voice_service.generate_speech(text_response)
    audio_base64 = audio_result.get("audio_base64") if audio_result["success"] else None
    
    return VoiceChatResponse(
        success=True,
        text_response=text_response,
        audio_base64=audio_base64,
    )


@app.post("/api/voice/greet-ingredients", response_model=VoiceChatResponse)
async def greet_with_ingredients(request: IngredientsGreetRequest):
    """
    👋 Get a greeting based on detected ingredients.
    
    When the user uploads a pantry photo or enters ingredients,
    the AI acknowledges what it sees and asks guiding questions.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Voice service not configured"
        )
    
    if not request.ingredients:
        return VoiceChatResponse(
            success=False,
            text_response="",
            error="No ingredients provided"
        )
    
    # Get greeting
    greet_result = await voice_service.analyze_ingredients_and_greet(
        request.ingredients
    )
    
    if not greet_result["success"]:
        return VoiceChatResponse(
            success=False,
            text_response="",
            error=greet_result.get("error", "Failed to generate greeting")
        )
    
    text_response = greet_result["response"]
    audio_base64 = None
    
    # Generate audio if requested
    if request.generate_audio:
        audio_result = await voice_service.generate_speech(text_response)
        audio_base64 = audio_result.get("audio_base64") if audio_result["success"] else None
    
    return VoiceChatResponse(
        success=True,
        text_response=text_response,
        audio_base64=audio_base64,
    )


@app.post("/api/voice/suggest-recipe", response_model=VoiceChatResponse)
async def voice_suggest_recipe(request: VoiceSuggestRequest):
    """
    🍳 Get a voice-optimized recipe suggestion.
    
    Based on ingredients and preferences, get a conversational
    recipe suggestion that sounds natural when spoken.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Voice service not configured"
        )
    
    # Get suggestion
    suggest_result = await voice_service.get_recipe_suggestion_voice(
        ingredients=request.ingredients,
        cuisine_preference=request.cuisine_preference,
        dietary_restrictions=request.dietary_restrictions,
        time_constraint=request.time_constraint,
    )
    
    if not suggest_result["success"]:
        return VoiceChatResponse(
            success=False,
            text_response="",
            error=suggest_result.get("error", "Failed to get suggestion")
        )
    
    text_response = suggest_result["response"]
    audio_base64 = None
    
    # Generate audio if requested
    if request.generate_audio:
        audio_result = await voice_service.generate_speech(text_response)
        audio_base64 = audio_result.get("audio_base64") if audio_result["success"] else None
    
    return VoiceChatResponse(
        success=True,
        text_response=text_response,
        audio_base64=audio_base64,
    )


@app.post("/api/voice/cooking-step", response_model=VoiceChatResponse)
async def voice_cooking_step(request: CookingStepRequest):
    """
    📖 Get voice guidance for a cooking step.
    
    Guide the user through cooking with clear, spoken instructions.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="Voice service not configured"
        )
    
    # Get step guidance
    step_result = await voice_service.get_cooking_step_guidance(
        recipe_name=request.recipe_name,
        current_step=request.current_step,
        total_steps=request.total_steps,
        step_instruction=request.step_instruction,
        user_question=request.user_question,
    )
    
    if not step_result["success"]:
        return VoiceChatResponse(
            success=False,
            text_response="",
            error=step_result.get("error", "Failed to get step guidance")
        )
    
    text_response = step_result["response"]
    audio_base64 = None
    
    # Generate audio if requested
    if request.generate_audio:
        audio_result = await voice_service.generate_speech(text_response)
        audio_base64 = audio_result.get("audio_base64") if audio_result["success"] else None
    
    return VoiceChatResponse(
        success=True,
        text_response=text_response,
        audio_base64=audio_base64,
    )


# =============================================================================
# Live Cooking Endpoints (Real-time AI Camera Assistance)
# =============================================================================

class LiveCookAnalyzeRequest(BaseModel):
    """Request for live cooking frame analysis."""
    image_base64: str
    recipe_name: str = "Unknown Recipe"
    current_step: int = 1
    current_instruction: str = ""
    previous_context: dict = {}
    detected_ingredients: list[str] = []


class LiveCookAnalyzeResponse(BaseModel):
    """Response from live cooking analysis."""
    success: bool
    detected_items: list[str] = []
    current_action: str | None = None
    guidance: str | None = None
    speak: bool = False
    warning: str | None = None
    tip: str | None = None
    step_complete_suggestion: bool = False
    next_step_preview: str | None = None
    timing_advice: str | None = None
    ingredient_amounts: str | None = None
    error: str | None = None


class LiveCookVoiceCommandRequest(BaseModel):
    """Request for voice command during live cooking."""
    command: str
    recipe_name: str = "Unknown Recipe"
    current_step: int = 1
    current_instruction: str = ""
    detected_ingredients: list[str] = []
    last_analysis: dict = {}


class LiveCookVoiceResponse(BaseModel):
    """Response from voice command during live cooking."""
    success: bool
    response: str
    action: str | None = None
    additional_info: str | None = None
    error: str | None = None


@app.post("/api/live-cook/analyze", response_model=LiveCookAnalyzeResponse)
async def analyze_live_cooking_frame(request: LiveCookAnalyzeRequest):
    """
    🎥 Real-time Cooking Frame Analysis
    
    Analyzes a camera frame during live cooking and provides:
    - What's visible in the frame
    - Specific cooking guidance for this moment
    - Timing advice and warnings
    - Whether the current step appears complete
    
    Optimized for speed (~1-2 second response time) to enable
    near real-time cooking assistance.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured"
        )
    
    if not request.image_base64:
        raise HTTPException(
            status_code=400,
            detail="No image data provided"
        )
    
    result = await live_cook_service.analyze_cooking_frame(
        image_base64=request.image_base64,
        recipe_name=request.recipe_name,
        current_step=request.current_step,
        current_instruction=request.current_instruction,
        previous_context=request.previous_context,
        detected_ingredients=request.detected_ingredients,
    )
    
    if not result.get("success"):
        return LiveCookAnalyzeResponse(
            success=False,
            error=result.get("error", "Analysis failed")
        )
    
    return LiveCookAnalyzeResponse(
        success=True,
        detected_items=result.get("detected_items", []),
        current_action=result.get("current_action"),
        guidance=result.get("guidance"),
        speak=result.get("speak", False),
        warning=result.get("warning"),
        tip=result.get("tip"),
        step_complete_suggestion=result.get("step_complete_suggestion", False),
        next_step_preview=result.get("next_step_preview"),
        timing_advice=result.get("timing_advice"),
        ingredient_amounts=result.get("ingredient_amounts"),
    )


@app.post("/api/live-cook/voice-command", response_model=LiveCookVoiceResponse)
async def process_live_cooking_voice_command(request: LiveCookVoiceCommandRequest):
    """
    🎤 Process Voice Command During Live Cooking
    
    Handles voice commands while the user is actively cooking:
    - "How much salt?" - Ingredient amount queries
    - "How long should I stir?" - Timing questions
    - "What's next?" - Step navigation
    - "Is this done?" - Completion checks
    - General cooking questions
    
    Returns a spoken response and optional actions.
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI service not configured"
        )
    
    if not request.command:
        raise HTTPException(
            status_code=400,
            detail="No command provided"
        )
    
    result = await live_cook_service.process_voice_command(
        command=request.command,
        recipe_name=request.recipe_name,
        current_step=request.current_step,
        current_instruction=request.current_instruction,
        detected_ingredients=request.detected_ingredients,
        last_analysis=request.last_analysis,
    )
    
    return LiveCookVoiceResponse(
        success=result.get("success", True),
        response=result.get("response", "I'm here to help!"),
        action=result.get("action"),
        additional_info=result.get("additional_info"),
        error=result.get("error"),
    )


class IngredientGuidanceRequest(BaseModel):
    """Request for ingredient amount guidance."""
    ingredient: str
    recipe_name: str
    recipe_ingredients: list[dict] = []


@app.post("/api/live-cook/ingredient-help")
async def get_ingredient_help(request: IngredientGuidanceRequest):
    """
    🧂 Get Specific Ingredient Guidance
    
    Ask about how much of a specific ingredient to use.
    "How much garlic?" -> "Use 3 cloves, minced (about 1 tablespoon)"
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    result = await live_cook_service.get_ingredient_guidance(
        ingredient=request.ingredient,
        recipe_name=request.recipe_name,
        recipe_ingredients=request.recipe_ingredients,
    )
    
    return result


class TimingGuidanceRequest(BaseModel):
    """Request for timing guidance."""
    action: str
    current_instruction: str
    visual_context: str | None = None


@app.post("/api/live-cook/timing-help")
async def get_timing_help(request: TimingGuidanceRequest):
    """
    ⏱️ Get Specific Timing Guidance
    
    Ask about how long to perform a cooking action.
    "How long should I sauté the onions?" -> "Sauté for 5-7 minutes until translucent and slightly golden"
    """
    
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="AI service not configured")
    
    result = await live_cook_service.get_timing_guidance(
        action=request.action,
        current_instruction=request.current_instruction,
        visual_context=request.visual_context,
    )
    
    return result


# =============================================================================
# Run with: uvicorn main:app --reload
# API Docs: http://localhost:8000/docs
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
