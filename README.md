# 🍳 Pantry Chef AI

An AI-powered cooking assistant that suggests recipes based on ingredients you have.

## Features (Building Incrementally)

- [ ] **Phase 1**: Basic frontend + backend communication
- [ ] **Phase 2**: Database for recipes and user preferences
- [ ] **Phase 3**: LLM integration for smart recipe suggestions
- [ ] **Phase 4**: RAG with recipe knowledge base
- [ ] **Phase 5**: Image recognition for ingredients
- [ ] **Phase 6**: Docker + Deployment

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL |
| Vector DB | ChromaDB |
| LLM | OpenAI GPT-4 |
| Deployment | Docker + DigitalOcean |

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.11+
- (Later) PostgreSQL, Docker

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
uvicorn main:app --reload
```

## Learning Notes

This project is being built as a learning exercise. Each phase introduces new concepts:

1. **API Design** - REST principles, HTTP methods, status codes
2. **Databases** - SQL, ORMs, migrations
3. **AI/LLM** - Prompt engineering, API integration
4. **RAG** - Embeddings, vector search, context augmentation
5. **Computer Vision** - Image processing, Vision AI
6. **DevOps** - Containers, deployment, CI/CD

