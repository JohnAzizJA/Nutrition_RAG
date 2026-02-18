# Nutrition_RAG

AI Nutrition Platform with RAG, Memory, and Personalized Coaching for Egyptian Food

## Setup

1. **Create virtual environment**
```bash
python -m venv venv
venv\Scripts\activate  # Windows
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
copy .env.example .env
# Edit .env with your settings
```

4. **Run locally** (coming in next steps)

## Project Structure
```
backend/
  app/
    api/          # FastAPI endpoints
    rag/          # RAG pipeline + Langgraph
data/
  raw/            # Documents to ingest
chroma_db/        # Vector database (auto-created)
```

## Phase 1: Core RAG with Langgraph ✓ Step 1 Complete