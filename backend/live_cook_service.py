"""
🎥 Live Cooking Service - Real-time AI Cooking Assistance

This service handles:
- Real-time camera frame analysis for cooking guidance
- Detecting ingredients, cooking actions, and potential issues
- Providing contextual tips and timing advice
- Voice command processing for hands-free cooking
"""

import json
import base64
from openai import OpenAI
from config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)


# =============================================================================
# System Prompts for Live Cooking
# =============================================================================

LIVE_COOKING_SYSTEM_PROMPT = """You are an expert AI cooking coach watching someone cook in real-time through their camera.

Your role:
1. OBSERVE what's happening in the kitchen right now
2. GUIDE them through the current recipe step
3. ADVISE on timing, technique, and ingredient amounts
4. WARN about potential issues (burning, under-cooking, safety)
5. ENCOURAGE and provide helpful tips

Current context:
- Recipe: {recipe_name}
- Current step ({step_num}): {current_instruction}
- Previously detected: {previous_context}

IMPORTANT GUIDELINES:
- Be concise - they're cooking and can't read long messages
- Be specific - "stir for 30 more seconds" not "stir a bit more"
- Be proactive - warn about issues BEFORE they happen
- Be encouraging - cooking should be fun!
- Focus on what you actually SEE in the image

For each analysis, provide:
1. What you observe (briefly)
2. Specific guidance for this moment
3. Any warnings or tips
4. Whether the step appears complete
"""

LIVE_ANALYSIS_PROMPT = """Look at this image from someone's kitchen as they cook.

Recipe: {recipe_name}
Current Step {step_num}: {current_instruction}
Previously detected ingredients: {detected_ingredients}

Analyze what you see and provide cooking guidance.

Respond in JSON format:
{{
    "detected_items": ["list", "of", "visible", "items"],
    "current_action": "what they appear to be doing",
    "guidance": "Brief, specific guidance for right now (1-2 sentences max)",
    "speak": true/false (should this be spoken aloud? true for important guidance),
    "warning": "Only if there's something concerning, otherwise null",
    "tip": "Optional quick tip, otherwise null",
    "step_complete_suggestion": true/false (does it look like this step is done?),
    "next_step_preview": "Brief preview of next step if step seems complete, otherwise null",
    "timing_advice": "Any timing advice like 'flip in 30 seconds' or null",
    "ingredient_amounts": "If you can see them measuring, advise on amounts, otherwise null"
}}

Be specific and actionable. They're cooking right now and need clear, immediate guidance.
"""

VOICE_COMMAND_SYSTEM_PROMPT = """You are an AI cooking assistant responding to voice commands while someone cooks.

Context:
- Recipe: {recipe_name}
- Current step ({step_num}): {current_instruction}
- Visible items: {detected_items}

Common commands you should handle:
- "How much [ingredient]?" - Give specific amounts
- "How long [action]?" - Give specific times
- "What's next?" - Preview the next step
- "Go back" - Acknowledge and help with previous step
- "Is this done?" - Assess based on what you know
- "Help" / "What should I do?" - Give guidance for current step
- General cooking questions - Answer based on context

Respond conversationally but concisely - they're cooking!
If a command implies an action (like "next step"), include it in your response.

Respond in JSON:
{{
    "response": "Your spoken response (keep it brief and clear)",
    "action": "next_step" or "prev_step" or null,
    "additional_info": "Any extra details they might need"
}}
"""


# =============================================================================
# Analysis Functions
# =============================================================================

async def analyze_cooking_frame(
    image_base64: str,
    recipe_name: str,
    current_step: int,
    current_instruction: str,
    previous_context: dict = None,
    detected_ingredients: list = None,
) -> dict:
    """
    Analyze a camera frame and provide real-time cooking guidance.
    
    This is optimized for speed - uses gpt-4o-mini with low detail mode
    to get responses in 1-2 seconds.
    """
    
    # Build context string
    prev_context_str = ""
    if previous_context:
        if previous_context.get("detectedIngredients"):
            prev_context_str = f"Previously saw: {', '.join(previous_context['detectedIngredients'][:5])}"
    
    detected_str = ", ".join(detected_ingredients[:10]) if detected_ingredients else "none yet"
    
    prompt = LIVE_ANALYSIS_PROMPT.format(
        recipe_name=recipe_name,
        step_num=current_step,
        current_instruction=current_instruction,
        detected_ingredients=detected_str,
    )
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",  # Fast model for real-time
            messages=[
                {
                    "role": "system",
                    "content": LIVE_COOKING_SYSTEM_PROMPT.format(
                        recipe_name=recipe_name,
                        step_num=current_step,
                        current_instruction=current_instruction,
                        previous_context=prev_context_str,
                    )
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}",
                                "detail": "low"  # Low detail for speed
                            }
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=300,  # Keep responses short
            temperature=0.3,  # More consistent responses
        )
        
        result = json.loads(response.choices[0].message.content)
        result["success"] = True
        return result
        
    except json.JSONDecodeError:
        return {
            "success": True,
            "guidance": "Keep going! I'm watching.",
            "speak": False,
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


async def process_voice_command(
    command: str,
    recipe_name: str,
    current_step: int,
    current_instruction: str,
    detected_ingredients: list = None,
    last_analysis: dict = None,
) -> dict:
    """
    Process a voice command during live cooking.
    """
    
    detected_str = ", ".join(detected_ingredients[:10]) if detected_ingredients else "various items"
    
    context_info = ""
    if last_analysis:
        if last_analysis.get("current_action"):
            context_info += f"They appear to be: {last_analysis['current_action']}. "
        if last_analysis.get("timing_advice"):
            context_info += f"Timing note: {last_analysis['timing_advice']}. "
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": VOICE_COMMAND_SYSTEM_PROMPT.format(
                        recipe_name=recipe_name,
                        step_num=current_step,
                        current_instruction=current_instruction,
                        detected_items=detected_str,
                    )
                },
                {
                    "role": "user",
                    "content": f"Voice command: \"{command}\"\n\nAdditional context: {context_info}"
                }
            ],
            response_format={"type": "json_object"},
            max_tokens=200,
            temperature=0.5,
        )
        
        result = json.loads(response.choices[0].message.content)
        result["success"] = True
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "response": "Sorry, I didn't catch that. Can you repeat?"
        }


async def get_ingredient_guidance(
    ingredient: str,
    recipe_name: str,
    recipe_ingredients: list = None,
) -> dict:
    """
    Get specific guidance for an ingredient amount or preparation.
    """
    
    ingredients_context = ""
    if recipe_ingredients:
        for ing in recipe_ingredients:
            if ingredient.lower() in ing.get("name", "").lower():
                ingredients_context = f"Recipe calls for: {ing.get('name')} - {ing.get('quantity', 'as needed')}"
                break
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a cooking assistant helping with ingredient amounts. Be specific and practical."
                },
                {
                    "role": "user",
                    "content": f"Recipe: {recipe_name}\n{ingredients_context}\n\nHow much {ingredient} should I use?"
                }
            ],
            max_tokens=100,
            temperature=0.3,
        )
        
        return {
            "success": True,
            "response": response.choices[0].message.content,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


async def get_timing_guidance(
    action: str,
    current_instruction: str,
    visual_context: str = None,
) -> dict:
    """
    Get specific timing guidance for a cooking action.
    """
    
    context = f"Current step: {current_instruction}"
    if visual_context:
        context += f"\nWhat I can see: {visual_context}"
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "You are a cooking assistant helping with timing. Give specific times in seconds or minutes."
                },
                {
                    "role": "user",
                    "content": f"{context}\n\nHow long should I {action}?"
                }
            ],
            max_tokens=100,
            temperature=0.3,
        )
        
        return {
            "success": True,
            "response": response.choices[0].message.content,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }



