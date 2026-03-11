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

## Phase 3: React Native Frontend MVP + Core Integration
* [x] Setup React Native/Expo project.
* [x] Implement Authentication (Sign up, Log in).
* [x] Create tab navigation structure (Workouts, Calories, Home, Chat).
* [x] Implement AuthContext for state management.
* [x] Setup axios with interceptors for API calls.
* [x] Create service layer architecture (authService, userService).
* [x] Build Chat UI to interface with the FastAPI `/chat` endpoint.
* [x] Build Dashboard UI (progress rings, calorie counters) and backend endpoints.
* [x] Build Manual Meal Logging and backend endpoints.
* [x] Implement USDA API integration for food search and logging.
* [x] Create calorie tracker with daily/weekly navigation and macro progress display.
* [x] Implement water intake tracking with database storage.
* [x] Add user profile management with metrics, goals, and account deletion.
* [x] Implement logging streak calculation and dashboard metrics.
* [x] Implement Workout Routine creation.

## Phase 4: Enhanced Nutrition & Active Workout Tracking UI/UX
* [x] **Nutrition Enhancement:** Support alternative food units (grams, pieces, ml).
* [x] **Nutrition Enhancement:** Implement Pre-set Meals feature for one-tap logging of recurring meals.
* [x] **Workout Engine:** Implement Active Workout Mode (live session logging, adding sets, reps, weight in lbs/kgs, duration stopwatch).
* [x] **Workout Configuration:** Add support for time-based exercise timers.
* [x] **Workout Historys:** Build screens to view workout history.
* [x] **Dashboard Enhancement:** Add tracking for "workouts this week" and "step count".

## Phase 5: Social & Gamification Features
* [ ] **Social Engine:** Allow users to follow each other and view activities.
* [ ] **Gamification:** Implement the Consistency Scoring System (gaining/losing points based on workout completion, meal logging stability, and streaks).
* [ ] **Social UI:** Build leaderboards or friend activity feeds to push motivation.

## Phase 6: Advanced AI Integrations & Localization
*   [ ] **Egyptian Nutrition DB:** Supplement the existing food database with nutritional info specifically for Egyptian local foods (Koshary, Molokheya, Hamam, etc.).
*   [ ] **Contextual AI:** Update LangGraph flow to fetch the user profile (stats, goals) from the database *before* generating responses for highly personalized advice.
*   [ ] **AI Analytics:** Implement backend workers/prompts to generate insights analyzing user's eating and exercising habits over time.
*   [ ] **Voice Input:** Integrate a speech-to-text model (e.g., Whisper) fine-tuned/prompted to understand **Egyptian Arabic dialect** and Franco-Arabic for voice meal logging.
*   [ ] **Franco-Arabic RAG:** Ensure the AI coach system parses and converses robustly in Franco-Arabic when helping users with dietary and workout questions.
*   [ ] **Vision Input:** Integrate an Image/Vision LLM API (GPT-4o/Claude 3.5 Sonnet) to estimate calories/macros from plate photos.
*   [ ] Deploy FastAPI backend to a cloud provider (e.g., Render, Railway, AWS).