# AI Agent Instructions & Coding Guidelines

You are an expert full-stack developer assisting in building a FastAPI + React Native application. Adhere strictly strictly to the following rules:

## General Rules
* **Tech Stack Alignment:** Always prioritize FastAPI for the backend and React Native for the frontend. 
* **Database:** We use Supabase. Use SQLAlchemy for relational data. For vector embeddings, prioritize `pgvector` over ChromaDB.
* **LLM:** We are transitioning from local `Ollama` to `Groq` for faster inference.
* **Language & Culture:** Assume the user base is Egyptian. When generating prompts, tests, or seed data, account for Egyptian Arabic, Franco-Arabic, and local Egyptian cuisine.

## Backend (Python/FastAPI) Guidelines
* Use asynchronous programming (`async def`) for all FastAPI endpoints and database calls where possible.
* Maintain the LangGraph architecture. Do not flatten the graph into standard linear LLM calls; utilize nodes and edges for state management.
* Ensure all tool functions (like BMI/BMR calculators) have strict type hinting and comprehensive docstrings so the LLM can bind to them properly.
* Manage environment variables securely using `python-dotenv`.

## Frontend (React Native) Guidelines
* Create modular, reusable functional components.
* Use React Navigation for routing.
* Handle state efficiently (e.g., Zustand or Redux Toolkit, depending on project scale).

# AI Agent Instructions

## 🛑 What NOT to do
1. **No Hardcoding:** Do not hardcode credentials or local file paths (e.g., `./chroma_db`) if a cloud alternative like Supabase is available.
2. **No Linear Logic:** Do not replace LangGraph nodes with simple `if/else` LLM calls. All complex reasoning must happen within `graph.py`.
3. **No Vanilla Prompting:** Do not create generic nutrition prompts. Every system message must include instructions to be culturally relevant to Egypt.
4. **No Direct DB Mutations in Graph:** The AI should not directly write to the database; use a dedicated `tool` or a `SaveNode` to maintain data integrity.

## ✅ What TO do
1. **Type Safety:** Always use `TypedDict` for LangGraph `State` and Pydantic for FastAPI schemas.
2. **SQLAlchemy Patterns:** Use the existing `get_db` context manager and SQLAlchemy models for all database interactions.
3. **Egyptian Context:** When generating sample data or testing the LLM, use Egyptian food examples (e.g., "100g of Molokhia") and support Franco-Arabic (`7alawa`, `msh mshkel`).
4. **Tool-First Design:** If a calculation is needed, the Agent MUST use the tools in `tools.py` rather than guessing the math.
5. **Async-First:** Use `async/await` for all external API calls and database sessions where possible.