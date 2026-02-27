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
# Edit .env with:
# - DATABASE_URL (Supabase PostgreSQL)
# - GROQ_API_KEY (Get from https://console.groq.com)
```

4. **Add sample documents**
```bash
# Add .txt or .pdf files to data/raw/
```

5. **Ingest documents**
```bash
python ingest.py
```

6. **Test RAG (coming with frontend)**

## Project Structure
```
backend/
  app/
    api/          # FastAPI endpoints
    rag/          # RAG pipeline + Langgraph
    db/           # Database models & connection
data/
  raw/            # Documents to ingest
```

## Phase 1: Core RAG with Langgraph ✓ Complete

### Components
- RAG pipeline with Langgraph (retrieve → generate)
- VectorStore (Supabase pgvector + embeddings)
- LLM integration (Groq/llama-3.1-70b)
- Document processor
- Calculation tools (BMI, BMR, TDEE, Macros)

### Scripts
- `python ingest.py` - Load documents from data/raw/

### Next: FastAPI endpoints (with frontend in Phase 4)