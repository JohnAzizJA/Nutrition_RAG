# Development Roadmap

## Phase 1: Core RAG Backend with LangGraph (✅ Mostly Complete)
* [x] Set up Python project structure and dependencies.
* [x] Ingest pipeline for documents (chunk, embed).
* [x] LangGraph workflow (Agent, Tools, Retrieve, Generate nodes).
* [x] Implement calculation tools (BMI, BMR, TDEE, Macros).
* [ ] **Migration:** Transition LLM client from `Ollama` to `Groq` for faster inference.
* [ ] **Migration:** Move vector storage from `ChromaDB` to `Supabase pgvector`.

## Phase 2: FastAPI, User Memory & Structured Data (Current Focus)
* [ ] Implement conversational memory (checkpointer) in LangGraph using Supabase/PostgreSQL to store thread states.
* [ ] Finalize Supabase relational schema (Users, Meals, Progress, Follows).
* [ ] Update the LangGraph flow to fetch the user profile (stats, goals) from the database *before* generating responses to ensure highly personalized advice.
* [ ] Expose LangGraph pipeline via FastAPI endpoints (`/chat`, `/ingest`).

## Phase 3: React Native Frontend MVP
* [ ] Setup React Native/Expo project.
* [ ] Implement Supabase Authentication (Sign up, Log in).
* [ ] Build Dashboard UI (progress rings, calorie counters).
* [ ] Build Chat UI to interface with the FastAPI `/chat` endpoint.
* [ ] Build Manual Meal Logging & Workout Creation tabs.

## Phase 4: Advanced AI Integrations
* [ ] **Voice Input:** Integrate a speech-to-text model (e.g., Whisper) fine-tuned or prompted to understand Egyptian Arabic and Franco.
* [ ] **Vision:** Integrate an Image/Vision LLM API (like GPT-4o or Claude 3.5 Sonnet) to estimate calories and identify macros from plate photos.
* [ ] Deploy FastAPI backend to a cloud provider (e.g., Render, Railway, or AWS).