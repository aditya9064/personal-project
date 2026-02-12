"""
RAG Service - Retrieval Augmented Generation

CONCEPT: What is RAG?

RAG combines two powerful techniques:
1. RETRIEVAL: Search a knowledge base (our recipe database) for relevant info
2. GENERATION: Use an LLM to create responses based on retrieved context

Why RAG?
- LLMs have knowledge cutoffs and can hallucinate
- Your data is private and not in the LLM's training
- RAG grounds the AI's responses in your actual data

How it works:
1. Convert recipes to vector embeddings (numerical representations)
2. Store embeddings in a vector database (ChromaDB)
3. When user queries, convert query to embedding
4. Find similar recipes using vector similarity
5. Pass retrieved recipes to LLM as context
6. LLM generates response grounded in real data

CONCEPT: Embeddings

Embeddings convert text into vectors (lists of numbers) that capture semantic meaning.
- Similar concepts have similar vectors
- "chicken" and "poultry" will be close in vector space
- Enables semantic search (meaning-based, not keyword-based)
"""

import chromadb
from chromadb.utils import embedding_functions
from openai import OpenAI
import json

from config import settings
from database import SessionLocal
from models import Recipe


# =============================================================================
# Initialize Services
# =============================================================================

# OpenAI client for embeddings
openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)

# ChromaDB client - persistent storage
chroma_client = chromadb.PersistentClient(path="./chroma_db")

# OpenAI embedding function for ChromaDB
openai_ef = embedding_functions.OpenAIEmbeddingFunction(
    api_key=settings.OPENAI_API_KEY,
    model_name="text-embedding-3-small"  # Fast and cost-effective
)

# Get or create recipe collection
recipe_collection = chroma_client.get_or_create_collection(
    name="recipes",
    embedding_function=openai_ef,
    metadata={"description": "Recipe embeddings for semantic search"}
)


# =============================================================================
# Embedding Functions
# =============================================================================

def create_recipe_document(recipe: Recipe) -> str:
    """
    Create a rich text document from a recipe for embedding.
    
    The more context we include, the better the semantic search.
    """
    ingredients = ", ".join([ing.name for ing in recipe.ingredients])
    tags = ", ".join(recipe.dietary_tags) if recipe.dietary_tags else "none"
    
    return f"""
Recipe: {recipe.name}
Description: {recipe.description}
Cuisine: {recipe.cuisine}
Difficulty: {recipe.difficulty}
Ingredients: {ingredients}
Dietary Tags: {tags}
Cooking Time: {recipe.prep_time_minutes + recipe.cook_time_minutes} minutes
""".strip()


def index_single_recipe(recipe: Recipe) -> bool:
    """Add a single recipe to the vector index."""
    try:
        doc = create_recipe_document(recipe)
        
        recipe_collection.upsert(
            ids=[str(recipe.id)],
            documents=[doc],
            metadatas=[{
                "name": recipe.name,
                "cuisine": recipe.cuisine or "",
                "difficulty": recipe.difficulty or "",
                "dietary_tags": ",".join(recipe.dietary_tags) if recipe.dietary_tags else "",
            }]
        )
        return True
    except Exception as e:
        print(f"Error indexing recipe {recipe.id}: {e}")
        return False


def index_all_recipes() -> dict:
    """
    Index all recipes from the database into ChromaDB.
    
    This creates embeddings for each recipe and stores them
    for fast semantic search later.
    """
    db = SessionLocal()
    try:
        recipes = db.query(Recipe).all()
        
        if not recipes:
            return {"success": False, "message": "No recipes found in database"}
        
        documents = []
        ids = []
        metadatas = []
        
        for recipe in recipes:
            doc = create_recipe_document(recipe)
            documents.append(doc)
            ids.append(str(recipe.id))
            metadatas.append({
                "name": recipe.name,
                "cuisine": recipe.cuisine or "",
                "difficulty": recipe.difficulty or "",
                "dietary_tags": ",".join(recipe.dietary_tags) if recipe.dietary_tags else "",
            })
        
        # Upsert all at once (more efficient)
        recipe_collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
        
        return {
            "success": True,
            "indexed_count": len(recipes),
            "message": f"Successfully indexed {len(recipes)} recipes"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# =============================================================================
# Semantic Search
# =============================================================================

def semantic_search(
    query: str,
    n_results: int = 5,
    cuisine_filter: str | None = None,
    dietary_filter: list[str] | None = None
) -> list[dict]:
    """
    Search for recipes semantically similar to the query.
    
    Unlike keyword search, this understands meaning:
    - "quick healthy dinner" finds light, fast recipes
    - "comfort food for cold weather" finds hearty soups/stews
    - "something with leftovers" finds creative leftover recipes
    """
    
    # Build where filter for metadata
    where_filter = None
    if cuisine_filter:
        where_filter = {"cuisine": {"$eq": cuisine_filter}}
    
    try:
        results = recipe_collection.query(
            query_texts=[query],
            n_results=n_results,
            where=where_filter
        )
        
        if not results or not results['ids'] or not results['ids'][0]:
            return []
        
        # Format results
        search_results = []
        for i, doc_id in enumerate(results['ids'][0]):
            result = {
                "id": int(doc_id),
                "document": results['documents'][0][i] if results['documents'] else "",
                "metadata": results['metadatas'][0][i] if results['metadatas'] else {},
                "distance": results['distances'][0][i] if results['distances'] else 0,
            }
            
            # Filter by dietary tags if specified
            if dietary_filter:
                recipe_tags = result['metadata'].get('dietary_tags', '').split(',')
                if not any(tag in recipe_tags for tag in dietary_filter):
                    continue
                    
            search_results.append(result)
        
        return search_results
        
    except Exception as e:
        print(f"Search error: {e}")
        return []


# =============================================================================
# RAG Pipeline
# =============================================================================

async def rag_recipe_suggestions(
    query: str,
    ingredients: list[str] | None = None,
    dietary_restrictions: list[str] | None = None,
    cuisine_preference: str | None = None
) -> dict:
    """
    RAG-powered recipe suggestions.
    
    This is the magic combination:
    1. Semantic search finds relevant recipes from YOUR database
    2. LLM creates personalized suggestions based on found recipes
    3. Results are grounded in real data, not hallucinated
    """
    
    # Step 1: Build a rich search query
    search_query = query
    if ingredients:
        search_query += f" using {', '.join(ingredients)}"
    if cuisine_preference:
        search_query += f" {cuisine_preference} cuisine"
    if dietary_restrictions:
        search_query += f" {', '.join(dietary_restrictions)}"
    
    # Step 2: Retrieve relevant recipes
    similar_recipes = semantic_search(
        query=search_query,
        n_results=5,
        cuisine_filter=cuisine_preference,
        dietary_filter=dietary_restrictions
    )
    
    if not similar_recipes:
        return {
            "success": False,
            "message": "No matching recipes found. Try indexing recipes first.",
            "suggestions": []
        }
    
    # Step 3: Prepare context for LLM
    recipe_context = "\n\n".join([
        f"Recipe {i+1}:\n{r['document']}"
        for i, r in enumerate(similar_recipes)
    ])
    
    # Step 4: Generate response with LLM
    system_prompt = """You are a helpful cooking assistant. You will be given recipes 
from our database and the user's query. Your job is to:
1. Analyze the relevant recipes provided
2. Suggest which ones best match the user's needs
3. Provide helpful modifications based on their ingredients/preferences
4. Be specific and reference the actual recipes provided

Always base your suggestions on the recipes given - don't make up new ones."""

    user_prompt = f"""User's request: {query}

User's available ingredients: {', '.join(ingredients) if ingredients else 'Not specified'}
Dietary restrictions: {', '.join(dietary_restrictions) if dietary_restrictions else 'None'}
Cuisine preference: {cuisine_preference or 'Any'}

Here are relevant recipes from our database:

{recipe_context}

Based on these recipes, provide personalized suggestions. Format as JSON:
{{
    "recommendations": [
        {{
            "recipe_name": "Name from database",
            "recipe_id": <id number>,
            "why_recommended": "Brief explanation",
            "modifications": "Any suggested changes based on user's ingredients",
            "missing_ingredients": ["list of items they may need"]
        }}
    ],
    "general_tips": "Overall cooking advice based on their request"
}}"""

    try:
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        
        result = json.loads(response.choices[0].message.content)
        
        return {
            "success": True,
            "data": result,
            "retrieved_recipes": len(similar_recipes),
            "search_query": search_query
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "retrieved_recipes": len(similar_recipes)
        }


# =============================================================================
# Collection Management
# =============================================================================

def get_collection_stats() -> dict:
    """Get statistics about the recipe collection."""
    try:
        count = recipe_collection.count()
        return {
            "collection_name": "recipes",
            "document_count": count,
            "embedding_model": "text-embedding-3-small"
        }
    except Exception as e:
        return {"error": str(e)}


def clear_collection() -> dict:
    """Clear all documents from the collection."""
    try:
        # Get all IDs and delete them
        all_docs = recipe_collection.get()
        if all_docs['ids']:
            recipe_collection.delete(ids=all_docs['ids'])
        return {"success": True, "deleted_count": len(all_docs['ids'])}
    except Exception as e:
        return {"success": False, "error": str(e)}







