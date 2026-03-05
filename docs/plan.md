# Development Roadmap

## Phase 1: Core RAG Backend with LangGraph
* [x] Set up Python project structure and dependencies.
* [x] Ingest pipeline for documents (chunk, embed).
* [x] LangGraph workflow (Agent, Tools, Retrieve, Generate nodes).
* [x] Implement calculation tools (BMI, BMR, TDEE, Macros).
* [x] **Migration:** Transition LLM client from `Ollama` to `Groq` for faster inference.
* [ ] **Migration:** Move vector storage from `ChromaDB` to `Supabase pgvector`.

## Phase 2: User Memory & Structured Data, FastAPI
* [x] Implement conversational memory (checkpointer) in LangGraph using Supabase/PostgreSQL to store thread states.
* [x] Finalize Supabase relational schema (Users, Meals, Progress, Follows).
* [x] Create repository layer for database access.
* [x] Expose LangGraph pipeline via FastAPI endpoints (`/chat`, `/conversations`).
* [x] Implement user authentication endpoints (`/register`, `/login`).
* [x] Implement JWT authentication with refresh tokens.
* [x] Implement secure password hashing (Argon2).

## Phase 3: React Native Frontend MVP + Backend Integration
* [x] Setup React Native/Expo project.
* [x] Implement Authentication (Sign up, Log in).
* [x] Create tab navigation structure (Workouts, Calories, Home, Chat).
* [x] Implement AuthContext for state management.
* [x] Setup axios with interceptors for API calls.
* [x] Create service layer architecture (authService, userService).
* [x] Build Chat UI to interface with the FastAPI `/chat` endpoint.
* [ ] Build Dashboard UI (progress rings, calorie counters) and create it's FastAPI endpoints.
* [ ] Build Manual Meal Logging & Workout Creation tabs and create it's FastAPI endpoints.

## Phase 4: User Profile Integration in RAG
* [ ] Update the LangGraph flow to fetch the user profile (stats, goals) from the database *before* generating responses to ensure highly personalized advice.
* [ ] Use PostgresStore to cache user profile data for quick access.
* [ ] Update calculation tools to use profile data as defaults.

## Phase 5: Advanced AI Integrations
* [ ] **Voice Input:** Integrate a speech-to-text model (e.g., Whisper) fine-tuned or prompted to understand Egyptian Arabic and Franco.
* [ ] **Vision:** Integrate an Image/Vision LLM API (like GPT-4o or Claude 3.5 Sonnet) to estimate calories and identify macros from plate photos.
* [ ] Deploy FastAPI backend to a cloud provider (e.g., Render, Railway, or AWS).