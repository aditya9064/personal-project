"""
Vision Service - GPT-4 Vision for Ingredient Detection

Uses GPT-4o's vision capabilities to analyze photos of:
- Refrigerators
- Pantries
- Kitchen counters
- Grocery bags

And extract a comprehensive list of visible ingredients.

Supports two modes:
- FAST: Uses GPT-4o-mini with low detail (~2-3 seconds)
- DETAILED: Uses GPT-4o with high detail (~8-12 seconds)
"""

import base64
import json
import io
from openai import OpenAI
from config import settings

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)


# ============================================================================
# FAST MODE - Optimized for speed (~2-3 seconds)
# ============================================================================

FAST_DETECTION_PROMPT = """Identify ALL food items in this image. Return JSON:
{
  "ingredients": [{"name": "item", "quantity": "amount if visible"}],
  "summary": "brief description"
}

Be thorough - check shelves, drawers, door, counters. Include condiments, produce, dairy, meats, beverages."""


# Enhanced system prompt for thorough ingredient detection
INGREDIENT_DETECTION_PROMPT = """You are a professional chef and food inventory specialist with exceptional attention to detail. Your task is to EXHAUSTIVELY identify EVERY food item and ingredient visible in the image.

## CRITICAL INSTRUCTIONS:
1. Scan the ENTIRE image systematically - top to bottom, left to right
2. Look in ALL areas: shelves, drawers, door compartments, corners, behind other items
3. Identify items even if partially visible or obscured
4. Include EVERYTHING edible, no matter how small or common

## CATEGORIES TO CHECK (be thorough in each):

### PROTEINS:
- Meats (chicken, beef, pork, turkey, lamb, fish, seafood, deli meats, bacon, sausage)
- Eggs
- Tofu, tempeh, seitan

### DAIRY & ALTERNATIVES:
- Milk, cream, half-and-half
- Cheese (all types - shredded, sliced, blocks, cream cheese)
- Yogurt, sour cream, cottage cheese
- Butter, margarine
- Plant-based alternatives

### PRODUCE - VEGETABLES:
- Leafy greens (lettuce, spinach, kale, cabbage, arugula)
- Root vegetables (carrots, potatoes, onions, garlic, ginger, beets, radishes)
- Cruciferous (broccoli, cauliflower, brussels sprouts)
- Nightshades (tomatoes, peppers, eggplant)
- Squash family (zucchini, cucumber, pumpkin)
- Alliums (onions, garlic, shallots, leeks, scallions)
- Others (celery, asparagus, corn, peas, beans, mushrooms)

### PRODUCE - FRUITS:
- Citrus (lemons, limes, oranges, grapefruit)
- Berries (strawberries, blueberries, raspberries)
- Stone fruits (peaches, plums, cherries)
- Tropical (bananas, mangoes, pineapple, avocados)
- Apples, pears, grapes
- Melons

### CONDIMENTS & SAUCES:
- Ketchup, mustard, mayonnaise, hot sauce
- Soy sauce, fish sauce, oyster sauce
- Salad dressings, marinades
- Jams, jellies, honey, maple syrup
- Peanut butter, nut butters, Nutella
- Pickles, olives, capers, relish

### BEVERAGES:
- Juices, sodas, water
- Wine, beer
- Coffee, tea

### PANTRY ITEMS (if visible):
- Bread, tortillas, wraps
- Grains (rice, pasta, oats)
- Canned goods (beans, tomatoes, soups)
- Oils, vinegars
- Spices and seasonings
- Flour, sugar, baking items
- Nuts, seeds
- Snacks, crackers, chips

### PREPARED/LEFTOVER FOODS:
- Takeout containers
- Meal prep containers
- Leftovers in storage containers

## OUTPUT FORMAT:
Return a JSON object with this structure:
{
    "ingredients": [
        {"name": "ingredient name", "quantity": "estimated amount", "location": "where in image", "condition": "fresh/frozen/leftover/etc", "category": "protein/dairy/vegetable/fruit/condiment/pantry/beverage/prepared"}
    ],
    "total_count": <number of items found>,
    "areas_checked": ["door shelves", "main shelves", "drawers", "etc"],
    "summary": "Brief description of what's available",
    "meal_potential": "What meals could be made with these ingredients",
    "notes": "Any items that were hard to identify or partially visible"
}

## IMPORTANT:
- Be THOROUGH - it's better to list too many items than miss any
- Include common staples even if they seem obvious (butter, eggs, milk)
- If you see a container but can't identify contents, note it as "unidentified container"
- Describe partially visible items as best you can
- List each distinct item separately (don't group)
"""


async def analyze_image_for_ingredients(
    image_data: str | bytes,
    is_base64: bool = True,
    detail: str = "high"
) -> dict:
    """
    Analyze an image to detect food ingredients with maximum thoroughness.
    
    Args:
        image_data: Either base64 encoded string or raw bytes
        is_base64: Whether image_data is already base64 encoded
        detail: "low", "high", or "auto" - affects token usage and accuracy
    
    Returns:
        Dictionary with detected ingredients and suggestions
    """
    
    # Convert bytes to base64 if needed
    if not is_base64 and isinstance(image_data, bytes):
        image_data = base64.b64encode(image_data).decode('utf-8')
    
    # Clean base64 string (remove data URL prefix if present)
    if isinstance(image_data, str) and image_data.startswith('data:'):
        image_data = image_data.split(',')[1]
    
    try:
        # First pass - comprehensive scan
        response = client.chat.completions.create(
            model="gpt-4o",  # GPT-4o has vision capabilities
            messages=[
                {
                    "role": "system",
                    "content": INGREDIENT_DETECTION_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Please analyze this image VERY CAREFULLY and list EVERY food item and ingredient you can see.

Take your time and scan:
1. Every shelf from top to bottom
2. Door compartments and side shelves
3. Drawers (vegetable/fruit crispers)
4. Any items in the back or corners
5. Items that may be partially hidden

Don't skip anything - even common items like butter, eggs, or condiments should be listed.
Look for labels on containers and packages to identify contents.
If something looks like food but you're not 100% sure, include it with a note."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}",
                                "detail": detail
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=4000,  # Increased for comprehensive listing
            temperature=0.2,  # Lower temperature for more consistent detection
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return {
            "success": True,
            "data": result,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse response: {str(e)}",
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def analyze_image_fast(
    image_data: str | bytes,
    is_base64: bool = True,
) -> dict:
    """
    FAST image analysis using GPT-4o-mini with low detail.
    
    Optimized for speed (~2-3 seconds vs ~8-12 seconds for detailed).
    Use when quick feedback is more important than exhaustive detection.
    
    Args:
        image_data: Either base64 encoded string or raw bytes
        is_base64: Whether image_data is already base64 encoded
    
    Returns:
        Dictionary with detected ingredients
    """
    
    # Convert bytes to base64 if needed
    if not is_base64 and isinstance(image_data, bytes):
        image_data = base64.b64encode(image_data).decode('utf-8')
    
    # Clean base64 string (remove data URL prefix if present)
    if isinstance(image_data, str) and image_data.startswith('data:'):
        image_data = image_data.split(',')[1]
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Faster model
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": FAST_DETECTION_PROMPT
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}",
                                "detail": "low"  # Low detail = faster
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=1000,  # Smaller response for speed
            temperature=0.1,
        )
        
        result = json.loads(response.choices[0].message.content)
        
        # Normalize the response format
        ingredients = result.get("ingredients", [])
        ingredient_names = [
            ing.get("name", ing) if isinstance(ing, dict) else str(ing) 
            for ing in ingredients
        ]
        
        return {
            "success": True,
            "ingredients": ingredients,
            "ingredient_names": ingredient_names,
            "summary": result.get("summary", f"Found {len(ingredients)} items"),
            "total_count": len(ingredients),
            "mode": "fast",
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse response: {str(e)}",
            "mode": "fast"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "mode": "fast"
        }


async def analyze_image_url(image_url: str) -> dict:
    """
    Analyze an image from a URL with comprehensive ingredient detection.
    
    Args:
        image_url: Public URL of the image
    
    Returns:
        Dictionary with detected ingredients
    """
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": INGREDIENT_DETECTION_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": """Please analyze this image VERY CAREFULLY and list EVERY food item and ingredient you can see.

Scan systematically:
1. Every shelf from top to bottom
2. Door compartments and side shelves  
3. Drawers (vegetable/fruit crispers)
4. Items in the back or corners
5. Partially hidden items

Include ALL items - even common staples like butter, eggs, milk, condiments.
Read labels on containers and packages when visible."""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=4000,
            temperature=0.2,
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return {
            "success": True,
            "data": result,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def analyze_image_detailed(
    image_data: str | bytes,
    is_base64: bool = True,
    focus_areas: list[str] = None
) -> dict:
    """
    Perform a detailed multi-pass analysis for maximum ingredient detection.
    
    Args:
        image_data: Either base64 encoded string or raw bytes
        is_base64: Whether image_data is already base64 encoded
        focus_areas: Optional list of areas to focus on (e.g., ["door", "bottom shelf"])
    
    Returns:
        Dictionary with comprehensive detected ingredients
    """
    
    # Convert bytes to base64 if needed
    if not is_base64 and isinstance(image_data, bytes):
        image_data = base64.b64encode(image_data).decode('utf-8')
    
    if isinstance(image_data, str) and image_data.startswith('data:'):
        image_data = image_data.split(',')[1]
    
    focus_instruction = ""
    if focus_areas:
        focus_instruction = f"\n\nPay EXTRA attention to these areas: {', '.join(focus_areas)}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": INGREDIENT_DETECTION_PROMPT
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"""DETAILED INGREDIENT SCAN REQUEST

Please perform an EXHAUSTIVE scan of this image. I need you to identify EVERY SINGLE food item visible.

SCANNING PROTOCOL:
1. Start at the TOP LEFT corner and scan across
2. Move down row by row
3. Check BEHIND visible items for hidden foods
4. Look at ALL door shelves and compartments
5. Examine drawer contents carefully
6. Read ALL visible labels and packaging
7. Note items in containers (even if you have to guess contents)
8. Include condiment bottles, sauce jars, everything

Do NOT skip common items. If you see butter, list it. If you see eggs, list them. Every single edible item matters.{focus_instruction}"""
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=4000,
            temperature=0.1,  # Very low for maximum accuracy
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return {
            "success": True,
            "data": result,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def get_simple_ingredient_list(vision_result: dict) -> list[str]:
    """
    Extract just the ingredient names from a vision result.
    
    Args:
        vision_result: The result from analyze_image_for_ingredients
    
    Returns:
        List of ingredient names (strings)
    """
    if not vision_result.get("success"):
        return []
    
    data = vision_result.get("data", {})
    ingredients = data.get("ingredients", [])
    
    # Handle both dict and string format for ingredients
    result = []
    for ing in ingredients:
        if isinstance(ing, dict):
            name = ing.get("name", "")
            if name:
                result.append(name)
        elif isinstance(ing, str):
            result.append(ing)
    
    return result


def get_ingredients_by_category(vision_result: dict) -> dict[str, list[str]]:
    """
    Group ingredients by their category.
    
    Args:
        vision_result: The result from analyze_image_for_ingredients
    
    Returns:
        Dictionary mapping category to list of ingredient names
    """
    if not vision_result.get("success"):
        return {}
    
    data = vision_result.get("data", {})
    ingredients = data.get("ingredients", [])
    
    categorized = {}
    for ing in ingredients:
        if isinstance(ing, dict):
            category = ing.get("category", "other")
            name = ing.get("name", "")
            if name:
                if category not in categorized:
                    categorized[category] = []
                categorized[category].append(name)
    
    return categorized
