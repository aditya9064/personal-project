"""
🌱 Database Seed Script

CONCEPT: Seeding a Database
Seeding means populating the database with initial data.
This is useful for:
- Development: Have test data to work with
- Demo: Show off your app with realistic content
- Testing: Consistent data for automated tests

Run this script with: python seed_data.py
"""

from database import SessionLocal, engine, Base
from models import Recipe, Ingredient

# Sample recipes data with images from Unsplash
RECIPES_DATA = [
    {
        "name": "Classic Spaghetti Carbonara",
        "description": "A rich and creamy Italian pasta dish made with eggs, cheese, pancetta, and black pepper. Simple yet incredibly satisfying.",
        "prep_time_minutes": 10,
        "cook_time_minutes": 20,
        "servings": 4,
        "difficulty": "Medium",
        "cuisine": "Italian",
        "dietary_tags": [],
        "image_url": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80",
        "instructions": """1. Bring a large pot of salted water to boil. Cook spaghetti until al dente.
2. While pasta cooks, cut pancetta into small cubes and fry until crispy.
3. In a bowl, whisk together eggs, grated Pecorino, and black pepper.
4. When pasta is ready, reserve 1 cup pasta water, then drain.
5. Working quickly, add hot pasta to the pancetta pan (off heat).
6. Pour egg mixture over pasta and toss vigorously. The residual heat will cook the eggs into a creamy sauce.
7. Add pasta water as needed to achieve desired consistency.
8. Serve immediately with extra cheese and pepper.""",
        "ingredients": [
            ("spaghetti", "400g"),
            ("pancetta", "200g"),
            ("eggs", "4 large"),
            ("pecorino romano", "100g, grated"),
            ("black pepper", "to taste"),
            ("salt", "to taste"),
        ]
    },
    {
        "name": "Thai Green Curry",
        "description": "A fragrant and spicy Thai curry with coconut milk, vegetables, and your choice of protein. Bursting with fresh flavors.",
        "prep_time_minutes": 15,
        "cook_time_minutes": 25,
        "servings": 4,
        "difficulty": "Easy",
        "cuisine": "Thai",
        "dietary_tags": ["gluten-free"],
        "image_url": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80",
        "instructions": """1. Heat oil in a wok or large pan over medium-high heat.
2. Add green curry paste and stir-fry for 1 minute until fragrant.
3. Add coconut milk and bring to a simmer.
4. Add chicken (or tofu) and cook for 5 minutes.
5. Add vegetables (bamboo shoots, bell peppers, Thai eggplant).
6. Season with fish sauce, palm sugar, and lime leaves.
7. Simmer until vegetables are tender and protein is cooked through.
8. Garnish with Thai basil and serve with jasmine rice.""",
        "ingredients": [
            ("coconut milk", "400ml"),
            ("green curry paste", "3 tbsp"),
            ("chicken breast", "500g, sliced"),
            ("bamboo shoots", "1 can"),
            ("thai basil", "handful"),
            ("fish sauce", "2 tbsp"),
            ("palm sugar", "1 tbsp"),
            ("lime leaves", "4 leaves"),
            ("vegetable oil", "2 tbsp"),
            ("jasmine rice", "for serving"),
        ]
    },
    {
        "name": "Simple Pasta Aglio e Olio",
        "description": "A classic Italian pasta with garlic and olive oil. Simple yet incredibly flavorful. Perfect for a quick weeknight dinner.",
        "prep_time_minutes": 5,
        "cook_time_minutes": 15,
        "servings": 2,
        "difficulty": "Easy",
        "cuisine": "Italian",
        "dietary_tags": ["vegetarian", "vegan"],
        "image_url": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=80",
        "instructions": """1. Bring a large pot of salted water to boil. Cook spaghetti until al dente.
2. While pasta cooks, slice garlic thinly. 
3. Heat olive oil in a large pan over medium-low heat.
4. Add garlic and red pepper flakes, cook until garlic is golden (not brown!).
5. Reserve 1/2 cup pasta water, then drain pasta.
6. Add pasta to the garlic oil, toss to coat.
7. Add pasta water as needed and fresh parsley.
8. Serve with a drizzle of good olive oil.""",
        "ingredients": [
            ("spaghetti", "200g"),
            ("garlic", "6 cloves"),
            ("olive oil", "1/3 cup"),
            ("red pepper flakes", "1/2 tsp"),
            ("parsley", "1/4 cup, chopped"),
            ("salt", "to taste"),
        ]
    },
    {
        "name": "Chicken Tikka Masala",
        "description": "Tender chicken pieces in a creamy, spiced tomato sauce. A beloved British-Indian classic that's comfort food at its best.",
        "prep_time_minutes": 30,
        "cook_time_minutes": 30,
        "servings": 4,
        "difficulty": "Medium",
        "cuisine": "Indian",
        "dietary_tags": ["gluten-free"],
        "image_url": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80",
        "instructions": """1. Marinate chicken in yogurt, garam masala, cumin, and ginger for at least 1 hour.
2. Thread chicken onto skewers and grill or broil until charred.
3. For sauce: sauté onions until golden, add garlic and ginger.
4. Add tomato puree, garam masala, cumin, and paprika. Cook 5 minutes.
5. Pour in cream and simmer until thickened.
6. Add grilled chicken pieces to the sauce.
7. Simmer together for 5 minutes.
8. Garnish with fresh cilantro and serve with naan or rice.""",
        "ingredients": [
            ("chicken thighs", "600g, cubed"),
            ("yogurt", "1 cup"),
            ("garam masala", "2 tbsp"),
            ("cumin", "1 tsp"),
            ("ginger", "2 tbsp, minced"),
            ("garlic", "4 cloves, minced"),
            ("onion", "1 large, diced"),
            ("tomato puree", "400g"),
            ("heavy cream", "1 cup"),
            ("cilantro", "for garnish"),
        ]
    },
    {
        "name": "Vegetable Stir Fry",
        "description": "A quick and healthy stir fry loaded with colorful vegetables. Ready in under 20 minutes!",
        "prep_time_minutes": 10,
        "cook_time_minutes": 10,
        "servings": 3,
        "difficulty": "Easy",
        "cuisine": "Chinese",
        "dietary_tags": ["vegetarian", "vegan"],
        "image_url": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80",
        "instructions": """1. Prepare all vegetables by slicing them uniformly.
2. Mix sauce: soy sauce, sesame oil, rice vinegar, and cornstarch.
3. Heat wok or large pan over high heat until smoking.
4. Add oil, then stir-fry aromatics (garlic, ginger) for 30 seconds.
5. Add hard vegetables first (carrots, broccoli), cook 2-3 minutes.
6. Add softer vegetables (bell peppers, snap peas), cook 2 minutes.
7. Pour sauce over vegetables, toss until glazed.
8. Serve immediately over rice or noodles.""",
        "ingredients": [
            ("broccoli", "2 cups, florets"),
            ("bell pepper", "2, sliced"),
            ("carrots", "2, julienned"),
            ("snap peas", "1 cup"),
            ("garlic", "3 cloves, minced"),
            ("ginger", "1 tbsp, minced"),
            ("soy sauce", "3 tbsp"),
            ("sesame oil", "1 tbsp"),
            ("vegetable oil", "2 tbsp"),
            ("rice", "for serving"),
        ]
    },
    {
        "name": "Classic Beef Tacos",
        "description": "Seasoned ground beef in crispy taco shells with all your favorite toppings. A family favorite!",
        "prep_time_minutes": 15,
        "cook_time_minutes": 15,
        "servings": 4,
        "difficulty": "Easy",
        "cuisine": "Mexican",
        "dietary_tags": [],
        "image_url": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80",
        "instructions": """1. Brown ground beef in a large skillet, breaking it up as it cooks.
2. Drain excess fat.
3. Add taco seasoning (cumin, chili powder, paprika, garlic) and water.
4. Simmer until sauce thickens, about 5 minutes.
5. Warm taco shells according to package directions.
6. Prepare toppings: shred lettuce, dice tomatoes, grate cheese.
7. Fill shells with beef and desired toppings.
8. Serve with salsa, sour cream, and lime wedges.""",
        "ingredients": [
            ("ground beef", "500g"),
            ("taco shells", "8"),
            ("cumin", "1 tsp"),
            ("chili powder", "2 tsp"),
            ("paprika", "1 tsp"),
            ("garlic powder", "1/2 tsp"),
            ("lettuce", "2 cups, shredded"),
            ("tomatoes", "2, diced"),
            ("cheddar cheese", "1 cup, shredded"),
            ("sour cream", "for serving"),
            ("salsa", "for serving"),
        ]
    },
    {
        "name": "Mushroom Risotto",
        "description": "Creamy Italian rice dish with earthy mushrooms and Parmesan. Requires patience but worth every stir!",
        "prep_time_minutes": 10,
        "cook_time_minutes": 35,
        "servings": 4,
        "difficulty": "Medium",
        "cuisine": "Italian",
        "dietary_tags": ["vegetarian", "gluten-free"],
        "image_url": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=80",
        "instructions": """1. Heat broth in a saucepan and keep warm.
2. Sauté mushrooms in butter until golden, set aside.
3. In the same pan, sauté onion until translucent.
4. Add arborio rice, toast for 2 minutes.
5. Add wine, stir until absorbed.
6. Add warm broth one ladle at a time, stirring constantly.
7. Continue until rice is creamy but still al dente (about 20-25 minutes).
8. Fold in mushrooms, butter, and Parmesan.
9. Season and serve immediately.""",
        "ingredients": [
            ("arborio rice", "1.5 cups"),
            ("mushrooms", "300g, sliced"),
            ("vegetable broth", "6 cups"),
            ("white wine", "1/2 cup"),
            ("onion", "1, diced"),
            ("garlic", "2 cloves, minced"),
            ("parmesan", "1/2 cup, grated"),
            ("butter", "4 tbsp"),
            ("olive oil", "2 tbsp"),
            ("thyme", "1 tsp"),
        ]
    },
    {
        "name": "Honey Garlic Salmon",
        "description": "Glazed salmon fillets with a sweet and savory honey garlic sauce. Elegant enough for guests, easy enough for weeknights.",
        "prep_time_minutes": 10,
        "cook_time_minutes": 15,
        "servings": 4,
        "difficulty": "Easy",
        "cuisine": "American",
        "dietary_tags": ["gluten-free"],
        "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
        "instructions": """1. Mix honey, soy sauce, garlic, and lemon juice for the glaze.
2. Season salmon fillets with salt and pepper.
3. Heat oil in an oven-safe skillet over medium-high heat.
4. Sear salmon skin-side up for 3 minutes until golden.
5. Flip salmon, pour glaze around the fish.
6. Transfer to 400°F oven for 8-10 minutes until cooked through.
7. Baste with glaze halfway through.
8. Serve with pan sauce spooned over top.""",
        "ingredients": [
            ("salmon fillets", "4, 6oz each"),
            ("honey", "3 tbsp"),
            ("soy sauce", "2 tbsp"),
            ("garlic", "4 cloves, minced"),
            ("lemon juice", "1 tbsp"),
            ("olive oil", "2 tbsp"),
            ("salt", "to taste"),
            ("black pepper", "to taste"),
        ]
    },
    {
        "name": "Greek Salad",
        "description": "Fresh and vibrant Mediterranean salad with tomatoes, cucumbers, olives, and feta cheese. Perfect as a side or light meal.",
        "prep_time_minutes": 15,
        "cook_time_minutes": 0,
        "servings": 4,
        "difficulty": "Easy",
        "cuisine": "Mediterranean",
        "dietary_tags": ["vegetarian", "gluten-free"],
        "image_url": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
        "instructions": """1. Cut tomatoes into wedges, cucumber into half-moons.
2. Slice red onion thinly.
3. Combine vegetables in a large bowl.
4. Add Kalamata olives.
5. Whisk olive oil, red wine vinegar, oregano, salt, and pepper.
6. Pour dressing over salad and toss gently.
7. Top with crumbled feta cheese.
8. Serve immediately or chill for 30 minutes.""",
        "ingredients": [
            ("tomatoes", "4 large"),
            ("cucumber", "1 large"),
            ("red onion", "1/2, sliced"),
            ("kalamata olives", "1/2 cup"),
            ("feta cheese", "200g, crumbled"),
            ("olive oil", "1/4 cup"),
            ("red wine vinegar", "2 tbsp"),
            ("oregano", "1 tsp"),
            ("salt", "to taste"),
        ]
    },
    {
        "name": "Japanese Miso Soup",
        "description": "A comforting Japanese soup with silky tofu and wakame seaweed in savory miso broth. A staple of Japanese cuisine.",
        "prep_time_minutes": 5,
        "cook_time_minutes": 10,
        "servings": 4,
        "difficulty": "Easy",
        "cuisine": "Japanese",
        "dietary_tags": ["vegetarian", "vegan"],
        "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80",
        "instructions": """1. Soak wakame seaweed in cold water for 5 minutes, drain.
2. Heat dashi stock in a pot (or dissolve dashi powder in water).
3. Cut tofu into small cubes.
4. Add tofu and wakame to the hot broth.
5. Remove pot from heat.
6. Place miso paste in a ladle, submerge in broth and whisk to dissolve.
7. Return to very low heat (do not boil or miso will lose flavor).
8. Serve topped with sliced green onions.""",
        "ingredients": [
            ("miso paste", "3 tbsp"),
            ("dashi stock", "4 cups"),
            ("silken tofu", "200g"),
            ("wakame seaweed", "2 tbsp, dried"),
            ("green onions", "2, sliced"),
        ]
    },
]


def seed_database():
    """
    Populate the database with sample recipes and ingredients.
    """
    print("🌱 Seeding database...")
    
    db = SessionLocal()
    
    try:
        # Check if already seeded
        existing_recipes = db.query(Recipe).count()
        if existing_recipes > 0:
            print(f"⚠️  Database already has {existing_recipes} recipes. Skipping seed.")
            print("   To reseed, first clear the tables: TRUNCATE recipes, ingredients, recipe_ingredients CASCADE;")
            return
        
        # Create a cache for ingredients to avoid duplicates
        ingredient_cache = {}
        
        for recipe_data in RECIPES_DATA:
            # Extract ingredients from recipe data
            ingredients_list = recipe_data.pop("ingredients")
            
            # Create Recipe object
            recipe = Recipe(**recipe_data)
            
            # Process ingredients
            for ingredient_name, quantity in ingredients_list:
                # Normalize ingredient name
                ing_name = ingredient_name.lower().strip()
                
                # Get or create ingredient
                if ing_name not in ingredient_cache:
                    ingredient = db.query(Ingredient).filter(
                        Ingredient.name == ing_name
                    ).first()
                    
                    if not ingredient:
                        ingredient = Ingredient(name=ing_name)
                        db.add(ingredient)
                        db.flush()  # Get the ID
                    
                    ingredient_cache[ing_name] = ingredient
                
                # Add ingredient to recipe
                recipe.ingredients.append(ingredient_cache[ing_name])
            
            db.add(recipe)
            print(f"  ✅ Added: {recipe.name}")
        
        db.commit()
        print(f"\n🎉 Successfully seeded {len(RECIPES_DATA)} recipes!")
        
        # Print summary
        total_ingredients = db.query(Ingredient).count()
        print(f"📊 Database now has {total_ingredients} unique ingredients")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


def update_recipe_images():
    """
    Update existing recipes with image URLs.
    """
    print("🖼️  Updating recipe images...")
    
    db = SessionLocal()
    
    # Map recipe names to their image URLs
    image_map = {
        "Classic Spaghetti Carbonara": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=800&q=80",
        "Thai Green Curry": "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&q=80",
        "Simple Pasta Aglio e Olio": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=800&q=80",
        "Chicken Tikka Masala": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&q=80",
        "Vegetable Stir Fry": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&q=80",
        "Classic Beef Tacos": "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&q=80",
        "Mushroom Risotto": "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=80",
        "Honey Garlic Salmon": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
        "Greek Salad": "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&q=80",
        "Japanese Miso Soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80",
    }
    
    try:
        for name, image_url in image_map.items():
            recipe = db.query(Recipe).filter(Recipe.name == name).first()
            if recipe:
                recipe.image_url = image_url
                print(f"  ✅ Updated: {name}")
            else:
                print(f"  ⚠️  Not found: {name}")
        
        db.commit()
        print("\n🎉 Successfully updated recipe images!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error updating images: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--update-images":
        update_recipe_images()
    else:
        seed_database()
