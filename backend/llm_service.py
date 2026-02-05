"""
🤖 LLM Service - AI-Powered Recipe Intelligence

CONCEPT: LLM Integration

Large Language Models (LLMs) like GPT-4 can:
- Understand natural language inputs
- Generate creative, context-aware responses
- Reason about complex requirements

In our app, the LLM will:
1. Analyze available ingredients
2. Consider dietary restrictions
3. Suggest creative recipes
4. Explain cooking techniques
5. Generate shopping lists

CONCEPT: Prompt Engineering

The key to getting good results from an LLM is crafting good prompts.
We'll use a "system prompt" to set the AI's persona and a "user prompt"
to describe the specific task.
"""

import json
from openai import OpenAI
from config import settings


# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)


# =============================================================================
# System Prompts
# =============================================================================
# These define the AI's "personality" and capabilities

CHEF_SYSTEM_PROMPT = """You are a friendly, knowledgeable home cooking assistant named "Chef Pantry". 

Your expertise includes:
- Suggesting recipes based on available ingredients
- Adapting recipes for dietary restrictions
- Providing cooking tips and techniques
- Creating shopping lists for missing ingredients
- Explaining why certain ingredient combinations work

Your personality:
- Warm and encouraging (cooking should be fun!)
- Practical (focus on realistic home cooking)
- Creative (suggest interesting flavor combinations)
- Helpful (provide alternatives when ingredients are missing)

Important guidelines:
- Always consider food safety
- Be aware of common allergens
- Suggest reasonable substitutions
- Keep recipes accessible for home cooks
"""

RECIPE_SUGGESTION_PROMPT = """Based on the user's available ingredients and preferences, suggest 3 creative recipes they can make.

Available ingredients: {ingredients}
Dietary restrictions: {restrictions}
Cuisine preference: {cuisine}
Existing recipes in database (for reference): {existing_recipes}

For each recipe suggestion, provide:
1. Recipe name
2. Brief description (1-2 sentences)
3. Which ingredients from their list you'd use
4. What additional ingredients they'd need (keep this minimal!)
5. Estimated cooking time
6. Difficulty level (Easy/Medium/Hard)
7. A helpful tip or variation

Format your response as JSON with this structure:
{{
    "suggestions": [
        {{
            "name": "Recipe Name",
            "description": "Brief appetizing description",
            "uses_ingredients": ["ingredient1", "ingredient2"],
            "additional_needed": ["item1", "item2"],
            "cooking_time": "30 minutes",
            "difficulty": "Easy",
            "tip": "Pro tip or variation idea",
            "cuisine": "Italian"
        }}
    ],
    "chef_note": "A friendly message about their ingredient selection"
}}

Be creative! If they have unusual combinations, find interesting ways to use them.
If they're missing key ingredients, suggest simple substitutions.
"""


# =============================================================================
# LLM Functions
# =============================================================================

async def get_ai_recipe_suggestions(
    ingredients: list[str],
    dietary_restrictions: list[str] = [],
    cuisine_preference: str | None = None,
    existing_recipes: list[dict] = []
) -> dict:
    """
    Get AI-powered recipe suggestions based on ingredients.
    
    CONCEPT: Chat Completions API
    
    The OpenAI API uses a "messages" format:
    - system: Sets the AI's behavior
    - user: The user's request
    - assistant: Previous AI responses (for conversation context)
    
    We use response_format to get structured JSON output.
    """
    
    # Format existing recipes for context
    recipe_context = "\n".join([
        f"- {r.get('name', 'Unknown')}: {r.get('description', '')[:100]}"
        for r in existing_recipes[:5]  # Limit to avoid token overflow
    ]) if existing_recipes else "None provided"
    
    # Build the user prompt
    user_prompt = RECIPE_SUGGESTION_PROMPT.format(
        ingredients=", ".join(ingredients) if ingredients else "None specified",
        restrictions=", ".join(dietary_restrictions) if dietary_restrictions else "None",
        cuisine=cuisine_preference or "Any",
        existing_recipes=recipe_context
    )
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Cost-effective and fast
            messages=[
                {"role": "system", "content": CHEF_SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,  # Some creativity, but not too random
            max_tokens=1500,
        )
        
        # Parse the JSON response
        result = json.loads(response.choices[0].message.content)
        return {
            "success": True,
            "data": result,
            "model": response.model,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }
        }
        
    except json.JSONDecodeError as e:
        return {
            "success": False,
            "error": f"Failed to parse AI response: {str(e)}",
            "raw_response": response.choices[0].message.content if response else None
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def get_recipe_details(
    recipe_name: str,
    ingredients: list[str],
    servings: int = 4
) -> dict:
    """
    Get detailed cooking instructions for a specific recipe.
    """
    
    prompt = f"""Provide detailed cooking instructions for: {recipe_name}

Using these main ingredients: {', '.join(ingredients)}
Servings: {servings}

Format as JSON:
{{
    "name": "Recipe Name",
    "servings": {servings},
    "prep_time": "X minutes",
    "cook_time": "X minutes", 
    "ingredients": [
        {{"item": "ingredient", "amount": "quantity", "notes": "optional prep notes"}}
    ],
    "instructions": [
        "Step 1: ...",
        "Step 2: ..."
    ],
    "tips": ["Helpful tip 1", "Helpful tip 2"],
    "nutrition_estimate": {{
        "calories": "approximate per serving",
        "protein": "approximate",
        "carbs": "approximate"
    }}
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": CHEF_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.5,
            max_tokens=2000,
        )
        
        result = json.loads(response.choices[0].message.content)
        return {"success": True, "data": result}
        
    except Exception as e:
        return {"success": False, "error": str(e)}


async def chat_with_chef(
    message: str,
    conversation_history: list[dict] = []
) -> dict:
    """
    Have a conversation with Chef Pantry.
    
    CONCEPT: Conversation Context
    
    By including previous messages, the AI can:
    - Remember what was discussed
    - Build on previous suggestions
    - Answer follow-up questions
    """
    
    messages = [{"role": "system", "content": CHEF_SYSTEM_PROMPT}]
    
    # Add conversation history
    for msg in conversation_history[-10:]:  # Keep last 10 messages
        messages.append(msg)
    
    # Add current message
    messages.append({"role": "user", "content": message})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.7,
            max_tokens=1000,
        )
        
        return {
            "success": True,
            "response": response.choices[0].message.content,
            "usage": {
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


# =============================================================================
# Utility Functions
# =============================================================================

def estimate_tokens(text: str) -> int:
    """
    Rough estimate of tokens in a text.
    OpenAI uses ~4 characters per token on average.
    """
    return len(text) // 4


async def test_connection() -> dict:
    """Test that the OpenAI API key is working."""
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Say 'Hello, Chef!' in a friendly way."}],
            max_tokens=50,
        )
        return {
            "success": True,
            "message": response.choices[0].message.content,
            "model": response.model
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

