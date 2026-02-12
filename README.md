# 🍳 Pantry Chef AI

An AI-powered cooking assistant PWA that provides real-time cooking guidance through your camera. Features live AI vision analysis, voice interaction, step-by-step cooking assistance, and intelligent meal planning.

## ✨ Features

### 🎥 Live AI Cooking Coach (NEW!)
- **Real-time Camera Analysis** - AI watches your cooking through your camera
- **Live Guidance** - Get specific instructions like "stir for 30 more seconds"
- **Ingredient Detection** - AI sees what you're working with
- **Timing Assistance** - Knows when to flip, when it's done, when to add ingredients
- **Voice Commands** - Ask "How much salt?" or "What's next?" hands-free
- **Warning System** - Alerts you if something looks like it's burning or needs attention

### 📱 Progressive Web App
- **Install to Home Screen** - Works like a native app
- **Offline Support** - Basic functionality without internet
- **Camera Access** - Full integration with your device camera
- **Push Notifications** - Timer alerts even when app is in background

### Core Features
- **🎙️ Voice Assistant** - Speak naturally to get recipe suggestions
- **📸 Vision AI** - Upload photos to automatically detect ingredients
- **🧠 AI-Powered Suggestions** - GPT-4 powered recipe recommendations
- **📚 Semantic Search** - Find recipes by meaning (RAG-powered)
- **👨‍🍳 Step-by-Step Mode** - Guided cooking with built-in timers
- **🛒 Smart Shopping List** - Generate and manage shopping lists
- **❤️ Recipe Favorites** - Save your favorite recipes
- **🌙 Dark Mode** - Beautiful dark theme
- **🥗 Nutrition Estimates** - AI-powered nutritional information

## 🛠️ Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite + Tailwind CSS (PWA) |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Vector DB | ChromaDB |
| LLM | OpenAI GPT-4 / GPT-4o-mini |
| Vision | GPT-4 Vision (Real-time) |
| Voice | OpenAI Whisper + TTS |
| Deployment | Docker + DigitalOcean |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL
- OpenAI API Key

### Run Frontend
```bash
cd frontend
npm install
npm run dev
```

### Run Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up environment variables
export OPENAI_API_KEY="your-api-key"
export DATABASE_URL="postgresql://user:pass@localhost/pantry_chef"

# Run migrations
alembic upgrade head

# Seed the database
python seed_data.py

# Start the server
uvicorn main:app --reload
```

### Install as PWA
1. Open the app in Chrome/Safari on your phone
2. Click "Add to Home Screen" or install prompt
3. Grant camera and microphone permissions when prompted

## 📱 Live Cooking Mode

The revolutionary feature that sets Pantry Chef apart:

### How It Works
1. Select a recipe and tap **"Live Cook with AI"**
2. Point your camera at your cooking area
3. AI analyzes the scene every 2-3 seconds
4. Receive real-time guidance based on what it sees

### Voice Commands During Cooking
- **"How much garlic?"** - Get specific ingredient amounts
- **"How long should I sauté this?"** - Get timing advice
- **"What's next?"** - Move to the next step
- **"Is this done?"** - AI assesses based on visual cues
- **"Help!"** - Get guidance for the current step

### What AI Can Detect
- Ingredients visible in frame
- Current cooking actions (stirring, chopping, etc.)
- Doneness indicators (color, texture)
- Potential issues (smoke, overflow, burning)
- Timing suggestions based on visual cues

### Settings
- **Analysis Frequency** - How often AI analyzes (1-10 seconds)
- **Voice Guidance** - Toggle spoken instructions
- **Auto-Analyze** - Continuous vs manual analysis

## 🔌 API Endpoints

### Live Cooking
- `POST /api/live-cook/analyze` - Analyze camera frame
- `POST /api/live-cook/voice-command` - Process voice command
- `POST /api/live-cook/ingredient-help` - Get ingredient guidance
- `POST /api/live-cook/timing-help` - Get timing guidance

### Recipes
- `GET /api/recipes` - List all recipes
- `GET /api/recipes/{id}` - Get recipe details
- `POST /api/recipes/suggest` - Get suggestions

### AI Features
- `POST /api/ai/suggest` - AI-powered suggestions
- `POST /api/ai/chat` - Chat with Chef Pantry

### RAG (Semantic Search)
- `POST /api/rag/index` - Index recipes
- `POST /api/rag/search` - Semantic search
- `POST /api/rag/suggest` - RAG-powered suggestions

### Vision
- `POST /api/vision/analyze` - Analyze uploaded image
- `POST /api/vision/analyze-fast` - Quick ingredient scan
- `POST /api/vision/analyze-detailed` - Thorough detection

### Voice
- `POST /api/voice/transcribe` - Speech to text
- `POST /api/voice/speak` - Text to speech
- `POST /api/voice/chat` - Voice conversation

### Nutrition
- `POST /api/nutrition/estimate` - Estimate nutrition
- `GET /api/recipes/{id}/nutrition` - Get recipe nutrition

## 🎨 UI Design

The app features a warm, kitchen-inspired design:
- **Copper & Sage color palette** - Warm, inviting tones
- **Playfair Display serif** - Elegant headings
- **Plus Jakarta Sans** - Clean, readable body text
- **Glass morphism effects** - Modern, layered appearance
- **Smooth animations** - Delightful micro-interactions
- **Dark mode** - Comfortable cooking at night

## 📱 PWA Features

### Manifest Configuration
```json
{
  "name": "Pantry Chef AI",
  "display": "standalone",
  "orientation": "portrait-primary"
}
```

### Service Worker
- Caches static assets for offline use
- Network-first strategy for API calls
- Background sync for timer notifications

### Camera Permissions
The app requests camera access for:
- Live cooking assistance
- Ingredient scanning
- Recipe photo upload

## 🔒 Privacy

- Camera feed is processed locally first
- Only captured frames are sent to OpenAI for analysis
- No video is stored or recorded
- Analysis results are not persisted on servers

## 📚 Learning Notes

This project demonstrates:
1. **PWA Development** - Service workers, manifest, camera API
2. **Real-time AI Vision** - Live frame analysis with GPT-4V
3. **Full-Stack Development** - React + FastAPI
4. **Voice AI** - Speech recognition and synthesis
5. **RAG Architecture** - Vector embeddings + semantic search
6. **Modern UI/UX** - Dark mode, animations, accessibility

## 📄 License

MIT License - feel free to use this as a learning resource!

---

Built with ❤️ for home cooks who want an AI sous chef in their pocket
