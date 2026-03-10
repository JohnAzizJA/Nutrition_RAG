# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Nutrition_RAG** is a full-stack nutrition and fitness coaching app with an AI chat assistant powered by a RAG (Retrieval-Augmented Generation) pipeline using LangGraph. The backend is a Python FastAPI service; the frontend is a React Native app built with Expo.

---

## Development Commands

### Backend (FastAPI)

```bash
# Activate virtual environment (from repo root)
source venv/Scripts/activate   # Windows Git Bash
# or
source venv/bin/activate       # Linux/macOS

# Run the development server
cd backend/app
uvicorn main:app --reload

# Run RAG tests
python backend/app/rag_test.py
```

### Frontend (Expo / React Native)

```bash
cd frontend/Nutrition-App

# Start Expo dev server
npm start

# Run on specific platform
npm run android
npm run ios
npm run web

# Lint
npm run lint
```

### Environment Setup

Copy `.env.example` to `.env` in the repo root and fill in:
- `DATABASE_URL` — Supabase PostgreSQL connection string
- `GROQ_API_KEY` — LLM provider (llama-3.1-70b-versatile)
- `JWT_SECRET_KEY` — Token signing secret
- `USDA_API_KEY` — USDA FoodData Central API key

---

## Architecture

### Backend (`backend/app/`)

**Entry point:** `main.py` — FastAPI app with CORS and 6 routers mounted at `/api`.

| Router | Prefix | Responsibility |
|--------|--------|---------------|
| `auth.py` | `/api/auth` | Register, login, token refresh, profile update, account deletion |
| `chat.py` | `/api` | Conversation CRUD, chat with AI |
| `nutrition.py` | `/api` | Food search (USDA), meal logging, daily nutrition |
| `dashboard.py` | `/api` | Aggregated stats, water intake logging |
| `workouts.py` | `/api` | Workout routine and exercise CRUD |
| `calculations.py` | `/api` | BMI, BMR, TDEE, calorie target calculations |

**RAG Pipeline (`rag/graph.py`):**
LangGraph `StateGraph` with 4 nodes:
1. **Agent** — Decides whether to call tools, retrieve docs, or generate directly
2. **Tool** — Executes calculation tools (BMI, BMR, TDEE, macro targets)
3. **Retrieve** — Queries ChromaDB vector store for relevant nutrition documents
4. **Generate** — Produces the final LLM response

Conversation memory is persisted via a PostgreSQL checkpointer (`langgraph-checkpoint-postgres`). Each conversation is identified by a thread ID stored in the `conversations` table.

**Database (`db/`):**
- `models.py` — SQLAlchemy models: User, Conversation, WeightLog, WaterLog, FoodItem, MealLog, WorkoutRoutine, Exercise, Follow
- `repositories.py` — Data-access layer (all DB queries go here)
- `database.py` — Session management

**Auth (`auth/`):** JWT middleware using PyJWT + Argon2 password hashing (pwdlib).

---

### Frontend (`frontend/Nutrition-App/`)

**Routing:** Expo Router (file-based). Screens live in `app/`. Tab screens are in `app/(tabs)/`.

**Key architectural pattern — Service Layer:**
All API calls go through typed service files in `src/services/`, not directly from screens. Services call the centralized Axios instance.

**API (`src/api/`):**
- `axios.ts` — Axios instance with request interceptor (Bearer token injection) and response interceptor (auto token refresh on 401 using `expo-secure-store`)
- `endpoints.ts` — All endpoint URL constants

**Auth flow:** `AuthContext` (`src/contexts/`) manages the auth state. Tokens are stored securely via `expo-secure-store`.

**Screen→Service→API flow example:**
```
app/(tabs)/calories.tsx
  → src/services/nutritionService.ts
    → src/api/axios.ts (with token)
      → Backend /api/search-foods
```

---

## Key Conventions

- **Backend:** All new endpoints go in the relevant `api/` router file; DB queries go in `repositories.py` — not inline in route handlers.
- **Frontend:** Never call Axios directly from screens. Add a method to the appropriate service in `src/services/` first.
- **Endpoints:** Add new URL constants to `src/api/endpoints.ts` before using them in services.
- **Auth:** The JWT access token expires in 24 hours; refresh token in 30 days. The Axios interceptor handles refresh automatically.
- **Vector store:** ChromaDB is currently used locally (`chroma_db/`). A migration to Supabase pgvector is planned but not yet implemented.
- **Plan:** Mark done any steps that are completed in the `plan.md` file.