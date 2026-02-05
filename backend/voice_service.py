"""
🎤 Voice Service - Speech-to-Text and Text-to-Speech

Enables hands-free cooking assistance using:
- OpenAI Whisper for speech recognition
- OpenAI TTS for natural voice responses
- Conversational AI for interactive cooking guidance
"""

import base64
import json
import io
from openai import OpenAI
from config import settings
import rag_service

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)


# =============================================================================
# Conversational Chef Voice Agent
# =============================================================================

VOICE_CHEF_SYSTEM_PROMPT = """You are Chef Pantry, a warm and friendly voice cooking assistant. 
You're talking to someone who is cooking and has their hands busy, so keep responses conversational and concise.

Your personality:
- Warm, encouraging, and enthusiastic about cooking
- Speak naturally like you're in the kitchen with them
- Keep responses SHORT and conversational (2-4 sentences max)
- Ask ONE follow-up question at a time to guide the conversation
- Be proactive - suggest options, ask about preferences

Conversation Flow:
1. When given ingredients, acknowledge what you see
2. Ask about cuisine preferences, dietary needs, or time constraints
3. Suggest recipes based on their answers
4. Offer to guide them through cooking steps

Example responses:
- "Oh, you've got some great stuff here! I see chicken, garlic, and tomatoes. Are you in the mood for something Italian or maybe Asian-inspired tonight?"
- "Perfect choice! I can walk you through a delicious Chicken Stir-Fry. Do you want me to start with the prep work?"
- "Great! First, let's slice the chicken into thin strips. Let me know when you're ready for the next step!"

Remember: You're voice-only, so be clear and don't use bullet points or formatting.
"""


async def transcribe_audio(audio_data: bytes, audio_format: str = "webm") -> dict:
    """
    Convert speech to text using OpenAI Whisper.
    
    Args:
        audio_data: Raw audio bytes
        audio_format: Audio format (webm, mp3, wav, etc.)
    
    Returns:
        Dictionary with transcription text
    """
    try:
        # Create a file-like object from bytes
        audio_file = io.BytesIO(audio_data)
        audio_file.name = f"audio.{audio_format}"
        
        response = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            response_format="text"
        )
        
        return {
            "success": True,
            "text": response.strip(),
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def generate_speech(text: str, voice: str = "nova") -> dict:
    """
    Convert text to speech using OpenAI TTS.
    
    Args:
        text: Text to convert to speech
        voice: Voice to use (alloy, echo, fable, onyx, nova, shimmer)
               - nova: Warm, friendly female voice (best for cooking assistant)
               - alloy: Neutral, balanced
               - echo: Male voice
    
    Returns:
        Dictionary with base64 encoded audio
    """
    try:
        response = client.audio.speech.create(
            model="tts-1",  # Use tts-1-hd for higher quality
            voice=voice,
            input=text,
            response_format="mp3",
            speed=1.0,
        )
        
        # Get audio bytes and encode to base64
        audio_bytes = response.content
        audio_base64 = base64.b64encode(audio_bytes).decode('utf-8')
        
        return {
            "success": True,
            "audio_base64": audio_base64,
            "format": "mp3",
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def voice_chat(
    message: str,
    conversation_history: list[dict] = [],
    detected_ingredients: list[str] = [],
    current_recipe: dict | None = None,
) -> dict:
    """
    Have a RAG-enhanced voice conversation with Chef Pantry.
    
    This is optimized for voice interactions:
    - Shorter responses
    - Natural conversational flow
    - Proactive questions
    - Context-aware guidance
    - RAG-powered recipe suggestions grounded in the database
    
    Args:
        message: User's transcribed speech
        conversation_history: Previous messages for context
        detected_ingredients: Ingredients from vision analysis
        current_recipe: Recipe being discussed/cooked
    
    Returns:
        Dictionary with response text
    """
    
    # Build context message if we have ingredients
    context_parts = []
    
    if detected_ingredients:
        context_parts.append(f"The user's available ingredients: {', '.join(detected_ingredients)}")
    
    if current_recipe:
        context_parts.append(f"Currently discussing recipe: {current_recipe.get('name', 'Unknown')}")
        if current_recipe.get('instructions'):
            context_parts.append(f"Recipe instructions: {current_recipe.get('instructions')[:500]}")
    
    # Use RAG to find relevant recipes based on the message and ingredients
    rag_context = ""
    recipe_keywords = ["recipe", "make", "cook", "suggest", "what can i", "dinner", "lunch", "breakfast", "meal"]
    should_use_rag = any(keyword in message.lower() for keyword in recipe_keywords) or detected_ingredients
    
    if should_use_rag:
        search_query = message
        if detected_ingredients:
            search_query += f" with {', '.join(detected_ingredients[:5])}"  # Limit to first 5
        
        retrieved = rag_service.semantic_search(
            query=search_query,
            n_results=3
        )
        
        if retrieved:
            rag_context = "\n\nRECIPES FROM OUR DATABASE YOU CAN RECOMMEND:\n" + "\n".join([
                f"- {r['metadata'].get('name', 'Unknown')}: {r['document'][:200]}..."
                for r in retrieved
            ])
            context_parts.append(rag_context)
            context_parts.append("\nIMPORTANT: When suggesting recipes, ONLY recommend ones from the list above. Don't make up recipes!")
    
    context_message = "\n".join(context_parts) if context_parts else ""
    
    messages = [{"role": "system", "content": VOICE_CHEF_SYSTEM_PROMPT}]
    
    # Add context as system message if present
    if context_message:
        messages.append({
            "role": "system", 
            "content": f"Context for this conversation:\n{context_message}"
        })
    
    # Add conversation history (keep last 10 messages)
    for msg in conversation_history[-10:]:
        messages.append(msg)
    
    # Add current message
    messages.append({"role": "user", "content": message})
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            temperature=0.8,  # More personality for voice
            max_tokens=200,   # Keep responses concise for voice
        )
        
        return {
            "success": True,
            "response": response.choices[0].message.content,
            "used_rag": should_use_rag,
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


async def analyze_ingredients_and_greet(ingredients: list[str]) -> dict:
    """
    Generate a greeting message when user provides ingredients.
    The AI acknowledges what it sees and asks a guiding question.
    
    Args:
        ingredients: List of detected/entered ingredients
    
    Returns:
        Dictionary with greeting response
    """
    
    prompt = f"""The user has these ingredients available: {', '.join(ingredients)}

Generate a warm, enthusiastic greeting that:
1. Acknowledges 2-3 specific ingredients they have
2. Expresses excitement about the possibilities
3. Asks ONE question about their preference (cuisine, time, mood, etc.)

Keep it to 2-3 sentences maximum. Speak naturally like you're in the kitchen with them.
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": VOICE_CHEF_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=150,
        )
        
        return {
            "success": True,
            "response": response.choices[0].message.content,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def get_recipe_suggestion_voice(
    ingredients: list[str],
    cuisine_preference: str | None = None,
    dietary_restrictions: list[str] = [],
    time_constraint: str | None = None,
) -> dict:
    """
    Get a RAG-powered conversational recipe suggestion for voice.
    
    Uses RAG to retrieve actual recipes from the database and then
    generates a natural-sounding suggestion that can be read aloud.
    """
    
    # Step 1: Build search query for RAG
    search_query = f"recipe using {', '.join(ingredients)}"
    if cuisine_preference:
        search_query += f" {cuisine_preference} cuisine"
    if dietary_restrictions:
        search_query += f" {', '.join(dietary_restrictions)}"
    if time_constraint:
        search_query += f" {time_constraint}"
    
    # Step 2: Retrieve relevant recipes from database using RAG
    retrieved_recipes = rag_service.semantic_search(
        query=search_query,
        n_results=3,
        cuisine_filter=cuisine_preference,
        dietary_filter=dietary_restrictions if dietary_restrictions else None
    )
    
    # Step 3: Build context from retrieved recipes
    if retrieved_recipes:
        recipe_context = "\n\n".join([
            f"RECIPE FROM DATABASE:\n{r['document']}"
            for r in retrieved_recipes
        ])
    else:
        recipe_context = "No matching recipes found in the database."
    
    constraints = []
    if cuisine_preference:
        constraints.append(f"They want {cuisine_preference} cuisine")
    if dietary_restrictions:
        constraints.append(f"Dietary restrictions: {', '.join(dietary_restrictions)}")
    if time_constraint:
        constraints.append(f"Time available: {time_constraint}")
    
    constraint_text = ". ".join(constraints) if constraints else "No specific preferences mentioned."
    
    # Step 4: Generate voice-optimized response grounded in retrieved recipes
    prompt = f"""Available ingredients from the user: {', '.join(ingredients)}
{constraint_text}

Here are recipes from our cookbook that might work:

{recipe_context}

Based on ONLY the recipes above from our database:
1. Recommend the BEST matching recipe by name
2. Enthusiastically describe why it's perfect for their ingredients
3. Mention which of their ingredients will be used
4. Ask if they'd like you to guide them through making it

IMPORTANT: Only suggest recipes from the database above. Don't make up recipes!
Keep it to 3-4 sentences. Be conversational and excited!
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": VOICE_CHEF_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.8,
            max_tokens=200,
        )
        
        return {
            "success": True,
            "response": response.choices[0].message.content,
            "retrieved_recipes": len(retrieved_recipes),
            "used_rag": True,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


async def get_cooking_step_guidance(
    recipe_name: str,
    current_step: int,
    total_steps: int,
    step_instruction: str,
    user_question: str | None = None,
) -> dict:
    """
    Provide voice guidance for a specific cooking step.
    
    Args:
        recipe_name: Name of the recipe
        current_step: Current step number
        total_steps: Total number of steps
        step_instruction: The instruction for this step
        user_question: Optional question the user asked about this step
    """
    
    prompt = f"""Recipe: {recipe_name}
Step {current_step} of {total_steps}: {step_instruction}

{"User asked: " + user_question if user_question else "Guide them through this step."}

Give clear, concise voice instructions for this step. If they asked a question, answer it.
End by asking if they're ready for the next step or need more details.
Keep it to 2-3 sentences.
"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": VOICE_CHEF_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=150,
        )
        
        return {
            "success": True,
            "response": response.choices[0].message.content,
            "step": current_step,
            "total_steps": total_steps,
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

